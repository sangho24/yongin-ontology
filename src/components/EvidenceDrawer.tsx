"use client";

import { useEffect } from "react";
import { X, Check, AlertCircle, FileSpreadsheet, Presentation, MessageSquare, FileText, Inbox, ExternalLink, Sparkles } from "lucide-react";
import type { EvidenceEntry, MissingSlotMeta } from "@/types";
import { resolveCaveats } from "@/lib/evidence";
import { autoUnit } from "@/lib/format";

// =============================================================================
// EvidenceDrawer — slotId 기반 evidence 배열·caveats·policy 표시 패널
// 차트·NumberCell·T-Box 노드 공용. 기존 LineagePanel(단일 lineage)와 별개.
// =============================================================================

interface EvidenceDrawerProps {
  open: boolean;
  onClose: () => void;
  slotId: string;
  title: string;
  page?: string;
  kind?: string;
  evidence?: EvidenceEntry[];
  caveats?: string[];
  narrative?: string;
  verified?: boolean;
  missing?: MissingSlotMeta | null;
  value?: number;
  unit?: string;
}

const METHOD_LABEL: Record<string, string> = {
  RAW: "원자료",
  ANALYSIS: "가공·분석",
  DEFINITION: "정의·해석",
  NARRATIVE_PPT: "PPT 슬라이드",
  INTERVIEW: "인터뷰",
  RFI: "RFI 항목",
  META: "메타·인덱스",
  MISSING: "자료 미연동",
};

const METHOD_ICON: Record<string, typeof FileSpreadsheet> = {
  RAW: FileSpreadsheet,
  ANALYSIS: FileSpreadsheet,
  DEFINITION: FileText,
  NARRATIVE_PPT: Presentation,
  INTERVIEW: MessageSquare,
  RFI: Inbox,
  META: FileText,
  MISSING: AlertCircle,
};

const RANK_STYLES = {
  PRIMARY: "border-[#0095A9]/40 bg-[#e6f4f6]/60 text-[#007a8c]",
  SECONDARY: "border-stone-300 bg-stone-50 text-stone-700",
  NARRATIVE: "border-amber-300/50 bg-amber-50/50 text-amber-800",
};

export function EvidenceDrawer({
  open,
  onClose,
  slotId,
  title,
  page,
  kind,
  evidence,
  caveats,
  narrative,
  verified,
  missing,
  value,
  unit,
}: EvidenceDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const resolvedCaveats = resolveCaveats(caveats);
  const grouped = {
    PRIMARY: evidence?.filter((e) => e.rank === "PRIMARY") ?? [],
    SECONDARY: evidence?.filter((e) => e.rank === "SECONDARY") ?? [],
    NARRATIVE: evidence?.filter((e) => e.rank === "NARRATIVE") ?? [],
  };

  const headerValue = value !== undefined ? autoUnit(value).replace(/원$/, "") : null;

  // 운영 액션 표시 조건: evidence가 1건 이상 있고 missing slot이 아닐 때만 노출
  const primaryEvidence = evidence?.[0];
  const showActions = !missing && !!primaryEvidence;

  // ERP 점프 placeholder — 실제 ERP URL은 추후 연동. 데모는 source_file 노출.
  const handleOpenERP = () => {
    const src = primaryEvidence?.source_file ?? "(unknown)";
    console.log("[EvidenceDrawer] ERP에서 열기", { slotId, source_file: src });
    if (typeof window !== "undefined") {
      window.alert(`ERP 점프 (데모)\n\nslot: ${slotId}\nsource: ${src}`);
    }
  };

  // 활동 자동 등록 placeholder — 데이터 모델 보강 큐 자동 추가는 추후 연동.
  const handleRegisterActivity = () => {
    console.log("[EvidenceDrawer] 활동 자동 등록", { slotId });
    if (typeof window !== "undefined") {
      window.alert(`활동 자동 등록 (데모)\n\nslot: ${slotId}\n→ 데이터 모델 보강 큐에 추가`);
    }
  };

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-stone-900/30 transition-opacity duration-200 ease-out ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${title} 근거`}
        className={`fixed inset-y-0 right-0 z-30 flex w-[460px] max-w-[92vw] flex-col border-l border-stone-200 bg-white shadow-xl transition-transform duration-[220ms] ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-6 pb-5 pt-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.1em] text-stone-500">
              {page && <span>{page}</span>}
              {kind && <span className="text-stone-300">·</span>}
              {kind && <span>{kind}</span>}
            </div>
            <div className="mt-1 text-[15px] font-semibold text-stone-900">{title}</div>
            {headerValue && (
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="headline text-[26px] leading-none text-stone-900 tnum">
                  {headerValue}
                </span>
                {unit && <span className="text-[12px] font-medium text-stone-500">{unit}</span>}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {verified !== undefined && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    verified
                      ? "border-[#0095A9]/30 bg-[#e6f4f6] text-[#007a8c]"
                      : "border-amber-300/40 bg-amber-50 text-amber-800"
                  }`}
                >
                  {verified ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {verified ? "회계정합성 검증" : "검증 필요"}
                </span>
              )}
              {missing && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/40 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                  <AlertCircle className="h-3 w-3" />
                  자료 미연동
                </span>
              )}
              <span className="text-[10px] text-stone-400 tnum">{slotId}</span>
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
            {/* Narrative */}
            {narrative && (
              <section>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">
                  서술
                </h4>
                <p className="mt-2 text-[13px] leading-relaxed text-stone-700">{narrative}</p>
              </section>
            )}

            {/* Missing slot 처리 */}
            {missing && (
              <section className="rounded-md border border-rose-200 bg-rose-50/60 p-4">
                <div className="text-[12px] font-semibold text-rose-800">미활성 KPI — 데이터 모델 보강 항목</div>
                <div className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-rose-700">
                  <div><span className="font-medium">현재 상태:</span> {missing.reason}</div>
                  {missing.needed_data && (
                    <div><span className="font-medium">보강 필요 자료:</span> {missing.needed_data}</div>
                  )}
                  <div className="mt-2 italic">{missing.placeholder_caveat}</div>
                </div>
              </section>
            )}

            {/* Evidence — rank별 그룹 */}
            {(["PRIMARY", "SECONDARY", "NARRATIVE"] as const).map((rank) => {
              const items = grouped[rank];
              if (!items.length) return null;
              return (
                <section key={rank}>
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">
                    {rank === "PRIMARY" ? "1차 근거" : rank === "SECONDARY" ? "교차검증" : "서술 근거"}
                    <span className="ml-1.5 text-stone-400 tnum">({items.length})</span>
                  </h4>
                  <ul className="mt-2.5 space-y-2.5">
                    {items.map((e, idx) => {
                      const Icon = METHOD_ICON[e.method];
                      return (
                        <li
                          key={idx}
                          className={`rounded-md border px-3 py-2.5 ${RANK_STYLES[e.rank]}`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                            <div className="min-w-0 flex-1">
                              <div className="break-all text-[12px] font-medium leading-tight">
                                {e.source_file.split("/").pop()}
                              </div>
                              <div className="mt-0.5 text-[10px] opacity-70 tnum">
                                {e.source_file}
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] opacity-80">
                                {e.sheet && <span>시트 <span className="font-medium">{e.sheet}</span></span>}
                                {e.range && <span>범위 <span className="tnum">{e.range}</span></span>}
                                {e.slide !== undefined && <span>p.<span className="tnum">{e.slide}</span></span>}
                                <span>· {METHOD_LABEL[e.method]}</span>
                                {e.verified && <Check className="h-3 w-3" />}
                              </div>
                              {(e.computed_value !== undefined) && (
                                <div className="mt-1.5 text-[11px] tnum opacity-90">
                                  계산값 {e.computed_value.toLocaleString("ko-KR")} {e.computed_unit ?? ""}
                                </div>
                              )}
                              {e.notes && (
                                <div className="mt-1.5 text-[11px] leading-relaxed opacity-85">
                                  {e.notes}
                                </div>
                              )}
                              {e.as_of && (
                                <div className="mt-1 text-[10px] opacity-60 tnum">기준 {e.as_of}</div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}

            {/* Caveats */}
            {resolvedCaveats.length > 0 && (
              <section>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">
                  주의사항 (Caveats)
                </h4>
                <ul className="mt-2 space-y-2">
                  {resolvedCaveats.map((c, idx) => (
                    <li
                      key={idx}
                      className="rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2 text-[12px] leading-relaxed text-amber-900"
                    >
                      {c.key !== "inline" && (
                        <span className="mr-1.5 inline-block rounded-sm bg-amber-200/50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide tnum">
                          {c.key}
                        </span>
                      )}
                      {c.text}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        {/* Footer — 재무팀 운영 액션 (ERP 점프 · 활동 자동 등록) */}
        {showActions && (
          <div className="border-t border-stone-200 bg-stone-50/80 px-6 py-3.5 backdrop-blur">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenERP}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[#0095A9]/40 bg-[#e6f4f6] px-3 py-2 text-[12px] font-semibold text-[#007a8c] transition-colors duration-150 hover:border-[#0095A9]/60 hover:bg-[#d4ecef]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                ERP에서 열기
              </button>
              <button
                type="button"
                onClick={handleRegisterActivity}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 transition-colors duration-150 hover:border-stone-400 hover:bg-stone-100"
              >
                <Sparkles className="h-3.5 w-3.5" />
                활동 자동 등록
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
