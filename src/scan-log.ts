import type { ScanProgressEvent } from "./types.js";

const agentStartedAt = new Map<string, number>();

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

function elapsedMs(agent: string): string {
  const start = agentStartedAt.get(agent);
  if (start === undefined) return "";
  const sec = ((Date.now() - start) / 1000).toFixed(1);
  return ` (${sec}s)`;
}

export function logScanProgress(event: ScanProgressEvent): void {
  const t = timestamp();

  switch (event.type) {
    case "scan:start":
      console.log(`[${t}] scan started → ${event.target}`);
      break;
    case "agent:start":
      agentStartedAt.set(event.agent, Date.now());
      console.log(`[${t}] ${event.agent} running…`);
      break;
    case "agent:done": {
      const run = event.runId ? ` runId=${event.runId}` : "";
      console.log(
        `[${t}] ${event.agent} done — ${event.findings} finding(s)${run}${elapsedMs(event.agent)}`,
      );
      agentStartedAt.delete(event.agent);
      break;
    }
    case "agent:error": {
      const kind = event.kind ? ` [${event.kind}]` : "";
      const run = event.runId ? ` runId=${event.runId}` : "";
      console.error(
        `[${t}] ${event.agent} failed${kind}${run} — ${event.message}${elapsedMs(event.agent)}`,
      );
      agentStartedAt.delete(event.agent);
      break;
    }
    case "orchestrator:start":
      console.log(`[${t}] orchestrator merging specialist reports…`);
      break;
    case "orchestrator:done":
      console.log(`[${t}] orchestrator finished`);
      break;
    case "report:write": {
      const label = event.interim ? "interim audit report" : "audit report";
      console.log(`[${t}] wrote ${label} → ${event.path}`);
      break;
    }
    case "scan:complete":
      console.log(
        `[${t}] scan complete — grade ${event.auditReport.grade}, ${event.auditReport.findings.length} finding(s)`,
      );
      break;
    case "scan:error":
      console.error(`[${t}] scan failed — ${event.message}`);
      break;
  }
}
