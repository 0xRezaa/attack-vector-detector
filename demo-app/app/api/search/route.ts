import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  // VULN: string concatenation SQL query
  const query = `SELECT * FROM items WHERE title LIKE '%${q}%'`;
  return NextResponse.json({ query, results: [] });
}
