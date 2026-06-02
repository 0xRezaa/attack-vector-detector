export function requireApiKey(): string {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("Set CURSOR_API_KEY in .env or the environment");
  }
  return apiKey.trim();
}
