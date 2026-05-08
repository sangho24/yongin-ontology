"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Database,
  Search,
  type LucideIcon,
} from "lucide-react";

// 경로별 아이콘 매핑 (Dribbble Shopeers 톤)
// Root Cause는 사이드바에서 제거 — 각 VC 페이지의 SubNav 하위 기능으로 통합
const ICON_MAP: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/mutual": Users,
  "/cemetery": MapPin,
  "/data-model": Database,
};

const NAV: { group: string; items: { path: string; label: string; sub?: string; badge?: string }[] }[] = [
  {
    group: "ANALYSIS",
    items: [
      { path: "/", label: "Overview" },
      { path: "/mutual", label: "상조 VC", sub: "라이프 · 회원 master" },
      { path: "/cemetery", label: "장지 VC", sub: "용인공원·YPL · 객체 master" },
    ],
  },
  {
    group: "META",
    items: [{ path: "/data-model", label: "Data Model", sub: "T-Box · RFI", badge: "★" }],
  },
];

const FLAT = NAV.flatMap((g) => g.items);

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
  const pathname = usePathname();
  const router = useRouter();
  const idx = FLAT.findIndex((a) => a.path === pathname);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "ArrowRight" || e.key === "j") && idx < FLAT.length - 1) router.push(FLAT[idx + 1].path);
      if ((e.key === "ArrowLeft" || e.key === "k") && idx > 0) router.push(FLAT[idx - 1].path);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, router]);

  const current = FLAT[idx];

  return (
    <div className="min-h-screen bg-[#fafaf7] text-stone-900">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 w-56 border-r border-stone-200/80 bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-stone-100 px-5">
          <Link href="/" className="flex items-center gap-3" aria-label="용인공원 그룹 홈">
            <Image
              src="/logo.png"
              alt="용인공원 YONGIN MEMORIAL PARK"
              width={36}
              height={36}
              priority
              className="h-9 w-auto object-contain"
            />
            <div className="leading-tight">
              <div className="text-[12px] font-semibold tracking-tight text-stone-900">용인공원 그룹</div>
              <div className="text-[10px] tracking-[0.08em] text-stone-400 uppercase mt-0.5">Cost Mgmt BI</div>
            </div>
          </Link>
        </div>

        <nav className="px-3 py-5">
          {NAV.map((group, gIdx) => (
            <div
              key={group.group}
              className={`mb-8 ${gIdx > 0 ? "border-t border-stone-100 pt-4" : ""}`}
            >
              <div className="px-2 pb-2 text-[11px] font-semibold tracking-[0.14em] text-stone-400">
                {group.group}
              </div>
              <div className="space-y-px">
                {group.items.map((item) => {
                  const active = pathname === item.path;
                  const Icon = ICON_MAP[item.path];
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`group flex items-center justify-between rounded-sm px-3 py-2 text-[13px] transition-colors ${
                        active
                          ? "bg-[#0095A9] text-white"
                          : "text-stone-600 hover:bg-[#e6f4f6] hover:text-stone-900"
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        {Icon && (
                          <Icon
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              active ? "text-white" : "text-stone-500 group-hover:text-stone-700"
                            }`}
                            strokeWidth={1.75}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium tracking-tight">{item.label}</span>
                            {item.badge && (
                              <span className={`text-[10px] ${active ? "text-[#b3dde0]" : "text-[#0095A9]"}`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.sub && (
                            <div className={`mt-0.5 text-[11px] truncate ${active ? "text-[#b3dde0]" : "text-stone-400"}`}>
                              {item.sub}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-stone-100 px-5 py-3">
          <div className="text-[10px] tracking-[0.1em] text-stone-400 uppercase">Navigation</div>
          <div className="mt-1 text-[11px] text-stone-500">← → 또는 j / k</div>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-56">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-6 border-b border-stone-200/80 bg-[#fafaf7]/85 px-12 backdrop-blur-md">
          <div className="flex min-w-0 items-baseline gap-3">
            <h2 className="truncate text-[18px] font-semibold tracking-tight text-stone-900">
              {pageTitle ?? current?.label}
            </h2>
            {current?.sub && (
              <span className="hidden truncate text-[12px] text-stone-400 lg:inline">— {current.sub}</span>
            )}
          </div>

          {/* 중앙: 검색 (UI placeholder) */}
          <div className="hidden flex-1 justify-center md:flex">
            <div className="group relative w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
                strokeWidth={2}
              />
              <input
                type="text"
                readOnly
                placeholder="구역·계정·KPI 검색"
                aria-label="검색"
                className="h-9 w-full rounded-md border border-stone-200 bg-white/60 pl-9 pr-14 text-[12px] text-stone-700 placeholder:text-stone-400 focus:border-[#65B3B1] focus:outline-none focus:ring-2 focus:ring-[#0095A9]/15"
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-stone-500">
                ⌘K
              </kbd>
            </div>
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
      </div>
    </div>
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
