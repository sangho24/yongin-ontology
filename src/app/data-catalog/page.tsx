"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Database, AlertCircle, Link as LinkIcon, Tag } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import catalogData from "@/data/data_catalog.json";
import type { DataCatalog, Dataset, DataCatalogCategoryKey } from "@/types";

// =============================================================================
// /data-catalog — 회사 발표용 자료 인벤토리
// 파일경로·영업비밀·PII 노출 X. 자료명·성격·컬럼·매핑만.
// =============================================================================

const catalog = catalogData as unknown as DataCatalog;

export default function DataCatalogPage() {
  const [activeCategory, setActiveCategory] = useState<DataCatalogCategoryKey | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categoryMap = useMemo(() => {
    const m = new Map<string, (typeof catalog.categories)[number]>();
    catalog.categories.forEach((c) => m.set(c.key, c));
    return m;
  }, []);

  const datasetsByCategory = useMemo(() => {
    const groups = new Map<string, Dataset[]>();
    catalog.datasets.forEach((d) => {
      const arr = groups.get(d.category) ?? [];
      arr.push(d);
      groups.set(d.category, arr);
    });
    return groups;
  }, []);

  const filtered =
    activeCategory === "all"
      ? catalog.datasets
      : catalog.datasets.filter((d) => d.category === activeCategory);

  const totalKpiLinks = useMemo(
    () => catalog.datasets.reduce((sum, d) => sum + (d.linkedKpiCount ?? 0), 0),
    []
  );

  return (
    <AppLayout
      pageTitle="Data Catalog"
      pageSubtitle="용인공원 그룹 PI에서 수령한 SharePoint 자료의 인벤토리. 각 자료의 성격·핵심 컬럼·연결 KPI·관련 자료를 한 화면에서 추적합니다."
      narration={
        <>
          <p>
            본 카탈로그는 <strong className="text-stone-700">발표용</strong>입니다 —
            파일경로·영업비밀·PII raw는 노출하지 않고, 자료의 성격과 활용 위치만 박제했습니다.
          </p>
          <p className="mt-3">
            상세는 행 클릭 시 펼쳐지는 패널에서 확인 — 컬럼·범주 분포·연결 KPI·매핑된 다른 자료·주의사항.
          </p>
        </>
      }
    >
      {/* 상단 통계 */}
      <section className="mb-8 grid grid-cols-3 gap-4">
        <StatBox label="수령 자료" value={catalog.datasets.length.toString()} sub="그룹화 단위" />
        <StatBox label="자료 카테고리" value={catalog.categories.length.toString()} />
        <StatBox label="연결 KPI 합계" value={totalKpiLinks.toString()} sub="중복 포함 — 자료 × KPI" />
      </section>

      {/* 카테고리 필터 chip */}
      <section className="mb-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            label={`전체 ${catalog.datasets.length}`}
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            color="#475569"
          />
          {catalog.categories.map((c) => {
            const count = datasetsByCategory.get(c.key)?.length ?? 0;
            if (count === 0) return null;
            return (
              <FilterChip
                key={c.key}
                label={`${c.label} ${count}`}
                active={activeCategory === c.key}
                onClick={() => setActiveCategory(c.key)}
                color={c.color}
              />
            );
          })}
        </div>
      </section>

      {/* 자료 목록 */}
      <section className="space-y-1.5">
        {filtered.map((d) => {
          const cat = categoryMap.get(d.category);
          const expanded = expandedId === d.id;
          return (
            <div
              key={d.id}
              className="rounded-md border border-stone-200/80 bg-white transition-colors duration-150 hover:border-stone-300"
            >
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : d.id)}
                className="flex w-full items-start gap-4 px-5 py-4 text-left"
                aria-expanded={expanded}
              >
                <ChevronRight
                  className={`mt-1 h-4 w-4 shrink-0 text-stone-400 transition-transform duration-150 ${
                    expanded ? "rotate-90" : ""
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[14px] font-semibold tracking-tight text-stone-900">
                      {d.name}
                    </span>
                    {cat && (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: `${cat.color}14`,
                          color: cat.color,
                        }}
                      >
                        {cat.label}
                      </span>
                    )}
                    <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-stone-400 tnum">
                      {d.natureCode}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11.5px] text-stone-500">
                    {d.scope && <span>{d.scope}</span>}
                    {d.shape && <span className="tnum">{d.shape}</span>}
                    {d.owner && <span>{d.owner}</span>}
                  </div>
                </div>
                {(d.linkedKpiCount ?? 0) > 0 && (
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-stone-400">
                      연결 KPI
                    </div>
                    <div className="mt-0.5 text-[14px] font-semibold tnum text-[#0095A9]">
                      {d.linkedKpiCount}
                    </div>
                  </div>
                )}
              </button>

              {expanded && <DatasetDetail dataset={d} />}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-md border border-dashed border-stone-300 bg-white p-8 text-center text-[13px] text-stone-500">
            선택한 카테고리에 자료가 없습니다.
          </div>
        )}
      </section>
    </AppLayout>
  );
}

// =============================================================================
// 자료 상세 (expand)
// =============================================================================
function DatasetDetail({ dataset: d }: { dataset: Dataset }) {
  return (
    <div className="border-t border-stone-100 px-5 pb-5 pt-4">
      <div className="grid gap-6 md:grid-cols-2">
        {/* 좌측: 컬럼·범주 */}
        <div className="space-y-5">
          {d.primaryKeys && d.primaryKeys.length > 0 && (
            <Section title="식별 키">
              <ChipRow items={d.primaryKeys} accent />
            </Section>
          )}

          {d.keyColumns && d.keyColumns.length > 0 && (
            <Section title="핵심 컬럼">
              <ChipRow items={d.keyColumns} />
            </Section>
          )}

          {d.categoricalSummary && d.categoricalSummary.length > 0 && (
            <Section title="범주 분포">
              <div className="space-y-2.5">
                {d.categoricalSummary.map((s) => (
                  <div key={s.column}>
                    <div className="text-[11px] font-medium text-stone-600">{s.column}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {s.topValues.map((v) => (
                        <span
                          key={v.value}
                          className="inline-flex items-baseline gap-1 rounded-sm border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10.5px]"
                        >
                          <span className="text-stone-700">{v.value}</span>
                          <span className="text-stone-400 tnum">{v.count.toLocaleString("ko-KR")}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* 우측: 매핑·KPI·caveats */}
        <div className="space-y-5">
          {d.linkedKpis && d.linkedKpis.length > 0 && (
            <Section
              title={`연결 KPI${d.linkedKpiCount ? ` (${d.linkedKpiCount})` : ""}`}
              icon={<Tag className="h-3 w-3" />}
            >
              <ul className="space-y-1 text-[12px] text-stone-700">
                {d.linkedKpis.map((k) => (
                  <li key={k} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#0095A9]" />
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {d.linkedDatasetIds && d.linkedDatasetIds.length > 0 && (
            <Section title="관련 자료" icon={<LinkIcon className="h-3 w-3" />}>
              <ul className="space-y-1.5">
                {d.linkedDatasetIds.map((l) => (
                  <li key={l.id} className="text-[12px]">
                    <span className="font-medium text-stone-800">{prettifyId(l.id)}</span>
                    <span className="text-stone-400"> — </span>
                    <span className="text-stone-600">{l.relation}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {d.caveats && d.caveats.length > 0 && (
            <Section title="주의사항" icon={<AlertCircle className="h-3 w-3 text-amber-700" />}>
              <ul className="space-y-1.5">
                {d.caveats.map((c, i) => (
                  <li
                    key={i}
                    className="rounded-sm border border-amber-200 bg-amber-50/60 px-2 py-1.5 text-[11.5px] leading-relaxed text-amber-900"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {d.piiNote && (
            <Section title="PII 노출 정책" icon={<AlertCircle className="h-3 w-3 text-rose-700" />}>
              <div className="rounded-sm border border-rose-200 bg-rose-50/60 px-2 py-1.5 text-[11.5px] leading-relaxed text-rose-900">
                {d.piiNote}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 작은 컴포넌트
// =============================================================================
function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-stone-200/80 bg-white p-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500">{label}</div>
      <div className="mt-1.5 text-[22px] font-semibold tnum text-stone-900">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-stone-500">{sub}</div>}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors duration-150 ${
        active ? "border-transparent text-white" : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
      }`}
      style={active ? { backgroundColor: color } : undefined}
    >
      {label}
    </button>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-stone-500">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function ChipRow({ items, accent = false }: { items: string[]; accent?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((c) => (
        <span
          key={c}
          className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] ${
            accent
              ? "border-[#0095A9]/30 bg-[#e6f4f6] text-[#007a8c]"
              : "border-stone-200 bg-stone-50 text-stone-700"
          }`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

// dataset id → 사람이 읽기 쉬운 라벨 변환 (sub-agent 산출물에 한글 매칭이 없으면 fallback)
function prettifyId(id: string): string {
  return id
    .replace(/^_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
