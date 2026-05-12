"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, ChevronDown, ChevronUp, GitBranch } from "lucide-react";
import { AppLayout, SubNav } from "@/components/AppLayout";
import { Card, EvidenceButton, WowCard, InsightBox, SourceCaption } from "@/components/Card";
import { NumberCell } from "@/components/NumberCell";
import { ChannelActivityCostExplorer } from "@/components/ChannelActivityCostExplorer";
import lifeKpi from "@/data/life_kpi.json";
import deptKpi from "@/data/dept_kpi.json";
import { autoUnit, formatPct } from "@/lib/format";
import type { NumberLineage } from "@/types";

// -----------------------------------------------------------------------------
// Root Cause inline 가설 카드 (root-cause 페이지 H1~H4 컴팩트 버전)
// LLM 분석·추천 액션 같은 고급 인터랙션은 root-cause 페이지에서만 — 본 페이지는
// 사용자가 상조 VC 흐름 안에서 가설 시그널을 빠르게 파악할 수 있게 핵심만.
// -----------------------------------------------------------------------------

type InlineHypothesis = {
  id: string;
  title: string;
  evidence: string;
  signal: "high" | "medium" | "low";
};

function InlineHypothesisCard({
  h,
  defaultOpen,
  slotId,
}: {
  h: InlineHypothesis;
  defaultOpen?: boolean;
  slotId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
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
          <span className="w-8 text-[11px] font-semibold tracking-wider text-stone-500">{h.id}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium leading-snug text-stone-900">{h.title}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10.5px] font-semibold tracking-wider text-stone-400">
              {signalLabel}
            </span>
            {open ? (
              <ChevronUp className="h-3.5 w-3.5 text-stone-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
            )}
          </div>
        </button>
        {slotId && <EvidenceButton slotId={slotId} variant="subtle" label={h.title} />}
      </div>
      {open && (
        <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-3 pl-[3.25rem] text-[12px] leading-relaxed text-stone-700">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            증거
          </div>
          {h.evidence}
        </div>
      )}
    </div>
  );
}

// 용인공원 mint 톤 + 절제된 강조
const STATUS_COLOR: Record<string, string> = {
  "납부만기(YF)": "#b45309", // amber-800 (회비정산차익으로 흘러감 → 주의)
  "정상(YY)": "#0095A9",     // mint deep (정상)
  "3회연체(YB)": "#9a3412",   // brick (위험)
  "오류(YE)": "#a8a29e",      // stone-400
};
const STATUS_FALLBACK = "#a8a29e";
const ACCENT = "#0095A9";       // mint deep
const ACCENT_HOVER = "#65B3B1"; // mint mid

// 상조 VC 측 부서 (마케팅·온라인마케팅은 dept_kpi.json 상에서 한 row로 합쳐져 있음)
const MUTUAL_DEPT_IDS = new Set([
  "marketing",
  "online-marketing",
  "corp-sales",
  "customer-care",
]);

export default function MutualPage() {
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);

  const channelChartData = lifeKpi.channelMatrix.map((c) => ({
    채널: c.channel,
    회원수: c.memberCount,
    "회원당 매출(원)": Math.round(c.avgRevenue),
    만기율: c.matureRate,
  }));

  const statusPie = lifeKpi.memberStatus.map((s) => ({ name: s.status, value: s.count }));

  const cohort = lifeKpi.cohort.map((c) => ({
    가입연도: c.joinYear,
    "회원 수": c.memberCount,
    "만기율(%)": Math.round(c.matureRate * 1000) / 10,
    "평균 LTV(만원)": Math.round(c.avgLTV / 10000),
  }));

  // -------------------------------------------------------------------------
  // NumberCell lineage — 핵심 KPI 3개
  // -------------------------------------------------------------------------
  const lineageLifecycleRevenue: NumberLineage = {
    source: "라이프_회원DB_backdata.xlsx / 매출합계 컬럼",
    formula: "Σ 매출합계 (가입~25년말 누적, 채널·회원상태 무관 전체)",
    verified: true,
    unit: "원",
    asOf: "2025-12-31",
    steps: [
      { label: "회원 master row 추출", rowCount: lifeKpi.meta.totalMembers },
      { label: "채널 라벨 통합 (오프라인/오프라인  → 오프라인)", detail: "strip 적용, 9315+152=9467" },
      { label: "매출합계 컬럼 sum", amount: lifeKpi.wowMetrics.totalLifecycleRevenue },
    ],
    notes: "FY25 행사매출(4,624M) ≠ 회원 누적 납입액(스냅샷). 본 수치는 가입~25년말 누적 매출합계 — 회원입장 누적 납입액. 회사 손익 인식 매출은 PRIMARY 4,624M 별도 참조.",
  };

  const lineageMatureRate: NumberLineage = {
    source: "라이프_회원DB_backdata.xlsx / 회원상태 컬럼",
    formula: "회원상태=YF count / 전체 회원수",
    verified: true,
    unit: "%",
    asOf: "2025-12-31",
    steps: [
      { label: "회원 master row 추출", rowCount: lifeKpi.meta.totalMembers },
      { label: "회원상태=YF (납부만기) 필터", rowCount: lifeKpi.matureAnalysis.totalMatureMembers },
      { label: "비율 계산", detail: `${lifeKpi.matureAnalysis.totalMatureMembers}/${lifeKpi.meta.totalMembers}` },
    ],
    notes: "YF 회원의 매출합계는 영업외 '회비정산차익' 계정으로 인식 — 영업이익 view에서는 보이지 않음.",
  };

  const lineageTotalMembers: NumberLineage = {
    source: "라이프_회원DB_backdata.xlsx",
    formula: "회원 master row count (FY25 12월 말 기준)",
    verified: true,
    unit: "명",
    asOf: "2025-12-31",
    steps: [
      { label: "회원 master 로드 — 35열 × N행", rowCount: lifeKpi.meta.totalMembers },
      { label: "FY25 12월 말 시점 snapshot" },
    ],
    notes: "본 수치는 row count. 회원상태별 분포는 납부만기 도달율 카드 참고.",
  };

  const lineageTotalAgents: NumberLineage = {
    source: "라이프_회원DB_backdata.xlsx / 모집설계사 + 담당설계사 컬럼",
    formula: "DISTINCT(모집설계사 ∪ 담당설계사)",
    verified: true,
    unit: "명",
    asOf: "2025-12-31",
    steps: [
      { label: "모집설계사·담당설계사 컬럼 union" },
      { label: "DISTINCT", rowCount: lifeKpi.salesAgentDistribution.totalAgents },
    ],
    notes: `Top10이 매출 ${formatPct(lifeKpi.salesAgentDistribution.top10ShareOfRevenue)} 점유 · Gini ${lifeKpi.salesAgentDistribution.giniCoefficient}`,
  };

  // -------------------------------------------------------------------------
  // 상조 VC 측 부서만 필터 (dept_kpi.json은 4개 row 모두 상조 측이지만,
  // 명시적으로 화이트리스트해서 의도 보존)
  // -------------------------------------------------------------------------
  const mutualDepts = deptKpi.deptKpiMatrix.filter((d) => MUTUAL_DEPT_IDS.has(d.id));

  return (
    <AppLayout
      pageTitle="상조 VC 분석 — 라이프"
      pageSubtitle="회원 9,930명 lifecycle KPI · 35열 풀 master 보유"
      narration={
        <div className="space-y-2">
          <p>
            라이프는 <strong>회원 master 풀 수령</strong>으로 LTV·코호트·만기·설계사 분포 모두 산출 가능.
          </p>
          <p>온라인 회원당 매출이 오프라인의 <strong>약 3% 수준</strong> — 광고 ROI 재배분 근거.</p>
          <p className="text-[11px] text-stone-400">출처: 라이프_회원DB_backdata.xlsx / 25년말 DB</p>
        </div>
      }
    >
      <SubNav
        items={[
          { id: "overview", label: "회원 KPI" },
          { id: "channel", label: "채널·코호트" },
          { id: "agents", label: "설계사" },
          { id: "activity-cost", label: "채널별 활동원가" },
          { id: "root-cause", label: "Root Cause" },
          { id: "department", label: "부서별 KPI" },
        ]}
      />

      {/* Root Cause inline 가설 데이터 — 본 페이지 자체에서 정의 (root-cause 페이지와 별도) */}
      {/* H1~H4: 라이프 영업손실 3년 연속 핵심 가설 */}

      {/* ===================================================================
           HERO — 핵심 KPI 4개 (분리된 box, NumberCell · lineage 부착)
         =================================================================== */}
      <section id="overview" className="mt-10 scroll-mt-32">
        <div className="mb-4 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">핵심 KPI</h2>
          <span className="text-[11px] tracking-wider text-stone-400">CLICK 숫자 → lineage</span>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-stone-200/80 bg-white p-6 transition-colors hover:border-stone-300">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500">
              총 회원
            </div>
            <div className="mt-2.5">
              <NumberCell
                value={lifeKpi.meta.totalMembers}
                unit="명"
                lineage={lineageTotalMembers}
                size="lg"
              />
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-stone-500">
              FY25 12월 말 기준 · 35열 풀 master
            </div>
          </div>

          <div className="rounded-md border border-stone-200/80 bg-white p-6 transition-colors hover:border-stone-300">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500">
              회원 누적 납입액 (스냅샷)
            </div>
            <div className="mt-2.5">
              <NumberCell
                value={lifeKpi.wowMetrics.totalLifecycleRevenue}
                unit="원"
                lineage={lineageLifecycleRevenue}
                size="lg"
                emphasis
              />
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-stone-500">
              9,930명 가입~25년말 누적 매출합계
            </div>
          </div>

          <div className="rounded-md border border-stone-200/80 bg-white p-6 transition-colors hover:border-stone-300">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500">
              납부만기 도달율
            </div>
            <div className="mt-2.5">
              <NumberCell
                value={lifeKpi.matureAnalysis.matureRate * 100}
                unit="%"
                lineage={lineageMatureRate}
                size="lg"
                formatter={(v) => v.toFixed(1)}
              />
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-stone-500">
              {lifeKpi.matureAnalysis.totalMatureMembers.toLocaleString()}명 — 회비정산차익으로 흘러감
            </div>
          </div>

          <div className="rounded-md border border-stone-200/80 bg-white p-6 transition-colors hover:border-stone-300">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500">
              설계사 수
            </div>
            <div className="mt-2.5">
              <NumberCell
                value={lifeKpi.salesAgentDistribution.totalAgents}
                unit="명"
                lineage={lineageTotalAgents}
                size="lg"
              />
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-stone-500">
              Top10이 매출 {formatPct(lifeKpi.salesAgentDistribution.top10ShareOfRevenue)} 점유
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
           채널 LTV · 회원상태 (mt-6 → mt-12, gap-4 → gap-8)
         =================================================================== */}
      <section id="channel" className="mt-12 grid gap-8 scroll-mt-32 lg:grid-cols-2">
        <Card title="채널별 회원당 LTV" subtitle="평균 매출(원) 기준" slotId="mutual_channel_ltv_chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={channelChartData}
              onMouseMove={(state) => {
                if (state?.activeLabel) setHoveredChannel(String(state.activeLabel));
              }}
              onMouseLeave={() => setHoveredChannel(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="채널" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toLocaleString()}만`} />
              <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString() + "원" : String(v ?? ""))} cursor={{ fill: "rgba(14,165,233,0.05)" }} />
              <Bar dataKey="회원당 매출(원)" radius={[3, 3, 0, 0]}>
                {channelChartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={hoveredChannel === d.채널 ? ACCENT_HOVER : ACCENT}
                    style={{ transition: "fill 0.15s" }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {Object.entries(lifeKpi.wowMetrics.ltvByChannel).map(([ch, v]) => (
              <div
                key={ch}
                className={`rounded-sm border px-2 py-1.5 transition-colors ${
                  hoveredChannel === ch ? "border-[#0095A9] bg-[#e6f4f6]" : "border-stone-200 bg-white"
                }`}
              >
                <div className="text-[10px] text-stone-500">{ch}</div>
                <div className="tnum font-semibold">{autoUnit(v)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="회원상태 분포" subtitle="납부만기/정상/연체/오류 — 만기 비중에 주목" slotId="mutual_member_status_pie">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label paddingAngle={2}>
                {statusPie.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLOR[entry.name] ?? STATUS_FALLBACK}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString() + "명" : String(v ?? ""))} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* ===================================================================
           가입연도별 코호트
         =================================================================== */}
      <section className="mt-12">
        <Card title="가입연도별 코호트" subtitle="회원수·만기율·평균 LTV — 2022년 이후 만기율 급등" slotId="mutual_cohort_linechart">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cohort}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="가입연도" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line yAxisId="left" type="monotone" dataKey="회원 수" stroke="#0095A9" strokeWidth={1.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              <Line yAxisId="left" type="monotone" dataKey="평균 LTV(만원)" stroke="#78716c" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 3 }} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="만기율(%)" stroke="#9a3412" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* ===================================================================
           설계사 · 채널별 납부만기 도달율
         =================================================================== */}
      <section id="agents" className="mt-12 grid gap-8 scroll-mt-32 lg:grid-cols-2">
        <Card title="상위 10 설계사" subtitle={`전체 ${lifeKpi.salesAgentDistribution.totalAgents}명 · Top10이 매출 ${formatPct(lifeKpi.salesAgentDistribution.top10ShareOfRevenue)} · Gini ${lifeKpi.salesAgentDistribution.giniCoefficient}`} slotId="mutual_top_agents_table">
          <div className="overflow-hidden rounded border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="p-2 text-left">설계사</th>
                  <th className="p-2 text-right">회원</th>
                  <th className="p-2 text-right">매출</th>
                </tr>
              </thead>
              <tbody>
                {lifeKpi.salesAgentDistribution.top10.map((a, i) => (
                  <tr key={a.agentId} className="border-t transition-colors hover:bg-stone-50">
                    <td className="p-2 font-medium">
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-sm bg-[#0095A9] text-[10px] font-medium text-white tnum">
                        {i + 1}
                      </span>
                      {a.agentName}
                    </td>
                    <td className="p-2 text-right tabular-nums">{a.memberCount}</td>
                    <td className="p-2 text-right font-semibold tabular-nums">{autoUnit(a.revenueSum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="채널별 납부만기 도달율" subtitle="회원상태=납부만기(YF) / 채널 전체. 해약율 아님 — 정상 납부완료 비율" slotId="mutual_mature_by_channel">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={lifeKpi.matureAnalysis.byChannel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => (typeof v === "number" ? `${(v * 100).toFixed(1)}%` : String(v ?? ""))} cursor={{ fill: "rgba(245,158,11,0.05)" }} />
              <Bar dataKey="matureRate" fill="#b45309" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* ===================================================================
           NEW — 채널별 활동원가 (Phase 5C)
           장지의 ActivityCostExplorer 채널 버전. ZoneSelector·NumberCell·
           lineage 패널·FinanceActions 모두 동일하게 작동.
         =================================================================== */}
      <section id="activity-cost" className="mt-12 scroll-mt-32">
        <ChannelActivityCostExplorer
          side="mutual"
          defaultChannelIds={["ch-offline"]}
          title="채널별 활동원가"
          subtitle="채널을 선택하면 매출·비용 항목과 lineage가 펼쳐집니다 · 다중 선택 가능"
          slotId="mutual_channel_explorer"
        />
      </section>

      {/* ===================================================================
           NEW — Root Cause 가설 inline (Phase 5C)
           본 페이지에서 가설 4개 시그널·증거만 컴팩트하게 노출.
           LLM 분석·추천 액션 같은 풀 인터랙션은 root-cause 페이지에서.
         =================================================================== */}
      <section id="root-cause" className="mt-12 scroll-mt-32">
        <div className="mb-4 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">원인 가설 — 상조 VC 영업손실 3년 연속</h2>
          <span className="text-[11px] tracking-wider text-stone-400">CLICK 카드 → 증거 펼침</span>
        </div>
        <p className="mb-6 max-w-3xl text-[13px] leading-relaxed text-stone-600">
          매출은 23~25년 21→36→46억으로 성장 중이나 영업손실이 3년 연속 누적. 가설 4개 — 회비정산차익
          회계 흐름·코호트 만기율·채널 LTV 격차·설계사 집중도 — 가 강한·중간 신호로 데이터에서 관측됨.
        </p>
        <div className="space-y-2.5">
          {(
            [
              {
                id: "H1",
                title:
                  "회비정산차익이 영업외수익으로 흡수되어 영업이익 view에서 손실 과대 표시",
                evidence: `만기해약 ${lifeKpi.matureAnalysis.totalMatureMembers.toLocaleString()}명의 정산차익 ${autoUnit(lifeKpi.wowMetrics.potentialFromMature)} → 영업외 인식. 매출의 ${formatPct(lifeKpi.memberStatus[0].shareOfRevenue)} 비중. 조정후이익(영업이익+회비정산차익) view에서 재해석 필요.`,
                signal: "high" as const,
              },
              {
                id: "H2",
                title: "최근 가입 코호트의 만기율 급등 — 단기 수익실현·해약 패턴",
                evidence:
                  "2022~2025년 만기율 72%·96%·88%·88% (2018~2020년 1.5~4% 대비 약 30배). 신규 가입자가 짧은 주기로 만기 처리되는 구조 — 영업비용 회수 전 매출이 영업외로 이전.",
                signal: "high" as const,
              },
              {
                id: "H3",
                title: "온라인 채널의 회원당 매출이 오프라인의 약 3% — 광고 ROI 의심",
                evidence: `온라인 LTV ${autoUnit(lifeKpi.wowMetrics.ltvByChannel.온라인)} vs 오프라인 ${autoUnit(lifeKpi.wowMetrics.ltvByChannel.오프라인)} (격차 약 34배). 광고선전비 전액(약 10억)이 온라인 신규 가입자 driver로 귀속되나 매출 회수율 매우 낮음.`,
                signal: "medium" as const,
              },
              {
                id: "H4",
                title: "설계사 매출 집중도(Gini 0.69) — 하위 설계사 생산성·이탈 risk",
                evidence: `전체 ${lifeKpi.salesAgentDistribution.totalAgents}명 중 Top10이 매출 ${formatPct(lifeKpi.salesAgentDistribution.top10ShareOfRevenue)} 점유. 하위 설계사 생산성 저하·이탈 시 단기 매출 충격 큼.`,
                signal: "medium" as const,
              },
            ] satisfies InlineHypothesis[]
          ).map((h, i) => (
            <InlineHypothesisCard
              key={h.id}
              h={h}
              defaultOpen={i === 0}
              slotId={`mutual_hypothesis_h${i + 1}`}
            />
          ))}
        </div>
        {/* Root Cause 상세 분석 CTA — 차트·LLM 분석·추천 액션은 별도 페이지에서 */}
        <Link
          href="/root-cause"
          className="group mt-6 flex items-center justify-between gap-6 rounded-md bg-[#0095A9] px-8 py-6 text-white transition-colors hover:bg-[#007a8c]"
        >
          <div className="flex items-center gap-5">
            <GitBranch className="h-7 w-7 shrink-0 text-[#b3dde0]" strokeWidth={1.75} />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold leading-tight">
                Root Cause 상세 분석 보기
              </div>
              <div className="mt-1.5 text-[12px] leading-relaxed text-[#ccebee]">
                채널 LTV 차트 · 코호트 만기율 · 산점도 · LLM 원인 분석 · 가설별 추천 액션
              </div>
            </div>
          </div>
          <ArrowUpRight
            className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      </section>

      {/* ===================================================================
           WowCard · InsightBox
         =================================================================== */}
      <section className="mt-12">
        <WowCard
          slotId="mutual_wow_mature_benefit"
          variant="mint"
          label="회계 ≠ 경제"
          value={autoUnit(lifeKpi.wowMetrics.potentialFromMature)}
          sub={`만기해약 ${lifeKpi.matureAnalysis.totalMatureMembers.toLocaleString()}명의 회비정산차익은 영업외수익이지만 경제적으로는 매출의 일부. 영업이익+회비정산차익 view 시 손익 재해석.`}
          footnote="회원DB 회원상태=YF의 매출합계 sum"
        />
      </section>

      <section className="mt-6">
        <InsightBox type="warn" title="만기해약 비중과 영업손실의 관계" slotId="mutual_insight_mature">
          매출은 23~25년 21→36→46억으로 성장 중이나, 최근 가입 회원의 만기율(2022년 72%, 2023년 96%)이 높아 회비정산차익(영업외)으로 흘러감. 영업이익 view에선 손실 trend가 보이나, 조정후이익(영업이익+회비정산차익) view에서 재평가 필요.
        </InsightBox>
      </section>

      {/* ===================================================================
           NEW — 부서별 KPI 매핑 (상조 VC 4개 부서)
         =================================================================== */}
      <section id="department" className="mt-12 scroll-mt-32">
        <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-stone-200 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="section-h">부서별 KPI 매핑 — 상조 VC</h2>
            <EvidenceButton slotId="mutual_dept_kpi_cards" label="부서별 KPI 매핑 — 상조 VC" variant="subtle" />
          </div>
          <span className="text-[11px] tracking-wider text-stone-400">PPT 23p</span>
        </div>
        <p className="mb-6 max-w-3xl text-[13px] leading-relaxed text-stone-600">
          상조 VC 4개 부서의 손익 그룹·기존 KPI·신규 KPI를 매핑. 신규 KPI는 현행 체계에서 포착되지 않는
          수익성 관리 영역을 보완하기 위해 추가 설정.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {mutualDepts.map((d) => (
            <Link
              key={d.id}
              href={`/dept/${d.id}`}
              className="group rounded-md border border-stone-200/80 bg-white p-6 transition-colors hover:border-[#0095A9]/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-400">
                    {d.revenueGroup}
                  </div>
                  <h3 className="mt-1 text-[15px] font-semibold text-stone-900">{d.dept}</h3>
                </div>
                {d.newKpi.length > 0 && (
                  <span className="flex items-center gap-1 rounded-sm bg-[#e6f4f6] px-1.5 py-0.5 text-[10px] font-semibold text-[#0095A9]">
                    <Sparkles className="h-3 w-3" />
                    NEW
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                    기존 KPI
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {d.existingKpi.length > 0 ? (
                      d.existingKpi.map((k, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12px] text-stone-700">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                          {k}
                        </li>
                      ))
                    ) : (
                      <li className="text-[12px] text-stone-400">—</li>
                    )}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#0095A9]">
                    신규 KPI
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {d.newKpi.length > 0 ? (
                      d.newKpi.map((k, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12px] font-medium text-[#007a8c]">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#0095A9]" />
                          {k}
                        </li>
                      ))
                    ) : (
                      <li className="text-[12px] text-stone-400">—</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-4 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-500">
                {d.rationale}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===================================================================
           DATA LINEAGE
         =================================================================== */}
      <section className="mt-12 border-t border-stone-200 pt-5">
        <h3 className="section-label mb-3">DATA LINEAGE</h3>
        <div className="space-y-2">
          <SourceCaption>총 회원 9,930명 = 회원DB 25년말 시트 row count</SourceCaption>
          <SourceCaption>회원 누적 납입액 (스냅샷) = 매출합계 컬럼 sum (가입~25년말 누적). FY25 회사 손익 인식 매출 4,624M과 정의 다름.</SourceCaption>
          <SourceCaption>납부만기 도달율 = 회원상태=YF count(4,433) / total(9,930)</SourceCaption>
          <SourceCaption>채널 LTV = 채널별 매출합계 sum / 채널별 회원수</SourceCaption>
          <SourceCaption>설계사 1,227명 / Top10 21.7% / Gini 0.69 = 모집설계사 groupby + 표준 Gini</SourceCaption>
          <SourceCaption>가입 코호트 만기율 = 가입연도별 회원상태=YF count / 해당 연도 가입수</SourceCaption>
          <SourceCaption>부서별 KPI 매핑 = {deptKpi.meta.source}</SourceCaption>
        </div>
      </section>
    </AppLayout>
  );
}
