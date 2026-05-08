# 사용자 피드백 반영 로그

> 사용자 피드백을 받은 시점·요지·반영 결과를 시간순으로 기록.
> PROGRESS.md는 phase 진행 로그, 본 문서는 피드백 추적용.

---

## 2026-05-08 · 1차 피드백 (9개 항목)

### F1. Data Model — minimap에 T-Box 보이게 + Core Message 삭제
- **요지**: minimap에 노드가 안 보임. 하단 Core Message는 보고서 톤 → 운영 BI에 부적절
- **반영**: `src/app/data-model/page.tsx`
  - MiniMap에 nodeColor·nodeStrokeWidth 등 props 보강
  - Core Message 섹션 제거
  - **담당**: subagent (Phase 5A)

### F2. RFI 시각화 + 요청 대상 팀 PPT 기준 수정
- **요지**: 필요한 RFI가 어떤 형태의 자료여야 하는지 시각화. 그리고 askTo 팀 이름이 실재 안 함
- **반영**:
  - `src/data/tbox.json` 의 `askTo` 5건 PPT 조직도 기준으로 수정 ✅
    - `용인공원·YPL 영업팀·고객센터팀` → `용인공원·YPL 영업팀 / 라이프 고객센터팀`
    - `용인공원·YPL 영업팀·인사팀` → `용인공원·YPL 영업팀 / 라이프 경영지원팀`
    - `용인공원·YPL 운영팀` → `용인공원·YPL 영업팀`
    - `3사 인사팀·시설팀·총무팀` → `3사 경영지원팀 / 재무회계팀`
    - `그룹 전략팀` → `라이프 서비스기획팀 / 3사 경영지원팀`
  - PPT 추출 결과 (조직도 PPT의 실재 부서):
    - 용인공원: 영업팀
    - 용인공원라이프(LIFE): 마케팅팀, 행사서비스팀, 법인영업팀, 경영지원팀, 재무회계팀, 서비스기획팀, TM, 고객센터팀
    - YPL: 영업팀
  - RFI 시각화 패널 추가는 Phase 5A subagent

### F3. Root Cause 상단 숫자 lineage + 원장·ERP 버튼 + LLM 분석 mock + 추천 액션
- **요지**: 상단 3 StatCard 어떤 로직인지 사이드바 메뉴(LineagePanel)로, 원장·ERP 직접 가는 버튼, H1~H4 카드에 'LLM 원인 분석' 토글 mock + '추천 액션' 토글
- **반영**: subagent Phase 5B

### F4. 산점도 단지 라벨 + 추천 액션
- **요지**: 정체단지 산점도에 어느 구역인지 라벨 부족. 액션 추천도 같이.
- **반영**: subagent Phase 5B (Root Cause 페이지)

### F5. Root Cause를 사이드바에서 빼고 각 VC 메뉴 하위로
- **요지**: 좌측 메뉴 X, Overview/상조/장지의 SubNav 하위 기능으로
- **반영**:
  - 사이드바 NAV에서 Root Cause 항목 제거 ✅ (`src/components/AppLayout.tsx`)
  - 각 VC 페이지(상조·장지)의 SubNav에 Root Cause 항목 추가 + inline 섹션으로 통합
  - root-cause 페이지 라우트는 fallback 유지 (subagent 5B에서 강화)
  - **담당**: subagent 5B(페이지 자체 강화) + 5C·5D(VC inline 통합)

### F6. Next Steps 섹션을 분석 영역에 통합
- **요지**: 별도의 Next Steps 섹션 → 가설 카드·분석 영역 안으로 흡수
- **반영**: subagent Phase 5B

### F7. Anchor scroll 일관성 + "호버하여 상세" 문구 제거 + 상조 채널별 활동원가
- **요지**:
  - 장지 SubNav 클릭 시 anchor scroll 됨, 상조·Overview는 안 됨 → 통일
  - "호버하여 상세" 같은 정적 보고 문구 제거
  - 상조도 채널별 활동원가 페이지 (장지의 구역별처럼)
- **반영**:
  - SubNav 컴포넌트에 default `scrollIntoView` 동작 내장 ✅ (`src/components/AppLayout.tsx`)
  - 호버 문구 제거 + 상조 채널별 활동원가는 subagent 5C
  - Overview SubNav 점검은 5D

### F8. Overview 부서 카드 클릭 시 404
- **요지**: `/dept/[id]` 라우트가 없어서 404
- **반영**: `src/app/dept/[id]/page.tsx` 신규 — "준비 중" 안내 + 부서 미리보기 카드 ✅

### F9. 사이드바 로고 이미지 적용
- **요지**: `YP` 텍스트 박스 자리에 용인공원 공식 로고 이미지(`logo.png`)
- **반영**:
  - `public/logo.png` (이미지 cache에서 복사) ✅
  - `src/components/AppLayout.tsx` 에서 `next/image` 로 표시 ✅

---

## 작업 분배 요약

| 담당 | 항목 |
|------|------|
| 메인 (완료) | F2(askTo 수정), F5(사이드바 NAV), F7(SubNav default scroll), F8(/dept/[id]), F9(로고) |
| Subagent 5A | F1(Data Model minimap·Core Message 삭제·RFI 시각화) |
| Subagent 5B | F3·F4·F6 (Root Cause 페이지 강화 — NumberCell·LLM mock·추천 액션·산점도 라벨·Next Steps 통합) |
| Subagent 5C | F7 일부 (상조 채널별 활동원가·Root Cause inline·호버 문구 제거) |
| 메인 (Phase 5D) | 장지·Overview 보강 (Root Cause inline·호버 문구·anchor 점검) |

---

## 2026-05-08 · 2차 피드백

### F11. 장지 VC "가용재고 잠재가치" 정보 중복 제거
- **요지**: WowCard(mint hero) + 핵심 KPI lineage row(NumberCell)에서 같은 숫자가 두 번 노출 + WowCard 톤이 너무 강조됨
- **반영**:
  - `src/app/cemetery/page.tsx`: WowCard 섹션 삭제, NumberCell hero에 sub로 "Top 단지" 정보 흡수 ✅
  - `WowCard` import 제거
  - 정보 중복 해소, 인터랙티브 NumberCell 한 곳에서 lineage·산식 확인

### F12. Root Cause 페이지 상세 분석으로 가는 큰 CTA 버튼 (상조·장지 동일)
- **요지**: 상세 분해(채널 LTV·코호트 만기율·산점도·LLM 분석·추천 액션)는 Root Cause 페이지에서. 양쪽 VC에서 똑같이 클릭 가능한 큰 버튼.
- **반영**:
  - `src/app/cemetery/page.tsx`: root-cause 섹션 끝에 mint bg(`#0095A9`) 큰 CTA 카드 추가 (GitBranch 아이콘 + 부설명 + ArrowUpRight) ✅
  - `src/app/mutual/page.tsx`: 같은 CTA 카드로 기존 작은 텍스트 링크 교체 ✅
  - 두 페이지에서 동일한 디자인·동작

### F10. 로고 고해상도 교체 + 옆 텍스트 한 줄 정리
- **요지**: 사용자가 ontology-demo 폴더에 새 로고 png(고해상도) 업로드. 글자 위치 정렬, 옆 텍스트는 "용인공원 그룹 BI" 한 줄만.
- **반영**:
  - `public/logo.png` → 고해상도 png로 교체 (13.5KB) ✅
  - `src/components/AppLayout.tsx`:
    - `next/image` width/height를 실제 비율에 맞게 (520×200) 갱신해 sharp rendering ✅
    - 옆 텍스트 2줄(용인공원 그룹 / Cost Mgmt BI) → 한 줄(`용인공원 그룹 BI`) ✅
    - 로고와 텍스트 `items-center` 정렬, sidebar header padding `px-5 → px-4` 로 폭 여유 확보 ✅
