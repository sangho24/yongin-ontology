"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { AppLayout } from "@/components/AppLayout";
import { KnowledgeGraph, lookupSelection } from "@/components/KnowledgeGraph";

// Network view는 d3-force·SVG 의존 → SSR 회피 위해 dynamic import
const KnowledgeGraphNetwork = dynamic(
  () =>
    import("@/components/KnowledgeGraphNetwork").then(
      (m) => m.KnowledgeGraphNetwork
    ),
  { ssr: false, loading: () => (
    <div className="flex h-full w-full items-center justify-center text-[12px] text-stone-400">
      Network 그래프 준비 중…
    </div>
  ) }
);

// =============================================================================
// /knowledge-graph — 재동상무님 미팅 prop
// T-Box 클래스와 그 인스턴스의 실제 관계를 시각화. 사이드바 NAV 미등록(미팅용 직접 URL 진입).
// =============================================================================

type Layer = "class" | "instance";
// Instance layer 내부 sub-mode: cluster(기존 column 정렬) / network(d3-force)
type InstanceMode = "cluster" | "network";
type Selection = { kind: "class" | "instance"; id: string } | null;

// 3사 색상 — KnowledgeGraph 내부 ENTITY_COLOR와 동기화
const ENTITY_TONE: Record<string, string> = {
  라이프: "#0095A9",
  용인공원: "#78716c",
  YPL: "#b45309",
};

export default function KnowledgeGraphPage() {
  const [layer, setLayer] = useState<Layer>("class");
  const [instanceMode, setInstanceMode] = useState<InstanceMode>("cluster");
  const [selected, setSelected] = useState<Selection>(null);

  const detail = useMemo(() => (selected ? lookupSelection(selected) : null), [selected]);

  // detail 패널 열렸을 때는 NOTES 자동 숨김 — AppLayout 우측 aside와 detail column이
  // 좁은 공간에서 겹치는 issue 방지
  return (
    <AppLayout
      pageTitle="Knowledge Graph — 인스턴스 관계망"
      pageSubtitle="T-Box 클래스와 그 인스턴스의 실제 관계를 시각화. 노드 = 인스턴스, 엣지 = T-Box relation."
      narration={
        detail ? undefined : (
          <div className="space-y-2.5">
            <p>
              라이프(<span className="font-medium" style={{ color: ENTITY_TONE.라이프 }}>mint</span>) ·
              용인공원(<span className="font-medium" style={{ color: ENTITY_TONE.용인공원 }}>stone</span>) ·
              YPL(<span className="font-medium" style={{ color: ENTITY_TONE.YPL }}>amber</span>) 3사 인스턴스가 한 그래프에서 어떻게 연결되어 있는지 한눈에.
            </p>
            <p>
              결손 영역(예: 장지 Member master 부재)은 회색 dashed 노드로 표시 — 데이터·시스템 보강 시 활성화 가능한 KPI 후보.
            </p>
            <p>
              <strong>Class layer</strong>는 의미층 spec, <strong>Instance layer</strong>는 그 spec에 실제로 매달려 있는 대표 row.
            </p>
          </div>
        )
      }
    >
      {/* 상단 컨트롤 — Class / Instance toggle + 범례 */}
      <section className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-md border border-stone-200/80 bg-white p-0.5">
            <button
              type="button"
              onClick={() => {
                setLayer("class");
                setSelected(null);
              }}
              className={`rounded px-3 py-1.5 text-[12px] font-medium tracking-tight transition-colors ${
                layer === "class"
                  ? "bg-[#0095A9] text-white"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              Class layer
            </button>
            <button
              type="button"
              onClick={() => {
                setLayer("instance");
                setSelected(null);
              }}
              className={`rounded px-3 py-1.5 text-[12px] font-medium tracking-tight transition-colors ${
                layer === "instance"
                  ? "bg-[#0095A9] text-white"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              Instance layer
            </button>
          </div>

          {/* Instance layer 활성 시 sub-toggle: Cluster / Network */}
          {layer === "instance" && (
            <div className="inline-flex items-center rounded-md border border-stone-200/80 bg-white p-0.5">
              <button
                type="button"
                onClick={() => {
                  setInstanceMode("cluster");
                  setSelected(null);
                }}
                className={`rounded px-2.5 py-1 text-[11px] font-medium tracking-tight transition-colors ${
                  instanceMode === "cluster"
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                Cluster
              </button>
              <button
                type="button"
                onClick={() => {
                  setInstanceMode("network");
                  setSelected(null);
                }}
                className={`rounded px-2.5 py-1 text-[11px] font-medium tracking-tight transition-colors ${
                  instanceMode === "network"
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                Network
              </button>
            </div>
          )}
        </div>

        {/* Entity 범례 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ENTITY_TONE.라이프 }} />
            라이프 (상조 VC)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ENTITY_TONE.용인공원 }} />
            용인공원 (장지 VC)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ENTITY_TONE.YPL }} />
            YPL (장지 영리)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="flex items-center gap-0.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ENTITY_TONE.라이프 }} />
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ENTITY_TONE.용인공원 }} />
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ENTITY_TONE.YPL }} />
            </span>
            3사 공통
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-stone-300" />
            결손 (보강 후보)
          </span>
        </div>
      </section>

      {/* 그래프 + 우측 detail */}
      <section className={`grid gap-6 ${detail ? "lg:grid-cols-[2.4fr_1fr]" : "grid-cols-1"}`}>
        <div className="rounded-md border border-stone-200/80 bg-white p-1.5">
          <div className="h-[680px] rounded bg-[#fafaf7]">
            {layer === "instance" && instanceMode === "network" ? (
              <KnowledgeGraphNetwork
                onSelect={setSelected}
                selectedId={selected?.id ?? null}
              />
            ) : (
              <KnowledgeGraph layer={layer} onSelect={setSelected} />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-3 py-3 text-[11px] leading-relaxed text-stone-500">
            <span>
              현재 layer:{" "}
              <strong className="text-stone-700">
                {layer === "class"
                  ? "Class (T-Box)"
                  : instanceMode === "network"
                  ? "Instance · Network (force-directed)"
                  : "Instance · Cluster (대표 인스턴스)"}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-px w-5 bg-stone-400" />
              충족된 관계
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-px w-5 border-t border-dashed"
                style={{ borderColor: "#b45309" }}
              />
              부분 결손 — 데이터 보강 후 활성
            </span>
          </div>
        </div>

        {/* Detail panel — 노드 클릭 시 표시 */}
        {detail && (
          <aside className="space-y-3">
            <div className="rounded-md border border-stone-200/80 bg-white p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                {selected?.kind === "class" ? "CLASS" : "INSTANCE"}
              </div>
              <h3 className="mt-1 text-[15px] font-semibold tracking-tight text-stone-900">
                {detail.title}
              </h3>
              {detail.parentClass && (
                <p className="mt-0.5 text-[11px] text-stone-500">
                  속한 클래스: <span className="font-medium text-stone-700">{detail.parentClass}</span>
                </p>
              )}

              <div className="mt-4 space-y-2.5 text-[12px] leading-relaxed text-stone-700">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-stone-400">Entity</span>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {detail.entity && detail.entity !== "3사 공통" && ENTITY_TONE[detail.entity] && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: ENTITY_TONE[detail.entity] }}
                      />
                    )}
                    <span className="font-medium text-stone-800">{detail.entity || "—"}</span>
                  </div>
                </div>

                {detail.kpi && (
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-stone-400">KPI · 메타</span>
                    <div className="mt-0.5 text-stone-700">{detail.kpi}</div>
                  </div>
                )}

                {detail.status && (
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-stone-400">Status</span>
                    <div className="mt-0.5">
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          detail.status === "satisfied"
                            ? "bg-[#e6f4f6] text-[#0095A9]"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {detail.status === "satisfied"
                          ? "충족"
                          : detail.status === "partiallyMissing"
                          ? "부분 결손"
                          : "결손"}
                      </span>
                    </div>
                  </div>
                )}

                {detail.definition && (
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-stone-400">정의</span>
                    <div className="mt-0.5 text-stone-700">{detail.definition}</div>
                  </div>
                )}

                {detail.satisfiedFor && detail.satisfiedFor.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 border-t border-stone-100 pt-2.5">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.08em] text-emerald-700">충족</div>
                      <div className="mt-0.5 text-stone-700">{detail.satisfiedFor.join(", ") || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.08em] text-amber-700">결손</div>
                      <div className="mt-0.5 text-stone-700">
                        {detail.missingFor && detail.missingFor.length > 0 ? detail.missingFor.join(", ") : "—"}
                      </div>
                    </div>
                  </div>
                )}

                {detail.missing && (
                  <div className="rounded border border-stone-200 bg-stone-50 px-2.5 py-2 text-[11px] leading-relaxed text-stone-600">
                    이 인스턴스는 현재 ERP/BI에서 결손 상태입니다. 데이터·시스템 보강 시 활성화 가능한 KPI 후보로 식별됨.
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </section>

      {/* 하단 narration — 그래프 읽는 법 */}
      <section className="mt-10 border-t border-stone-200 pt-6">
        <h3 className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-stone-400">
          READING THE GRAPH
        </h3>
        <div className="grid gap-3 text-[12px] leading-relaxed text-stone-600 md:grid-cols-3">
          <div>
            <div className="font-medium text-stone-800">Class layer</div>
            <p className="mt-1">
              13개 클래스 · 16개 property 관계로 구성된 의미층 spec. 노드 좌측 dot 색이 해당 클래스를 보유한 entity.
            </p>
          </div>
          <div>
            <div className="font-medium text-stone-800">Instance layer</div>
            <p className="mt-1">
              두 가지 시점 — <strong>Cluster</strong>: 클래스별 column 정렬로 구조 일관성 파악. <strong>Network</strong>: force-directed 관계망, 드래그·줌으로 자유 탐색.
            </p>
          </div>
          <div>
            <div className="font-medium text-stone-800">결손 시각화</div>
            <p className="mt-1">
              회색 dashed 노드 = 데이터 master 부재. 장지 VC의 Member·SalesAgent dimension이 대표 결손 — 보강 시 영업 생산성·CAC KPI 활성화.
            </p>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
