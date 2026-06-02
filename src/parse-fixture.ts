import { isAgentReport } from "./merge-report.js";
import { parseAgentJson, stripJsonFences } from "./parse-agent-json.js";

const FIXTURE = `\`\`\`json
{
  "agent": "secrets-scout",
  "findings": [
    {
      "title": "Committed .env with API keys",
      "severity": "critical",
      "category": "secrets-exposure",
      "file": "demo-app/.env",
      "line": 1,
      "evidence": "CURSOR_API_KEY=sk-fake-demo-key",
      "exploitScenario": "Clone repo and harvest keys.",
      "fixHint": "Remove .env from git and rotate keys."
    }
  ]
}
\`\`\``;

const stripped = stripJsonFences(FIXTURE);
const parsed = parseAgentJson<unknown>(stripped);

if (!isAgentReport(parsed)) {
  console.error("parse-fixture: fenced AgentReport failed validation");
  process.exit(1);
}

console.log(
  `parse-fixture OK: ${parsed.agent}, ${parsed.findings.length} finding(s)`,
);
