"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Package } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { NumberCell } from "./NumberCell";
import { EvidenceButton } from "./Card";
import ZoneSelector from "./controls/ZoneSelector";
import PeriodToggle from "./controls/PeriodToggle";
import FinanceActions from "./controls/FinanceActions";
import channelActivityData from "@/data/channel_activity_cost.json";
import type {
  ZoneGroup,
  DetailZone,
  ActivityCostBlock,
  ActivityCostSource,
  Period,
  NumberLineage,
} from "@/types";

// =============================================================================
// ChannelActivityCostExplorer — 채널·기간 선택 → 매출/비용/항목 + lineage
// 상조 VC 운영 BI 핵심 인터랙션 (장지의 ActivityCostExplorer 채널 버전)
// 데이터 shape이 ZoneGroup·DetailZone과 호환되므로 ZoneSelector 그대로 재사용
// =============================================================================

interface ChannelActivityCostExplorerProps {
  side?: "mutual";
  defaultChannelIds?: string[];
  title?: string;
  subtitle?: string;
  showFinanceActions?: boolean;
  className?: string;
  slotId?: string;
}

// JSON cast — channel mock seed
const CHANNEL_GROUPS = channelActivityData.channelGroups as unknown as ZoneGroup[];
const ACTIVITY_COSTS = channelActivityData.activityCosts as unknown as ActivityCostBlock[];
const LINEAGES = channelActivityData.lineages as unknown as Record<string, NumberLineage>;

const ALL_CHANNELS_MAP = new Map<string, DetailZone>();
CHANNEL_GROUPS.forEach((g) => g.subZones.forEach((z) => ALL_CHANNELS_MAP.set(z.id, z)));

// -----------------------------------------------------------------------------
// 다중 선택 시 account별 통합 항목
// -----------------------------------------------------------------------------

type AggregatedItem = {
  account: string;
  kind: "revenue" | "cost";
  amount: number;
  series: number[];
  drivers: string[];
  sources: Set<ActivityCostSource>;
  channelIds: string[];
  primaryLineage?: NumberLineage;
};

function aggregate(blocks: ActivityCostBlock[]): AggregatedItem[] {
  const map = new Map<string, AggregatedItem>();
  blocks.forEach((b) => {
    b.items.forEach((item) => {
      const key = `${item.kind}:${item.account}`;
      const existing = map.get(key);
      if (!existing) {
        const lineage = item.lineageId ? LINEAGES[item.lineageId] : undefined;
        map.set(key, {
          account: item.account,
          kind: item.kind,
          amount: item.amount,
          series: [...item.series],
          drivers: item.driver ? [item.driver] : [],
          sources: new Set([item.source]),
          channelIds: [b.zoneId],
          primaryLineage: lineage,
        });
      } else {
        existing.amount += item.amount;
        existing.series = existing.series.map((v, i) => v + (item.series[i] ?? 0));
        if (item.driver && !existing.drivers.includes(item.driver)) {
          existing.drivers.push(item.driver);
        }
        existing.sources.add(item.source);
        existing.channelIds.push(b.zoneId);
        existing.primaryLineage = undefined;
      }
    });
  });
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

function buildLineage(item: AggregatedItem): NumberLineage {
  if (item.primaryLineage) return item.primaryLineage;
  const channelLabels = item.channelIds
    .map((id) => ALL_CHANNELS_MAP.get(id)?.label ?? id)
    .join(", ");
  const isRevenue = item.kind === "revenue";
  const driverText = item.drivers.length > 0 ? item.drivers.join(" / ") : "직접 귀속";

  return {
    source:
      item.channelIds.length === 1
        ? `${channelLabels} / ${item.account}`
        : `${item.channelIds.length}개 채널 / ${item.account}`,
    formula: isRevenue
      ? `SUMIFS(원장, 계정=${item.account}, 채널∈{${channelLabels}})`
      : `${item.account} × Driver(${driverText}) 배부`,
    verified: item.sources.size === 1 && item.sources.has("ledger"),
    unit: "원",
    asOf: "2025-12-31",
    steps: [
      {
        label:
          item.channelIds.length === 1 ? "원장 raw 추출" : `${item.channelIds.length}개 채널 합산`,
      },
      { label: "마감분개·이월 제외" },
      ...(item.kind === "cost" && item.drivers.length > 0
        ? [{ label: `Driver 적용: ${driverText}` }]
        : []),
      { label: "최종 집계", amount: item.amount },
    ],
    notes: item.sources.has("estimated")
      ? "일부 항목 proxy 추정 — RFI를 통한 정밀 검증 권장"
      : undefined,
  };
}

function sumSeries(items: AggregatedItem[]): number[] {
  if (items.length === 0) return [];
  const len = items[0].series.length;
  const out = new Array<number>(len).fill(0);
  items.forEach((it) => {
    it.series.forEach((v, i) => {
      out[i] += v;
    });
  });
  return out;
}

// -----------------------------------------------------------------------------
// 메인 컴포넌트
// -----------------------------------------------------------------------------

export function ChannelActivityCostExplorer({
  side = "mutual",
  defaultChannelIds = [],
  title = "채널별 활동원가",
  subtitle = "채널을 선택하면 매출·비용 항목과 lineage가 펼쳐집니다",
  showFinanceActions = true,
  className = "",
  slotId,
}: ChannelActivityCostExplorerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultChannelIds);
  const [period, setPeriod] = useState<Period>("yearly");

  const selectedBlocks = useMemo(
    () => ACTIVITY_COSTS.filter((b) => selectedIds.includes(b.zoneId)),
    [selectedIds],
  );

  const aggregated = useMemo(() => aggregate(selectedBlocks), [selectedBlocks]);
  const revenues = aggregated.filter((a) => a.kind === "revenue");
  const costs = aggregated.filter((a) => a.kind === "cost");
  const totalRev = revenues.reduce((s, a) => s + a.amount, 0);
  const totalCost = costs.reduce((s, a) => s + a.amount, 0);
  const margin = totalRev - totalCost;
  const marginRate = totalRev > 0 ? margin / totalRev : 0;

  return (
    <section
      className={`overflow-hidden rounded-md border border-stone-200/80 bg-white ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-stone-100 px-8 py-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {title && <h3 className="section-h">{title}</h3>}
            {slotId && <EvidenceButton slotId={slotId} label={title} />}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">{subtitle}</p>
          )}
        </div>
        {showFinanceActions && (
          <FinanceActions
            context={{ zoneId: selectedIds[0] }}
            visible={selectedIds.length > 0}
          />
        )}
      </div>

      {/* Controls */}
      <div className="grid gap-6 px-8 py-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <ZoneSelector
          zoneGroups={CHANNEL_GROUPS}
          selected={selectedIds}
          onChange={setSelectedIds}
          side={side}
          placeholder="채널을 선택해주세요 (다중 선택 가능)"
        />
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* Body */}
      {selectedIds.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="px-8 pb-10 fade-in">
          <div className="grid gap-8 border-t border-stone-100 py-8 md:grid-cols-3">
            <SummaryStat
              label="매출 합계"
              value={totalRev}
              series={period === "monthly" ? sumSeries(revenues) : undefined}
              accent="revenue"
            />
            <SummaryStat
              label="비용 합계"
              value={totalCost}
              series={period === "monthly" ? sumSeries(costs) : undefined}
              accent="cost"
            />
            <SummaryStat
              label="영업 마진"
              value={margin}
              sub={`마진율 ${(marginRate * 100).toFixed(1)}%`}
              accent={margin >= 0 ? "neutral" : "cost"}
            />
          </div>

          <div className="grid gap-10 pt-2 lg:grid-cols-2">
            <ItemColumn
              icon={<TrendingUp className="h-4 w-4 text-[#0095A9]" strokeWidth={1.75} />}
              title="매출"
              items={revenues}
              period={period}
            />
            <ItemColumn
              icon={<TrendingDown className="h-4 w-4 text-[#9a3412]" strokeWidth={1.75} />}
              title="비용"
              items={costs}
              period={period}
            />
          </div>
        </div>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <Package className="h-9 w-9 text-stone-300" strokeWidth={1.4} />
      <div className="text-[13px] leading-relaxed text-stone-500">
        채널을 선택하면 매출·비용·항목과 lineage가 펼쳐집니다
      </div>
      <div className="text-[11px] tracking-wide text-stone-400">
        다중 선택 시 항목별로 합산되어 표시
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  series,
  sub,
  accent,
}: {
  label: string;
  value: number;
  series?: number[];
  sub?: string;
  accent: "revenue" | "cost" | "neutral";
}) {
  const accentCls = {
    revenue: "text-[#007a8c]",
    cost: "text-[#9a3412]",
    neutral: "text-stone-900",
  }[accent];
  const sparkColor = {
    revenue: "#0095A9",
    cost: "#9a3412",
    neutral: "#78716c",
  }[accent];

  const display = (() => {
    const v = value / 100_000_000;
    return v.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  })();

  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500">
        {label}
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className={`headline text-[26px] leading-none tnum ${accentCls}`}>{display}</span>
        <span className="text-[12px] font-medium text-stone-500">억원</span>
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-stone-500">{sub}</div>}
      {series && series.length > 1 && (
        <div className="mt-3 h-7 w-full max-w-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.map((v, i) => ({ i, v }))}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ItemColumn({
  icon,
  title,
  items,
  period,
}: {
  icon: React.ReactNode;
  title: string;
  items: AggregatedItem[];
  period: Period;
}) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        {icon}
        <h4 className="text-[13px] font-semibold text-stone-700">{title}</h4>
        <span className="text-[11px] text-stone-400 tnum">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-stone-200 px-4 py-6 text-center text-[12px] text-stone-400">
          항목 없음
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <ItemRow key={`${item.kind}:${item.account}`} item={item} period={period} />
          ))}
        </ul>
      )}
    </div>
  );
}

const SOURCE_BADGES: Record<ActivityCostSource, { label: string; cls: string }> = {
  ledger: { label: "원장 직추적", cls: "bg-[#e6f4f6] text-[#007a8c]" },
  allocated: { label: "Driver 배부", cls: "bg-stone-100 text-stone-600" },
  estimated: { label: "Proxy 추정", cls: "bg-[#fef7ed] text-[#b45309]" },
};

function ItemRow({ item, period }: { item: AggregatedItem; period: Period }) {
  const lineage = useMemo(() => buildLineage(item), [item]);
  const series = period === "monthly" ? item.series : undefined;
  const primarySource: ActivityCostSource = item.sources.has("estimated")
    ? "estimated"
    : item.sources.has("allocated")
      ? "allocated"
      : "ledger";
  const badge = SOURCE_BADGES[primarySource];

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-md px-3 py-3 transition-colors duration-150 hover:bg-stone-50/80">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-stone-900">{item.account}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
            {badge.label}
          </span>
          {item.drivers.length > 0 && (
            <span className="text-stone-500">· {item.drivers.join(" / ")}</span>
          )}
        </div>
      </div>
      <NumberCell
        value={item.amount}
        unit="원"
        lineage={lineage}
        series={series}
        size="md"
      />
    </li>
  );
}
