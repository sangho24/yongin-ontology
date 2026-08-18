"use client";

import { useSyncExternalStore, useCallback } from "react";

// =============================================================================
// 사용자 설정 — Overview에 고정할 KPI, 보고서에 포함할 섹션
// localStorage에 보존. SSR에서는 빈 값으로 시작하고 mount 후 동기화.
// =============================================================================

const KEY = "ypg-exec-prefs";

type Prefs = {
  pinnedKpis: string[]; // KPI lineage id 목록
  reportSections: Record<string, string[]>; // page → 포함 섹션 id 목록
};

const EMPTY: Prefs = { pinnedKpis: [], reportSections: {} };

let cache: Prefs = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): Prefs {
  if (typeof window === "undefined") return EMPTY;
  if (loaded) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Prefs>) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  loaded = true;
  return cache;
}

function write(next: Prefs) {
  cache = next;
  loaded = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장 실패는 무시 — 화면 동작에는 영향 없음
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Overview에 고정한 KPI 목록 */
export function usePinnedKpis() {
  const pinned = useSyncExternalStore(
    subscribe,
    () => read().pinnedKpis,
    () => EMPTY.pinnedKpis
  );

  const toggle = useCallback((id: string) => {
    const cur = read();
    const next = cur.pinnedKpis.includes(id)
      ? cur.pinnedKpis.filter((x) => x !== id)
      : [...cur.pinnedKpis, id];
    write({ ...cur, pinnedKpis: next });
  }, []);

  return { pinned, toggle, isPinned: (id: string) => pinned.includes(id) };
}

/**
 * 보고서에 포함할 섹션.
 * 저장된 값이 없으면 defaults를 그대로 사용한다(최초 진입 시 전체 포함).
 */
export function useReportSections(page: string, defaults: string[]) {
  const stored = useSyncExternalStore(
    subscribe,
    () => read().reportSections[page],
    () => undefined
  );
  const selected = stored ?? defaults;

  const toggle = useCallback(
    (id: string) => {
      const cur = read();
      const base = cur.reportSections[page] ?? defaults;
      const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
      write({ ...cur, reportSections: { ...cur.reportSections, [page]: next } });
    },
    [page, defaults]
  );

  const setAll = useCallback(
    (ids: string[]) => {
      const cur = read();
      write({ ...cur, reportSections: { ...cur.reportSections, [page]: ids } });
    },
    [page]
  );

  return { selected, toggle, setAll, isOn: (id: string) => selected.includes(id) };
}
