"use client";

import { useMemo } from "react";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { useEvidenceStore } from "@/store/evidence";
import { getSlot, getMissingSlot, isMissing } from "@/lib/evidence";

// =============================================================================
// EvidenceDrawerHost — SiteShell에 단 1번만 mount되는 Drawer 호스트.
// 카드·NumberCell 측은 useEvidenceStore.openSlot(slotId, overrides)만 호출.
// =============================================================================

export function EvidenceDrawerHost() {
  const open = useEvidenceStore((s) => s.open);
  const slotId = useEvidenceStore((s) => s.slotId);
  const overrides = useEvidenceStore((s) => s.overrides);
  const close = useEvidenceStore((s) => s.close);

  const slot = useMemo(() => (slotId ? getSlot(slotId) : null), [slotId]);
  const missingMeta = useMemo(
    () => (slotId && isMissing(slotId) ? getMissingSlot(slotId) : null),
    [slotId]
  );

  // slotId가 아직 한 번도 push되지 않은 초기 상태 — Drawer 자체를 안 그림
  if (!slotId) return null;

  return (
    <EvidenceDrawer
      open={open}
      onClose={close}
      slotId={slotId}
      title={slot?.title ?? missingMeta?.title ?? overrides?.label ?? slotId}
      page={slot?.page}
      kind={slot?.kind}
      evidence={slot?.evidence}
      caveats={slot?.caveats}
      narrative={slot?.narrative}
      verified={slot?.verified}
      missing={missingMeta}
      value={overrides?.value}
      unit={overrides?.unit}
    />
  );
}
