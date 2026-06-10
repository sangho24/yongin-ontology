"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Hash, Database, FolderOpen, ArrowRight } from "lucide-react";
import evidenceData from "@/data/evidence_index.json";
import tboxData from "@/data/tbox.json";
import catalogData from "@/data/data_catalog.json";
import type { EvidenceIndex, DataCatalog } from "@/types";

// =============================================================================
// SearchPalette — ⌘K (Cmd/Ctrl + K) 글로벌 검색 모달
// 인덱스: 슬롯(evidence_index) + T-Box(Class·Property) + Dataset + 라우트
// =============================================================================

const evidence = evidenceData as unknown as EvidenceIndex;
const tbox = tboxData as unknown as {
  classes: { id: string; label: string; definition: string }[];
  properties: { id: string; label: string; from?: string; to?: string }[];
};
const catalog = catalogData as unknown as DataCatalog;

type ResultKind = "page" | "slot" | "tbox-class" | "tbox-property" | "dataset";

type SearchItem = {
  id: string;
  kind: ResultKind;
  title: string;
  sub?: string;
  href: string; // navigate target
  hash?: string; // optional anchor (#slot-id) for in-page focus
  hint?: string; // tertiary info (page label, category, etc.)
};

const ROUTES: SearchItem[] = [
  { id: "p-/", kind: "page", title: "Overview", sub: "그룹 PI 종합", href: "/" },
  { id: "p-/mutual", kind: "page", title: "상조 VC", sub: "라이프 · 회원 master", href: "/mutual" },
  { id: "p-/cemetery", kind: "page", title: "장지 VC", sub: "용인공원·YPL · 객체 master", href: "/cemetery" },
  { id: "p-/root-cause", kind: "page", title: "Root Cause", sub: "근원 분석 · 가설", href: "/root-cause" },
  { id: "p-/data-model", kind: "page", title: "Data Model", sub: "T-Box · As-is 로직", href: "/data-model" },
  { id: "p-/data-catalog", kind: "page", title: "Data Catalog", sub: "보유 자료 인벤토리", href: "/data-catalog" },
];

function buildIndex(): SearchItem[] {
  const items: SearchItem[] = [...ROUTES];

  // Slots
  Object.entries(evidence.slots).forEach(([slotId, slot]) => {
    items.push({
      id: `s-${slotId}`,
      kind: "slot",
      title: slot.title,
      sub: `${slot.page} · ${slot.kind}`,
      href: slot.page,
      hash: slotId,
      hint: slot.kind,
    });
  });

  // T-Box classes
  tbox.classes?.forEach((c) => {
    items.push({
      id: `tc-${c.id}`,
      kind: "tbox-class",
      title: c.label,
      sub: c.definition?.slice(0, 60),
      href: "/data-model",
      hash: c.id,
      hint: "Class",
    });
  });

  // T-Box properties
  tbox.properties?.forEach((p) => {
    items.push({
      id: `tp-${p.id}`,
      kind: "tbox-property",
      title: p.label,
      sub: p.from && p.to ? `${p.from} → ${p.to}` : undefined,
      href: "/data-model",
      hash: p.id,
      hint: "Property",
    });
  });

  // Datasets
  catalog.datasets.forEach((d) => {
    items.push({
      id: `d-${d.id}`,
      kind: "dataset",
      title: d.name,
      sub: d.scope,
      href: "/data-catalog",
      hash: d.id,
      hint: d.natureCode,
    });
  });

  return items;
}

const KIND_ICON: Record<ResultKind, typeof Search> = {
  page: ArrowRight,
  slot: Hash,
  "tbox-class": Database,
  "tbox-property": Database,
  dataset: FolderOpen,
};

const KIND_LABEL: Record<ResultKind, string> = {
  page: "페이지",
  slot: "KPI · 슬롯",
  "tbox-class": "Class",
  "tbox-property": "Property",
  dataset: "보유 자료",
};

// 한글·영문 정규화 (대소문자·공백 무시)
function norm(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, "");
}

export function SearchPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const index = useMemo(() => buildIndex(), []);

  const results = useMemo(() => {
    const q = norm(query);
    if (!q) {
      // 빈 query: 페이지 + 인기 슬롯 (PRIMARY 박혀있는 것 위주)
      return index.filter((i) => i.kind === "page").concat(index.filter((i) => i.kind === "slot").slice(0, 8));
    }
    const matches = index.filter(
      (i) => norm(i.title).includes(q) || norm(i.sub ?? "").includes(q) || norm(i.id).includes(q)
    );
    // 정렬: 정확 일치 → prefix → 기타
    return matches
      .sort((a, b) => {
        const aT = norm(a.title);
        const bT = norm(b.title);
        const aExact = aT === q ? 0 : aT.startsWith(q) ? 1 : 2;
        const bExact = bT === q ? 0 : bT.startsWith(q) ? 1 : 2;
        if (aExact !== bExact) return aExact - bExact;
        return aT.localeCompare(bT);
      })
      .slice(0, 50);
  }, [query, index]);

  // open 전이 시 state reset — effect 대신 렌더 중 상태 조정 패턴
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActiveIdx(0);
    }
  }

  // open 시 input focus (DOM 부수효과)
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // query 변경 시 active reset — 렌더 중 상태 조정 패턴
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setActiveIdx(0);
  }

  const handleSelect = (item: SearchItem) => {
    onClose();
    const target = item.hash ? `${item.href}#${item.hash}` : item.href;
    router.push(target);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIdx];
      if (item) handleSelect(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="검색"
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-stone-900/30" />

      {/* palette */}
      <div
        className="relative w-full max-w-[600px] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-2xl fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* input */}
        <div className="flex items-center gap-3 border-b border-stone-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="구역·계정·KPI·자료 검색"
            className="h-12 w-full bg-transparent text-[14px] text-stone-900 placeholder:text-stone-400 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-stone-500 sm:inline">
            ESC
          </kbd>
        </div>

        {/* results */}
        <div className="max-h-[60vh] overflow-y-auto px-2 py-2">
          {results.length === 0 ? (
            <div className="px-3 py-8 text-center text-[13px] text-stone-400">
              검색 결과가 없습니다.
            </div>
          ) : (
            <ul className="space-y-px" role="listbox">
              {results.map((item, idx) => {
                const Icon = KIND_ICON[item.kind];
                const isActive = idx === activeIdx;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => handleSelect(item)}
                      className={`flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-100 ${
                        isActive ? "bg-[#e6f4f6]" : "hover:bg-stone-50"
                      }`}
                    >
                      <Icon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          isActive ? "text-[#007a8c]" : "text-stone-400"
                        }`}
                        strokeWidth={1.75}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`truncate text-[13px] font-medium ${
                              isActive ? "text-stone-900" : "text-stone-800"
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-stone-400">
                            {KIND_LABEL[item.kind]}
                          </span>
                        </div>
                        {item.sub && (
                          <div className="mt-0.5 truncate text-[11.5px] text-stone-500">
                            {item.sub}
                          </div>
                        )}
                      </div>
                      {item.hint && (
                        <span className="shrink-0 self-center rounded-sm border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
                          {item.hint}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* footer hints */}
        <div className="flex items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/60 px-4 py-2 text-[10.5px] text-stone-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-stone-200 bg-white px-1 py-px text-[9.5px] tnum">↑↓</kbd>
              이동
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-stone-200 bg-white px-1 py-px text-[9.5px] tnum">↵</kbd>
              열기
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-stone-200 bg-white px-1 py-px text-[9.5px] tnum">ESC</kbd>
              닫기
            </span>
          </div>
          <div className="tnum text-stone-400">
            {results.length} / {index.length}
          </div>
        </div>
      </div>
    </div>
  );
}
