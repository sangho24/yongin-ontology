"use client";

import { useMemo, useState } from "react";
import { Card } from "./Card";
import districtMapData from "@/data/district_map_data.json";
import districtPolygons from "@/data/district_polygons.json";
import { autoUnit } from "@/lib/format";

// =============================================================================
// CemeterySiteMap — 용인공원 묘역 안내도 + 7개 장법(BurialMethod)별 polygon overlay
// /cemetery 페이지 "장법별 배치도" 섹션 전용 컴포넌트
//
// 데이터 소스:
//   - district_map_data.json (분석.xlsm 「구역별 매출」 시트 기반 매출·영업이익)
//   - district_polygons.json (지도 PNG에서 legend 색 sampling 후 자동 polygon 추출)
//
// 7개 대표 장법: 세수연·정명지·정남지·정담원·명가여연·명당·천명지
// (봉안당 아너스톤 노블/로얄/아너 및 기타구역은 본 지도 외 — 별도 후속)
// =============================================================================

// ─────────────────────────────────────────────────────────────
// 7개 장법 메타 (polygon 좌표는 district_polygons.json에서 자동 lookup)
// color는 지도 legend dot 기준 (RGB → hex 환산)
// ─────────────────────────────────────────────────────────────
type DistrictMeta = {
  id: string;
  name: string; // district_map_data·district_polygons name 과 정확히 일치
  color: string;
};

export const DISTRICTS: DistrictMeta[] = [
  { id: "sesuyeon",      name: "세수연",   color: "#9bcfd6" },
  { id: "myeonggayeon",  name: "명가여연", color: "#bfb6e8" },
  { id: "jeongmyeongji", name: "정명지",   color: "#a8cdb1" },
  { id: "jeongnamji",    name: "정남지",   color: "#cdd699" },
  { id: "jeongdamwon",   name: "정담원",   color: "#eecf9f" },
  { id: "myeongdang",    name: "명당",     color: "#f0d585" },
  { id: "cheonmyeongji", name: "천명지",   color: "#c9b39c" },
];

// district_polygons.json 타입
type PolygonRecord = {
  id: string;
  name: string;
  polygons_pct: number[][][]; // 단지당 N개 polygon, 각 polygon은 [x,y][] (% 기준)
  centroids_pct: number[][];
};

const polygonByName: Record<string, PolygonRecord> = Object.fromEntries(
  (districtPolygons.districts as PolygonRecord[]).map((d) => [d.name, d])
);

// ─────────────────────────────────────────────────────────────
// district_map_data.json 타입 정의 (필요한 부분만)
// ─────────────────────────────────────────────────────────────
type DistrictMetric = {
  fy25Revenue: number;
  plOperatingProfit: number;
  // 그 외 필드는 본 컴포넌트에서 사용하지 않음
};

type DistrictRecord = {
  id: string;
  name: string;
  metrics: {
    fy25Revenue: number;
    plOperatingProfit: number;
    [key: string]: unknown;
  };
  subDistrictCount: number;
  [key: string]: unknown;
};

// 장법명 → 데이터 lookup map (한글 name 키)
const districtDataMap: Record<string, { metric: DistrictMetric; subDistrictCount: number }> = Object.fromEntries(
  (districtMapData.districts as DistrictRecord[]).map((d) => [
    d.name,
    {
      metric: {
        fy25Revenue: d.metrics.fy25Revenue,
        plOperatingProfit: d.metrics.plOperatingProfit,
      },
      subDistrictCount: d.subDistrictCount,
    },
  ])
);

// ─────────────────────────────────────────────────────────────
// CemeterySiteMap — main component
// ─────────────────────────────────────────────────────────────
export function CemeterySiteMap({
  onDistrictSelect,
}: {
  onDistrictSelect?: (districtId: string, districtName: string) => void;
} = {}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // click → 활동원가 섹션 scroll + 외부 콜백 (단지 pre-select 등)
  const handleDistrictClick = (districtId: string) => {
    const d = DISTRICTS.find((x) => x.id === districtId);
    if (!d) return;
    onDistrictSelect?.(districtId, d.name);
    if (typeof document !== "undefined") {
      const el = document.getElementById("activity-cost");
      if (el) {
        const offset = 128; // sticky header + SubNav 높이
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  // 7개 장법 + 데이터 병합 (매출 desc 정렬)
  const items = useMemo(() => {
    return DISTRICTS
      .map((d) => {
        const data = districtDataMap[d.name];
        return {
          ...d,
          fy25Revenue: data?.metric.fy25Revenue ?? 0,
          operatingProfit: data?.metric.plOperatingProfit ?? 0,
          subDistrictCount: data?.subDistrictCount ?? 0,
        };
      })
      .sort((a, b) => b.fy25Revenue - a.fy25Revenue);
  }, []);

  return (
    <Card
      slotId="cemetery_site_map"
      title="장법별 배치도"
      subtitle="용인공원 묘역 안내도 위에 7개 대표 장법(세수연·정명지·정남지·정담원·명가여연·명당·천명지) polygon overlay. 봉안당·기타구역은 별도."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* ───── 좌측: 지도 + SVG polygon overlay (자동 추출) ───── */}
        <div>
          <div className="relative mx-auto w-full max-w-[1200px] overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
            {/* aspect-ratio 1.8:1 (PNG 6600×3667 ≈ 1.8) */}
            <div className="relative" style={{ aspectRatio: "1.8 / 1" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/yonginpark_map.png"
                alt="용인공원 묘역 안내도 — 장법별 색 구분"
                className="absolute inset-0 h-full w-full object-contain"
                loading="lazy"
              />
              {/* SVG polygon overlay — viewBox 0~100 (% 좌표, 지도 PNG와 1:1 align) */}
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {/*
                  지도 PNG의 색칠된 단지 영역을 그대로 보여주고, polygon은 invisible hotspot.
                  hover 시 mint glow + 약한 fill로 영역 떠오르는 효과 (subtle pulse).
                  click → #activity-cost section scroll (해당 단지 분석으로 진입).
                */}
                {DISTRICTS.map((d) => {
                  const isHover = hoveredId === d.id;
                  const poly = polygonByName[d.name];
                  if (!poly) return null;
                  return (
                    <g key={d.id}>
                      {poly.polygons_pct.map((pts, idx) => (
                        <polygon
                          key={`${d.id}-${idx}`}
                          points={pts.map((p) => `${p[0]},${p[1]}`).join(" ")}
                          fill={isHover ? d.color : "transparent"}
                          fillOpacity={isHover ? 0.32 : 0}
                          stroke={isHover ? d.color : "transparent"}
                          strokeWidth={isHover ? 0.55 : 0}
                          style={
                            isHover
                              ? {
                                  filter: "drop-shadow(0 0 1.4px rgba(0, 149, 169, 0.55))",
                                  transition: "fill-opacity 220ms ease-out, stroke-width 220ms ease-out, filter 220ms ease-out",
                                }
                              : { transition: "fill-opacity 180ms ease-out, stroke-width 180ms ease-out" }
                          }
                          onMouseEnter={() => setHoveredId(d.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onClick={() => handleDistrictClick(d.id)}
                          className="cursor-pointer"
                        >
                          <title>{d.name} — 클릭하여 활동원가 분석으로 이동</title>
                        </polygon>
                      ))}
                    </g>
                  );
                })}
                {/* hover 시 단지명 라벨 (가장 큰 polygon centroid 위) */}
                {hoveredId &&
                  (() => {
                    const d = DISTRICTS.find((x) => x.id === hoveredId);
                    if (!d) return null;
                    const poly = polygonByName[d.name];
                    if (!poly || !poly.centroids_pct[0]) return null;
                    const [cx, cy] = poly.centroids_pct[0];
                    return (
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={2.6}
                        fontWeight={700}
                        fill="#1c1917"
                        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 0.9, pointerEvents: "none" }}
                      >
                        {d.name}
                      </text>
                    );
                  })()}
              </svg>
            </div>
          </div>
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-stone-400">
            ※ 지도의 단지 색은 원본 안내도 그대로. hover 시 해당 장법 영역이 mint glow로 떠오르고, 클릭 시 활동원가 분석으로 이동합니다.
          </p>
        </div>

        {/* ───── 우측: 7 장법 카드 list ───── */}
        <div className="flex flex-col gap-2">
          <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
            장법 7곳 — 매출 내림차순 · hover 시 지도 영역 강조
          </div>
          {items.map((d) => {
            const isHover = hoveredId === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onMouseEnter={() => setHoveredId(d.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleDistrictClick(d.id)}
                className={`group flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                  isHover
                    ? "border-[#0095A9]/60 bg-[#e6f4f6]/40"
                    : "border-stone-200 bg-white hover:border-stone-300"
                } cursor-pointer`}
              >
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: d.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-semibold text-stone-900">{d.name}</span>
                    <span className="text-[10px] tabular-nums text-stone-400">
                      세부구역 {d.subDistrictCount}개
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] tabular-nums">
                    <KpiLine label="FY25 매출" value={autoUnit(d.fy25Revenue)} />
                    <KpiLine label="영업이익" value={autoUnit(d.operatingProfit)} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// 내부 helper
// ─────────────────────────────────────────────────────────────
function KpiLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9.5px] font-medium uppercase tracking-wider text-stone-400">{label}</span>
      <span className="text-[11.5px] font-semibold text-stone-800">{value}</span>
    </div>
  );
}
