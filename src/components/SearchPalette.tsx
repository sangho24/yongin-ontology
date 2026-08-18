"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, BarChart3, Target, ArrowRight } from "lucide-react";
import { uniqueKpis, plData } from "@/lib/exec";

// =============================================================================
// SearchPalette — ⌘K (Cmd/Ctrl + K) 글로벌 검색 모달
// 인덱스: 라우트 + 손익 항목 + KPI
// =============================================================================

type ResultKind = "page" | "account" | "kpi";

type SearchItem = {
  id: string;
  kind: ResultKind;
  title: string;
  sub?: string;
  href: string; // navigate target
  hash?: string; // optional anchor for in-page focus
  hint?: string; // tertiary info (page label, category, etc.)
};

const ROUTES: SearchItem[] = [
  { id: "p-/", kind: "page", title: "Overview", sub: "그룹 수지현황", href: "/" },
  { id: "p-/pl", kind: "page", title: "손익", sub: "조직별 원가 및 손익", href: "/pl" },
  { id: "p-/kpi", kind: "page", title: "KPI", sub: "조직별 지표 추이", href: "/kpi" },
];

function buildIndex(): SearchItem[] {
  const items: SearchItem[] = [...ROUTES];

  // 손익 항목 — 블록별 수입·지출·손익 행
  plData.pl.blocks.forEach((b) => {
    b.rows.forEach((r) => {
      items.push({
        id: `a-${b.id}-${r.id}`,
        kind: "account",
        title: r.label,
        sub: b.tab_label,
        href: "/pl",
        hint: r.kind === "ratio" ? "비율" : r.level === 0 ? "총계" : "세부",
      });
    });
  });

  // KPI
  uniqueKpis.forEach((k) => {
    items.push({
      id: `k-${k.lineage}`,
      kind: "kpi",
      title: k.label,
      sub: `${k.company} · ${k.team}`,
      href: "/kpi",
      hint: k.type === "new" ? "신규" : "기존",
    });
  });

  return items;
}

const KIND_ICON: Record<ResultKind, typeof Search> = {
  page: ArrowRight,
  account: BarChart3,
  kpi: Target,
};

const KIND_LABEL: Record<ResultKind, string> = {
  page: "페이지",
  account: "손익 항목",
  kpi: "KPI",
};

// 한글·영문 정규화 (대소문자·공백 무시)
function norm(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, "");
}

// hash 앵커 대상 탐색 — id 직접 부여(dataset 행) → data-slot-id(Card·NumberCell의
// evidence 슬롯 마커) → data-id(ReactFlow 노드·엣지) 순으로 조회
function findAnchorTarget(hash: string): Element | null {
  const esc = CSS.escape(hash);
  return (
    document.getElementById(hash) ??
    document.querySelector(`[data-slot-id="${esc}"]`) ??
    document.querySelector(`[data-id="${esc}"]`)
  );
}

// 라우팅 직후 대상 DOM이 mount될 때까지 rAF 폴링 후 scrollIntoView
// — 페이지 전환·lazy 렌더 시간 감안해 최대 3초까지 재시도.
// 목적지 pathname 도착 전에는 탐색하지 않음 (다른 페이지의 동일 마커 오작동 방지)
function scrollToAnchor(href: string, hash: string) {
  const deadline = Date.now() + 3000;
  const targetPath = href.split("#")[0] || "/";
  const tryScroll = () => {
    if (window.location.pathname === targetPath) {
      const el = findAnchorTarget(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    if (Date.now() < deadline) {
      requestAnimationFrame(tryScroll);
    }
  };
  requestAnimationFrame(tryScroll);
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
      // 빈 query: 페이지 + 대표 손익 항목
      return index
        .filter((i) => i.kind === "page")
        .concat(index.filter((i) => i.kind === "account").slice(0, 8));
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
    // hash 앵커는 대응 id가 없는 슬롯이 많아 native 점프가 무동작 →
    // 라우팅 후 대상 요소를 폴링으로 찾아 직접 스크롤
    if (item.hash) {
      scrollToAnchor(item.href, item.hash);
    }
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
            placeholder="손익 항목 · KPI 검색"
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
