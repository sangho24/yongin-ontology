"use client";

import { useEffect } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import type { NumberLineage, NumberDriver } from "@/types";
import { autoUnit } from "@/lib/format";

// =============================================================================
// LineagePanel — 우측 슬라이드 패널 (NumberCell 클릭 시 열림)
// 헤더 / 단계 / 산식 / 드라이버 / 메모 섹션
// =============================================================================

interface LineagePanelProps {
  open: boolean;
  onClose: () => void;
  label?: string;
  value: number;
  unit?: string;
  lineage: NumberLineage;
  drivers?: NumberDriver[];
}

export function LineagePanel({
  open,
  onClose,
  label,
  value,
  unit,
  lineage,
  drivers,
}: LineagePanelProps) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // body 스크롤 잠금 (간소)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const verified = lineage.verified;
  const headerValue = autoUnit(value);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-stone-900/30 transition-opacity duration-200 ease-out ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label ? `${label} 데이터 내역` : "데이터 내역"}
        className={`fixed inset-y-0 right-0 z-30 flex w-[420px] max-w-[92vw] flex-col border-l border-stone-200 bg-white shadow-xl transition-transform duration-[220ms] ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-6 pb-5 pt-6">
          <div className="min-w-0 flex-1">
            {label && (
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500">
                {label}
              </div>
            )}
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="headline text-[28px] leading-none text-stone-900 tnum">
                {headerValue.replace(/원$/, "")}
              </span>
              {unit && <span className="text-[13px] font-medium text-stone-500">{unit}</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-stone-600">{lineage.source}</span>
              {verified !== undefined && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    verified
                      ? "border-[#0095A9]/30 bg-[#e6f4f6] text-[#007a8c]"
                      : "border-[#b45309]/25 bg-[#fef7ed] text-[#b45309]"
                  }`}
                >
                  {verified ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {verified ? "원장 대조 완료" : "검증 필요"}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* 단계 */}
            {lineage.steps && lineage.steps.length > 0 && (
              <section>
                <h4 className="section-label">단계</h4>
                <ol className="mt-3 space-y-2.5">
                  {lineage.steps.map((step, idx) => (
                    <li key={idx} className="relative pl-6">
                      <span className="absolute left-0 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#e6f4f6] text-[10px] font-semibold text-[#007a8c] tnum">
                        {idx + 1}
                      </span>
                      <div className="text-[13px] font-medium text-stone-900">{step.label}</div>
                      {step.detail && (
                        <div className="mt-0.5 text-[12px] leading-relaxed text-stone-600">
                          {step.detail}
                        </div>
                      )}
                      {(step.amount !== undefined || step.rowCount !== undefined) && (
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-stone-500 tnum">
                          {step.amount !== undefined && (
                            <span>
                              <span className="text-stone-400">금액 </span>
                              {autoUnit(step.amount)}
                            </span>
                          )}
                          {step.rowCount !== undefined && (
                            <span>
                              <span className="text-stone-400">건수 </span>
                              {step.rowCount.toLocaleString("ko-KR")}건
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* 산식 */}
            {lineage.formula && (
              <section>
                <h4 className="section-label">산식</h4>
                <div className="mt-3 rounded-md border border-stone-200 bg-[#f5f5f0] px-3.5 py-2.5 font-mono text-[12px] leading-relaxed text-stone-800">
                  {lineage.formula}
                </div>
              </section>
            )}

            {/* 드라이버 */}
            {drivers && drivers.length > 0 && (
              <section>
                <h4 className="section-label">드라이버</h4>
                <ul className="mt-3 space-y-2">
                  {drivers.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-baseline justify-between gap-3 border-b border-stone-100 pb-2 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] text-stone-800">{d.label}</div>
                        <div className="mt-0.5 text-[10px] text-stone-400 tnum">
                          범위 {d.min.toLocaleString("ko-KR")} – {d.max.toLocaleString("ko-KR")} {d.unit}
                        </div>
                      </div>
                      <div className="shrink-0 text-[13px] font-medium text-stone-900 tnum">
                        {d.defaultValue.toLocaleString("ko-KR")}
                        <span className="ml-1 text-[11px] font-normal text-stone-500">{d.unit}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 메모 */}
            {(lineage.notes || lineage.asOf) && (
              <section>
                <h4 className="section-label">메모</h4>
                <div className="mt-3 space-y-1.5">
                  {lineage.notes && (
                    <p className="text-[12px] leading-relaxed text-stone-600">{lineage.notes}</p>
                  )}
                  {lineage.asOf && (
                    <p className="text-[11px] text-stone-400 tnum">기준일 {lineage.asOf}</p>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
