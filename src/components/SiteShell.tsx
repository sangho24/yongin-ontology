"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Database,
  FolderOpen,
  Search,
  type LucideIcon,
} from "lucide-react";
import { SearchPalette } from "./SearchPalette";
import { TourOverlay } from "./TourOverlay";

// =============================================================================
// SiteShell — 영구 mount되는 사이트 셸 (sidebar + 검색)
// app/layout.tsx에서 children을 wrap. 페이지 전환에도 sidebar는 unmount되지 않음.
// 페이지 자체는 AppLayout (header + main + narration)을 호출하여 자기 헤더·본문 담당.
// =============================================================================

const ICON_MAP: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/mutual": Users,
  "/cemetery": MapPin,
  "/data-model": Database,
  "/data-catalog": FolderOpen,
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
    items: [
      { path: "/data-model", label: "Data Model", sub: "T-Box · RFI", badge: "★" },
      { path: "/data-catalog", label: "Data Catalog", sub: "수령 자료 인벤토리" },
    ],
  },
];

const FLAT = NAV.flatMap((g) => g.items);

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  // /dept/[id] 같은 dynamic 경로는 NAV에 없음 — startsWith로 가장 긴 매칭 우선
  const activeIdx = (() => {
    let best = -1;
    let bestLen = -1;
    FLAT.forEach((a, i) => {
      if (a.path === "/" ? pathname === "/" : pathname?.startsWith(a.path)) {
        if (a.path.length > bestLen) {
          best = i;
          bestLen = a.path.length;
        }
      }
    });
    return best;
  })();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K — 검색 모달
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "ArrowRight" || e.key === "j") && activeIdx >= 0 && activeIdx < FLAT.length - 1) {
        router.push(FLAT[activeIdx + 1].path);
      }
      if ((e.key === "ArrowLeft" || e.key === "k") && activeIdx > 0) {
        router.push(FLAT[activeIdx - 1].path);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIdx, router]);

  return (
    <div className="min-h-screen bg-[#fafaf7] text-stone-900">
      {/* Sidebar — 영구 mount */}
      <aside className="fixed inset-y-0 left-0 z-20 w-56 border-r border-stone-200/80 bg-white">
        <div className="flex h-16 items-center border-b border-stone-100 px-4">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="용인공원 그룹 BI 홈"
          >
            <Image
              src="/logo.png"
              alt="용인공원"
              width={520}
              height={200}
              priority
              className="h-7 w-auto shrink-0 object-contain"
            />
            <span className="whitespace-nowrap text-[12px] font-semibold tracking-tight text-stone-700">
              용인공원 그룹 BI
            </span>
          </Link>
        </div>

        <nav className="px-3 py-5" data-tour-id="sidebar-nav">
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
                  const active = item.path === "/" ? pathname === "/" : pathname?.startsWith(item.path) ?? false;
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
          <div className="mt-1 text-[11px] text-stone-500">← → 또는 j / k · ⌘K 검색</div>
        </div>
      </aside>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* 시연용 가이드 모드 — 영구 mount, 첫 진입 시 자동 발동 / "?" 버튼으로 재시작 */}
      <TourOverlay />

      {/* Main 영역 — 페이지의 AppLayout이 header + main을 채움
          relative + isolate로 stacking context 격리 → page transition 시
          fixed sidebar(z-20) 위로 페이지 콘텐츠가 겹치는 frame 차단.
          min-w-0은 grid/flex child의 의도치 않은 width overflow 차단. */}
      <div className="relative isolate ml-56 min-w-0">{children}</div>
    </div>
  );
}

// 페이지 내에서 ⌘K 검색 박스 (헤더 검색 input)에 클릭 핸들러 연결할 때 사용
export function useSearchPalette() {
  // SiteShell 내부 state라 외부에서 직접 열 수 없음 — 단축키 ⌘K로 항상 열림
  // (헤더 검색 박스 클릭은 페이지 헤더에서 직접 keydown event dispatch)
  return {
    open: () => {
      // 시뮬레이션: ⌘K 키 이벤트 dispatch
      const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
      window.dispatchEvent(ev);
    },
  };
}
