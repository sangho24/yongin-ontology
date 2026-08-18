"use client";

import { useState, useMemo } from "react";
import {
  ComposedChart,
  BarChart,
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
  LabelList,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { Card, StatCard } from "@/components/Card";
import { PeriodFilter, Segmented, Delta, InfoTip, TipRow } from "@/components/exec/Bits";
import { ReportSection, ReportCover, ReportActions, type SectionDef } from "@/components/exec/Report";
import { useReportSections } from "@/store/prefs";
import { downloadCsv, stamp } from "@/lib/export";
import {
  plData,
  MONTHS,
  LATEST,
  rowValue,
  periodLabel,
  mn,
  type Period,
  type PlRow,
} from "@/lib/exec";

// =============================================================================
// 손익 — 경영회의 보고 slide 9(용인공원·와이피엘) · 10(용인공원라이프)
// 장표 표를 그대로 재현하고, 표를 읽기 쉽게 하는 손익 브릿지 1종을 더한다.
// =============================================================================

const SECTIONS: SectionDef[] = [
  { id: "summary", label: "요약 지표", note: "총수입 · 총지출 · 손익 · 원가율" },
  { id: "bridge", label: "손익 브릿지", note: "수입 구성에서 비용 차감까지" },
  { id: "trend", label: "월별 추이", note: "수입 · 지출 · 손익" },
  { id: "table", label: "손익 상세표", note: "장표 원형 (목표 · 실적 · MOM · YOY · 누계)" },
];

export default function PlPage() {
  const [blockId, setBlockId] = useState(plData.pl.blocks[0].id);
  const [period, setPeriod] = useState<Period>(LATEST);
  const block = plData.pl.blocks.find((b) => b.id === blockId)!;
  const { isOn } = useReportSections("pl", SECTIONS.map((s) => s.id));

  const row = (id: string) => block.rows.find((r) => r.id === id)!;
  const val = (r: PlRow, k: "actual" | "target") => rowValue(r, k, period);

  const revTotal = row("rev_total");
  const expTotal = row("exp_total");
  const headline = row(block.headline_kpi);
  const profit = row(block.headline_kpi === "op_margin" ? "op_profit" : "profit");
  const lowerIsBetter = block.headline_kpi === "cost_ratio";

  const children = (kind: "revenue" | "expense") =>
    block.rows.filter((r) => r.level === 1 && r.kind === kind);

  // 손익 브릿지 — 수입 항목 누적 → 비용 차감 → 손익
  const bridge = useMemo(() => {
    const steps: {
      name: string;
      base: number;
      span: number;
      value: number;
      kind: "revenue" | "expense" | "total";
    }[] = [];
    let running = 0;
    children("revenue").forEach((r) => {
      const v = val(r, "actual") ?? 0;
      steps.push({ name: r.label, base: running, span: v, value: v, kind: "revenue" });
      running += v;
    });
    children("expense").forEach((r) => {
      const v = val(r, "actual") ?? 0;
      running -= v;
      steps.push({ name: r.label, base: running, span: v, value: -v, kind: "expense" });
    });
    steps.push({
      name: "손익",
      base: Math.min(0, running),
      span: Math.abs(running),
      value: running,
      kind: "total",
    });
    return steps;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, period]);

  const profitTarget = val(row("profit"), "target") ?? 0;

  const trend = useMemo(
    () =>
      MONTHS.map((m, i) => ({
        month: m,
        수입: revTotal.monthly.actual[i],
        지출: expTotal.monthly.actual[i],
        손익: profit.monthly.actual[i],
        수입목표: revTotal.monthly.target[i],
      })),
    [revTotal, expTotal, profit]
  );

  // 선택 월 기준 전월 대비 — 4월은 장표 MOM 값을 그대로 사용
  const momOf = (r: PlRow) => {
    if (period === "cum") return null;
    if (period === LATEST) return r.mom ?? null;
    if (period === 0) return null;
    return Number((r.monthly.actual[period] - r.monthly.actual[period - 1]).toFixed(1));
  };
  const yoyOf = (r: PlRow) => (period === LATEST ? r.yoy ?? null : null);

  const handleCsv = () => {
    const rows: (string | number)[][] = [];
    rows.push([`${block.tab_label} 손익`, `기준 ${periodLabel(period)}`, "단위 백만원, %"]);
    rows.push([plData.meta.org_basis]);
    rows.push([]);
    rows.push([
      "구분",
      "단계",
      ...MONTHS.flatMap((m) => [`${m} 실적`, `${m} 목표`]),
      "누계 실적",
      "누계 목표",
      "누계 YOY",
      "비고",
    ]);
    block.rows.forEach((r) => {
      rows.push([
        r.label,
        r.level === 0 ? "총계" : "세부",
        ...MONTHS.flatMap((_, i) => [r.monthly.actual[i], r.monthly.target[i]]),
        r.c_actual ?? "",
        r.c_target ?? "",
        r.c_yoy ?? "",
        r.memo ?? "",
      ]);
    });
    rows.push([]);
    rows.push(["데이터 기준", plData.meta.monthly_basis]);
    downloadCsv(`${block.tab_label}_손익_${stamp()}`, rows);
  };

  return (
    <AppLayout
      pageTitle="손익"
      pageSubtitle="경영회의 보고 장표(slide 9·10)를 그대로 재현하고, 표를 읽기 쉽게 하는 손익 브릿지를 함께 본다."
    >
      <ReportCover
        title="26년 원가 및 손익"
        period={periodLabel(period)}
        scope={`${block.tab_label} · ${block.scope_note}`}
      />

      {/* 컨트롤 */}
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          items={plData.pl.blocks.map((b) => ({ id: b.id, label: b.tab_label }))}
          value={blockId}
          onChange={setBlockId}
        />
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter value={period} onChange={setPeriod} />
          <ReportActions page="pl" sections={SECTIONS} onCsv={handleCsv} />
        </div>
      </div>

      <div className="no-print mb-6 text-[11.5px] text-stone-500">
        {block.scope_note} · 경영회의 보고 slide {block.slide}
      </div>

      {/* 요약 지표 */}
      <ReportSection
        id="summary"
        title="요약 지표"
        meta={`${periodLabel(period)} · 백만원`}
        enabled={isOn("summary")}
        first
      >
        <div className="grid gap-4 md:grid-cols-4 print-cols-4">
          <StatCard
            label="총수입"
            value={mn(val(revTotal, "actual"))}
            unit="백만원"
            sub={`목표 ${mn(val(revTotal, "target"))} 대비 ${achieve(
              val(revTotal, "actual"),
              val(revTotal, "target")
            )}`}
          />
          <StatCard
            label="총지출"
            value={mn(val(expTotal, "actual"))}
            unit="백만원"
            sub={`목표 ${mn(val(expTotal, "target"))} 대비 ${achieve(
              val(expTotal, "actual"),
              val(expTotal, "target")
            )}`}
          />
          <StatCard
            label={profit.label}
            value={mn(val(profit, "actual"))}
            unit="백만원"
            sub={`목표 ${mn(val(profit, "target"))} 백만원`}
          />
          <StatCard
            label={headline.label}
            value={`${val(headline, "actual") ?? 0}%`}
            sub={`${periodLabel(period)} 목표 ${val(headline, "target") ?? block.target_value}% · ${
              block.target_note
            }`}
          />
        </div>
      </ReportSection>

      {/* 손익 브릿지 */}
      <ReportSection
        id="bridge"
        title="손익 브릿지"
        meta={`${periodLabel(period)} 실적 · 백만원`}
        enabled={isOn("bridge")}
        info={
          <InfoTip title="읽는 법" align="left">
            <TipRow label="막대">
              바닥이 아니라 직전까지의 누계 높이에서 시작해, 그 항목 금액만큼 이동한다.
            </TipRow>
            <TipRow label="색">
              teal은 수입 가산, 회색은 비용 차감, 주황은 0에서 시작하는 최종 손익.
            </TipRow>
            <TipRow label="점선">
              장표 손익 행의 목표. 26.04·누계는 장표 원본값이고, 그 외 월은 누계 목표를 배분한 추정치다.
            </TipRow>
            <TipRow label="종착점">
              총수입 − 총지출, 즉 표의 손익 행. 라이프의 영업손익(부금·영업외 제외)과는 다른 값이다.
            </TipRow>
          </InfoTip>
        }
        right={
          <span className="flex items-center gap-3 text-[11px] text-stone-500">
            <LegendDot color="#0095A9" label="수입" />
            <LegendDot color="#a8a29e" label="비용" />
            {/* 브릿지의 종착점은 총수입 − 총지출, 즉 장표의 '손익' 행 */}
            <LegendDot color="#b45309" label="손익" />
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-4" style={{ borderTop: "2px dashed #78716c" }} /> 손익 목표
            </span>
          </span>
        }
      >
        <Card>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bridge} margin={{ top: 24, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#e7e5dc" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10.5, fill: "#78716c" }}
                  axisLine={{ stroke: "#e7e5dc" }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#a8a29e" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) => Math.round(Number(v ?? 0)).toLocaleString("ko-KR")}
                />
                <Tooltip
                  cursor={{ fill: "#f5f5f0" }}
                  contentStyle={TOOLTIP}
                  formatter={(v, n, item) =>
                    n === "span"
                      ? [
                          Math.round(
                            (item?.payload as { value: number } | undefined)?.value ?? 0
                          ).toLocaleString("ko-KR"),
                          "금액",
                        ]
                      : [null, null]
                  }
                />
                {/* base는 막대를 띄우는 투명 받침 */}
                <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
                <Bar dataKey="span" stackId="a" radius={[2, 2, 0, 0]} maxBarSize={54}>
                  {bridge.map((d) => (
                    <Cell
                      key={d.name}
                      fill={
                        d.kind === "revenue"
                          ? "#0095A9"
                          : d.kind === "expense"
                          ? "#a8a29e"
                          : d.value >= 0
                          ? "#b45309"
                          : "#9a3412"
                      }
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    offset={6}
                    style={{ fontSize: 10, fill: "#57534e" }}
                    formatter={(v) => {
                      const n = Number(v ?? 0);
                      return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(
                        Math.round(n)
                      ).toLocaleString("ko-KR")}`;
                    }}
                  />
                </Bar>
                <ReferenceLine
                  y={profitTarget}
                  stroke="#78716c"
                  strokeDasharray="4 3"
                  strokeWidth={1.25}
                  label={{
                    value: `${periodLabel(period)} 손익 목표 ${mn(profitTarget)}`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "#78716c",
                    offset: 6,
                  }}
                />
                <ReferenceLine y={0} stroke="#d6d3c9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </ReportSection>

      {/* 월별 추이 */}
      <ReportSection
        id="trend"
        title="월별 추이"
        meta="백만원"
        enabled={isOn("trend")}
        info={
          <InfoTip title="읽는 법" align="left">
            <TipRow label="축">
              막대(수입·지출)는 왼쪽 축, 선(손익)은 오른쪽 축. 자릿수가 달라 축을 나눴다.
            </TipRow>
            <TipRow label="진한 막대">상단 필터에서 선택한 기간.</TipRow>
            <TipRow label="음영 구간">
              장표에 월별 수치가 없어 채운 추정 구간. 26.04만 장표 실측이고, 26.03은 장표 MOM
              증감액으로 역산, 25.12~26.02는 누계 잔여를 균등 배분했다.
            </TipRow>
          </InfoTip>
        }
        right={
          <span className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500">
            <LegendDot color="#0095A9" label="수입" />
            <LegendDot color="#a8a29e" label="지출" />
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-4" style={{ borderTop: "2px solid #b45309" }} /> {profit.label}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-4" style={{ borderTop: "2px dashed #a8a29e" }} /> 수입 목표
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
                  width={46}
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
                  contentStyle={TOOLTIP}
                  formatter={(v, n) => [Math.round(Number(v ?? 0)).toLocaleString("ko-KR"), String(n)]}
                />
                <Bar yAxisId="amount" dataKey="수입" radius={[3, 3, 0, 0]} maxBarSize={48}>
                  {trend.map((d, i) => (
                    <Cell key={d.month} fill={isSelected(period, i) ? "#0095A9" : "#b3dde0"} />
                  ))}
                </Bar>
                <Bar yAxisId="amount" dataKey="지출" radius={[3, 3, 0, 0]} maxBarSize={48}>
                  {trend.map((d, i) => (
                    <Cell key={d.month} fill={isSelected(period, i) ? "#78716c" : "#e7e5dc"} />
                  ))}
                </Bar>
                <Line
                  yAxisId="amount"
                  type="monotone"
                  dataKey="수입목표"
                  name="수입 목표"
                  stroke="#a8a29e"
                  strokeWidth={1.25}
                  strokeDasharray="4 3"
                  dot={false}
                />
                <Line
                  yAxisId="profit"
                  type="monotone"
                  dataKey="손익"
                  name={profit.label}
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

      {/* 손익 상세표 — 장표 원형 */}
      <ReportSection
        id="table"
        title="26년 원가 및 손익"
        meta={`${block.tab_label} · 단위 백만원, % · ${periodLabel(period)} 기준`}
        enabled={isOn("table")}
      >
        <div className="print-card overflow-hidden rounded-md border border-stone-200/80 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-[#0095A9] text-white">
                  <th className="px-3 py-2 text-left font-semibold">조직</th>
                  <th className="px-3 py-2 text-left font-semibold">구분</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    {periodLabel(period)} 목표
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    {periodLabel(period)} 실적
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">MOM</th>
                  <th className="px-3 py-2 text-right font-semibold">YOY</th>
                  <th className="border-l border-white/30 px-3 py-2 text-right font-semibold">
                    누계 목표
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">누계 실적</th>
                  <th className="px-3 py-2 text-right font-semibold">누계 YOY</th>
                  <th className="px-3 py-2 text-left font-semibold">비고</th>
                </tr>
              </thead>
              <tbody>
                {block.rows.map((r, idx) => {
                  const sfx = r.kind === "ratio" ? "%" : "";
                  const isSub = r.level === 0 && (r.kind === "revenue" || r.kind === "expense");
                  const isResult = r.kind === "profit" || r.kind === "ratio";
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-stone-100 last:border-0 ${
                        isSub ? "bg-stone-100/70 font-semibold" : ""
                      } ${isResult ? "bg-[#e6f4f6]/70 font-semibold" : ""}`}
                    >
                      {idx === 0 && (
                        <td
                          rowSpan={block.rows.length}
                          className="border-r border-stone-200 bg-white px-3 py-2 align-top text-[12px] font-medium text-stone-700"
                        >
                          {block.tab_label.split(" · ").map((seg) => (
                            <div key={seg}>{seg}</div>
                          ))}
                        </td>
                      )}
                      <td className={`px-3 py-2 text-stone-800 ${r.level === 1 ? "pl-7" : ""}`}>
                        {r.label}
                      </td>
                      <td className="px-3 py-2 text-right tnum text-stone-600">
                        {mn(val(r, "target"))}
                        {val(r, "target") !== null && sfx}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tnum ${
                          r.emphasis ? "text-[#007a8c]" : "text-stone-900"
                        }`}
                      >
                        {r.emphasis ? (
                          <span className="inline-flex min-w-[38px] items-center justify-center rounded-full border border-[#0095A9]/50 px-2 py-0.5 font-semibold">
                            {mn(val(r, "actual"))}
                            {sfx}
                          </span>
                        ) : (
                          <>
                            {mn(val(r, "actual"))}
                            {val(r, "actual") !== null && sfx}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.kind === "ratio" ? (
                          <span className="text-stone-300">-</span>
                        ) : (
                          <Delta value={momOf(r)} invert={r.kind === "expense"} />
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.kind === "ratio" ? (
                          <span className="text-stone-300">-</span>
                        ) : (
                          <Delta value={yoyOf(r)} invert={r.kind === "expense"} />
                        )}
                      </td>
                      <td className="border-l border-stone-200 px-3 py-2 text-right tnum text-stone-600">
                        {mn(r.c_target)}
                        {r.c_target !== null && sfx}
                      </td>
                      <td className="px-3 py-2 text-right tnum text-stone-900">
                        {mn(r.c_actual)}
                        {r.c_actual !== null && sfx}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.c_yoy === undefined || r.kind === "ratio" ? (
                          <span className="text-stone-300">-</span>
                        ) : (
                          <Delta value={r.c_yoy} invert={r.kind === "expense"} />
                        )}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-stone-500">
                        {r.emphasis ? `<${block.target_note}>` : r.memo ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-[10.5px] leading-relaxed text-stone-400">
          {plData.meta.monthly_basis}
        </p>
      </ReportSection>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------

const TOOLTIP = {
  fontSize: 11,
  borderRadius: 6,
  border: "1px solid #e7e5dc",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
} as const;

const isSelected = (p: Period, i: number) => p === "cum" || p === i;

const achieve = (a: number | null, t: number | null) =>
  a !== null && t ? `${Math.round((a / t) * 100)}%` : "-";

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
