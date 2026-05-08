import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import deptKpi from "@/data/dept_kpi.json";

type DeptKpiRow = (typeof deptKpi.deptKpiMatrix)[number];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DeptDetailPage({ params }: PageProps) {
  const { id } = await params;
  const dept = (deptKpi.deptKpiMatrix as DeptKpiRow[]).find((d) => d.id === id);

  return (
    <AppLayout
      pageTitle={dept ? `부서 상세 — ${dept.dept}` : "부서 상세"}
      pageSubtitle="부서별 KPI 상세 화면 — 다음 sprint에서 활성화 예정"
    >
      <div className="rounded-md border border-stone-200/80 bg-white p-12">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f4f6] text-[#0095A9]">
            <Construction className="h-6 w-6" strokeWidth={1.6} />
          </div>
          <h2 className="mt-6 text-[18px] font-semibold tracking-tight text-stone-900">
            준비 중인 화면입니다
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-stone-600">
            {dept ? (
              <>
                <span className="font-semibold text-stone-800">{dept.dept}</span>의 KPI 상세 화면은
                다음 sprint에 활성화 예정입니다.
                <br />
                현행 KPI({dept.existingKpi.length}개), 신규 KPI({dept.newKpi.length}개)와 함께 일별·월별 추이,
                담당 활동·계정과의 매핑을 한 화면에서 탐색할 수 있게 됩니다.
              </>
            ) : (
              <>
                해당 부서 화면(`/dept/{id}`)은 다음 sprint에 활성화 예정입니다. 부서별 KPI·활동 매핑·시계열을 탐색할 수 있는 형태로 준비 중입니다.
              </>
            )}
          </p>

          {dept && (
            <div className="mt-8 rounded-md border border-stone-200/80 bg-[#fafaf7] p-5 text-left">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                미리보기
              </div>
              <div className="mt-2 text-[14px] font-semibold text-stone-900">{dept.dept}</div>
              <div className="mt-1 text-[12px] text-stone-500">{dept.revenueGroup}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                    기존 KPI
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[12px] text-stone-700">
                    {dept.existingKpi.length > 0 ? (
                      dept.existingKpi.map((k, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                          {k}
                        </li>
                      ))
                    ) : (
                      <li className="text-stone-400">—</li>
                    )}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#0095A9]">
                    신규 KPI
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[12px] font-medium text-[#007a8c]">
                    {dept.newKpi.length > 0 ? (
                      dept.newKpi.map((k, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#0095A9]" />
                          {k}
                        </li>
                      ))
                    ) : (
                      <li className="text-stone-400">—</li>
                    )}
                  </ul>
                </div>
              </div>
              <div className="mt-4 border-t border-stone-200 pt-3 text-[11px] leading-relaxed text-stone-500">
                {dept.rationale}
              </div>
            </div>
          )}

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-4 py-2 text-[12px] font-medium text-stone-700 transition-colors hover:border-[#0095A9]/40 hover:text-[#007a8c]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Overview로 돌아가기
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
