// =============================================================================
// 인증 공통 모듈 — 세션 토큰(JWT) 발급·검증
//
// 이 파일은 Edge runtime(proxy.ts)과 Node runtime(route handler) 양쪽에서
// import된다. 따라서 node:crypto 같은 Node 전용 API를 절대 여기서 쓰지 않는다.
// (비밀번호 해시 검증은 Node 전용인 lib/auth-users.ts가 담당)
// =============================================================================

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/** 세션 쿠키 이름 */
export const SESSION_COOKIE = "yp_session";

/** 기본 세션 수명 — 8시간 (업무 하루) */
export const SESSION_MAX_AGE = 60 * 60 * 8;

/** "로그인 상태 유지" 체크 시 세션 수명 — 14일 */
export const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 14;

const ISSUER = "yongin-park-bi";
const AUDIENCE = "yongin-park-bi/web";

export type SessionRole = "admin" | "viewer";

export type SessionUser = {
  /** 로그인 아이디 */
  id: string;
  /** 화면 표시명 */
  name: string;
  /** 소속 표시명 (사이드바 하단 노출) */
  org: string;
  role: SessionRole;
};

type SessionClaims = JWTPayload & {
  name?: string;
  org?: string;
  role?: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  // 약한 시크릿으로 서명된 토큰은 위조 가능 — fallback 없이 즉시 실패시킨다.
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET 환경변수가 없거나 32자 미만입니다. `node scripts/auth-tool.mjs secret` 로 생성해 설정하세요.",
    );
  }
  return new TextEncoder().encode(secret);
}

/** 로그인 성공 시 세션 토큰 발급 */
export async function createSessionToken(user: SessionUser, maxAgeSec: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ name: user.name, org: user.org, role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + maxAgeSec)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(secretKey());
}

/** 쿠키의 토큰을 검증 — 유효하지 않으면 null (throw하지 않음) */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify<SessionClaims>(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    if (!payload.sub || !payload.name) return null;
    return {
      id: payload.sub,
      name: payload.name,
      org: payload.org ?? "",
      role: payload.role === "admin" ? "admin" : "viewer",
    };
  } catch {
    // 만료·서명불일치·시크릿 미설정 전부 "비로그인"으로 처리
    return null;
  }
}

/**
 * 로그인 후 돌아갈 경로 검증 — open redirect 차단.
 * 같은 사이트의 절대경로(`/pl?x=1`)만 허용하고, `//evil.com`·`https://…`·`/\evil` 은 거절.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (raw.startsWith("/login")) return fallback;
  return raw;
}
