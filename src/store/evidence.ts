"use client";

import { create } from "zustand";

// =============================================================================
// Evidence store — Drawer를 SiteShell에 1개만 mount, 모든 카드·NumberCell이
// 이 store에 slotId만 push. 페이지 navigation 중 Drawer가 unmount/remount되며
// 깜빡이던 문제 제거 + DOM·메모리 절감.
// =============================================================================

// NumberCell 같은 호출부는 slotId 외에 value/unit/label override가 필요해
// Drawer header에 셀의 실측치를 그대로 표시. Card 호출부는 slotId만 있으면 충분.
export interface EvidenceOverrides {
  value?: number;
  unit?: string;
  label?: string;
}

interface EvidenceState {
  open: boolean;
  slotId: string | null;
  overrides: EvidenceOverrides | null;
  openSlot: (slotId: string, overrides?: EvidenceOverrides) => void;
  close: () => void;
}

export const useEvidenceStore = create<EvidenceState>((set) => ({
  open: false,
  slotId: null,
  overrides: null,
  openSlot: (slotId, overrides) =>
    set({ open: true, slotId, overrides: overrides ?? null }),
  close: () => set((s) => ({ ...s, open: false })),
}));
