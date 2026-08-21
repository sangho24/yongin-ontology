"use client";

import { ReactNode, useMemo } from "react";
import { ArrowUp, ArrowDown, Minus, Info } from "lucide-react";
import { getSlot, getMissingSlot, isMissing } from "@/lib/evidence";
import { useEvidenceStore } from "@/store/evidence";

// =============================================================================
// EvidenceButton — slotId 있으면 우상단 'i' 버튼.
// Drawer는 SiteShell의 EvidenceDrawerHost 1개만 mount되어 있어, 여기서는
// store action만 호출. 페이지 navigation 중 mount/unmount 깜빡임 제거.
// Card·StatCard·WowCard·InsightBox 공용.
// =============================================================================
function EvidenceButton({
  slotId,
  label,
  variant = "default",
}: {
  slotId: string;
  label?: string;
  variant?: "default" | "onMint" | "subtle";
}) {
  const openSlot = useEvidenceStore((s) => s.openSlot);
  const slot = useMemo(() => getSlot(slotId), [slotId]);
  const missingMeta = useMemo(
    () => (isMissing(slotId) ? getMissingSlot(slotId) : null),
    [slotId]
  );
  if (!slot && !missingMeta) return null;

  const btnCls =
    variant === "onMint"
      ? "text-[#b3dde0] hover:bg-white/10 hover:text-white"
      : variant === "subtle"
      ? "text-stone-300 hover:bg-stone-100 hover:text-stone-700"
      : "text-stone-400 hover:bg-stone-100 hover:text-stone-900";

  return (
    <button
      type="button"
      onClick={() => openSlot(slotId, { label })}
      aria-label={`${label ?? slot?.title ?? "근거"} 근거 보기`}
      title="근거·출처 보기"
      data-slot-id={slotId}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors duration-150 ${btnCls}`}
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );
}

// =============================================================================
// Card
// =============================================================================
export function Card({
  title,
  subtitle,
  children,
  highlight = false,
  negative = false,
  source,
  slotId,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  highlight?: boolean;
  negative?: boolean;
  source?: string;
  slotId?: string;
}) {
  return (
    <div
      // negative여도 카드 외형은 일반 카드와 동일 (틴트 제거, 값 색상은 내부 콘텐츠가 처리)
      data-negative={negative || undefined}
      className={`print-card rounded-md border p-5 transition-colors duration-150 ${
        highlight
          ? "border-[#0095A9]/30 bg-white ring-1 ring-[#0095A9]/10"
          : "border-stone-200/80 bg-white"
      } hover:border-stone-300`}
    >
      {(title || slotId) && (
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-[14px] font-semibold tracking-tight text-stone-900">{title}</h3>
            )}
            {subtitle && <p className="mt-1 text-[12px] text-stone-500">{subtitle}</p>}
          </div>
          {slotId && <EvidenceButton slotId={slotId} label={title} />}
        </div>
      )}
      {children}
      {source && (
        <div className="mt-4 flex items-start gap-1.5 border-t border-stone-100 pt-3 text-[10px] text-stone-400">
          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-stone-300" />
          <span>{source}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Stat
// =============================================================================
export function StatCard({
  label,
  value,
  unit,
  sub,
  trend,
  trendValue,
  footnote,
  slotId,
  hint,
  negative = false,
  delta,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  footnote?: string;
  slotId?: string;
  /** 라벨에 hover하면 펼쳐지는 보조 정보 (계정코드 등) */
  hint?: ReactNode;
  negative?: boolean;
  delta?: ReactNode;
}) {
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  const trendClr =
    trend === "up" ? "text-[#0095A9]" : trend === "down" ? "text-[#9a3412]" : "text-stone-500";

  return (
    <div
      // negative여도 카드 외형은 일반 카드와 동일 (틴트 제거, value 텍스트 색만 브릭)
      className="print-card group rounded-md border border-stone-200/80 bg-white p-5 transition-colors duration-150 hover:border-stone-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="group/hint relative text-[12px] font-medium uppercase tracking-[0.08em] text-stone-500">
          <span
            className={
              hint ? "cursor-help underline decoration-stone-300 decoration-dotted underline-offset-[3px]" : ""
            }
          >
            {label}
          </span>
          {hint && (
            <div className="no-print pointer-events-none absolute left-0 top-full z-30 hidden w-[260px] rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 normal-case tracking-normal shadow-lg group-hover/hint:block">
              <div className="text-[11.5px] font-medium text-stone-700">{label}</div>
              {hint}
            </div>
          )}
        </div>
        {slotId && <EvidenceButton slotId={slotId} label={label} variant="subtle" />}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        {/* 음수 지표는 value 텍스트만 브릭색으로 표시 */}
        <span
          className={`headline text-[28px] leading-none tnum ${
            negative ? "text-[#9a3412]" : "text-stone-900"
          }`}
        >
          {value}
        </span>
        {unit && <span className="text-[12px] font-medium text-stone-400">{unit}</span>}
        {trend && trendValue && (
          <span className={`flex items-center gap-0.5 text-[11px] font-medium ${trendClr}`}>
            <TrendIcon className="h-3 w-3" />
            {trendValue}
          </span>
        )}
        {delta && <span className="text-[11px] font-medium">{delta}</span>}
      </div>
      {sub && <div className="mt-2 text-[12px] text-stone-500 leading-relaxed">{sub}</div>}
      {footnote && <div className="mt-3 border-t border-stone-100 pt-2 text-[10px] text-stone-400">{footnote}</div>}
    </div>
  );
}

// =============================================================================
// Wow — 3 variants
// =============================================================================
export function WowCard({
  label,
  value,
  unit,
  sub,
  variant = "mint",
  footnote,
  slotId,
  negative = false,
  delta,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  variant?: "mint" | "outline" | "muted";
  footnote?: string;
  slotId?: string;
  negative?: boolean;
  delta?: ReactNode;
}) {
  // negative여도 외형·value 색은 variant 스타일 그대로 유지 (틴트 롤백)
  const styles = {
    mint: {
      wrap: "bg-[#0095A9] text-white",
      label: "text-[#b3dde0]",
      value: "text-white",
      sub: "text-[#ccebee]",
      foot: "text-[#65B3B1] border-[#007a8c]",
      btn: "onMint" as const,
    },
    outline: {
      wrap: "bg-white border border-stone-200/80",
      label: "text-stone-500",
      value: "text-stone-900",
      sub: "text-stone-600",
      foot: "text-stone-400 border-stone-100",
      btn: "default" as const,
    },
    muted: {
      wrap: "bg-[#fef7f0] border border-[#9a3412]/15",
      label: "text-[#9a3412]",
      value: "text-stone-900",
      sub: "text-stone-700",
      foot: "text-stone-500 border-[#9a3412]/10",
      btn: "default" as const,
    },
  }[variant];

  return (
    <div
      data-negative={negative || undefined}
      className={`print-card group rounded-md p-6 transition-colors duration-150 ${styles.wrap}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`text-[12px] font-medium uppercase tracking-[0.08em] ${styles.label}`}>{label}</div>
        {slotId && <EvidenceButton slotId={slotId} label={label} variant={styles.btn} />}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`headline text-[36px] leading-none tnum ${styles.value}`}>{value}</span>
        {unit && <span className={`text-[13px] font-medium ${styles.sub}`}>{unit}</span>}
        {delta && (
          <span
            className={`text-[11px] font-medium ${
              variant === "mint" ? "rounded bg-white/90 px-1.5 py-0.5 text-stone-700" : ""
            }`}
          >
            {delta}
          </span>
        )}
      </div>
      {sub && <div className={`mt-2.5 text-[13px] leading-relaxed ${styles.sub}`}>{sub}</div>}
      {footnote && (
        <div className={`mt-4 border-t pt-3 text-[10px] leading-relaxed ${styles.foot}`}>{footnote}</div>
      )}
    </div>
  );
}

// =============================================================================
// Insight
// =============================================================================
export function InsightBox({
  type = "info",
  title,
  children,
  slotId,
}: {
  type?: "info" | "warn" | "success" | "danger";
  title: string;
  children: ReactNode;
  slotId?: string;
}) {
  const accent = {
    info: "border-l-stone-400",
    warn: "border-l-[#b45309]",
    success: "border-l-[#0095A9]",
    danger: "border-l-[#9a3412]",
  }[type];

  return (
    <div className={`border-l-2 bg-white px-4 py-3.5 ${accent}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">{title}</div>
        {slotId && <EvidenceButton slotId={slotId} label={title} variant="subtle" />}
      </div>
      <div className="mt-1.5 text-[13px] leading-relaxed text-stone-800">{children}</div>
    </div>
  );
}

// =============================================================================
// Source caption
// =============================================================================
export function SourceCaption({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 text-[11px] text-stone-400">
      <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-stone-300" />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

// =============================================================================
// EvidenceButton 단독 export — 페이지에서 직접 차트·셀에 부착 가능
// =============================================================================
export { EvidenceButton };
