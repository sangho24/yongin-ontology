// 경영손익 대시보드 — 데이터 로더 · 타입 · 조회 헬퍼
import plRaw from "@/data/exec_pl.json";
import kpiRaw from "@/data/exec_kpi.json";

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

export type Monthly<K extends string> = Record<K, number[]>;

export type CashRow = {
  entity: string;
  income: number;
  expense: number;
  profit: number;
  margin: number;
  total?: boolean;
  monthly: Monthly<"income" | "expense" | "profit">;
};

export type CashScenario = {
  id: "actual" | "forecast";
  label: string;
  asof: string;
  rows: CashRow[];
};

export type PlRowKind = "revenue" | "expense" | "profit" | "ratio";

export type PlRow = {
  id: string;
  label: string;
  level: number;
  kind: PlRowKind;
  m_target: number | null;
  m_actual: number | null;
  mom?: number | null;
  yoy?: number | null;
  c_target: number | null;
  c_actual: number | null;
  c_yoy?: number | null;
  emphasis?: boolean;
  memo?: string;
  monthly: Monthly<"actual" | "target">;
};

export type PlBlock = {
  id: string;
  slide: number;
  entity: string;
  org: string;
  tab_label: string;
  scope_note: string;
  headline_kpi: string;
  target_note: string;
  target_value: number;
  rows: PlRow[];
};

export type Availability = "available" | "partial" | "missing";

export type Kpi = {
  id: string;
  label: string;
  type: "base" | "new";
  unit: string;
  value: number;
  prev: number;
  series: number[];
  formula: string;
  availability: Availability;
  lineage: string;
  invert?: boolean;
  highlight?: boolean;
};

export type KpiTeam = {
  id: string;
  label: string;
  /** 같은 팀명이 손익 그룹별로 여러 행에 나오는 경우의 구분자 (회의자료 6·7p 원본 구조) */
  scope?: string;
  pl_group: string[];
  rationale: string;
  kpis: Kpi[];
};

export type KpiCompany = { id: string; label: string; teams: KpiTeam[] };

// ---------------------------------------------------------------------------
// 데이터
// ---------------------------------------------------------------------------

export const plData = plRaw as unknown as {
  meta: {
    title: string;
    source_doc: string;
    period_label: string;
    unit: string;
    months: string[];
    monthly_basis: string;
    org_basis: string;
  };
  cash: {
    slide: number;
    title: string;
    basis: string;
    basis_evidence: string;
    formula: Record<string, string>;
    scenarios: CashScenario[];
  };
  pl: { formula: Record<string, string>; blocks: PlBlock[] };
};

export const kpiData = kpiRaw as unknown as {
  meta: { title: string; source_doc: string; period_label: string; months: string[]; note: string };
  companies: KpiCompany[];
};

export const MONTHS = plData.meta.months;
export const LATEST = MONTHS.length - 1;

/** 기간 선택값 — 개별 월 인덱스 또는 누계 */
export type Period = number | "cum";

export const periodLabel = (p: Period) => (p === "cum" ? "누계" : MONTHS[p]);

// ---------------------------------------------------------------------------
// 조회 헬퍼
// ---------------------------------------------------------------------------

export const getBlock = (id: string) => plData.pl.blocks.find((b) => b.id === id) ?? null;

export const scenario = (id: "actual" | "forecast") =>
  plData.cash.scenarios.find((s) => s.id === id)!;

/** 손익 행의 기간별 값 — 누계면 월 합(비율은 재계산), 아니면 해당 월 */
export function rowValue(row: PlRow, kind: "actual" | "target", period: Period): number | null {
  if (period !== "cum") return row.monthly[kind][period] ?? null;
  return kind === "actual" ? row.c_actual : row.c_target;
}

/** 자금 수지 행의 기간별 값 */
export function cashValue(
  row: CashRow,
  key: "income" | "expense" | "profit",
  period: Period
): number {
  if (period !== "cum") return row.monthly[key][period] ?? 0;
  return row.monthly[key].reduce((s, v) => s + v, 0);
}

export const allKpis = kpiData.companies.flatMap((c) =>
  c.teams.flatMap((t) => t.kpis.map((k) => ({ ...k, company: c.label, team: t.label })))
);

/** 동일 지표가 여러 팀에 걸린 경우 리니지 기준으로 1회만 집계 */
export const uniqueKpis = allKpis.filter(
  (k, i, arr) => arr.findIndex((x) => x.lineage === k.lineage) === i
);

// ---------------------------------------------------------------------------
// 포맷
// ---------------------------------------------------------------------------

/** 백만원 단위 정수 표기 (장표 원본 단위) */
export const mn = (n: number | null | undefined) =>
  n === null || n === undefined ? "-" : Math.round(n).toLocaleString("ko-KR");

/** 증감액 — 부호 표기. 소수가 있는 지표(전환율 등)는 1자리까지 유지 */
export const delta = (n: number | null | undefined) => {
  if (n === null || n === undefined) return "-";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  const body =
    Number.isInteger(n) || abs >= 100
      ? Math.round(n).toLocaleString("ko-KR")
      : String(Number(n.toFixed(abs < 1 ? 2 : 1))); // 불필요한 끝자리 0 제거
  return `${n > 0 ? "+" : ""}${body}`;
};

export const pct = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined ? "-" : `${n.toFixed(digits)}%`;

export const kpiNumber = (k: Pick<Kpi, "value" | "unit">) =>
  k.unit === "%" ? `${k.value}` : k.value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
