"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

const ACTS = [
  { path: "/", label: "Intro", num: "0" },
  { path: "/act1-life-bi", label: "Act 1 — 라이프 BI", num: "1" },
  { path: "/act2-zone-bi", label: "Act 2 — 장지 BI", num: "2" },
  { path: "/act3-tbox", label: "Act 3 — T-Box ★", num: "3" },
  { path: "/act4-reuse", label: "Act 4 — 재사용성", num: "4" },
];

export function ActLayout({ children, narration }: { children: ReactNode; narration?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const idx = ACTS.findIndex((a) => a.path === pathname);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && idx < ACTS.length - 1) router.push(ACTS[idx + 1].path);
      if (e.key === "ArrowLeft" && idx > 0) router.push(ACTS[idx - 1].path);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, router]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500">용인공원 그룹 · 온톨로지 시연 v0.1</span>
          </div>
          <nav className="flex items-center gap-1">
            {ACTS.map((a) => {
              const active = pathname === a.path;
              return (
                <Link
                  key={a.path}
                  href={a.path}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {a.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">{children}</div>
          {narration && (
            <aside className="hidden lg:block">
              <div className="sticky top-6 rounded-lg border bg-white p-4 text-sm text-slate-600">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Narration</div>
                {narration}
                <div className="mt-4 text-xs text-slate-400">← → 키로 이동</div>
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
