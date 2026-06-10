"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Sparkles,
  Layers,
  ExternalLink,
  Plus,
  Download,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, EvidenceButton, InsightBox, SourceCaption } from "@/components/Card";
import { NumberCell } from "@/components/NumberCell";
import deptKpi from "@/data/dept_kpi.json";

type DeptKpiRow = (typeof deptKpi.deptKpiMatrix)[number];
type RationaleRow = (typeof deptKpi.newKpiRationale)[number];

// 부서별 헤드카운트 (추정 — PPT 23p 조직도 기준, 인사자료 미연동 상태의 합리적 가정)
const DEPT_HEADCOUNT: Record<string, number> = {
  marketing: 12,
  "event-service": 18,
  "corp-sales": 6,
  "customer-care": 14,
};

// 부서별 손익 그룹이 채널 배부 비용에서 차지하는 비중 (mock — 행사·법인·온라인 직접 채널 매핑)
// channelCostAlloc.totals 기준으로 부서가 책임지는 채널 비중을 합리적으로 산정
const DEPT_CHANNEL_KEYS: Record<string, ("법인" | "온라인" | "오프라인" | "기타")[]> = {
  marketing: ["오프라인", "온라인"],
  "event-service": ["법인", "온라인", "오프라인"],
  "corp-sales": ["법인"],
  "customer-care": ["법인", "온라인", "오프라인", "기타"],
};

// KPI별 측정 주기·담당자 (mock — 부서별 운영 흐름 기준 합리적 매핑)
// 마케팅·온라인·법인영업 KPI는 월간 운영, 상담팀 해약율은 월간, 상향매출 원가율은 분기 결산 기준
const KPI_META: Record<string, { freq: "월간" | "분기" | "연간"; owner: string }> = {
  // 마케팅
  "유효 DB": { freq: "월간", owner: "마케팅팀장" },
  "다이렉트 계약": { freq: "월간", owner: "마케팅팀장" },
  "평균상품단가": { freq: "월간", owner: "마케팅팀장 · 온라인마케팅팀장" },
  // 행사서비스
  "상품매출": { freq: "월간", owner: "행사서비스팀장" },
  "상향매출": { freq: "월간", owner: "행사서비스팀장" },
  "법인행사건수": { freq: "월간", owner: "행사관리팀장" },
  "법인장례전환율": { freq: "분기", owner: "행사관리팀장" },
  "장지수수료": { freq: "월간", owner: "행사서비스팀장" },
  "상향매출 원가율": { freq: "분기", owner: "행사서비스팀장 · 재무팀" },
  "장례용품매출": { freq: "월간", owner: "행사서비스팀장" },
  // 법인영업
  "조사 DB": { freq: "월간", owner: "법인영업팀장" },
  // 고객상담
  "기존고객 해약율": { freq: "월간", owner: "고객상담팀장" },
};

// 측정 주기별 배지 색 톤 (월간=teal, 분기=stone, 연간=amber)
const FREQ_TONE: Record<"월간" | "분기" | "연간", string> = {
  "월간": "bg-[#e6f4f6] text-[#007a8c]",
  "분기": "bg-stone-100 text-stone-600",
  "연간": "bg-amber-50 text-amber-700",
};

// 부서 id별 VC 사이드 (상조/장지) 매핑 — 사이드 안내·관련 evidence slot lookup용
const DEPT_VC_SIDE: Record<string, "mutual" | "cemetery" | "shared"> = {
  marketing: "mutual",
  "event-service": "shared",
  "corp-sales": "mutual",
  "customer-care": "mutual",
};

// 부서별 관련 evidence 슬롯 — evidence_index의 mutual_*·cemetery_* 슬롯 lookup
const DEPT_RELATED_SLOTS: Record<string, { id: string; label: string }[]> = {
  marketing: [
    { id: "mutual_channel_ltv_chart", label: "채널별 회원당 LTV" },
    { id: "ovw_channel_cost_table", label: "채널 배부 비용 표" },
  ],
  "event-service": [
    { id: "ovw_channel_cost", label: "채널 배부 비용 합계" },
    { id: "cemetery_dept_kpi_cards", label: "장지 VC 부서 매핑" },
  ],
  "corp-sales": [
    { id: "ovw_channel_cost_table", label: "채널 배부 비용 표" },
  ],
  "customer-care": [
    { id: "mutual_mature_rate", label: "납부만기 도달율" },
    { id: "mutual_mature_by_channel", label: "채널별 납부만기 도달율" },
  ],
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DeptDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const dept = (deptKpi.deptKpiMatrix as DeptKpiRow[]).find((d) => d.id === id);

  // 신규 KPI ↔ rationale 매칭 (해당 부서 newKpi 항목의 도입 사유)
  const matchedRationale = useMemo<RationaleRow[]>(() => {
    if (!dept) return [];
    return (deptKpi.newKpiRationale as RationaleRow[]).filter((r) =>
      dept.newKpi.includes(r.kpi)
    );
  }, [dept]);

  const vcSide = dept ? DEPT_VC_SIDE[dept.id] ?? "shared" : "shared";
  const relatedSlots = dept ? DEPT_RELATED_SLOTS[dept.id] ?? [] : [];

  // 부서 헤드라인 stat — 헤드카운트·KPI수·신규비중·채널비용비중
  const stats = useMemo(() => {
    if (!dept) return null;
    const totalKpi = dept.existingKpi.length + dept.newKpi.length;
    const newRatio = totalKpi > 0 ? (dept.newKpi.length / totalKpi) * 100 : 0;

    // 채널 배부 비용 비중 = 부서가 책임지는 채널의 totals 합 / 전체 totals 합
    const headers = deptKpi.channelCostAlloc.headers as readonly string[];
    const totals = deptKpi.channelCostAlloc.totals as readonly number[];
    const allSum = totals.reduce((a, b) => a + b, 0);
    const myChannels = DEPT_CHANNEL_KEYS[dept.id] ?? [];
    const mySum = myChannels.reduce((acc, ch) => {
      const idx = headers.indexOf(ch);
      return idx >= 0 ? acc + totals[idx] : acc;
    }, 0);
    const channelCostRatio = allSum > 0 ? (mySum / allSum) * 100 : 0;

    return {
      headcount: DEPT_HEADCOUNT[dept.id] ?? 0,
      totalKpi,
      newRatio,
      channelCostRatio,
    };
  }, [dept]);
  const vcLabel =
    vcSide === "mutual" ? "상조 VC" : vcSide === "cemetery" ? "장지 VC" : "상조·장지 공통";
  const vcHref =
    vcSide === "mutual" ? "/mutual" : vcSide === "cemetery" ? "/cemetery" : "/";

  // 부서를 찾지 못한 경우 — 안내 카드
  if (!dept) {
    return (
      <AppLayout pageTitle="부서 상세" pageSubtitle="존재하지 않는 부서 ID">
        <div className="rounded-md border border-stone-200/80 bg-white p-12 text-center">
          <h2 className="text-[18px] font-semibold tracking-tight text-stone-900">
            존재하지 않는 부서입니다
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-stone-600">
            요청하신 부서 ID(<code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px]">{id}</code>)에 해당하는 데이터가 없습니다.
          </p>
          <Link
            href="/#department"
            className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-4 py-2 text-[12px] font-medium text-stone-700 transition-colors hover:border-[#0095A9]/40 hover:text-[#007a8c]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            전체 부서 목록
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      pageTitle={`부서 상세 — ${dept.dept}`}
      pageSubtitle={`${dept.revenueGroup} · ${vcLabel}`}
      narration={
        <div className="space-y-2.5">
          <p>
            <strong>{dept.dept}</strong>의 KPI 매핑·도입 사유·관련 분석 evidence를 한 화면에 정리.
          </p>
          <p>
            기존 KPI {dept.existingKpi.length}개 · <strong className="text-[#007a8c]">신규 KPI {dept.newKpi.length}개</strong>.
          </p>
          <p>{vcLabel} 컨텍스트에서 활용.</p>
        </div>
      }
    >
      {/* 백 링크 — 상단 */}
      <div className="mb-6 flex items-center gap-2 text-[12px]">
        <Link
          href="/#department"
          className="inline-flex items-center gap-1 text-stone-500 transition-colors hover:text-[#007a8c]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          전체 부서 목록
        </Link>
        <span className="text-stone-300">/</span>
        <Link
          href={vcHref}
          className="inline-flex items-center gap-1 text-stone-500 transition-colors hover:text-[#007a8c]"
        >
          {vcLabel}
        </Link>
        <span className="text-stone-300">/</span>
        <span className="font-medium text-stone-700">{dept.dept}</span>
      </div>

      {/* 헤더 카드 — 부서명·revenueGroup·VC */}
      <section className="mb-8 rounded-md border border-stone-200/80 bg-white p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-stone-400">
              <Layers className="h-3 w-3" />
              {dept.revenueGroup}
            </div>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-stone-900">
              {dept.dept}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                {vcLabel}
              </span>
              {dept.newKpi.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-[#e6f4f6] px-2 py-0.5 text-[11px] font-semibold text-[#0095A9]">
                  <Sparkles className="h-3 w-3" />
                  신규 KPI {dept.newKpi.length}개
                </span>
              )}
            </div>
          </div>
          <EvidenceButton slotId="ovw_dept_kpi_cards" label="부서별 KPI 매핑" />
        </div>
      </section>

      {/* 부서 헤드라인 stat — 4-card grid */}
      {stats && (
        <section className="mb-10 grid gap-px overflow-hidden rounded-md bg-stone-200/60 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-6">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-stone-400">
              헤드카운트 (추정)
            </div>
            <div className="mt-3">
              <NumberCell
                value={stats.headcount}
                unit="명"
                size="lg"
                lineage={{
                  source: "조직도 기반 추정 (PPT 23p)",
                  formula: "부서 인원 추정 (FY25 조직도 기준 · 인사자료 미연동)",
                }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
              {dept.dept} 운영 인력 — 조직도 기반 추정치
            </p>
          </div>

          <div className="bg-white p-6">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-stone-400">
              추적 KPI 수
            </div>
            <div className="mt-3">
              <NumberCell
                value={stats.totalKpi}
                unit="개"
                size="lg"
                lineage={{
                  source: "PPT 23p · 부서별 KPI 매핑",
                  formula: `기존 ${dept.existingKpi.length} + 신규 ${dept.newKpi.length}`,
                }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
              기존 {dept.existingKpi.length} · 신규 {dept.newKpi.length}
            </p>
          </div>

          <div className="bg-white p-6">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-stone-400">
              신규 KPI 비중
            </div>
            <div className="mt-3">
              <NumberCell
                value={Math.round(stats.newRatio * 10) / 10}
                unit="%"
                size="lg"
                emphasis={stats.newRatio > 0}
                lineage={{
                  source: "PPT 23p · 신규 KPI rationale",
                  formula: "신규 KPI / 전체 KPI × 100",
                }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
              체계 보강 영역 비율
            </p>
          </div>

          <div className="bg-white p-6">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-stone-400">
              채널 배부 비용 비중
            </div>
            <div className="mt-3">
              <NumberCell
                value={Math.round(stats.channelCostRatio * 10) / 10}
                unit="%"
                size="lg"
                lineage={{
                  source: "PPT 41p · 채널 배부 비용",
                  formula: "부서 책임 채널 합계 / 전체 채널 합계",
                }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
              {(DEPT_CHANNEL_KEYS[dept.id] ?? []).join(" · ") || "—"}
            </p>
          </div>
        </section>
      )}

      {/* KPI 그리드 — 기존 / 신규 2 컬럼 */}
      <section className="mb-10 grid gap-6 md:grid-cols-2">
        {/* 기존 KPI */}
        <div className="rounded-md border border-stone-200/80 bg-white p-6 transition-colors hover:border-stone-300">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-500">
              기존 KPI · {dept.existingKpi.length}개
            </h3>
          </div>
          <ul className="mt-4 space-y-2.5">
            {dept.existingKpi.length > 0 ? (
              dept.existingKpi.map((k, i) => {
                const meta = KPI_META[k];
                return (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-sm border border-stone-100 bg-[#fafaf7] px-3 py-2 text-[13px] text-stone-800"
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                      <span className="truncate">{k}</span>
                    </span>
                    {meta && (
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wider ${FREQ_TONE[meta.freq]}`}
                        >
                          {meta.freq}
                        </span>
                        <span className="hidden text-[10px] tracking-wider text-stone-500 md:inline">
                          {meta.owner}
                        </span>
                      </span>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="text-[12px] text-stone-400">현재 정의된 기존 KPI 없음</li>
            )}
          </ul>
        </div>

        {/* 신규 KPI — mint accent 강조 */}
        <div className="rounded-md border border-[#0095A9]/30 bg-white p-6 ring-1 ring-[#0095A9]/10 transition-colors hover:border-[#0095A9]/50">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#0095A9]">
              <Sparkles className="h-3.5 w-3.5" />
              신규 KPI · {dept.newKpi.length}개
            </h3>
          </div>
          <ul className="mt-4 space-y-2.5">
            {dept.newKpi.length > 0 ? (
              dept.newKpi.map((k, i) => {
                const meta = KPI_META[k];
                return (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-sm border border-[#0095A9]/15 bg-[#e6f4f6]/40 px-3 py-2 text-[13px] font-medium text-[#007a8c]"
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#0095A9]" />
                      <span className="truncate">{k}</span>
                    </span>
                    {meta && (
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wider ${FREQ_TONE[meta.freq]}`}
                        >
                          {meta.freq}
                        </span>
                        <span className="hidden text-[10px] tracking-wider text-[#007a8c]/70 md:inline">
                          {meta.owner}
                        </span>
                      </span>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="text-[12px] text-stone-400">신규 KPI 없음 (현행 체계로 충분)</li>
            )}
          </ul>
        </div>

        {/* 주기·담당자 배지는 추정값 — 화면에 명기 */}
        <p className="text-[11px] leading-relaxed text-stone-400 md:col-span-2">
          측정 주기·담당자 배지는 조직도·운영 흐름 기반 추정 — 인사·운영 자료 연동 시 확정.
        </p>
      </section>

      {/* 도입 사유 — rationale */}
      <section className="mb-10">
        <div className="mb-4 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">KPI 도입 사유</h2>
          <span className="text-[11px] tracking-wider text-stone-400">PPT 23p · 신규 KPI rationale</span>
        </div>
        <InsightBox type="info" title="부서 단위 rationale" slotId="ovw_new_kpi_rationale">
          {dept.rationale}
        </InsightBox>

        {/* 신규 KPI 별 도입 사유 (있을 때만) */}
        {matchedRationale.length > 0 && (
          <div className="mt-5 grid gap-px overflow-hidden rounded-md bg-stone-200/60 md:grid-cols-2">
            {matchedRationale.map((r) => (
              <div key={r.kpi} className="bg-white p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-[14px] font-semibold text-[#007a8c]">{r.kpi}</h4>
                  <span className="text-[10px] tracking-wider text-stone-400">{r.appliesTo}</span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-stone-600">{r.purpose}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 관련 evidence — 다른 슬롯 빠른 link */}
      {relatedSlots.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-baseline justify-between border-b border-stone-200 pb-2">
            <h2 className="section-h">관련 분석 · Evidence</h2>
            <span className="text-[11px] tracking-wider text-stone-400">
              {vcLabel} 컨텍스트
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {relatedSlots.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border border-stone-200/80 bg-white px-4 py-3 transition-colors hover:border-stone-300"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-400">
                    Evidence Slot
                  </div>
                  <div className="mt-1 truncate text-[13px] font-medium text-stone-800">
                    {s.label}
                  </div>
                </div>
                <EvidenceButton slotId={s.id} label={s.label} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 채널 배부 컨텍스트 — 상조 VC 부서일 때만 (행사·법인·온라인은 채널 배부와 직접 관련) */}
      {vcSide !== "cemetery" && (
        <section className="mb-10">
          <div className="mb-4 flex items-baseline justify-between border-b border-stone-200 pb-2">
            <h2 className="section-h">채널 배부 컨텍스트</h2>
            <span className="text-[11px] tracking-wider text-stone-400">PPT 41p · FY25 · 천원</span>
          </div>
          <Card
            title="이 부서가 속한 손익 그룹의 비용 배부"
            subtitle={`'${dept.revenueGroup}' 그룹 — 인건비·지급수수료·광고선전비 채널 배부 결과`}
            slotId="ovw_channel_cost_table"
          >
            <div className="overflow-hidden rounded-sm border border-stone-100">
              <table className="w-full text-[12px]">
                <thead className="bg-stone-50/60 text-[10px] uppercase tracking-[0.08em] text-stone-500">
                  <tr>
                    <th className="p-3 text-left font-medium">계정</th>
                    {deptKpi.channelCostAlloc.headers.map((h) => (
                      <th key={h} className="p-3 text-right font-medium tnum">
                        {h}
                      </th>
                    ))}
                    <th className="p-3 text-right font-medium tnum">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {deptKpi.channelCostAlloc.rows.map((row) => {
                    const sum = row.values.reduce((a, b) => a + b, 0);
                    const max = Math.max(...row.values);
                    return (
                      <tr key={row.account} className="border-t border-stone-100 transition-colors hover:bg-[#fafaf7]">
                        <td className="p-3 font-semibold text-stone-900">{row.account}</td>
                        {row.values.map((v, i) => {
                          const ratio = max > 0 ? v / max : 0;
                          const intensity = v > 0 ? Math.max(0.06, ratio * 0.4) : 0;
                          return (
                            <td
                              key={i}
                              className="p-3 text-right tnum text-stone-800"
                              style={{
                                backgroundColor:
                                  v > 0 ? `rgba(0, 149, 169, ${intensity})` : "transparent",
                              }}
                            >
                              {v > 0 ? v.toLocaleString() : "—"}
                            </td>
                          );
                        })}
                        <td className="p-3 text-right font-semibold tnum text-stone-900">
                          {sum.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* 운영 액션 패널 — 재무팀 사용자 ERP 이동·KPI 등록·export */}
      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between border-b border-stone-200 pb-2">
          <h2 className="section-h">이 부서의 운영 액션</h2>
          <span className="text-[11px] tracking-wider text-stone-400">
            ERP · Data Model 연동
          </span>
        </div>
        <div className="grid gap-px overflow-hidden rounded-md bg-stone-200/60 md:grid-cols-3">
          {/* ERP 부서 화면 열기 */}
          <div className="flex flex-col bg-white p-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#e6f4f6] text-[#0095A9]">
                <ExternalLink className="h-4 w-4" />
              </span>
              <h4 className="text-[14px] font-semibold text-stone-900">ERP 부서 화면 열기</h4>
            </div>
            <p className="mt-3 flex-1 text-[12px] leading-relaxed text-stone-600">
              {dept.dept}의 ERP 분개·전표 화면으로 이동. 현재 화면 컨텍스트(부서·기간) 유지.
            </p>
            <button
              type="button"
              onClick={() => {
                // ERP URL 연동 전 — 버튼 노출만
              }}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 transition-colors hover:border-[#0095A9]/40 hover:text-[#007a8c]"
            >
              ERP로 이동
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 신규 KPI 트래커 등록 */}
          <div className="flex flex-col bg-white p-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#e6f4f6] text-[#0095A9]">
                <Plus className="h-4 w-4" />
              </span>
              <h4 className="text-[14px] font-semibold text-stone-900">신규 KPI 트래커 등록</h4>
            </div>
            <p className="mt-3 flex-1 text-[12px] leading-relaxed text-stone-600">
              부서 단위 신규 KPI({dept.newKpi.length}개)를 Data Model에 자동 트래커로 등록.
              미연동 자료는 데이터 모델 보강 항목으로 관리.
            </p>
            <button
              type="button"
              onClick={() => {
                // Data Model 자동 등록 연동 전 — 버튼 노출만
              }}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 transition-colors hover:border-[#0095A9]/40 hover:text-[#007a8c]"
            >
              트래커 등록
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 부서 단위 활동원가 export */}
          <div className="flex flex-col bg-white p-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#e6f4f6] text-[#0095A9]">
                <Download className="h-4 w-4" />
              </span>
              <h4 className="text-[14px] font-semibold text-stone-900">활동원가 export</h4>
            </div>
            <p className="mt-3 flex-1 text-[12px] leading-relaxed text-stone-600">
              부서 단위 채널 배부 비용·KPI 매핑을 CSV로 다운로드. 월간 결산·임원 보고용.
            </p>
            <button
              type="button"
              onClick={() => {
                // CSV export 연동 전 — 버튼 노출만
              }}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 transition-colors hover:border-[#0095A9]/40 hover:text-[#007a8c]"
            >
              CSV 다운로드
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 다른 부서로 이동 */}
      <section className="mt-10">
        <h3 className="section-label mb-3">다른 부서</h3>
        <div className="grid gap-px overflow-hidden rounded-md bg-stone-200/60 md:grid-cols-2 lg:grid-cols-4">
          {(deptKpi.deptKpiMatrix as DeptKpiRow[])
            .filter((d) => d.id !== dept.id)
            .map((d) => (
              <Link
                key={d.id}
                href={`/dept/${d.id}`}
                className="group flex items-start justify-between bg-white p-4 transition-colors hover:bg-[#e6f4f6]"
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-stone-400">
                    {d.revenueGroup}
                  </div>
                  <div className="mt-1 truncate text-[13px] font-semibold text-stone-900">
                    {d.dept}
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0095A9]" />
              </Link>
            ))}
        </div>
      </section>

      {/* DATA SOURCES */}
      <section className="mt-10 border-t border-stone-200 pt-6">
        <h3 className="section-label mb-3">DATA SOURCES</h3>
        <div className="space-y-2">
          <SourceCaption>
            부서·KPI 매핑 · {deptKpi.meta.source}
          </SourceCaption>
          <SourceCaption>
            손익 그룹 · {dept.revenueGroup} ({vcLabel} 컨텍스트)
          </SourceCaption>
          {dept.newKpi.length > 0 && (
            <SourceCaption>
              신규 KPI 도입 사유 · PPT 23p · {matchedRationale.length}개 KPI rationale 매칭
            </SourceCaption>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
