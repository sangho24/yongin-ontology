"use client";

import { useState, useMemo } from "react";
import { Pin } from "lucide-react";
import { Area, AreaChart, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/Card";
import { Segmented, PeriodFilter, Delta, InfoTip, TipRow } from "@/components/exec/Bits";
import { ReportSection, ReportCover, ReportActions, type SectionDef } from "@/components/exec/Report";
import { useReportSections, usePinnedKpis } from "@/store/prefs";
import { downloadCsv, stamp } from "@/lib/export";
import { kpiData, MONTHS, LATEST, periodLabel, type Period, type Kpi } from "@/lib/exec";

// =============================================================================
// KPI — 0814 회의자료 6p(용인공원재단·YPL) · 7p(용인공원라이프)
// 조직별 지표의 월별 추이. 고정한 지표는 Overview에 노출된다.
// =============================================================================

type TypeFilter = "all" | "base" | "new";

const SECTIONS: SectionDef[] = [
  { id: "summary", label: "요약 지표", note: "지표 수 · 개선 지표 수" },
  { id: "cards", label: "조직별 지표 카드", note: "팀별 KPI 현황" },
  { id: "table", label: "지표 추이표", note: "월별 값 · 전월 대비" },
];

/** 회의자료 6·7p는 같은 팀이 손익 그룹별로 여러 행에 나온다. 겹치는 행만 구분자를 병기한다. */
const teamName = (t: { label: string; scope?: string }) =>
  t.scope ? `${t.label} (${t.scope})` : t.label;

export default function KpiPage() {
  const [companyId, setCompanyId] = useState(kpiData.companies[0].id);
  const [teamId, setTeamId] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [period, setPeriod] = useState<Period>(LATEST);
  const { isOn } = useReportSections("kpi", SECTIONS.map((s) => s.id));
  const { isPinned, toggle, pinned } = usePinnedKpis();

  const company = kpiData.companies.find((c) => c.id === companyId)!;
  const monthIdx = period === "cum" ? LATEST : period;

  const teams = useMemo(
    () => (teamId === "all" ? company.teams : company.teams.filter((t) => t.id === teamId)),
    [company, teamId]
  );

  const visible = useMemo(
    () =>
      teams.flatMap((t) =>
        t.kpis
          .filter((k) => typeFilter === "all" || k.type === typeFilter)
          .map((k) => ({ ...k, team: teamName(t) }))
      ),
    [teams, typeFilter]
  );

  const newCount = visible.filter((k) => k.type === "new").length;
  const improved = visible.filter((k) => {
    const d = k.series[monthIdx] - k.series[Math.max(0, monthIdx - 1)];
    return k.invert ? d < 0 : d > 0;
  }).length;

  const handleCsv = () => {
    const rows: (string | number)[][] = [];
    rows.push([`${company.label} KPI`, `기준 ${periodLabel(period)}`]);
    rows.push([]);
    rows.push(["조직", "주요 손익 Group", "구분", "KPI", "단위", ...MONTHS, "전월 대비", "Overview 고정"]);
    company.teams.forEach((t) => {
      t.kpis.forEach((k) => {
        rows.push([
          teamName(t),
          t.pl_group.join(" / "),
          k.type === "new" ? "신규 제안" : "기존",
          k.label,
          k.unit,
          ...k.series,
          Number((k.value - k.prev).toFixed(2)),
          isPinned(k.lineage) ? "Y" : "",
        ]);
      });
    });
    downloadCsv(`${company.label}_KPI_${stamp()}`, rows);
  };

  return (
    <AppLayout
      pageTitle="KPI"
    >
      <ReportCover
        title="조직별 KPI"
        period={periodLabel(period)}
        scope={
          teamId === "all"
            ? company.label
            : `${company.label} · ${teams[0] ? teamName(teams[0]) : ""}`
        }
        unit="지표별 단위 상이"
      />

      {/* 컨트롤 */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          items={kpiData.companies.map((c) => ({ id: c.id, label: c.label }))}
          value={companyId}
          onChange={(v) => {
            setCompanyId(v);
            setTeamId("all");
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter value={period} onChange={setPeriod} />
          <ReportActions page="kpi" sections={SECTIONS} onCsv={handleCsv} />
        </div>
      </div>

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          items={[
            { id: "all", label: "전체 팀" },
            ...company.teams.map((t) => ({ id: t.id, label: teamName(t) })),
          ]}
          value={teamId}
          onChange={setTeamId}
          tone="dark"
        />
        <Segmented
          items={[
            { id: "all" as const, label: "전체" },
            { id: "base" as const, label: "기존" },
            { id: "new" as const, label: "신규 제안" },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
          tone="dark"
        />
      </div>

      {/* 요약 */}
      <ReportSection
        id="summary"
        title="요약 지표"
        meta={`${periodLabel(period)} 기준`}
        enabled={isOn("summary")}
        first
      >
        <div className="grid gap-4 md:grid-cols-4 print-cols-4">
          <StatCard
            label="관리 지표"
            value={`${visible.length}`}
            unit="개"
            sub={`기존 ${visible.length - newCount} · 신규 제안 ${newCount}`}
          />
          <StatCard
            label="전월 대비 개선"
            value={`${improved}`}
            unit="개"
            sub={`${visible.length}개 중 ${
              visible.length ? Math.round((improved / visible.length) * 100) : 0
            }%`}
          />
          <StatCard
            label="조직"
            value={`${teams.length}`}
            unit="개 팀"
            sub={teams.map(teamName).join(" · ")}
          />
          <StatCard
            label="Overview 고정"
            value={`${pinned.length}`}
            unit="개"
            sub="카드의 핀으로 지정한 지표"
          />
        </div>
      </ReportSection>

      {/* 조직별 카드 */}
      <ReportSection
        id="cards"
        title="조직별 지표"
        meta={`${periodLabel(period)} 기준`}
        enabled={isOn("cards")}
        info={
          <InfoTip title="읽는 법" align="left">
            <TipRow label="수치">
              KPI는 손익 시스템 밖 데이터라 회의자료에도 지표명만 있고 값이 없다. 화면의 월별 값은
              전부 대표값이며, 원천 확보 후 교체한다.
            </TipRow>
            <TipRow label="신규 · 기존">
              기존은 현행 KPI, 신규는 수익성 관리 보완을 위해 제안한 지표.
            </TipRow>
            <TipRow label="핀">
              카드 우상단의 핀을 누르면 Overview 화면 하단에 그 지표가 고정된다.
            </TipRow>
          </InfoTip>
        }
      >
        <div className="space-y-4">
          {teams.map((team) => {
            const kpis = team.kpis.filter((k) => typeFilter === "all" || k.type === typeFilter);
            if (!kpis.length) return null;
            return (
              <div
                key={team.id}
                className="print-card rounded-md border border-stone-200/80 bg-white p-5 transition-colors hover:border-stone-300"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-[14px] font-semibold tracking-tight text-stone-900">
                    {teamName(team)}
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {team.pl_group.map((g) => (
                      <span
                        key={g}
                        className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] text-stone-500"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2 xl:grid-cols-3 print-cols-3">
                  {kpis.map((k) => (
                    <KpiTile
                      key={k.id}
                      kpi={k}
                      monthIdx={monthIdx}
                      pinned={isPinned(k.lineage)}
                      onPin={() => toggle(k.lineage)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ReportSection>

      {/* 추이표 */}
      {visible.length > 0 && (
        <ReportSection
          id="table"
          title="지표 추이"
          meta={`${MONTHS[0]} ~ ${MONTHS[LATEST]}`}
          enabled={isOn("table")}
        >
          <div className="print-card overflow-hidden rounded-md border border-stone-200/80 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-[#0095A9] text-white">
                    <th className="px-3 py-2 text-left font-semibold">조직</th>
                    <th className="px-3 py-2 text-left font-semibold">구분</th>
                    <th className="px-3 py-2 text-left font-semibold">KPI</th>
                    <th className="px-3 py-2 text-right font-semibold">단위</th>
                    {MONTHS.map((m) => (
                      <th key={m} className="px-3 py-2 text-right font-semibold tabular-nums">
                        {m}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-semibold">전월 대비</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((k) => (
                    <tr
                      key={`${k.team}-${k.id}`}
                      className="border-b border-stone-100 last:border-0"
                    >
                      <td className="px-3 py-2 text-stone-500">{k.team}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-1.5 py-px text-[10px] font-semibold ${
                            k.type === "new"
                              ? "bg-[#e6f4f6] text-[#007a8c]"
                              : "bg-stone-100 text-stone-500"
                          }`}
                        >
                          {k.type === "new" ? "신규" : "기존"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-stone-800">{k.label}</td>
                      <td className="px-3 py-2 text-right text-stone-400">{k.unit}</td>
                      {k.series.map((v, i) => (
                        <td
                          key={MONTHS[i]}
                          className={`px-3 py-2 text-right tnum ${
                            i === monthIdx ? "font-semibold text-stone-900" : "text-stone-600"
                          }`}
                        >
                          {v.toLocaleString("ko-KR")}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <Delta
                          value={Number(
                            (k.series[monthIdx] - k.series[Math.max(0, monthIdx - 1)]).toFixed(2)
                          )}
                          invert={k.invert}
                          suffix={k.unit === "%" ? "%p" : ""}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ReportSection>
      )}

      <p className="no-print mt-8 text-[11px] leading-relaxed text-stone-400">
        KPI의 월별 값은 원천 미확보 구간을 채운 대표값이다. 회의자료(6p·7p)에는 지표 정의만 있고
        실측치가 없어, 데이터 확보 후 교체 대상이다.
      </p>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------

function KpiTile({
  kpi,
  monthIdx,
  pinned,
  onPin,
}: {
  kpi: Kpi;
  monthIdx: number;
  pinned: boolean;
  onPin: () => void;
}) {
  const data = kpi.series.map((v, i) => ({ month: MONTHS[i], v }));
  const cur = kpi.series[monthIdx];
  const diff = Number((cur - kpi.series[Math.max(0, monthIdx - 1)]).toFixed(2));
  const isNew = kpi.type === "new";
  const min = Math.min(...kpi.series);
  const max = Math.max(...kpi.series);
  const stroke = kpi.highlight ? "#b45309" : "#0095A9";
  const fmt = (v: number) => v.toLocaleString("ko-KR", { maximumFractionDigits: 2 });

  return (
    <div
      className={`group relative overflow-hidden rounded-md border transition-colors ${
        kpi.highlight
          ? "border-[#0095A9]/30 bg-[#e6f4f6]/40"
          : isNew
          ? "border-stone-200 bg-white hover:border-[#0095A9]/30"
          : "border-stone-200/70 bg-stone-50/40"
      }`}
    >
      <div className="px-3.5 pb-2 pt-3">
        <div className="flex items-start gap-1.5">
          <span
            className={`mt-px shrink-0 rounded px-1.5 py-px text-[9px] font-semibold tracking-wide ${
              isNew ? "bg-[#0095A9] text-white" : "bg-stone-200 text-stone-600"
            }`}
          >
            {isNew ? "신규" : "기존"}
          </span>
          <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug text-stone-800">
            {kpi.label}
          </span>
          <button
            type="button"
            onClick={onPin}
            aria-label={pinned ? "Overview 고정 해제" : "Overview에 고정"}
            title={pinned ? "Overview 고정 해제" : "Overview에 고정"}
            className={`no-print -mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors ${
              pinned
                ? "text-[#0095A9] hover:bg-[#e6f4f6]"
                : "text-stone-300 hover:bg-stone-100 hover:text-stone-600"
            }`}
          >
            <Pin className="h-3.5 w-3.5" strokeWidth={2} fill={pinned ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="headline text-[24px] leading-none text-stone-900 tnum">{fmt(cur)}</span>
            <span className="text-[11px] text-stone-400">{kpi.unit}</span>
          </div>
          <span className="text-[11px]">
            <Delta value={diff} invert={kpi.invert} suffix={kpi.unit === "%" ? "%p" : ""} />
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400 tabular-nums">
          <span>
            최저 {fmt(min)} · 최고 {fmt(max)}
          </span>
          <span>{MONTHS[monthIdx]}</span>
        </div>
      </div>

      {/* 스파크라인 — 카드 하단을 채워 여백 제거 */}
      <div className="no-print h-[46px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`g-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 6,
                border: "1px solid #e7e5dc",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
              labelFormatter={(l) => String(l)}
              formatter={(v) => [`${fmt(Number(v ?? 0))}${kpi.unit}`, kpi.label]}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={stroke}
              strokeWidth={1.75}
              fill={`url(#g-${kpi.id})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 인쇄용 — 차트 대신 월별 값 나열 */}
      <div className="print-only border-t border-stone-200 px-3.5 py-1.5">
        <div className="flex justify-between text-[9px] tabular-nums text-stone-500">
          {kpi.series.map((v, i) => (
            <span key={MONTHS[i]} className={i === monthIdx ? "font-semibold text-stone-800" : ""}>
              {fmt(v)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
