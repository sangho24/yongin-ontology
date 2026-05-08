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
import { AppLayout, SubNav } from "@/components/AppLayout";
import { Card, StatCard, WowCard, InsightBox, SourceCaption } from "@/components/Card";
import { NumberCell } from "@/components/NumberCell";
import lifeKpi from "@/data/life_kpi.json";
import deptKpi from "@/data/dept_kpi.json";
import { autoUnit, formatPct } from "@/lib/format";
import type { NumberLineage } from "@/types";

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
    notes: "FY25 행사매출 ≠ lifecycle 매출. 본 수치는 가입~25년말 누적 매출합계.",
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

  const lineagePotentialFromMature: NumberLineage = {
    source: "라이프_회원DB_backdata.xlsx / 매출합계 (회원상태=YF)",
    formula: "Σ 매출합계 (회원상태=YF만 필터)",
    verified: true,
    unit: "원",
    asOf: "2025-12-31",
    steps: [
      { label: "회원상태=YF 필터", rowCount: lifeKpi.matureAnalysis.totalMatureMembers },
      { label: "매출합계 sum", amount: lifeKpi.wowMetrics.potentialFromMature },
    ],
    notes: "영업외수익으로 인식되지만 경제적으로는 매출의 일부 — 조정후이익 view 시 합산 검토.",
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
          { id: "department", label: "부서별 KPI" },
        ]}
      />

      {/* ===================================================================
           HERO — 핵심 KPI 3개 (NumberCell · lineage 부착)
         =================================================================== */}
      <section id="overview" className="mt-10">
        <div className="mb-4 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">핵심 KPI</h2>
          <span className="text-[11px] tracking-wider text-stone-400">
            CLICK 박스 → lineage 패널
          </span>
        </div>
        <div className="grid gap-8 rounded-md border border-stone-200/80 bg-white p-8 md:grid-cols-3">
          <NumberCell
            label="lifecycle 매출"
            value={lifeKpi.wowMetrics.totalLifecycleRevenue}
            unit="원"
            size="lg"
            emphasis
            lineage={lineageLifecycleRevenue}
            sub="9,930명 회원의 가입~25년말 누적 매출합계"
          />
          <NumberCell
            label="만기해약율"
            value={lifeKpi.matureAnalysis.matureRate * 100}
            unit="%"
            size="lg"
            lineage={lineageMatureRate}
            formatter={(v) => v.toFixed(1)}
            sub={`${lifeKpi.matureAnalysis.totalMatureMembers.toLocaleString()}명 / 9,930명 — 회비정산차익으로 흘러감`}
          />
          <NumberCell
            label="회비정산차익 잠재"
            value={lifeKpi.wowMetrics.potentialFromMature}
            unit="원"
            size="lg"
            lineage={lineagePotentialFromMature}
            sub="YF 회원 매출합계 — 영업외수익으로 인식되나 경제적 매출"
          />
        </div>
      </section>

      {/* ===================================================================
           기존 StatCard 4개 — 보존 (gap-3 → gap-6)
         =================================================================== */}
      <section className="mt-10 grid gap-6 sm:grid-cols-4">
        <StatCard label="총 회원" value={lifeKpi.meta.totalMembers.toLocaleString() + "명"} />
        <StatCard label="lifecycle 매출" value={autoUnit(lifeKpi.wowMetrics.totalLifecycleRevenue)} />
        <StatCard
          label="만기해약율"
          value={formatPct(lifeKpi.matureAnalysis.matureRate)}
          sub={`${lifeKpi.matureAnalysis.totalMatureMembers.toLocaleString()}명`}
          trend="up"
          trendValue="회비정산차익 인식"
        />
        <StatCard
          label="설계사 수"
          value={lifeKpi.salesAgentDistribution.totalAgents.toLocaleString() + "명"}
          sub={`Top10이 매출 ${formatPct(lifeKpi.salesAgentDistribution.top10ShareOfRevenue)}`}
        />
      </section>

      {/* ===================================================================
           채널 LTV · 회원상태 (mt-6 → mt-12, gap-4 → gap-8)
         =================================================================== */}
      <section id="channel" className="mt-12 grid gap-8 lg:grid-cols-2">
        <Card title="채널별 회원당 LTV" subtitle="평균 매출(원) 기준 · 호버하여 상세">
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
              <Tooltip formatter={(v: number) => v.toLocaleString() + "원"} cursor={{ fill: "rgba(14,165,233,0.05)" }} />
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

        <Card title="회원상태 분포" subtitle="납부만기/정상/연체/오류 — 만기 비중에 주목">
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
              <Tooltip formatter={(v: number) => v.toLocaleString() + "명"} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* ===================================================================
           가입연도별 코호트
         =================================================================== */}
      <section className="mt-12">
        <Card title="가입연도별 코호트" subtitle="회원수·만기율·평균 LTV — 2022년 이후 만기율 급등">
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
           설계사 · 채널별 만기율
         =================================================================== */}
      <section id="agents" className="mt-12 grid gap-8 lg:grid-cols-2">
        <Card title="상위 10 설계사" subtitle={`전체 ${lifeKpi.salesAgentDistribution.totalAgents}명 · Top10이 매출 ${formatPct(lifeKpi.salesAgentDistribution.top10ShareOfRevenue)} · Gini ${lifeKpi.salesAgentDistribution.giniCoefficient}`}>
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

        <Card title="채널별 만기해약율" subtitle="만기율 ↑ = 회비정산차익 비중 ↑ = 영업외수익 비중 ↑">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={lifeKpi.matureAnalysis.byChannel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} cursor={{ fill: "rgba(245,158,11,0.05)" }} />
              <Bar dataKey="matureRate" fill="#b45309" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* ===================================================================
           WowCard · InsightBox
         =================================================================== */}
      <section className="mt-12">
        <WowCard
          variant="mint"
          label="회계 ≠ 경제"
          value={autoUnit(lifeKpi.wowMetrics.potentialFromMature)}
          sub={`만기해약 ${lifeKpi.matureAnalysis.totalMatureMembers.toLocaleString()}명의 회비정산차익은 영업외수익이지만 경제적으로는 매출의 일부. 영업이익+회비정산차익 view 시 손익 재해석.`}
          footnote="회원DB 회원상태=YF의 매출합계 sum"
        />
      </section>

      <section className="mt-6">
        <InsightBox type="warn" title="만기해약 비중과 영업손실의 관계">
          매출은 23~25년 21→36→46억으로 성장 중이나, 최근 가입 회원의 만기율(2022년 72%, 2023년 96%)이 높아 회비정산차익(영업외)으로 흘러감. 영업이익 view에선 손실 trend가 보이나, 조정후이익(영업이익+회비정산차익) view에서 재평가 필요.
        </InsightBox>
      </section>

      {/* ===================================================================
           NEW — 부서별 KPI 매핑 (상조 VC 4개 부서)
         =================================================================== */}
      <section id="department" className="mt-12">
        <div className="mb-4 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">부서별 KPI 매핑 — 상조 VC</h2>
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
          <SourceCaption>lifecycle 매출 = 매출합계 컬럼 sum (가입~25년말 누적, ≠ FY25 행사매출)</SourceCaption>
          <SourceCaption>만기해약율 = 회원상태=YF count(4,433) / total(9,930)</SourceCaption>
          <SourceCaption>채널 LTV = 채널별 매출합계 sum / 채널별 회원수</SourceCaption>
          <SourceCaption>설계사 1,227명 / Top10 21.7% / Gini 0.69 = 모집설계사 groupby + 표준 Gini</SourceCaption>
          <SourceCaption>가입 코호트 만기율 = 가입연도별 회원상태=YF count / 해당 연도 가입수</SourceCaption>
          <SourceCaption>부서별 KPI 매핑 = {deptKpi.meta.source}</SourceCaption>
        </div>
      </section>
    </AppLayout>
  );
}
