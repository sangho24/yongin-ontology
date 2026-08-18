"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import { Printer, Download, Check, X } from "lucide-react";
import { useReportSections } from "@/store/prefs";
import { printReport } from "@/lib/export";

// =============================================================================
// 보고서 구성 — 섹션 래퍼 + 출력 대상 선택 모달
// 화면에서는 일반 섹션, 인쇄하면 PPT 슬라이드 형태(타이틀 바 + 페이지 분리)로 전환.
// =============================================================================

export type SectionDef = { id: string; label: string; note?: string };

export function ReportSection({
  id,
  title,
  meta,
  right,
  info,
  enabled,
  first = false,
  children,
}: {
  id: string;
  title: string;
  meta?: string;
  right?: ReactNode;
  /** 제목 옆 i 표시에 들어갈 설명 */
  info?: ReactNode;
  enabled: boolean;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      data-section={id}
      className={`report-section ${enabled ? "" : "report-off"} ${first ? "" : "mt-10"} ${
        first ? "" : "print-slide"
      }`}
    >
      {/* 화면 헤더 */}
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-4">
        <h3 className="section-h flex items-center gap-2">
          {title}
          {info}
          {meta && <span className="text-[12px] font-normal text-stone-400">{meta}</span>}
        </h3>
        {right}
      </div>

      {/* 인쇄 헤더 — 경영회의 보고 장표의 타이틀 바 형식 */}
      <div className="slide-head">
        <span className="slide-head-title">
          <span className="slide-head-mark" />
          {title}
        </span>
        {meta && <span className="slide-head-meta">{meta}</span>}
      </div>

      {children}

      {/* 인쇄 푸터 — 슬라이드마다 반복 */}
      <div className="slide-foot print-only">
        <span>용인공원 그룹 경영손익 보고</span>
        <span>자료 : 26년 5월 경영회의 보고 · 0814 회의자료</span>
      </div>
    </section>
  );
}

/** 보고서 표지 + 페이지 푸터 — 인쇄 시에만 노출 */
export function ReportCover({
  title,
  period,
  scope,
  unit = "백만원, %",
}: {
  title: string;
  period: string;
  scope?: string;
  unit?: string;
}) {
  return (
    <div className="print-only report-cover">
      <div className="report-cover-bar">
        <span className="report-cover-mark" />
        <span className="report-cover-title">{title}</span>
        <span className="report-cover-unit">
          [단위 : {unit}, {period} 기준] 용인공원 그룹
        </span>
      </div>
      {scope && <div className="report-cover-scope">{scope}</div>}
    </div>
  );
}

/** 출력 대상 선택 + 인쇄 · 백데이터 */
export function ReportActions({
  page,
  sections,
  onCsv,
  csvLabel = "백데이터",
}: {
  page: string;
  sections: SectionDef[];
  onCsv: () => void;
  csvLabel?: string;
}) {
  const all = sections.map((s) => s.id);
  const { selected, toggle, setAll, isOn } = useReportSections(page, all);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const base =
    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors";

  return (
    <div className="no-print relative flex items-center gap-2" ref={ref}>
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
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`${base} border-[#0095A9] bg-[#0095A9] text-white hover:bg-[#007a8c]`}
      >
        <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
        보고서
        <span className="ml-0.5 rounded bg-white/20 px-1 text-[10px] tabular-nums">
          {selected.length}/{all.length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[300px] rounded-lg border border-stone-200 bg-white p-3 shadow-xl fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
              출력할 항목
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="닫기"
              className="flex h-6 w-6 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 space-y-px">
            {sections.map((s) => {
              const on = isOn(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-stone-50"
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      on ? "border-[#0095A9] bg-[#0095A9] text-white" : "border-stone-300 bg-white"
                    }`}
                  >
                    {on && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium text-stone-800">{s.label}</span>
                    {s.note && <span className="block text-[10.5px] text-stone-400">{s.note}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setAll(all)}
                className="rounded px-2 py-1 text-[11px] text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={() => setAll([])}
                className="rounded px-2 py-1 text-[11px] text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              >
                해제
              </button>
            </div>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={() => {
                setOpen(false);
                // 팝오버가 닫힌 뒤 인쇄 대화상자를 띄운다
                setTimeout(printReport, 80);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0095A9] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#007a8c] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
              인쇄
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
