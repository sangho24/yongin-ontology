"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import type { ZoneGroup, DetailZone, ZoneVcSide } from "@/types";

// =============================================================================
// ZoneSelector — 구역 다중 선택 드롭다운 (검색·카테고리 그룹 토글)
// =============================================================================

interface ZoneSelectorProps {
  zoneGroups: ZoneGroup[];
  selected: string[];
  onChange: (zoneIds: string[]) => void;
  side?: ZoneVcSide | "all";
  placeholder?: string;
  className?: string;
}

export default function ZoneSelector({
  zoneGroups,
  selected,
  onChange,
  side = "all",
  placeholder = "구역 선택",
  className = "",
}: ZoneSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // side 필터링된 그룹
  const filteredGroups = useMemo(() => {
    return zoneGroups.filter((g) => side === "all" || g.side === side);
  }, [zoneGroups, side]);

  // 검색어 적용된 그룹 (그룹 헤더 매치 시 그룹 통째 보여주고, sub-zone 매치 시 해당 zone만)
  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filteredGroups;
    return filteredGroups
      .map((g) => {
        const groupHit = g.category.toLowerCase().includes(q);
        const subs = g.subZones.filter(
          (z) =>
            groupHit ||
            z.label.toLowerCase().includes(q) ||
            z.code.toLowerCase().includes(q) ||
            z.id.toLowerCase().includes(q),
        );
        return subs.length > 0 ? { ...g, subZones: subs } : null;
      })
      .filter((g): g is ZoneGroup => g !== null);
  }, [filteredGroups, query]);

  // 모든 노출 zone (선택된 chip label 조회용)
  const allZones = useMemo(() => {
    const map = new Map<string, DetailZone>();
    filteredGroups.forEach((g) => g.subZones.forEach((z) => map.set(z.id, z)));
    return map;
  }, [filteredGroups]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // 단일 토글
  const toggleZone = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  // 그룹 전체 토글 (그룹 안에 모두 선택돼있으면 모두 해제, 아니면 모두 선택)
  const toggleGroup = (group: ZoneGroup) => {
    const ids = group.subZones.map((z) => z.id);
    const allSelected = ids.every((id) => selected.includes(id));
    if (allSelected) {
      onChange(selected.filter((s) => !ids.includes(s)));
    } else {
      const next = [...selected];
      ids.forEach((id) => {
        if (!next.includes(id)) next.push(id);
      });
      onChange(next);
    }
  };

  const removeChip = (id: string) => {
    onChange(selected.filter((s) => s !== id));
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-3 rounded-md border bg-white px-3 py-2 text-left transition-colors duration-150 ${
          open
            ? "border-[#0095A9]/50 ring-1 ring-[#0095A9]/15"
            : "border-stone-200/80 hover:border-stone-300"
        }`}
      >
        <span
          className={`text-[13px] ${
            selected.length > 0 ? "text-stone-900" : "text-stone-400"
          }`}
        >
          {selected.length > 0 ? `구역 ${selected.length}개 선택됨` : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const z = allZones.get(id);
            if (!z) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-[#e6f4f6] px-2.5 py-1 text-[11px] text-[#007a8c]"
              >
                <span className="font-medium">{z.label}</span>
                <button
                  type="button"
                  onClick={() => removeChip(id)}
                  className="rounded-full p-0.5 text-[#007a8c]/70 transition-colors duration-150 hover:bg-[#ccebee] hover:text-[#007a8c]"
                  aria-label={`${z.label} 선택 해제`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown */}
      <div
        className={`absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-md border border-stone-200/80 bg-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] transition-all duration-[220ms] ease-out ${
          open
            ? "max-h-[420px] opacity-100"
            : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        {/* Search */}
        <div className="border-b border-stone-100 px-3 py-2.5">
          <div className="flex items-center gap-2 rounded-md bg-[#f5f5f0] px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="구역명·코드 검색"
              className="w-full bg-transparent text-[12px] text-stone-800 placeholder:text-stone-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full p-0.5 text-stone-400 transition-colors duration-150 hover:bg-stone-200 hover:text-stone-600"
                aria-label="검색어 지우기"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Group list */}
        <div className="max-h-[340px] overflow-y-auto py-1">
          {visibleGroups.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12px] text-stone-400">
              일치하는 구역이 없습니다
            </div>
          ) : (
            visibleGroups.map((group) => {
              const ids = group.subZones.map((z) => z.id);
              const allSelected = ids.every((id) => selected.includes(id));
              const partial =
                !allSelected && ids.some((id) => selected.includes(id));
              return (
                <div key={group.category} className="py-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors duration-150 hover:bg-stone-50"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">
                      {group.category}
                    </span>
                    <span
                      className={`text-[10px] font-medium ${
                        allSelected
                          ? "text-[#007a8c]"
                          : partial
                            ? "text-[#0095A9]"
                            : "text-stone-400"
                      }`}
                    >
                      {allSelected ? "전체 해제" : "전체 선택"}
                    </span>
                  </button>
                  {group.subZones.map((z) => {
                    const checked = selected.includes(z.id);
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => toggleZone(z.id)}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150 ${
                          checked
                            ? "bg-[#e6f4f6] hover:bg-[#ccebee]"
                            : "hover:bg-stone-50"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-150 ${
                            checked
                              ? "border-[#0095A9] bg-[#0095A9]"
                              : "border-stone-300 bg-white"
                          }`}
                        >
                          {checked && <Check className="h-3 w-3 text-white" />}
                        </span>
                        <span
                          className={`flex-1 text-[12.5px] ${
                            checked ? "text-stone-900" : "text-stone-700"
                          }`}
                        >
                          {z.label}
                        </span>
                        <span className="text-[10px] tracking-wide text-stone-400 tnum">
                          {z.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
