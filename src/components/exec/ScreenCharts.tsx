"use client";

// =============================================================================
// 경영보고 화면용 차트
//
// 표가 이미 원형을 담고 있으므로, 차트는 표에서 바로 읽히지 않는 것만 맡는다.
//   Waterfall   구성 -> 차감 -> 결과의 흐름
//   TargetBars  목표 대비 실적을 항목 순위로
//   FunnelSteps 단계별 전환
//   CompareBars 계열 비교 (목표 · 수정전망 · 실행)
// =============================================================================
import { useState } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RenderableText } from "recharts/types/component/Text";
import { num, rate, rateTone, type CoaHint } from "@/lib/screens";

// -----------------------------------------------------------------------------
// 계정코드 병기 — 화면에는 항목명만 두고, 구성 계정은 hover로만 펼친다.
// (DK BMC 요청: BI 목업 테이블에 더존 계정코드 병기)
// -----------------------------------------------------------------------------
export type CoaHints = Record<string, CoaHint[]>;

export function CoaList({ items }: { items: CoaHint[] }) {
  return (
    <div className="mt-1.5 border-t border-stone-100 pt-1.5">
      <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-stone-400">
        더존 계정
      </div>
      <div className="space-y-0.5">
        {items.map((a) => (
          <div key={`${a.account}-${a.code}`} className="flex items-baseline gap-2 text-[10.5px]">
            <span className="tnum shrink-0 text-stone-400">{a.code || "코드 미확정"}</span>
            <span className="min-w-0 flex-1 truncate text-stone-600">{a.account}</span>
            <span className="tnum shrink-0 text-stone-500">{num(a.amount ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TEAL = "#0095A9";
const TEAL_DEEP = "#006b7a"; // 목표 초과분 강조 (TargetBars)
const TEAL_2 = "#65B3B1";
const TEAL_SOFT = "#b3dde0";
const BRICK = "#b45309";
const BRICK_2 = "#d9a066";
const STONE = "#57534e";
const STONE_SOFT = "#d6d3d1";

// -----------------------------------------------------------------------------
// 워터폴
// -----------------------------------------------------------------------------
export type WaterfallStep = {
  name: string;
  value: number;
  kind: "add" | "sub" | "total";
};

type Bar1 = { name: string; base: number; span: number; value: number; kind: string };

/**
 * 각 막대가 직전 누계 높이에서 시작하도록 base/span을 계산한다.
 * 렌더 밖 순수 함수로 두어 누계 변수를 렌더 중 재할당하지 않는다.
 */
function buildWaterfall(steps: WaterfallStep[]): Bar1[] {
  const out: Bar1[] = [];
  let running = 0;
  for (const s of steps) {
    if (s.kind === "total") {
      out.push({ name: s.name, base: 0, span: running, value: running, kind: "total" });
    } else if (s.kind === "add") {
      out.push({ name: s.name, base: running, span: s.value, value: s.value, kind: "add" });
      running += s.value;
    } else {
      running -= s.value;
      out.push({ name: s.name, base: running, span: s.value, value: -s.value, kind: "sub" });
    }
  }
  return out;
}

const barColor = (k: string) => (k === "add" ? TEAL : k === "sub" ? BRICK : STONE);

export function Waterfall({
  steps,
  height = 260,
  unit = "백만원",
  hints,
}: {
  steps: WaterfallStep[];
  height?: number;
  unit?: string;
  hints?: CoaHints;
}) {
  const data = buildWaterfall(steps);

  return (
    <div style={{ height }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={1}
        minHeight={1}
        initialDimension={{ width: 1, height: 1 }}
      >
        <BarChart data={data} margin={{ top: 26, right: 8, bottom: 4, left: 8 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#78716c" }}
            axisLine={{ stroke: "#e7e5dc" }}
            tickLine={false}
            interval={0}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as Bar1;
              const accounts = hints?.[d.name];
              return (
                <div
                  className={`rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 text-[11.5px] shadow-sm ${
                    accounts ? "w-[260px]" : ""
                  }`}
                >
                  <div className="font-medium text-stone-700">{d.name}</div>
                  <div className="tnum mt-0.5 text-stone-900">
                    {d.value > 0 ? "+" : ""}
                    {num(d.value)} {unit}
                  </div>
                  {accounts && <CoaList items={accounts} />}
                </div>
              );
            }}
          />
          <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
          <Bar
            dataKey="span"
            stackId="a"
            radius={[2, 2, 0, 0]}
            maxBarSize={54}
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={barColor(d.kind)} fillOpacity={d.kind === "total" ? 1 : 0.88} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: RenderableText) => {
                const n = Number(v);
                return Number.isFinite(n) ? `${n > 0 ? "+" : ""}${num(n)}` : "";
              }}
              style={{ fontSize: 10.5, fill: "#57534e", fontVariantNumeric: "tabular-nums" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 목표 대비 실적 (가로 bullet)
// -----------------------------------------------------------------------------
export function TargetBars({
  rows,
  sortable = false,
  rateLabel = "달성률",
}: {
  rows: { label: string; sub?: string; target: number; actual: number }[];
  /** 비율 기준 정렬 토글을 노출한다 (달성률이 의미 있는 화면에서만) */
  sortable?: boolean;
  rateLabel?: string;
}) {
  const [sort, setSort] = useState<"none" | "desc" | "asc">("none");
  const rates = rows
    .map((r) => rate(r.actual, r.target))
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const maxRate = Math.max(...rates, 0);
  const cap = Math.min(200, Math.max(120, Math.ceil(maxRate / 20) * 20));
  const targetPosition = (100 / cap) * 100;

  const shown =
    sort === "none"
      ? rows
      : [...rows].sort((a, b) => {
          const ra = rate(a.actual, a.target) ?? -Infinity;
          const rb = rate(b.actual, b.target) ?? -Infinity;
          return sort === "desc" ? rb - ra : ra - rb;
        });

  const nextSort = () => setSort(sort === "none" ? "desc" : sort === "desc" ? "asc" : "none");
  const SortIcon = sort === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow;

  return (
    <div className="space-y-2">
      {sortable && (
        <div className="no-print flex justify-end">
          <button
            type="button"
            onClick={nextSort}
            aria-label={`${rateLabel} 정렬`}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10.5px] font-medium transition-colors ${
              sort === "none"
                ? "border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600"
                : "border-[#0095A9] bg-[#0095A9]/5 text-[#0095A9]"
            }`}
          >
            <SortIcon className="h-3 w-3" strokeWidth={1.75} />
            {rateLabel}
            {sort !== "none" && (sort === "desc" ? " 높은 순" : " 낮은 순")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-[120px_1fr_124px] items-end gap-3" aria-hidden>
        <span />
        <div className="relative h-3 text-[9.5px] font-medium text-stone-400">
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${targetPosition}%` }}
          >
            100%
          </span>
          {/* 우측 끝 cap 라벨 - 트랙 스케일의 상한을 표시 */}
          <span className="absolute right-0 whitespace-nowrap">{cap}%</span>
        </div>
        <span />
      </div>

      {shown.map((r, index) => {
        const rr = rate(r.actual, r.target);
        const actualWidth = Math.max(0, (Math.min(rr ?? 0, cap) / cap) * 100);
        const over = rr !== null && rr >= 100;
        const clipped = rr !== null && rr > cap;
        return (
          <div
            key={`${r.label}-${r.sub ?? index}`}
            className="grid grid-cols-[120px_1fr_124px] items-center gap-3"
          >
            <div className="min-w-0">
              <div className="truncate text-[11.5px] text-stone-700">{r.label}</div>
              {r.sub && <div className="truncate text-[10px] text-stone-400">{r.sub}</div>}
            </div>

            <div
              className="group relative h-4 rounded bg-stone-100"
              title={`실적 ${num(r.actual)} / 목표 ${num(r.target)}`}
            >
              {/* 100%~cap 초과 영역 트랙 - 옅은 대각선 스트라이프로 구분 */}
              <div
                aria-hidden
                className="absolute inset-y-0 right-0 rounded-r"
                style={{
                  left: `${targetPosition}%`,
                  backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(120,113,108,0.10) 0 3px, transparent 3px 7px)",
                }}
              />
              {/* 실적 - 100% 초과 시 두 구간(0~100% TEAL, 초과분 진한 teal)을 이어 그린다 */}
              {over && actualWidth > targetPosition ? (
                <>
                  <div
                    className="absolute inset-y-0 left-0 rounded-l transition-all duration-500"
                    style={{ width: `${targetPosition}%`, backgroundColor: TEAL }}
                  />
                  <div
                    className="absolute inset-y-0 rounded-r transition-all duration-500"
                    style={{
                      left: `${targetPosition}%`,
                      width: `${actualWidth - targetPosition}%`,
                      backgroundColor: TEAL_DEEP,
                    }}
                  />
                </>
              ) : (
                <div
                  className="absolute inset-y-0 left-0 rounded transition-all duration-500"
                  style={{
                    width: `${actualWidth}%`,
                    backgroundColor: over ? TEAL : BRICK_2,
                  }}
                />
              )}
              {clipped && (
                <span className="absolute right-0 top-1/2 z-20 -translate-y-1/2 text-[13px] font-bold leading-none text-white">
                  ›
                </span>
              )}
              {/* 모든 행에 공통인 100% 기준선 */}
              <div
                className="absolute -top-[5px] -bottom-[3px] z-10 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${targetPosition}%` }}
              >
                <span className="h-0 w-0 border-x-[3px] border-t-[4px] border-x-transparent border-t-stone-600" />
                <span className="w-[2px] flex-1 bg-stone-600" />
              </div>
              {/* 목표 금액 — hover 시에만 */}
              <div
                className="no-print pointer-events-none absolute -top-6 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] tabular-nums text-stone-600 shadow-sm group-hover:block"
                style={{ left: `${targetPosition}%` }}
              >
                목표 {num(r.target)}
              </div>
            </div>

            <div className="min-w-0 text-right">
              <div className={`tnum text-[11.5px] font-medium ${rateTone(rr)}`}>
                {rr === null ? "-" : `${rr.toFixed(0)}%`}
              </div>
              <div
                className="tnum truncate text-[10px] text-stone-400"
                title={`실적 ${num(r.actual)} / 목표 ${num(r.target)}`}
              >
                실적 {num(r.actual)} / 목표 {num(r.target)}
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-1 text-[10px] text-stone-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: TEAL }} />
          목표 달성
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: TEAL_DEEP }} />
          초과분
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: BRICK_2 }} />
          미달
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="flex flex-col items-center">
            <span className="h-0 w-0 border-x-[3px] border-t-[4px] border-x-transparent border-t-stone-600" />
            <span className="h-2 w-[2px] bg-stone-600" />
          </span>
          100% 기준선
        </span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 퍼널
// -----------------------------------------------------------------------------
export function FunnelSteps({
  steps,
}: {
  /** conv를 주면 그 값을 전환율로 쓰고, 없으면 직전 단계 대비로 계산한다 */
  steps: { label: string; value: number; unit?: string; conv?: number | null }[];
}) {
  const head = steps[0]?.value || 1;
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => {
        const w = Math.max(6, (s.value / head) * 100);
        const prev = i > 0 ? steps[i - 1].value : null;
        const conv =
          s.conv !== undefined && s.conv !== null
            ? s.conv
            : prev && prev > 0
              ? (s.value / prev) * 100
              : null;
        return (
          <div key={s.label}>
            <div className="flex items-center gap-3">
              <div className="w-[104px] shrink-0 truncate text-[11.5px] text-stone-700">
                {s.label}
              </div>
              <div className="relative h-7 flex-1">
                <div
                  className="flex h-full items-center justify-end rounded pr-2 transition-all duration-500"
                  style={{
                    width: `${w}%`,
                    background: `linear-gradient(90deg, ${TEAL} 0%, ${TEAL_2} 100%)`,
                    opacity: 1 - i * 0.13,
                  }}
                >
                  <span className="tnum text-[11px] font-semibold text-white">
                    {num(s.value)}
                    {s.unit ?? ""}
                  </span>
                </div>
              </div>
              <div className="w-[52px] shrink-0 text-right">
                {conv !== null && (
                  <span className="tnum text-[11px] font-medium text-stone-500">
                    {conv.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 계열 비교 바 (목표 · 수정전망 · 실행)
// -----------------------------------------------------------------------------
export type CompareSeries = { key: string; label: string; color?: string };

export function CompareBars({
  data,
  series,
  height = 240,
  unit = "백만원",
}: {
  data: Record<string, string | number>[];
  series: CompareSeries[];
  height?: number;
  unit?: string;
}) {
  const palette = [STONE_SOFT, TEAL_SOFT, TEAL];
  return (
    <div style={{ height }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={1}
        minHeight={1}
        initialDimension={{ width: 1, height: 1 }}
      >
        <BarChart data={data} margin={{ top: 22, right: 8, bottom: 4, left: 8 }} barGap={3}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#78716c" }}
            axisLine={{ stroke: "#e7e5dc" }}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 text-[11.5px] shadow-sm">
                  <div className="mb-1 font-medium text-stone-700">{label}</div>
                  {payload.map((p) => (
                    <div key={String(p.dataKey)} className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ backgroundColor: p.color as string }}
                      />
                      <span className="text-stone-500">
                        {series.find((s) => s.key === p.dataKey)?.label}
                      </span>
                      <span className="tnum ml-auto font-medium text-stone-900">
                        {num(Number(p.value))} {unit}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              fill={s.color ?? palette[i % palette.length]}
              radius={[2, 2, 0, 0]}
              maxBarSize={26}
              isAnimationActive={false}
            >
              {i === series.length - 1 && (
                <LabelList
                  dataKey={s.key}
                  position="top"
                  formatter={(v: RenderableText) => {
                    const n = Number(v);
                    return Number.isFinite(n) ? num(n) : "";
                  }}
                  style={{
                    fontSize: 10.5,
                    fill: "#57534e",
                    fontVariantNumeric: "tabular-nums",
                  }}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s, i) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[10.5px] text-stone-500">
            <span
              className="h-2 w-3 rounded-sm"
              style={{ backgroundColor: s.color ?? palette[i % palette.length] }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 손익 구조 바 — 법인 · 부문별 매출을 규모(막대 길이)와 구성(판관비 / 이익)으로
// 동시에 읽는다. 계열 3개를 나란히 세우는 막대보다 한 줄에 담기는 정보가 많고,
// 이익이 음수인 곳(매출보다 비용이 큰 경우)이 한눈에 드러난다.
// -----------------------------------------------------------------------------
export type ProfitRow = {
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  /** 매출 · 비용 밖에서 더해지는 값 (영업 외 손익 등) */
  other?: number;
};

export function ProfitStructureBars({
  rows,
  unit = "백만원",
  costLabel = "판관비",
  hints,
}: {
  rows: ProfitRow[];
  unit?: string;
  costLabel?: string;
  hints?: CoaHints;
}) {
  // 매출과 비용 중 큰 쪽을 기준으로 폭을 잡아야 적자 구간이 잘리지 않는다
  const max = Math.max(...rows.flatMap((r) => [r.revenue, r.cost]), 1);

  return (
    <div className="space-y-3.5">
      {rows.map((r) => {
        const loss = r.profit < 0;
        const revW = (r.revenue / max) * 100;
        const costW = (Math.min(r.cost, r.revenue) / max) * 100;
        const overW = loss ? ((r.cost - r.revenue) / max) * 100 : 0;
        const profitW = loss ? 0 : ((r.revenue - r.cost) / max) * 100;
        const rateOfProfit = r.revenue ? (r.profit / r.revenue) * 100 : null;

        return (
          <div key={r.name}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="group relative text-[12px] font-medium text-stone-700">
                <span
                  className={
                    hints?.[r.name]
                      ? "cursor-help underline decoration-stone-300 decoration-dotted underline-offset-[3px]"
                      : ""
                  }
                >
                  {r.name}
                </span>
                {hints?.[r.name] && (
                  <span className="no-print pointer-events-none absolute left-0 top-full z-30 hidden w-[260px] rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 shadow-lg group-hover:block">
                    <span className="block text-[11.5px] font-medium text-stone-700">
                      {r.name} 매출
                    </span>
                    <CoaList items={hints[r.name]} />
                  </span>
                )}
              </span>
              <span className="flex items-baseline gap-2.5 text-[11px] text-stone-400">
                <span className="tnum">매출 {num(r.revenue)}</span>
                <span className="tnum">
                  {costLabel} {num(r.cost)}
                </span>
                <span
                  className={`tnum text-[12.5px] font-semibold ${
                    loss ? "text-[var(--bad)]" : "text-[var(--teal-deep)]"
                  }`}
                >
                  이익 {num(r.profit)}
                </span>
                {rateOfProfit !== null && (
                  <span className="tnum w-[42px] text-right">{rateOfProfit.toFixed(0)}%</span>
                )}
              </span>
            </div>

            <div className="relative h-5 w-full rounded bg-stone-100/70">
              {/* 매출 폭 — 이 안을 비용과 이익이 나눠 갖는다 */}
              <div
                className="absolute inset-y-0 left-0 rounded-l"
                style={{ width: `${revW}%`, backgroundColor: TEAL_SOFT }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-l transition-all duration-500"
                style={{ width: `${costW}%`, backgroundColor: STONE_SOFT }}
              />
              {profitW > 0 && (
                <div
                  className="absolute inset-y-0 transition-all duration-500"
                  style={{ left: `${costW}%`, width: `${profitW}%`, backgroundColor: TEAL }}
                />
              )}
              {overW > 0 && (
                <div
                  className="absolute inset-y-0 rounded-r transition-all duration-500"
                  style={{ left: `${revW}%`, width: `${overW}%`, backgroundColor: BRICK }}
                  title={`비용이 매출을 ${num(r.cost - r.revenue)} ${unit} 초과`}
                />
              )}
              {/* 매출 끝선 */}
              <div
                className="absolute top-[-3px] h-[26px] w-px bg-stone-500"
                style={{ left: `${revW}%` }}
                aria-hidden
              />
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-[10px] text-stone-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: STONE_SOFT }} />
          {costLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: TEAL }} />
          이익
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: BRICK }} />
          매출 초과 비용
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-stone-500" />
          매출
        </span>
        <span>단위 {unit}</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 구성 막대 — 항목별 실적을 큰 순서로 눕혀 비교한다 (목표가 없는 자료용)
// -----------------------------------------------------------------------------
export function RankBars({
  rows,
  unit = "백만원",
  tone = "teal",
  digits = 0,
  hints,
}: {
  rows: { label: string; sub?: string; value: number }[];
  unit?: string;
  tone?: "teal" | "brick";
  digits?: number;
  hints?: CoaHints;
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const color = tone === "brick" ? BRICK_2 : TEAL;

  return (
    <div className="space-y-2">
      {rows.map((r, index) => (
        <div
          key={`${r.label}-${r.sub ?? index}`}
          className="grid grid-cols-[128px_1fr_74px] items-center gap-3"
        >
          <div className="group relative min-w-0">
            <div
              className={`truncate text-[11.5px] text-stone-700 ${
                hints?.[r.label]
                  ? "cursor-help underline decoration-stone-300 decoration-dotted underline-offset-[3px]"
                  : ""
              }`}
            >
              {r.label}
            </div>
            {r.sub && <div className="truncate text-[10px] text-stone-400">{r.sub}</div>}
            {hints?.[r.label] && (
              <div className="no-print pointer-events-none absolute left-0 top-full z-30 hidden w-[260px] rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 shadow-lg group-hover:block">
                <div className="text-[11.5px] font-medium text-stone-700">{r.label}</div>
                <CoaList items={hints[r.label]} />
              </div>
            )}
          </div>
          <div className="h-3.5 rounded bg-stone-100">
            <div
              className="h-full rounded transition-all duration-500"
              style={{
                width: `${(Math.abs(r.value) / max) * 100}%`,
                backgroundColor: r.value < 0 ? BRICK : color,
              }}
            />
          </div>
          <div className="tnum text-right text-[11.5px] font-medium text-stone-800">
            {num(r.value, digits)}
          </div>
        </div>
      ))}
      <div className="pt-0.5 text-[10px] text-stone-400">단위 {unit}</div>
    </div>
  );
}

export const CHART_COLORS = { TEAL, TEAL_2, TEAL_SOFT, BRICK, BRICK_2, STONE, STONE_SOFT };
