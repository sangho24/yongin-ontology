"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { ArrowUpRight, GitBranch, Sparkles } from "lucide-react";
import { AppLayout, SubNav } from "@/components/AppLayout";
import { Card, EvidenceButton, StatCard, InsightBox, SourceCaption } from "@/components/Card";
import { NumberCell } from "@/components/NumberCell";
import { ActivityCostExplorer } from "@/components/ActivityCostExplorer";
import { CemeterySiteMap } from "@/components/CemeterySiteMap";
import zoneKpi from "@/data/zone_kpi.json";
import asisLogic from "@/data/asis_logic.json";
import type { NumberLineage } from "@/types";
import { autoUnit, formatPct } from "@/lib/format";

// 용인공원 mint 톤 + 절제된 강조
const STATUS_COLORS: Record<string, string> = {
  설묘지: "#0095A9",   // mint deep (분양완료, 핵심)
  계약지: "#65B3B1",   // mint mid
  예약지: "#b3dde0",   // mint light
  이장지: "#b45309",   // amber-800 (재분양 자원)
  미판매: "#9a3412",   // brick (강조 주목)
};

// As-is 확정 데이터 (0528 확정 · 더존 전달 260603)
const CEMETERY_PL = asisLogic.cemeteryPL;
const COST_ALLOCATION = asisLogic.cemeteryCostAllocation;
const ALLOCATION_PRINCIPLES = asisLogic.allocationPrinciples.cemetery;
const ORG_KPIS = asisLogic.kpiByOrg.cemetery;

// 핵심 KPI lineage — 잠재가치 / 평균 묘역사용료
const POTENTIAL_LINEAGE: NumberLineage = {
  source: "260401_용인공원 전체 묘역_raw.xlsx / 가용재고",
  formula: "(미판매 8,173 + 이장지 4,325) × 등급별 평균 묘역사용료",
  verified: false,
  unit: "원",
  asOf: "2026-04-01",
  steps: [
    { label: "묘역 raw row count", rowCount: 55711 },
    { label: "분양상태=미판매·이장지 필터", rowCount: 12498 },
    { label: "등급별 평균가 매핑 (proxy)" },
    { label: "미판매분 잠재가치", amount: zoneKpi.wowMetrics.potentialFromAvailable },
    { label: "이장지분 잠재가치", amount: zoneKpi.wowMetrics.potentialFromTransfer },
    { label: "합산 (totalSaleableValue)", amount: zoneKpi.potentialValue.totalSaleableValue },
  ],
  notes: "proxy 추정 — 실제 분양가는 옵션·할인·시장 변수로 ±변동",
};

const AVG_PRICE_LINEAGE: NumberLineage = {
  source: "260401_용인공원 전체 묘역_raw.xlsx / 묘역사용료>0",
  formula: "묘역사용료 sum / 묘역사용료>0인 row count",
  verified: true,
  unit: "원",
  asOf: "2026-04-01",
  steps: [
    { label: "묘역사용료 컬럼 추출" },
    { label: "0·결손 제외 후 평균 산출" },
    { label: "전체 평균 묘역사용료", amount: zoneKpi.potentialValue.avgPriceOverall },
  ],
  notes: "등급·단지별 편차 큼 — 잠재가치 계산은 등급별 평균을 별도 매핑",
};

// Root Cause — 장지 가설 (root-cause page와 동일한 정의이지만 inline 표시용 간단 버전)
type Hypothesis = {
  id: string;
  title: string;
  evidence: string;
  signal: "high" | "medium" | "low";
};

const ZONE_HYPOTHESES: Hypothesis[] = [
  {
    id: "Z1",
    title: "정체단지 잠재가치 누적 — 영업 우선순위 미설정",
    evidence: "2022년 이후 계약 없는 정체 단지의 가용재고가 전체 가용재고의 약 20%. 단지별 전략 부재로 잠재가치가 자연 실현되지 못함.",
    signal: "high",
  },
  {
    id: "Z2",
    title: "이장지 4,325기의 재분양 자원이 활용 안 됨",
    evidence: `이장지 잠재가치 약 ${autoUnit(zoneKpi.wowMetrics.potentialFromTransfer)}, 전체 가용재고 잠재의 ${formatPct(zoneKpi.wowMetrics.potentialFromTransfer / zoneKpi.potentialValue.totalSaleableValue, 0)} 비중. 이장 history 추적 부재로 재분양 candidates 식별 불가.`,
    signal: "high",
  },
  {
    id: "Z3",
    title: "단지·등급별 평균가 격차 큼 — 가격조정 여지",
    evidence: "등급 F 평균가 vs 등급 A 평균가 격차 다수 단지에서 관찰. 시장 수요·등급 조정·번호변경 통한 분양 활성화 여지 존재.",
    signal: "medium",
  },
  {
    id: "Z4",
    title: "계약자 dimension 추가 → 회원 LTV·재계약·가족 cross-sell KPI 활성화",
    evidence: "묘역 raw 27열에 계약번호는 77.5%이지만 계약자 정보 컬럼 0열. 데이터 모델 보강 항목 r74·NEW-001로 식별됨 — 계약자 dimension ERP 추가 시 회원 lifecycle KPI 활성화.",
    signal: "high",
  },
];

// 지도 단지 id(=CemeterySiteMap DISTRICTS.id) → ActivityCostExplorer zone id 매핑
const MAP_TO_ACTIVITY_ZONES: Record<string, string[]> = {
  sesuyeon: ["sesuyeon-1"],
  jeongmyeongji: ["jeongmyung-1", "jeongmyung-2"],
  jeongnamji: ["jeongnam-1"],
  jeongdamwon: ["jeongdam-A", "jeongdam-B"],
  myeonggayeon: ["myeonggayeon-1"],
  myeongdang: ["myeongdang-1"],
  cheonmyeongji: ["cheonmyeongji-1"],
  honor_royal: ["honor-royal-1R", "honor-royal-2R", "honor-royal-3R"],
  honor_noble: ["honor-noble-1N", "honor-noble-2N", "honor-noble-3N"],
  honor_honor: ["honor-honor-3H"],
  honor_combined: [
    "honor-royal-1R",
    "honor-royal-2R",
    "honor-royal-3R",
    "honor-noble-1N",
    "honor-noble-2N",
    "honor-noble-3N",
    "honor-honor-3H",
  ],
  etc_zone: ["etc-1"],
};

export default function CemeteryPage() {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>(["honor-royal-1R"]);

  const handleMapDistrictSelect = (districtId: string) => {
    const ids = MAP_TO_ACTIVITY_ZONES[districtId];
    if (ids && ids.length > 0) setSelectedZoneIds(ids);
  };

  const statusData = zoneKpi.statusDistribution.map((s) => ({
    name: s.status,
    value: s.count,
    category: s.category,
  }));

  const top10Districts = zoneKpi.potentialValue.byDistrict.slice(0, 10).map((d) => ({
    단지: d.district,
    "잠재가치(억)": Math.round(d.potentialValue / 100_000_000),
    "가용재고": d.availableCount,
  }));

  const yearVelocity = zoneKpi.salesVelocity.byYear.map((y) => ({
    연도: y.year,
    "계약 건수": y.contractCount,
  }));

  // SubNav 점프 핸들러
  const handleSubNavSelect = (id: string) => {
    setActiveSection(id);
    if (typeof window !== "undefined") {
      const el = document.getElementById(id);
      if (el) {
        const offset = 128; // top header + subnav 높이 보정
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  return (
    <AppLayout
      pageTitle="장지 VC 분석 — 용인공원·YPL"
      narration={
        <div className="space-y-2">
          <p>
            관리손익 로직은 <strong>0528 회의 as-is 확정</strong> · 더존(아마란스) 전달 6/3. 구역별 확정 손익·배부 로직 반영.
          </p>
          <p>
            장지는 <strong>객체(묘역) master 풀 셋업</strong>으로 객체 단위 KPI 활성. 계약자 dimension 추가 시 회원 중심 KPI 추가 활성화.
          </p>
          <p>가용재고 12,498기 잠재가치 약 <strong>2,594억원</strong>.</p>
          <p className="text-[11px] text-stone-400">출처: 260401_용인공원 전체 묘역_raw.xlsx · 더존송부용 260603</p>
        </div>
      }
    >
      <SubNav
        items={[
          { id: "overview", label: "묘역 현황" },
          { id: "site-map", label: "장법별 배치도" },
          { id: "asis-pl", label: "구역별 확정 손익" },
          { id: "allocation", label: "배부 로직" },
          { id: "potential", label: "잠재가치" },
          { id: "activity-cost", label: "구역별 활동원가" },
          { id: "root-cause", label: "Root Cause" },
          { id: "department", label: "조직별 KPI" },
        ]}
        activeId={activeSection}
        onSelect={handleSubNavSelect}
      />

      {/* ───────────────────────── 묘역 현황 ───────────────────────── */}
      <section id="overview" className="mt-8 grid gap-6 scroll-mt-32 sm:grid-cols-4">
        <StatCard slotId="cemetery_total_zones" label="총 묘역" value={zoneKpi.meta.totalZones.toLocaleString() + "기"} />
        <StatCard
          slotId="cemetery_sold_rate"
          label="분양완료율"
          value={formatPct(zoneKpi.wowMetrics.soldRateOverall)}
          sub="설묘+계약+예약 / 전체"
          trend="up"
          trendValue="78%"
        />
        <StatCard
          slotId="cemetery_available_inventory"
          label="가용재고"
          value={zoneKpi.potentialValue.availableInventoryCount.toLocaleString() + "기"}
          sub="미판매 + 이장지"
          trend="down"
          trendValue="22%"
        />
        <StatCard slotId="cemetery_avg_price_stat" label="평균 묘역사용료" value={autoUnit(zoneKpi.potentialValue.avgPriceOverall)} />
      </section>

      {/* ───────────────────────── 장법별 배치도 — 지도 + hotspot overlay ───────────────────────── */}
      <section id="site-map" className="mt-12 scroll-mt-32">
        <CemeterySiteMap onDistrictSelect={handleMapDistrictSelect} />
      </section>

      {/* ───────────────────────── 구역별 확정 손익 (As-is) ───────────────────────── */}
      <section id="asis-pl" className="mt-12 scroll-mt-32">
        <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-stone-200 pb-2">
          <h2 className="section-h">구역별 확정 손익 (As-is)</h2>
          <span className="text-[11px] tracking-wider text-stone-400">
            FY25 · 단위: 천원 · 영업이익 순
          </span>
        </div>
        <p className="mb-5 max-w-3xl text-[13px] leading-relaxed text-stone-600">
          0528 회의에서 as-is 확정된 12구역 손익. 아너스톤 로얄·노블 두 구역이 그룹 영업이익의 60%를
          차지하고, 기타구역·명가여연은 원가율이 높아 이익률이 낮음.
        </p>
        <div className="overflow-hidden rounded-md border border-stone-200/80 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/60 text-[11px] uppercase tracking-[0.08em] text-stone-500">
              <tr>
                <th className="p-3 text-left font-medium">#</th>
                <th className="p-3 text-left font-medium">구역</th>
                <th className="p-3 text-right font-medium tnum">매출</th>
                <th className="p-3 text-right font-medium tnum">매출원가</th>
                <th className="p-3 text-right font-medium tnum">원가율</th>
                <th className="p-3 text-right font-medium tnum">판관비</th>
                <th className="p-3 text-right font-medium tnum">영업이익</th>
                <th className="p-3 text-right font-medium tnum">이익률</th>
              </tr>
            </thead>
            <tbody>
              {CEMETERY_PL.zones.map((z) => {
                // 이익률에 비례한 mint 배경 강도 (최고 60.2% 기준 정규화)
                const marginIntensity = Math.max(0.05, (z.opMargin / 65) * 0.4);
                return (
                  <tr
                    key={z.name}
                    className="border-t border-stone-100 transition-colors hover:bg-[#fafaf7]"
                  >
                    <td className="p-3 text-[11px] tnum text-stone-400">{z.rank}</td>
                    <td className="p-3 font-semibold text-stone-900">{z.name}</td>
                    <td className="p-3 text-right tnum text-stone-800">
                      {z.revenue.toLocaleString()}
                    </td>
                    <td className="p-3 text-right tnum text-stone-600">
                      {z.cogs.toLocaleString()}
                    </td>
                    <td className="p-3 text-right tnum text-[11px] text-stone-500">
                      {z.cogsRatio.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right tnum text-stone-600">
                      {z.sga.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-semibold tnum text-stone-900">
                      {z.operatingIncome.toLocaleString()}
                    </td>
                    <td
                      className="p-3 text-right font-semibold tnum text-stone-900"
                      style={{ backgroundColor: `rgba(0, 149, 169, ${marginIntensity})` }}
                    >
                      {z.opMargin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-stone-300 bg-stone-50">
                <td className="p-3" />
                <td className="p-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-stone-700">
                  합계
                </td>
                <td className="p-3 text-right font-bold tnum text-stone-900">
                  {CEMETERY_PL.total.revenue.toLocaleString()}
                </td>
                <td className="p-3 text-right font-bold tnum text-stone-900">
                  {CEMETERY_PL.total.cogs.toLocaleString()}
                </td>
                <td className="p-3 text-right tnum text-[11px] font-semibold text-stone-600">
                  {CEMETERY_PL.total.cogsRatio.toFixed(1)}%
                </td>
                <td className="p-3 text-right font-bold tnum text-stone-900">
                  {CEMETERY_PL.total.sga.toLocaleString()}
                </td>
                <td className="p-3 text-right font-bold tnum text-[#0095A9]">
                  {CEMETERY_PL.total.operatingIncome.toLocaleString()}
                </td>
                <td className="p-3 text-right font-bold tnum text-[#0095A9]">
                  {CEMETERY_PL.total.opMargin.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 space-y-2">
          <SourceCaption>보고서 12~14p · 더존송부용 260603 — 0528 as-is 확정</SourceCaption>
          <p className="text-[11px] leading-relaxed text-stone-400">※ {CEMETERY_PL.labelNote}</p>
          <p className="text-[11px] leading-relaxed text-stone-400">
            ※ 매출 {CEMETERY_PL.total.revenue.toLocaleString()}천원은 12계정(수입수수료·상품매출
            포함)·YPL 포함·내부거래 제거 후 기준 — 영업매출 10계정 기준 50,240,119,779원과 집계 범위
            상이.
          </p>
        </div>
      </section>

      {/* ───────────────────────── 배부 로직 (As-is 확정) ───────────────────────── */}
      <section id="allocation" className="mt-12 scroll-mt-32">
        <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-stone-200 pb-2">
          <h2 className="section-h">배부 로직 (As-is 확정)</h2>
          <span className="text-[11px] tracking-wider text-stone-400">{COST_ALLOCATION.source}</span>
        </div>
        <p className="mb-5 max-w-3xl text-[13px] leading-relaxed text-stone-600">
          비용은 ① 직접 배부 → ② 활동 기준 배부 → ③ 간접 배부 순으로 우선 적용. 6대 비용의 계정별
          배부 방식과 로직은 0528 확정 기준.
        </p>
        {/* 배부 우선순위 3단계 */}
        <div className="grid gap-px overflow-hidden rounded-md bg-stone-200/60 md:grid-cols-3">
          {ALLOCATION_PRINCIPLES.map((p) => (
            <div key={p.order} className="bg-white p-5">
              <div className="flex items-baseline gap-2">
                <span className="headline text-[20px] leading-none text-[#0095A9] tnum">
                  {p.order}
                </span>
                <h3 className="text-[14px] font-semibold text-stone-900">{p.name}</h3>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-stone-600">{p.rule}</p>
              <div className="mt-2 text-[10px] tracking-wider text-stone-400">{p.source}</div>
            </div>
          ))}
        </div>
        {/* 6대 비용 배부 표 */}
        <div className="mt-6 overflow-hidden rounded-md border border-stone-200/80 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/60 text-[11px] uppercase tracking-[0.08em] text-stone-500">
              <tr>
                <th className="p-3 text-left font-medium">계정</th>
                <th className="p-3 text-left font-medium">구분</th>
                <th className="p-3 text-right font-medium tnum">금액 (천원)</th>
                <th className="p-3 text-left font-medium">배부 방식</th>
                <th className="p-3 text-left font-medium">배부 로직</th>
              </tr>
            </thead>
            <tbody>
              {COST_ALLOCATION.items.map((c) => (
                <tr
                  key={c.account}
                  className="border-t border-stone-100 transition-colors hover:bg-[#fafaf7]"
                >
                  <td className="p-3 font-semibold text-stone-900">{c.account}</td>
                  <td className="p-3 text-[12px] text-stone-500">{c.category}</td>
                  <td className="p-3 text-right tnum text-stone-800">
                    {c.amount.toLocaleString()}
                  </td>
                  <td className="p-3 whitespace-nowrap text-[12px] text-stone-600">{c.method}</td>
                  <td className="p-3 text-[12px] leading-relaxed text-stone-600">{c.logic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 space-y-2">
          <SourceCaption>
            백데이터: 급여대장(용인공원·YPL) · 법인카드 사용자구분 · 고정자산명세 · 계정별원장 적요
          </SourceCaption>
          <p className="text-[11px] leading-relaxed text-stone-400">※ {COST_ALLOCATION.etc}</p>
        </div>
      </section>

      {/* ───────────────────────── 잠재가치 (NumberCell hero · lineage 클릭 가능) ───────────────────────── */}
      <section id="potential" className="mt-12 scroll-mt-32">
        <div className="grid gap-6 rounded-md border border-stone-200/80 bg-white px-8 py-6 lg:grid-cols-[auto_1fr_auto_1fr] lg:items-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">
            가용재고 잠재가치
          </div>
          <div>
            <NumberCell
              value={zoneKpi.potentialValue.totalSaleableValue}
              unit="원"
              lineage={POTENTIAL_LINEAGE}
              size="lg"
              emphasis
              sub={`미판매 ${autoUnit(zoneKpi.wowMetrics.potentialFromAvailable)} + 이장지 ${autoUnit(zoneKpi.wowMetrics.potentialFromTransfer)} · Top 단지 = ${zoneKpi.wowMetrics.topPotentialDistrict?.district} (${autoUnit(zoneKpi.wowMetrics.topPotentialDistrict?.potentialValue ?? 0)}) · proxy 추정 · 클릭하여 산식 확인`}
            />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500 lg:border-l lg:border-stone-200 lg:pl-8">
            평균 묘역사용료
          </div>
          <NumberCell
            value={zoneKpi.potentialValue.avgPriceOverall}
            unit="원"
            lineage={AVG_PRICE_LINEAGE}
            size="lg"
            sub="원장 대조 완료 · 등급별 편차 별도"
          />
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <Card slotId="cemetery_status_distribution" title="분양상태 분포" subtitle="설묘·계약·예약·이장·미판매">
          <ResponsiveContainer
            width="100%"
            height={280}
            minWidth={1}
            minHeight={1}
            initialDimension={{ width: 1, height: 280 }}
          >
            <PieChart>
              <Pie
                data={statusData}
              dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                // 작은 slice(2% 미만)는 라벨 생략 — 라벨끼리 겹침 방지 (예: 예약지 0%)
                label={({ name, percent }) => {
                  const p = percent ?? 0;
                  return p < 0.02 ? "" : `${name} ${(p * 100).toFixed(0)}%`;
                }}
                labelLine={false}
              paddingAngle={2}
              isAnimationActive={false}
                onMouseEnter={(d) => setHoveredStatus(d.name ?? null)}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                {statusData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name] ?? "#64748b"}
                    stroke={hoveredStatus === entry.name ? "#1e293b" : "#fff"}
                    strokeWidth={hoveredStatus === entry.name ? 3 : 2}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString() + "기" : String(v ?? ""))} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
          {hoveredStatus && (
            <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
              <strong>{hoveredStatus}</strong> ·
              {" "}{statusData.find((s) => s.name === hoveredStatus)?.category}
            </div>
          )}
        </Card>

        <Card slotId="cemetery_contract_velocity" title="연도별 계약 건수 추이" subtitle="장지 분양속도 trend">
          <ResponsiveContainer
            width="100%"
            height={280}
            minWidth={1}
            minHeight={1}
            initialDimension={{ width: 1, height: 280 }}
          >
            <BarChart data={yearVelocity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="연도" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString() + "건" : String(v ?? ""))} cursor={{ fill: "rgba(14,165,233,0.05)" }} />
              <Bar
                dataKey="계약 건수"
                fill="#0095A9"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      <section className="mt-12">
        <Card slotId="cemetery_top10_districts" title="잠재가치 Top 10 단지" subtitle="가용재고 × 등급별 평균가 — 영업 우선순위">
          <ResponsiveContainer
            width="100%"
            height={360}
            minWidth={1}
            minHeight={1}
            initialDimension={{ width: 1, height: 360 }}
          >
            <BarChart data={top10Districts} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="단지" tick={{ fontSize: 11 }} width={120} />
              <Tooltip cursor={{ fill: "rgba(245,158,11,0.05)" }} />
              <Bar
                dataKey="잠재가치(억)"
                fill="#65B3B1"
                radius={[0, 3, 3, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <Card slotId="cemetery_stagnant_districts" title="정체 단지 (2022년 이후 계약 없음)" subtitle="우선 처리 후보">
          <div className="max-h-72 overflow-y-auto rounded border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="p-2 text-left">단지</th>
                  <th className="p-2 text-right">최근계약</th>
                  <th className="p-2 text-right">가용</th>
                </tr>
              </thead>
              <tbody>
                {(zoneKpi.salesVelocity.stagnantDistricts?.length ?? 0) === 0 ? (
                  <tr><td colSpan={3} className="p-4 text-center text-xs text-slate-400">해당 단지 없음</td></tr>
                ) : (
                  zoneKpi.salesVelocity.stagnantDistricts?.slice(0, 15).map((d, i) => (
                    <tr key={i} className="border-t transition-colors hover:bg-stone-50">
                      <td className="p-2 font-medium">{d.district}</td>
                      <td className="p-2 text-right tabular-nums text-rose-600">{d.lastContractYear ?? "—"}</td>
                      <td className="p-2 text-right tabular-nums">{d.availableCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card slotId="cemetery_transfer_zones" title="이장지 분포 Top 단지" subtitle="재분양 자원 — 4,325기 reuse 가능">
          <div className="max-h-72 overflow-y-auto rounded border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="p-2 text-left">단지</th>
                  <th className="p-2 text-right">이장</th>
                  <th className="p-2 text-right">전체</th>
                  <th className="p-2 text-right">이장률</th>
                </tr>
              </thead>
              <tbody>
                {zoneKpi.transferZones.byDistrict.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-xs text-slate-400">해당 단지 없음</td></tr>
                ) : (
                  zoneKpi.transferZones.byDistrict.slice(0, 15).map((d, i) => (
                    <tr key={i} className="border-t transition-colors hover:bg-stone-50">
                      <td className="p-2 font-medium">{d.district}</td>
                      <td className="p-2 text-right tabular-nums">{d.transferCount}</td>
                      <td className="p-2 text-right tabular-nums text-slate-500">{d.totalCount}</td>
                      <td className="p-2 text-right tabular-nums font-semibold">{formatPct(d.transferRate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* ───────────────────────── 구역별 활동원가 (핵심 인터랙션) ───────────────────────── */}
      <section id="activity-cost" className="mt-12 scroll-mt-32">
        <ActivityCostExplorer
          side="cemetery"
          defaultZoneIds={selectedZoneIds}
          title="구역별 활동원가"
          subtitle="구역을 선택하면 매출·비용 항목과 lineage가 펼쳐집니다. 다중 선택 가능."
          slotId="cemetery_zone_explorer"
        />
      </section>

      <section className="mt-12">
        <InsightBox slotId="cemetery_insight_master" type="info" title="장지 KPI 활성화 경로 — 계약자 dimension 보강">
          묘역 객체 단위 KPI는 풍부하게 활성화돼 있고, <strong>계약자 dimension 추가</strong> 시 회원 LTV·재계약·영업사원 생산성 KPI가 추가 활성화됨. Data Model 페이지에서 미활성 KPI와 보강 항목 매핑 확인.
        </InsightBox>
      </section>

      {/* ───────────────────────── Root Cause — 장지 가설 inline ───────────────────────── */}
      <section id="root-cause" className="mt-12 scroll-mt-32">
        <div className="mb-5 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">원인 가설 — 장지 VC 정체·미활용 자원</h2>
          <span className="text-[11px] tracking-wider text-stone-400">26.04 기준</span>
        </div>
        <p className="mb-6 max-w-3xl text-[13px] leading-relaxed text-stone-600">
          잠재가치는 충분하나 정체 단지·이장지 미활용·계약자 master 부재로 PI 깊이가 제한됨. 강한 신호 위주 가설 4개.
        </p>
        <div className="grid gap-4">
          {ZONE_HYPOTHESES.map((h, i) => {
            const dotColor =
              h.signal === "high"
                ? "bg-[#9a3412]"
                : h.signal === "medium"
                  ? "bg-[#b45309]"
                  : "bg-stone-400";
            const signalLabel =
              h.signal === "high" ? "STRONG" : h.signal === "medium" ? "MEDIUM" : "WEAK";
            const slotId = `cemetery_hypothesis_z${i + 1}`;
            return (
              <div
                key={h.id}
                className="rounded-md border border-stone-200/80 bg-white px-5 py-4 transition-colors hover:border-stone-300"
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                  <span className="mt-0.5 w-8 shrink-0 text-[11px] font-semibold tracking-wider text-stone-500">
                    {h.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-stone-900">{h.title}</div>
                    <div className="mt-2 text-[12px] leading-relaxed text-stone-600">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                        증거
                      </span>{" "}
                      {h.evidence}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold tracking-wider text-stone-400">
                    {signalLabel}
                  </span>
                  <EvidenceButton slotId={slotId} label={h.title} variant="subtle" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Root Cause 상세 분석 CTA — 산점도·LLM 분석·추천 액션은 별도 페이지에서 */}
        <Link
          href="/root-cause"
          className="group mt-6 flex items-center justify-between gap-6 rounded-md bg-[#0095A9] px-8 py-6 text-white transition-colors hover:bg-[#007a8c]"
        >
          <div className="flex items-center gap-5">
            <GitBranch className="h-7 w-7 shrink-0 text-[#b3dde0]" strokeWidth={1.75} />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold leading-tight">
                Root Cause 상세 분석 보기
              </div>
              <div className="mt-1.5 text-[12px] leading-relaxed text-[#ccebee]">
                산점도(단지 라벨) · 잠재가치 분포 · LLM 원인 분석 · 가설별 추천 액션
              </div>
            </div>
          </div>
          <ArrowUpRight
            className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      </section>

      {/* ───────────────────────── 조직별 KPI (As-is 확정) ───────────────────────── */}
      <section id="department" className="mt-12 scroll-mt-32">
        <div className="mb-5 flex items-baseline justify-between gap-2 border-b border-stone-200 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="section-h">조직별 KPI — 장지 VC</h2>
            <EvidenceButton slotId="cemetery_dept_kpi_cards" label="조직별 KPI — 장지 VC" variant="subtle" />
          </div>
          <span className="text-[11px] tracking-wider text-stone-400">보고서 18p · 0528 확정</span>
        </div>
        <p className="mb-6 max-w-3xl text-[13px] leading-relaxed text-stone-600">
          0528 확정 기준 장지 VC 4개 조직의 손익 Group · 기존 KPI · 신규 KPI 매핑. 신규 KPI는
          구역별 확정 손익과 연결되어 조직 단위 수익성 관리를 가능하게 함.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {ORG_KPIS.map((d) => (
            <div
              key={d.org}
              className="group rounded-md border border-stone-200/80 bg-white p-6 transition-colors hover:border-[#0095A9]/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-400">
                    {d.plGroup}
                  </div>
                  <h3 className="mt-1 text-[15px] font-semibold text-stone-900">{d.org}</h3>
                </div>
                {d.newKpi.length > 0 && (
                  <span className="flex shrink-0 items-center gap-1 rounded-sm bg-[#e6f4f6] px-1.5 py-0.5 text-[10px] font-semibold text-[#0095A9]">
                    <Sparkles className="h-3 w-3" />
                    NEW
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                    기존 KPI
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {d.baseKpi.length > 0 ? (
                      d.baseKpi.map((k, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12px] text-stone-700">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                          {k}
                        </li>
                      ))
                    ) : (
                      <li className="text-[12px] text-stone-400">—</li>
                    )}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#0095A9]">
                    신규 KPI
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {d.newKpi.length > 0 ? (
                      d.newKpi.map((k, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12px] font-medium text-[#007a8c]">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#0095A9]" />
                          {k}
                        </li>
                      ))
                    ) : (
                      <li className="text-[12px] text-stone-400">—</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-[11px] leading-relaxed text-stone-400">
          ※ {asisLogic.kpiByOrg.kpiNote}
        </p>
      </section>

      <section className="mt-12 border-t border-stone-200 pt-6">
        <h3 className="section-label mb-3">DATA LINEAGE</h3>
        <div className="space-y-2">
          <SourceCaption>총 묘역 55,711기 = 묘역 raw row count (26년 4월 기준)</SourceCaption>
          <SourceCaption>분양완료율 77.6% = (설묘 37,301 + 계약 5,753 + 예약 159) / 55,711</SourceCaption>
          <SourceCaption>가용재고 12,498기 = 미판매 8,173 + 이장지 4,325 (raw)</SourceCaption>
          <SourceCaption>잠재가치 {autoUnit(zoneKpi.potentialValue.totalSaleableValue)} = 미판매분 {autoUnit(zoneKpi.wowMetrics.potentialFromAvailable)} + 이장지분 {autoUnit(zoneKpi.wowMetrics.potentialFromTransfer)} (등급별 평균 묘역사용료 매핑 · proxy 추정)</SourceCaption>
          <SourceCaption>정체 단지 = 단지별 최근 계약 연도 ≤ 2021 + 가용재고 보유</SourceCaption>
          <SourceCaption>구역별 확정 손익·배부 로직·조직별 KPI = {asisLogic.meta.sources[0]} (보고서 12~14·18p · 0528 as-is 확정)</SourceCaption>
        </div>
        <p className="mt-6 max-w-3xl text-[11px] leading-relaxed text-stone-400">
          ※ 묘역 55,711기 객체 master는 풀 셋업이라 객체 단위 KPI 활성. 계약자 dimension 추가 시 회원 LTV·재계약·영업사원 생산성 KPI 활성화. 데이터 모델 보강 항목은{" "}
          <Link href="/data-model" className="text-[#007a8c] underline-offset-2 hover:underline">
            Data Model
          </Link>
          {" "}페이지에서 확인.
        </p>
      </section>
    </AppLayout>
  );
}
