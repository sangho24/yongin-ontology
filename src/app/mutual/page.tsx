"use client";

import { useState } from "react";
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
import { AppLayout } from "@/components/AppLayout";
import { Card, StatCard, WowCard, InsightBox, SourceCaption } from "@/components/Card";
import lifeKpi from "@/data/life_kpi.json";
import { autoUnit, formatPct } from "@/lib/format";

// 용인공원 mint 톤 + 절제된 강조
const STATUS_COLOR: Record<string, string> = {
  "납부만기(YF)": "#b45309", // amber-800 (회비정산차익으로 흘러감 → 주의)
  "정상(YY)": "#0095A9",     // mint deep (정상)
  "3회연체(YB)": "#9a3412",   // brick (위험)
  "오류(YE)": "#a8a29e",      // stone-400
};
const ACCENT = "#0095A9";       // mint deep
const ACCENT_HOVER = "#65B3B1"; // mint mid

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
      <section className="grid gap-3 sm:grid-cols-4">
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

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
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
                  <Cell key={entry.name} fill={STATUS_COLOR[entry.name] ?? COLORS[0]} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString() + "명"} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </section>

      <section className="mt-6">
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

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
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

      <section className="mt-6">
        <WowCard
          variant="mint"
          label="회계 ≠ 경제"
          value={autoUnit(lifeKpi.wowMetrics.potentialFromMature)}
          sub={`만기해약 ${lifeKpi.matureAnalysis.totalMatureMembers.toLocaleString()}명의 회비정산차익은 영업외수익이지만 경제적으로는 매출의 일부. 영업이익+회비정산차익 view 시 손익 재해석.`}
          footnote="회원DB 회원상태=YF의 매출합계 sum"
        />
      </section>

      <section className="mt-4">
        <InsightBox type="warn" title="만기해약 비중과 영업손실의 관계">
          매출은 23~25년 21→36→46억으로 성장 중이나, 최근 가입 회원의 만기율(2022년 72%, 2023년 96%)이 높아 회비정산차익(영업외)으로 흘러감. 영업이익 view에선 손실 trend가 보이나, 조정후이익(영업이익+회비정산차익) view에서 재평가 필요.
        </InsightBox>
      </section>

      <section className="mt-8 border-t border-stone-200 pt-5">
        <h3 className="section-label mb-3">DATA LINEAGE</h3>
        <div className="space-y-2">
          <SourceCaption>총 회원 9,930명 = 회원DB 25년말 시트 row count</SourceCaption>
          <SourceCaption>lifecycle 매출 = 매출합계 컬럼 sum (가입~25년말 누적, ≠ FY25 행사매출)</SourceCaption>
          <SourceCaption>만기해약율 = 회원상태=YF count(4,433) / total(9,930)</SourceCaption>
          <SourceCaption>채널 LTV = 채널별 매출합계 sum / 채널별 회원수</SourceCaption>
          <SourceCaption>설계사 1,227명 / Top10 21.7% / Gini 0.69 = 모집설계사 groupby + 표준 Gini</SourceCaption>
          <SourceCaption>가입 코호트 만기율 = 가입연도별 회원상태=YF count / 해당 연도 가입수</SourceCaption>
        </div>
      </section>
    </AppLayout>
  );
}
