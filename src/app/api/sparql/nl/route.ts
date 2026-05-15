import { NextRequest, NextResponse } from "next/server";

// POST /api/sparql/nl
// Body: { text: string }
// → { rows, columns, description, sparql }   (sparql 디버그용 포함)

export async function POST(req: NextRequest) {
  let text: string;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const { nlToSPARQL, runSPARQL } = await import("@/lib/sparqlEngine");
    const parsed = await nlToSPARQL(text.trim());
    if (!parsed) {
      return NextResponse.json(
        { error: '"X의 Y" 또는 "X → Y" 패턴으로 입력하세요. 예: "정담원의 계약자"' },
        { status: 422 }
      );
    }

    const rows = await runSPARQL(parsed.sparql);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return NextResponse.json({
      rows,
      columns,
      description: parsed.description,
      sparql: parsed.sparql,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
