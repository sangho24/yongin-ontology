export type MaterialId = "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7";

export type MaterialInfo = { id: MaterialId; name: string; desc: string };

export const MATERIALS: MaterialInfo[] = [
  { id: "M1", name: "FC Dashboard_260819.xlsx", desc: "재무회계팀 작성 - 더존 아마란스10 추출 뷰 + 보고용 집계" },
  { id: "M2", name: "법인별 매출실적.jpg", desc: "경영진 보고 화면" },
  { id: "M3", name: "법인별 원가및손익1.jpg", desc: "경영진 보고 화면 (용인공원 · 와이피엘)" },
  { id: "M4", name: "법인별 원가및손익2.jpg", desc: "경영진 보고 화면 (용인공원라이프)" },
  { id: "M5", name: "법인별 자금현황.jpg", desc: "경영진 보고 화면" },
  { id: "M6", name: "용인공원_일일보고.xlsx", desc: "일 단위 보고 (장지)" },
  { id: "M7", name: "온유상조_일일보고.xlsx", desc: "일 단위 보고 (상조)" },
];

export type ScreenMaterialEntry = {
  materials: MaterialId[];
  field: string;
  note: string;
};

export const SCREEN_MATERIAL_MAP: Record<string, ScreenMaterialEntry> = {
  "/#summary": { materials: ["M1"], field: "cash.monthly", note: "그룹 수지손익·수입·지출·손익율 4종 모두 cash.monthly 기반. 기본 선택 26.07만 FC Dashboard 수지 시트 실측과 일치, 다른 기간/누계 선택 시 mock 지수값으로 계산되며 화면에 별도 표시 없음." },
  "/#cash": { materials: ["M1", "M5"], field: "cash.monthly (buildCashBlocks)", note: "26.07 선택 시 법인별 자금현황.jpg 값과 일치(FC Dashboard 수지 시트로 대사). 다른 기간/누계는 mock 지수값으로 대체." },
  "/#trend": { materials: ["M1"], field: "cash.monthly", note: "26.07 실행·26.07~08 목표만 실측. 나머지 25.12~26.06 7개월은 「26년 용인공원_매출계획」 월 지수로 역산한 예시값(mock) - 7개 자료 밖 소스 포함, 화면에 mock 표시 없음." },
  "/#flow": { materials: ["M5"], field: "cash.balance", note: "이월→수입→지출→잔액. 기간 선택과 무관한 고정값." },
  "/#pl": { materials: ["M1"], field: "pl.company", note: "FC Dashboard 「2.손익」 시트." },
  "/#segment": { materials: ["M1"], field: "pl.segment", note: "FC Dashboard 「3.부문별손익」 시트." },
  "/#sales": { materials: ["M2"], field: "sales.totals", note: "법인별 매출실적.jpg 목표 대비 실적." },
  "/#cost": { materials: ["M3", "M4"], field: "cost.yongin / cost.life", note: "용인공원·와이피엘(원가및손익1.jpg) / 라이프(원가및손익2.jpg) 두 조직 그룹." },
  "/#kpi": { materials: [], field: "exec_kpi.json", note: "0814 회의자료 6p(용인공원재단·YPL)·7p(용인공원라이프) 기반 - 7개 자료가 아닌 별도 파일." },
  "/#daily": { materials: ["M6", "M7"], field: "daily.yongin + daily.life", note: "용인공원_일일보고(장지) / 온유상조_일일보고(상조)." },
  "/pl#summary": { materials: ["M1"], field: "pl.company", note: "FC Dashboard 「2.손익」 시트." },
  "/pl#structure": { materials: ["M1"], field: "pl.company", note: "FC Dashboard 「2.손익」 시트, 계획/실적 막대." },
  "/pl#bridge": { materials: ["M1"], field: "pl.company + coa_map.pl", note: "금액은 FC Dashboard 「2.손익」 시트. 병기된 계정코드는 원장 계정코드 매핑 산출물(coa_resolved.json) 기반 가공물 - 1차 원천과 다른 별도 매핑 단계." },
  "/pl#mix": { materials: ["M1"], field: "pl.company", note: "FC Dashboard 「2.손익」 시트." },
  "/segment#summary": { materials: ["M1"], field: "pl.segment", note: "FC Dashboard 「3.부문별손익」 시트." },
  "/segment#bridge": { materials: ["M1"], field: "pl.segment + coa_map.segment", note: "금액은 FC Dashboard 「3.부문별손익」 시트. 병기된 계정코드는 원장 계정코드 매핑 산출물(coa_resolved.json) 기반 가공물." },
  "/segment#dept": { materials: ["M1"], field: "pl.dept_matrix + pl.dept", note: "FC Dashboard 「3.부문별손익」 우측 배부표 + 「부서별손익_용공」 시트(아마란스 「부문별 손익현황 [부서]」 출력물)." },
  "/sales#bridge": { materials: ["M2"], field: "sales.totals + sales.rows(마케팅대행 제거분)", note: "3사 단순합에서 YPL 마케팅대행(내부거래)을 제거한 그룹계 산출 흐름." },
  "/sales#bullet": { materials: ["M2"], field: "sales.rows", note: "법인×대분류×세부 목표 대비 실적." },
  "/cost#bridge": { materials: ["M3", "M4"], field: "cost.yongin / cost.life .groups[].rows", note: "탭 전환으로 용인공원·와이피엘(원가및손익1.jpg) ↔ 라이프(원가및손익2.jpg) 전환." },
  "/cost#ratio": { materials: ["M3", "M4"], field: "cost.yongin / cost.life .groups[].ratios", note: "손익율·원가율, 탭에 따라 소스 전환." },
  "/cash#summary": { materials: ["M1", "M5"], field: "cash.monthly (선택 기간 수입·지출·손익)", note: "기본 선택 26.07만 법인별 자금현황.jpg·FC Dashboard 수지 시트 실측과 일치. 다른 기간/누계는 mock 지수값으로 계산되며 화면에 별도 표시 없음." },
  "/cash#blocks": { materials: ["M5", "M1"], field: "cash.monthly (buildCashBlocks)", note: "26.07 선택 시 JPG 표 값과 일치(FC Dashboard 수지 시트로 대사). 다른 기간/누계는 mock 지수값으로 대체." },
  "/cash#flow": { materials: ["M5"], field: "cash.balance", note: "이월→수입→지출→잔액, 법인별 당월 잔액. 기간 선택과 무관한 고정값." },
  "/daily#bullet": { materials: ["M6"], field: "daily.yongin", note: "용인공원 일일보고 - 월 누적 목표 대비." },
  "/daily#mix": { materials: ["M6"], field: "daily.yongin", note: "용인공원 일일보고 - 분양 채널 구성." },
  "/daily#funnel": { materials: ["M7"], field: "daily.life", note: "온유상조 일일보고 - DB 전환 퍼널." },
  "/daily#biz": { materials: ["M7"], field: "daily.life", note: "온유상조 일일보고 - 사업현황 목표 대비." },
  "/kpi#summary": { materials: [], field: "exec_kpi.json", note: "0814 회의자료 6·7p 기반 - 7개 자료가 아닌 별도 파일." },
  "/kpi#cards": { materials: [], field: "exec_kpi.json", note: "0814 회의자료 6·7p 기반 - 7개 자료가 아닌 별도 파일." },
  "/kpi#table": { materials: [], field: "exec_kpi.json", note: "0814 회의자료 6·7p 기반 - 7개 자료가 아닌 별도 파일." },
};

/** 탭(라우트) 단위 요약 - 섹션별 매핑에서 집계하므로 위 표만 고치면 함께 따라온다 */
export type RouteSummary = {
  /** 그 탭의 섹션 수 */
  sections: number;
  /** 자료별 참조 섹션 수, 많이 쓰인 순 */
  counts: { id: MaterialId; name: string; count: number }[];
  /** 7개 자료가 아닌 소스를 쓰는 섹션 수 */
  outside: number;
  /** 단일 소스형 · 이중 소스형 · 혼합형 · 종합형 */
  nature: string;
};

export function routeSummary(route: string): RouteSummary | null {
  const entries = Object.entries(SCREEN_MATERIAL_MAP)
    .filter(([key]) => key.slice(0, key.lastIndexOf("#")) === route)
    .map(([, entry]) => entry);
  if (entries.length === 0) return null;

  const tally = new Map<MaterialId, number>();
  let outside = 0;
  entries.forEach((entry) => {
    if (entry.materials.length === 0) outside += 1;
    entry.materials.forEach((id) => tally.set(id, (tally.get(id) ?? 0) + 1));
  });

  const counts = MATERIALS.filter((m) => tally.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, count: tally.get(m.id) as number }))
    .sort((a, b) => b.count - a.count);

  const distinct = counts.length;
  const nature =
    distinct === 0
      ? "전량 7개 자료 외 소스"
      : distinct === 1
        ? "단일 소스형"
        : distinct === 2
          ? "이중 소스형"
          : distinct >= 6
            ? "종합형"
            : "혼합형";

  return { sections: entries.length, counts, outside, nature };
}
