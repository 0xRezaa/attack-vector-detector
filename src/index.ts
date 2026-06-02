import "dotenv/config";
import { runAgent } from "./agents/index.js";
import { requireApiKey } from "./config.js";

const prompt =
  process.argv.slice(2).join(" ") ||
  "Summarize this repository in one paragraph.";

let apiKey: string;
try {
  apiKey = requireApiKey();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const result = await runAgent(
  { id: "default", prompt },
  { apiKey, cwd: process.cwd() },
);

if (!result.ok) {
  if (result.kind === "startup") {
    console.error("Startup failed:", result.message, "retryable=", result.retryable);
    process.exit(1);
  }
  console.error(result.message);
  process.exit(2);
}

console.log(result.text || "(no text result)");
