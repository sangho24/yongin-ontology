import { NextResponse } from "next/server";

// GET /api/sparql/cq
// → { templates: { id, label, nlExample, sparql }[] }
// resultDesc 함수는 직렬화 불가 → 프론트에서 id 기반으로 매핑

export async function GET() {
  const { CQ_TEMPLATES } = await import("@/lib/sparqlEngine");
  const templates = CQ_TEMPLATES.map(({ id, label, nlExample, sparql }) => ({
    id,
    label,
    nlExample,
    sparql,
  }));
  return NextResponse.json({ templates });
}
