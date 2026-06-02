import { NextResponse } from "next/server";
export async function GET() {
  // VULN: no authentication on admin endpoint
  return NextResponse.json({ users: ["alice", "bob"], role: "admin" });
}
export async function DELETE() {
  return NextResponse.json({ deleted: true });
}
