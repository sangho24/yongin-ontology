"use client";

import { ReactNode, useState, useRef, useEffect } from "react";
import { ArrowUp, ArrowDown, Download, Printer, Info } from "lucide-react";
import { MONTHS, delta, type Period, periodLabel } from "@/lib/exec";

// =============================================================================
// 경영손익 대시보드 공용 UI 조각
// =============================================================================

/**
 * InfoTip — 차트·표 옆의 i 표시. hover/focus로 열리고 클릭으로 고정된다.
 * 화면 전용이며 인쇄물에는 나오지 않는다.
 */
export function InfoTip({
  title,
  children,
  align = "right",
}: {
  title?: string;
  children: ReactNode;
  align?: "left" | "right";
}) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const open = hover || pinned;

  useEffect(() => {
    if (!pinned) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPinned(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPinned(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  return (
    <span className="no-print relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-label={title ? `${title} 설명` : "설명"}
        aria-expanded={open}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        onClick={() => setPinned((v) => !v)}
        className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
          open
            ? "border-[#0095A9] bg-[#0095A9] text-white"
            : "border-stone-300 text-stone-400 hover:border-stone-400 hover:text-stone-600"
        }`}
      >
        <Info className="h-3 w-3" strokeWidth={2.25} />
      </button>

      {open && (
        <span
          role="tooltip"
          className={`absolute top-full z-40 mt-2 inline-block w-[320px] whitespace-normal break-keep rounded-lg border border-stone-200 bg-white p-3.5 text-left shadow-xl fade-in ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {title && (
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
              {title}
            </span>
          )}
          <span className="block space-y-1.5 text-[12px] leading-relaxed text-stone-700">
            {children}
          </span>
        </span>
      )}
    </span>
  );
}

/** InfoTip 안에서 쓰는 항목 줄 */
export function TipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex gap-2">
      <span className="shrink-0 font-medium text-stone-900">{label}</span>
      <span className="text-stone-600">{children}</span>
    </span>
  );
}

/** 증감 표시 — 장표의 MOM/YOY는 증감액(백만원) */
export function Delta({
  value,
  invert = false,
  suffix,
}: {
  value: number | null | undefined;
  invert?: boolean;
  suffix?: string;
}) {
  if (value === null || value === undefined) return <span className="text-stone-300">-</span>;
  if (value === 0) return <span className="tnum text-stone-400">0</span>;
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 tnum ${
        good ? "text-[#0095A9]" : "text-[#9a3412]"
      }`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.25} />
      {delta(value).replace(/^[+-]/, "")}
      {suffix}
    </span>
  );
}

/** 기간 필터 — 월 선택 + 누계 */
export function PeriodFilter({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  const items: Period[] = [...MONTHS.map((_, i) => i as Period), "cum"];
  return (
    <div className="no-print inline-flex rounded-md border border-stone-200 bg-white p-0.5">
      {items.map((p) => {
        const active = p === value;
        return (
          <button
            key={String(p)}
            type="button"
            onClick={() => onChange(p)}
            className={`rounded px-2.5 py-1.5 text-[12px] font-medium tabular-nums transition-colors ${
              active
                ? "bg-stone-800 text-white"
                : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
            }`}
          >
            {periodLabel(p)}
          </button>
        );
      })}
    </div>
  );
}

/** 세그먼트 토글 — 조직·법인·구분 선택 공용 */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  tone = "teal",
}: {
  items: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  tone?: "teal" | "dark";
}) {
  return (
    <div className="no-print inline-flex flex-wrap rounded-md border border-stone-200 bg-white p-0.5">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={`rounded px-3 py-1.5 text-[12.5px] font-medium tracking-tight transition-colors ${
              active
                ? tone === "teal"
                  ? "bg-[#0095A9] text-white"
                  : "bg-stone-800 text-white"
                : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/** 추출 액션 — 보고서 인쇄 · 백데이터 CSV */
export function ExportActions({
  onCsv,
  csvLabel = "백데이터",
  onPrint,
}: {
  onCsv: () => void;
  csvLabel?: string;
  onPrint: () => void;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors";
  return (
    <div className="no-print flex items-center gap-2">
      <button
        type="button"
        onClick={onCsv}
        className={`${base} border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900`}
      >
        <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
        {csvLabel}
      </button>
      <button
        type="button"
        onClick={onPrint}
        className={`${base} border-[#0095A9] bg-[#0095A9] text-white hover:bg-[#007a8c]`}
      >
        <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
        보고서
      </button>
    </div>
  );
}

/** 목표 대비 실적 가로 게이지 */
export function Gauge({
  value,
  target,
  unit = "%",
  lowerIsBetter = false,
}: {
  value: number;
  target: number;
  unit?: string;
  lowerIsBetter?: boolean;
}) {
  const max = Math.max(Math.abs(value), Math.abs(target)) * 1.25 || 100;
  const w = Math.min(100, Math.max(0, (Math.abs(value) / max) * 100));
  const tw = Math.min(100, Math.max(0, (Math.abs(target) / max) * 100));
  const ok = lowerIsBetter ? value <= target : value >= target;

  return (
    <div className="w-full">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            ok ? "bg-[#0095A9]" : "bg-[#b45309]"
          }`}
          style={{ width: `${w}%` }}
        />
        <div className="absolute top-0 h-full w-px bg-stone-500" style={{ left: `${tw}%` }} aria-hidden />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400">
        <span className="tnum">
          실적{" "}
          <span className={ok ? "text-[#007a8c]" : "text-[#b45309]"}>
            {value}
            {unit}
          </span>
        </span>
        <span className="tnum">
          목표 {target}
          {unit}
        </span>
      </div>
    </div>
  );
}

/** 구성비 스택 바 */
export function StackBar({
  items,
  total,
}: {
  items: { label: string; value: number; color: string }[];
  total: number;
}) {
  return (
    <div className="w-full">
      <div className="flex h-7 w-full overflow-hidden rounded-md bg-stone-100">
        {items.map((it) => {
          const w = total > 0 ? (it.value / total) * 100 : 0;
          if (w <= 0) return null;
          return (
            <div
              key={it.label}
              className="flex items-center justify-center transition-all duration-500"
              style={{ width: `${w}%`, backgroundColor: it.color }}
              title={`${it.label} ${Math.round(it.value).toLocaleString("ko-KR")} (${w.toFixed(1)}%)`}
            >
              {w > 12 && (
                <span className="truncate px-1 text-[10px] font-medium text-white">{w.toFixed(0)}%</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {items.map((it) => (
          <span key={it.label} className="inline-flex items-center gap-1.5 text-[11px] text-stone-500">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: it.color }} />
            {it.label}
            <span className="tnum font-medium text-stone-700">
              {Math.round(it.value).toLocaleString("ko-KR")}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** 섹션 제목 */
export function SectionTitle({
  children,
  right,
  id,
}: {
  children: ReactNode;
  right?: ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className="mb-4 flex flex-wrap items-end justify-between gap-4 scroll-mt-32">
      <h3 className="section-h">{children}</h3>
      {right}
    </div>
  );
}

/** 인쇄 시에만 나오는 보고서 표지 */
export function PrintHeader({
  title,
  period,
  scope,
}: {
  title: string;
  period: string;
  scope?: string;
}) {
  return (
    <div className="print-only mb-6 border-b border-stone-300 pb-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
        용인공원 그룹
      </div>
      <h1 className="mt-1 text-[20px] font-semibold tracking-tight text-stone-900">{title}</h1>
      <p className="mt-1 text-[12px] text-stone-600">
        {period}
        {scope ? ` · ${scope}` : ""} · 단위 백만원
      </p>
    </div>
  );
}
