// =============================================================================
// 기간 축 — 화면 전체가 같은 기간 컨트롤을 쓴다
//
// 자금은 25.12~26.08 월별 값이 있고, 손익 · 매출 · 원가는 26.07(월)과
// 26년 누계 두 벌만 있다. 그래서 기간은 "월" 또는 "누계"로 정의하고,
// 값이 없는 조합은 각 화면이 hasFigures로 판정해 비워 둔다.
// =============================================================================
import { screens } from "@/lib/screens";

export const MONTHS = screens.cash.months;

/** 재무회계팀 자료가 실측인 월 (그 앞 구간은 예시값) */
export const ACTUAL_MONTH = "26.07";
export const ACTUAL_IDX = MONTHS.indexOf(ACTUAL_MONTH);

export type Period = { kind: "month"; month: string } | { kind: "cum" };

export const CUM: Period = { kind: "cum" };
export const DEFAULT_PERIOD: Period = { kind: "month", month: ACTUAL_MONTH };

export const periodId = (p: Period) => (p.kind === "cum" ? "cum" : p.month);

export const periodLabel = (p: Period) => (p.kind === "cum" ? "26년 누계" : p.month);

/** 화면 상단 캡션에 쓰는 긴 표기 */
export const periodTitle = (p: Period) =>
  p.kind === "cum" ? "26년 누계 (25.12~26.07)" : `${p.month.replace(".", "년 ")}월`;

export const parsePeriod = (id: string): Period =>
  id === "cum" ? CUM : { kind: "month", month: id };

/** 기간 선택 컨트롤에 넘길 항목 */
export const PERIOD_ITEMS = [
  ...MONTHS.map((m) => ({ id: m, label: m })),
  { id: "cum", label: "누계" },
];

export const monthIndex = (p: Period) => (p.kind === "cum" ? -1 : MONTHS.indexOf(p.month));

/**
 * 손익 · 매출 · 원가처럼 26.07(월)과 누계만 있는 자료를 그릴 수 있는 기간인지.
 * 그 밖의 월은 자료를 받지 못해 값을 만들 수 없다.
 */
export const hasFigures = (p: Period) => p.kind === "cum" || p.month === ACTUAL_MONTH;

/** 월 · 누계 중 어느 열을 읽을지 */
export const isCum = (p: Period) => p.kind === "cum";
