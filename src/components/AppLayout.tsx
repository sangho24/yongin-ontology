"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Search, HelpCircle } from "lucide-react";
import { useSearchPalette } from "./SiteShell";
import { startTour } from "./TourOverlay";

// =============================================================================
// AppLayout — 페이지 헤더 + main + narration
// Sidebar는 SiteShell (app/layout.tsx)이 영구 mount. 페이지 전환에도 unmount X.
// 페이지마다 자기 title/subtitle/narration을 props로 전달.
// =============================================================================

export function AppLayout({
  children,
  pageTitle,
  pageSubtitle,
  narration,
}: {
  children: ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  narration?: ReactNode;
}) {
  const search = useSearchPalette();

  return (
    <>
      {/* z-10: sidebar(z-20)보다 낮게 유지 → page transition 시에도 sidebar 가림 방지 */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-6 border-b border-stone-200/80 bg-[#fafaf7]/85 px-12 backdrop-blur-md">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="truncate text-[18px] font-semibold tracking-tight text-stone-900">
            {pageTitle ?? ""}
          </h2>
        </div>

        {/* 중앙: 검색 — 클릭 또는 ⌘K로 SearchPalette 열림 · 옆에 가이드 모드 "?" 버튼 */}
        <div className="hidden flex-1 items-center justify-center gap-2 md:flex" data-tour-id="search">
          <button
            type="button"
            onClick={() => search.open()}
            aria-label="검색 열기 (⌘K)"
            className="group relative flex h-9 w-72 items-center rounded-md border border-stone-200 bg-white/60 pl-9 pr-14 text-left text-[12px] text-stone-500 transition-colors hover:border-stone-300 hover:bg-white"
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400 group-hover:text-stone-500"
              strokeWidth={2}
            />
            <span className="truncate">구역·계정·KPI·자료 검색</span>
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-stone-500">
              ⌘K
            </kbd>
          </button>
          {/* 가이드 모드 재시작 */}
          <button
            type="button"
            onClick={() => startTour()}
            aria-label="가이드 모드 시작"
            title="가이드 모드"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 bg-white/60 text-stone-500 transition-colors hover:border-[#0095A9]/40 hover:bg-white hover:text-[#0095A9]"
          >
            <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* 우측: Period · v0.1 · user */}
        <div className="flex shrink-0 items-center gap-4 text-[11px]">
          <div className="text-stone-500">
            <span className="text-stone-400">Period</span>
            <span className="ml-1.5 font-medium text-stone-700 tnum">FY 2025</span>
          </div>
          <div className="hidden h-3 w-px bg-stone-200 sm:block" />
          <div className="hidden text-stone-500 sm:block">v0.1</div>
          <div className="h-3 w-px bg-stone-200" />
          <div className="flex items-center gap-2">
            <div className="hidden text-right leading-tight md:block">
              <div className="text-[11px] font-medium text-stone-700">Sangho Eum</div>
              <div className="text-[10px] text-stone-400">PwC</div>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-[11px] font-medium text-stone-600">
              SE
            </div>
          </div>
        </div>
      </header>

      <main className="px-12 py-10">
        <div className="grid gap-12 xl:grid-cols-[1fr_260px]">
          <div className="min-w-0 fade-in">
            {pageSubtitle && (
              <p className="mb-8 max-w-3xl text-[14px] leading-relaxed text-stone-600">{pageSubtitle}</p>
            )}
            {children}
          </div>
          {narration && (
            <aside className="hidden xl:block">
              <div className="sticky top-24 border-l border-stone-300 pl-4">
                <div className="text-[11px] font-semibold tracking-[0.14em] text-stone-400">
                  NOTES
                </div>
                <div className="mt-2.5 space-y-2 text-[12px] leading-relaxed text-stone-600">
                  {narration}
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}

// =============================================================
// SubNav — 페이지 내부 섹션 점프 (sticky horizontal tab)
// AppLayout과는 독립. 페이지에서 직접 import 하여 사용.
// =============================================================

export type SubNavItem = { id: string; label: string; href?: string };

interface SubNavProps {
  items: SubNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

export function SubNav({ items, activeId, onSelect, className }: SubNavProps) {
  // SubNav 기본 동작: button 클릭 시 해당 id의 섹션으로 anchor scroll
  // onSelect 외부에서 override하면 그것만 호출
  const handleSelect = (id: string) => {
    if (onSelect) {
      onSelect(id);
      return;
    }
    if (typeof document !== "undefined") {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <div
      className={`sticky top-16 z-[5] -mx-12 border-b border-stone-200/80 bg-[#fafaf7]/85 px-12 backdrop-blur-md ${
        className ?? ""
      }`}
    >
      <nav className="flex items-center gap-1 overflow-x-auto" aria-label="섹션 탐색">
        {items.map((item) => {
          const active = item.id === activeId;
          const baseCls = `relative whitespace-nowrap px-3 py-3 text-[12.5px] font-medium tracking-tight transition-colors ${
            active
              ? "text-stone-900"
              : "text-stone-500 hover:text-stone-800"
          }`;
          const underline = (
            <span
              className={`pointer-events-none absolute inset-x-2 -bottom-px h-[2px] rounded-full transition-opacity ${
                active ? "bg-[#0095A9] opacity-100" : "opacity-0"
              }`}
            />
          );

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={baseCls}
                onClick={() => onSelect?.(item.id)}
              >
                {item.label}
                {underline}
              </Link>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={baseCls}
            >
              {item.label}
              {underline}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
