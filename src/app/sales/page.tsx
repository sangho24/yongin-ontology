"use client";

// =============================================================================
// 법인별 매출실적 — 현업 보고 화면(법인별 매출실적.jpg) 재현
//
// 화면에는 차트만 싣는다. 행 단위 원형 표는 백데이터(CSV)와 인쇄물에서 확인한다.
// =============================================================================
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/Card";
import { Segmented } from "@/components/exec/Bits";
import { ReportActions, ReportCover, ReportSection, type SectionDef } from "@/components/exec/Report";
import { SourceTip } from "@/components/exec/SourceTip";
import { TargetBars, Waterfall, type WaterfallStep } from "@/components/exec/ScreenCharts";
import { useReportSections } from "@/store/prefs";
import { downloadCsv, stamp } from "@/lib/export";
import {
  screens,
  rate,
  type SalesRow,
  type SalesTotal,
} from "@/lib/screens";

type Period = "month" | "cum";

const S = screens.sales;
const SECTIONS: SectionDef[] = [
  { id: "bridge", label: "그룹계 산출", note: "내부거래 제거 흐름" },
  { id: "bullet", label: "목표 대비 실적", note: "항목별 달성률" },
];

export default function SalesPage() {
  const [period, setPeriod] = useState<Period>("month");
  const { isOn } = useReportSections(
    "sales",
    SECTIONS.map((s) => s.id),
  );

  const target = (r: SalesRow | SalesTotal) => (period === "month" ? r.t_m : r.t_c);
  const actual = (r: SalesRow | SalesTotal) => (period === "month" ? r.a_m : r.a_c);
  const periodLabel = period === "month" ? "26년 7월" : screens.meta.cum_label;

  // 그룹계 산출 흐름 — 3사 단순합에서 YPL 마케팅대행(내부거래)을 뺀다
  const groupBridge: WaterfallStep[] = useMemo(() => {
    const pick = (c: string) => {
      const t = S.totals.find((x) => x.company === c);
      return t ? (period === "month" ? t.a_m : t.a_c) : 0;
    };
    const elim = S.rows.find((r) => r.cat === "판매수수료" && r.detail === "마케팅대행");
    return [
      { name: "용인공원", value: pick("용인공원"), kind: "add" },
      { name: "라이프", value: pick("라이프"), kind: "add" },
      { name: "YPL", value: pick("YPL"), kind: "add" },
      {
        name: "내부거래 제거",
        value: elim ? (period === "month" ? elim.a_m : elim.a_c) : 0,
        kind: "sub",
      },
      { name: "그룹계", value: 0, kind: "total" },
    ];
  }, [period]);

  const bulletRows = useMemo(
    () =>
      S.rows
        .map((r) => ({
          label: r.detail || r.cat,
          sub: `${r.company}${r.detail ? ` · ${r.cat}` : ""}`,
          target: period === "month" ? r.t_m : r.t_c,
          actual: period === "month" ? r.a_m : r.a_c,
        }))
        .sort((a, b) => a.actual / (a.target || 1) - b.actual / (b.target || 1)),
    [period],
  );

  const handleCsv = () => {
    const rows: (string | number)[][] = [
      [`용인공원그룹 매출실적 · ${periodLabel}`, "", "", "", "", ""],
      ["법인", "구분", "세부", "목표", "실적", "달성률(%)"],
      ...S.rows.map((r) => [
        r.company,
        r.cat,
        r.detail,
        target(r),
        actual(r),
        (rate(actual(r), target(r)) ?? 0).toFixed(1),
      ]),
      ...S.totals.map((t) => [
        t.company,
        "합계",
        "",
        target(t),
        actual(t),
        (rate(actual(t), target(t)) ?? 0).toFixed(1),
      ]),
      [],
      ["조직 · 부서별 수입"],
      ["법인", "조직", "항목", "목표", "실적", "달성률(%)"],
      ...S.channels.map((c) => [
        c.company,
        c.org,
        c.item,
        c.target,
        c.actual,
        (rate(c.actual, c.target) ?? 0).toFixed(1),
      ]),
    ];
    downloadCsv(`용인공원그룹_매출실적_${stamp()}`, rows);
  };

  return (
    <AppLayout
      pageTitle="법인별 매출실적"
      periodControl={
        <Segmented
          items={[
            { id: "month", label: "26년 7월" },
            { id: "cum", label: "26년 누계" },
          ]}
          value={period}
          onChange={setPeriod}
        />
      }
    >
      <ReportCover
        title="용인공원그룹 매출실적"
        period={periodLabel}
        scope={`3사 · ${screens.meta.base}`}
      />

      {/* 컨트롤 */}
      <div className="no-print mb-5 flex flex-wrap items-center justify-end gap-3">
        <ReportActions page="sales" sections={SECTIONS} onCsv={handleCsv} />
      </div>

      {/* 차트 */}
      <ReportSection
        id="bridge"
        title="그룹계 산출"
        meta={`${periodLabel} 실적 · 내부거래 제거`}
        enabled={isOn("bridge")}
        first
        right={<SourceTip route="/sales" id="bridge" />}
      >
        <Card>
          <Waterfall steps={groupBridge} height={252} />
        </Card>
      </ReportSection>

      <ReportSection
        id="bullet"
        title="목표 대비 실적"
        meta={`${periodLabel} · 달성률 낮은 순`}
        enabled={isOn("bullet")}
        right={<SourceTip route="/sales" id="bullet" />}
      >
        <Card>
          <TargetBars rows={bulletRows} sortable />
        </Card>
      </ReportSection>
    </AppLayout>
  );
}
