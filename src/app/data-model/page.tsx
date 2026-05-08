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
import { ExternalLink } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, SourceCaption } from "@/components/Card";
import { TBoxNode } from "@/components/TBoxNode";
import tbox from "@/data/tbox.json";

const nodeTypes = { classNode: TBoxNode };

// 각 RFI가 실제로 도착했을 때 어떤 모양의 표가 될지 보여주는 mock row.
// expectedColumns 길이에 맞춰 plausible한 sample value 채움. 실제 다운로드 X.
const RFI_SAMPLE_ROWS: Record<string, string[][]> = {
  "RFI-NEW-001": [
    ["C-2024-1182", "MEM-001", "홍길동", "2024-03-15", "1ROYAL-A12", "SA-007", "부", "010-1234-5678"],
    ["C-2024-1183", "MEM-002", "김순자", "2024-04-02", "정담원-B07", "SA-011", "본인", "010-2345-6789"],
    ["C-2024-1184", "MEM-003", "이영희", "2024-05-21", "세수연-C03", "SA-007", "모", "010-3456-7890"],
  ],
  "RFI-NEW-002": [
    ["SA-001", "김영업", "용인공원", "2018-04", "대리", "1R 구역", "C-2024-1182, C-2024-1190 …"],
    ["SA-007", "박장지", "YPL", "2020-09", "주임", "정담원·세수연", "C-2024-1183 …"],
    ["SA-011", "정매니저", "용인공원", "2015-02", "과장", "명가여연·천명지", "C-2024-1175 …"],
  ],
  "RFI-NEW-003": [
    ["1R-A12", "이장", "1R-B05", "2022 → 2024-08"],
    ["3H-D07", "공실", "—", "2023-11 회수"],
    ["정담원-B07", "미사용", "—", "—"],
  ],
  "RFI-NEW-004": [
    ["EMP-007·분양상담·32h", "FAC-A12·4.2 m²", "MTR-105·2024-Q4·3,250 kWh"],
    ["EMP-014·시설관리·40h", "FAC-B03·8.7 m²", "MTR-208·2024-Q4·1,820 kWh"],
    ["EMP-022·고객응대·28h", "FAC-C09·5.1 m²", "MTR-114·2024-Q4·2,430 kWh"],
  ],
  "RFI-NEW-005": [
    ["CUST-100", "LIFE-9931", "YP-2287", "FAM-A"],
    ["CUST-101", "LIFE-9954", "YP-2305", "FAM-A"],
    ["CUST-102", "—", "YP-2312", "FAM-B"],
  ],
};

const PRIORITY_BADGE: Record<string, string> = {
  P0: "bg-[#9a3412] text-white",
  P1: "bg-[#b45309] text-white",
  P2: "bg-stone-500 text-white",
};

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

      <section className="mt-12">
        <div className="mb-6">
          <h3 className="text-[16px] font-semibold tracking-tight text-stone-900">필요한 RFI 미리보기</h3>
          <p className="mt-1.5 text-[12px] text-stone-500">
            각 결손이 ERP팀에 어떤 모양의 자료로 와야 하는지 — 예상 컬럼·sample row·요청 대상까지 포함된 mock 표
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {(tbox.rfiItems as RfiItem[]).map((r) => {
            const sampleRows = RFI_SAMPLE_ROWS[r.id] ?? [];
            const badgeCls = PRIORITY_BADGE[r.priority] ?? "bg-stone-500 text-white";
            return (
              <div
                key={r.id}
                className="group rounded-md border border-stone-200/80 bg-white p-6 transition-colors duration-150 hover:border-stone-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[0.04em] text-stone-700">{r.id}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${badgeCls}`}>
                      {r.priority}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-stone-400 transition-colors hover:text-[#0095A9]"
                  >
                    <ExternalLink className="h-3 w-3" />
                    샘플 요청서
                  </button>
                </div>
                <div className="mt-2 text-[14px] font-semibold tracking-tight text-stone-900">{r.title}</div>
                <p className="mt-2 text-[12px] leading-relaxed text-stone-600">{r.rationale}</p>

                <div className="mt-4 overflow-x-auto rounded border border-stone-200/80">
                  <table className="w-full text-[11px] text-stone-700">
                    <thead className="bg-stone-50 text-[10px] font-medium uppercase tracking-[0.04em] text-stone-500">
                      <tr>
                        {r.expectedColumns.map((col) => (
                          <th
                            key={col}
                            className="border-b border-stone-200/80 px-2 py-1.5 text-left whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sampleRows.length > 0 ? (
                        sampleRows.map((row, ri) => (
                          <tr key={ri} className="border-b border-stone-100 last:border-b-0">
                            {r.expectedColumns.map((_, ci) => (
                              <td key={ci} className="px-2 py-1.5 align-top text-stone-600 whitespace-nowrap">
                                {row[ci] ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          {r.expectedColumns.map((_, ci) => (
                            <td key={ci} className="px-2 py-1.5 text-stone-300">
                              —
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-3 text-[11px] leading-relaxed">
                  <div className="text-stone-500">
                    <span className="font-semibold text-stone-600">현황: </span>
                    {r.currentSourceCheck}
                  </div>
                  <div className="text-stone-500">
                    <span className="font-semibold text-stone-600">요청 대상: </span>
                    <span className="text-[#0095A9]">{r.askTo}</span>
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
          <SourceCaption>결손 9건 = property.status ≠ satisfied count, 모두 장지 VC 회원·영업사원·계약자 master 부재 또는 외연 결손에 기인</SourceCaption>
          <SourceCaption>RFI 5건 = tbox.rfiItems, 각 결손 property에 매핑된 비즈니스 질문 (P0~P1 우선순위)</SourceCaption>
          <SourceCaption>Axiom A1·A2·A3·A4 충족 / A5 부분결손 / A5&apos; satisfied (fallback 정상 작동)</SourceCaption>
        </div>
      </section>
    </AppLayout>
  );
}
