"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/lib/auth";

// =============================================================================
// 로그인 사용자 context — 서버(layout)에서 읽은 세션을 client 컴포넌트에 전달
// (AppLayout 헤더의 사용자 칩 등에서 소비)
// =============================================================================

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSessionUser(): SessionUser | null {
  return useContext(SessionContext);
}

/** 아바타용 이니셜 — 한글은 첫 글자, 영문은 성·이름 머리글자 */
export function initialsOf(user: SessionUser): string {
  const name = (user.name || user.id).trim();
  if (!name) return "?";
  if (/^[A-Za-z]/.test(name)) {
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return name.charAt(0);
}
