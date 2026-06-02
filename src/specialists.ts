import { runAgentForJson } from "./parse-agent-json.js";
import { authGuardPrompt } from "./prompts/auth.js";
import { injectionHunterPrompt } from "./prompts/injection.js";
import { secretsScoutPrompt } from "./prompts/secrets.js";
import { isAgentReport } from "./merge-report.js";
import type { AgentRunConfig } from "./agents/types.js";
import type { AgentReport, SpecialistAgentId } from "./types.js";

export type SpecialistRunResult =
  | { ok: true; report: AgentReport; runId: string }
  | { ok: false; agent: SpecialistAgentId; kind: "startup" | "run" | "parse"; message: string; runId?: string };

const PROMPTS: Record<SpecialistAgentId, () => string> = {
  "secrets-scout": secretsScoutPrompt,
  "auth-guard": authGuardPrompt,
  "injection-hunter": injectionHunterPrompt,
};

export async function runSpecialist(
  agent: SpecialistAgentId,
  config: AgentRunConfig,
): Promise<SpecialistRunResult> {
  const result = await runAgentForJson({
    input: { id: agent, prompt: PROMPTS[agent]() },
    config,
    validate: isAgentReport,
  });

  if (!result.ok) {
    return {
      ok: false,
      agent,
      kind: result.kind,
      message: result.message,
      runId: result.runId,
    };
  }

  if (result.data.agent !== agent) {
    result.data.agent = agent;
  }

  return { ok: true, report: result.data, runId: result.runId };
}

export const SPECIALIST_AGENTS: SpecialistAgentId[] = [
  "secrets-scout",
  "auth-guard",
  "injection-hunter",
];
