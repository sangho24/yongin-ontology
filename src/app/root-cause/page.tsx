"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, EvidenceButton, InsightBox, SourceCaption } from "@/components/Card";
import { NumberCell } from "@/components/NumberCell";
import lifeKpi from "@/data/life_kpi.json";
import zoneKpi from "@/data/zone_kpi.json";
import { autoUnit, formatPct } from "@/lib/format";
import type { NumberLineage } from "@/types";

// =============================================================================
// 가설 타입 + mock LLM 분석 / 추천 액션
// =============================================================================

type Hypothesis = {
  id: string;
  title: string;
  evidence: string;
  signal: "high" | "medium" | "low";
  llmAnalysis: string;
  recommendedActions: string[];
};

const MUTUAL_HYPOTHESES: Hypothesis[] = [
  {
    id: "H1",
    title: "회비정산차익이 영업외수익으로 흡수되어 영업이익 view에서 손실 과대 표시",
    evidence: `만기해약 ${lifeKpi.matureAnalysis.totalMatureMembers.toLocaleString()}명의 정산차익 ${autoUnit(lifeKpi.wowMetrics.potentialFromMature)} → 영업외 인식. 매출의 ${formatPct(lifeKpi.memberStatus[0].shareOfRevenue)} 비중`,
    signal: "high",
    llmAnalysis:
      "회비정산차익이 영업외수익으로 분류되는 것은 K-IFRS 1115(고객과의 계약에서 생기는 수익) 적용 결과로, 상조 만기해약은 의무이행 종료 후 잔여 부채 환입 성격이라 매출 인식 요건을 충족하지 못합니다. 다만 그룹 관점에서는 이 환입이 회원 lifecycle의 종착점에서 발생하는 경제적 cash flow이기 때문에, 영업이익 + 회비정산차익을 묶은 'Adjusted Operating Income' view가 사업 실질을 더 정확히 반영합니다. 동종업계 프리드·보람도 동일한 회계처리를 적용하지만 IR 자료에서는 별도 KPI로 보정 공시하는 사례가 다수입니다. 즉 손실 자체보다 view의 선택이 의사결정 왜곡 요인입니다.",
    recommendedActions: [
      "**Adjusted Operating Income KPI 신설**: 영업이익 + 회비정산차익을 단일 KPI로 묶어 분기 IR·내부 보고에 병기.",
      "**회계 footnote 보강**: 영업외 인식 사유와 그룹 view 차이를 외부 보고에서 명시적으로 disclose.",
      "**만기 코호트 cash flow 시뮬레이터**: 향후 5년 만기 도래 회원의 정산차익 예상 cash 환입 분기별 분포 산출 → 자금 운용 의사결정 input.",
      "**경영회의 정례 view 전환**: 월간 경영보고서의 default view를 GAAP 영업이익에서 그룹 Adjusted view로 변경.",
    ],
  },
  {
    id: "H2",
    title: "최근 가입 코호트의 만기율 급등 — 단기 수익실현·해약 패턴",
    evidence: "2022~2025년 만기율 72%·96%·88%·88% (2018~2020년 1.5~4% 대비 약 30배)",
    signal: "high",
    llmAnalysis:
      "2022년 이후 가입자의 만기율이 4%→72%로 급등한 현상은 (a) 해약환급률이 100%에 가까운 단기형 상품의 launch, (b) 영업 인센티브 구조에서 신계약 commission이 retention 인센티브를 압도하는 비대칭, (c) 2022~2023년 시장 경쟁사(라이나·예다함) 진입에 따른 회원 churn 가속이 복합적으로 작용한 결과로 추정됩니다. 특히 2023년 96%는 자연스러운 lifecycle decay 곡선과 명백히 괴리되어 있어 상품 설계 자체가 단기 회수형이었거나, 만기 도달 회원에 대한 retention touch가 부재했음을 시사합니다. 진성 가입자 비중이 떨어질수록 LTV 가정이 무너지므로 광고선전비 ROI 산정의 기반이 흔들립니다.",
    recommendedActions: [
      "**Cohort segmentation 강화**: 2022년 이후 가입 회원 대상 별도 retention 캠페인. 만기 도달 60일 전 사전 outreach, 가족 referral 인센티브 도입.",
      "**상품 mix 재설계**: 단기 해약환급률 100% 상품 비중 단계적 ↓, 장기 유지 시 부가서비스(리무진·식대 upgrade) 인센티브 ↑.",
      "**영업 인센티브 구조 개편**: 만기 회원에 대한 commission clawback 도입 + 24개월 이상 유지 회원 retention bonus 신설.",
      "**해약 사유 grain-level 수집**: 해약 채널·사유 코드를 ERP에 의무 입력 필드로 추가하여 churn driver 정량 분석 가능하게.",
    ],
  },
  {
    id: "H3",
    title: "온라인 채널의 회원당 매출이 오프라인의 약 3% — 광고 ROI 의심",
    evidence: `온라인 LTV ${autoUnit(lifeKpi.wowMetrics.ltvByChannel.온라인)} vs 오프라인 ${autoUnit(lifeKpi.wowMetrics.ltvByChannel.오프라인)} (격차 약 34배)`,
    signal: "medium",
    llmAnalysis:
      "온라인 LTV가 오프라인의 3% 수준이라는 격차는 단순 채널 효율 차이로 설명하기 어렵습니다. 실제로는 (a) 온라인 가입자가 저단가 단기형 상품에 집중 분포하는 product mix 차이, (b) 온라인 유입 트래픽의 demographics가 실제 구매 의향이 낮은 정보 탐색형이라는 funnel 특성, (c) 온유프리·디지털 광고비가 매출과 무관하게 lump-sum으로 집행되어 채널 단위 ROAS 모니터링이 부재한 운영적 문제가 결합된 결과로 보입니다. 온라인 자체의 폐기 결정 전에 product mix 보정·광고 채널별 attribution 분리·targeting 재설계 단계를 거치는 것이 타당합니다.",
    recommendedActions: [
      "**채널별 광고 ROAS 분리 측정**: 온유프리 광고비를 GA4·UTM 기반 attribution으로 매출 매칭, 채널별 CAC·LTV ratio 월간 KPI화.",
      "**Product mix 재배치**: 온라인 채널에 중·장기 상품 노출 비중 ↑, 단기형 상품은 오프라인 대면에서만 판매하도록 채널 정책 차등화.",
      "**Targeting 재설계**: 50대+ 가족 의사결정자 segment 중심 targeting, 정보 탐색형 키워드 대신 의향 keyword bidding으로 전환.",
      "**온라인 채널 sunset 시나리오**: 6개월 ROAS 개선 KPI 미달성 시 광고비 50% 축소 후 단계적 철수 검토.",
    ],
  },
  {
    id: "H4",
    title: "설계사 매출 집중도 (Gini 0.69) — 하위 설계사의 생산성·이탈 risk",
    evidence: `전체 ${lifeKpi.salesAgentDistribution.totalAgents}명 중 Top10이 매출 ${formatPct(lifeKpi.salesAgentDistribution.top10ShareOfRevenue)} 점유`,
    signal: "medium",
    llmAnalysis:
      "Gini 0.69의 매출 집중도는 상조업계 평균(0.5~0.6)을 크게 상회하는 수치입니다. Top10 설계사가 전체 매출의 상당 비중을 점유하는 구조는 (a) Top performer의 이탈 시 즉각적 매출 cliff risk, (b) 신규·하위 설계사의 onboarding·교육 체계 부재로 인한 평균 생산성 저하, (c) 설계사간 lead 분배의 불공정성 가능성을 시사합니다. 이는 동시에 Top performer에게 협상력이 집중되어 commission 비용 압박이 커진다는 비용 측면 issue도 동반합니다. lead routing 알고리즘과 신규 설계사 ramp-up 프로그램 점검이 우선입니다.",
    recommendedActions: [
      "**Top10 retention 점검**: 핵심 설계사의 만족도·계약 조건 정기 review. 최소 3명의 backup 양성 계획 수립.",
      "**Lead 분배 알고리즘 재설계**: 지역·등급별 lead routing rule 투명화, 신규 설계사 ramp-up 기간 동안 우선 배정 정책.",
      "**Bottom 50% 설계사 생산성 진단**: 활동량(콜·방문) 대비 전환율 cohort 분석 → 교육 vs 정리 의사결정.",
      "**Commission 구조 segmentation**: tier별 차등 commission + 신규 설계사용 minimum guarantee 6개월 도입.",
    ],
  },
];

const ZONE_HYPOTHESES: Hypothesis[] = [
  {
    id: "Z1",
    title: "정체단지 잠재가치 누적 — 영업 우선순위 미설정",
    evidence: `2022년 이후 계약 없는 정체 잠재 ${zoneKpi.wowMetrics.stagnantInventoryWarning?.toLocaleString() ?? "—"}건 (가용재고의 약 20%)`,
    signal: "high",
    llmAnalysis:
      "정체단지 2,499건은 4년간 단 한 건의 계약도 없었다는 점에서 단순한 영업 attention 부족이 아니라 구조적 진열 문제일 가능성이 높습니다. (a) 단지 위치·등급 측면의 매력도 저하, (b) 가격 anchor 자체의 시장 ceiling 도달, (c) 영업사원의 인센티브 구조에서 신규·인기 단지 위주로 추천 동기가 작동하는 배분 왜곡이 의심됩니다. 또한 정체단지 자체가 신규 단지 대비 commission이 동일하거나 낮을 경우 영업이 의도적으로 회피할 수밖에 없는 구조가 됩니다. 가격·등급 재조정과 영업 인센티브 차등화가 병행되어야 합니다.",
    recommendedActions: [
      "**정체단지 우선순위 분류**: 2,499건을 위치·등급·잔여재고 기준 3-tier로 segment, tier별 가격 인하 vs 등급 조정 vs 패키지 마케팅 결정.",
      "**영업 인센티브 spike**: 정체단지 계약 시 commission 1.5x 가산, 분기 한정 contest 운영.",
      "**가격 재조정 시뮬레이터**: 등급 다운그레이드 시 매출 손실 vs 회전율 개선 trade-off 정량 분석 toolkit 제공.",
      "**고객 family referral 활용**: 인접 단지 기존 계약 가족에 정체단지 추가 분양 캠페인 (가족장지 묶음 할인).",
    ],
  },
  {
    id: "Z2",
    title: "이장지 4,325기의 재분양 자원이 활용 안 됨",
    evidence: `이장지 잠재가치 약 ${autoUnit(zoneKpi.wowMetrics.potentialFromTransfer ?? 0)} — 전체 가용재고 잠재의 29% 비중`,
    signal: "high",
    llmAnalysis:
      "이장지 4,325기가 재분양 pool에 들어가지 못하고 있는 핵심 원인은 (a) 이장 후 묘역 정비·복원 공정의 capacity 한계, (b) 이장지 재분양에 대한 정서적 거부감을 다룰 customer-facing 메시지 부재, (c) 이장지 status를 분양 가능 inventory로 전환하는 ERP master flag가 자동화되어 있지 않아 영업이 인지하지 못하는 운영 단절이 결합된 결과로 추정됩니다. 잠재가치 756억은 회사 연 매출 규모와 비교 시 무시할 수 없는 수준이며, 가용재고 전체 잠재의 29%를 차지하므로 이를 재분양 pipeline에 정식 진입시키는 것만으로 KPI 개선 효과가 큽니다.",
    recommendedActions: [
      "**이장지 재분양 SOP 신설**: 이장 완료 → 묘역 정비 → ERP inventory flag 변경까지의 lead time 30일 이내 KPI화.",
      "**Family referral 우선 채널화**: 기존 이장 가족에 동일 단지 내 이장지 우선 청약권 부여, 정서적 reframing(가족 묶음).",
      "**묘역 정비 capacity 증설 검토**: 외주 시공팀 추가 contract로 정비 lead time 단축, 분기 정비 capacity 산출.",
      "**이장지 전용 가격 정책**: 일반 신규 단지 대비 5~10% 할인 + 관리비 1년 면제 패키지로 differentiation.",
    ],
  },
  {
    id: "Z3",
    title: "단지·등급별 평균가 격차 큼 — 가격조정 여지",
    evidence: `등급 F 평균 ${autoUnit(zoneKpi.potentialValue.avgPriceByGrade.find((g) => g.grade === "F")?.avgPrice ?? 0)} vs A ${autoUnit(zoneKpi.potentialValue.avgPriceByGrade.find((g) => g.grade === "A")?.avgPrice ?? 0)}`,
    signal: "medium",
    llmAnalysis:
      "등급 A와 F 간의 평균가 격차가 크다는 사실 자체보다, 같은 등급 내 단지간 가격 분산이 어떻게 형성되어 있는지가 의사결정 핵심입니다. 동일 등급 내에서도 위치·조망·접근성에 따른 자연스러운 spread가 있으나, 이 spread가 시장 가격 발견에 의한 것이 아니라 단지 master 등록 시점의 lump-sum 책정에 따른 historical artifact일 가능성이 높습니다. 등급 간 가격 ladder가 비선형이라면 (a) 일부 등급이 시장 ceiling에 도달했거나 (b) 등급 정의 자체가 customer perception과 어긋나 있다는 의미입니다. 등급 재정의보다는 단지별 dynamic pricing 도입이 ROI가 큽니다.",
    recommendedActions: [
      "**동일 등급 내 가격 분산 분석**: 등급별 표준편차·outlier 단지 식별, historical spread vs market reality 비교.",
      "**Dynamic pricing pilot**: 잔여재고 회전율 기반 분기별 가격 adjustment rule 도입(회전율 ↓ → 가격 ↓ 5% 등).",
      "**등급 정의 재검토**: 고객 인지 가치(조망·접근성·커뮤니티) 기반 등급 추가 layer 도입 여부 검토.",
      "**가격 history dashboard**: 단지별 가격 변동·전환율 시계열 trace, 영업·전략팀 공유 시각화 신설.",
    ],
  },
  {
    id: "Z4",
    title: "계약자 master 부재 → 회원 LTV·재계약·가족 cross-sell 분석 불가",
    evidence: "묘역 raw에 계약번호는 77.5%이나 계약자 정보 컬럼 0열 (RFI r74 미수령)",
    signal: "high",
    llmAnalysis:
      "묘역 raw에 계약번호는 77.5% 채워져 있으나 계약자 personal 정보 컬럼이 0열이라는 사실은, ERP 설계 시점에 계약 객체 중심 master는 갖췄으나 고객 중심 master는 별도 시스템 또는 종이 계약서에 분산된 상태임을 의미합니다. 이는 (a) BI에서 회원 LTV, family cluster, 재계약 cross-sell 같은 고객 중심 분석을 원천 차단하고, (b) 마케팅 캠페인 targeting을 단지 단위 broadcast로 제한하며, (c) 가족 referral 같은 가장 효율 높은 sales lever를 시스템적으로 활용 불가하게 만드는 root constraint입니다. RFI r74가 회신되어도 데이터 정합성·중복 정리에 추가 1~2개월의 cleansing이 필요합니다.",
    recommendedActions: [
      "**RFI r74 회수 우선순위 격상**: CFO·CIO 레벨에서 회신 timeline 확약, 미회신 시 escalation path 명시.",
      "**계약자 master 통합 cleansing 프로젝트**: 계약번호 ↔ 고객 매핑, 가족 cluster 식별 (성씨·주소 fuzzy match) 별도 sprint 편성.",
      "**고객 중심 BI 확장 backlog**: master 수령 후 즉시 활성화할 회원 LTV·family cross-sell·재계약 dashboard 사전 설계 완료.",
      "**향후 계약 ERP 입력 의무화**: 신규 계약 시 계약자 정보 mandatory field로 강제, 영업 commission 결제 조건과 연계.",
    ],
  },
];

// =============================================================================
// 상단 StatCard용 lineage
// =============================================================================

const matureLineage: NumberLineage = {
  source: "라이프_회원DB / 회원상태=YF",
  formula: "Σ 매출합계(회원상태=YF) / Σ 매출합계(전체)",
  verified: true,
  unit: "%",
  asOf: "2025-12-31",
  steps: [
    {
      label: "회원DB 로드",
      detail: "라이프_분석.xlsx / 회원DB 시트 — 9,930행 (만료 포함 전체)",
      rowCount: 9930,
    },
    {
      label: "회원상태 = YF (납부만기) 필터",
      detail: "납부 의무 종료된 회원, 정산차익 대상",
      amount: lifeKpi.memberStatus[0].revenueSum,
      rowCount: lifeKpi.memberStatus[0].count,
    },
    {
      label: "전체 매출합계 산출",
      detail: "회원상태 무관 전체 회원 누적 납입액 (스냅샷)",
      amount: lifeKpi.wowMetrics.totalLifecycleRevenue,
    },
    {
      label: "비중 산출",
      detail: "16,835,918,500 / 27,764,964,000 = 60.6%",
    },
  ],
  notes:
    "YF는 납부의무 종료 회원으로 회비정산차익이 영업외수익으로 인식됨. 영업이익 view 보정 시 핵심 driver.",
};

const stagnantLineage: NumberLineage = {
  source: "묘역_raw(26.04 기준) / 단지·등급별 평균가 proxy",
  formula: "Σ (정체단지 가용재고 × 등급 평균가)",
  verified: false,
  unit: "원",
  asOf: "2026-04-01",
  steps: [
    {
      label: "정체단지 식별",
      detail: "2022년 1월 이후 계약 0건인 단지 추출",
      rowCount: 2499,
    },
    {
      label: "등급 평균가 매핑",
      detail: "단지별 등급 → avgPriceByGrade lookup (proxy)",
    },
    {
      label: "잠재가치 산출",
      detail: "가용재고 × 등급 평균가 합산",
      amount: zoneKpi.wowMetrics.potentialFromTransfer ?? 0,
    },
  ],
  notes:
    "proxy 추정치 — 등급 평균가는 historical 단가이므로 시장가 ceiling 도달 시 과대 가능성. 정확한 값은 단지별 실제 listing 가격 master 보강 후 재산출 필요.",
};

const channelGapLineage: NumberLineage = {
  source: "라이프_회원DB / 채널 × 매출합계",
  formula: "오프라인 회원당 매출 / 온라인 회원당 매출",
  verified: true,
  asOf: "2025-12-31",
  steps: [
    {
      label: "채널별 회원수·매출합계 집계",
      detail: "channelMatrix groupby(채널)",
    },
    {
      label: "회원당 매출 산출",
      detail: `오프라인 ${autoUnit(lifeKpi.wowMetrics.ltvByChannel.오프라인)} / 온라인 ${autoUnit(lifeKpi.wowMetrics.ltvByChannel.온라인)}`,
    },
    {
      label: "비율 계산",
      detail: "2,923,140 / 86,484 ≈ 33.8배 → 34배 표기",
    },
  ],
  notes:
    "비율(배수)이라 verified는 산식 일치 기준. 단, 절대 LTV는 product mix·funnel 보정 전 raw 값이라 추가 분해 필요.",
};

// =============================================================================
// 가설 카드 — LLM 분석·추천 액션 토글 포함
// =============================================================================

function HypothesisCard({ h, index, slotId }: { h: Hypothesis; index: number; slotId?: string }) {
  const [open, setOpen] = useState(index === 0);
  const [llmOpen, setLlmOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);

  const dotColor =
    h.signal === "high" ? "bg-[#9a3412]" : h.signal === "medium" ? "bg-[#b45309]" : "bg-stone-400";
  const signalLabel =
    h.signal === "high" ? "STRONG" : h.signal === "medium" ? "MEDIUM" : "WEAK";

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white transition-colors hover:border-stone-300">
      <div className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-stone-50">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
          <span className="text-[11px] font-semibold tracking-wider text-stone-500 w-8">{h.id}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-medium text-stone-900">{h.title}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold tracking-wider text-stone-400">{signalLabel}</span>
            {open ? (
              <ChevronUp className="h-3.5 w-3.5 text-stone-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
            )}
          </div>
        </button>
        {slotId && <EvidenceButton slotId={slotId} label={h.title} variant="subtle" />}
      </div>
      {open && (
        <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-4 pl-[3.25rem] space-y-3">
          {/* 증거 */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
              증거
            </div>
            <div className="text-xs text-stone-700 leading-relaxed">{h.evidence}</div>
          </div>

          {/* LLM 원인 분석 + 추천 액션 토글 */}
          <div className="space-y-2">
            {/* LLM 원인 분석 */}
            <div className="rounded-md bg-[#e6f4f6]/40 border-l-2 border-l-[#0095A9]">
              <button
                onClick={() => setLlmOpen(!llmOpen)}
                className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-[#e6f4f6]/70"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#007a8c]" />
                  <span className="text-[12px] font-semibold text-[#007a8c]">LLM 원인 분석</span>
                </span>
                {llmOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-[#007a8c]" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-[#007a8c]" />
                )}
              </button>
              {llmOpen && (
                <div className="px-3 pb-3 pt-0 text-[12px] leading-relaxed text-stone-700">
                  {h.llmAnalysis}
                </div>
              )}
            </div>

            {/* 추천 액션 */}
            <div className="rounded-md bg-[#fef7ed]/40 border-l-2 border-l-[#b45309]">
              <button
                onClick={() => setActionOpen(!actionOpen)}
                className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-[#fef7ed]/70"
              >
                <span className="flex items-center gap-2">
                  <Lightbulb className="h-3.5 w-3.5 text-[#b45309]" />
                  <span className="text-[12px] font-semibold text-[#b45309]">추천 액션</span>
                </span>
                {actionOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-[#b45309]" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-[#b45309]" />
                )}
              </button>
              {actionOpen && (
                <ul className="px-3 pb-3 pt-0 space-y-1.5 text-[12px] leading-relaxed text-stone-700">
                  {h.recommendedActions.map((action, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#b45309] tnum shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      <span dangerouslySetInnerHTML={{ __html: renderBold(action) }} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// **bold** 마크다운 → <strong>
function renderBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-stone-900">$1</strong>');
}

// =============================================================================
// 상단 NumberCell + 액션 버튼 row
// =============================================================================

function StatCellWithActions({
  label,
  value,
  unit,
  sub,
  lineage,
  emphasis = false,
  slotId,
}: {
  label: string;
  value: number;
  unit?: string;
  sub: string;
  lineage: NumberLineage;
  emphasis?: boolean;
  slotId?: string;
}) {
  return (
    <div className="rounded-md border border-stone-200/80 bg-white p-5 transition-colors duration-150 hover:border-stone-300">
      <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-stone-500">
        {label}
      </div>
      <div className="mt-2">
        <NumberCell
          value={value}
          unit={unit}
          lineage={slotId ? undefined : lineage}
          slotId={slotId}
          size="lg"
          emphasis={emphasis}
        />
      </div>
      <div className="mt-2 text-[12px] text-stone-500 leading-relaxed">{sub}</div>
      <div className="mt-3 flex gap-2 border-t border-stone-100 pt-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-[#0095A9]/30 px-2.5 py-1 text-[11px] font-medium text-[#007a8c] transition-colors hover:bg-[#e6f4f6]"
        >
          <BookOpen className="h-3 w-3" />
          원장 보기
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-[#0095A9]/30 px-2.5 py-1 text-[11px] font-medium text-[#007a8c] transition-colors hover:bg-[#e6f4f6]"
        >
          <ExternalLink className="h-3 w-3" />
          ERP 열기
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// 페이지
// =============================================================================

export default function RootCausePage() {
  const cohortChart = lifeKpi.matureAnalysis.byJoinYear.map((c) => ({
    가입연도: c.joinYear,
    "회원 수": c.totalCount,
    "만기율(%)": Math.round(c.matureRate * 1000) / 10,
  }));

  const channelLTV = lifeKpi.channelMatrix.map((c) => ({
    채널: c.channel,
    회원수: c.memberCount,
    "회원당 매출(만원)": Math.round(c.avgRevenue / 10000),
  }));

  // 산점도: 잠재가치 상위 12개만 라벨 표시 (overlap 방지)
  const districtScatterAll = zoneKpi.districtMatrix.slice(0, 30).map((d) => ({
    name: d.district,
    "분양률(%)": Math.round(d.soldRate * 100),
    "잠재가치(억)": Math.round((d.potentialValue ?? 0) / 100_000_000),
    "가용재고": d.availableCount,
  }));
  const top12Names = new Set(
    [...districtScatterAll]
      .sort((a, b) => b["잠재가치(억)"] - a["잠재가치(억)"])
      .slice(0, 12)
      .map((d) => d.name),
  );
  const districtScatter = districtScatterAll.map((d) => ({
    ...d,
    labelName: top12Names.has(d.name) ? d.name : "",
  }));

  return (
    <AppLayout
      pageTitle="Root Cause 분석"
      pageSubtitle="상조 영업손실·장지 정체의 원인 가설 분해 — 강한 신호 위주"
      narration={
        <div className="space-y-2">
          <p>
            <strong>가설 클릭 시 증거·LLM 분석·추천 액션 펼침</strong>. 강한 신호(빨강) → 중간(황) → 약한(회).
          </p>
          <p>상단 KPI는 클릭 시 데이터 lineage 패널이 열리며, 원장·ERP로 직접 이동 가능.</p>
        </div>
      }
    >
      {/* Top KPIs — NumberCell + 원장/ERP 버튼 */}
      <section className="grid gap-6 sm:grid-cols-3">
        <StatCellWithActions
          label="라이프 만기 회원 매출 비중"
          value={Math.round(lifeKpi.memberStatus[0].shareOfRevenue * 1000) / 10}
          unit="%"
          sub={`${lifeKpi.matureAnalysis.totalMatureMembers.toLocaleString()}명 회비정산차익 → 영업외 인식`}
          lineage={matureLineage}
          slotId="rc_stat_mature_member"
          emphasis
        />
        <StatCellWithActions
          label="장지 가용재고 정체 잠재"
          value={zoneKpi.wowMetrics.potentialFromTransfer ?? 0}
          unit="원"
          sub={`이장지 4,325기 — 가용재고 잠재의 29%`}
          lineage={stagnantLineage}
          slotId="rc_stat_transfer_potential"
        />
        <StatCellWithActions
          label="채널 LTV 격차 (오프/온)"
          value={34}
          unit="배"
          sub="광고 ROI 재배분 후보 — product mix 보정 후 재평가"
          lineage={channelGapLineage}
          slotId="rc_stat_channel_ltv_gap"
          emphasis
        />
      </section>

      {/* 상조 root cause */}
      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">상조 VC — 영업손실 3년 연속의 원인 가설</h2>
          <span className="text-[12px] tracking-wider text-stone-400">FY23–25</span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card
            title="가입 코호트 × 만기율"
            subtitle="2022~2025년 가입자의 만기율 급등 — 단기 수익실현 패턴 강함"
            slotId="rc_chart_cohort_maturity"
          >
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={cohortChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="가입연도" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar yAxisId="left" dataKey="회원 수" fill="#0095A9" radius={[3, 3, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="만기율(%)"
                  stroke="#9a3412"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="채널별 회원당 매출" subtitle="온라인 채널 LTV 의심" slotId="rc_chart_channel_ltv">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelLTV}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="채널" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="회원당 매출(만원)" radius={[3, 3, 0, 0]}>
                  {channelLTV.map((d, i) => (
                    <Cell key={i} fill={d.채널 === "온라인" ? "#9a3412" : "#0095A9"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="mt-4 space-y-2">
          {MUTUAL_HYPOTHESES.map((h, i) => (
            <HypothesisCard key={h.id} h={h} index={i} slotId={`rc_h${i + 1}_card`} />
          ))}
        </div>
      </section>

      {/* 장지 root cause */}
      <section className="mt-14">
        <div className="mb-4 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">장지 VC — 정체·미활용 자원의 원인 가설</h2>
          <span className="text-[12px] tracking-wider text-stone-400">26.04 기준</span>
        </div>

        <Card
          title="단지별 분양률 vs 잠재가치 산점도"
          subtitle="우상단 → 잠재가치 큰데 분양 잘 됨 / 좌하단 → 정체 위험. 잠재가치 상위 12개 단지 라벨 표시"
          slotId="rc_chart_scatter_zone"
        >
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="분양률(%)"
                name="분양률"
                tick={{ fontSize: 11 }}
                label={{
                  value: "분양률 (%)",
                  position: "insideBottom",
                  offset: -10,
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="잠재가치(억)"
                name="잠재가치"
                tick={{ fontSize: 11 }}
                label={{
                  value: "잠재가치 (억원)",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                }}
              />
              <ZAxis type="number" dataKey="가용재고" range={[60, 400]} name="가용재고" />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter name="단지" data={districtScatter} fill="#0095A9" fillOpacity={0.55}>
                <LabelList
                  dataKey="labelName"
                  position="top"
                  style={{ fontSize: 10, fill: "#475569", fontWeight: 500 }}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <div className="mt-4 space-y-2">
          {ZONE_HYPOTHESES.map((h, i) => (
            <HypothesisCard key={h.id} h={h} index={i} slotId={`rc_zone_hypothesis_z${i + 1}`} />
          ))}
        </div>
      </section>

      {/* 통합 인사이트 — Next Steps 흡수 */}
      <section className="mt-12">
        <div className="mb-5 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">통합 인사이트 — 그룹 관점</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <InsightBox type="warn" title="회계 손익 ≠ 경제 손익" slotId="rc_insight_gaap_vs_economic">
            상조 VC의 "손실"은 회비정산차익 영업외 분류로 인한 시각적 효과가 큼.{" "}
            <strong>영업이익 + 회비정산차익 view</strong>로 재해석 시 그룹 의사결정 근거 강화. View 전환은
            분기 IR·내부 경영회의 default 전환부터 시작.
          </InsightBox>
          <InsightBox type="danger" title="장지 master 결손이 BI 깊이를 제한" slotId="rc_insight_master_rfi">
            정체단지 식별·이장지 분포는 가능하나, <strong>회원·영업사원 단위 분석은 데이터 부재</strong>.
            데이터 모델 페이지의 RFI 5건 자동 도출 → 회신 후 회원 LTV·family cross-sell BI 자동 확장.
          </InsightBox>
          <InsightBox type="info" title="채널 ROI 재배분의 수익화 기회" slotId="rc_insight_channel_roi">
            온라인 채널 회원당 매출이 오프라인의 3% 수준. 광고선전비·온유프리 광고 효율 재검토 + product
            mix 차등화 우선.
          </InsightBox>
          <InsightBox type="success" title="단기 액션 — 가용재고 활성화" slotId="rc_insight_inventory_activation">
            이장지 4,325기 + 정체단지 우선 처리 →{" "}
            <strong>{autoUnit(zoneKpi.wowMetrics.potentialFromAvailable)}</strong> 잠재가치 일부 실현
            가능. 가설 검증(H1·H2·Z1·Z4) 인터뷰와 병행.
          </InsightBox>
        </div>

        {/* 액션 트래커 — 운영 도구 톤 (보고서 mint bg 폐기) */}
        <div className="mt-6 rounded-md border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="section-label">다음 액션</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0095A9]">
                3건 진행 중
              </span>
            </div>
            <span className="text-[10px] tracking-wider text-stone-400">UPDATED 2026-05-08</span>
          </div>
          <ul className="divide-y divide-stone-100">
            <li className="flex items-center gap-3 px-4 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b45309]" />
              <span className="text-[11px] font-semibold tracking-wider text-stone-400 w-12">A-01</span>
              <span className="flex-1 text-[12px] text-stone-700">
                <strong className="text-stone-900">가설 검증</strong> — H1·H2·Z1·Z4 회사 측 인터뷰 진행
              </span>
              <span className="text-[10px] font-medium text-[#b45309]">진행 중</span>
            </li>
            <li className="flex items-center gap-3 px-4 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9a3412]" />
              <span className="text-[11px] font-semibold tracking-wider text-stone-400 w-12">A-02</span>
              <span className="flex-1 text-[12px] text-stone-700">
                <strong className="text-stone-900">RFI 회신 대기</strong> — 장지 회원 master (r74)
              </span>
              <span className="text-[10px] font-medium text-[#9a3412]">대기</span>
            </li>
            <li className="flex items-center gap-3 px-4 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0095A9]" />
              <span className="text-[11px] font-semibold tracking-wider text-stone-400 w-12">A-03</span>
              <span className="flex-1 text-[12px] text-stone-700">
                <strong className="text-stone-900">View 전환</strong> — 영업이익 + 회비정산차익 통합 KPI
                분기 IR 도입
              </span>
              <span className="text-[10px] font-medium text-[#007a8c]">설계</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-8 border-t border-stone-200 pt-5">
        <h3 className="section-label mb-3">DATA LINEAGE</h3>
        <div className="space-y-2">
          <SourceCaption>
            H1 만기 매출 비중 60.6% = 회원상태=YF 매출합계(16,835,918,500) / 전체 매출합계(27,764,964,000)
          </SourceCaption>
          <SourceCaption>H2 코호트 만기율 = 가입연도별 회원상태=YF 비율 (회원DB groupby)</SourceCaption>
          <SourceCaption>H3 채널 LTV 격차 = ltvByChannel 산출, 채널별 매출합계/회원수</SourceCaption>
          <SourceCaption>Z1 정체 잠재 = 2022년 이후 계약 없는 단지의 가용재고 합 × 등급 평균가 (proxy)</SourceCaption>
          <SourceCaption>Z2 이장지 잠재 = 이장지 4,325 × 등급 평균가 (proxy 추정)</SourceCaption>
        </div>
      </section>
    </AppLayout>
  );
}
