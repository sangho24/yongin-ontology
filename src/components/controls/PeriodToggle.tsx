"use client";

import type { Period } from "@/types";

// =============================================================================
// PeriodToggle — 월별 / 연간 segment control
// =============================================================================

interface PeriodToggleProps {
  value: Period;
  onChange: (p: Period) => void;
  className?: string;
}

const options: { key: Period; label: string }[] = [
  { key: "monthly", label: "월별" },
  { key: "yearly", label: "연간" },
];

export default function PeriodToggle({
  value,
  onChange,
  className = "",
}: PeriodToggleProps) {
  return (
    <div
      className={`inline-flex items-center rounded-md border border-stone-200/80 bg-white p-0.5 ${className}`}
      role="group"
      aria-label="기간 토글"
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`rounded-[5px] px-3.5 py-1.5 text-[12px] font-medium transition-colors duration-150 ${
              active
                ? "bg-[#0095A9] text-white"
                : "bg-white text-stone-600 hover:text-stone-900"
            }`}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
