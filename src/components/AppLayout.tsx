"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

const NAV: { group: string; items: { path: string; label: string; sub?: string; badge?: string }[] }[] = [
  {
    group: "ANALYSIS",
    items: [
      { path: "/", label: "Overview" },
      { path: "/mutual", label: "상조 VC", sub: "라이프 · 회원 master" },
      { path: "/cemetery", label: "장지 VC", sub: "용인공원·YPL · 객체 master" },
      { path: "/root-cause", label: "Root Cause", sub: "원인 분해" },
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
        <div className="flex h-16 items-center gap-2.5 border-b border-stone-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#0095A9] text-[10px] font-semibold text-white tracking-wider">
            YP
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-tight text-stone-900">용인공원 그룹</div>
            <div className="text-[10px] tracking-[0.08em] text-stone-400 uppercase mt-0.5">Cost Mgmt BI</div>
          </div>
        </div>

        <nav className="px-3 py-5">
          {NAV.map((group) => (
            <div key={group.group} className="mb-6">
              <div className="px-2 pb-2 text-[11px] font-semibold tracking-[0.14em] text-stone-400">
                {group.group}
              </div>
              <div className="space-y-px">
                {group.items.map((item) => {
                  const active = pathname === item.path;
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
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-stone-200/80 bg-[#fafaf7]/85 px-10 backdrop-blur-md">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[18px] font-semibold tracking-tight text-stone-900">
              {pageTitle ?? current?.label}
            </h2>
            {current?.sub && (
              <span className="text-[12px] text-stone-400">— {current.sub}</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="text-stone-500">
              <span className="text-stone-400">Period</span>
              <span className="ml-1.5 font-medium text-stone-700 tnum">FY 2025</span>
            </div>
            <div className="h-3 w-px bg-stone-200" />
            <div className="text-stone-500">v0.1</div>
          </div>
        </header>

        <main className="px-10 py-10">
          <div className="grid gap-10 xl:grid-cols-[1fr_260px]">
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
