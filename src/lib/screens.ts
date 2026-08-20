// =============================================================================
// 경영보고 화면(26.07 기준) 데이터 로더 및 타입
//
// 현업이 실제로 보고 있는 화면 4종(매출실적 · 자금현황 · 원가및손익 1·2)과
// 일일보고 2종을 그대로 재현한다.
//
// 각 수치에는 더존 계정까지의 추적 결과(trace)가 함께 실려 있으나, 화면에는
// 노출하지 않는다. 판정 · 확인요청은 백데이터(CSV) 컬럼과 RFI에서 다룬다.
// =============================================================================
import raw from "@/data/exec_screens.json";

export type Verdict =
  | "confirmed" // 원장 계정·금액까지 확인
  | "reclass" // 원장 계정은 있으나 재분류 기준 필요
  | "gap" // 원장과 차액이 있고 원천 미확인
  | "external" // 원장에 대응 계정 없음
  | "unset" // 산출 기준 자체가 미확정
  | "derived"; // 위 항목들의 계산값

export type TraceAccount = {
  account: string;
  code: string;
  amount: number | null;
  confidence: "high" | "medium" | "low" | "none" | "n/a";
};

export type Trace = {
  verdict: Verdict;
  label: string;
  ledger: number | null;
  diff: number | null;
  accounts: TraceAccount[];
  note: string;
  rfi: string[];
  formula: string;
};

export type SalesRow = {
  company: string;
  cat: string;
  detail: string;
  t_m: number;
  a_m: number;
  t_c: number;
  a_c: number;
  trace: Trace;
};

export type SalesTotal = Omit<SalesRow, "cat" | "detail">;

export type ChannelRow = {
  company: string;
  org: string;
  item: string;
  target: number;
  actual: number;
};

export type CostRow = {
  label: string;
  t_m: number | null;
  a_m: number | null;
  mom: number | null;
  yoy: number | null;
  t_c: number | null;
  a_c: number | null;
  yoy_c: number | null;
  kind: "total" | "item" | "profit";
  trace: Trace;
};

export type RatioRow = {
  label: string;
  t_m: number | null;
  a_m: number | null;
  t_c: number | null;
  a_c: number | null;
  goal: number | null;
};

export type CostGroup = { org: string; rows: CostRow[]; ratios: RatioRow[] };
export type CostBlock = { title: string; groups: CostGroup[] };

export type CashRow = {
  company: string;
  income: number;
  expense: number;
  profit: number;
  margin: number;
};

export type CashBlock = {
  id: string;
  title: string;
  kind: "target" | "actual";
  rows: CashRow[];
  alt: CashRow[];
  trace: Trace | null;
  row_trace?: Record<string, Trace>;
  note?: string;
};

export type CashBalance = {
  company: string;
  opening: number;
  income: number;
  expense: number;
  closing: number;
};

/** 법인별 수입 · 지출 (26.08 실행처럼 아직 값이 없는 구간은 null) */
export type CashLeg = { income: number | null; expense: number | null };

export type CashMonth = {
  month: string;
  actual: Record<string, CashLeg>;
  target: Record<string, CashLeg>;
  /** 자금 자료를 수령하지 못해 예시값으로 채운 구간 */
  mock: boolean;
};

export type CashTraceDetail = {
  company: string;
  sheet: string;
  rule: string;
  gross_in: number;
  gross_out: number;
  transfer_in: number;
  transfer_out: number;
  net_in: number;
  net_out: number;
  jpg_in: number;
  jpg_out: number;
  resid_in: number;
  resid_out: number;
  rows: number;
};

export type DailyYonginRow = {
  group: string;
  detail: string;
  day_cnt: number | null;
  day_amt: number | null;
  mtd_cnt: number | null;
  mtd_amt: number | null;
  mtd_target: number | null;
  mtd_rate: number | null;
  ytd_cnt: number | null;
  ytd_amt: number | null;
  ytd_target: number | null;
  ytd_rate: number | null;
  is_total: boolean;
};

export type FuneralRow = {
  group: string;
  detail: string;
  day: number | null;
  mtd: number | null;
  ytd: number | null;
};

export type DailyLifeRow = {
  group: string;
  detail: string;
  unit: "amt" | "cnt" | "rate";
  day: number | null;
  mtd: number | null;
  mtd_target: number | null;
  mtd_rate: number | null;
  ytd: number | null;
  ytd_target: number | null;
  mom: number | null;
  yoy: number | null;
};

/** 계획 · 실적 한 쌍 */
export type Plan = { target: number | null; actual: number | null };

/** 2.손익 - 법인별 */
export type CompanyPlRow = {
  label: string;
  level: number;
  companies: Record<string, Plan>;
};

/** 3.부문별손익 - 분양 / 관리비 / 상조 */
export type SegmentPlRow = {
  label: string;
  level: number;
  segments: Record<string, Plan>;
};

/** 부서 x 원가 배부표 */
export type DeptMatrixRow = {
  company: string;
  dept: string;
  분양원가: boolean;
  관리비원가: boolean;
};

/** 아마란스 「부문별 손익현황 [부서]」 */
export type DeptPlRow = {
  code: string;
  name: string;
  revenue: number | null;
  sga: number | null;
  profit: number | null;
};

export type RfiItem = {
  id: string;
  title: string;
  target: string;
  priority: string;
  ask: string;
};

export type CoaRow = {
  company: string;
  company_id: string;
  section: string;
  account: string;
  code: string;
  amount: number | null;
  confidence: string;
  reason: string;
};

/** 화면 항목 ↔ 더존 계정코드 (DK BMC 병기 요청). 금액 대사가 맞는 항목만 싣는다. */
export type CoaHint = { account: string; code: string; amount: number | null };

export type ScreensData = {
  meta: {
    base: string;
    cum_label: string;
    unit: string;
    version: string;
    source: string;
    note: string;
  };
  verdicts: Record<Verdict, string>;
  sales: {
    rows: SalesRow[];
    totals: SalesTotal[];
    channels: ChannelRow[];
    channel_trace: Trace;
  };
  cost: { yongin: CostBlock; life: CostBlock };
  pl: {
    company: CompanyPlRow[];
    segment: SegmentPlRow[];
    dept_matrix: DeptMatrixRow[];
    dept: DeptPlRow[];
    trace: Record<"unalloc" | "ypl_split" | "life", Trace>;
    note: string;
  };
  cash: {
    blocks: CashBlock[];
    balance: CashBalance[];
    trace_detail: CashTraceDetail[];
    months: string[];
    monthly: CashMonth[];
    monthly_basis: string;
  };
  daily: {
    yongin: { base: string; rows: DailyYonginRow[]; funeral: FuneralRow[] };
    life: { base: string; sections: { title: string; rows: DailyLifeRow[] }[] };
    trace: { yongin: Trace; life: Trace };
  };
  rfi: Record<string, RfiItem>;
  coa: CoaRow[];
  /** 화면 → 축(법인 · 부문) → 항목명 → 구성 계정. 금액 대사가 맞는 항목만 들어 있다. */
  coa_map: Record<"pl" | "segment", Record<string, Record<string, CoaHint[]>>>;
};

export const screens = raw as unknown as ScreensData;

// -----------------------------------------------------------------------------
// 포맷터
// -----------------------------------------------------------------------------
export const num = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined
    ? "-"
    : n.toLocaleString("ko-KR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

export const rate = (actual: number | null, target: number | null) => {
  if (actual === null || target === null || target === 0) return null;
  return (actual / target) * 100;
};

export const pct = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined ? "-" : `${n.toFixed(digits)}%`;

/** 달성률 색 (100% 기준) */
export const rateTone = (r: number | null) => {
  if (r === null) return "text-stone-400";
  if (r >= 100) return "text-[var(--teal-deep)]";
  if (r >= 80) return "text-stone-700";
  return "text-[var(--bad)]";
};

export const deltaTone = (n: number | null | undefined) => {
  if (n === null || n === undefined || n === 0) return "text-stone-400";
  return n > 0 ? "text-[var(--bad)]" : "text-[var(--teal-deep)]";
};
