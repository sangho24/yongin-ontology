// =============================================================================
// 서버 컴포넌트에서 현재 세션 읽기 — next/headers 사용(서버 전용)
// =============================================================================

import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken, type SessionUser } from "./auth";

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
