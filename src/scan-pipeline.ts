import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { requireApiKey } from "./config.js";
import {
  isAuditReport,
  mergeReportsDeterministic,
  normalizeAuditReport,
} from "./merge-report.js";
import { runAgentForJson } from "./parse-agent-json.js";
import { orchestratorPrompt } from "./prompts/orchestrator.js";
import { SPECIALIST_AGENTS, runSpecialist } from "./specialists.js";
import type { AgentReport, AuditReport, ScanProgressEvent } from "./types.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const auditReportPath = join(rootDir, "public", "audit-report.json");

let busy = false;

export class ScanBusyError extends Error {
  readonly status = 409;

  constructor() {
    super("A scan is already in progress");
    this.name = "ScanBusyError";
  }
}

export class ScanPartialFailureError extends Error {
  readonly status = 502;

  constructor(
    message: string,
    public readonly partial: {
      reports: AgentReport[];
      errors: Array<{ agent: string; message: string }>;
    },
  ) {
    super(message);
    this.name = "ScanPartialFailureError";
  }
}

export class ScanStartupFailureError extends Error {
  readonly status = 503;

  constructor(message: string) {
    super(message);
    this.name = "ScanStartupFailureError";
  }
}

export function isScanBusy(): boolean {
  return busy;
}

export async function getSampleReport(): Promise<AuditReport> {
  const raw = await readFile(auditReportPath, "utf-8");
  return JSON.parse(raw) as AuditReport;
}

async function persistAuditReport(
  report: AuditReport,
  specialistReports: AgentReport[],
  onProgress?: (event: ScanProgressEvent) => void,
  interim = false,
): Promise<AuditReport> {
  const safe = normalizeAuditReport(report, specialistReports);
  await writeFile(
    auditReportPath,
    `${JSON.stringify(safe, null, 2)}\n`,
    "utf-8",
  );
  onProgress?.({ type: "report:write", path: auditReportPath, interim });
  return safe;
}

function resolveTarget(target: string): string {
  return resolve(rootDir, target);
}

async function runOrchestrator(
  reports: AgentReport[],
  cwd: string,
  apiKey: string,
): Promise<AuditReport> {
  const inputJson = JSON.stringify(reports, null, 2);
  const result = await runAgentForJson({
    input: { id: "orchestrator", prompt: orchestratorPrompt(inputJson) },
    config: { apiKey, cwd },
    validate: isAuditReport,
  });

  if (result.ok) {
    return normalizeAuditReport(result.data, reports);
  }

  console.warn(
    `[orchestrator] ${result.message} — using deterministic merge`,
  );
  return mergeReportsDeterministic(reports);
}

type LiveScanResult = { report: AuditReport; specialistReports: AgentReport[] };

async function runLiveScan(
  target: string,
  onProgress?: (event: ScanProgressEvent) => void,
): Promise<LiveScanResult> {
  const cwd = resolveTarget(target);
  const apiKey = requireApiKey();

  onProgress?.({ type: "scan:start", target });

  const results = await Promise.all(
    SPECIALIST_AGENTS.map(async (agent) => {
      onProgress?.({ type: "agent:start", agent });
      const result = await runSpecialist(agent, { apiKey, cwd });
      if (result.ok) {
        onProgress?.({
          type: "agent:done",
          agent,
          findings: result.report.findings.length,
          runId: result.runId,
        });
      } else {
        onProgress?.({
          type: "agent:error",
          agent,
          message: result.message,
          kind: result.kind,
          runId: result.runId,
        });
      }
      return result;
    }),
  );

  const reports: AgentReport[] = [];
  const errors: Array<{ agent: string; message: string }> = [];
  let startupFailure = false;

  for (const result of results) {
    if (result.ok) {
      reports.push(result.report);
    } else {
      errors.push({ agent: result.agent, message: result.message });
      if (result.kind === "startup") startupFailure = true;
    }
  }

  if (startupFailure && reports.length === 0) {
    const msg = errors.map((e) => `${e.agent}: ${e.message}`).join("; ");
    onProgress?.({ type: "scan:error", message: msg });
    throw new ScanStartupFailureError(msg);
  }

  if (reports.length < 2) {
    if (reports.length > 0) {
      await persistAuditReport(
        mergeReportsDeterministic(reports),
        reports,
        onProgress,
        true,
      );
    }
    onProgress?.({ type: "scan:error", message: "Fewer than 2 specialists returned valid JSON" });
    throw new ScanPartialFailureError(
      "Fewer than 2 specialists returned valid JSON",
      { reports, errors },
    );
  }

  await persistAuditReport(
    mergeReportsDeterministic(reports),
    reports,
    onProgress,
    true,
  );

  onProgress?.({ type: "orchestrator:start" });
  const auditReport = await runOrchestrator(reports, cwd, apiKey);
  onProgress?.({ type: "orchestrator:done" });
  onProgress?.({ type: "scan:complete", auditReport });

  return { report: auditReport, specialistReports: reports };
}

export async function runScan(
  target = "./demo-app",
  options?: { sample?: boolean; onProgress?: (event: ScanProgressEvent) => void },
): Promise<AuditReport> {
  if (busy) {
    throw new ScanBusyError();
  }

  busy = true;
  try {
    if (options?.sample) {
      const report = await getSampleReport();
      return persistAuditReport(report, [], options?.onProgress);
    }

    const { report, specialistReports } = await runLiveScan(
      target,
      options?.onProgress,
    );
    return persistAuditReport(report, specialistReports, options?.onProgress);
  } finally {
    busy = false;
  }
}
