import type {
  AgentReport,
  AuditReport,
  Finding,
  FindingInput,
  SpecialistAgentId,
} from "./types.js";

const GRADES = new Set(["A", "B", "C", "D", "F"]);

const SEVERITY_RANK: Record<Finding["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function assignFindingIds(
  agent: string,
  findings: FindingInput[],
): Finding[] {
  const lineCounts = new Map<string, number>();
  return findings.map((f) => {
    const lineKey = `${f.file}:${f.line ?? 0}`;
    const n = (lineCounts.get(lineKey) ?? 0) + 1;
    lineCounts.set(lineKey, n);
    const safeFile = f.file.replace(/\//g, "-");
    return {
      ...f,
      id: `${agent}-${safeFile}-${f.line ?? 0}-${n}`,
      reportedBy: agent,
    };
  });
}

function findingLocationKey(f: Pick<Finding, "file" | "line">): string {
  return `${f.file}|${f.line ?? 0}`;
}

function pickPreferredFinding(a: Finding, b: Finding): Finding {
  const rankA = SEVERITY_RANK[a.severity];
  const rankB = SEVERITY_RANK[b.severity];
  if (rankA !== rankB) return rankA < rankB ? a : b;
  return a.title.length >= b.title.length ? a : b;
}

/** Collapse overlap when multiple specialists flag the same file:line. */
export function dedupeFindings(findings: Finding[]): Finding[] {
  const byKey = new Map<string, Finding>();
  for (const f of findings) {
    const key = findingLocationKey(f);
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickPreferredFinding(existing, f) : f);
  }
  return [...byKey.values()];
}

export function specialistFindingsWithIds(
  reports: AgentReport[],
): Finding[] {
  return reports.flatMap((r) => assignFindingIds(r.agent, r.findings));
}

/** Attach reportedBy when the orchestrator omits it, using specialist file:line matches. */
export function enrichFindingsFromReports(
  findings: Finding[],
  reports: AgentReport[],
): Finding[] {
  const specialists = specialistFindingsWithIds(reports);
  return findings.map((f) => {
    if (f.reportedBy) return f;
    const line = f.line ?? 0;
    const exact = specialists.find(
      (s) => s.file === f.file && (s.line ?? 0) === line,
    );
    const fallback = specialists.find((s) => s.file === f.file);
    const match = exact ?? fallback;
    return match ? { ...f, reportedBy: match.reportedBy } : f;
  });
}

export function countSeverities(
  findings: Finding[],
): AuditReport["findingCount"] {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    counts[f.severity]++;
  }
  return counts;
}

export function gradeFromFindings(findings: Finding[]): string {
  const critical = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  if (critical >= 2) return "F";
  if (critical >= 1) return "D";
  if (high >= 3) return "D";
  if (high >= 1) return "C";
  if (findings.some((f) => f.severity === "medium")) return "B";
  if (findings.length > 0) return "B";
  return "A";
}

/** Count findings in the merged report per specialist (post-dedupe). */
export function agentContributionsFromFindings(
  findings: Finding[],
): Record<string, number> {
  const contributions: Record<string, number> = {
    "secrets-scout": 0,
    "auth-guard": 0,
    "injection-hunter": 0,
    orchestrator: findings.length,
  };
  for (const f of findings) {
    const agent = f.reportedBy;
    if (agent && agent in contributions && agent !== "orchestrator") {
      contributions[agent]++;
    }
  }
  return contributions;
}

export function mergeReportsDeterministic(
  reports: AgentReport[],
): AuditReport {
  const findings = dedupeFindings(specialistFindingsWithIds(reports));
  const findingCount = countSeverities(findings);
  const grade = gradeFromFindings(findings);
  const critical = findings.filter((f) => f.severity === "critical");
  const topExploitChain =
    critical.length > 0
      ? `Chain starts at ${critical[0].file}: ${critical[0].title} — then pivot to other findings for data access and persistence.`
      : findings.length > 0
        ? `Primary issue: ${findings[0].file} — ${findings[0].title}.`
        : "No findings — no exploit chain.";

  return {
    grade,
    summary: `Automated merge of ${reports.length} specialist report(s): ${findings.length} unique finding(s) in ./demo-app.`,
    findingCount,
    topExploitChain,
    demoScript: [
      "Open the audit UI and review the grade with findings across secrets, auth, and injection.",
      "Walk the top exploit chain and call out one critical issue.",
      "Generate fix PLAN, copy for Cursor, and remediate in demo-app within the time box.",
    ],
    findings,
    agentContributions: agentContributionsFromFindings(findings),
  };
}

export function normalizeAuditReport(
  raw: AuditReport,
  fallbackReports: AgentReport[],
): AuditReport {
  const enriched = enrichFindingsFromReports(
    raw.findings.map((f, i) => ({
      ...f,
      id: f.id?.trim() || `finding-${i + 1}`,
    })),
    fallbackReports,
  );
  const findings = dedupeFindings(enriched);
  const findingCount = countSeverities(findings);
  const grade = GRADES.has(raw.grade) ? raw.grade : gradeFromFindings(findings);

  return {
    grade,
    summary: raw.summary,
    findingCount,
    topExploitChain: raw.topExploitChain,
    demoScript: raw.demoScript?.length === 3 ? raw.demoScript : mergeReportsDeterministic(fallbackReports).demoScript,
    findings,
    agentContributions: agentContributionsFromFindings(findings),
  };
}

export function isAgentReport(value: unknown): value is AgentReport {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const agents: SpecialistAgentId[] = [
    "secrets-scout",
    "auth-guard",
    "injection-hunter",
  ];
  if (!agents.includes(o.agent as SpecialistAgentId)) return false;
  if (!Array.isArray(o.findings)) return false;
  return o.findings.every(isFindingInput);
}

function isFindingInput(value: unknown): value is FindingInput {
  if (!value || typeof value !== "object") return false;
  const f = value as Record<string, unknown>;
  const severities = ["critical", "high", "medium", "low"];
  return (
    typeof f.title === "string" &&
    typeof f.severity === "string" &&
    severities.includes(f.severity) &&
    typeof f.category === "string" &&
    typeof f.file === "string" &&
    typeof f.evidence === "string" &&
    typeof f.exploitScenario === "string" &&
    typeof f.fixHint === "string"
  );
}

export function isAuditReport(value: unknown): value is AuditReport {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (typeof o.grade !== "string") return false;
  if (typeof o.summary !== "string") return false;
  if (!Array.isArray(o.findings)) return false;
  if (!Array.isArray(o.demoScript)) return false;
  return true;
}
