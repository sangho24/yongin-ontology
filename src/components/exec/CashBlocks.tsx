"use client";

// =============================================================================
// 자금 수지 표 — 경영보고 화면(법인별 자금현황.jpg) 원형
//
//   CashBlockCard  목표 / 실행 블록 1개
//   BalanceTable   법인별 이월잔액 → 수입 → 지출 → 당월잔액
//   buildCashBlocks  선택한 기간의 수지 블록을 월별 자료에서 만든다
//
// Overview와 자금현황 화면이 함께 쓴다.
// =============================================================================
import { Fragment } from "react";
import { Card } from "@/components/Card";
import { screens, num, type CashBlock, type CashRow } from "@/lib/screens";
import { MONTHS, type Period } from "@/lib/period";

const CA = screens.cash;
const COMPANIES = ["용인공원", "라이프", "YPL"] as const;

const mkRow = (company: string, income: number, expense: number): CashRow => {
  const profit = income - expense;
  return {
    company,
    income,
    expense,
    profit,
    margin: income ? Math.round((profit / income) * 100) : 0,
  };
};

/** 월별 자료에서 한 블록(목표 또는 실행)을 만든다. 값이 하나도 없으면 null. */
function monthBlock(
  monthIdx: number,
  kind: "target" | "actual",
  title: string,
  id: string,
  companies: readonly string[],
): CashBlock | null {
  const m = CA.monthly[monthIdx];
  if (!m) return null;
  const legs = companies.map((c) => ({ c, leg: m[kind]?.[c] }));
  if (legs.every((x) => x.leg?.income === null || x.leg?.income === undefined)) return null;

  const rows = legs.map(({ c, leg }) => mkRow(c, leg?.income ?? 0, leg?.expense ?? 0));
  const total = mkRow(
    "그룹계",
    rows.reduce((a, r) => a + r.income, 0),
    rows.reduce((a, r) => a + r.expense, 0),
  );
  // 원본 블록에 실려 있는 수정 전망(장표의 노란색 줄)은 해당 월에만 붙인다
  const origin = CA.blocks.find((b) => b.id === id);
  return {
    id,
    title,
    kind,
    rows: [...rows, total],
    alt: origin ? origin.alt.filter((a) => companies.includes(a.company) || a.company === "그룹계") : [],
    trace: null,
  };
}

/** 누계 블록 — 선택 가능한 전 구간 합 */
function cumBlock(kind: "target" | "actual", companies: readonly string[]): CashBlock {
  const rows = companies.map((c) => {
    let inc = 0;
    let exp = 0;
    CA.monthly.forEach((m) => {
      inc += m[kind]?.[c]?.income ?? 0;
      exp += m[kind]?.[c]?.expense ?? 0;
    });
    return mkRow(c, inc, exp);
  });
  const total = mkRow(
    "그룹계",
    rows.reduce((a, r) => a + r.income, 0),
    rows.reduce((a, r) => a + r.expense, 0),
  );
  return {
    id: `cum_${kind}`,
    title: kind === "actual" ? "누계 실행 수지현황" : "누계 목표 예상수지현황",
    kind,
    rows: [...rows, total],
    alt: [],
    trace: null,
  };
}

/**
 * 선택한 기간의 수지 블록 묶음.
 * 월을 고르면 「당월 목표 · 당월 실행 · 차월 목표」 3블록, 누계는 「목표 · 실행」 2블록.
 */
export function buildCashBlocks(
  period: Period,
  companies: readonly string[] = COMPANIES,
): CashBlock[] {
  if (period.kind === "cum") {
    return [cumBlock("target", companies), cumBlock("actual", companies)];
  }
  const i = MONTHS.indexOf(period.month);
  if (i < 0) return [];
  const label = (idx: number) => {
    const m = MONTHS[idx];
    if (!m) return "";
    const [y, mm] = m.split(".");
    return `${y}년 ${Number(mm)}월`;
  };
  const ids = ["jul_target", "jul_actual", "aug_target"];
  const isJul = MONTHS[i] === "26.07";
  return [
    monthBlock(i, "target", `${label(i)} 목표 예상수지현황`, isJul ? ids[0] : `t_${i}`, companies),
    monthBlock(i, "actual", `${label(i)} 그룹사별 수지현황`, isJul ? ids[1] : `a_${i}`, companies),
    monthBlock(
      i + 1,
      "target",
      `${label(i + 1)} 목표 예상수지현황`,
      isJul ? ids[2] : `t_${i + 1}`,
      companies,
    ),
  ].filter((b): b is CashBlock => b !== null);
}

export function CashBlockCard({ block }: { block: CashBlock }) {
  const isActual = block.kind === "actual";
  return (
    <Card
      title={block.title}
      subtitle={isActual ? "실행" : "목표"}
      highlight={isActual}
      source={
        isActual ? "더존 자금일보 - 계좌간 이체" : "재무회계팀 예산 (아마란스 예산메뉴 등록 예정)"
      }
    >
      <table className="w-full text-[12.5px]">
        <thead>
          <tr
            className={
              isActual ? "bg-[var(--teal)] text-white" : "border-b border-stone-300 text-stone-500"
            }
          >
            <th className="px-2.5 py-1.5 text-left font-semibold">구분</th>
            <th className="px-2.5 py-1.5 text-right font-semibold">수입</th>
            <th className="px-2.5 py-1.5 text-right font-semibold">지출</th>
            <th className="px-2.5 py-1.5 text-right font-semibold">손익</th>
            <th className="px-2.5 py-1.5 text-right font-semibold">손익율</th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r) => {
            const alt = block.alt.find((a) => a.company === r.company);
            const isTotal = r.company === "그룹계";
            return (
              <Fragment key={r.company}>
                <tr
                  className={`border-t border-stone-100 ${
                    isTotal ? "bg-[var(--teal-soft)]/70 font-semibold" : ""
                  }`}
                >
                  <td className="px-2.5 py-1.5 text-stone-700">{r.company}</td>
                  <td className="tnum px-2.5 py-1.5 text-right text-stone-800">
                    {num(r.income)}
                  </td>
                  <td className="tnum px-2.5 py-1.5 text-right text-stone-800">
                    {num(r.expense)}
                  </td>
                  <td
                    className={`tnum px-2.5 py-1.5 text-right font-semibold ${
                      r.profit < 0 ? "text-[var(--bad)]" : "text-[var(--teal-deep)]"
                    }`}
                  >
                    {num(r.profit)}
                  </td>
                  <td className="tnum px-2.5 py-1.5 text-right text-stone-600">{r.margin}</td>
                </tr>
                {alt && (
                  <tr className="text-[11.5px] text-amber-700">
                    <td className="px-2.5 pb-1.5 pl-5 text-stone-400">수정 전망</td>
                    <td className="tnum px-2.5 pb-1.5 text-right">{num(alt.income)}</td>
                    <td className="tnum px-2.5 pb-1.5 text-right">{num(alt.expense)}</td>
                    <td className="tnum px-2.5 pb-1.5 text-right">{num(alt.profit)}</td>
                    <td className="tnum px-2.5 pb-1.5 text-right">{alt.margin}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

export function BalanceTable({ companies }: { companies?: readonly string[] }) {
  const rows = companies
    ? CA.balance.filter((r) => companies.includes(r.company) || r.company === "그룹계")
    : CA.balance;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-[12.5px]">
        <thead>
          <tr className="bg-stone-600 text-white">
            <th className="px-3 py-2 text-left font-semibold">법인</th>
            <th className="px-3 py-2 text-right font-semibold">전월 이월잔액</th>
            <th className="px-3 py-2 text-right font-semibold">수입 (총액)</th>
            <th className="px-3 py-2 text-right font-semibold">지출 (총액)</th>
            <th className="px-3 py-2 text-right font-semibold">당월 잔액</th>
            <th className="px-3 py-2 text-left font-semibold">계좌간 이체 제거</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const d = CA.trace_detail.find((t) => t.company === r.company);
            const isTotal = r.company === "그룹계";
            return (
              <tr
                key={r.company}
                className={`border-t border-stone-100 ${
                  isTotal ? "bg-[var(--teal-soft)] font-semibold" : "hover:bg-stone-50/60"
                }`}
              >
                <td className="px-3 py-2 text-stone-800">{r.company}</td>
                <td className="tnum px-3 py-2 text-right text-stone-600">{num(r.opening)}</td>
                <td className="tnum px-3 py-2 text-right text-stone-800">{num(r.income)}</td>
                <td className="tnum px-3 py-2 text-right text-stone-800">{num(r.expense)}</td>
                <td className="tnum px-3 py-2 text-right font-semibold text-stone-900">
                  {num(r.closing)}
                </td>
                <td className="px-3 py-2 text-[11.5px] text-stone-500">
                  {d ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="rounded bg-stone-100 px-1.5 py-[1px] text-[10.5px] text-stone-600">
                        {d.rule}
                      </span>
                      <span className="tnum">
                        -{num(d.transfer_in)} / -{num(d.transfer_out)}
                      </span>
                    </span>
                  ) : (
                    ""
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
