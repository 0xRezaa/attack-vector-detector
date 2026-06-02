import "dotenv/config";
import { Agent, CursorAgentError } from "@cursor/sdk";

const apiKey = process.env.CURSOR_API_KEY;
if (!apiKey?.trim()) {
  console.error("Set CURSOR_API_KEY in .env or the environment");
  process.exit(1);
}

try {
  const result = await Agent.prompt(
    process.argv.slice(2).join(" ") ||
      "Summarize this repository in one paragraph.",
    {
      apiKey,
      model: { id: "composer-2.5" },
      local: {
        cwd: process.cwd(),
        settingSources: [],
      },
    },
  );

  if (result.status === "error") {
    console.error("Run failed:", result.id);
    process.exit(2);
  }

  console.log(result.result ?? "(no text result)");
} catch (err) {
  if (err instanceof CursorAgentError) {
    console.error(
      "Startup failed:",
      err.message,
      "retryable=",
      err.isRetryable,
    );
    process.exit(1);
  }
  throw err;
}
