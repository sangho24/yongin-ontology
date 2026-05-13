"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "./Card";
import districtMapData from "@/data/district_map_data.json";
import districtPolygons from "@/data/district_polygons.json";
import { autoUnit } from "@/lib/format";

// =============================================================================
// CemeterySiteMap — 용인공원 묘역 안내도 + 대구역별 polygon overlay
// /cemetery 페이지 "장법별 배치도" 섹션 전용 컴포넌트
//
// 데이터 소스:
//   - district_map_data.json (분석.xlsm 「구역별 매출」 시트 기반 매출·영업이익)
//   - district_polygons.json (지도 PNG OCR-first sampling + HSV mask로 자동 polygon 추출)
//
// 분석.xlsm 「구역별 매출」 시트 = 11개 대구역.
// 단, 지도에는 봉안당 노블/로얄/아너 구분이 없어 "아너스톤" 통합 영역으로 hover/click,
// 카드 클릭 시 등급별 매출이 드롭다운으로 펼쳐짐.
// 화면 1차 카드 = 야외 7 + 아너스톤(통합) + 기타구역 = 9개.
// ─────────────────────────────────────────────────────────────
type DistrictMeta = {
  id: string;
  name: string;          // district_map_data·district_polygons name 과 정확히 일치
  color: string;
  hasPolygon: boolean;   // false면 지도 polygon 없이 카드 list만 노출
  subIds?: string[];     // 드롭다운 sub-카드 id (district_map_data.json id)
};

// 1차 카드 9개 (지도 노출 기준)
export const DISTRICTS: DistrictMeta[] = [
  // 야외 7개 — 지도 polygon overlay
  { id: "sesuyeon",      name: "세수연",     color: "#9bcfd6", hasPolygon: true },
  { id: "myeonggayeon",  name: "명가여연",   color: "#bfb6e8", hasPolygon: true },
  { id: "jeongmyeongji", name: "정명지",     color: "#a8cdb1", hasPolygon: true },
  { id: "jeongnamji",    name: "정남지",     color: "#cdd699", hasPolygon: true },
  { id: "jeongdamwon",   name: "정담원",     color: "#eecf9f", hasPolygon: true },
  { id: "myeongdang",    name: "명당",       color: "#f0d585", hasPolygon: true },
  { id: "cheonmyeongji", name: "천명지",     color: "#c9b39c", hasPolygon: true },
  // 아너스톤(통합) — 지도 위 단일 polygon(디스크형), 클릭 시 노블/로얄/아너 드롭다운
  {
    id: "honor_combined", name: "아너스톤",   color: "#65B3B1", hasPolygon: true,
    subIds: ["honor_royal", "honor_noble", "honor_honor"],
  },
  // 기타구역 — 분류 잔여 단지군 (지도 외)
  { id: "etc_zone",      name: "기타구역",   color: "#b8b8b8", hasPolygon: false },
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

// id → 데이터 record (드롭다운 sub-카드 lookup용)
const districtDataById: Record<string, DistrictRecord> = Object.fromEntries(
  (districtMapData.districts as DistrictRecord[]).map((d) => [d.id, d])
);

// 아너스톤(통합) 합산 metric
const HONOR_SUB_IDS = ["honor_royal", "honor_noble", "honor_honor"];
const honorCombinedMetric = HONOR_SUB_IDS.reduce(
  (acc, id) => {
    const d = districtDataById[id];
    if (!d) return acc;
    acc.fy25Revenue += d.metrics.fy25Revenue;
    acc.plOperatingProfit += d.metrics.plOperatingProfit;
    return acc;
  },
  { fy25Revenue: 0, plOperatingProfit: 0 }
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // click → 활동원가 섹션 scroll + 외부 콜백 (단지 pre-select 등).
  // 아너스톤 통합 카드는 sub 드롭다운 토글만 수행 — 활동원가 진입은 sub 카드 클릭에서.
  const handleDistrictClick = (districtId: string) => {
    const d = DISTRICTS.find((x) => x.id === districtId);
    if (!d) return;
    if (d.subIds && d.subIds.length > 0) {
      setExpandedId((prev) => (prev === districtId ? null : districtId));
      return;
    }
    onDistrictSelect?.(districtId, d.name);
    scrollToActivityCost();
  };

  const handleSubClick = (subId: string, subName: string) => {
    onDistrictSelect?.(subId, subName);
    scrollToActivityCost();
  };

  const scrollToActivityCost = () => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("activity-cost");
    if (!el) return;
    const offset = 128;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  // 9개 1차 카드 + 데이터 병합 (매출 desc 정렬). 아너스톤은 sub 합산값 사용.
  const items = useMemo(() => {
    return DISTRICTS
      .map((d) => {
        if (d.id === "honor_combined") {
          return {
            ...d,
            fy25Revenue: honorCombinedMetric.fy25Revenue,
            operatingProfit: honorCombinedMetric.plOperatingProfit,
            subDistrictCount: 0,
          };
        }
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
      subtitle="분석.xlsm「구역별 매출」 시트 기준 11개 대구역. 야외 7 + 아너스톤(통합) = 8개는 지도 hover·click, 아너스톤 카드 클릭 시 노블/로얄/아너 등급별로 펼침. 기타구역은 카드 전용."
    >
      <div className="flex flex-col gap-6">
        {/* ───── 상단: 지도 + SVG polygon overlay (가로 와이드) ───── */}
        <div>
          <div className="relative w-full overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
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
                  if (!d.hasPolygon) return null;
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
                          fillOpacity={isHover ? 0.65 : 0}
                          stroke="none"
                          style={
                            isHover
                              ? {
                                  filter: "drop-shadow(0 0.8px 1.4px rgba(0, 0, 0, 0.18))",
                                  transition: "fill-opacity 220ms ease-out, filter 220ms ease-out",
                                }
                              : { transition: "fill-opacity 180ms ease-out" }
                          }
                          onMouseEnter={() => setHoveredId(d.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onClick={() => handleDistrictClick(d.id)}
                          className="cursor-pointer"
                          aria-label={`${d.name} — 클릭하여 활동원가 분석으로 이동`}
                        />
                      ))}
                    </g>
                  );
                })}
              </svg>
              {/* hover 시 단지명 라벨 — HTML로 표시해 SVG stretch(preserveAspectRatio=none) 영향 회피 */}
              {hoveredId &&
                (() => {
                  const d = DISTRICTS.find((x) => x.id === hoveredId);
                  if (!d) return null;
                  const poly = polygonByName[d.name];
                  if (!poly || !poly.centroids_pct[0]) return null;
                  const [cx, cy] = poly.centroids_pct[0];
                  return (
                    <div
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[13px] font-semibold tracking-tight text-stone-900"
                      style={{
                        left: `${cx}%`,
                        top: `${cy}%`,
                        textShadow: "0 0 4px #fff, 0 0 4px #fff, 0 0 6px rgba(255,255,255,0.9)",
                      }}
                    >
                      {d.name}
                    </div>
                  );
                })()}
            </div>
          </div>
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-stone-400">
            ※ 지도의 단지 색은 원본 안내도 그대로. hover 시 해당 장법 영역이 mint glow로 떠오르고, 클릭 시 활동원가 분석으로 이동합니다.
          </p>
        </div>

        {/* ───── 하단: 9개 1차 카드 list (지도 폭에 맞춘 가로 그리드) ───── */}
        <div>
          <div className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
            대구역 9곳 — 매출 내림차순 · 아너스톤은 클릭 시 등급별 펼침
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {items.map((d) => {
            const isHover = hoveredId === d.id;
            const isExpandable = !!(d.subIds && d.subIds.length > 0);
            const isExpanded = expandedId === d.id;
            return (
              <div key={d.id}>
                <button
                  type="button"
                  onMouseEnter={() => d.hasPolygon && setHoveredId(d.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleDistrictClick(d.id)}
                  className={`group flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
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
                        {isExpandable
                          ? "등급 3개 · 클릭하여 펼침"
                          : d.hasPolygon
                            ? `세부구역 ${d.subDistrictCount}개`
                            : "지도 외 (카드)"}
                      </span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] tabular-nums">
                      <KpiLine label="FY25 매출" value={autoUnit(d.fy25Revenue)} />
                      <KpiLine label="영업이익" value={autoUnit(d.operatingProfit)} />
                    </div>
                  </div>
                  {isExpandable && (
                    <ChevronDown
                      className={`mt-1 h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                {/* 아너스톤 드롭다운 — 노블/로얄/아너 sub 카드 */}
                {isExpandable && isExpanded && (
                  <div className="mt-1.5 ml-6 flex flex-col gap-1.5 border-l-2 border-stone-200 pl-3">
                    {d.subIds!.map((subId) => {
                      const rec = districtDataById[subId];
                      if (!rec) return null;
                      return (
                        <button
                          key={subId}
                          type="button"
                          onClick={() => handleSubClick(subId, rec.name)}
                          className="group flex items-start gap-2 rounded-md border border-stone-200 bg-white px-2.5 py-2 text-left transition-colors hover:border-stone-300 cursor-pointer"
                        >
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#65B3B1]" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[12px] font-medium text-stone-800">{rec.name}</span>
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-1.5 text-[10.5px] tabular-nums">
                              <KpiLine label="매출" value={autoUnit(rec.metrics.fy25Revenue)} />
                              <KpiLine label="영업이익" value={autoUnit(rec.metrics.plOperatingProfit)} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          </div>
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
