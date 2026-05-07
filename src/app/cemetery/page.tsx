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
import { AppLayout } from "@/components/AppLayout";
import { Card, StatCard, WowCard, InsightBox, SourceCaption } from "@/components/Card";
import zoneKpi from "@/data/zone_kpi.json";
import { autoUnit, formatPct } from "@/lib/format";

// 용인공원 mint 톤 + 절제된 강조
const STATUS_COLORS: Record<string, string> = {
  설묘지: "#0095A9",   // mint deep (분양완료, 핵심)
  계약지: "#65B3B1",   // mint mid
  예약지: "#b3dde0",   // mint light
  이장지: "#b45309",   // amber-800 (재분양 자원)
  미판매: "#9a3412",   // brick (강조 주목)
};

export default function CemeteryPage() {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

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

  return (
    <AppLayout
      pageTitle="장지 VC 분석 — 용인공원·YPL"
      pageSubtitle="묘역 55,711기 객체 master · 계약자 master는 결손 (Root Cause·데이터 모델 참조)"
      narration={
        <div className="space-y-2">
          <p>
            장지는 <strong>객체(묘역) master만 풀 수령</strong> — 회원 master 부재로 회원 중심 KPI는 불가.
          </p>
          <p>가용재고 12,498기 잠재가치 약 <strong>2,594억원</strong>.</p>
          <p className="text-[11px] text-stone-400">출처: 260401_용인공원 전체 묘역_raw.xlsx</p>
        </div>
      }
    >
      <section className="grid gap-3 sm:grid-cols-4">
        <StatCard label="총 묘역" value={zoneKpi.meta.totalZones.toLocaleString() + "기"} />
        <StatCard
          label="분양완료율"
          value={formatPct(zoneKpi.wowMetrics.soldRateOverall)}
          sub="설묘+계약+예약 / 전체"
          trend="up"
          trendValue="78%"
        />
        <StatCard
          label="가용재고"
          value={zoneKpi.potentialValue.availableInventoryCount.toLocaleString() + "기"}
          sub="미판매 + 이장지"
          trend="down"
          trendValue="22%"
        />
        <StatCard label="평균 묘역사용료" value={autoUnit(zoneKpi.potentialValue.avgPriceOverall)} />
      </section>

      <section className="mt-6">
        <WowCard
          variant="mint"
          label="가용재고 잠재가치"
          value={autoUnit(zoneKpi.wowMetrics.potentialFromAvailable)}
          sub={`Top 단지 = ${zoneKpi.wowMetrics.topPotentialDistrict?.district} (${autoUnit(zoneKpi.wowMetrics.topPotentialDistrict?.potentialValue ?? 0)}) · 영업 우선순위·가격조정의 정량 근거`}
          footnote="가용재고(미판매+이장지) × 등급별 평균 묘역사용료 — proxy 추정. 실제 분양가는 옵션·할인·시장 변수로 ±변동"
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="분양상태 분포" subtitle="호버하여 카테고리 확인">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                paddingAngle={2}
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
              <Tooltip formatter={(v: number) => v.toLocaleString() + "기"} />
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

        <Card title="연도별 계약 건수 추이" subtitle="장지 분양속도 trend">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={yearVelocity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="연도" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => v.toLocaleString() + "건"} cursor={{ fill: "rgba(14,165,233,0.05)" }} />
              <Bar dataKey="계약 건수" fill="#0095A9" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      <section className="mt-6">
        <Card title="잠재가치 Top 10 단지" subtitle="가용재고 × 등급별 평균가 — 영업 우선순위">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={top10Districts} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="단지" tick={{ fontSize: 11 }} width={120} />
              <Tooltip cursor={{ fill: "rgba(245,158,11,0.05)" }} />
              <Bar dataKey="잠재가치(억)" fill="#65B3B1" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="정체 단지 (2022년 이후 계약 없음)" subtitle="우선 처리 후보">
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
                {zoneKpi.salesVelocity.stagnantDistricts?.slice(0, 15).map((d, i) => (
                  <tr key={i} className="border-t transition-colors hover:bg-stone-50">
                    <td className="p-2 font-medium">{d.district}</td>
                    <td className="p-2 text-right tabular-nums text-rose-600">{d.lastContractYear ?? "—"}</td>
                    <td className="p-2 text-right tabular-nums">{d.availableCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="이장지 분포 Top 단지" subtitle="재분양 자원 — 4,325기 reuse 가능">
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
                {zoneKpi.transferZones.byDistrict.slice(0, 15).map((d, i) => (
                  <tr key={i} className="border-t transition-colors hover:bg-stone-50">
                    <td className="p-2 font-medium">{d.district}</td>
                    <td className="p-2 text-right tabular-nums">{d.transferCount}</td>
                    <td className="p-2 text-right tabular-nums text-slate-500">{d.totalCount}</td>
                    <td className="p-2 text-right tabular-nums font-semibold">{formatPct(d.transferRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="mt-4">
        <InsightBox type="info" title="장지 KPI 한계와 보완 경로">
          묘역 객체 단위 KPI는 풍부하나, <strong>계약자 master 부재</strong>로 회원 LTV·재계약·영업사원 생산성 산출 불가. Data Model 페이지에서 결손이 어떻게 RFI로 자동 도출되는지 확인 가능.
        </InsightBox>
      </section>

      <section className="mt-8 border-t border-stone-200 pt-5">
        <h3 className="section-label mb-3">DATA LINEAGE</h3>
        <div className="space-y-2">
          <SourceCaption>총 묘역 55,711기 = 묘역 raw row count (26년 4월 기준)</SourceCaption>
          <SourceCaption>분양완료율 77.6% = (설묘 37,301 + 계약 5,753 + 예약 159) / 55,711</SourceCaption>
          <SourceCaption>가용재고 12,498기 = 미판매 8,173 + 이장지 4,325 (raw)</SourceCaption>
          <SourceCaption>잠재가치 = 가용재고 행에 등급별 평균 묘역사용료 매핑 후 sum (proxy 추정)</SourceCaption>
          <SourceCaption>정체 단지 = 단지별 최근 계약 연도 ≤ 2021 + 가용재고 보유</SourceCaption>
        </div>
      </section>
    </AppLayout>
  );
}
