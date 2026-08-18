"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Pin } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { Card, StatCard, WowCard } from "@/components/Card";
import { PeriodFilter, Delta, InfoTip, TipRow } from "@/components/exec/Bits";
import { ReportSection, ReportCover, ReportActions, type SectionDef } from "@/components/exec/Report";
import { useReportSections, usePinnedKpis } from "@/store/prefs";
import { downloadCsv, stamp } from "@/lib/export";
import {
  plData,
  MONTHS,
  LATEST,
  scenario,
  cashValue,
  periodLabel,
  allKpis,
  mn,
  type Period,
  type CashScenario,
} from "@/lib/exec";

// =============================================================================
// Overview — 경영회의 보고 slide 4(매출 및 집행예산 Cash flow) 중심 그룹 현황
// =============================================================================

const SECTIONS: SectionDef[] = [
  { id: "summary", label: "요약 지표", note: "그룹 수입 · 지출 · 손익 · 손익율" },
  { id: "cash", label: "수지현황 표", note: "장표 원형 (예상 · 실적)" },
  { id: "trend", label: "월별 추이", note: "그룹 수입 · 지출 · 손익" },
  { id: "kpi", label: "고정 KPI", note: "KPI 화면에서 고정한 지표" },
];

export default function OverviewPage() {
  const [period, setPeriod] = useState<Period>(LATEST);
  const { isOn } = useReportSections("overview", SECTIONS.map((s) => s.id));
  const { pinned } = usePinnedKpis();

  const actual = scenario("actual");
  const forecast = scenario("forecast");
  const groupActual = actual.rows.find((r) => r.total)!;
  const groupForecast = forecast.rows.find((r) => r.total)!;

  const inc = cashValue(groupActual, "income", period);
  const exp = cashValue(groupActual, "expense", period);
  const profit = inc - exp;
  const margin = inc ? Math.round((profit / inc) * 100) : 0;
  const fcInc = cashValue(groupForecast, "income", period);
  const fcExp = cashValue(groupForecast, "expense", period);
  const fcProfit = fcInc - fcExp;
  const fcMargin = fcInc ? Math.round((fcProfit / fcInc) * 100) : 0;
  const achieveRate = fcInc ? Math.round((inc / fcInc) * 100) : 0;

  const trend = MONTHS.map((m, i) => ({
    month: m,
    수입: groupActual.monthly.income[i],
    지출: groupActual.monthly.expense[i],
    손익: groupActual.monthly.profit[i],
    예상수입: groupForecast.monthly.income[i],
  }));

  const pinnedKpis = allKpis.filter(
    (k, i, arr) => pinned.includes(k.lineage) && arr.findIndex((x) => x.lineage === k.lineage) === i
  );

  const handleCsv = () => {
    const rows: (string | number)[][] = [];
    rows.push(["용인공원 그룹 수지현황", `기준 ${periodLabel(period)}`, "단위 백만원, %"]);
    rows.push([plData.cash.basis]);
    rows.push([]);
    (["forecast", "actual"] as const).forEach((sid) => {
      const sc = scenario(sid);
      rows.push([`${sc.label} (${sc.asof})`]);
      rows.push(["구분", "수입", "지출", "손익", "손익율", ...MONTHS.map((m) => `${m} 수입`)]);
      sc.rows.forEach((r) =>
        rows.push([
          r.entity,
          cashValue(r, "income", period),
          cashValue(r, "expense", period),
          cashValue(r, "income", period) - cashValue(r, "expense", period),
          r.margin,
          ...r.monthly.income,
        ])
      );
      rows.push([]);
    });
    rows.push(["데이터 기준", plData.meta.monthly_basis]);
    downloadCsv(`용인공원그룹_수지현황_${stamp()}`, rows);
  };

  return (
    <AppLayout
      pageTitle="Overview"
      pageSubtitle="경영회의 보고 장표(slide 4)의 그룹 3사 수지현황. 현금 기준이라 조직별 손익(발생 기준)과 모수가 다르다."
    >
      <ReportCover
        title="매출 및 집행예산 Cash flow"
        period={periodLabel(period)}
        scope="용인공원 · 용인공원라이프 · 와이피엘"
      />

      <div className="no-print mb-6 flex flex-wrap items-center justify-end gap-3">
        <PeriodFilter value={period} onChange={setPeriod} />
        <ReportActions page="overview" sections={SECTIONS} onCsv={handleCsv} />
      </div>

      {/* 요약 지표 */}
      <ReportSection
        id="summary"
        title="요약 지표"
        meta={`${periodLabel(period)} · 현금 기준 · 백만원`}
        enabled={isOn("summary")}
        first
      >
        <div className="grid gap-4 md:grid-cols-4 print-cols-4">
          <WowCard
            label="그룹 수지손익"
            value={mn(profit)}
            unit="백만원"
            sub={`수입 ${mn(inc)} − 지출 ${mn(exp)} 백만원`}
            footnote={`손익율 ${margin}% · 현금 기준`}
          />
          <StatCard
            label="그룹 수입"
            value={mn(inc)}
            unit="백만원"
            sub={`예상 ${mn(fcInc)} 백만원 대비 ${achieveRate}%`}
          />
          <StatCard
            label="그룹 지출"
            value={mn(exp)}
            unit="백만원"
            sub={`예상 ${mn(fcExp)} 백만원 대비 ${fcExp ? Math.round((exp / fcExp) * 100) : 0}%`}
          />
          <StatCard
            label="그룹 손익율"
            value={`${margin}%`}
            sub={`예상 ${fcMargin}% 대비 ${margin - fcMargin >= 0 ? "+" : ""}${margin - fcMargin}%p`}
          />
        </div>
      </ReportSection>

      {/* 수지현황 표 — 장표 원형 */}
      <ReportSection
        id="cash"
        title="수지현황"
        meta={`${periodLabel(period)} · 단위 백만원, %`}
        enabled={isOn("cash")}
        info={
          <InfoTip title="기준" align="left">
            <TipRow label="현금 기준">
              입출금 기준 수지라 발생 기준인 손익 화면과 모수가 다르다. 26.04 용인공원 수입은 여기서
              5,231이고 손익 화면 기준으로는 5,033이다.
            </TipRow>
            <TipRow label="예상수지">
              월 마감 전 시점의 전망치. 실적 표와 나란히 두고 달성 수준을 본다.
            </TipRow>
            <TipRow label="법인 구분">
              여기서는 3사를 각각 표시한다. 손익 화면은 장표를 따라 용인공원과 와이피엘을 합산한다.
            </TipRow>
          </InfoTip>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2 print-cols-2">
          <CashTable scenario={forecast} period={period} />
          <CashTable scenario={actual} period={period} highlight />
        </div>
      </ReportSection>

      {/* 월별 추이 */}
      <ReportSection
        id="trend"
        title="월별 추이"
        meta="그룹계 · 현금 기준 · 백만원"
        enabled={isOn("trend")}
        info={
          <InfoTip title="읽는 법" align="left">
            <TipRow label="축">
              막대(수입·지출)는 왼쪽 축, 선(손익)은 오른쪽 축. 자릿수가 달라 축을 나눴다.
            </TipRow>
            <TipRow label="진한 막대">상단 필터에서 선택한 기간.</TipRow>
            <TipRow label="음영 구간">
              장표에 월별 수치가 없어 채운 추정 구간. 26.04만 장표 실측이고, 그 앞은 손익 총수입의
              월별 구성비로 배분했다.
            </TipRow>
          </InfoTip>
        }
        right={
          <span className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#0095A9]" /> 수입
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#a8a29e]" /> 지출
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-4" style={{ borderTop: "2px solid #b45309" }} /> 손익
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-4" style={{ borderTop: "2px dashed #d6d3c9" }} /> 예상 수입
            </span>
          </span>
        }
      >
        <Card>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trend}
                margin={{ top: 12, right: 4, bottom: 0, left: -8 }}
                barCategoryGap="28%"
                barGap={2}
              >
                <CartesianGrid strokeDasharray="2 4" stroke="#e7e5dc" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  axisLine={{ stroke: "#e7e5dc" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="amount"
                  tick={{ fontSize: 10, fill: "#a8a29e" }}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                  tickFormatter={(v) => Math.round(Number(v ?? 0)).toLocaleString("ko-KR")}
                />
                <YAxis
                  yAxisId="profit"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "#c8a27a" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => Math.round(Number(v ?? 0)).toLocaleString("ko-KR")}
                />
                {/* 장표 실측은 마지막 달뿐 — 앞 구간은 추정임을 음영으로 구분 */}
                <ReferenceArea
                  yAxisId="amount"
                  x1={MONTHS[0]}
                  x2={MONTHS[LATEST - 1]}
                  fill="#78716c"
                  fillOpacity={0.05}
                  label={{ value: "추정 구간", position: "insideTopLeft", fontSize: 9.5, fill: "#a8a29e" }}
                />
                <Tooltip
                  cursor={{ fill: "#f5f5f0" }}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 6,
                    border: "1px solid #e7e5dc",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                  formatter={(v, n) => [Math.round(Number(v ?? 0)).toLocaleString("ko-KR"), String(n)]}
                />
                <Bar yAxisId="amount" dataKey="수입" radius={[3, 3, 0, 0]} maxBarSize={48}>
                  {trend.map((d, i) => (
                    <Cell key={d.month} fill={period === "cum" || period === i ? "#0095A9" : "#b3dde0"} />
                  ))}
                </Bar>
                <Bar yAxisId="amount" dataKey="지출" radius={[3, 3, 0, 0]} maxBarSize={48}>
                  {trend.map((d, i) => (
                    <Cell key={d.month} fill={period === "cum" || period === i ? "#78716c" : "#e7e5dc"} />
                  ))}
                </Bar>
                <Line
                  yAxisId="amount"
                  type="monotone"
                  dataKey="예상수입"
                  name="예상 수입"
                  stroke="#d6d3c9"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                />
                <Line
                  yAxisId="profit"
                  type="monotone"
                  dataKey="손익"
                  stroke="#b45309"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "#b45309", strokeWidth: 0 }}
                />
                <ReferenceLine yAxisId="profit" y={0} stroke="#d6d3c9" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </ReportSection>

      {/* 고정 KPI */}
      <ReportSection
        id="kpi"
        title="고정 KPI"
        meta={periodLabel(period)}
        enabled={isOn("kpi") && pinnedKpis.length > 0}
        right={
          <Link
            href="/kpi"
            className="no-print inline-flex items-center gap-1 text-[12px] font-medium text-[#0095A9] hover:text-[#007a8c]"
          >
            KPI 화면에서 고정 <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        {pinnedKpis.length === 0 ? (
          <div className="no-print rounded-md border border-dashed border-stone-300 bg-white px-5 py-7 text-center">
            <Pin className="mx-auto h-4 w-4 text-stone-300" strokeWidth={1.75} />
            <p className="mt-2 text-[12.5px] text-stone-500">
              KPI 화면에서 지표를 고정하면 이 자리에 표시된다.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4 print-cols-4">
            {pinnedKpis.map((k) => {
              const idx = period === "cum" ? LATEST : period;
              const v = k.series[idx];
              const d = Number((v - k.series[Math.max(0, idx - 1)]).toFixed(2));
              return (
                <div
                  key={k.lineage}
                  className="print-card rounded-md border border-stone-200/80 bg-white p-4 transition-colors hover:border-stone-300"
                >
                  <div className="truncate text-[12px] font-medium text-stone-800">{k.label}</div>
                  <div className="mt-0.5 truncate text-[10px] text-stone-400">{k.team}</div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="headline text-[22px] leading-none text-stone-900 tnum">
                      {v.toLocaleString("ko-KR")}
                    </span>
                    <span className="text-[11px] text-stone-400">{k.unit}</span>
                    <span className="ml-auto text-[11px]">
                      <Delta value={d} invert={k.invert} suffix={k.unit === "%" ? "%p" : ""} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ReportSection>

      <p className="no-print mt-8 text-[11px] leading-relaxed text-stone-400">
        {plData.meta.monthly_basis}
      </p>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------

/** 장표 4p의 수지현황 표 */
function CashTable({
  scenario: sc,
  period,
  highlight = false,
}: {
  scenario: CashScenario;
  period: Period;
  highlight?: boolean;
}) {
  return (
    <div className="print-card rounded-md border border-stone-200/80 bg-white p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b-2 border-stone-800 pb-2">
        <h4 className="text-[13.5px] font-bold tracking-tight text-stone-900">
          <span className="mr-1.5 inline-block h-2 w-2 translate-y-[-1px] bg-stone-800" />
          {periodLabel(period)} {sc.label}
        </h4>
        <span className="text-[10.5px] text-stone-500">{sc.asof}</span>
      </div>
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-stone-300 text-[11px] text-stone-500">
            <th className="pb-2 text-left font-medium">구분</th>
            <th className="pb-2 text-right font-medium">수입</th>
            <th className="pb-2 text-right font-medium">지출</th>
            <th className="pb-2 text-right font-medium">손익</th>
            <th className="pb-2 text-right font-medium">손익율</th>
          </tr>
        </thead>
        <tbody>
          {sc.rows.map((r) => {
            const i = cashValue(r, "income", period);
            const e = cashValue(r, "expense", period);
            const p = i - e;
            return (
              <tr
                key={r.entity}
                className={
                  r.total
                    ? `${highlight ? "bg-[#e6f4f6]" : "bg-stone-100/70"} font-semibold`
                    : "border-b border-stone-100"
                }
              >
                <td className="px-1 py-2.5 text-stone-800">{r.entity}</td>
                <td className="px-1 py-2.5 text-right tnum text-stone-800">{mn(i)}</td>
                <td className="px-1 py-2.5 text-right tnum text-stone-600">{mn(e)}</td>
                <td className="px-1 py-2.5 text-right tnum font-medium text-[#9a3412]">{mn(p)}</td>
                <td className="px-1 py-2.5 text-right tnum text-stone-800">
                  {i ? Math.round((p / i) * 100) : 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
