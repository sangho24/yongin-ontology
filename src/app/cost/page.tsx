"use client";

// =============================================================================
// 26년 원가 및 손익 — 현업 보고 화면(법인별 원가및손익 1·2.jpg) 재현
//
// 화면에는 손익 구조 워터폴과 원가율만 싣고, 행 단위 원형 표는
// 백데이터(CSV)와 인쇄물에서 확인한다.
// =============================================================================
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/Card";
import { Gauge, Segmented } from "@/components/exec/Bits";
import { ReportActions, ReportCover, ReportSection, type SectionDef } from "@/components/exec/Report";
import { Waterfall, type WaterfallStep } from "@/components/exec/ScreenCharts";
import { useReportSections } from "@/store/prefs";
import { downloadCsv, stamp } from "@/lib/export";
import {
  screens,
  pct,
  type CostBlock,
  type CostGroup,
} from "@/lib/screens";

const C = screens.cost;

const SECTIONS: SectionDef[] = [
  { id: "bridge", label: "손익 구조", note: "총수입에서 비용 차감까지" },
  { id: "ratio", label: "원가율", note: "26년 목표 대비" },
];

/** 조직별 손익 흐름 — 총수입에서 지출 세부항목을 차례로 뺀다 */
function bridgeOf(g: CostGroup): WaterfallStep[] {
  const profit = g.rows.find((r) => r.kind === "profit");
  const iRev = g.rows.findIndex((r) => r.label === "총수입");
  const iExp = g.rows.findIndex((r) => r.label === "총지출");
  const iProfit = g.rows.findIndex((r) => r.kind === "profit");

  const revenue = g.rows.filter(
    (r, i) => r.kind === "item" && i > iRev && i < iExp && (r.a_m ?? 0) !== 0,
  );
  const expense = g.rows.filter(
    (r, i) => r.kind === "item" && i > iExp && (iProfit === -1 || i < iProfit),
  );

  return [
    ...revenue.map((r) => ({ name: r.label, value: r.a_m ?? 0, kind: "add" as const })),
    ...expense.map((r) => ({ name: r.label, value: r.a_m ?? 0, kind: "sub" as const })),
    { name: profit?.label ?? "손익", value: profit?.a_m ?? 0, kind: "total" as const },
  ];
}

export default function CostPage() {
  const [tab, setTab] = useState<"yongin" | "life">("yongin");
  const { isOn } = useReportSections(
    "cost",
    SECTIONS.map((s) => s.id),
  );

  const block: CostBlock = tab === "yongin" ? C.yongin : C.life;

  const handleCsv = () => {
    const rows: (string | number | null)[][] = [
      [`용인공원그룹 원가 및 손익 · ${screens.meta.base}`],
      [],
    ];
    [C.yongin, C.life].forEach((b) => {
      b.groups.forEach((g) => {
        rows.push([`${b.title} · ${g.org}`]);
        rows.push([
          "구분",
          "7월 목표",
          "7월 실적",
          "MoM",
          "YoY",
          "누계 목표",
          "누계 실적",
          "누계 YoY",
          "판정",
          "확인요청",
        ]);
        g.rows.forEach((r) =>
          rows.push([
            r.label,
            r.t_m,
            r.a_m,
            r.mom,
            r.yoy,
            r.t_c,
            r.a_c,
            r.yoy_c,
            r.trace.label,
            r.trace.rfi.join(" "),
          ]),
        );
        g.ratios.forEach((r) =>
          rows.push([r.label, r.t_m, r.a_m, "", "", r.t_c, r.a_c, "", "", `목표 ${r.goal ?? ""}`]),
        );
        rows.push([]);
      });
    });
    downloadCsv(`용인공원그룹_원가및손익_${stamp()}`, rows);
  };

  return (
    <AppLayout pageTitle="26년 원가 및 손익" pageSubtitle={screens.meta.base}>
      <ReportCover
        title="26년 원가 및 손익"
        period="26년 7월"
        scope={`${block.title} · ${screens.meta.base}`}
      />

      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          items={[
            { id: "yongin", label: "용인공원 · 와이피엘" },
            { id: "life", label: "용인공원라이프" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <ReportActions page="cost" sections={SECTIONS} onCsv={handleCsv} />
      </div>

      <div className="no-print mb-6 text-[11.5px] text-stone-500">
        {screens.meta.base} · 단위 {screens.meta.unit}, %
      </div>

      <ReportSection
        id="bridge"
        title="손익 구조"
        meta="26년 7월 실적 · 총수입에서 비용 차감까지"
        enabled={isOn("bridge")}
        first
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {block.groups.map((g) => (
            <Card key={g.org} title={g.org}>
              <Waterfall steps={bridgeOf(g)} height={244} />
            </Card>
          ))}
        </div>
      </ReportSection>

      <ReportSection
        id="ratio"
        title="원가율"
        meta="26년 목표 대비"
        enabled={isOn("ratio")}
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {block.groups.map((g) => (
            <Card key={g.org} title={g.org}>
              <div className="space-y-4 pt-1">
                {g.ratios.map((r) => (
                  <div key={r.label}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-[12px] font-medium text-stone-600">{r.label}</span>
                      <span className="tnum text-[11px] text-stone-400">
                        누계 {pct(r.a_c, 0)}
                      </span>
                    </div>
                    {r.goal !== null && r.a_m !== null ? (
                      <Gauge
                        value={r.a_m}
                        target={r.goal}
                        lowerIsBetter={r.label.includes("원가율")}
                      />
                    ) : (
                      <div className="flex items-baseline justify-between text-[11px] text-stone-400">
                        <span className="tnum text-[13px] font-semibold text-stone-800">
                          {pct(r.a_m, Math.abs(r.a_m ?? 0) < 10 ? 1 : 0)}
                        </span>
                        <span>목표 미설정</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </ReportSection>
    </AppLayout>
  );
}
