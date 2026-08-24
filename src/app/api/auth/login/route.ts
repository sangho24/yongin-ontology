// =============================================================================
// POST /api/auth/login — 아이디·비밀번호 로그인
//
// scrypt 검증이 필요하므로 Node runtime 고정. 실패 사유는 클라이언트에 구체적으로
// 알려주지 않는다(아이디 존재 여부 노출 방지). 계정 만료만 예외적으로 구분해
// 안내한다 — 시연 계정이 끝난 것을 사용자가 알 수 있어야 하기 때문.
// =============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SESSION_MAX_AGE_REMEMBER,
  createSessionToken,
  safeNextPath,
} from "@/lib/auth";
import { authenticate } from "@/lib/auth-users";
import {
  MAX_FAILURES_PER_IP,
  checkLock,
  clearFailures,
  clientIp,
  recordFailure,
} from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  id: z.string().min(1).max(64),
  password: z.string().min(1).max(200),
  remember: z.boolean().optional().default(false),
  next: z.string().max(512).optional(),
});

const GENERIC_ERROR = "아이디 또는 비밀번호가 올바르지 않습니다.";

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

/** 폼 POST 위조(CSRF) 차단 — 같은 오리진에서 온 요청만 허용 */
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return json({ error: "bad_origin", message: "잘못된 요청입니다." }, 403);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "bad_request", message: "잘못된 요청입니다." }, 400);
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: "bad_request", message: "아이디와 비밀번호를 입력하세요." }, 400);
  }
  const { id, password, remember } = parsed.data;

  const ip = clientIp(request.headers);
  // 아이디 단위(5회)와 IP 단위(20회) 두 카운터를 함께 본다.
  // 아이디 단위만 두면 아이디를 바꿔가며 같은 IP에서 무한히 시도할 수 있다.
  const accountKey = `${ip}:${id.trim().toLowerCase()}`;
  const ipKey = `ip:${ip}`;

  const lock = checkLock(accountKey);
  const ipLock = checkLock(ipKey);
  if (lock.locked || ipLock.locked) {
    const retryAfterSec = Math.max(lock.retryAfterSec, ipLock.retryAfterSec);
    const minutes = Math.ceil(retryAfterSec / 60);
    return json(
      {
        error: "locked",
        message: `로그인 시도가 많습니다. ${minutes}분 후 다시 시도하세요.`,
      },
      429,
    );
  }

  const result = await authenticate(id, password);

  if (!result.ok) {
    const failure = recordFailure(accountKey);
    const ipFailure = recordFailure(ipKey, Date.now(), MAX_FAILURES_PER_IP);
    console.warn(
      JSON.stringify({ evt: "auth.login.fail", id: id.slice(0, 32), ip, reason: result.reason, at: new Date().toISOString() }),
    );
    if (result.reason === "expired") {
      return json({ error: "expired", message: "사용 기간이 만료된 계정입니다. 담당자에게 문의하세요." }, 403);
    }
    if (result.reason === "misconfigured") {
      // 서버 설정 문제 — 사용자에게는 일반 메시지, 로그에는 원인
      console.error("[auth] AUTH_USERS 미설정 상태에서 로그인 시도됨");
      return json({ error: "unavailable", message: "로그인을 처리할 수 없습니다. 담당자에게 문의하세요." }, 503);
    }
    const locked = failure.locked || ipFailure.locked;
    return json(
      {
        error: "invalid",
        message: locked ? "로그인 시도가 많습니다. 15분 후 다시 시도하세요." : GENERIC_ERROR,
      },
      locked ? 429 : 401,
    );
  }

  clearFailures(accountKey);
  clearFailures(ipKey);

  const maxAge = remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE;
  const token = await createSessionToken(result.user, maxAge);

  console.info(
    JSON.stringify({ evt: "auth.login.ok", id: result.user.id, ip, remember, at: new Date().toISOString() }),
  );

  const response = json(
    { ok: true, next: safeNextPath(parsed.data.next), user: { id: result.user.id, name: result.user.name } },
    200,
  );
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return response;
}
