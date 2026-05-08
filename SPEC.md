# 용인공원 그룹 BI · 작업 SPEC (subagent 공통 참고)

이 문서는 모든 subagent가 작업 시작 전에 읽어야 하는 공통 spec입니다.
프로젝트 포지셔닝·디자인 정책·디렉토리 규칙·기존 자산을 정리.

## 0. 핵심 포지셔닝 (CLAUDE.md 보강)

- **CEO·부서장이 매일 켜서 쓰는 운영 BI 도구** (보고서 PDF 아님)
- **AX/DX 컨설팅 reference 사례**로 보존 — 외부 노출 가능 수준의 완성도
- 미합의·미완성 흔적 노출 금지
- 디자인이 곧 기능

## 1. 디렉토리 규칙

```
src/
  app/                   페이지 (App Router)
    page.tsx             Overview
    mutual/page.tsx      상조 VC
    cemetery/page.tsx    장지 VC
    root-cause/page.tsx  Root Cause
    data-model/page.tsx  Data Model (T-Box)
  components/
    AppLayout.tsx        사이드바·top bar (모든 페이지 wrapping)
    Card.tsx             Card / StatCard / WowCard / InsightBox / SourceCaption
    TBoxNode.tsx
    NumberCell.tsx       (Phase 1A 신규)
    LineagePanel.tsx     (Phase 1A 신규)
    ActivityCostExplorer.tsx  (Phase 2 신규)
    controls/
      ZoneSelector.tsx   (Phase 1B 신규)
      PeriodToggle.tsx   (Phase 1B 신규)
      FinanceActions.tsx (Phase 1B 신규)
  data/                  JSON mock data
    dept_kpi.json
    life_kpi.json        상조 회원 KPI
    zone_kpi.json        장지 묘역 KPI
    tbox.json            T-Box (의미층)
    activity_cost.json   (Phase 0 신규) 구역별 활동원가
  lib/
    format.ts            autoUnit·formatKRW·formatPct
  types/
    index.ts             도메인 타입
```

## 2. 색상 시스템 (절대 변경 금지)

`src/app/globals.css`의 CSS 변수 사용.

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--bg` | `#fafaf7` | 페이지 배경 (warm off-white) |
| `--surface` | `#ffffff` | 카드 배경 |
| `--surface-2` | `#f5f5f0` | 보조 배경 |
| `--line` | `#e7e5dc` | 기본 라인 |
| `--text` ~ `--text-4` | stone 계열 | 텍스트 4단계 |
| `--teal` | `#0095A9` | brand main (mint deep) |
| `--teal-2` | `#65B3B1` | brand mid |
| `--teal-deep` | `#007a8c` | hover/dark accent |
| `--teal-soft` | `#e6f4f6` | very light bg |
| `--teal-soft-2` | `#ccebee` | mid light |
| `--teal-line` | `#b3dde0` | border |
| `--warn` | `#b45309` | amber-800 (절제된 주의) |
| `--bad` | `#9a3412` | brick (절제된 위험) |
| `--ok` | `#0095A9` | = teal |

색상은 hex로 직접 적기보다 가능하면 토큰 표기 (`bg-[#0095A9]` 식의 기존 패턴 유지 OK).

## 3. 타이포그래피

- 폰트: **Pretendard Variable** (이미 적용됨)
- 기본 letter-spacing: `-0.01em` (body)
- Headline: `letter-spacing: -0.025em`, weight 600
- 숫자: `tnum` 클래스 (tabular-nums)

## 4. Spacing 정책 — AI 티 방지

| 위치 | 권장 값 |
|------|--------|
| 카드 padding (기본) | `p-6` (24px) |
| 카드 padding (hero/wow) | `p-8` (32px) |
| Grid gap | `gap-6` (24px) 표준, hero는 `gap-8` |
| `gap-px` (1px divider) | 사용 자제 — 기존 패턴 유지하는 곳만 OK |
| `gap-3` (12px) | 매우 dense한 contextual stat row 한정 |
| Section vertical | major `mt-12`, sub `mt-10`, inline `mt-6` |
| 비대칭 grid | 적극 사용 (`grid-cols-[1.4fr_1fr]`, `grid-cols-[1.6fr_1fr]` 등) |
| 1280px 미만 대응 | `lg:` `md:` breakpoint 점층 |

**금지 패턴**:
- 모든 카드가 동일한 padding
- 모든 grid가 균일한 cols
- 카드 사이 시각적 호흡 없는 `gap-px`/`gap-3` 남발

## 5. 기존 컴포넌트 재사용 우선

`Card.tsx`의 기존 추상화는 적극 재사용:
- `<Card title subtitle>` — 기본 카드
- `<StatCard label value sub trend trendValue>` — 통계 카드
- `<WowCard variant="mint|outline|muted">` — 임팩트 카드
- `<InsightBox type="info|warn|success|danger">` — 인사이트 박스
- `<SourceCaption>` — 데이터 출처

신규 컴포넌트 만들 때 위 컴포넌트가 커버하지 못하는 영역만.

## 6. 도메인 타입

`src/types/index.ts` 참조. 핵심:
- `ZoneCategory`, `DetailZone`, `ZoneGroup` (구역 마스터)
- `RevenueAccount`, `CostAccount` (계정과목)
- `ActivityCostItem`, `ActivityCostBlock` (활동원가)
- `NumberLineage`, `LineageStep`, `NumberDriver` (NumberCell)
- `Period` ("monthly" | "yearly")

`any` 타입 절대 금지. `unknown`으로 받고 narrow 처리.

## 7. Mock data 위치

- 활동원가: `src/data/activity_cost.json` — `zoneGroups`, `activityCosts`, `lineages` 키
- 상조 KPI: `src/data/life_kpi.json`
- 장지 KPI: `src/data/zone_kpi.json`
- 부서 KPI: `src/data/dept_kpi.json`
- T-Box: `src/data/tbox.json`

JSON import 시 type assertion 또는 별도 typed wrapper 함수 사용.

## 8. Next.js 16 주의

`web/AGENTS.md` 참고: **이 Next.js는 학습 데이터와 다를 수 있음**. API·convention·파일 구조가 모두 다를 수 있다고 가정. 신규 API 사용 전 `node_modules/next/dist/docs/`의 가이드 확인.

이미 동작하는 기존 페이지(layout.tsx, AppLayout.tsx 등)의 패턴을 참고해서 동일한 컨벤션 따르기.

## 9. 코드 스타일

- 들여쓰기 2칸, camelCase, PascalCase(컴포넌트)
- 한국어 주석 OK
- `"use client"` 지시어가 필요한 컴포넌트 (state, effect 사용)는 명시
- 한 컴포넌트 = 한 파일이 원칙이나, 작은 sub-component는 같은 파일 OK
- import 경로는 `@/`(절대) 또는 상대 경로

## 10. 작업 보고 방식

- 작업 완료 후 PROGRESS.md (project root)에 한 줄 추가
  - 형식: `- [Phase N · 작업명] (날짜) — 산출물 목록 + 1줄 요약`
- 오류·반복 실수 패턴 발견 시 `web/CLAUDE.md`에 짧게 추가하여 다음 작업자(또는 자기 자신)가 같은 실수 안 하도록

## 11. 브랜치·커밋

- 한 Phase 단위로 의미있는 commit (한국어)
- 형식: `[Phase 1A] NumberCell·LineagePanel 추가` 같이
- 본 세션은 main에서 직접 작업
