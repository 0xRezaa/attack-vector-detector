import { Agent, CursorAgentError } from "@cursor/sdk";
import {
  DEFAULT_MODEL_ID,
  type AgentRunConfig,
  type AgentRunInput,
  type AgentRunResult,
} from "./types.js";

export async function runAgent(
  input: AgentRunInput,
  config: AgentRunConfig,
): Promise<AgentRunResult> {
  try {
    const result = await Agent.prompt(input.prompt, {
      apiKey: config.apiKey,
      model: config.model ?? { id: DEFAULT_MODEL_ID },
      local: {
        cwd: config.cwd,
        settingSources: [],
      },
    });

    if (result.status === "error") {
      return {
        ok: false,
        agentId: input.id,
        kind: "run",
        message: `Run failed: ${result.id}`,
        runId: result.id,
      };
    }

    return {
      ok: true,
      agentId: input.id,
      runId: result.id,
      text: result.result ?? "",
    };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      return {
        ok: false,
        agentId: input.id,
        kind: "startup",
        message: err.message,
        retryable: err.isRetryable,
      };
    }
    throw err;
  }
}
