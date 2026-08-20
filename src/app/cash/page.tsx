"use client";

// =============================================================================
// 자금현황 — 매출 및 집행예산 Cash flow (법인별 자금현황.jpg)
//
// 기간과 법인을 골라 수지현황과 자금 흐름을 본다.
// 행 단위 상세는 화면에 싣지 않고 상단 백데이터(CSV)와 인쇄물에서 확인한다.
// =============================================================================
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, StatCard } from "@/components/Card";
import { NoFigures, Dropdown, Segmented } from "@/components/exec/Bits";
import { ReportActions, ReportCover, ReportSection, type SectionDef } from "@/components/exec/Report";
import { CashBlockCard, BalanceTable, buildCashBlocks } from "@/components/exec/CashBlocks";
import { Waterfall, RankBars, type WaterfallStep } from "@/components/exec/ScreenCharts";
import { useReportSections } from "@/store/prefs";
import { downloadCsv, stamp } from "@/lib/export";
import { screens, num } from "@/lib/screens";
import {
  PERIOD_ITEMS,
  DEFAULT_PERIOD,
  parsePeriod,
  periodId,
  periodLabel,
  isCum,
  monthIndex,
  type Period,
} from "@/lib/period";

const CA = screens.cash;

const SECTIONS: SectionDef[] = [
  { id: "summary", label: "요약 지표", note: "수입 · 지출 · 손익" },
  { id: "blocks", label: "수지현황", note: "당월 목표 · 실행 · 차월 목표" },
  { id: "flow", label: "법인별 자금 흐름", note: "이월 → 수입 → 지출 → 잔액" },
];

/** 법인 필터 — 그룹계는 3사 전체를 뜻한다 */
const ALL = "그룹계";
const COMPANIES = ["용인공원", "라이프", "YPL"] as const;
const COMPANY_ITEMS = [{ id: ALL, label: "그룹계" }, ...COMPANIES.map((c) => ({ id: c, label: c }))];

export default function CashPage() {
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [company, setCompany] = useState<string>(ALL);
  const { isOn } = useReportSections("cash", SECTIONS.map((s) => s.id));

  const cum = isCum(period);
  const mIdx = monthIndex(period);
  const label = periodLabel(period);
  const scope: readonly string[] = company === ALL ? COMPANIES : [company];

  const blocks = useMemo(() => buildCashBlocks(period, scope), [period, scope]);

  // 선택 기간 · 선택 법인의 수입 · 지출
  const totals = useMemo(() => {
    const pick = (kind: "actual" | "target", key: "income" | "expense") => {
      const months = cum ? CA.monthly : [CA.monthly[mIdx]];
      return months.reduce(
        (a, m) => a + scope.reduce((b, c) => b + (m?.[kind]?.[c]?.[key] ?? 0), 0),
        0,
      );
    };
    const inc = pick("actual", "income");
    const exp = pick("actual", "expense");
    const tInc = pick("target", "income");
    const tExp = pick("target", "expense");
    return { inc, exp, profit: inc - exp, tInc, tExp, tProfit: tInc - tExp };
  }, [cum, mIdx, scope]);

  const margin = totals.inc ? Math.round((totals.profit / totals.inc) * 100) : 0;

  // 자금 흐름 — 법인을 고르면 그 법인, 그룹계면 합계
  const flowRow = CA.balance.find((b) => b.company === (company === ALL ? "그룹계" : company));

  const flowSteps: WaterfallStep[] = useMemo(() => {
    if (!flowRow) return [];
    return [
      { name: "전월 이월", value: flowRow.opening, kind: "add" },
      { name: "수입", value: flowRow.income, kind: "add" },
      { name: "지출", value: flowRow.expense, kind: "sub" },
      { name: "당월 잔액", value: 0, kind: "total" },
    ];
  }, [flowRow]);

  // 법인별 잔액 비교 — 그룹계를 볼 때만 의미가 있다
  const balanceBars = useMemo(
    () =>
      CA.balance
        .filter((b) => b.company !== "그룹계")
        .map((b) => ({ label: b.company, sub: `이월 ${num(b.opening)}`, value: b.closing })),
    [],
  );

  const handleCsv = () => {
    const rows: (string | number)[][] = [[`용인공원그룹 자금현황 · ${label} · ${company}`], []];
    blocks.forEach((b) => {
      rows.push([b.title]);
      rows.push(["구분", "수입", "지출", "손익", "손익율(%)"]);
      b.rows.forEach((r) => rows.push([r.company, r.income, r.expense, r.profit, r.margin]));
      b.alt.forEach((r) =>
        rows.push([`${r.company} (수정 전망)`, r.income, r.expense, r.profit, r.margin]),
      );
      rows.push([]);
    });
    rows.push(["월별 수지 (법인별)"]);
    rows.push(["월", "법인", "목표 수입", "목표 지출", "실행 수입", "실행 지출", "구분"]);
    CA.monthly.forEach((m) =>
      COMPANIES.forEach((c) =>
        rows.push([
          m.month,
          c,
          m.target[c]?.income ?? 0,
          m.target[c]?.expense ?? 0,
          m.actual[c]?.income ?? 0,
          m.actual[c]?.expense ?? 0,
          m.mock ? "예시" : "실측",
        ]),
      ),
    );
    rows.push([]);
    rows.push(["법인별 자금 흐름"]);
    rows.push(["법인", "전월 이월잔액", "수입(총액)", "지출(총액)", "당월 잔액", "이체 제거 규칙"]);
    CA.balance.forEach((r) => {
      const d = CA.trace_detail.find((t) => t.company === r.company);
      rows.push([r.company, r.opening, r.income, r.expense, r.closing, d?.rule ?? ""]);
    });
    downloadCsv(`용인공원그룹_자금현황_${stamp()}`, rows);
  };

  return (
    <AppLayout pageTitle="자금현황" pageSubtitle="현금 기준 수지. 계좌간 이체를 제거한 순액이다." period={label}>
      <ReportCover
        title="매출 및 집행예산 Cash flow"
        period={label}
        scope={`${company === ALL ? "3사" : company} · 현금주의`}
      />

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Dropdown
            label="기간"
            items={PERIOD_ITEMS}
            value={periodId(period)}
            onChange={(v) => setPeriod(parsePeriod(v))}
          />
          <Segmented items={COMPANY_ITEMS} value={company} onChange={setCompany} />
        </div>
        <ReportActions page="cash" sections={SECTIONS} onCsv={handleCsv} />
      </div>

      <ReportSection
        id="summary"
        title="요약 지표"
        meta={`${label} · ${company} · 백만원`}
        enabled={isOn("summary")}
        first
      >
        <div className="grid gap-4 md:grid-cols-4 print-cols-4">
          <StatCard
            label="수입"
            value={num(totals.inc)}
            unit="백만원"
            sub={`목표 ${num(totals.tInc)} 대비 ${
              totals.tInc ? Math.round((totals.inc / totals.tInc) * 100) : 0
            }%`}
          />
          <StatCard
            label="지출"
            value={num(totals.exp)}
            unit="백만원"
            sub={`목표 ${num(totals.tExp)} 대비 ${
              totals.tExp ? Math.round((totals.exp / totals.tExp) * 100) : 0
            }%`}
          />
          <StatCard
            label="수지손익"
            value={num(totals.profit)}
            unit="백만원"
            sub={`목표 ${num(totals.tProfit)} 백만원`}
          />
          <StatCard label="손익율" value={`${margin}%`} sub="수지손익 ÷ 수입" />
        </div>
      </ReportSection>

      <ReportSection
        id="blocks"
        title="수지현황"
        meta={cum ? "누계 목표 · 실행" : "당월 목표 · 실행 · 차월 목표"}
        enabled={isOn("blocks")}
        right={
          <span className="text-[11px] text-stone-400">
            목표 아래 줄은 재무회계팀이 얹은 수정 전망
          </span>
        }
      >
        {blocks.length > 0 ? (
          <div
            className={`grid grid-cols-1 gap-5 ${
              blocks.length >= 3 ? "lg:grid-cols-3 print-cols-3" : "lg:grid-cols-2 print-cols-2"
            }`}
          >
            {blocks.map((b) => (
              <CashBlockCard key={b.id} block={b} />
            ))}
          </div>
        ) : (
          <NoFigures note="선택한 기간의 수지 자료가 없습니다." />
        )}
      </ReportSection>

      <ReportSection
        id="flow"
        title="법인별 자금 흐름"
        meta={company === ALL ? "그룹계" : company}
        enabled={isOn("flow")}
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] print-cols-2">
          <Card title="이월 → 수입 → 지출 → 잔액">
            <Waterfall steps={flowSteps} height={236} />
          </Card>
          <Card title="법인별 당월 잔액" subtitle="계좌간 이체 제거 후">
            <RankBars rows={balanceBars} />
          </Card>
        </div>
        <div className="mt-5">
          <Card>
            <BalanceTable companies={company === ALL ? undefined : [company]} />
          </Card>
        </div>
      </ReportSection>
    </AppLayout>
  );
}
