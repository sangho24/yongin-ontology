"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { AppLayout, SubNav } from "@/components/AppLayout";
import { SourceCaption, EvidenceButton } from "@/components/Card";
import { NumberCell } from "@/components/NumberCell";
import lifeKpi from "@/data/life_kpi.json";
import zoneKpi from "@/data/zone_kpi.json";
import deptKpi from "@/data/dept_kpi.json";
import type { NumberLineage } from "@/types";

const SECTIONS = [
  { href: "/mutual", tag: "MUTUAL", title: "상조 VC 분석", desc: "회원 9,930명 lifecycle · 채널 LTV · Root Cause" },
  { href: "/cemetery", tag: "CEMETERY", title: "장지 VC 분석", desc: "묘역 55,711기 · 잠재가치 · Root Cause" },
  { href: "/data-model", tag: "DATA-MODEL", title: "Data Model (T-Box)", desc: "그룹 데이터 모델 · 미활성 KPI 식별" },
];

export default function Home() {
  const totalLifecycle = lifeKpi.wowMetrics.totalLifecycleRevenue;
  const totalPotential = zoneKpi.wowMetrics.potentialFromAvailable;
  const totalCost = deptKpi.channelCostAlloc.totals.reduce((a, b) => a + b, 0);
  // 채널 배부 합계는 천원 단위(JSON spec)이므로 "원"으로 환산 시 ×1000
  const totalCostKRW = totalCost * 1000;

  // -------------------------------------------------------------------
  // Hero 3카드 lineage 정의
  // -------------------------------------------------------------------
  const lifecycleLineage: NumberLineage = {
    source: "라이프_회원DB_backdata.xlsx / 매출합계",
    formula: "Σ 매출합계 (전체 회원 9,930명)",
    verified: true,
    unit: "원",
    asOf: "2025-12-31",
    steps: [
      {
        label: "회원 master 로드",
        detail: "라이프_회원DB_backdata.xlsx · 35열 × 9,930행",
        rowCount: 9930,
      },
      {
        label: "매출합계 컬럼 합산",
        detail: "가입 이후 25년말까지 누적 매출",
        amount: totalLifecycle,
      },
    ],
    notes: "회원 lifecycle (가입~25년말) 누적 기준",
  };

  const potentialLineage: NumberLineage = {
    source: "260401_용인공원 전체 묘역_raw.xlsx",
    formula: "(미판매 8,173 + 이장지 4,325) × 등급 평균가",
    verified: false,
    unit: "원",
    asOf: "2026-04-01",
    steps: [
      {
        label: "묘역 master 로드",
        detail: "전체 묘역 raw · 27열 × 55,711행",
        rowCount: 55711,
      },
      {
        label: "가용재고 필터",
        detail: "미판매 8,173기 + 이장지 4,325기 = 12,498기",
        rowCount: 12498,
      },
      {
        label: "등급 평균가 적용",
        detail: "각 구역·등급별 평균 단가로 환산 (proxy)",
        amount: totalPotential,
      },
    ],
    notes: "proxy 추정 — 실제 판매가는 거래 시점 단가에 따라 변동",
  };

  const channelCostLineage: NumberLineage = {
    source: "PPT 41p 채널 배부 표",
    formula: "Σ 인건비+지급수수료+광고선전비 채널별 배부값",
    verified: true,
    unit: "원",
    asOf: "2025-12-31",
    steps: [
      {
        label: "원장 비용 추출",
        detail: "인건비 · 지급수수료 · 광고선전비 (FY25)",
      },
      {
        label: "채널 배부 적용",
        detail: "① 직접 귀속 ② 채널 전담 ③ 매출 기준 간접 배부",
        amount: totalCostKRW,
      },
    ],
    notes: "단위 환산: 원장 합계(원) = 채널 합계(천원) × 1,000",
  };

  return (
    <AppLayout
      pageTitle="Overview"
      pageSubtitle="용인공원 그룹(라이프 · 용인공원 · YPL) 관리손익 BI · 부서별 KPI 매핑 + 채널 배부 결과"
      narration={
        <div className="space-y-2.5">
          <p>
            <strong>핵심 화면:</strong> PPT 23p 부서×KPI 매핑과 41p 채널별 비용 배부 결과를 통합.
          </p>
          <p>
            기존 KPI는 검정, <strong>신규 KPI</strong>는 teal로 강조.
          </p>
          <p>좌측 메뉴로 세부 분석 이동.</p>
        </div>
      }
    >
      {/* SubNav — 페이지 내부 섹션 점프 */}
      <SubNav
        items={[
          { id: "headline", label: "그룹 현황" },
          { id: "department", label: "부서별 KPI" },
          { id: "channel-cost", label: "채널 배부" },
          { id: "sections", label: "세부 분석" },
        ]}
        className="mb-8"
      />

      {/* 1줄 헤드라인 — 4 KPI hero (분리 박스 톤, 모두 white) */}
      <section
        id="headline"
        className="grid gap-6 scroll-mt-32 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* 카드 1: 회원 누적 납입액 (스냅샷) — P0-4 정정 (2026-05-11) */}
        <div className="rounded-md border border-stone-200/80 bg-white p-6 transition-colors hover:border-stone-300">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500">
              회원 누적 납입액 (스냅샷)
            </div>
            <EvidenceButton slotId="ovw_lifecycle_revenue" label="회원 누적 납입액 (스냅샷)" variant="subtle" />
          </div>
          <div className="mt-2.5">
            <NumberCell
              value={totalLifecycle}
              unit="원"
              lineage={lifecycleLineage}
              size="lg"
              emphasis
            />
          </div>
          <div className="mt-2 text-[11px] leading-relaxed text-stone-500">
            9,930명 회원의 가입~25년말 누적
          </div>
        </div>

        {/* 카드 2: 장지 가용재고 잠재가치 */}
        <div className="rounded-md border border-stone-200/80 bg-white p-6 transition-colors hover:border-stone-300">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500">
              장지 가용재고 잠재가치
            </div>
            <EvidenceButton slotId="ovw_potential_inventory" label="장지 가용재고 잠재가치" variant="subtle" />
          </div>
          <div className="mt-2.5">
            <NumberCell
              value={totalPotential}
              unit="원"
              lineage={potentialLineage}
              size="lg"
            />
          </div>
          <div className="mt-2 text-[11px] leading-relaxed text-stone-500">
            미판매 8,173 + 이장지 4,325기 (proxy)
          </div>
        </div>

        {/* 카드 3: 라이프 채널 배부 비용 (white로 통일) */}
        <div className="rounded-md border border-stone-200/80 bg-white p-6 transition-colors hover:border-stone-300">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500">
              라이프 채널 배부 비용 (FY25)
            </div>
            <EvidenceButton slotId="ovw_channel_cost" label="라이프 채널 배부 비용 (FY25)" variant="subtle" />
          </div>
          <div className="mt-2.5">
            <NumberCell
              value={totalCostKRW}
              unit="원"
              lineage={channelCostLineage}
              size="lg"
            />
          </div>
          <div className="mt-2 text-[11px] leading-relaxed text-stone-500">
            인건비 · 지급수수료 · 광고선전비 합산
          </div>
        </div>

        {/* 카드 4: 자동 도출 RFI (Data Model 진입) */}
        <div className="group relative rounded-md border border-[#0095A9]/30 bg-[#e6f4f6]/40 p-6 transition-colors hover:border-[#0095A9]/50 hover:bg-[#e6f4f6]">
          <div className="flex items-start justify-between gap-2">
            <Link
              href="/data-model"
              className="flex flex-1 items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#007a8c]"
            >
              <span>미활성 KPI · T-Box</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#0095A9] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <EvidenceButton slotId="ovw_rfi_count" label="미활성 KPI 식별" variant="subtle" />
          </div>
          <Link href="/data-model" className="block">
            <div className="mt-2.5 flex items-baseline gap-1">
              <span className="headline text-[24px] leading-none text-[#007a8c] tnum">5</span>
              <span className="text-[12px] font-medium text-stone-500">건</span>
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-stone-500">
              13 Class · 26 Property · 데이터 모델 보강 시 활성화될 KPI 후보
            </div>
          </Link>
        </div>
      </section>

      {/* 부서별 KPI 매핑 — 메인 컨텐츠 */}
      <section id="department" className="mt-10 scroll-mt-32">
        <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-stone-200 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="section-h">부서별 KPI 매핑 — 상조 VC</h2>
            <EvidenceButton slotId="ovw_dept_kpi_cards" label="부서별 KPI 매핑 — 상조 VC" variant="subtle" />
          </div>
          <span className="text-[11px] tracking-wider text-stone-400">PPT 23p</span>
        </div>
        <p className="mb-5 max-w-3xl text-[13px] leading-relaxed text-stone-600">
          현행 KPI 체계에서 포착되지 않는 수익성 관리 영역을 보완하기 위해 4가지 신규 KPI를 추가 설정.
          각 부서의 손익 그룹·기존 KPI·신규 KPI를 매핑.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {deptKpi.deptKpiMatrix.map((d) => (
            <Link
              key={d.id}
              href={`/dept/${d.id}`}
              className="group block rounded-md border border-stone-200/80 bg-white p-6 transition-colors hover:border-[#0095A9]/30 hover:bg-[#fafaf7]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-400">
                    {d.revenueGroup}
                  </div>
                  <h3 className="mt-1 text-[15px] font-semibold text-stone-900 group-hover:text-[#007a8c]">
                    {d.dept}
                  </h3>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {d.newKpi.length > 0 && (
                    <span className="flex items-center gap-1 rounded-sm bg-[#e6f4f6] px-1.5 py-0.5 text-[10px] font-semibold text-[#0095A9]">
                      <Sparkles className="h-3 w-3" />
                      NEW
                    </span>
                  )}
                  <ArrowUpRight className="h-4 w-4 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0095A9]" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                    기존 KPI
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {d.existingKpi.length > 0 ? (
                      d.existingKpi.map((k, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12px] text-stone-700">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                          {k}
                        </li>
                      ))
                    ) : (
                      <li className="text-[12px] text-stone-400">—</li>
                    )}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#0095A9]">
                    신규 KPI
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {d.newKpi.length > 0 ? (
                      d.newKpi.map((k, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12px] font-medium text-[#007a8c]">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#0095A9]" />
                          {k}
                        </li>
                      ))
                    ) : (
                      <li className="text-[12px] text-stone-400">—</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-4 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-500">
                {d.rationale}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 채널별 비용 배부 결과 — Heatmap-like table */}
      <section id="channel-cost" className="mt-10 scroll-mt-32">
        <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-stone-200 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="section-h">채널별 비용 배부 결과 — 상조 VC</h2>
            <EvidenceButton slotId="ovw_channel_cost_table" label="채널별 비용 배부 결과" variant="subtle" />
          </div>
          <span className="text-[11px] tracking-wider text-stone-400">PPT 41p · FY25 · 천원</span>
        </div>
        <p className="mb-5 max-w-3xl text-[13px] leading-relaxed text-stone-600">
          비용 발생 목적에 따라 ① 고객 단위 직접 귀속, ② 채널 전담 귀속, ③ 간접 배부(매출 기준)로 구분 적용.
        </p>
        <div className="overflow-hidden rounded-md border border-stone-200/80 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/60 text-[11px] uppercase tracking-[0.08em] text-stone-500">
              <tr>
                <th className="p-4 text-left font-medium">계정</th>
                <th className="p-4 text-left font-medium">배부 원칙</th>
                {deptKpi.channelCostAlloc.headers.map((h) => (
                  <th key={h} className="p-4 text-right font-medium tnum">
                    {h}
                  </th>
                ))}
                <th className="p-4 text-right font-medium tnum">합계</th>
              </tr>
            </thead>
            <tbody>
              {deptKpi.channelCostAlloc.rows.map((row) => {
                const sum = row.values.reduce((a, b) => a + b, 0);
                const max = Math.max(...row.values);
                return (
                  <tr key={row.account} className="border-t border-stone-100 transition-colors hover:bg-[#fafaf7]">
                    <td className="p-4 font-semibold text-stone-900">{row.account}</td>
                    <td className="p-4 text-[12px] text-stone-500">{row.principle}</td>
                    {row.values.map((v, i) => {
                      const ratio = max > 0 ? v / max : 0;
                      const intensity = v > 0 ? Math.max(0.08, ratio * 0.45) : 0;
                      return (
                        <td
                          key={i}
                          className="p-4 text-right tnum text-stone-800"
                          style={{
                            backgroundColor:
                              v > 0 ? `rgba(0, 149, 169, ${intensity})` : "transparent",
                          }}
                        >
                          {v > 0 ? v.toLocaleString() : "—"}
                        </td>
                      );
                    })}
                    <td className="p-4 text-right font-semibold tnum text-stone-900">
                      {sum.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-stone-300 bg-stone-50">
                <td className="p-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-stone-700" colSpan={2}>
                  채널 합계
                </td>
                {deptKpi.channelCostAlloc.totals.map((t, i) => (
                  <td key={i} className="p-4 text-right font-bold tnum text-stone-900">
                    {t.toLocaleString()}
                  </td>
                ))}
                <td className="p-4 text-right font-bold tnum text-[#0095A9]">
                  {deptKpi.channelCostAlloc.totals.reduce((a, b) => a + b, 0).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 신규 KPI 정당화 */}
      <section className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="section-label">NEW KPI · 도입 사유</h3>
          <EvidenceButton slotId="ovw_new_kpi_rationale" label="NEW KPI 도입 사유" variant="subtle" />
        </div>
        <div className="grid gap-px overflow-hidden rounded-md bg-stone-200/60 md:grid-cols-2">
          {deptKpi.newKpiRationale.map((k) => (
            <div key={k.kpi} className="bg-white p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-[14px] font-semibold text-[#007a8c]">{k.kpi}</h4>
                <span className="text-[10px] tracking-wider text-stone-400">{k.appliesTo}</span>
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-stone-600">{k.purpose}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sections */}
      <section id="sections" className="mt-10 scroll-mt-32">
        <h3 className="section-label mb-3">SECTIONS</h3>
        <div className="grid gap-px overflow-hidden rounded-md bg-stone-200/60 md:grid-cols-2">
          {SECTIONS.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="group flex items-start justify-between bg-white p-4 transition-colors hover:bg-[#e6f4f6]"
            >
              <div className="min-w-0">
                <div className="text-[11px] font-medium tracking-[0.1em] text-stone-400">{q.tag}</div>
                <div className="mt-1 text-[14px] font-semibold text-stone-900">{q.title}</div>
                <div className="mt-0.5 text-[12px] text-stone-500">{q.desc}</div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0095A9]" />
            </Link>
          ))}
        </div>
      </section>

      {/* Data Sources */}
      <section className="mt-10 border-t border-stone-200/80 pt-6">
        <h3 className="section-label mb-3">DATA SOURCES</h3>
        <div className="space-y-2">
          <SourceCaption>
            부서·채널 배부 · {deptKpi.meta.source}
          </SourceCaption>
          <SourceCaption>
            라이프 회원 master · {lifeKpi.meta.source} · {lifeKpi.meta.totalMembers.toLocaleString()}행 × 35열
          </SourceCaption>
          <SourceCaption>
            장지 묘역 master · {zoneKpi.meta.source} · {zoneKpi.meta.totalZones.toLocaleString()}행 × 27열
          </SourceCaption>
          <SourceCaption>
            T-Box 의미층 · 13 Class · 26 Property · 6 Axiom · 데이터 보강 시 활성화될 KPI 후보 5건
          </SourceCaption>
        </div>
      </section>
    </AppLayout>
  );
}
