"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
import { ChevronDown, ChevronUp } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, InsightBox, StatCard, SourceCaption } from "@/components/Card";
import lifeKpi from "@/data/life_kpi.json";
import zoneKpi from "@/data/zone_kpi.json";
import { autoUnit, formatPct } from "@/lib/format";

type Hypothesis = {
  id: string;
  title: string;
  evidence: string;
  signal: "high" | "medium" | "low";
};

const MUTUAL_HYPOTHESES: Hypothesis[] = [
  {
    id: "H1",
    title: "회비정산차익이 영업외수익으로 흡수되어 영업이익 view에서 손실 과대 표시",
    evidence: `만기해약 ${lifeKpi.matureAnalysis.totalMatureMembers.toLocaleString()}명의 정산차익 ${autoUnit(lifeKpi.wowMetrics.potentialFromMature)} → 영업외 인식. 매출의 ${formatPct(lifeKpi.memberStatus[0].shareOfRevenue)} 비중`,
    signal: "high",
  },
  {
    id: "H2",
    title: "최근 가입 코호트의 만기율 급등 — 단기 수익실현·해약 패턴",
    evidence: "2022~2025년 만기율 72%·96%·88%·88% (2018~2020년 1.5~4% 대비 약 30배)",
    signal: "high",
  },
  {
    id: "H3",
    title: "온라인 채널의 회원당 매출이 오프라인의 약 3% — 광고 ROI 의심",
    evidence: `온라인 LTV ${autoUnit(lifeKpi.wowMetrics.ltvByChannel.온라인)} vs 오프라인 ${autoUnit(lifeKpi.wowMetrics.ltvByChannel.오프라인)} (격차 약 34배)`,
    signal: "medium",
  },
  {
    id: "H4",
    title: "설계사 매출 집중도 (Gini 0.69) — 하위 설계사의 생산성·이탈 risk",
    evidence: `전체 ${lifeKpi.salesAgentDistribution.totalAgents}명 중 Top10이 매출 ${formatPct(lifeKpi.salesAgentDistribution.top10ShareOfRevenue)} 점유`,
    signal: "medium",
  },
];

const ZONE_HYPOTHESES: Hypothesis[] = [
  {
    id: "Z1",
    title: "정체단지 잠재가치 누적 — 영업 우선순위 미설정",
    evidence: `2022년 이후 계약 없는 정체 잠재 ${zoneKpi.wowMetrics.stagnantInventoryWarning?.toLocaleString() ?? "—"}건 (가용재고의 약 20%)`,
    signal: "high",
  },
  {
    id: "Z2",
    title: "이장지 4,325기의 재분양 자원이 활용 안 됨",
    evidence: `이장지 잠재가치 약 ${autoUnit(zoneKpi.wowMetrics.potentialFromTransfer ?? 0)} — 전체 가용재고 잠재의 29% 비중`,
    signal: "high",
  },
  {
    id: "Z3",
    title: "단지·등급별 평균가 격차 큼 — 가격조정 여지",
    evidence: `등급 F 평균 ${autoUnit(zoneKpi.potentialValue.avgPriceByGrade.find((g) => g.grade === "F")?.avgPrice ?? 0)} vs A ${autoUnit(zoneKpi.potentialValue.avgPriceByGrade.find((g) => g.grade === "A")?.avgPrice ?? 0)}`,
    signal: "medium",
  },
  {
    id: "Z4",
    title: "계약자 master 부재 → 회원 LTV·재계약·가족 cross-sell 분석 불가",
    evidence: "묘역 raw에 계약번호는 77.5%이나 계약자 정보 컬럼 0열 (RFI r74 미수령)",
    signal: "high",
  },
];

function HypothesisCard({ h, index }: { h: Hypothesis; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const dotColor =
    h.signal === "high" ? "bg-[#9a3412]" : h.signal === "medium" ? "bg-[#b45309]" : "bg-stone-400";
  const signalLabel =
    h.signal === "high" ? "STRONG" : h.signal === "medium" ? "MEDIUM" : "WEAK";

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white transition-colors hover:border-stone-300">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-stone-50"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
        <span className="text-[11px] font-semibold tracking-wider text-stone-500 w-8">{h.id}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium text-stone-900">{h.title}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold tracking-wider text-stone-400">{signalLabel}</span>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-stone-400" /> : <ChevronDown className="h-3.5 w-3.5 text-stone-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-3 pl-[3.25rem] text-xs text-stone-700">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-1">증거</div>
          {h.evidence}
        </div>
      )}
    </div>
  );
}

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

  const districtScatter = zoneKpi.districtMatrix.slice(0, 30).map((d) => ({
    name: d.district,
    "분양률(%)": Math.round(d.soldRate * 100),
    "잠재가치(억)": Math.round((d.potentialValue ?? 0) / 100_000_000),
    "가용재고": d.availableCount,
  }));

  return (
    <AppLayout
      pageTitle="Root Cause 분석"
      pageSubtitle="상조 영업손실·장지 정체의 원인 가설 분해 — 강한 신호 위주"
      narration={
        <div className="space-y-2">
          <p>
            <strong>가설 클릭 시 증거 펼침</strong>. 강한 신호(빨강) → 중간(황) → 약한(회) 순서.
          </p>
          <p>각 가설은 데이터 단서로 뒷받침되며, 미수령 자료가 RFI로 자동 연결됨.</p>
        </div>
      }
    >
      {/* Top KPIs */}
      <section className="grid gap-6 sm:grid-cols-3">
        <StatCard
          label="라이프 만기 회원 매출 비중"
          value={formatPct(lifeKpi.memberStatus[0].shareOfRevenue)}
          sub={`${lifeKpi.matureAnalysis.totalMatureMembers.toLocaleString()}명 회비정산차익`}
          trend="up"
          trendValue="영업외 ↑"
        />
        <StatCard
          label="장지 가용재고 정체 잠재"
          value={autoUnit(zoneKpi.wowMetrics.potentialFromTransfer ?? 0)}
          sub="이장지 4,325기"
          trend="down"
          trendValue="활용 ↓"
        />
        <StatCard
          label="채널 LTV 격차 (오프/온)"
          value="34배"
          sub="광고 ROI 재배분 후보"
          trend="flat"
        />
      </section>

      {/* 상조 root cause */}
      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">
            상조 VC — 영업손실 3년 연속의 원인 가설
          </h2>
          <span className="text-[12px] tracking-wider text-stone-400">FY23–25</span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card title="가입 코호트 × 만기율" subtitle="2022~2025년 가입자의 만기율 급등 — 단기 수익실현 패턴 강함">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={cohortChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="가입연도" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar yAxisId="left" dataKey="회원 수" fill="#0095A9" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="만기율(%)" stroke="#9a3412" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="채널별 회원당 매출" subtitle="온라인 채널 LTV 의심">
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
            <HypothesisCard key={h.id} h={h} index={i} />
          ))}
        </div>
      </section>

      {/* 장지 root cause */}
      <section className="mt-14">
        <div className="mb-4 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">
            장지 VC — 정체·미활용 자원의 원인 가설
          </h2>
          <span className="text-[12px] tracking-wider text-stone-400">26.04 기준</span>
        </div>

        <Card title="단지별 분양률 vs 잠재가치 산점도" subtitle="우상단 → 잠재가치 큰데 분양 잘 됨 / 좌하단 → 정체 위험">
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="분양률(%)"
                name="분양률"
                tick={{ fontSize: 11 }}
                label={{ value: "분양률 (%)", position: "insideBottom", offset: -10, fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="잠재가치(억)"
                name="잠재가치"
                tick={{ fontSize: 11 }}
                label={{ value: "잠재가치 (억원)", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="가용재고" range={[60, 400]} name="가용재고" />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter name="단지" data={districtScatter} fill="#0095A9" fillOpacity={0.55} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <div className="mt-4 space-y-2">
          {ZONE_HYPOTHESES.map((h, i) => (
            <HypothesisCard key={h.id} h={h} index={i} />
          ))}
        </div>
      </section>

      {/* 통합 인사이트 */}
      <section className="mt-12">
        <div className="mb-5 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">
            통합 인사이트 — 그룹 관점
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <InsightBox type="warn" title="회계 손익 ≠ 경제 손익">
            상조 VC의 "손실"은 회비정산차익 영업외 분류로 인한 시각적 효과가 큼.
            <strong> 영업이익 + 회비정산차익 view</strong>로 재해석 시 그룹 의사결정 근거 강화.
          </InsightBox>
          <InsightBox type="danger" title="장지 master 결손이 BI 깊이를 제한">
            정체단지 식별·이장지 분포는 가능하나, <strong>회원·영업사원 단위 분석은 데이터 부재</strong>.
            데이터 모델 페이지의 RFI 5건 자동 도출 → ERP 보강 후 BI 자동 확장.
          </InsightBox>
          <InsightBox type="info" title="채널 ROI 재배분의 수익화 기회">
            온라인 채널 회원당 매출이 오프라인의 3% 수준. 광고선전비·온유프리 광고 효율 재검토.
          </InsightBox>
          <InsightBox type="success" title="단기 액션 — 가용재고 활성화">
            이장지 4,325기 + 정체단지 우선 처리 → <strong>{autoUnit(zoneKpi.wowMetrics.potentialFromAvailable)}</strong> 잠재가치 일부 실현 가능.
          </InsightBox>
        </div>
      </section>

      {/* 다음 단계 */}
      <section className="mt-12 rounded-md bg-[#0095A9] p-8 text-sm text-[#ccebee]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b3dde0]">Next Steps</div>
        <ul className="mt-3 space-y-2">
          <li className="flex gap-3">
            <span className="text-[#b3dde0] tnum">01</span>
            <span><strong className="text-white">가설 검증</strong> — 회사 측 인터뷰로 H1·H2·Z1·Z4 확정</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[#b3dde0] tnum">02</span>
            <span><strong className="text-white">RFI 회신 후</strong> — 장지 회원 master 수령 시 동일 BI에 회원 KPI 자동 추가</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[#b3dde0] tnum">03</span>
            <span><strong className="text-white">View 전환</strong> — 영업이익+회비정산차익 view를 회사·외부 보고에 옵션 추가</span>
          </li>
        </ul>
      </section>

      <section className="mt-8 border-t border-stone-200 pt-5">
        <h3 className="section-label mb-3">DATA LINEAGE</h3>
        <div className="space-y-2">
          <SourceCaption>H1 만기 매출 비중 60.6% = 회원상태=YF 매출합계(16,835,918,500) / 전체 매출합계(27,764,964,000)</SourceCaption>
          <SourceCaption>H2 코호트 만기율 = 가입연도별 회원상태=YF 비율 (회원DB groupby)</SourceCaption>
          <SourceCaption>H3 채널 LTV 격차 = ltvByChannel 산출, 채널별 매출합계/회원수</SourceCaption>
          <SourceCaption>Z1 정체 잠재 = 2022년 이후 계약 없는 단지의 가용재고 합 × 등급 평균가 (proxy)</SourceCaption>
          <SourceCaption>Z2 이장지 잠재 = 이장지 4,325 × 등급 평균가 (proxy 추정)</SourceCaption>
        </div>
      </section>
    </AppLayout>
  );
}
