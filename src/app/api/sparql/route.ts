import { NextRequest, NextResponse } from "next/server";

// POST /api/sparql
// Body: { query: string }
// → { rows: Record<string,string>[], columns: string[] }

export async function POST(req: NextRequest) {
  let query: string;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!query?.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const { runSPARQL } = await import("@/lib/sparqlEngine");
    const rows = await runSPARQL(query);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return NextResponse.json({ rows, columns });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
