import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AuditReport } from "./types.js";

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

export function isScanBusy(): boolean {
  return busy;
}

export async function getSampleReport(): Promise<AuditReport> {
  const raw = await readFile(auditReportPath, "utf-8");
  return JSON.parse(raw) as AuditReport;
}

export async function runScan(_target?: string): Promise<AuditReport> {
  if (busy) {
    throw new ScanBusyError();
  }

  busy = true;
  try {
    const report = await getSampleReport();
    await writeFile(auditReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
    return report;
  } finally {
    busy = false;
  }
}
