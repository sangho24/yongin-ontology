// =============================================================================
// 로그인 화면 — 좌측 브랜드 비주얼 / 우측 인증 폼
//
// 사진은 용인공원 공식 홈페이지 메인 비주얼(추모관 전경)을 사용한다.
// =============================================================================

import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { safeNextPath } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "로그인 · 용인공원 그룹 관리손익 BI",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeNextPath(next);

  // 이미 로그인된 상태로 /login 에 오면 목적지로 보낸다
  const session = await getSession();
  if (session) redirect(target);

  return (
    <main className="flex min-h-screen bg-[#fafaf7]">
      {/* ── 좌: 브랜드 비주얼 (lg 이상에서만) ───────────────────────────── */}
      <section className="relative hidden lg:block lg:w-[55%] xl:w-[58%]">
        <Image
          src="/login-visual.jpg"
          alt=""
          fill
          priority
          sizes="58vw"
          // 하늘보다 능선·추모관이 화면 중앙에 오도록 아래쪽을 기준으로 크롭
          className="object-cover object-[center_62%]"
        />
        {/* 텍스트 가독성용 그라데이션 — 하단으로 갈수록 deep teal */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#04333b]/92 via-[#04333b]/35 to-[#04333b]/5" />

        <div className="absolute inset-x-0 bottom-0 p-12 xl:p-16">
          <div className="max-w-lg">
            <div className="mb-5 h-px w-12 bg-white/50" />
            <h2 className="text-[30px] font-semibold leading-[1.35] tracking-[-0.02em] text-white xl:text-[34px]">
              구역과 활동으로 읽는
              <br />
              용인공원 그룹의 손익
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-white/70">
              법인 · 부문 · 상품 · 조직 네 층위의 관리손익을 한 화면에서 탐색합니다.
            </p>
          </div>
        </div>
      </section>

      {/* ── 우: 인증 폼 ────────────────────────────────────────────────── */}
      <section className="flex w-full flex-col lg:w-[45%] xl:w-[42%]">
        {/* 모바일에서는 상단 배너로 축소 노출 */}
        <div className="relative h-40 w-full shrink-0 lg:hidden">
          <Image src="/login-visual.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#fafaf7] via-[#04333b]/20 to-[#04333b]/30" />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[380px]">
            <Image
              src="/logo.png"
              alt="용인공원"
              width={520}
              height={200}
              priority
              className="h-8 w-auto object-contain"
            />

            <h1 className="mt-9 text-[26px] font-semibold tracking-[-0.025em] text-stone-900">
              관리손익 BI
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-stone-500">
              용인공원 그룹 임직원 전용 시스템입니다.
              <br />
              발급받은 계정으로 로그인하세요.
            </p>

            <LoginForm next={target} />

            <div className="mt-10 flex items-end justify-between gap-4 border-t border-stone-200/80 pt-5">
              <p className="text-[11.5px] leading-relaxed text-stone-400">
                본 시스템의 자료는 대외 공유가 금지된
                <br />
                내부 경영정보입니다.
              </p>
              <p className="shrink-0 text-right text-[10.5px] tracking-[0.08em] text-stone-500">
                Powered by PwC
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
