// =============================================================================
// 용인공원 그룹 BI · 도메인 타입 정의
// =============================================================================

// -----------------------------------------------------------------------------
// 구역 (Zone) 마스터
// -----------------------------------------------------------------------------

export type ZoneCategory =
  | "아너스톤 로얄"
  | "아너스톤 노블"
  | "아너스톤 아너"
  | "정담원"
  | "정명지"
  | "정남지"
  | "세수연"
  | "명가여연"
  | "명당"
  | "천명지"
  | "기타구역";

export type ZoneVcSide = "cemetery" | "mutual";

export type DetailZone = {
  id: string; // ex) "honor-royal-1R"
  category: ZoneCategory;
  code: string; // ex) "1R"
  label: string; // ex) "1ROYAL"
  side: ZoneVcSide; // 어느 VC에 속하는지
};

export type ZoneGroup = {
  category: ZoneCategory;
  side: ZoneVcSide;
  subZones: DetailZone[];
};

// -----------------------------------------------------------------------------
// 계정과목
// -----------------------------------------------------------------------------

export type RevenueAccount =
  | "사용료수입(일반)"
  | "사용료수입(아너)"
  | "관리비수입"
  | "장례비수입"
  | "이장비수입"
  | "석축비수입"
  | "임대료수입"
  | "사초비수입"
  | "안치료수입"
  | "기타수입";

export type CostAccount =
  | "인건비"
  | "지급수수료"
  | "광고선전비"
  | "복리후생비"
  | "여비교통비"
  | "접대비"
  | "차량유지비"
  | "사무용품비"
  | "통신비"
  | "재료비"
  | "감가상각비"
  | "기타비용";

export type AccountKind = "revenue" | "cost";

// -----------------------------------------------------------------------------
// 활동원가 항목
// -----------------------------------------------------------------------------

export type ActivityCostSource =
  | "ledger" // 원장 직추적
  | "allocated" // 배부 driver 적용
  | "estimated"; // 추정·proxy

export type ActivityCostItem = {
  account: RevenueAccount | CostAccount;
  kind: AccountKind;
  amount: number; // 연 합계 (원)
  series: number[]; // 12개월 (원)
  driver?: string;
  driverShare?: number; // 0..1
  source: ActivityCostSource;
  lineageId?: string; // NumberLineage 참조
};

export type ActivityCostBlock = {
  zoneId: string;
  category: ZoneCategory;
  side: ZoneVcSide;
  fiscalYear: number;
  items: ActivityCostItem[];
};

// -----------------------------------------------------------------------------
// NumberCell — 숫자 컴포넌트의 lineage·driver·sparkline
// -----------------------------------------------------------------------------

export type LineageStep = {
  label: string;
  detail?: string;
  amount?: number;
  rowCount?: number;
};

export type NumberLineage = {
  source: string; // 출처 시트·계정 (ex: "용인공원_계정별원장.xls / 40400")
  formula?: string; // 산식 한 줄 요약
  steps?: LineageStep[]; // 상세 단계
  verified?: boolean; // 원장 대조 완료 여부
  unit?: "원" | "백만원" | "억원" | "명" | "기" | "건" | "%";
  asOf?: string; // YYYY-MM-DD
  notes?: string;
};

export type NumberDriver = {
  id: string;
  label: string;
  unit: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
};

// -----------------------------------------------------------------------------
// Period (월/연 토글)
// -----------------------------------------------------------------------------

export type Period = "monthly" | "yearly";

// -----------------------------------------------------------------------------
// FinanceActions
// -----------------------------------------------------------------------------

export type FinanceActionContext = {
  zoneId?: string;
  account?: RevenueAccount | CostAccount;
  period?: { year: number; month?: number };
};
