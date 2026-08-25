"use client";

// =============================================================================
// 일일마감 — 현업 일일 업무 보고(용인공원 · 온유상조) 재현
//
// 화면에는 달성률 · 퍼널만 싣고, 행 단위 원형 표는 백데이터(CSV)와 인쇄물에서 확인한다.
// 회계 원장이 아닌 CRM · 마케팅 채널 데이터가 원천이라 별도 메뉴로 둔다.
// =============================================================================
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/Card";
import { Segmented, StackBar } from "@/components/exec/Bits";
import { ReportActions, ReportCover, ReportSection, type SectionDef } from "@/components/exec/Report";
import { SourceTip } from "@/components/exec/SourceTip";
import { CHART_COLORS, FunnelSteps, TargetBars } from "@/components/exec/ScreenCharts";
import { useReportSections } from "@/store/prefs";
import { downloadCsv, stamp } from "@/lib/export";
import {
  screens,
} from "@/lib/screens";

const D = screens.daily;

const SECTIONS_YG: SectionDef[] = [
  { id: "bullet", label: "월 누적 목표 대비", note: "달성률 하위 항목" },
  { id: "mix", label: "분양 채널 구성", note: "월 누적 실적" },
];

const SECTIONS_LIFE: SectionDef[] = [
  { id: "funnel", label: "DB 전환 퍼널", note: "상조계약 / 장지계약" },
  { id: "biz", label: "사업현황 목표 대비", note: "부금 · 행사 · 장지 · 해약" },
];

export default function DailyPage() {
  const [tab, setTab] = useState<"yongin" | "life">("yongin");
  const sections = tab === "yongin" ? SECTIONS_YG : SECTIONS_LIFE;
  const { isOn } = useReportSections(
    `daily-${tab}`,
    sections.map((s) => s.id),
  );

  const handleCsv = () => {
    if (tab === "yongin") {
      const rows: (string | number | null)[][] = [
        [`용인공원 일일 업무 보고 · 기준 ${D.yongin.base}`],
        [
          "구분",
          "세부",
          "일 건수",
          "일 실적",
          "월 건수",
          "월 실적",
          "월 목표",
          "월 달성률(%)",
          "연 건수",
          "연 실적",
          "연 목표",
          "연 달성률(%)",
        ],
        ...D.yongin.rows.map((r) => [
          r.group,
          r.detail,
          r.day_cnt,
          r.day_amt,
          r.mtd_cnt,
          r.mtd_amt,
          r.mtd_target,
          r.mtd_rate,
          r.ytd_cnt,
          r.ytd_amt,
          r.ytd_target,
          r.ytd_rate,
        ]),
        [],
        ["오늘의 장례"],
        ["구분", "세부", "일간", "월간", "연간"],
        ...D.yongin.funeral.map((f) => [f.group, f.detail, f.day, f.mtd, f.ytd]),
      ];
      downloadCsv(`용인공원_일일보고_${stamp()}`, rows);
      return;
    }
    const rows: (string | number | null)[][] = [
      [`용인공원라이프 일일 업무 보고 · 기준 ${D.life.base}`],
      [],
    ];
    D.life.sections.forEach((s) => {
      rows.push([s.title]);
      rows.push([
        "구분",
        "세부",
        "단위",
        "금일",
        "월 누적",
        "월 목표",
        "진척율(%)",
        "26 누적",
        "26 KPI",
        "MoM(%)",
        "YoY(%)",
      ]);
      s.rows.forEach((r) =>
        rows.push([
          r.group,
          r.detail,
          r.unit,
          r.day,
          r.mtd,
          r.mtd_target,
          r.mtd_rate,
          r.ytd,
          r.ytd_target,
          r.mom,
          r.yoy,
        ]),
      );
      rows.push([]);
    });
    downloadCsv(`온유상조_일일보고_${stamp()}`, rows);
  };

  return (
    <AppLayout pageTitle="일일마감">
      <ReportCover
        title={tab === "yongin" ? "용인공원 일일 업무 보고" : "용인공원라이프 일일 업무 보고"}
        period={tab === "yongin" ? D.yongin.base : D.life.base}
        scope="일 단위 관리회계"
        unit="백만원, 건, %"
      />

      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          items={[
            { id: "yongin", label: "장지 (용인공원)" },
            { id: "life", label: "상조 (온유상조)" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <ReportActions page={`daily-${tab}`} sections={sections} onCsv={handleCsv} />
      </div>

      {tab === "yongin" ? (
        <YonginDaily isOn={isOn} />
      ) : (
        <LifeDaily isOn={isOn} />
      )}
    </AppLayout>
  );
}

// -----------------------------------------------------------------------------
function YonginDaily({ isOn }: { isOn: (id: string) => boolean }) {
  const rows = D.yongin.rows;

  const channelMix = useMemo(() => {
    const channels = ["온라인", "업체", "법인", "회원", "기타"];
    const colors = [
      CHART_COLORS.TEAL,
      CHART_COLORS.TEAL_2,
      CHART_COLORS.TEAL_SOFT,
      "#94a3b8",
      "#d6d3d1",
    ];
    return channels
      .map((ch, i) => ({
        label: ch,
        value: rows.filter((r) => r.detail === ch).reduce((a, r) => a + (r.mtd_amt ?? 0), 0),
        color: colors[i],
      }))
      .filter((c) => c.value > 0);
  }, [rows]);

  const bullets = useMemo(
    () =>
      rows
        .filter((r) => !r.is_total && r.mtd_target && r.mtd_target > 0 && r.group)
        .map((r) => ({
          label: r.detail || r.group,
          sub: r.detail ? r.group : undefined,
          target: r.mtd_target ?? 0,
          actual: r.mtd_amt ?? 0,
        }))
        .sort((a, b) => a.actual / (a.target || 1) - b.actual / (b.target || 1))
        .slice(0, 9),
    [rows],
  );

  return (
    <>
      <ReportSection
        id="bullet"
        title="월 누적 목표 대비"
        meta="달성률 하위 항목"
        enabled={isOn("bullet")}
        first
        right={<SourceTip route="/daily" id="bullet" />}
      >
        <Card>
          <TargetBars rows={bullets} sortable />
        </Card>
      </ReportSection>

      <ReportSection
        id="mix"
        title="분양 채널 구성"
        meta="월 누적 실적"
        enabled={isOn("mix")}
        right={<SourceTip route="/daily" id="mix" />}
      >
        <Card>
          <div className="pt-2">
            <StackBar items={channelMix} total={channelMix.reduce((a, c) => a + c.value, 0)} />
          </div>
        </Card>
      </ReportSection>
    </>
  );
}

// -----------------------------------------------------------------------------
function LifeDaily({ isOn }: { isOn: (id: string) => boolean }) {
  const db = D.life.sections.find((s) => s.title === "DB 현황");
  const row = (label: string) => db?.rows.find((r) => r.detail === label);

  // 전환율은 자체 계산하지 않고 일일보고가 관리하는 값을 그대로 쓴다.
  // 장지 방문은 상조계약과 별개 갈래라 퍼널에 섞지 않는다.
  const funnel = [
    { label: "인입 DB", value: row("인입 DB")?.mtd ?? 0, unit: "건" },
    {
      label: "유효 DB",
      value: row("유효 DB")?.mtd ?? 0,
      unit: "건",
      conv: row("유효 DB 전환율")?.mtd ?? null,
    },
    {
      label: "ON 상조계약",
      value: row("ON 상조계약")?.mtd ?? 0,
      unit: "건",
      conv: row("ON 계약전환율")?.mtd ?? null,
    },
  ];

  const cemeteryFunnel = [
    { label: "ON 방문 DB", value: row("ON 방문 DB")?.mtd ?? 0, unit: "건" },
    {
      label: "ON 장지계약",
      value: row("ON 장지계약")?.mtd ?? 0,
      unit: "건",
      conv: row("장지 계약전환율")?.mtd ?? null,
    },
  ];

  const biz = D.life.sections.find((s) => s.title === "사업현황");
  const bizBullets = (biz?.rows ?? [])
    .filter((r) => r.mtd_target && r.mtd_target > 0)
    .map((r) => ({
      label: r.detail,
      sub: r.group,
      target: r.mtd_target ?? 0,
      actual: r.mtd ?? 0,
    }));

  return (
    <>
      <ReportSection
        id="funnel"
        title="DB 전환 퍼널"
        meta="월 누적 · 상조계약 / 장지계약"
        enabled={isOn("funnel")}
        first
        right={<SourceTip route="/daily" id="funnel" />}
      >
        <Card>
          <div className="pt-1">
            <FunnelSteps steps={funnel} />
          </div>
          <div className="mt-3 border-t border-[var(--line)] pt-3">
            <FunnelSteps steps={cemeteryFunnel} />
          </div>
        </Card>
      </ReportSection>

      <ReportSection
        id="biz"
        title="사업현황 목표 대비"
        meta="부금 · 행사 · 장지 · 해약"
        enabled={isOn("biz")}
        right={<SourceTip route="/daily" id="biz" />}
      >
        <Card>
          <TargetBars rows={bizBullets} sortable />
        </Card>
      </ReportSection>
    </>
  );
}
