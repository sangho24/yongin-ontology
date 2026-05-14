"use client";

import { useState, useId } from "react";

// =============================================================================
// WhatIfSlider — 단일 driver를 슬라이더로 조작하고 연결된 KPI를 실시간 재계산
// IDEAS.md §4 "What-if 슬라이더" 구현. 운영 BI 톤 — 절제된 강조.
//
// 재사용 가능 설계:
//   <WhatIfSlider
//     label="온라인 채널 비중"
//     unit="%"
//     min={0} max={50} step={1}
//     defaultValue={currentValue}
//     drivers={[{ label, compute, baseline, unit }, ...]}
//   />
// =============================================================================

const ACCENT = "#0095A9"; // mint deep — 양수 delta
const BRICK = "#9a3412"; // brick — 음수 delta

// 드라이버 1개: 슬라이더 값에 따라 시뮬레이션 값을 계산하는 함수
export interface WhatIfDriver {
  label: string;
  // 슬라이더 값 (현 단위 그대로) → 시뮬레이션 결과 숫자
  compute: (sliderValue: number) => number;
  // 시뮬레이션 없이 현재 실측값 (delta 비교 기준)
  baseline: number;
  unit?: string;
  // 표시 포맷터 — 미지정 시 toLocaleString 사용
  formatter?: (v: number) => string;
}

interface WhatIfSliderProps {
  label: string;
  unit?: string;
  min: number;
  max: number;
  step?: number;
  defaultValue: number; // 실측 baseline 값 — reset 버튼으로 복귀
  formatter?: (v: number) => string; // 슬라이더 값 자체 표시용
  drivers: WhatIfDriver[];
  caption?: string; // 슬라이더 산식 설명 (작은 글씨)
  className?: string;
}

// delta 부호·퍼센트 표시용 헬퍼
function formatDelta(current: number, baseline: number) {
  if (baseline === 0) {
    return { text: "—", pct: "—", sign: 0 };
  }
  const diff = current - baseline;
  const pct = (diff / baseline) * 100;
  const sign = Math.sign(diff);
  const arrow = sign > 0 ? "▲" : sign < 0 ? "▼" : "─";
  const pctText = `${arrow} ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  return { text: pctText, pct: pctText, sign };
}

export function WhatIfSlider({
  label,
  unit,
  min,
  max,
  step = 1,
  defaultValue,
  formatter,
  drivers,
  caption,
  className = "",
}: WhatIfSliderProps) {
  const [value, setValue] = useState<number>(defaultValue);
  const sliderId = useId();

  // 슬라이더 트랙 위 baseline(현재값) 마커 위치 — 비율 0~1
  const baselineRatio = (defaultValue - min) / (max - min);
  const currentRatio = (value - min) / (max - min);
  const isModified = Math.abs(value - defaultValue) > 1e-9;

  const fmt = formatter ?? ((v: number) => v.toLocaleString("ko-KR"));

  return (
    <div
      className={`rounded-md border border-stone-200/80 bg-white p-6 ${className}`}
    >
      {/* 헤더 — 라벨 + 시뮬레이션 상태 배지 + reset */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[13px] font-semibold tracking-[0.02em] text-stone-900">
            {label} 시뮬레이션
          </h3>
          {isModified && (
            <span className="rounded-sm bg-[#e6f4f6] px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-[#007a8c]">
              SIM
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setValue(defaultValue)}
          disabled={!isModified}
          className={`text-[11px] tracking-wide transition-colors ${
            isModified
              ? "text-[#0095A9] hover:text-[#007a8c]"
              : "cursor-default text-stone-400"
          }`}
        >
          현재 (시뮬레이션 없음)
        </button>
      </div>

      {/* 슬라이더 영역 */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor={sliderId}
            className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500"
          >
            {label}
          </label>
          <div className="flex items-baseline gap-1">
            <span className="tnum text-[20px] font-semibold leading-none text-stone-900">
              {fmt(value)}
            </span>
            {unit && (
              <span className="text-[11px] font-medium text-stone-500">{unit}</span>
            )}
          </div>
        </div>

        {/* 슬라이더 트랙 + baseline 마커 */}
        <div className="relative mt-3">
          {/* baseline (현재값) 점선 마커 */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 z-10 h-3 w-px -translate-y-1/2 border-l border-dashed border-stone-400"
            style={{ left: `calc(${baselineRatio * 100}% )` }}
          />
          <input
            id={sliderId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-[#0095A9] outline-none focus:ring-2 focus:ring-[#0095A9]/30"
            style={{
              // 현재값까지 트랙 채우기
              background: `linear-gradient(to right, ${ACCENT} 0%, ${ACCENT} ${
                currentRatio * 100
              }%, #e7e5e4 ${currentRatio * 100}%, #e7e5e4 100%)`,
            }}
          />
          {/* 트랙 min/max 표기 */}
          <div className="mt-1.5 flex justify-between text-[10px] tracking-wide text-stone-400">
            <span>
              {fmt(min)}
              {unit}
            </span>
            <span>
              현재 {fmt(defaultValue)}
              {unit}
            </span>
            <span>
              {fmt(max)}
              {unit}
            </span>
          </div>
        </div>
      </div>

      {/* 시뮬레이션 결과 패널 — driver별 3-stat */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {drivers.map((d) => {
          const sim = d.compute(value);
          const delta = formatDelta(sim, d.baseline);
          const deltaColor =
            delta.sign > 0 ? ACCENT : delta.sign < 0 ? BRICK : "#a8a29e";
          const dfmt = d.formatter ?? ((v: number) => v.toLocaleString("ko-KR"));

          return (
            <div
              key={d.label}
              className="rounded-md border border-stone-200/70 bg-stone-50/40 p-4"
            >
              <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-stone-500">
                {d.label}
              </div>

              {/* 시뮬레이션 결과 (메인 숫자) */}
              <div className="mt-2 flex items-baseline gap-1">
                <span
                  className="tnum text-[18px] font-semibold leading-none"
                  style={{ color: isModified ? deltaColor : "#1c1917" }}
                >
                  {dfmt(sim)}
                </span>
                {d.unit && (
                  <span className="text-[10.5px] font-medium text-stone-500">
                    {d.unit}
                  </span>
                )}
              </div>

              {/* baseline + delta */}
              <div className="mt-2.5 flex items-baseline justify-between text-[10.5px] leading-relaxed">
                <span className="text-stone-400">
                  현재 {dfmt(d.baseline)}
                  {d.unit ?? ""}
                </span>
                <span
                  className="tnum font-medium"
                  style={{ color: isModified ? deltaColor : "#a8a29e" }}
                >
                  {isModified ? delta.text : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* caption — 산식 설명 */}
      {caption && (
        <p className="mt-4 text-[10.5px] leading-relaxed text-stone-500">
          {caption}
        </p>
      )}
    </div>
  );
}
