import evidenceData from "@/data/evidence_index.json";
import type {
  EvidenceIndex,
  SlotEvidence,
  EvidenceEntry,
  MissingSlotMeta,
  DynamicPattern,
} from "@/types";

const idx = evidenceData as unknown as EvidenceIndex;

export function getSlot(slotId: string): SlotEvidence | null {
  return idx.slots[slotId] ?? null;
}

export function getMissingSlot(slotId: string): MissingSlotMeta | null {
  return idx.missing_slots?.[slotId] ?? null;
}

export function isMissing(slotId: string): boolean {
  return Boolean(idx.missing_slots?.[slotId] ?? idx.slots[slotId]?.missing);
}

export function getPolicy(key: string): string | null {
  return idx.policies[key] ?? null;
}

export function resolveCaveats(caveats?: string[]): { key: string; text: string }[] {
  if (!caveats?.length) return [];
  return caveats.map((c) => {
    const policyText = idx.policies[c];
    return policyText ? { key: c, text: policyText } : { key: "inline", text: c };
  });
}

export function getDynamicPattern(key: string): DynamicPattern | null {
  return idx.dynamic_patterns?.[key] ?? null;
}

export function getEvidenceByRank(slot: SlotEvidence, rank: EvidenceEntry["rank"]) {
  return slot.evidence.filter((e) => e.rank === rank);
}

export const EVIDENCE_META = {
  schema: idx.$schema,
  version: idx.version,
  generatedAt: idx.generated_at,
  slotCount: Object.keys(idx.slots).length,
  missingCount: Object.keys(idx.missing_slots ?? {}).length,
};
