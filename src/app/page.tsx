"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import { Gauge, NoFigures, Segmented } from "@/components/exec/Bits";
import { ReportSection, ReportCover, ReportActions, type SectionDef } from "@/components/exec/Report";
import { CashBlockCard, BalanceTable, buildCashBlocks } from "@/components/exec/CashBlocks";
import { ProfitStructureBars, TargetBars } from "@/components/exec/ScreenCharts";
import { useReportSections, usePinnedKpis } from "@/store/prefs";
import { downloadCsv, stamp } from "@/lib/export";
import { allKpis, kpiNumber } from "@/lib/exec";
import { screens, num, pct } from "@/lib/screens";
import {
  MONTHS,
  ACTUAL_IDX,
  PERIOD_ITEMS,
  DEFAULT_PERIOD,
  parsePeriod,
  periodId,
  periodLabel,
  hasFigures,
  isCum,
  monthIndex,
  type Period,
} from "@/lib/period";

// =============================================================================
// Overview — 그룹 전체 한 장
//
// 아래 화면(자금현황 · 법인별 손익 · 부문별 손익 · 매출실적 · 원가 및 손익 ·
// KPI · 일일마감)의 요약을 층위 순서대로 모두 싣는다. 상단 기간을 바꾸면 전
// 섹션이 함께 움직이고, 해당 기간 자료가 없는 섹션은 비워 둔다.
// =============================================================================

const CA = screens.cash;
const P = screens.pl;
const S = screens.sales;
const C = screens.cost;
const D = screens.daily;

const SECTIONS: SectionDef[] = [
  { id: "summary", label: "요약 지표", note: "그룹 수입 · 지출 · 손익 · 손익율" },
  { id: "cash", label: "수지현황", note: "당월 목표 · 실행 · 차월 목표" },
  { id: "trend", label: "자금 월별 추이", note: "그룹 수입 · 지출 · 손익" },
  { id: "flow", label: "법인별 자금 흐름", note: "이월 → 수입 → 지출 → 잔액" },
  { id: "pl", label: "법인별 손익", note: "매출 · 판관비 · 이익" },
  { id: "segment", label: "부문별 손익", note: "분양 · 관리비 · 상조" },
  { id: "sales", label: "매출실적", note: "법인별 목표 대비" },
  { id: "cost", label: "원가 및 손익", note: "조직별 손익율 · 원가율" },
  { id: "kpi", label: "KPI", note: "조직별 주요 지표" },
  { id: "daily", label: "일일마감", note: "장지 · 상조 월 누적" },
];

const COMPANIES = ["용인공원", "라이프", "YPL"] as const;
const SEGS = ["분양손익", "관리비손익", "상조손익"] as const;

const NO_MONTHLY = "선택한 기간의 자료를 받지 못했습니다. 26.07 또는 누계를 선택하면 표시됩니다.";

/** 부문별 손익에서 한 칸 */
const segVal = (label: string, seg: string) =>
  P.segment.find((r) => r.label === label)?.segments[seg]?.actual ?? null;

/** 법인별 손익에서 한 칸 */
const plVal = (label: string, c: string) =>
  P.company.find((r) => r.label === label)?.companies[c]?.actual ?? 0;

/** 섹션에서 해당 화면으로 내려가는 링크 */
function MoreLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="no-print inline-flex items-center gap-1 text-[12px] font-medium text-[var(--teal-deep)] hover:underline"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
    </Link>
  );
}

export default function OverviewPage() {
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const { isOn } = useReportSections("overview", SECTIONS.map((s) => s.id));
  const { pinned } = usePinnedKpis();

  const cum = isCum(period);
  const mIdx = monthIndex(period);
  const figures = hasFigures(period);
  const label = periodLabel(period);

  // ---------------------------------------------------------------------------
  // 자금 — 선택 기간의 수지
  // ---------------------------------------------------------------------------
  const blocks = useMemo(() => buildCashBlocks(period), [period]);

  const totals = useMemo(() => {
    const sum = (kind: "actual" | "target", key: "income" | "expense") => {
      if (cum) {
        return CA.monthly.reduce(
          (a, m) => a + COMPANIES.reduce((b, c) => b + (m[kind]?.[c]?.[key] ?? 0), 0),
          0,
        );
      }
      const row = CA.monthly[mIdx];
      return COMPANIES.reduce((a, c) => a + (row?.[kind]?.[c]?.[key] ?? 0), 0);
    };
    const inc = sum("actual", "income");
    const exp = sum("actual", "expense");
    const tInc = sum("target", "income");
    const tExp = sum("target", "expense");
    return { inc, exp, profit: inc - exp, tInc, tExp, tProfit: tInc - tExp };
  }, [cum, mIdx]);

  const margin = totals.inc ? Math.round((totals.profit / totals.inc) * 100) : 0;
  const tMargin = totals.tInc ? Math.round((totals.tProfit / totals.tInc) * 100) : 0;
  const achieve = totals.tInc ? Math.round((totals.inc / totals.tInc) * 100) : 0;

  const trend = useMemo(
    () =>
      CA.monthly.map((m) => {
        const ai = COMPANIES.reduce((a, c) => a + (m.actual[c]?.income ?? 0), 0);
        const ao = COMPANIES.reduce((a, c) => a + (m.actual[c]?.expense ?? 0), 0);
        const ti = COMPANIES.reduce((a, c) => a + (m.target[c]?.income ?? 0), 0);
        return {
          month: m.month,
          수입: ai || null,
          지출: ao || null,
          손익: ai ? ai - ao : null,
          목표수입: ti,
        };
      }),
    [],
  );

  // ---------------------------------------------------------------------------
  // 손익 · 매출 · 원가 — 26.07(월)과 누계 두 벌만 있다
  // ---------------------------------------------------------------------------
  const plRows = useMemo(
    () =>
      (["용인공원", "YPL", "라이프"] as const).map((c) => ({
        name: c,
        revenue: plVal("매출", c),
        cost: plVal("판관비", c) + plVal("현장원가", c),
        profit: plVal("이익", c),
      })),
    [],
  );

  const salesBars = useMemo(
    () =>
      S.totals
        .filter((t) => t.company !== "용인공원그룹계")
        .map((t) => ({
          label: t.company,
          target: cum ? t.t_c : t.t_m,
          actual: cum ? t.a_c : t.a_m,
        })),
    [cum],
  );
  const salesGrand = S.totals.find((t) => t.company === "용인공원그룹계");

  const costRatios = useMemo(
    () => [...C.yongin.groups, ...C.life.groups].map((g) => ({ org: g.org, ratios: g.ratios })),
    [],
  );

  // ---------------------------------------------------------------------------
  // 일일마감 — 일 단위 자료라 기간 필터와 무관하게 최신 마감일을 보여준다
  // ---------------------------------------------------------------------------
  const dailyYongin = useMemo(() => {
    const out: { label: string; sub?: string; target: number; actual: number }[] = [];
    let bucket: string[] = [];
    // 앞 7행이 일일보고의 요약 구간(분양 소계 · 관리 소계 · 합계)이고 그 뒤는 채널 상세다
    D.yongin.rows.slice(0, 7).forEach((r) => {
      if (!r.is_total) {
        bucket.push(r.group || r.detail);
        return;
      }
      out.push({
        label: r.group === "합계" ? "합계" : bucket.join(" · ") || "소계",
        sub: r.group === "합계" ? undefined : "소계",
        target: r.mtd_target ?? 0,
        actual: r.mtd_amt ?? 0,
      });
      bucket = [];
    });
    return out.filter((r) => r.target > 0);
  }, []);

  const dailyLife = useMemo(() => {
    const biz = D.life.sections.find((s) => s.title === "사업현황");
    return (biz?.rows ?? [])
      .filter((r) => r.mtd_target && r.mtd_target > 0)
      .map((r) => ({ label: r.detail, target: r.mtd_target ?? 0, actual: r.mtd ?? 0 }));
  }, []);

  const pinnedKpis = allKpis.filter(
    (k, i, arr) => pinned.includes(k.lineage) && arr.findIndex((x) => x.lineage === k.lineage) === i,
  );

  /** 고정한 지표가 있으면 그것을, 없으면 팀별 대표 지표를 보여준다 */
  const overviewKpis = useMemo(() => {
    if (pinnedKpis.length > 0) return pinnedKpis.slice(0, 8);
    const seenTeam = new Set<string>();
    return allKpis
      .filter((k) => {
        if (seenTeam.has(k.team)) return false;
        seenTeam.add(k.team);
        return true;
      })
      .slice(0, 8);
  }, [pinnedKpis]);

  const handleCsv = () => {
    const rows: (string | number | null)[][] = [
      [`용인공원그룹 Overview · ${label}`],
      [],
    ];

    // 자금 — 선택 기간 수지
    blocks.forEach((b) => {
      rows.push([b.title]);
      rows.push(["구분", "수입", "지출", "손익", "손익율(%)"]);
      b.rows.forEach((r) => rows.push([r.company, r.income, r.expense, r.profit, r.margin]));
      b.alt.forEach((r) =>
        rows.push([`${r.company} (수정 전망)`, r.income, r.expense, r.profit, r.margin]),
      );
      rows.push([]);
    });

    rows.push(["월별 추이 (그룹계)"]);
    rows.push(["월", "실행 수입", "실행 지출", "실행 손익", "목표 수입", "구분"]);
    trend.forEach((t, i) =>
      rows.push([t.month, t.수입, t.지출, t.손익, t.목표수입, CA.monthly[i].mock ? "예시" : "실측"]),
    );
    rows.push([]);

    rows.push(["법인별 자금 흐름"]);
    rows.push(["법인", "전월 이월잔액", "수입(총액)", "지출(총액)", "당월 잔액"]);
    CA.balance.forEach((r) => rows.push([r.company, r.opening, r.income, r.expense, r.closing]));
    rows.push([]);

    // 손익 — 법인별 · 부문별
    rows.push(["법인별 손익 (발생 기준)"]);
    rows.push(["법인", "매출", "판관비", "이익", "이익률(%)"]);
    plRows.forEach((r) =>
      rows.push([
        r.name,
        r.revenue,
        r.cost,
        r.profit,
        r.revenue ? Number(((r.profit / r.revenue) * 100).toFixed(1)) : null,
      ]),
    );
    rows.push([]);

    rows.push(["부문별 손익"]);
    rows.push(["부문", "매출액", "판관비", "이익"]);
    [...SEGS, "그룹계"].forEach((s) =>
      rows.push([s, segVal("매출액", s), segVal("판관비", s), segVal("이익", s)]),
    );
    rows.push([]);

    // 매출실적
    rows.push([`매출실적 (${label})`]);
    rows.push(["법인", "목표", "실적", "달성률(%)"]);
    S.totals.forEach((t) => {
      const tt = cum ? t.t_c : t.t_m;
      const aa = cum ? t.a_c : t.a_m;
      rows.push([t.company, tt, aa, tt ? Number(((aa / tt) * 100).toFixed(1)) : null]);
    });
    rows.push([]);

    // 원가 및 손익
    rows.push(["원가 및 손익 — 조직별 비율(%)"]);
    rows.push(["조직", "구분", "월 목표", "월 실적", "누계 목표", "누계 실적", "26년 목표"]);
    costRatios.forEach((g) =>
      g.ratios.forEach((r) => rows.push([g.org, r.label, r.t_m, r.a_m, r.t_c, r.a_c, r.goal])),
    );
    rows.push([]);

    // KPI
    rows.push(["KPI"]);
    rows.push(["법인", "팀", "지표", "값", "단위"]);
    overviewKpis.forEach((k) => rows.push([k.company, k.team, k.label, k.value, k.unit]));
    rows.push([]);

    // 일일마감
    rows.push([`일일마감 — 장지 (${D.yongin.base})`]);
    rows.push(["구분", "월 누적 실적", "월 목표", "달성률(%)"]);
    dailyYongin.forEach((r) =>
      rows.push([
        r.label,
        r.actual,
        r.target,
        r.target ? Number(((r.actual / r.target) * 100).toFixed(1)) : null,
      ]),
    );
    rows.push([]);
    rows.push([`일일마감 — 상조 (${D.life.base})`]);
    rows.push(["구분", "월 누적 실적", "월 목표", "달성률(%)"]);
    dailyLife.forEach((r) =>
      rows.push([
        r.label,
        r.actual,
        r.target,
        r.target ? Number(((r.actual / r.target) * 100).toFixed(1)) : null,
      ]),
    );

    downloadCsv(`용인공원그룹_Overview_${stamp()}`, rows);
  };

  return (
    <AppLayout
      pageTitle="Overview"
      pageSubtitle="그룹 3사 전체를 한 장에 담는다. 자금은 현금, 손익은 발생 기준이라 모수가 다르다."
      period={label}
    >
      <ReportCover
        title="용인공원그룹 경영 Overview"
        period={label}
        scope="용인공원 · 용인공원라이프 · 와이피엘"
      />

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          items={PERIOD_ITEMS}
          value={periodId(period)}
          onChange={(v) => setPeriod(parsePeriod(v))}
        />
        <ReportActions page="overview" sections={SECTIONS} onCsv={handleCsv} />
      </div>

      {/* 요약 지표 */}
      <ReportSection
        id="summary"
        title="요약 지표"
        meta={`${label} · 현금 · 백만원`}
        enabled={isOn("summary")}
        first
      >
        <div className="grid gap-4 md:grid-cols-4 print-cols-4">
          <WowCard
            label="그룹 수지손익"
            value={num(totals.profit)}
            unit="백만원"
            sub={`수입 ${num(totals.inc)} − 지출 ${num(totals.exp)} 백만원`}
            footnote={`손익율 ${margin}% · 목표 ${num(totals.tProfit)} 대비`}
          />
          <StatCard
            label="그룹 수입"
            value={num(totals.inc)}
            unit="백만원"
            sub={`목표 ${num(totals.tInc)} 백만원 대비 ${achieve}%`}
          />
          <StatCard
            label="그룹 지출"
            value={num(totals.exp)}
            unit="백만원"
            sub={`목표 ${num(totals.tExp)} 백만원 대비 ${
              totals.tExp ? Math.round((totals.exp / totals.tExp) * 100) : 0
            }%`}
          />
          <StatCard
            label="그룹 손익율"
            value={`${margin}%`}
            sub={`목표 ${tMargin}% 대비 ${margin - tMargin >= 0 ? "+" : ""}${margin - tMargin}%p`}
          />
        </div>
      </ReportSection>

      {/* 수지현황 */}
      <ReportSection
        id="cash"
        title="수지현황"
        meta={cum ? "누계 목표 · 실행" : "당월 목표 · 실행 · 차월 목표"}
        enabled={isOn("cash")}
        right={<MoreLink href="/cash" label="자금현황" />}
      >
        {blocks.length > 0 ? (
          <div
            className={`grid grid-cols-1 gap-5 ${
              blocks.length >= 3 ? "lg:grid-cols-3 print-cols-3" : "lg:grid-cols-2 print-cols-2"
            }`}
          >
            {blocks.map((b) => (
              <CashBlockCard key={b.id} block={b} />
            ))}
          </div>
        ) : (
          <NoFigures note="선택한 기간의 수지 자료가 없습니다." />
        )}
      </ReportSection>

      {/* 월별 추이 */}
      <ReportSection
        id="trend"
        title="월별 추이"
        meta="그룹계 · 현금 · 백만원"
        enabled={isOn("trend")}
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
              <span className="h-0 w-4" style={{ borderTop: "2px dashed #d6d3c9" }} /> 목표 수입
            </span>
          </span>
        }
      >
        <Card>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                {/* 자금 자료를 받지 못한 구간 */}
                <ReferenceArea
                  yAxisId="amount"
                  x1={MONTHS[0]}
                  x2={MONTHS[ACTUAL_IDX - 1]}
                  fill="#78716c"
                  fillOpacity={0.05}
                  label={{
                    value: "예시 구간",
                    position: "insideTopLeft",
                    fontSize: 9.5,
                    fill: "#a8a29e",
                  }}
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
                    <Cell key={d.month} fill={!cum && mIdx === i ? "#0095A9" : "#b3dde0"} />
                  ))}
                </Bar>
                <Bar yAxisId="amount" dataKey="지출" radius={[3, 3, 0, 0]} maxBarSize={48}>
                  {trend.map((d, i) => (
                    <Cell key={d.month} fill={!cum && mIdx === i ? "#78716c" : "#e7e5dc"} />
                  ))}
                </Bar>
                <Line
                  yAxisId="amount"
                  type="monotone"
                  dataKey="목표수입"
                  name="목표 수입"
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
                  connectNulls
                />
                <ReferenceLine yAxisId="profit" y={0} stroke="#d6d3c9" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </ReportSection>

      {/* 법인별 자금 흐름 */}
      <ReportSection
        id="flow"
        title="법인별 자금 흐름"
        meta="이월잔액 → 수입 → 지출 → 당월잔액"
        enabled={isOn("flow")}
        right={<MoreLink href="/cash" label="자금현황" />}
      >
        <Card>
          <BalanceTable />
        </Card>
      </ReportSection>

      {/* 법인별 손익 */}
      <ReportSection
        id="pl"
        title="법인별 손익"
        meta={`${label} · 발생 · 백만원`}
        enabled={isOn("pl")}
        right={<MoreLink href="/pl" label="법인별 손익" />}
      >
        {figures ? (
          <Card title="매출 구성" subtitle="막대 길이는 매출 규모, 내부는 판관비와 이익">
            <ProfitStructureBars rows={plRows} />
          </Card>
        ) : (
          <NoFigures note={NO_MONTHLY} />
        )}
      </ReportSection>

      {/* 부문별 손익 */}
      <ReportSection
        id="segment"
        title="부문별 손익"
        meta={`${label} · 분양 · 관리비 · 상조`}
        enabled={isOn("segment")}
        right={<MoreLink href="/segment" label="부문별 손익" />}
      >
        {figures ? (
          <div className="grid gap-4 md:grid-cols-4 print-cols-4">
            {[...SEGS, "그룹계"].map((s) => {
              const rev = segVal("매출액", s) ?? 0;
              const prof = segVal("이익", s) ?? 0;
              return (
                <StatCard
                  key={s}
                  label={s}
                  value={num(prof)}
                  unit="백만원"
                  sub={`매출 ${num(rev)} · 이익률 ${rev ? pct((prof / rev) * 100, 0) : "-"}`}
                />
              );
            })}
          </div>
        ) : (
          <NoFigures note={NO_MONTHLY} />
        )}
      </ReportSection>

      {/* 매출실적 */}
      <ReportSection
        id="sales"
        title="매출실적"
        meta={`${label} · 법인별 목표 대비`}
        enabled={isOn("sales")}
        right={<MoreLink href="/sales" label="매출실적" />}
      >
        {figures ? (
          <Card
            title="법인별 달성률"
            subtitle={
              salesGrand
                ? `그룹계 실적 ${num(cum ? salesGrand.a_c : salesGrand.a_m)} / 목표 ${num(
                    cum ? salesGrand.t_c : salesGrand.t_m,
                  )} 백만원`
                : undefined
            }
          >
            <TargetBars rows={salesBars} />
          </Card>
        ) : (
          <NoFigures note={NO_MONTHLY} />
        )}
      </ReportSection>

      {/* 원가 및 손익 */}
      <ReportSection
        id="cost"
        title="원가 및 손익"
        meta={`${label} · 조직별 손익율 · 원가율`}
        enabled={isOn("cost")}
        right={<MoreLink href="/cost" label="원가 및 손익" />}
      >
        {figures ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 print-cols-3">
            {costRatios.map((g) => (
              <Card key={g.org} title={g.org}>
                <div className="space-y-4 pt-1">
                  {g.ratios.map((r) => {
                    const v = cum ? r.a_c : r.a_m;
                    return (
                      <div key={r.label}>
                        <div className="mb-1.5 flex items-baseline justify-between">
                          <span className="text-[12px] font-medium text-stone-600">{r.label}</span>
                          <span className="tnum text-[11px] text-stone-400">
                            목표 {pct(cum ? r.t_c : r.t_m, 0)}
                          </span>
                        </div>
                        {r.goal !== null && v !== null ? (
                          <Gauge
                            value={v}
                            target={r.goal}
                            lowerIsBetter={r.label.includes("원가율")}
                          />
                        ) : (
                          <div className="flex items-baseline justify-between text-[11px] text-stone-400">
                            <span className="tnum text-[13px] font-semibold text-stone-800">
                              {pct(v, Math.abs(v ?? 0) < 10 ? 1 : 0)}
                            </span>
                            <span>목표 미설정</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <NoFigures note={NO_MONTHLY} />
        )}
      </ReportSection>

      {/* KPI */}
      <ReportSection
        id="kpi"
        title="KPI"
        meta={pinnedKpis.length > 0 ? "KPI 화면에서 고정한 지표" : "조직별 주요 지표"}
        enabled={isOn("kpi")}
        right={<MoreLink href="/kpi" label="KPI" />}
      >
        <div className="grid gap-4 md:grid-cols-4 print-cols-4">
          {overviewKpis.map((k) => (
            <StatCard
              key={k.lineage}
              label={k.label}
              value={kpiNumber(k)}
              unit={k.unit === "%" ? "%" : undefined}
              sub={k.team}
            />
          ))}
        </div>
      </ReportSection>

      {/* 일일마감 */}
      <ReportSection
        id="daily"
        title="일일마감"
        meta={`장지 ${D.yongin.base} · 상조 ${D.life.base} · 월 누적 목표 대비`}
        enabled={isOn("daily")}
        right={<MoreLink href="/daily" label="일일마감" />}
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 print-cols-2">
          <Card title="장지 (용인공원)" subtitle="월 누적 실적 · 목표">
            <TargetBars rows={dailyYongin} />
          </Card>
          <Card title="상조 (온유상조)" subtitle="사업현황 · 월 누적">
            <TargetBars rows={dailyLife} />
          </Card>
        </div>
      </ReportSection>
    </AppLayout>
  );
}
