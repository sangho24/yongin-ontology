#!/usr/bin/env node
// =============================================================================
// 인증 설정 도구 — 시크릿 생성 / 비밀번호 해시 생성
//
//   node scripts/auth-tool.mjs secret
//     → AUTH_SECRET 용 랜덤 문자열 출력
//
//   node scripts/auth-tool.mjs hash <비밀번호>
//     → scrypt.N.r.p.salt.key 형식 해시 출력
//       (구분자로 `$`를 쓰면 .env 로더의 변수 확장에 먹히므로 `.` + base64url 사용)
//
//   node scripts/auth-tool.mjs user <아이디> <비밀번호> [표시명] [소속] [role] [만료일]
//     → AUTH_USERS 에 넣을 JSON 항목 한 개 출력 (role: admin | viewer)
//
// 출력된 값은 .env.local(로컬) 또는 Vercel 프로젝트 환경변수에만 넣는다.
// 비밀번호 평문은 어디에도 저장하지 않는다.
// =============================================================================

import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 32;

async function makeHash(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LEN, { N, r: R, p: P, maxmem: 128 * 1024 * 1024 });
  return `scrypt.${N}.${R}.${P}.${salt.toString("base64url")}.${key.toString("base64url")}`;
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "secret": {
    console.log(randomBytes(48).toString("base64url"));
    break;
  }

  case "hash": {
    const password = args[0];
    if (!password) {
      console.error("사용법: node scripts/auth-tool.mjs hash <비밀번호>");
      process.exit(1);
    }
    console.log(await makeHash(password));
    break;
  }

  case "user": {
    const [id, password, name, org, role, expiresAt] = args;
    if (!id || !password) {
      console.error(
        "사용법: node scripts/auth-tool.mjs user <아이디> <비밀번호> [표시명] [소속] [admin|viewer] [YYYY-MM-DD]",
      );
      process.exit(1);
    }
    const entry = {
      id: id.toLowerCase(),
      name: name || id,
      org: org || "",
      role: role === "admin" ? "admin" : "viewer",
      hash: await makeHash(password),
    };
    if (expiresAt) entry.expiresAt = expiresAt;
    console.log(JSON.stringify(entry));
    break;
  }

  default:
    console.error(
      [
        "명령을 지정하세요.",
        "  node scripts/auth-tool.mjs secret",
        "  node scripts/auth-tool.mjs hash <비밀번호>",
        "  node scripts/auth-tool.mjs user <아이디> <비밀번호> [표시명] [소속] [admin|viewer] [YYYY-MM-DD]",
      ].join("\n"),
    );
    process.exit(1);
}
