"use client";

import { useState, useRef, useEffect } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { NumberLineage, NumberDriver } from "@/types";
import { autoUnit } from "@/lib/format";
import { LineagePanel } from "./LineagePanel";

// =============================================================================
// NumberCell — 박스로 감싼 인터랙티브 숫자 셀
// 박스 = "탐색 가능" 시그널, hover tooltip + click panel
// =============================================================================

type Size = "sm" | "md" | "lg";

interface NumberCellProps {
  value: number;
  unit?: string; // 박스 외부 표기 단위 (원·명·기·% 등)
  label?: string; // 박스 위 작은 라벨
  sub?: string; // 박스 아래 작은 보조 설명
  lineage?: NumberLineage;
  series?: number[]; // inline sparkline용 (월별 등)
  size?: Size;
  emphasis?: boolean; // mint accent 강조
  drivers?: NumberDriver[];
  formatter?: (v: number) => string;
  className?: string;
}

// 사이즈별 padding·typography
const sizeStyles: Record<
  Size,
  { box: string; num: string; label: string; sub: string; spark: number }
> = {
  sm: {
    box: "px-2 py-1",
    num: "text-[14px]",
    label: "text-[10px]",
    sub: "text-[10px]",
    spark: 28,
  },
  md: {
    box: "px-3 py-1.5",
    num: "text-[18px]",
    label: "text-[11px]",
    sub: "text-[11px]",
    spark: 30,
  },
  lg: {
    box: "px-4 py-2",
    num: "text-[24px]",
    label: "text-[11px]",
    sub: "text-[12px]",
    spark: 32,
  },
};

export function NumberCell({
  value,
  unit,
  label,
  sub,
  lineage,
  series,
  size = "md",
  emphasis = false,
  drivers,
  formatter,
  className = "",
}: NumberCellProps) {
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const interactive = Boolean(lineage);
  const fmt = formatter ?? autoUnit;
  const styles = sizeStyles[size];

  // 단위가 외부 표기이므로, formatter가 자동으로 "원"을 붙이는 경우 제거
  const numText = (() => {
    const text = fmt(value);
    if (unit && unit !== "원" && text.endsWith("원")) {
      // formatter는 autoUnit (원·백만원·억원 자동) — unit prop이 다른 단위면 raw 숫자로
      return value.toLocaleString("ko-KR");
    }
    if (unit === "원") {
      // 단위 외부 표기이므로 "원" 접미사 제거
      return text.replace(/원$/, "").replace(/억$/, "억").replace(/백만$/, "백만");
    }
    return text;
  })();

  // ESC로 패널 닫기 (NumberCell에서도 보조)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Box border / accent
  const borderCls = emphasis
    ? "border-[#0095A9]/40 bg-[#e6f4f6]/40"
    : "border-stone-300/70 border-dotted";
  const numCls = emphasis ? "text-[#007a8c]" : "text-stone-900";
  const hoverCls = interactive
    ? "cursor-pointer hover:border-[#0095A9]/60 hover:bg-[#e6f4f6]/60"
    : "";

  return (
    <>
      <span className={`inline-flex flex-col ${className}`}>
        {label && (
          <span className={`${styles.label} mb-1 font-medium uppercase tracking-[0.08em] text-stone-500`}>
            {label}
          </span>
        )}

        <span className="inline-flex items-center gap-2">
          <span className="relative inline-flex items-center">
            <button
              ref={triggerRef}
              type="button"
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              onFocus={() => setHover(true)}
              onBlur={() => setHover(false)}
              onClick={() => interactive && setOpen(true)}
              disabled={!interactive}
              className={`inline-flex items-baseline gap-1 rounded-md border bg-white transition-colors duration-150 ${styles.box} ${borderCls} ${hoverCls} ${
                !interactive ? "cursor-default" : ""
              }`}
              aria-label={label ? `${label} ${numText}${unit ?? ""}` : `${numText}${unit ?? ""}`}
              aria-haspopup={interactive ? "dialog" : undefined}
            >
              <span className={`tnum headline ${styles.num} ${numCls} leading-none`}>
                {numText}
              </span>
            </button>

            {/* Hover tooltip — z-50으로 박스 외부에서도 보이게 */}
            {interactive && hover && lineage && (
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-stone-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-stone-700 shadow-lg fade-in"
              >
                <span className="block font-semibold text-stone-900">{lineage.source}</span>
                {lineage.formula && (
                  <span className="mt-0.5 block text-stone-500">{lineage.formula}</span>
                )}
              </span>
            )}
          </span>

          {unit && (
            <span className={`${styles.sub} font-medium text-stone-500`}>{unit}</span>
          )}

          {/* Inline sparkline */}
          {series && series.length > 1 && (
            <span
              className="inline-block opacity-80"
              style={{ width: 64, height: styles.spark }}
              aria-hidden
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series.map((v, i) => ({ i, v }))}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="#0095A9"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </span>
          )}
        </span>

        {sub && (
          <span className={`${styles.sub} mt-1 text-stone-500 leading-relaxed`}>{sub}</span>
        )}
      </span>

      {interactive && lineage && (
        <LineagePanel
          open={open}
          onClose={() => setOpen(false)}
          label={label}
          value={value}
          unit={unit}
          lineage={lineage}
          drivers={drivers}
        />
      )}
    </>
  );
}
