# 로그인 · 계정 관리

대시보드 전체를 아이디·비밀번호 인증 뒤에 둔다. SSO·소셜 로그인은 사용하지 않는다.

## 구성

| 파일 | 역할 |
|------|------|
| `src/proxy.ts` | 인증 게이트. 세션 쿠키 없으면 화면은 `/login`으로, API는 401로 차단 (Next 16의 `middleware.ts` 후속 규약) |
| `src/lib/auth.ts` | 세션 JWT 발급·검증. Edge·Node 양쪽에서 import되므로 Node 전용 API 사용 금지 |
| `src/lib/auth-users.ts` | `AUTH_USERS` 환경변수 파싱 + scrypt 비밀번호 검증 (Node 전용) |
| `src/lib/rateLimit.ts` | 로그인 시도 제한 (아이디 단위 5회 · IP 단위 20회 실패 → 15분 잠금) |
| `src/lib/session.ts` | 서버 컴포넌트에서 현재 세션 읽기 |
| `src/app/login/` | 로그인 화면 (`page.tsx` 서버 + `LoginForm.tsx` 클라이언트) |
| `src/app/api/auth/login`, `logout` | 인증 엔드포인트 |
| `scripts/auth-tool.mjs` | 시크릿·비밀번호 해시·계정 JSON 생성 도구 |

## 환경변수

| 키 | 설명 |
|----|------|
| `AUTH_SECRET` | 세션 JWT 서명 키. 32자 이상. 값이 바뀌면 기존 로그인 세션은 전부 무효화된다 |
| `AUTH_USERS` | 계정 목록 JSON 배열 (한 줄) |

로컬은 `.env.local`, 운영은 Vercel 프로젝트 Settings > Environment Variables 에 같은 키로 등록한다.
두 파일 모두 git에 올라가지 않는다 (`.gitignore`의 `.env*`).

### 계정 추가

```bash
node scripts/auth-tool.mjs user <아이디> <비밀번호> [표시명] [소속] [admin|viewer] [만료일 YYYY-MM-DD]
```

출력된 JSON 객체를 `AUTH_USERS` 배열에 추가한다. 예:

```
AUTH_USERS=[{"id":"admin",...},{"id":"yonginpark",...}]
```

- `expiresAt`을 넣으면 그 날짜(KST 23:59:59)가 지난 뒤 로그인이 거부된다. **시연용 계정에는 넣는 것을 권장** - 시연이 끝난 계정이 방치되지 않는다.
- `role`은 세션에 실리지만 현재 화면 권한은 두 역할이 동일하다. 메뉴를 나누게 되면 `useSessionUser()?.role`로 분기한다.
- 비밀번호를 바꾸려면 해시를 새로 만들어 해당 항목의 `hash`만 교체한다. 평문은 어디에도 저장하지 않는다.

### 시크릿 재발급

```bash
node scripts/auth-tool.mjs secret
```

## 해시 형식 주의

해시는 `scrypt.16384.8.1.<saltB64url>.<keyB64url>` 형식이다.
구분자로 `$`를 쓰면 Next의 env 로더(dotenv-expand)가 `$16384` 등을 변수로 확장해 해시가 조용히 파괴된다. 그래서 `.` 구분자 + base64url을 쓴다.

## 세션

- 쿠키 `yp_session` - HS256 서명 JWT, `httpOnly` · `sameSite=lax` · 운영에서는 `secure`
- 기본 8시간, "로그인 상태 유지" 체크 시 14일
- 만료·위조 쿠키는 게이트에서 삭제 후 로그인 화면으로 보낸다

## 로그인 시도 제한

- 아이디 단위: 15분 내 5회 실패 → 15분 잠금
- IP 단위: 15분 내 20회 실패 → 15분 잠금 (아이디를 바꿔가며 시도하는 경우를 잡는다)
- 요청 IP는 `x-vercel-forwarded-for` → `x-real-ip` → `x-forwarded-for` 순으로 읽는다. 클라이언트가 위조할 수 있는 XFF를 먼저 신뢰하면 헤더만 바꿔 잠금을 회피할 수 있다.

한계: Vercel 서버리스는 인스턴스마다 메모리가 분리되고 재시작 시 초기화되므로, 이 카운터는 자동화 도구의 단순 반복 시도를 늦추는 1차 방어선이다. 더 강한 차단이 필요하면 Vercel WAF 또는 외부 저장소(KV/Redis) 기반 카운터로 옮긴다.

로컬에서 잠금을 즉시 풀려면 dev 서버를 재시작한다(카운터는 프로세스 메모리에만 있다).

## 게이트 정규식 주의

`proxy.ts`의 matcher에서 정적 파일 제외는 `[^/]+\.(png|jpg|…)$` - **루트 한 단계로 한정**해야 한다.
`.*\.png$`로 두면 `/dept/anything.png` 같은 하위 경로가 통째로 게이트를 빠져나간다.

## 남은 위험 - 정적 번들의 재무 데이터

현재 재무 수치는 `src/data/*.json`이 클라이언트 번들에 포함되는 구조다. 로그인은 화면 접근을 막지만, 번들 청크(`/_next/static/chunks/...`)는 인증 게이트의 matcher에서 제외돼 있어 URL을 아는 사람은 우회 접근이 가능하다.

실제 기밀 보호가 필요해지면 재무 JSON을 서버 라우트 뒤로 옮기고 화면이 fetch하도록 바꿔야 한다. 시연·내부 공유 수준에서는 현재 구성으로 충분하다.
