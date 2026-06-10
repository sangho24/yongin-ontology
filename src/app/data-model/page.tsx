"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AppLayout } from "@/components/AppLayout";
import { Card, EvidenceButton, InsightBox, SourceCaption } from "@/components/Card";
import { TBoxNode } from "@/components/TBoxNode";
import tbox from "@/data/tbox.json";
import asisLogic from "@/data/asis_logic.json";

const nodeTypes = { classNode: TBoxNode };

// =============================================================================
// T-Box 노드/엣지/Axiom ID → evidence_index slotId 매핑
// 매핑되지 않는 항목은 undefined 반환 → EvidenceButton 자체가 렌더 SKIP
// =============================================================================
const NODE_SLOT_MAP: Record<string, string> = {
  Member: "tbox_class_member",
  SalesAgent: "tbox_class_sales_agent",
  Contract: "tbox_class_contract",
  Zone: "tbox_class_zone",
  BurialMethod: "tbox_class_burial_method",
  RevenueStream: "tbox_class_revenue_stream",
  Account: "tbox_class_account",
  Transaction: "tbox_class_transaction",
  Vendor: "tbox_class_vendor",
  Activity: "tbox_class_activity",
  CostDriver: "tbox_class_cost_driver",
  Entity: "tbox_class_entity",
  FiscalPeriod: "tbox_class_fiscal_period",
};

// 엣지 ID → evidence_index slotId. 결손 5개 + satisfied 11개 = 16개 박제.
// (잔여 10개는 attribute property로, edge 형태로 그래프에 표시되지 않음)
const EDGE_SLOT_MAP: Record<string, string> = {
  // partiallyMissing 5개
  "e-Member-contracts-Contract": "tbox_property_contracts",
  "e-Member-assignedTo-SalesAgent": "tbox_property_assigned_to",
  "e-Contract-uses-Zone": "tbox_property_uses_zone",
  "e-Account-hasDriver-CostDriver": "tbox_property_has_driver_account",
  "e-SalesAgent-belongsTo-Entity": "tbox_property_belongs_to",
  // satisfied 11개
  "e-Contract-hasRevenueStream-RevenueStream": "tbox_property_has_revenue_stream",
  "e-Zone-locatedIn-BurialMethod": "tbox_property_located_in",
  "e-Account-allocatesTo-RevenueStream": "tbox_property_allocates_to",
  "e-Account-tracesTo-Zone": "tbox_property_traces_to",
  "e-Transaction-debitedTo-Account": "tbox_property_debited_to",
  "e-Transaction-involves-Vendor": "tbox_property_involves",
  "e-Transaction-occursIn-FiscalPeriod": "tbox_property_occurs_in",
  "e-Transaction-incurredBy-Entity": "tbox_property_incurred_by",
  "e-RevenueStream-supportedBy-BurialMethod": "tbox_property_supported_by",
  "e-Vendor-performs-Activity": "tbox_property_performs",
  "e-Activity-hasDriver-CostDriver": "tbox_property_has_driver_activity",
};

// Axiom ID → evidence_index slotId
const AXIOM_SLOT_MAP: Record<string, string> = {
  A1: "tbox_axiom_a1",
  A2: "tbox_axiom_a2",
  A3: "tbox_axiom_a3",
  A4: "tbox_axiom_a4",
  A5: "tbox_axiom_a5",
  A5p: "tbox_axiom_a5p",
};

// As-is 확정 출처 매핑 — confidence 문구에 "확정"이 포함되면 확정 badge, 아니면 비고 노출
function isConfirmedSource(confidence: string): boolean {
  return confidence.startsWith("확정");
}

type ClassDef = (typeof tbox.classes)[number];
type PropertyDef = (typeof tbox.properties)[number];

export default function DataModelPage() {
  const [selected, setSelected] = useState<{ kind: "node" | "edge"; id: string } | null>(null);

  const initialNodes = useMemo<Node[]>(
    () =>
      tbox.reactFlow.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        // MiniMap이 노드 크기를 측정하기 전 fallback width/height. classNode 타입이라
        // 일부 minimap 코드 경로에서 invisible해지는 것을 방지.
        width: 170,
        height: 60,
        style: { width: 170, height: 60 },
      })),
    []
  );

  const initialEdges = useMemo<Edge[]>(
    () =>
      tbox.reactFlow.edges.map((e) => {
        const status = e.data?.status ?? "satisfied";
        const isMissing = status === "missing" || status === "partiallyMissing";
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          type: "smoothstep",
          animated: !!e.animated,
          style: {
            stroke: status === "missing" ? "#ef4444" : status === "partiallyMissing" ? "#f59e0b" : "#94a3b8",
            strokeWidth: isMissing ? 2.5 : 1.5,
            strokeDasharray: isMissing ? "6 4" : undefined,
          },
          labelStyle: { fontSize: 10, fill: "#475569" },
          labelBgStyle: { fill: "#ffffff" },
          markerEnd: { type: MarkerType.ArrowClosed, color: status === "missing" ? "#ef4444" : status === "partiallyMissing" ? "#f59e0b" : "#94a3b8" },
          data: e.data,
        } as Edge;
      }),
    []
  );

  const onNodeClick = useCallback((_: unknown, n: Node) => {
    setSelected({ kind: "node", id: n.id });
  }, []);

  const onEdgeClick = useCallback((_: unknown, e: Edge) => {
    setSelected({ kind: "edge", id: e.id });
  }, []);

  const stats = useMemo(() => {
    const allClasses = tbox.classes as ClassDef[];
    const allEdges = tbox.reactFlow.edges;
    const classMissing = allClasses.filter((c) => c.status !== "satisfied").length;
    const edgeMissing = allEdges.filter((e) => e.data?.status !== "satisfied").length;
    return {
      totalClasses: allClasses.length,
      classMissing,
      totalEdges: allEdges.length,
      edgeMissing,
      sourceCount: asisLogic.dataSources.length,
    };
  }, []);

  const detail = useMemo(() => {
    if (!selected) return null;
    if (selected.kind === "node") {
      const cls = (tbox.classes as ClassDef[]).find((c) => c.id === selected.id);
      if (!cls) return null;
      return { kind: "class" as const, data: cls };
    }
    const edge = tbox.reactFlow.edges.find((e) => e.id === selected.id);
    if (!edge) return null;
    const propId = edge.id.replace(/^e-/, "");
    const prop = (tbox.properties as PropertyDef[] | undefined)?.find(
      (p) => p.id === propId || (edge.source && edge.target && p.id.includes(edge.source) && p.id.includes(edge.target))
    );
    return { kind: "edge" as const, data: { ...edge, prop } };
  }, [selected]);

  return (
    <AppLayout
      pageTitle="데이터 모델 (T-Box)"
      pageSubtitle="그룹 관리손익 BI를 떠받치는 데이터 모델 — 0528 확정 as-is 로직 및 출처 체계 (더존 ERP 구축사 전달 완료, 260603)."
      narration={
        <div className="space-y-2">
          <p>13 Class · 26 Property · 6 Axiom으로 구성된 의미층.</p>
          <p>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" /> 충족 (KPI 활성) ·
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mx-1" /> 부분 미연동 ·
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 mx-1" /> 미연동 (보강 후보)
          </p>
          <p>
            <strong>노드/엣지를 클릭</strong>하면 정의·충족 현황이 우측에 표시됩니다. 배부 로직과
            출처 매핑은 하단 As-is 확정 로직 섹션 참조.
          </p>
        </div>
      }
    >
      <section className="grid gap-px overflow-hidden rounded-md border border-stone-200/80 bg-stone-200/60 sm:grid-cols-4">
        <div className="bg-white p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-stone-500">Class</div>
            <EvidenceButton slotId="tbox_stat_total_classes" label="전체 Class" variant="subtle" />
          </div>
          <div className="headline mt-2 text-[28px] leading-none text-stone-900 tnum">{stats.totalClasses}</div>
          <div className="mt-1.5 text-[12px] text-stone-500">전체 정의된 클래스</div>
        </div>
        <div className="bg-white p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#b45309]">결손 Class</div>
            <EvidenceButton slotId="tbox_stat_missing_classes" label="결손 Class" variant="subtle" />
          </div>
          <div className="headline mt-2 text-[28px] leading-none text-stone-900 tnum">{stats.classMissing}</div>
          <div className="mt-1.5 text-[12px] text-stone-500">부분 미연동 또는 dimension 보강 필요</div>
        </div>
        <div className="bg-white p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#9a3412]">결손 Property</div>
            <EvidenceButton slotId="tbox_stat_missing_properties" label="결손 Property" variant="subtle" />
          </div>
          <div className="headline mt-2 text-[28px] leading-none text-stone-900 tnum">
            {stats.edgeMissing}<span className="text-stone-400 font-normal"> / {stats.totalEdges}</span>
          </div>
          <div className="mt-1.5 text-[12px] text-stone-500">그래프 edge 기준 (attribute property 제외)</div>
        </div>
        <div className="bg-[#0095A9] p-5 text-white">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#b3dde0]">확정 출처 매핑</div>
          <div className="headline mt-2 text-[28px] leading-none text-white tnum">{stats.sourceCount}<span className="text-base font-normal text-[#b3dde0] ml-0.5">건</span></div>
          <div className="mt-1.5 text-[12px] text-[#ccebee]">0528 확정 — 더존 전달 완료 (260603)</div>
        </div>
      </section>

      <section className={`mt-10 grid gap-6 ${detail ? "lg:grid-cols-[2.4fr_1fr]" : "grid-cols-1"}`}>
        <Card title="T-Box 그래프" subtitle="노드/엣지 클릭으로 상세 확인 · 마우스 휠 줌 · 드래그 이동" slotId="tbox_graph_main">
          <div className="h-[640px] rounded border border-slate-200 bg-slate-50">
            <ReactFlowProvider>
              <ReactFlow
                nodes={initialNodes}
                edges={initialEdges}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                fitView
                fitViewOptions={{ padding: 0.15 }}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
                <Controls showInteractive={false} />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(node) => {
                    const status = (node.data?.status as string) ?? "satisfied";
                    if (status === "missing") return "#9a3412"; // brick
                    if (status === "partiallyMissing") return "#b45309"; // amber
                    return "#0095A9"; // mint
                  }}
                  nodeStrokeColor="#1e293b"
                  nodeStrokeWidth={1.5}
                  maskColor="rgba(250, 250, 247, 0.8)"
                  className="!bg-white"
                />
              </ReactFlow>
            </ReactFlowProvider>
          </div>

          {/* 그래프 아래 안내 caption — 보고서 카드가 아니라 inline 설명 */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] leading-relaxed text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <strong className="text-stone-700">Member · SalesAgent · Contract</strong> 라이프 풀 master 활성 / 장지 dimension 보강 후보
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              미연동 관계 <strong className="text-stone-700">{stats.edgeMissing}건</strong> (edge 기준) — 보강 시 활성화 가능한 KPI 후보
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
              이 그래프 자체가 사내 ERP/BI 데이터 모델 spec
            </span>
          </div>
        </Card>

        {detail && (<div className="space-y-4">

          {detail?.kind === "class" && (
            <Card
              title={detail.data.label}
              subtitle={`status: ${detail.data.status}`}
              highlight={detail.data.status !== "satisfied"}
              slotId={NODE_SLOT_MAP[detail.data.id]}
            >
              <p className="text-sm text-slate-700">{detail.data.definition}</p>
              {detail.data.note && (
                <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">{detail.data.note}</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-emerald-700 font-semibold">충족</div>
                  <div className="text-slate-600">{detail.data.satisfiedFor.join(", ") || "—"}</div>
                </div>
                <div>
                  <div className="text-red-700 font-semibold">결손</div>
                  <div className="text-slate-600">{detail.data.missingFor.join(", ") || "—"}</div>
                </div>
              </div>
            </Card>
          )}

          {detail?.kind === "edge" && (
            <Card
              title={`${detail.data.source} —${detail.data.label}→ ${detail.data.target}`}
              subtitle={`status: ${detail.data.data?.status ?? "satisfied"}`}
              highlight={detail.data.data?.status !== "satisfied"}
              slotId={EDGE_SLOT_MAP[detail.data.id]}
            >
              {detail.data.prop && (
                <p className="text-sm text-slate-700">{detail.data.prop.definition}</p>
              )}
              {detail.data.prop?.satisfiedFor && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-emerald-700 font-semibold">충족</div>
                    <div className="text-slate-600">{detail.data.prop.satisfiedFor.join(", ") || "—"}</div>
                  </div>
                  <div>
                    <div className="text-red-700 font-semibold">결손</div>
                    <div className="text-slate-600">{detail.data.prop.missingFor.join(", ") || "—"}</div>
                  </div>
                </div>
              )}
            </Card>
          )}

        </div>
        )}
      </section>

      {/* ===================================================================
           As-is 확정 로직 — 0528 확정 · 더존 전달 완료 (asis_logic.json)
           배부 우선순위(장지·상조 3단계) + 출처 매핑 — "정보의 출처 명확화" 핵심 화면
         =================================================================== */}
      <section className="mt-12">
        <div className="mb-6">
          <h3 className="text-[16px] font-semibold tracking-tight text-stone-900">
            As-is 확정 로직 — 0528 확정 · 더존 전달 완료
          </h3>
          <p className="mt-1.5 text-[12px] text-stone-500">
            장지·상조 VC 배부 우선순위와 데이터 출처 매핑 — 확정 로직은 더존(아마란스) 구축사에
            전달 완료 ({asisLogic.meta.confirmedAt} 송부)
          </p>
        </div>

        <InsightBox type="info" title="확정 배경">
          {asisLogic.meta.decisionContext}
        </InsightBox>

        {/* 배부 우선순위 — 장지·상조 3단계 */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {(
            [
              { vc: "장지 VC", steps: asisLogic.allocationPrinciples.cemetery },
              { vc: "상조 VC", steps: asisLogic.allocationPrinciples.mutual },
            ] as const
          ).map((group) => (
            <div
              key={group.vc}
              className="rounded-md border border-stone-200/80 bg-white p-6 transition-colors hover:border-stone-300"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-[14px] font-semibold tracking-tight text-stone-900">
                  {group.vc} 배부 우선순위
                </h4>
                <span className="text-[10px] tracking-wider text-stone-400">직접 → 활동기준 → 간접</span>
              </div>
              <ol className="mt-4 space-y-3">
                {group.steps.map((s) => (
                  <li key={s.order} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-[#0095A9] text-[11px] font-semibold text-white tnum">
                      {s.order}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-stone-900">{s.name}</div>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-stone-600">{s.rule}</p>
                      <p className="mt-1 text-[10.5px] text-stone-400">{s.source}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {/* 출처 매핑 표 — dataSources 11건 */}
        <div className="mt-6">
          <Card
            title="데이터 출처 매핑"
            subtitle={`분석에 사용된 원천 데이터 ${asisLogic.dataSources.length}건 — 시스템·출처·활용처·확인 근거`}
          >
            <div className="overflow-x-auto rounded-sm border border-stone-100">
              <table className="w-full text-[12px]">
                <thead className="bg-stone-50/60 text-[10px] uppercase tracking-[0.08em] text-stone-500">
                  <tr>
                    <th className="p-3 text-left font-medium">데이터</th>
                    <th className="p-3 text-left font-medium">출처</th>
                    <th className="p-3 text-left font-medium">활용</th>
                    <th className="p-3 text-left font-medium">확인 근거 · 비고</th>
                  </tr>
                </thead>
                <tbody>
                  {asisLogic.dataSources.map((src) => (
                    <tr key={src.id} className="border-t border-stone-100 transition-colors hover:bg-[#fafaf7]">
                      <td className="p-3 align-top font-medium text-stone-900">{src.data}</td>
                      <td className="p-3 align-top text-stone-700">{src.sourceLabel}</td>
                      <td className="p-3 align-top text-stone-600">{src.usage}</td>
                      <td className="p-3 align-top">
                        {isConfirmedSource(src.confidence) ? (
                          <span className="inline-flex items-center rounded-sm border border-[#0095A9]/30 bg-[#e6f4f6] px-1.5 py-0.5 text-[10.5px] font-medium text-[#007a8c]">
                            {src.confidence}
                          </span>
                        ) : (
                          <span className="text-[11.5px] leading-relaxed text-stone-500">{src.confidence}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="mt-4 space-y-2">
          <SourceCaption>확정 산출물: {asisLogic.meta.sources.join(" · ")}</SourceCaption>
          <SourceCaption>
            확정 범위: 장지 보고서 {asisLogic.meta.scopeSlides.cemetery.join("·")}p / 상조 보고서{" "}
            {asisLogic.meta.scopeSlides.mutual.join("·")}p
          </SourceCaption>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6">
          <h3 className="text-[16px] font-semibold tracking-tight text-stone-900">Axioms (공리)</h3>
          <p className="mt-1.5 text-[12px] text-stone-500">
            T-Box 6개 공리 — 매출 추적성·조성비 zone 추적·인건비 동인 의존·내부거래 양방향 매칭·외연 가용성·Default rule
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tbox.axioms.map((ax) => {
            const isMissing = ax.status !== "satisfied";
            const slotId = AXIOM_SLOT_MAP[ax.id];
            return (
              <div
                key={ax.id}
                className={`relative rounded-md border bg-white p-5 transition-colors ${
                  isMissing
                    ? "border-amber-300/70 bg-amber-50/30"
                    : "border-stone-200/80 hover:border-[#0095A9]/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isMissing ? "bg-amber-600 text-white" : "bg-[#0095A9] text-white"
                      }`}
                    >
                      {ax.id}
                    </span>
                    <span className="text-[13px] font-semibold tracking-tight text-stone-900">
                      {ax.label}
                    </span>
                  </div>
                  {slotId && <EvidenceButton slotId={slotId} label={`Axiom ${ax.id}`} variant="subtle" />}
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-stone-600">{ax.definition}</p>

                <div className="mt-3 flex items-center gap-1.5">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isMissing ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                  <span
                    className={`text-[11px] font-medium ${
                      isMissing ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {ax.status === "satisfied"
                      ? "충족"
                      : ax.status === "partiallyMissing"
                      ? "부분결손"
                      : "결손"}
                  </span>
                </div>

                <div className="mt-3 border-t border-stone-100 pt-2.5 text-[11px] leading-relaxed">
                  <div className="text-stone-500">
                    <span className="font-semibold text-stone-600">검증: </span>
                    <span className="text-stone-600">{ax.checkedAgainst}</span>
                  </div>
                  <div className="mt-1 text-stone-500">
                    <span className="font-semibold text-stone-600">적용: </span>
                    <span className="text-stone-600">{ax.appliesTo.join(" · ")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 border-t border-stone-200 pt-6">
        <h3 className="section-label mb-3">DATA LINEAGE</h3>
        <div className="space-y-2">
          <SourceCaption>13 Class · 26 Property · 6 Axiom — tbox.json (Phase 0 정의서 기반 수동 정의)</SourceCaption>
          <SourceCaption>결손 Property = 그래프 edge status ≠ satisfied 기준 (attribute property 제외) — 상단 stat·그래프 캡션과 동일 기준으로 통일. 모두 장지 VC 회원·영업사원·계약자 dimension 또는 비용 동인 외연 보강 후보</SourceCaption>
          <SourceCaption>As-is 확정 로직·출처 매핑 = asis_logic.json — 0528 회의 확정, 더존(아마란스) 구축사 전달 완료 (260603 송부)</SourceCaption>
          <SourceCaption>Axiom A1·A2·A3·A4 충족 / A5 부분 미연동 / A5&apos; satisfied (fallback 정상 작동)</SourceCaption>
        </div>
      </section>
    </AppLayout>
  );
}
