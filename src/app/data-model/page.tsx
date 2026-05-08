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
import { Card, InsightBox, SourceCaption } from "@/components/Card";
import { TBoxNode } from "@/components/TBoxNode";
import tbox from "@/data/tbox.json";

const nodeTypes = { classNode: TBoxNode };

type RfiItem = (typeof tbox.rfiItems)[number];
type ClassDef = (typeof tbox.classes)[number];

export default function DataModelPage() {
  const [selected, setSelected] = useState<{ kind: "node" | "edge"; id: string } | null>(null);

  const initialNodes = useMemo<Node[]>(
    () =>
      tbox.reactFlow.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
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
      rfiCount: tbox.rfiItems.length,
    };
  }, []);

  const detail = useMemo(() => {
    if (!selected) return null;
    if (selected.kind === "node") {
      const cls = (tbox.classes as ClassDef[]).find((c) => c.id === selected.id);
      if (!cls) return null;
      const linkedRfis = (tbox.rfiItems as RfiItem[]).filter((r) =>
        r.linkedProperties.some((p) => p.startsWith(cls.id + "-") || p.endsWith("-" + cls.id))
      );
      return { kind: "class" as const, data: cls, rfis: linkedRfis };
    }
    const edge = tbox.reactFlow.edges.find((e) => e.id === selected.id);
    if (!edge) return null;
    const propId = edge.id.replace(/^e-/, "");
    const prop = tbox.properties.find((p) => p.id === propId || (p.id.includes(edge.source) && p.id.includes(edge.target)));
    const linkedRfis = (tbox.rfiItems as RfiItem[]).filter((r) =>
      prop ? r.linkedProperties.includes(prop.id) : false
    );
    return { kind: "edge" as const, data: { ...edge, prop }, rfis: linkedRfis };
  }, [selected]);

  return (
    <AppLayout
      pageTitle="데이터 모델 (T-Box)"
      pageSubtitle="결손이 곧 RFI 자동 생성기 — SQL은 침묵, 온톨로지는 비즈니스 질문으로 변환"
      narration={
        <div className="space-y-2">
          <p>13 Class · 26 Property · 6 Axiom으로 구성된 의미층.</p>
          <p>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" /> 충족 ·
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mx-1" /> 부분결손 ·
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 mx-1" /> 결손
          </p>
          <p>
            <strong>결손 노드/엣지를 클릭</strong>하면 자동 도출되는 RFI가 우측에 표시됩니다.
          </p>
        </div>
      }
    >
      <section className="grid gap-px overflow-hidden rounded-md border border-stone-200/80 bg-stone-200/60 sm:grid-cols-4">
        <div className="bg-white p-5">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-stone-500">Class</div>
          <div className="headline mt-2 text-[28px] leading-none text-stone-900 tnum">{stats.totalClasses}</div>
          <div className="mt-1.5 text-[12px] text-stone-500">전체 정의된 클래스</div>
        </div>
        <div className="bg-white p-5">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#b45309]">결손 Class</div>
          <div className="headline mt-2 text-[28px] leading-none text-stone-900 tnum">{stats.classMissing}</div>
          <div className="mt-1.5 text-[12px] text-stone-500">부분결손 또는 미수령</div>
        </div>
        <div className="bg-white p-5">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#9a3412]">결손 Property</div>
          <div className="headline mt-2 text-[28px] leading-none text-stone-900 tnum">
            {stats.edgeMissing}<span className="text-stone-400 font-normal"> / {stats.totalEdges}</span>
          </div>
          <div className="mt-1.5 text-[12px] text-stone-500">관계 status ≠ satisfied</div>
        </div>
        <div className="bg-[#0095A9] p-5 text-white">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#b3dde0]">자동 도출 RFI</div>
          <div className="headline mt-2 text-[28px] leading-none text-white tnum">{stats.rfiCount}<span className="text-base font-normal text-[#b3dde0] ml-0.5">건</span></div>
          <div className="mt-1.5 text-[12px] text-[#ccebee]">결손 → 비즈니스 질문</div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="T-Box 그래프" subtitle="노드/엣지 클릭으로 상세 확인 · 마우스 휠 줌 · 드래그 이동">
          <div className="h-[600px] rounded border border-slate-200 bg-slate-50">
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
                <MiniMap pannable zoomable />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        </Card>

        <div className="space-y-4">
          {!detail && (
            <Card title="안내" subtitle="결손 노드/엣지를 클릭해주세요">
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>
                    <strong>Member, SalesAgent, Contract</strong> — 라이프엔 풀 master, 장지엔 결손
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <span>
                    <strong>장지 결손</strong>이 만드는 비즈니스 질문 5가지를 RFI로 자동 도출
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>이 그래프 자체가 ERP팀에 전달되는 spec</span>
                </li>
              </ul>
            </Card>
          )}

          {detail?.kind === "class" && (
            <Card
              title={detail.data.label}
              subtitle={`status: ${detail.data.status}`}
              highlight={detail.data.status !== "satisfied"}
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

          {detail && detail.rfis.length > 0 && (
            <Card title="자동 도출된 RFI" subtitle="결손이 비즈니스 질문으로 변환됨" highlight>
              <div className="space-y-3">
                {detail.rfis.map((r) => (
                  <div key={r.id} className="group rounded border border-amber-200 bg-amber-50 p-3 transition-all hover:bg-amber-100 hover:shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        {r.priority}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{r.id}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-800">{r.title}</div>
                    <p className="mt-1 text-xs text-slate-600">{r.rationale}</p>
                    <div className="mt-2 text-xs">
                      <span className="font-semibold text-slate-700">예상 컬럼: </span>
                      <span className="text-slate-600">
                        {r.expectedColumns.slice(0, 4).join(", ")}
                        {r.expectedColumns.length > 4 ? "..." : ""}
                      </span>
                    </div>
                    <div className="mt-1 text-xs">
                      <span className="font-semibold text-slate-700">요청 대상: </span>
                      <span className="text-slate-600">{r.askTo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </section>

      <section className="mt-12 rounded-md bg-[#0095A9] p-8 text-sm text-[#ccebee]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b3dde0]">Core Message</div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-[#b3dde0]/80">Traditional BI</div>
            <p className="mt-1.5 leading-relaxed">
              <span className="text-[#fecaca]">데이터 부족</span> → 침묵 또는 fallback. 결손이 산출물에 흔적을 남기지 않음.
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-[#b3dde0]">Dynamic Consulting</div>
            <p className="mt-1.5 leading-relaxed text-white">
              <span className="font-semibold">결손이 형식적으로 표현</span> → 자동 RFI 도출 → ERP 보강 후 같은 BI가 더 깊은 KPI에 답함.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 border-t border-stone-200 pt-6">
        <h3 className="section-label mb-3">DATA LINEAGE</h3>
        <div className="space-y-2">
          <SourceCaption>13 Class · 26 Property · 6 Axiom — tbox.json (Phase 0 정의서 기반 수동 정의)</SourceCaption>
          <SourceCaption>결손 9건 = property.status ≠ satisfied count, 모두 장지 VC 회원·영업사원·계약자 master 부재 또는 외연 결손에 기인</SourceCaption>
          <SourceCaption>RFI 5건 = tbox.rfiItems, 각 결손 property에 매핑된 비즈니스 질문 (P0~P1 우선순위)</SourceCaption>
          <SourceCaption>Axiom A1·A2·A3·A4 충족 / A5 부분결손 / A5&apos; satisfied (fallback 정상 작동)</SourceCaption>
        </div>
      </section>
    </AppLayout>
  );
}
