export function orchestratorPrompt(specialistReportsJson: string): string {
  return `You are the security audit Orchestrator. You receive specialist findings only — do NOT rescan files.

Merge the following AgentReport JSON array into one AuditReport.

DEDUPLICATION (strict):
- If two findings share the same file AND line, keep exactly one (prefer higher severity: critical > high > medium > low).
- Ignore category/title differences for the same file:line — specialists sometimes overlap (e.g. client token on page.tsx reported as both secrets and auth).

CATEGORY NORMALIZATION: map all categories to kebab-case from:
committed-secrets | client-exposure | missing-authentication | idor | sql-injection | xss

INPUT:
${specialistReportsJson}

GRADE RUBRIC (assign grade A–F):
- Any critical finding → grade at most D
- Two or more critical findings → F
- No critical but multiple high → C or D
- Only medium/low → B or C

Return ONLY valid JSON (no markdown fences) matching:
{
  "grade": "A" | "B" | "C" | "D" | "F",
  "summary": "executive summary paragraph",
  "findingCount": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "topExploitChain": "multi-step attack narrative chaining the worst issues",
  "demoScript": ["step 1 for presenter", "step 2", "step 3"],
  "findings": [
    {
      "id": "optional — server may assign",
      "title": "string",
      "severity": "critical" | "high" | "medium" | "low",
      "category": "string",
      "file": "demo-app/...",
      "line": number,
      "evidence": "string",
      "exploitScenario": "string",
      "fixHint": "string"
    }
  ],
  "agentContributions": {
    "secrets-scout": number,
    "auth-guard": number,
    "injection-hunter": number,
    "orchestrator": number
  }
}

findingCount must match the merged findings array length by severity.
agentContributions: count how many merged findings each specialist originally reported (after dedupe, sum of the three specialists should equal findings.length); set orchestrator to findings.length (merged total).
demoScript must have exactly 3 strings aligned with a scan→audit→remediate demo flow.`;
}
