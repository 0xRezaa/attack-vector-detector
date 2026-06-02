import type { AuditReport, Finding } from "./types.js";

const SEVERITY_ORDER: Record<Finding["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const TIME_BOX_DISCLAIMER = `## ⏱️ TIME BOX — READ FIRST (required)

> ### You have **20–30 minutes total** for this entire PLAN.
>
> Work in priority order. Do **not** start refactors, dependency upgrades, or tests outside the listed tasks unless a task explicitly requires it.
>
> If time runs out: finish in-flight critical fixes, document what is left in a short comment, and stop.

## Instructions for the coding agent

- Execute tasks in order (critical before high).
- Change only what each task requires; avoid drive-by edits.
- After each task, sanity-check the affected path (build or quick manual check if fast).
- Stop when the time box expires; do not expand scope.`;

function sortFindingsForPlan(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const bySeverity =
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return a.file.localeCompare(b.file);
  });
}

export function buildFixPlan(report: AuditReport): string {
  const eligible = sortFindingsForPlan(
    report.findings.filter(
      (f) => f.severity === "critical" || f.severity === "high",
    ),
  ).slice(0, 5);

  const generated = new Date().toISOString();
  const taskBlocks = eligible
    .map((finding, index) => {
      const location = finding.line
        ? `${finding.file}:${finding.line}`
        : finding.file;
      const severityLabel = finding.severity.toUpperCase();
      return `### Task ${index + 1}: [${severityLabel}] ${finding.title}

- **File:** \`${location}\`
- **Fix:** ${finding.fixHint}`;
    })
    .join("\n\n");

  return `# Security remediation PLAN

Target repo: ./demo-app
Audit grade: ${report.grade}
Generated: ${generated}

---

${TIME_BOX_DISCLAIMER}

## Tasks

${taskBlocks || "_No critical or high findings — no tasks generated._"}
`;
}
