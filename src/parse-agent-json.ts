import { runAgent } from "./agents/index.js";
import type { AgentRunConfig, AgentRunInput } from "./agents/types.js";

const JSON_RETRY_SUFFIX =
  "\n\nYour previous reply was not valid JSON. Respond with ONLY valid JSON matching the schema. No markdown fences, no commentary.";

export function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

export function parseAgentJson<T>(text: string): T {
  const raw = stripJsonFences(text);
  return JSON.parse(raw) as T;
}

export type ParseAgentJsonResult<T> =
  | { ok: true; data: T; runId: string; text: string }
  | { ok: false; kind: "startup" | "run" | "parse"; message: string; runId?: string };

export async function runAgentForJson<T>(options: {
  input: AgentRunInput;
  config: AgentRunConfig;
  validate: (value: unknown) => value is T;
}): Promise<ParseAgentJsonResult<T>> {
  const first = await runAgent(options.input, options.config);
  if (!first.ok) {
    return {
      ok: false,
      kind: first.kind,
      message: first.message,
      runId: first.runId,
    };
  }

  try {
    const data = parseAgentJson<T>(first.text);
    if (!options.validate(data)) {
      throw new Error("JSON did not match expected schema");
    }
    return { ok: true, data, runId: first.runId, text: first.text };
  } catch (parseErr) {
    console.warn(`[${options.input.id}] invalid JSON, retrying agent…`);
    const retry = await runAgent(
      {
        id: options.input.id,
        prompt: options.input.prompt + JSON_RETRY_SUFFIX,
      },
      options.config,
    );

    if (!retry.ok) {
      return {
        ok: false,
        kind: retry.kind,
        message: retry.message,
        runId: retry.runId,
      };
    }

    try {
      const data = parseAgentJson<T>(retry.text);
      if (!options.validate(data)) {
        throw new Error("JSON did not match expected schema");
      }
      return { ok: true, data, runId: retry.runId, text: retry.text };
    } catch {
      const msg =
        parseErr instanceof Error ? parseErr.message : "Invalid JSON from agent";
      return {
        ok: false,
        kind: "parse",
        message: `Failed to parse agent JSON after retry: ${msg}`,
        runId: retry.runId,
      };
    }
  }
}
