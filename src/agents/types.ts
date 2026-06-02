export const DEFAULT_MODEL_ID = "composer-2.5";

export interface AgentRunConfig {
  apiKey: string;
  cwd: string;
  model?: { id: string };
}

export interface AgentRunInput {
  /** Stable id for orchestration and logging (e.g. "secrets-scout"). */
  id: string;
  prompt: string;
}

export interface AgentRunSuccess {
  ok: true;
  agentId: string;
  runId: string;
  text: string;
}

export interface AgentRunFailure {
  ok: false;
  agentId: string;
  kind: "startup" | "run";
  message: string;
  runId?: string;
  retryable?: boolean;
}

export type AgentRunResult = AgentRunSuccess | AgentRunFailure;
