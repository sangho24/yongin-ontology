"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, X, Loader2, AlertCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SPARQLRow {
  [key: string]: string;
}

interface CQTemplate {
  id: string;
  label: string;
  nlExample: string;
  sparql: string;
}

// resultDesc는 서버에서 직렬화 불가 → 클라이언트 매핑
const RESULT_DESC: Record<string, (rows: SPARQLRow[]) => string> = {
  cq1:         (r) => `정담원 구역 계약 ${r.length}건`,
  cq2:         (r) => `온라인 유입 회원 ${r.length}명 · 담당 부서 확인`,
  cq3:         (r) => `인건비 귀속 활동 ${r.length}개`,
  cq4:         (r) => `세수연 계약자 ${r.length}명 · 채널 분포`,
  "cq5-crossvc": (r) => `라이프 회원 ${r.length}명의 장지 구역 계약 (Cross-VC)`,
  "cq6-channel": (r) => `채널 ${r.length}개 집계`,
  cq5:         (r) => `결손 인스턴스 ${r.length}개`,
};

interface QueryResult {
  description: string;
  rows: SPARQLRow[];
  columns: string[];
  error?: string;
  sparql?: string;  // 디버그용 — NL 쿼리 시 생성된 SPARQL 표시
}

const ENTITY_COLOR: Record<string, string> = {
  라이프: "#0095A9",
  용인공원: "#78716c",
  YPL: "#b45309",
  공통: "#a8a29e",
};

const INST_PREFIX = "http://yonginpark.kr/instance/";
const YP_PREFIX   = "http://yonginpark.kr/ontology#";

function shortVal(val: string): string {
  return val.replace(INST_PREFIX, "").replace(YP_PREFIX, "yp:");
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiSPARQL(sparql: string): Promise<{ rows: SPARQLRow[]; columns: string[] }> {
  const res = await fetch("/api/sparql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: sparql }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "SPARQL 실행 오류");
  return data;
}

async function apiNL(text: string): Promise<QueryResult> {
  const res = await fetch("/api/sparql/nl", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "NL 쿼리 오류");
  return {
    description: data.description,
    rows: data.rows,
    columns: data.columns,
    sparql: data.sparql,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KGQueryBar() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<CQTemplate[]>([]);
  const [showSparql, setShowSparql] = useState(false);

  useEffect(() => {
    fetch("/api/sparql/cq")
      .then((r) => r.json())
      .then(({ templates }) => setTemplates(templates ?? []))
      .catch(() => {});
  }, []);

  const runCQ = useCallback(async (tpl: CQTemplate) => {
    setLoading(true);
    setActiveId(tpl.id);
    setInput(tpl.nlExample);
    setResult(null);
    setShowSparql(false);
    try {
      const { rows, columns } = await apiSPARQL(tpl.sparql);
      const descFn = RESULT_DESC[tpl.id];
      setResult({ description: descFn ? descFn(rows) : tpl.label, rows, columns });
    } catch (e) {
      setResult({ description: tpl.label, rows: [], columns: [], error: String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  const runNL = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setActiveId(null);
    setResult(null);
    setShowSparql(false);
    try {
      const res = await apiNL(text.trim());
      setResult(res);
    } catch (e) {
      setResult({
        description: text,
        rows: [],
        columns: [],
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setInput("");
    setResult(null);
    setActiveId(null);
    setShowSparql(false);
  }, []);

  return (
    <div className="mb-6 rounded-md border border-stone-200/80 bg-white">
      {/* 검색 입력 */}
      <div className="flex items-center gap-2 border-b border-stone-100 px-3 py-2.5">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#0095A9]" />
        ) : (
          <Search className="h-3.5 w-3.5 shrink-0 text-stone-400" strokeWidth={2} />
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runNL(input)}
          placeholder='"정담원의 계약자"  ·  "인건비 → 부서"  ·  "온라인 회원의 채널"'
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-stone-800 placeholder:text-stone-400 focus:outline-none"
        />
        {(input || result) && !loading && (
          <button onClick={clear} className="shrink-0 text-stone-400 hover:text-stone-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* CQ 템플릿 chip */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
          CQ
        </span>
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => runCQ(tpl)}
            disabled={loading}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${
              activeId === tpl.id
                ? "border-[#0095A9] bg-[#e6f4f6] text-[#0095A9]"
                : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 hover:bg-stone-100"
            }`}
          >
            {tpl.label}
          </button>
        ))}
      </div>

      {/* 결과 */}
      {result && (
        <div className="border-t border-stone-100 px-3 pb-3 pt-2.5">
          {result.error ? (
            <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {result.error}
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-700">
                  {result.description}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-stone-400">{result.rows.length}행</span>
                  {result.sparql && (
                    <button
                      onClick={() => setShowSparql((v) => !v)}
                      className="text-[10px] text-stone-400 underline underline-offset-2 hover:text-stone-600"
                    >
                      {showSparql ? "SPARQL 숨기기" : "SPARQL 보기"}
                    </button>
                  )}
                </div>
              </div>

              {/* 생성된 SPARQL 표시 (NL 쿼리 디버그용) */}
              {showSparql && result.sparql && (
                <pre className="mb-2 overflow-x-auto rounded border border-stone-100 bg-stone-50 p-2 text-[10px] leading-relaxed text-stone-500">
                  {result.sparql.trim()}
                </pre>
              )}

              {result.rows.length === 0 ? (
                <p className="text-[11px] text-stone-400">결과 없음</p>
              ) : (
                <ResultTable columns={result.columns} rows={result.rows} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 결과 테이블 ──────────────────────────────────────────────────────────────

function ResultTable({ columns, rows }: { columns: string[]; rows: SPARQLRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-stone-100">
            {columns.map((col) => (
              <th
                key={col}
                className="pb-1.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-stone-50 last:border-0">
              {columns.map((col) => {
                const raw = row[col] ?? "—";
                const val = shortVal(raw);
                const isEntity = col === "entity" || col === "mEntity" || col === "zEntity";
                const color = isEntity ? (ENTITY_COLOR[val] ?? null) : null;
                const isIRI = raw.startsWith("http") && !isEntity;
                return (
                  <td key={col} className="py-1.5 pr-4 align-top text-stone-700">
                    {color ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        {val}
                      </span>
                    ) : isIRI ? (
                      <span className="font-mono text-[10px] text-stone-400">{val}</span>
                    ) : (
                      val
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
