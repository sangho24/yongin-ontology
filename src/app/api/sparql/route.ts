import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/sparql
// Body: { query: string }
// → { rows: Record<string,string>[], columns: string[] }

const BodySchema = z.object({
  query: z.string(),
});

// SPARQL SERVICE 키워드 — federated query는 외부 endpoint 호출(SSRF 벡터)이라 거부
const SERVICE_PAT = /\bSERVICE\b/i;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "query must be a string" },
      { status: 400 }
    );
  }

  const { query } = parsed.data;
  if (!query.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }
  if (SERVICE_PAT.test(query)) {
    return NextResponse.json(
      { error: "SERVICE keyword is not allowed (federated query blocked)" },
      { status: 400 }
    );
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
