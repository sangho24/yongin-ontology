import { ReactNode } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

// =============================================================================
// Card
// =============================================================================
export function Card({
  title,
  subtitle,
  children,
  highlight = false,
  source,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  highlight?: boolean;
  source?: string;
}) {
  return (
    <div
      className={`rounded-md border bg-white p-5 transition-colors duration-150 ${
        highlight
          ? "border-[#0095A9]/30 ring-1 ring-[#0095A9]/10"
          : "border-stone-200/80"
      } hover:border-stone-300`}
    >
      {title && (
        <div className="mb-4">
          <h3 className="text-[14px] font-semibold tracking-tight text-stone-900">{title}</h3>
          {subtitle && <p className="mt-1 text-[12px] text-stone-500">{subtitle}</p>}
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
  sub,
  trend,
  trendValue,
  footnote,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  footnote?: string;
}) {
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  const trendClr =
    trend === "up" ? "text-[#0095A9]" : trend === "down" ? "text-[#9a3412]" : "text-stone-500";

  return (
    <div className="group rounded-md border border-stone-200/80 bg-white p-5 transition-colors duration-150 hover:border-stone-300">
      <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-stone-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="headline text-[28px] leading-none text-stone-900 tnum">{value}</span>
        {trend && trendValue && (
          <span className={`flex items-center gap-0.5 text-[11px] font-medium ${trendClr}`}>
            <TrendIcon className="h-3 w-3" />
            {trendValue}
          </span>
        )}
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
  sub,
  variant = "mint",
  footnote,
}: {
  label: string;
  value: string;
  sub?: string;
  variant?: "mint" | "outline" | "muted";
  footnote?: string;
}) {
  const styles = {
    mint: {
      wrap: "bg-[#0095A9] text-white",
      label: "text-[#b3dde0]",
      value: "text-white",
      sub: "text-[#ccebee]",
      foot: "text-[#65B3B1] border-[#007a8c]",
    },
    outline: {
      wrap: "bg-white border border-stone-200/80",
      label: "text-stone-500",
      value: "text-stone-900",
      sub: "text-stone-600",
      foot: "text-stone-400 border-stone-100",
    },
    muted: {
      wrap: "bg-[#fef7f0] border border-[#9a3412]/15",
      label: "text-[#9a3412]",
      value: "text-stone-900",
      sub: "text-stone-700",
      foot: "text-stone-500 border-[#9a3412]/10",
    },
  }[variant];

  return (
    <div className={`group rounded-md p-6 transition-colors duration-150 ${styles.wrap}`}>
      <div className={`text-[12px] font-medium uppercase tracking-[0.08em] ${styles.label}`}>{label}</div>
      <div className={`headline mt-3 text-[36px] leading-none tnum ${styles.value}`}>{value}</div>
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
}: {
  type?: "info" | "warn" | "success" | "danger";
  title: string;
  children: ReactNode;
}) {
  const accent = {
    info: "border-l-stone-400",
    warn: "border-l-[#b45309]",
    success: "border-l-[#0095A9]",
    danger: "border-l-[#9a3412]",
  }[type];

  return (
    <div className={`border-l-2 bg-white px-4 py-3.5 ${accent}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">{title}</div>
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
