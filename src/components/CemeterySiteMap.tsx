"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "./Card";
import districtMapData from "@/data/district_map_data.json";
import districtPolygons from "@/data/district_polygons.json";
import { autoUnit } from "@/lib/format";
import {
  PlotLayer,
  getPlotsByDistrictId,
  getPlotById,
  type PlotRecord,
} from "./PlotLayer";

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
  // plot view toggle: false=카테고리 view(기존 동작), true=plot view(v8 plot 단위 layer 활성화)
  const [plotViewActive, setPlotViewActive] = useState(false);
  // plot view 활성화 시 hover된 plot id
  const [hoveredPlotId, setHoveredPlotId] = useState<string | null>(null);
  // plot click 시 사이드 카드에 상세 노출
  const [selectedPlot, setSelectedPlot] = useState<PlotRecord | null>(null);

  // plot view 활성화 시 강조 대상 카테고리:
  //   1) hoveredId가 있고 plot이 있는 카테고리면 그 카테고리만 강조
  //   2) 없으면 전체 plot 동일 톤
  const activeDistrictForPlots: string | null = useMemo(() => {
    if (!plotViewActive) return null;
    if (!hoveredId) return null;
    const plotsForHover = getPlotsByDistrictId(hoveredId);
    return plotsForHover.length > 0 ? hoveredId : null;
  }, [plotViewActive, hoveredId]);

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
        {/* ───── View toggle: 카테고리 view ↔ plot view ───── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-md border border-stone-200 bg-white p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => {
                setPlotViewActive(false);
                setHoveredPlotId(null);
                setSelectedPlot(null);
              }}
              className={`rounded px-2.5 py-1 transition-colors ${
                !plotViewActive
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:text-stone-900"
              }`}
              aria-pressed={!plotViewActive}
            >
              카테고리 view
            </button>
            <button
              type="button"
              onClick={() => setPlotViewActive(true)}
              className={`rounded px-2.5 py-1 transition-colors ${
                plotViewActive
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:text-stone-900"
              }`}
              aria-pressed={plotViewActive}
            >
              Plot view (v8)
            </button>
          </div>
          <div className="text-[10px] leading-relaxed text-stone-400">
            Plot view: 56개 plot 단위 polygon. 카테고리 hover로 해당 plot만 강조.
          </div>
        </div>

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
                  // plot view 활성 시 카테고리 hover fill은 약하게 (plot polygon이 주연)
                  // pointerEvents는 그대로 두어 plot 사이 빈 영역에서 카테고리 hover 가능.
                  // plot polygon이 위에 그려져 있으므로 plot 위에서는 plot이 hover를 받음.
                  const hoverFillOpacity = plotViewActive ? 0.12 : 0.65;
                  return (
                    <g key={d.id}>
                      {poly.polygons_pct.map((pts, idx) => (
                        <polygon
                          key={`${d.id}-${idx}`}
                          points={pts.map((p) => `${p[0]},${p[1]}`).join(" ")}
                          fill={isHover ? d.color : "transparent"}
                          fillOpacity={isHover ? hoverFillOpacity : 0}
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
                {/*
                  PlotLayer — plot view 활성화 시 v8 plot 단위 polygon 노출.
                  카테고리 hotspot 다음에 그려서 paint order상 위에 위치 → plot 영역에서 plot이 hover를 받고,
                  plot 외부 카테고리 영역에서는 카테고리 hotspot이 그대로 hover를 받는다.
                */}
                <PlotLayer
                  active={plotViewActive}
                  activeDistrictId={activeDistrictForPlots}
                  hoveredPlotId={hoveredPlotId}
                  onPlotHover={setHoveredPlotId}
                  onPlotClick={(plot) => setSelectedPlot(plot)}
                />
              </svg>
              {/* hover 시 단지명 라벨 — HTML로 표시해 SVG stretch(preserveAspectRatio=none) 영향 회피 */}
              {!plotViewActive && hoveredId &&
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
              {/* plot view 활성 시 plot hover label */}
              {plotViewActive && hoveredPlotId &&
                (() => {
                  const plot = getPlotById(hoveredPlotId);
                  if (!plot || plot.polygon_pct.length === 0) return null;
                  // polygon 중심 좌표 — 단순 평균 (centroid는 v8에 없음)
                  const cx =
                    (plot.polygon_pct.reduce((s, p) => s + p[0], 0) / plot.polygon_pct.length) *
                    100;
                  const cy =
                    (plot.polygon_pct.reduce((s, p) => s + p[1], 0) / plot.polygon_pct.length) *
                    100;
                  const isOcrOnly = plot.status === "ocr_only_no_xlsm_row";
                  const isHonor = plot.category === "아너스톤_통합";
                  return (
                    <div
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded border border-stone-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-stone-800 shadow-sm"
                      style={{ left: `${cx}%`, top: `${cy}%` }}
                    >
                      <div className="font-semibold text-stone-900">{plot.id}</div>
                      {isOcrOnly && (
                        <div className="mt-0.5 text-[10px] text-amber-700">
                          xlsm row 부재 · 매출 미매핑
                        </div>
                      )}
                      {isHonor && (
                        <div className="mt-0.5 text-[10px] text-stone-500">
                          아너스톤 R/N/H 통합 76개 · 분양도면 수령 시 분할 layer 추가 예정
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>
          </div>
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-stone-400">
            ※ 지도의 단지 색은 원본 안내도 그대로. hover 시 해당 장법 영역이 mint glow로 떠오르고, 클릭 시 활동원가 분석으로 이동합니다.
            {plotViewActive && (
              <>
                {" "}Plot view: 56개 plot polygon 활성. <span className="text-stone-500">점선 외곽선</span> = OCR-only(매출 미매핑, 정명지4). <span className="text-stone-500">회색 dashed marker</span> = 추출 보류(정명·제2G).
              </>
            )}
          </p>
        </div>

        {/* ───── Plot 상세 사이드 카드 (plot click 시) ───── */}
        {selectedPlot && (
          <PlotDetailCard plot={selectedPlot} onClose={() => setSelectedPlot(null)} />
        )}

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

// ─────────────────────────────────────────────────────────────
// PlotDetailCard — plot click 시 상세 메타 노출
// 매출/영업이익 데이터는 plot 단위로 ledger crosscheck가 되어 있지 않으므로 N/A.
// 향후 expected_plots.json의 plot id로 ledger 매칭 가능해지면 KPI 추가.
// ─────────────────────────────────────────────────────────────
function PlotDetailCard({
  plot,
  onClose,
}: {
  plot: PlotRecord;
  onClose: () => void;
}) {
  const isOcrOnly = plot.status === "ocr_only_no_xlsm_row";
  const isHonor = plot.category === "아너스톤_통합";
  const rgb = plot.sampled_color?.rgb;
  const colorSwatch = rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : "rgb(180,180,180)";
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
            style={{ backgroundColor: colorSwatch }}
          />
          <div>
            <div className="text-[14px] font-semibold text-stone-900">{plot.id}</div>
            <div className="mt-0.5 text-[11px] text-stone-500">
              {plot.category}
              {isOcrOnly && (
                <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  xlsm row 부재
                </span>
              )}
              {isHonor && (
                <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                  R/N/H 통합 76개
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-stone-400 hover:text-stone-700"
        >
          닫기
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] tabular-nums sm:grid-cols-4">
        <KpiLine label="status" value={plot.status} />
        <KpiLine
          label="추출 신뢰도"
          value={plot.extraction_confidence ?? "—"}
        />
        <KpiLine
          label="blob area"
          value={plot.blob_area_pct ? `${(plot.blob_area_pct * 100).toFixed(3)}%` : "—"}
        />
        <KpiLine
          label="OCR coord"
          value={`(${plot.ocr_coord.x.toFixed(0)}, ${plot.ocr_coord.y.toFixed(0)})`}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] text-stone-600 sm:grid-cols-2">
        <div>
          <span className="font-medium text-stone-500">OCR label: </span>
          {plot.ocr_label}
        </div>
        <div>
          <span className="font-medium text-stone-500">coord source: </span>
          {plot.ocr_coord_source}
        </div>
      </div>

      {isOcrOnly && (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-amber-800">
          이 plot은 안내도에서 라벨이 발견됐으나 분석.xlsm 「구역별 매출」 시트에 대응 row가 없습니다. 매출 매핑 보강 시
          KPI 활성화 가능.
        </p>
      )}

      {isHonor && (
        <p className="mt-3 rounded border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-stone-700">
          아너스톤은 분양도면 미수령 상태로 봉안당 76개 plot이 단일 polygon으로 통합됐습니다. 도면 보강 시 R/N/H 등급별
          분할 layer 추가 예정.
        </p>
      )}
    </div>
  );
}
