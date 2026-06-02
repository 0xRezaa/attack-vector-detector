import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  // VULN: IDOR - returns any user's notes without auth
  const notes = { "1": ["note a"], "2": ["secret note"] };
  return NextResponse.json({ userId, notes: notes[userId as keyof typeof notes] ?? [] });
}
