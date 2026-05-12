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
import { Card, EvidenceButton, SourceCaption } from "@/components/Card";
import { TBoxNode } from "@/components/TBoxNode";
import tbox from "@/data/tbox.json";

const nodeTypes = { classNode: TBoxNode };

// =============================================================================
// T-Box 노드/엣지/RFI ID → evidence_index slotId 매핑
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

// RFI 카드 → evidence slotId (B8 검토 결과 r3·r4 분할로 7개)
const RFI_SLOT_MAP: Record<string, string> = {
  "RFI-NEW-001": "tbox_rfi_r1_member_master",
  "RFI-NEW-002": "tbox_rfi_r2_salesagent_master",
  "RFI-NEW-003a": "tbox_rfi_r3a_zone_master",
  "RFI-NEW-003b": "tbox_rfi_r3b_transfer_history",
  "RFI-NEW-004a": "tbox_rfi_r4a_driver_definition",
  "RFI-NEW-004b": "tbox_rfi_r4b_cost_amount_allocation",
  "RFI-NEW-005": "tbox_rfi_r5_unified_customer_view",
};

// 각 RFI가 실제로 도착했을 때 어떤 모양의 표가 될지 보여주는 강화 mock.
// 실 데이터 수령 전이므로 모든 값은 plausible mock — PII·영업비밀 박제 X.
// (이름은 가명·연락처는 마스킹·금액·연봉·계좌·주민번호 표시 안 함)
const RFI_MOCK: Record<
  string,
  { columns: string[]; rows: string[][]; mockCaveat: string }
> = {
  "RFI-NEW-001": {
    columns: [
      "계약번호",
      "계약자ID",
      "계약자명(가명)",
      "인입경로",
      "인입일자",
      "상담단계",
      "가입일",
      "묘역코드",
      "상품유형코드",
      "결제방식",
      "담당설계사ID",
      "가족관계",
      "연락처(마스킹)",
      "계약상태",
    ],
    rows: [
      ["YP-2024-01182", "MBR-100482", "홍**", "온라인", "2024-02-08", "계약완료", "2024-03-15", "1R-A12", "PRD-ROY-1R", "일시납", "SA-007", "본인", "010-****-5678", "유효"],
      ["YP-2024-01183", "MBR-100483", "김**", "오프라인(내방)", "2024-03-21", "계약완료", "2024-04-02", "정담원-B07", "PRD-BUR-JD", "분납(12개월)", "SA-011", "배우자", "010-****-6789", "유효"],
      ["YP-2024-01184", "MBR-100484", "이**", "법인(단체)", "2024-04-30", "계약완료", "2024-05-21", "세수연-C03", "PRD-BUR-SS", "일시납", "SA-007", "모(직계존속)", "010-****-7890", "유효"],
    ],
    mockCaveat: "※ 본문 RFI 6.3 + Q40 대응 mock. 수령 시 실 데이터로 교체. 보강성 컬럼: 가족관계 (RFI 본문 외 — 통합고객뷰 r5 동일가족 매칭 활용). 라이프 회원DB 35열 대비 비대칭 — 장지 master 자체 부재.",
  },
  "RFI-NEW-002": {
    columns: [
      "영업사원ID",
      "이름(가명)",
      "소속법인",
      "소속팀",
      "담당구역",
      "DB유치건수(FY25)",
      "실계약건수(FY25)",
      "Conversion%",
      "수수료등급",
    ],
    rows: [
      ["SA-001", "김**", "용인공원", "영업팀", "1R·2R 봉안 로얄", "182", "47", "25.8%", "B등급(기본 5%)"],
      ["SA-007", "박**", "YPL", "고객센터팀", "정담원·세수연", "98", "32", "32.7%", "A등급(기본 7%)"],
      ["SA-011", "용인공원 외부업체", "외부업체", "외부판촉", "명가여연·천명지", "215", "58", "27.0%", "외부수수료(별도규정)"],
    ],
    mockCaveat: "※ 본문 RFI 6.2 + 6.5 + Q24 대응 mock. 수령 시 실 데이터로 교체. RFI 6.5 판매수수료 지급기준 규정 미수령. 보강성 컬럼: 직급·입사일·퇴사여부 (RFI 본문 외 — HR 정보는 별도 RFI 필요).",
  },
  "RFI-NEW-003a": {
    columns: [
      "묘역코드",
      "장법",
      "매출구분(계정)",
      "면적(m²)",
      "단가",
      "FY23 매출액(원)",
      "FY24 매출액(원)",
      "FY25 매출액(원)",
      "재고명세서 묘원수",
      "분양상태",
    ],
    rows: [
      ["1R-A12", "봉안 로얄", "사용료수입(아너) 41100", "—", "—", "12,500,000", "—", "8,200,000", "1", "분양완료"],
      ["63-1공구-B07", "매장", "사용료수입(일반) 40400", "1.96", "4,800,000", "0", "4,800,000", "0", "1", "분양완료"],
      ["정담원-C03", "매장", "사용료수입(일반) 40400", "1.96", "5,200,000", "0", "0", "5,200,000", "1", "분양완료"],
      ["천명제1-D04", "매장", "—", "1.96", "—", "0", "0", "0", "1", "미사용(분양가능)"],
    ],
    mockCaveat: "※ 본문 RFI 3.6/3.8/3.9 대응 mock. 수령 시 실 데이터로 교체. RFI 3.6/3.8/3.9 미수령 — 면적·매출·매핑 동시 결손. raw vs 재고명세서 묘원수 차이 사유는 신규야외묘역 시트로 별도 추적.",
  },
  "RFI-NEW-003b": {
    columns: [
      "묘역코드",
      "이전계약번호",
      "이장일자",
      "신계약번호",
      "이장사유",
      "공실/회수일",
      "재분양가",
      "특수사유",
    ],
    rows: [
      ["1R-A12", "YP-2018-00742", "2024-02-10", "YP-2024-01182", "가족 합장", "—", "8,200,000", "—"],
      ["3H-D07", "YP-2017-00219", "—", "—", "—", "2023-11-08", "할인분양 대기", "할인분양 대상"],
      ["63-5공구-E22", "YP-2015-00118", "2024-08-04", "YP-2024-02014", "이장 (가족 요청)", "—", "5,500,000", "이장지 4325건 中 1건"],
    ],
    mockCaveat: "※ 본문 인터뷰 3일차오전공원(이장 용역비) + 신규야외묘역 시트 대응 mock. 수령 시 실 데이터로 교체. 묘역raw 22.5% 미채움분(이장지 4325 포함) 사유 분류 필요.",
  },
  "RFI-NEW-004a": {
    columns: [
      "동인ID",
      "동인명",
      "동인유형",
      "측정주체",
      "측정단위",
      "수집주기",
      "소스시스템",
      "수집상태",
    ],
    rows: [
      ["TR-EMP-007", "분양상담 시간", "Time Report", "분양상담팀", "시간(h)", "월별", "수기 엑셀", "수기·미체계화"],
      ["FAC-A12", "사무실 부스 면적", "시설별 면적", "시설관리팀", "m²", "연1회 실측", "도면 PDF", "도면존재·디지털 미수령"],
      ["MTR-208-전기", "관리동 전기 사용량", "계량기 검침", "관리동 전기", "kWh", "분기별", "한전 청구서", "한전 청구서·디지털 미수령"],
    ],
    mockCaveat: "※ 본문 RFI 4.3/4.4 대응 mock (동인 외연 측). 수령 시 실 데이터로 교체. 외연 결손 → A5 partiallyMissing → A5' Default rule(매출비율 fallback) 발동중.",
  },
  "RFI-NEW-004b": {
    columns: [
      "계정코드",
      "계정명",
      "구분",
      "FY23 발생금액(원)",
      "FY24 발생금액(원)",
      "FY25 발생금액(원)",
      "배부기준",
      "비경상 여부",
      "비경상 사유",
    ],
    rows: [
      ["80200", "직원급여", "판관비", "1,420,000,000", "1,510,000,000", "1,628,000,000", "Time Report 시간(h) × 시급", "N", "—"],
      ["51820", "전력비", "제조원가", "82,000,000", "88,400,000", "94,500,000", "계량기 검침 kWh 배분", "N", "—"],
      ["83100", "감가상각비", "판관비", "210,000,000", "208,000,000", "205,000,000", "시설별 면적 m² 배분", "N", "—"],
      ["53400", "지급수수료", "제조원가", "—", "—", "62,000,000", "동인없음 (단발)", "Y", "신규 ERP 컨설팅 일회성"],
    ],
    mockCaveat: "※ 본문 RFI 4.3/4.4 대응 mock (발생금액·배부기준 측). 수령 시 실 데이터로 교체. 25년 계정별원장 매출 10계정 합계 50,240,119,779원(영업매출 순매출, 부가세 제외) 검증 완료, 단 3개년 시계열 + 비경상 분리 미수령.",
  },
  "RFI-NEW-005": {
    columns: [
      "통합고객ID",
      "라이프회원ID",
      "장지계약자ID",
      "장지계약번호",
      "동일가족 그룹ID",
      "최초접점채널",
      "라이프 누적매출(억)",
      "장지 누적매출(억)",
      "Cross-sell",
      "매칭confidence(%)",
    ],
    rows: [
      ["GRP-CUST-00100", "LIFE-09931", "MBR-100482", "YP-2024-01182", "FAM-A-0042", "라이프(상조) 2019-04", "0.4", "0.8", "Y (장지 후속)", "98%"],
      ["GRP-CUST-00101", "LIFE-09954", "MBR-100483", "YP-2024-01183", "FAM-A-0042", "라이프(상조) 2020-11", "0.3", "0.5", "Y (배우자 명의)", "92%"],
      ["GRP-CUST-00102", "—", "MBR-100484", "YP-2024-01184", "FAM-B-0117", "장지 단독", "—", "0.5", "N", "—"],
    ],
    mockCaveat: "※ 본문 RFI 3.7 + Q40 + 6.3 합성 mock. 수령 시 실 데이터로 교체. 매출 단위는 안전 표기(억). RFI 3.7은 25/12~26/03만 부분수령, FY23~25 전체 미수령. 라이프 9,930명 + 장지 master 부재 → 통합 매핑 작업 미착수.",
  },
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
          <div className="mt-1.5 text-[12px] text-stone-500">부분결손 또는 미수령</div>
        </div>
        <div className="bg-white p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#9a3412]">결손 Property</div>
            <EvidenceButton slotId="tbox_stat_missing_properties" label="결손 Property" variant="subtle" />
          </div>
          <div className="headline mt-2 text-[28px] leading-none text-stone-900 tnum">
            {stats.edgeMissing}<span className="text-stone-400 font-normal"> / {stats.totalEdges}</span>
          </div>
          <div className="mt-1.5 text-[12px] text-stone-500">관계 status ≠ satisfied</div>
        </div>
        <div className="bg-[#0095A9] p-5 text-white">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#b3dde0]">자동 도출 RFI</div>
            <EvidenceButton slotId="tbox_stat_rfi_count" label="자동 도출 RFI" variant="onMint" />
          </div>
          <div className="headline mt-2 text-[28px] leading-none text-white tnum">{stats.rfiCount}<span className="text-base font-normal text-[#b3dde0] ml-0.5">건</span></div>
          <div className="mt-1.5 text-[12px] text-[#ccebee]">결손 → 비즈니스 질문</div>
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
              <strong className="text-stone-700">Member · SalesAgent · Contract</strong> 라이프 풀 master / 장지 결손
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              장지 결손이 만드는 비즈니스 질문 <strong className="text-stone-700">7건</strong>이 RFI로 자동 도출
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
              이 그래프 자체가 ERP팀에 전달되는 spec
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
        )}
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
            const mock = RFI_MOCK[r.id];
            const columns = mock?.columns ?? r.expectedColumns;
            const rows = mock?.rows ?? [];
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
                    <span className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
                      MOCK
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {RFI_SLOT_MAP[r.id] && (
                      <EvidenceButton slotId={RFI_SLOT_MAP[r.id]} label={r.title} variant="subtle" />
                    )}
                    <button
                      type="button"
                      className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-stone-400 transition-colors hover:text-[#0095A9]"
                    >
                      <ExternalLink className="h-3 w-3" />
                      샘플 요청서
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-[14px] font-semibold tracking-tight text-stone-900">{r.title}</div>
                <p className="mt-2 text-[12px] leading-relaxed text-stone-600">{r.rationale}</p>

                <div className="mt-4 overflow-x-auto rounded border border-stone-200/80">
                  <table className="w-full text-[11px] text-stone-700">
                    <thead className="bg-stone-50 text-[10px] font-medium uppercase tracking-[0.04em] text-stone-500">
                      <tr>
                        {columns.map((col) => (
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
                      {rows.length > 0 ? (
                        rows.map((row, ri) => (
                          <tr key={ri} className="border-b border-stone-100 last:border-b-0">
                            {columns.map((_, ci) => (
                              <td key={ci} className="px-2 py-1.5 align-top text-stone-600 whitespace-nowrap">
                                {row[ci] ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          {columns.map((_, ci) => (
                            <td key={ci} className="px-2 py-1.5 text-stone-300">
                              —
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {mock?.mockCaveat && (
                  <div className="mt-2 rounded border border-amber-200/60 bg-amber-50/40 px-2 py-1.5 text-[10.5px] leading-relaxed text-amber-900/80">
                    {mock.mockCaveat}
                  </div>
                )}

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
          <SourceCaption>결손 9건 = property.status ≠ satisfied count, 모두 장지 VC 회원·영업사원·계약자 master 부재 또는 외연 결손에 기인</SourceCaption>
          <SourceCaption>RFI 7건 = tbox.rfiItems, 각 결손 property에 매핑된 비즈니스 질문 (P0~P1 우선순위). B8 정합성 검토 결과 r3·r4를 각 2개로 분할(r3a/r3b·r4a/r4b)하여 본문 RFI 3.6/3.8/3.9·4.3/4.4 명세에 정렬</SourceCaption>
          <SourceCaption>Axiom A1·A2·A3·A4 충족 / A5 부분결손 / A5&apos; satisfied (fallback 정상 작동)</SourceCaption>
        </div>
      </section>
    </AppLayout>
  );
}
