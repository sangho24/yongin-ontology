# 용인공원 BI · 개발 진행 로그

세션별 진행 사항을 시간순으로 기록. 메인 에이전트가 phase 단위로 갱신.

## 2026-05-08

- [Phase 0 · Foundation] 시작
  - `src/types/index.ts` 신규 — 도메인 타입 (ZoneCategory·ActivityCost·NumberLineage 등)
  - `src/data/activity_cost.json` 신규 — 8개 구역 mock seed (아너스톤 R/N/H · 정담원 A/B · 정명지 1·세수연 1)
  - `SPEC.md` 신규 — subagent 공통 작업 spec
  - `PROGRESS.md` 신규 — 본 로그
  - 기존 페이지 spacing 마이그레이션은 페이지별 작업 시 같이 처리 (Phase 3·3D)
- [Phase 1B · Controls] (2026-05-08) — ZoneSelector(다중·검색·카테고리 그룹) + PeriodToggle(월/연 segment) + FinanceActions(ERP·활동 등록 버튼) 추가.
- [Phase 1C · AppLayout Dribbble 톤] (2026-05-08) — sidebar NAV icon, top bar 검색·user avatar, SubNav 컴포넌트 추가. 기존 호출 인터페이스 보존.
- [Phase 1A · NumberCell·LineagePanel] (2026-05-08) — NumberCell + LineagePanel 슬라이드 패널 추가. hover tooltip + click panel + inline sparkline 지원.
- [Phase 2 · ActivityCostExplorer] (2026-05-08) — 통합 컴포넌트. 다중 zone 선택 → account별 합산 → SummaryStat(매출/비용/마진 + sparkline) + 매출·비용 2-col(NumberCell + source 배지 + driver) + 자동 lineage 빌드 + FinanceActions 통합. p-8/gap-8 spacing.
- [Phase 3D · Root Cause + Data Model spacing] (2026-05-08) — gap-3→gap-6, gap-4→gap-6/8, mt-6/8/10→mt-10/12/14, p-6→p-8(hero) 미세 보강. 기능·콘텐츠 변경 없음.
- [Phase 3B · 장지 VC 보강] (2026-05-08) — ActivityCostExplorer 섹션(side=cemetery) 추가, 핵심 KPI에 NumberCell, 부서별 KPI 그리드, SubNav, spacing 보강.
- [Phase 3A · 상조 VC 보강] (2026-05-08) — 핵심 KPI에 NumberCell 적용, 부서별 KPI 그리드 추가, spacing 보강(gap-3→gap-6, mt-6→mt-12).
- [Phase 3C · Overview 정비] (2026-05-08) — 상단 hero 3카드에 NumberCell 적용, 부서 KPI 카드 클릭 시 /dept/[id] 라우트 link, SubNav, spacing 보강(gap-4→gap-6, p-3→p-4).
- [Build 검증] (2026-05-08) — `next build` 성공. 5개 라우트 모두 정적 prerender (○ Static): `/` · `/cemetery` · `/data-model` · `/mutual` · `/root-cause`. tsc 사전 존재 에러(next/link declaration·recharts Formatter)는 `ignoreBuildErrors: true`로 통과.

## 2026-05-08 · 1차 피드백 반영 (Phase 5)

- [Phase 5 · 메인 통합] (2026-05-08) — 사이드바 로고 이미지(`public/logo.png`) 적용, 사이드바 NAV에서 Root Cause 항목 제거, SubNav default scroll behavior 내장, `tbox.json` askTo 5건 PPT 조직도 기준으로 수정, `/dept/[id]` 라우트 신규(준비중 안내), `FEEDBACK.md` 신규.
- [Phase 5D · 장지·Overview 보강] (2026-05-08) — cemetery 페이지: SubNav에 Root Cause 추가, Z1~Z4 가설 inline 섹션 신규, 호버 문구 제거(`subtitle="설묘·계약·예약·이장·미판매"`), 모든 `<section id>`에 `scroll-mt-32`. Overview: SECTIONS 배열에서 root-cause 제거, headline 섹션 `scroll-mt-32`.
- [Phase 5A · Data Model 강화] (2026-05-08) — MiniMap nodeColor·strokeWidth로 T-Box 노드 가시화, Core Message 섹션 삭제, "필요한 RFI 미리보기" 섹션 추가(5개 RFI mock 표 + askTo 표기).
- [Phase 5B · Root Cause 강화] (2026-05-08) — 상단 3 StatCard NumberCell + 원장/ERP 버튼, 가설 카드별 LLM 원인 분석·추천 액션 토글 mock, 산점도 단지 라벨, Next Steps 섹션 폐기 후 InsightBox로 흡수.
- [Phase 5C · 상조 채널별 활동원가 + Root Cause inline] (2026-05-08) — channel_activity_cost.json·ChannelActivityCostExplorer 신규, 상조 페이지에 채널별 활동원가/Root Cause 가설(inline) 섹션 추가, SubNav 6개로 확장(Root Cause 포함), 호버 문구 제거, scroll-mt 보강.
