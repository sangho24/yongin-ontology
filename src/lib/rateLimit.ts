// =============================================================================
// 로그인 시도 제한 — 인메모리 슬라이딩 카운터
//
// 서버리스(Vercel)에서는 인스턴스마다 메모리가 분리되고 재시작 시 초기화되므로
// 완전한 방어는 아니다. 자동화 도구의 단순 반복 시도를 늦추는 1차 방어선이며,
// 그 한계를 전제로 잠금 시간을 짧게(15분) 둔다.
// =============================================================================

const WINDOW_MS = 15 * 60 * 1000; // 실패 집계 구간 15분
const MAX_FAILURES = 5; // 이 횟수를 넘기면 잠금
const LOCK_MS = 15 * 60 * 1000; // 잠금 유지 15분
const MAX_ENTRIES = 2000; // 메모리 상한 (초과 시 만료 항목 정리)

type Entry = { failures: number; firstAt: number; lockedUntil: number };

const store = new Map<string, Entry>();

function sweep(now: number) {
  for (const [key, entry] of store) {
    if (entry.lockedUntil < now && now - entry.firstAt > WINDOW_MS) store.delete(key);
  }
}

/**
 * 요청 IP 추출.
 * x-forwarded-for 는 클라이언트가 위조할 수 있으므로 Vercel이 직접 채우는 헤더를 먼저 본다.
 * (위조된 XFF를 그대로 키로 쓰면 헤더만 바꿔가며 잠금을 회피할 수 있다)
 */
export function clientIp(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}

/** 현재 잠금 상태인지 확인 */
export function checkLock(key: string, now = Date.now()): { locked: boolean; retryAfterSec: number } {
  const entry = store.get(key);
  if (!entry) return { locked: false, retryAfterSec: 0 };
  if (entry.lockedUntil > now) {
    return { locked: true, retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  // 집계 구간이 지났으면 카운터 초기화
  if (now - entry.firstAt > WINDOW_MS) store.delete(key);
  return { locked: false, retryAfterSec: 0 };
}

/**
 * 로그인 실패 기록 — 임계치 초과 시 잠금.
 * maxFailures를 달리해 아이디 단위(엄격)와 IP 단위(느슨) 카운터를 함께 쓴다.
 */
export function recordFailure(
  key: string,
  now = Date.now(),
  maxFailures = MAX_FAILURES,
): { locked: boolean; remaining: number } {
  if (store.size > MAX_ENTRIES) sweep(now);

  const entry = store.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    store.set(key, { failures: 1, firstAt: now, lockedUntil: 0 });
    return { locked: false, remaining: maxFailures - 1 };
  }

  entry.failures += 1;
  if (entry.failures >= maxFailures) {
    entry.lockedUntil = now + LOCK_MS;
    return { locked: true, remaining: 0 };
  }
  return { locked: false, remaining: maxFailures - entry.failures };
}

/** IP 단위 임계치 — 아이디를 바꿔가며 시도하는 경우를 잡는다 */
export const MAX_FAILURES_PER_IP = 20;

/** 로그인 성공 시 카운터 해제 */
export function clearFailures(key: string) {
  store.delete(key);
}
