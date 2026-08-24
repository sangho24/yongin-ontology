// =============================================================================
// 계정 저장소 — 환경변수(AUTH_USERS) 기반, Node runtime 전용
//
// DB 없이 소수 계정을 운영한다. 비밀번호는 scrypt 해시로만 저장하며 평문은
// 어디에도 두지 않는다. 계정 추가·해시 생성은 scripts/auth-tool.mjs 참고.
//
// AUTH_USERS 형식 (JSON 배열, 한 줄):
//   [{"id":"admin","name":"관리자","org":"PwC","role":"admin",
//     "hash":"scrypt.16384.8.1.<saltB64url>.<keyB64url>","expiresAt":"2026-12-31"}]
//   - expiresAt 은 선택값(YYYY-MM-DD). 지난 계정은 로그인 거부 → 시연 계정 방치 방지
// =============================================================================

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { SessionUser } from "./auth";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem?: number },
) => Promise<Buffer>;

const KEY_LEN = 32;

type StoredUser = SessionUser & {
  hash: string;
  /** YYYY-MM-DD — 지나면 로그인 거부 */
  expiresAt?: string;
};

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: "invalid" | "expired" | "misconfigured" };

let cache: { raw: string; users: StoredUser[] } | null = null;

/** AUTH_USERS 파싱 (환경변수 문자열이 바뀌지 않으면 캐시 재사용) */
function loadUsers(): StoredUser[] {
  const raw = process.env.AUTH_USERS?.trim();
  if (!raw) return [];
  if (cache && cache.raw === raw) return cache.users;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("[auth] AUTH_USERS JSON 파싱 실패 — 로그인 전면 차단됨");
    return [];
  }
  if (!Array.isArray(parsed)) {
    console.error("[auth] AUTH_USERS 는 JSON 배열이어야 합니다");
    return [];
  }

  const users: StoredUser[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || typeof e.hash !== "string") continue;
    users.push({
      id: e.id.trim().toLowerCase(),
      name: typeof e.name === "string" && e.name ? e.name : e.id,
      org: typeof e.org === "string" ? e.org : "",
      role: e.role === "admin" ? "admin" : "viewer",
      hash: e.hash,
      expiresAt: typeof e.expiresAt === "string" ? e.expiresAt : undefined,
    });
  }
  cache = { raw, users };
  return users;
}

/**
 * scrypt 해시 문자열 파싱 — `scrypt.N.r.p.salt.key`
 * 구분자로 `$`를 쓰면 .env 로더(dotenv-expand)가 `$16384` 등을 변수로 확장해
 * 해시를 파괴한다. 그래서 `.` 구분자 + base64url 인코딩을 쓴다.
 */
function parseHash(hash: string) {
  const parts = hash.split(".");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return null;
  try {
    return { N, r, p, salt: Buffer.from(parts[4], "base64url"), key: Buffer.from(parts[5], "base64url") };
  } catch {
    return null;
  }
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parsed = parseHash(hash);
  if (!parsed) return false;
  const derived = await scrypt(password, parsed.salt, parsed.key.length || KEY_LEN, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    // N=16384, r=8 기준 기본 maxmem(32MB)을 넘지 않지만 여유를 둔다
    maxmem: 128 * 1024 * 1024,
  });
  if (derived.length !== parsed.key.length) return false;
  return timingSafeEqual(derived, parsed.key);
}

/** 존재하지 않는 아이디도 같은 비용을 쓰게 해서 아이디 존재 여부가 응답시간으로 새지 않게 한다 */
async function dummyWork(password: string): Promise<void> {
  await scrypt(password, randomBytes(16), KEY_LEN, { N: 16384, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
}

function isExpired(user: StoredUser, now: Date): boolean {
  if (!user.expiresAt) return false;
  const t = Date.parse(`${user.expiresAt}T23:59:59+09:00`);
  if (!Number.isFinite(t)) return false;
  return now.getTime() > t;
}

/** 아이디·비밀번호 검증 */
export async function authenticate(id: string, password: string, now = new Date()): Promise<AuthResult> {
  const users = loadUsers();
  if (users.length === 0) {
    await dummyWork(password);
    return { ok: false, reason: "misconfigured" };
  }

  const user = users.find((u) => u.id === id.trim().toLowerCase());
  if (!user) {
    await dummyWork(password);
    return { ok: false, reason: "invalid" };
  }

  const passwordOk = await verifyPassword(password, user.hash);
  if (!passwordOk) return { ok: false, reason: "invalid" };
  if (isExpired(user, now)) return { ok: false, reason: "expired" };

  return { ok: true, user: { id: user.id, name: user.name, org: user.org, role: user.role } };
}
