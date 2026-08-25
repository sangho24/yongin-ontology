"use client";

import { usePathname } from "next/navigation";
import { InfoTip, TipRow } from "@/components/exec/Bits";
import { MATERIALS, SCREEN_MATERIAL_MAP, routeSummary } from "@/data/screen_material_map";

/** 섹션 옆 "데이터 출처" 툴팁 - 전달받은 원천자료 중 무엇에서 나온 값인지 보여준다 */
export function SourceTip({ route, id }: { route: string; id: string }) {
  const entry = SCREEN_MATERIAL_MAP[`${route}#${id}`];
  if (!entry) return null;

  if (entry.materials.length === 0) {
    return (
      <InfoTip title="데이터 출처" align="right">
        <TipRow label="구분">7개 자료 외 별도 소스</TipRow>
        <TipRow label={entry.field}>{entry.note}</TipRow>
      </InfoTip>
    );
  }

  return (
    <InfoTip title="데이터 출처" align="right">
      {entry.materials.map((id) => {
        const m = MATERIALS.find((mat) => mat.id === id);
        if (!m) return null;
        return (
          <TipRow key={m.id} label={m.id}>
            {m.name}
          </TipRow>
        );
      })}
      {entry.note && <TipRow label="비고">{entry.note}</TipRow>}
    </InfoTip>
  );
}

/**
 * 탭(라우트) 단위 데이터 출처 - 페이지 제목 옆에 붙는다.
 * 그 탭의 섹션들이 어느 자료를 몇 개나 참조하는지 한 번에 보여준다.
 */
export function TabSourceTip() {
  const pathname = usePathname();
  const summary = routeSummary(pathname ?? "");
  if (!summary) return null;

  return (
    <InfoTip title="이 탭의 데이터 출처" align="left">
      <TipRow label="성격">
        {summary.nature} · 섹션 {summary.sections}개
      </TipRow>
      {summary.counts.map((c) => (
        <TipRow key={c.id} label={c.id}>
          {c.name} · {c.count}개 섹션
        </TipRow>
      ))}
      {summary.outside > 0 && (
        <TipRow label="자료 외">
          7개 자료가 아닌 소스 {summary.outside}개 섹션
        </TipRow>
      )}
    </InfoTip>
  );
}
