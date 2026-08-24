// =============================================================================
// 인증 게이트 (Next 16 proxy 규약 — 구 middleware.ts)
//
// 세션 쿠키가 없거나 유효하지 않으면
//   - 화면 요청 → /login?next=<원래경로> 로 리다이렉트
//   - API 요청  → 401 JSON
// 로 차단한다. 통과 대상(로그인 화면·인증 API·정적 자산)은 config.matcher에서 제외.
// =============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // 세션 정보를 헤더로 흘리지 않는다 — 다운스트림은 lib/session.ts 로 쿠키를 직접 검증한다.
  // (헤더로 신원을 전달하면 나중에 그 헤더를 신뢰하는 코드가 생겼을 때 위조 표면이 된다)
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "unauthorized", message: "로그인이 필요합니다." },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);

  const response = NextResponse.redirect(loginUrl);
  // 만료·위조 쿠키가 남아 리다이렉트 루프를 만들지 않도록 정리
  if (token) response.cookies.delete(SESSION_COOKIE);
  response.headers.set("cache-control", "no-store");
  return response;
}

export const config = {
  matcher: [
    // 아래를 제외한 모든 경로를 보호한다.
    //   login, login/*  — 로그인 화면
    //   api/auth/*      — 로그인·로그아웃 엔드포인트
    //   _next/*         — 프레임워크 정적 자산
    //   /<파일>.<확장자> — public/ 최상단의 이미지·아이콘 (로그인 화면 배경 포함)
    //
    // 확장자 제외를 `[^/]+\.` 로 루트 한 단계에 한정하는 것이 핵심이다.
    // `.*\.png$` 로 두면 `/dept/anything.png` 같은 하위 경로까지 게이트를 빠져나간다.
    "/((?!login(?:/|$)|api/auth/|_next/|[^/]+\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|webmanifest|woff|woff2)$).*)",
  ],
};
