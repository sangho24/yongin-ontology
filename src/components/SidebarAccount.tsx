"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import type { SessionUser } from "@/lib/auth";

// =============================================================================
// 사이드바 하단 계정 영역 — 로그인 사용자 표시 + 로그아웃
// =============================================================================

export function SidebarAccount({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 네트워크 실패여도 로그인 화면으로 보낸다 (쿠키는 서버 검증에서 재차 확인)
    }
    router.replace("/login");
    router.refresh();
  }

  const initial = (user.name || user.id).trim().charAt(0);

  return (
    <div className="no-print border-t border-stone-100 px-3 py-3">
      <div className="flex items-center gap-2.5 px-2 pb-2">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e6f4f6] text-[12px] font-semibold text-[#007a8c]">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium tracking-tight text-stone-700">
            {user.name}
          </div>
          {user.org && <div className="truncate text-[11px] text-stone-400">{user.org}</div>}
        </div>
      </div>

      <button
        type="button"
        onClick={logout}
        disabled={pending}
        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-[12.5px] font-medium text-stone-500 [transition:background-color_120ms_ease,color_120ms_ease] hover:bg-stone-100 hover:text-stone-800 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {pending ? "로그아웃 중" : "로그아웃"}
      </button>
    </div>
  );
}
