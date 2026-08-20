"use client";

// =============================================================================
// 부문별 손익 — 분양 / 관리비 / 상조 (FC Dashboard 3.부문별손익)
//
// 부서별 손익(아마란스 표준 리포트)을 부문으로 배부하는 구조이며,
// 용인공원 판관비가 아직 배부되지 않아 부문 합계와 법인 합계가 어긋난다.
// 배부표와 미배부 금액을 함께 보여 어디를 채워야 하는지 드러낸다.
// =============================================================================
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, StatCard } from "@/components/Card";
import { InfoTip, NoFigures, Dropdown, Segmented, TipRow } from "@/components/exec/Bits";
import { ReportActions, ReportCover, ReportSection, type SectionDef } from "@/components/exec/Report";
import { CoaList, Waterfall, TargetBars, type WaterfallStep } from "@/components/exec/ScreenCharts";
import { useReportSections } from "@/store/prefs";
import { downloadCsv, stamp } from "@/lib/export";
import { screens, num, pct } from "@/lib/screens";
import {
  PERIOD_ITEMS,
  DEFAULT_PERIOD,
  ACTUAL_MONTH,
  parsePeriod,
  periodId,
  periodLabel,
  type Period,
} from "@/lib/period";

const P = screens.pl;
const SEGS = ["분양손익", "관리비손익", "상조손익", "그룹계"] as const;

/** 매출 항목 - 비용 · 이익 행과 구분해 워터폴 입력에 쓴다 */
const REVENUE_ITEMS = new Set([
  "야외묘소", "아너스톤", "수입수수료", "행사매출", "서비스", "상조/석재", "기타",
]);
const isRevenue = (label: string) => REVENUE_ITEMS.has(label);

/** 3.부문별손익에서 한 칸을 꺼낸다. 렌더 밖 순수 함수. */
const val = (label: string, seg: string) =>
  P.segment.find((r) => r.label === label)?.segments[seg]?.actual ?? null;

const SEG_ITEMS = [
  { id: "전체", label: "전체" },
  { id: "분양손익", label: "분양" },
  { id: "관리비손익", label: "관리비" },
  { id: "상조손익", label: "상조" },
];

/** 3.부문별손익은 26.07 실적만 받았다. 다른 기간은 값을 만들 수 없다. */
const hasSegFigures = (p: Period) => p.kind === "month" && p.month === ACTUAL_MONTH;
const NO_FIGURES =
  "선택한 기간의 부문별 손익 자료를 받지 못했습니다. 26.07을 선택하면 표시됩니다.";

const SECTIONS: SectionDef[] = [
  { id: "summary", label: "부문 요약", note: "매출 · 이익 · 이익률" },
  { id: "bridge", label: "부문별 손익 구조", note: "매출에서 비용 차감까지" },
  { id: "dept", label: "부서 배부", note: "아마란스 부서별 손익 · 배부표" },
];

export default function SegmentPage() {
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [seg, setSeg] = useState<string>("전체");
  const { isOn } = useReportSections("segment", SECTIONS.map((s) => s.id));

  const figures = hasSegFigures(period);
  const label = periodLabel(period);
  // 그룹계는 부문 합계라 개별 부문을 골랐을 때는 빼고 본다
  const shownSegs = seg === "전체" ? SEGS : SEGS.filter((s) => s === seg);
  const bridgeSegs = (["분양손익", "관리비손익", "상조손익"] as const).filter(
    (s) => seg === "전체" || s === seg,
  );

  /** 계정코드 병기 — 3.부문별손익은 26.07 실적만 있어 기간 분기는 필요 없다 */
  const hintsOf = (s: string) => screens.coa_map.segment[s];

  // 부문 합계와 법인 합계의 차이 = 미배부 판관비
  const unalloc = useMemo(() => {
    const segProfit = val("이익", "그룹계") ?? 0;
    const compProfit =
      P.company.find((r) => r.label === "이익")?.companies["그룹계"]?.actual ?? 0;
    return { seg: segProfit, comp: compProfit, gap: segProfit - compProfit };
  }, []);

  const bridge = (seg: string): WaterfallStep[] => {
    const items = P.segment.filter(
      (r) => r.level === 1 && r.segments[seg]?.actual && isRevenue(r.label),
    );
    return [
      ...items.map((r) => ({
        name: r.label,
        value: r.segments[seg].actual ?? 0,
        kind: "add" as const,
      })),
      { name: "판관비", value: val("판관비", seg) ?? 0, kind: "sub" as const },
      { name: "이익", value: val("이익", seg) ?? 0, kind: "total" as const },
    ];
  };

  const handleCsv = () => {
    const rows: (string | number | null)[][] = [
      [`용인공원그룹 부문별 손익 · ${screens.meta.base}`],
      [P.note],
      [],
      ["구분", ...SEGS.flatMap((s) => [`${s} 계획`, `${s} 실적`])],
      ...P.segment.map((r) => [
        (r.level ? "  " : "") + r.label,
        ...SEGS.flatMap((s) => [r.segments[s]?.target ?? null, r.segments[s]?.actual ?? null]),
      ]),
      [],
      ["부서별 손익 (아마란스 「부문별 손익현황 [부서]」)"],
      ["부서코드", "부서명", "매출", "판관비", "부서별손익"],
      ...P.dept.map((d) => [d.code, d.name, d.revenue, d.sga, d.profit]),
      [],
      ["부서 × 원가 배부표"],
      ["법인", "부서", "분양원가", "관리비원가"],
      ...P.dept_matrix.map((m) => [
        m.company,
        m.dept,
        m.분양원가 ? "O" : "",
        m.관리비원가 ? "O" : "",
      ]),
    ];
    downloadCsv(`용인공원그룹_부문별손익_${stamp()}`, rows);
  };

  return (
    <AppLayout pageTitle="부문별 손익">
      <ReportCover
        title="부문별 손익"
        period={label}
        scope={`${seg === "전체" ? "분양 · 관리비 · 상조" : SEG_ITEMS.find((i) => i.id === seg)?.label} · ${screens.meta.base}`}
      />

      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Dropdown
            label="기간"
            items={PERIOD_ITEMS}
            value={periodId(period)}
            onChange={(v) => setPeriod(parsePeriod(v))}
          />
          <Segmented items={SEG_ITEMS} value={seg} onChange={setSeg} />
        </div>
        <ReportActions page="segment" sections={SECTIONS} onCsv={handleCsv} />
      </div>

      <ReportSection
        id="summary"
        title="부문 요약"
        meta={`${label} 실적 · 백만원`}
        info={
          <InfoTip title="계정코드" align="left">
            <TipRow label="보는 법">
              부문 이름(점선)에 마우스를 올리면 그 부문의 매출을 구성하는 더존 계정과 코드가
              펼쳐진다. 손익 구조에서는 막대에 올리면 된다.
            </TipRow>
            <TipRow label="법인 병기">
              부문은 여러 법인의 계정이 섞이므로 계정명 뒤에 법인을 적었다.
            </TipRow>
          </InfoTip>
        }
        enabled={isOn("summary")}
        first
      >
        {!figures ? (
          <NoFigures note={NO_FIGURES} />
        ) : (
        <div
          className={`grid gap-4 print-cols-4 ${
            shownSegs.length > 1 ? "md:grid-cols-4" : "md:grid-cols-2"
          }`}
        >
          {shownSegs.map((s) => {
            const rev = val("매출액", s) ?? 0;
            const profit = val("이익", s) ?? 0;
            return (
              <StatCard
                key={s}
                label={s}
                value={num(profit)}
                unit="백만원"
                sub={`매출 ${num(rev)} · 이익률 ${rev ? pct((profit / rev) * 100, 0) : "-"}`}
                hint={
                  hintsOf(s)?.["매출액"] ? <CoaList items={hintsOf(s)["매출액"]} /> : undefined
                }
              />
            );
          })}
        </div>
        )}
      </ReportSection>

      <ReportSection
        id="bridge"
        title="부문별 손익 구조"
        meta={`${label} 실적 · 매출에서 비용 차감까지`}
        enabled={isOn("bridge")}
      >
        {!figures ? (
          <NoFigures note={NO_FIGURES} />
        ) : (
          <div
            className={`grid grid-cols-1 gap-5 ${
              bridgeSegs.length > 1 ? "xl:grid-cols-3" : "xl:grid-cols-2"
            }`}
          >
            {bridgeSegs.map((s) => (
              <Card key={s} title={s}>
                <Waterfall steps={bridge(s)} height={224} hints={hintsOf(s)} />
              </Card>
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection
        id="dept"
        title="부서 배부"
        meta="아마란스 부서별 손익 · 부서 × 원가 배부표"
        enabled={isOn("dept")}
      >
        {!figures ? (
          <NoFigures note={NO_FIGURES} />
        ) : (
        <div className="grid grid-cols-1 gap-5">
          <Card title="부서별 손익" subtitle="아마란스 「부문별 손익현황 [부서]」">
            <TargetBars
              rows={P.dept
                .filter((d) => d.profit !== null && d.code !== "0000")
                .map((d) => ({
                  label: d.name,
                  sub: `[${d.code}]`,
                  target: Math.abs(d.revenue ?? 0) || 1,
                  actual: Math.abs(d.profit ?? 0),
                }))}
            />
          </Card>
        </div>
        )}
      </ReportSection>

      {/* 미배부 금액 — 부문 전체를 볼 때만 의미가 있다 */}
      {figures && seg === "전체" && (
      <div className="mt-5 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12px] font-semibold text-stone-700">
            부문 합계 대비 법인 합계
          </span>
          <div className="flex items-center gap-5 text-[12px]">
            <span className="text-stone-500">
              부문 이익 <span className="tnum font-semibold text-stone-800">{num(unalloc.seg)}</span>
            </span>
            <span className="text-stone-500">
              법인 이익 <span className="tnum font-semibold text-stone-800">{num(unalloc.comp)}</span>
            </span>
            <span className="text-[var(--bad)]">
              차이 <span className="tnum font-semibold">{num(unalloc.gap)}</span>
            </span>
          </div>
        </div>
      </div>
      )}

    </AppLayout>
  );
}
