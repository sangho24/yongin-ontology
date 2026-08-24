import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/SiteShell";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "용인공원 그룹 · 관리손익 BI",
  description: "용인공원 그룹 관리손익 BI — 데이터 lineage 기반 KPI 대시보드",
  // 내부 경영정보 — 검색엔진 색인 차단
  robots: { index: false, follow: false, nocache: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SiteShell user={session}>{children}</SiteShell>
      </body>
    </html>
  );
}
