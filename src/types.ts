export interface Finding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  file: string;
  line?: number;
  evidence: string;
  exploitScenario: string;
  fixHint: string;
  reportedBy?: string;
}

export type SpecialistAgentId = "secrets-scout" | "auth-guard" | "injection-hunter";

export type FindingInput = Omit<Finding, "id">;

export interface AgentReport {
  agent: SpecialistAgentId;
  findings: FindingInput[];
}

export interface AuditReport {
  grade: string;
  summary: string;
  findingCount: { critical: number; high: number; medium: number; low: number };
  topExploitChain: string;
  demoScript: string[];
  findings: Finding[];
  agentContributions: Record<string, number>;
}

export type ScanProgressEvent =
  | { type: "scan:start"; target: string }
  | { type: "agent:start"; agent: string }
  | { type: "agent:done"; agent: string; findings: number; runId?: string }
  | {
      type: "agent:error";
      agent: string;
      message: string;
      kind?: string;
      runId?: string;
    }
  | { type: "report:write"; path: string; interim?: boolean }
  | { type: "orchestrator:start" }
  | { type: "orchestrator:done" }
  | { type: "scan:complete"; auditReport: AuditReport }
  | { type: "scan:error"; message: string };
