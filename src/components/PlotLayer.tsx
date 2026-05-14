"use client";

// =============================================================================
// PlotLayer — plot 단위 v8 polygon overlay 컴포넌트
// CemeterySiteMap의 카테고리 단위 hotspot 위에 얹는 drilldown layer.
//
// 데이터 소스: plot_polygons.json (v8, OCR-first 추출)
//   - 56개 matched plot (정담원 6 / 세수연 8 / 명가여연 9 / 정남지 8 / 명당 4 /
//     천명지 4 / 정명지 3(정명지4는 OCR-only) / 기타구역 13 / 아너스톤_통합 1)
//   - extraction_failures (정명·제2G): polygon 없음 → 좌표 기반 dashed marker
//
// 좌표계: v8 polygon_pct는 0~1 fraction. SVG viewBox 0~100과 정렬 위해 ×100 변환.
//   v7 image(6600×3667)와 v8 image(4320×2400) 모두 aspect 1.80 → 동일 정규화 가능.
// ─────────────────────────────────────────────────────────────

import plotPolygonsRaw from "@/data/plot_polygons.json";

// ─────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────
export type PlotStatus = "matched" | "ocr_only_no_xlsm_row";

export type PlotRecord = {
  id: string;
  category: string;
  status: PlotStatus;
  ocr_label: string;
  ocr_coord: { x: number; y: number };
  ocr_coord_source: string;
  sampled_color: {
    rgb: [number, number, number];
    hsv: [number, number, number];
  } | null;
  polygon_pct: number[][]; // [x, y][] in 0~1 fraction
  polygon_px?: number[][];
  blob_area_px?: number;
  blob_area_pct?: number;
  extraction_confidence?: string;
  aggregateAs?: string;
};

export type ExtractionFailure = {
  id: string;
  category: string;
  ocr_source: string;
  coord_img_px: [number, number];
  coord_source: string;
  sampled_color: { rgb: [number, number, number] } | null;
  reason: string;
};

type PlotPolygonsFile = {
  version: string;
  image_size: { width: number; height: number };
  plots: PlotRecord[];
  stats: {
    total_plots_targeted: number;
    extracted_polygons: number;
    extraction_failures: string[];
    extraction_failure_details: Record<string, Omit<ExtractionFailure, "id">>;
    image_coverage_pct: number;
  };
};

const plotPolygons = plotPolygonsRaw as unknown as PlotPolygonsFile;

// ─────────────────────────────────────────────────────────────
// 카테고리 → CemeterySiteMap districtId 매핑
// plot_polygons.json의 category 값 (한글) → CemeterySiteMap DISTRICTS.id
// ─────────────────────────────────────────────────────────────
const CATEGORY_TO_DISTRICT_ID: Record<string, string> = {
  세수연: "sesuyeon",
  명가여연: "myeonggayeon",
  정명지: "jeongmyeongji",
  정남지: "jeongnamji",
  정담원: "jeongdamwon",
  명당: "myeongdang",
  천명지: "cheonmyeongji",
  아너스톤_통합: "honor_combined",
  기타구역: "etc_zone",
};

// district id → plot 목록 (matched / ocr_only 포함)
const plotsByDistrictId: Record<string, PlotRecord[]> = {};
for (const p of plotPolygons.plots) {
  const districtId = CATEGORY_TO_DISTRICT_ID[p.category];
  if (!districtId) continue;
  if (!plotsByDistrictId[districtId]) plotsByDistrictId[districtId] = [];
  plotsByDistrictId[districtId].push(p);
}

// 추출 실패 plot 목록 (정명·제2G) — coord_img_px 기반 marker
const extractionFailures: ExtractionFailure[] = Object.entries(
  plotPolygons.stats.extraction_failure_details
).map(([id, detail]) => ({ id, ...detail }));

const failuresByDistrictId: Record<string, ExtractionFailure[]> = {};
for (const f of extractionFailures) {
  const districtId = CATEGORY_TO_DISTRICT_ID[f.category];
  if (!districtId) continue;
  if (!failuresByDistrictId[districtId]) failuresByDistrictId[districtId] = [];
  failuresByDistrictId[districtId].push(f);
}

// 외부에서 plot 목록 조회용 helper (CemeterySiteMap의 plot view toggle 등)
export function getPlotsByDistrictId(districtId: string): PlotRecord[] {
  return plotsByDistrictId[districtId] ?? [];
}

export function getAllPlots(): PlotRecord[] {
  return plotPolygons.plots;
}

export function getExtractionFailures(): ExtractionFailure[] {
  return extractionFailures;
}

export function getDistrictIdByCategory(category: string): string | undefined {
  return CATEGORY_TO_DISTRICT_ID[category];
}

export const PLOT_IMAGE_SIZE = plotPolygons.image_size;

// ─────────────────────────────────────────────────────────────
// 좌표 변환 helper
// v8 polygon_pct (0~1) → SVG viewBox (0~100) percent
// ─────────────────────────────────────────────────────────────
function polygonPointsToSvg(points: number[][]): string {
  return points.map(([x, y]) => `${(x * 100).toFixed(4)},${(y * 100).toFixed(4)}`).join(" ");
}

// extraction_failure coord_img_px (절대 px) → viewBox percent
function pxToPct(
  px: [number, number],
  imageSize: { width: number; height: number }
): [number, number] {
  return [(px[0] / imageSize.width) * 100, (px[1] / imageSize.height) * 100];
}

// rgb → 'rgb(r,g,b)' CSS string. null이면 기본 회색.
function rgbToCss(rgb: [number, number, number] | null): string {
  if (!rgb) return "rgb(180,180,180)";
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

// ─────────────────────────────────────────────────────────────
// PlotLayer — props
// ─────────────────────────────────────────────────────────────
type PlotLayerProps = {
  // plot view 활성화 여부 (false면 layer 자체 미렌더)
  active: boolean;
  // 활성화된 카테고리 id (해당 카테고리의 plot만 강조). null이면 전체 plot 동일 톤.
  activeDistrictId: string | null;
  // hover된 plot id
  hoveredPlotId: string | null;
  onPlotHover: (plotId: string | null) => void;
  onPlotClick?: (plot: PlotRecord) => void;
};

export function PlotLayer({
  active,
  activeDistrictId,
  hoveredPlotId,
  onPlotHover,
  onPlotClick,
}: PlotLayerProps) {
  if (!active) return null;

  // 렌더 대상 plot 결정
  // - activeDistrictId가 있으면 그 카테고리 plot만 (drilldown 모드)
  // - 없으면 전체 plot (plot view 토글 ON)
  const plotsToRender: PlotRecord[] = activeDistrictId
    ? plotsByDistrictId[activeDistrictId] ?? []
    : plotPolygons.plots;

  const failuresToRender: ExtractionFailure[] = activeDistrictId
    ? failuresByDistrictId[activeDistrictId] ?? []
    : extractionFailures;

  return (
    <g>
      {/* matched / ocr_only plot polygon */}
      {plotsToRender.map((plot) => {
        const isOcrOnly = plot.status === "ocr_only_no_xlsm_row";
        const isHover = hoveredPlotId === plot.id;
        const fill = rgbToCss(plot.sampled_color?.rgb ?? null);
        const fillOpacity = isHover ? 0.6 : isOcrOnly ? 0.18 : 0.35;
        const strokeOpacity = isHover ? 0.95 : isOcrOnly ? 0.6 : 0.55;
        return (
          <polygon
            key={plot.id}
            points={polygonPointsToSvg(plot.polygon_pct)}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={fill}
            strokeOpacity={strokeOpacity}
            strokeWidth={isHover ? 0.35 : 0.18}
            strokeDasharray={isOcrOnly ? "0.6,0.4" : undefined}
            style={{
              transition: "fill-opacity 180ms ease-out, stroke-width 180ms ease-out",
              cursor: onPlotClick ? "pointer" : "default",
              vectorEffect: "non-scaling-stroke",
            }}
            onMouseEnter={() => onPlotHover(plot.id)}
            onMouseLeave={() => onPlotHover(null)}
            onClick={onPlotClick ? () => onPlotClick(plot) : undefined}
            aria-label={`${plot.id} — ${isOcrOnly ? "xlsm row 부재 (매출 미매핑)" : "plot polygon"}`}
          />
        );
      })}

      {/* 추출 실패 plot — dashed marker (작은 점선 원) */}
      {failuresToRender.map((failure) => {
        const [cx, cy] = pxToPct(failure.coord_img_px, plotPolygons.image_size);
        return (
          <g key={failure.id} style={{ pointerEvents: "none" }}>
            <circle
              cx={cx}
              cy={cy}
              r={1.0}
              fill="rgb(170,170,170)"
              fillOpacity={0.15}
              stroke="rgb(120,120,120)"
              strokeOpacity={0.7}
              strokeWidth={0.15}
              strokeDasharray="0.5,0.35"
              style={{ vectorEffect: "non-scaling-stroke" }}
            />
          </g>
        );
      })}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// PlotTooltip — hover된 plot의 메타 정보 floating label
// SVG와 동일 좌표계(viewBox 0~100)로 HTML overlay에 배치하기 위해
// CemeterySiteMap 측에서 hover state 받아 직접 렌더.
// 본 컴포넌트에서는 hover된 plot의 lookup helper만 export.
// ─────────────────────────────────────────────────────────────
export function getPlotById(plotId: string): PlotRecord | null {
  return plotPolygons.plots.find((p) => p.id === plotId) ?? null;
}

export function getFailureById(failureId: string): ExtractionFailure | null {
  return extractionFailures.find((f) => f.id === failureId) ?? null;
}
