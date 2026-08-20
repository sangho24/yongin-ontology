"use client";

// =============================================================================
// 법인별 손익 — 용인공원 · YPL · 라이프 (FC Dashboard 2.손익)
//
// 계획 대비 실적을 법인 단위로 본다. 기간과 법인을 골라 볼 수 있고,
// 상품 · 채널 단위는 매출실적, 부문 단위는 부문별 손익, 조직 · 고정변동 단위는
// 원가 및 손익 화면에서 각각 다룬다.
// =============================================================================
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, StatCard } from "@/components/Card";
import { InfoTip, NoFigures, Dropdown, Segmented, TipRow } from "@/components/exec/Bits";
import { ReportActions, ReportCover, ReportSection, type SectionDef } from "@/components/exec/Report";
import {
  Waterfall,
  ProfitStructureBars,
  RankBars,
  type WaterfallStep,
} from "@/components/exec/ScreenCharts";
import { useReportSections } from "@/store/prefs";
import { downloadCsv, stamp } from "@/lib/export";
import { screens, num, pct, rate } from "@/lib/screens";
import {
  PERIOD_ITEMS,
  DEFAULT_PERIOD,
  parsePeriod,
  periodId,
  periodLabel,
  hasFigures,
  isCum,
  type Period,
} from "@/lib/period";

const P = screens.pl;
const S = screens.sales;
const COMPANIES = ["용인공원", "YPL", "라이프", "그룹계"] as const;
const COMPANY_ITEMS = [
  { id: "그룹계", label: "그룹계" },
  { id: "용인공원", label: "용인공원" },
  { id: "YPL", label: "YPL" },
  { id: "라이프", label: "라이프" },
];

/** 2.손익에서 한 칸을 꺼낸다. 렌더 밖 순수 함수라 useMemo 의존성에 넣지 않아도 된다. */
const val = (label: string, comp: string, kind: "target" | "actual" = "actual") =>
  P.company.find((r) => r.label === label)?.companies[comp]?.[kind] ?? null;

const SECTIONS: SectionDef[] = [
  { id: "summary", label: "요약 지표", note: "매출 · 판관비 · 이익" },
  { id: "structure", label: "법인별 손익 구조", note: "매출 규모와 구성" },
  { id: "bridge", label: "손익 구조", note: "매출에서 비용 차감까지" },
  { id: "mix", label: "매출 구성", note: "항목별 실적" },
];

const NO_MONTHLY = "선택한 기간의 손익 자료를 받지 못했습니다. 26.07 또는 누계를 선택하면 표시됩니다.";

export default function PlPage() {
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [company, setCompany] = useState<string>("그룹계");
  const { isOn } = useReportSections("pl", SECTIONS.map((s) => s.id));

  const label = periodLabel(period);
  const figures = hasFigures(period);
  const cum = isCum(period);

  const rev = val("매출", company) ?? 0;
  const sga = val("판관비", company) ?? 0;
  const profit = val("이익", company) ?? 0;
  const revTarget = val("매출", company, "target");

  // 누계는 손익 자료가 매출만 존재한다(매출실적 누계). 나머지는 월 실적만 있다.
  const cumRevenue = useMemo(() => {
    const t = S.totals.find((x) =>
      company === "그룹계" ? x.company === "용인공원그룹계" : x.company === company,
    );
    return t ? { target: t.t_c, actual: t.a_c } : null;
  }, [company]);

  const bridge: WaterfallStep[] = useMemo(() => {
    const items = P.company.filter(
      (r) => r.level === 1 && isRevenueItem(r.label) && r.companies[company]?.actual,
    );
    const costs = P.company.filter(
      (r) => r.level === 1 && isCostItem(r.label) && r.companies[company]?.actual,
    );
    return [
      ...items.map((r) => ({
        name: r.label,
        value: r.companies[company].actual ?? 0,
        kind: "add" as const,
      })),
      ...costs.map((r) => ({
        name: r.label,
        value: r.companies[company].actual ?? 0,
        kind: "sub" as const,
      })),
      { name: "이익", value: val("이익", company) ?? 0, kind: "total" as const },
    ];
  }, [company]);

  const structure = useMemo(
    () =>
      (["용인공원", "YPL", "라이프"] as const).map((c) => ({
        name: c,
        revenue: val("매출", c) ?? 0,
        cost: (val("판관비", c) ?? 0) + (val("현장원가", c) ?? 0),
        profit: val("이익", c) ?? 0,
      })),
    [],
  );

  // 선택 법인의 매출 구성
  // 계정코드 병기 — 누계는 월 계정 구성과 모수가 달라 월 실적일 때만 붙인다
  const coaHints = useMemo(
    () => (cum ? undefined : screens.coa_map.pl[company]),
    [company, cum],
  );

  const mix = useMemo(
    () =>
      P.company
        .filter((r) => r.level === 1 && isRevenueItem(r.label))
        .map((r) => ({ label: r.label, value: r.companies[company]?.actual ?? 0 }))
        .filter((r) => r.value !== 0)
        .sort((a, b) => b.value - a.value),
    [company],
  );

  const handleCsv = () => {
    const rows: (string | number | null)[][] = [
      [`용인공원그룹 법인별 손익 · ${label}`],
      [],
      ["구분", ...COMPANIES.flatMap((c) => [`${c} 계획`, `${c} 실적`])],
      ...P.company.map((r) => [
        (r.level ? "  " : "") + r.label,
        ...COMPANIES.flatMap((c) => [
          r.companies[c]?.target ?? null,
          r.companies[c]?.actual ?? null,
        ]),
      ]),
      [],
      ["매출 누계 (매출실적 기준)"],
      ["법인", "누계 목표", "누계 실적"],
      ...S.totals.map((t) => [t.company, t.t_c, t.a_c]),
    ];
    downloadCsv(`용인공원그룹_법인별손익_${stamp()}`, rows);
  };

  return (
    <AppLayout
      pageTitle="법인별 손익"
      pageSubtitle="발생 기준 손익. 내부거래를 제거하지 않은 법인 합산이다."
      period={label}
    >
      <ReportCover
        title="법인별 손익"
        period={label}
        scope={`${company} · 용인공원 · YPL · 용인공원라이프`}
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
        <ReportActions page="pl" sections={SECTIONS} onCsv={handleCsv} />
      </div>

      <ReportSection
        id="summary"
        title="요약 지표"
        meta={`${company} · ${label} · 백만원`}
        enabled={isOn("summary")}
        first
      >
        {figures ? (
          <div className="grid gap-4 md:grid-cols-4 print-cols-4">
            <StatCard
              label="매출"
              value={num(cum && cumRevenue ? cumRevenue.actual : rev)}
              unit="백만원"
              sub={
                cum && cumRevenue
                  ? `목표 ${num(cumRevenue.target)} 대비 ${pct(
                      rate(cumRevenue.actual, cumRevenue.target),
                    )}`
                  : revTarget
                    ? `계획 ${num(revTarget)} 대비 ${pct(rate(rev, revTarget))}`
                    : "계획 미설정"
              }
            />
            <StatCard
              label="판관비"
              value={cum ? "-" : num(sga)}
              unit={cum ? undefined : "백만원"}
              sub={cum ? "누계 자료 미수령" : "계획 미설정"}
            />
            <StatCard
              label="이익"
              value={cum ? "-" : num(profit)}
              unit={cum ? undefined : "백만원"}
              sub={cum ? "누계 자료 미수령" : `이익률 ${rev ? pct((profit / rev) * 100, 0) : "-"}`}
            />
            <StatCard
              label="영업 외 손익"
              value={cum ? "-" : num(val("영업 외 손익", company))}
              unit={cum ? undefined : "백만원"}
              sub="영업외수익 - 영업외비용"
            />
          </div>
        ) : (
          <NoFigures note={NO_MONTHLY} />
        )}
      </ReportSection>

      <ReportSection
        id="structure"
        title="법인별 손익 구조"
        meta="막대 길이는 매출 규모, 내부는 판관비와 이익"
        enabled={isOn("structure")}
      >
        {figures && !cum ? (
          <Card>
            <ProfitStructureBars rows={structure} />
          </Card>
        ) : (
          <NoFigures note={cum ? "판관비 · 이익의 누계 자료를 받지 못했습니다." : NO_MONTHLY} />
        )}
      </ReportSection>

      <ReportSection
        id="bridge"
        title="손익 구조"
        meta={`${company} · 매출에서 비용 차감까지`}
        info={
          <InfoTip title="계정코드" align="left">
            <TipRow label="보는 법">
              막대에 마우스를 올리면 그 항목을 구성하는 더존 계정과 코드가 함께 펼쳐진다.
            </TipRow>
            <TipRow label="범위">
              26.07 실적에 한한다. 누계는 계정 구성의 모수가 달라 붙이지 않는다.
            </TipRow>
          </InfoTip>
        }
        enabled={isOn("bridge")}
      >
        {figures && !cum ? (
          <Card>
            <Waterfall steps={bridge} height={252} hints={coaHints} />
          </Card>
        ) : (
          <NoFigures note={cum ? "판관비 · 이익의 누계 자료를 받지 못했습니다." : NO_MONTHLY} />
        )}
      </ReportSection>

      <ReportSection
        id="mix"
        title="매출 구성"
        meta={`${company} · 항목별 실적`}
        info={
          <InfoTip title="계정코드" align="left">
            <TipRow label="보는 법">
              항목 이름(점선)에 마우스를 올리면 그 항목을 구성하는 더존 계정과 코드가 펼쳐진다.
            </TipRow>
            <TipRow label="범위">
              26.07 실적에 한한다. 누계는 계정 구성의 모수가 달라 붙이지 않는다.
            </TipRow>
          </InfoTip>
        }
        enabled={isOn("mix")}
      >
        {figures && !cum && mix.length > 0 ? (
          <Card>
            <RankBars rows={mix} hints={coaHints} />
          </Card>
        ) : (
          <NoFigures note={cum ? "항목별 누계 자료를 받지 못했습니다." : NO_MONTHLY} />
        )}
      </ReportSection>
    </AppLayout>
  );
}

// -----------------------------------------------------------------------------
const REVENUE_ITEMS = new Set([
  "분양_야외", "분양_아너", "관리비_야외", "관리비_아너", "수입수수료", "행사매출", "서비스", "기타",
]);
const COST_ITEMS = new Set(["급여", "판매수수료", "광고선전비"]);

const isRevenueItem = (l: string) => REVENUE_ITEMS.has(l);
const isCostItem = (l: string) => COST_ITEMS.has(l);
