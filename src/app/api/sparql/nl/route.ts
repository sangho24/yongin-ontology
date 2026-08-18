import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/sparql/nl
// Body: { text: string }
// → { rows, columns, description, sparql }   (sparql 디버그용 포함)

const BodySchema = z.object({
  text: z.string(),
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
      { error: "text must be a string" },
      { status: 400 }
    );
  }

  const { text } = parsed.data;
  if (!text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (SERVICE_PAT.test(text)) {
    return NextResponse.json(
      { error: "SERVICE keyword is not allowed (federated query blocked)" },
      { status: 400 }
    );
  }

  try {
    const { nlToSPARQL, runSPARQL } = await import("@/lib/sparqlEngine");
    const parsedNl = await nlToSPARQL(text.trim());
    if (!parsedNl) {
      return NextResponse.json(
        { error: '"X의 Y" 또는 "X → Y" 패턴으로 입력하세요. 예: "정담원의 계약자"' },
        { status: 422 }
      );
    }

    const rows = await runSPARQL(parsedNl.sparql);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return NextResponse.json({
      rows,
      columns,
      description: parsedNl.description,
      sparql: parsedNl.sparql,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
