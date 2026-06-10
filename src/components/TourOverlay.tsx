"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";

// =============================================================================
// TourOverlay — 시연용 가이드 모드
// - 첫 진입 시 자동 발동 (localStorage 키 ypl-bi-tour-completed 미존재 시)
// - 헤더 "?" 버튼 클릭 시 재시작
// - 단계별 spotlight: 4 개 박스로 대상 영역 외부를 가려 spotlight 구현 (clip-path 대안)
// - narration 박스: 대상 영역의 위치에 따라 좌·우·아래 중 자동 배치
// - 단계가 다른 페이지를 가리키면 router.push() 후 짧은 delay 뒤 spotlight
// =============================================================================

// Tour 단계 데이터 구조
type TourStep = {
  id: string;
  targetSelector: string; // 예: [data-tour-id="hero-kpi"]
  title: string;
  narration: string;
  page?: string; // 다른 페이지로 이동 후 단계 진행
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "sidebar-nav",
    targetSelector: '[data-tour-id="sidebar-nav"]',
    title: "세 개의 큰 뷰로 구성된 BI",
    narration:
      "용인공원 그룹 BI는 Overview · 상조 VC · 장지 VC 세 개의 큰 뷰로 구성됩니다. 좌측 사이드바에서 언제든 뷰를 전환할 수 있습니다.",
    page: "/",
  },
  {
    id: "hero-kpi",
    targetSelector: '[data-tour-id="hero-kpi"]',
    title: "Hero KPI · 핵심 숫자",
    narration:
      "각 KPI 박스의 큰 숫자는 클릭하면 lineage 패널이 펼쳐집니다. 원장·SUMIFS·배부 로직까지 단계별로 확인할 수 있습니다.",
    page: "/",
  },
  {
    id: "hero-kpi-numbercell",
    targetSelector: '[data-tour-id="hero-kpi"] button',
    title: "숫자를 직접 눌러 보세요",
    narration:
      "박스로 감싼 숫자는 모두 인터랙티브합니다. hover 시 tooltip, 클릭 시 lineage 패널이 열려 원장·SUMIFS 산식까지 단계별로 확인할 수 있습니다.",
    page: "/",
  },
  {
    id: "dept-grid",
    targetSelector: '[data-tour-id="dept-grid"]',
    title: "부서 KPI · 드릴다운",
    narration:
      "부서 카드를 클릭하면 부서별 상세 페이지로 이동하여 기존 KPI · 신규 KPI · 활동원가 매핑을 확인할 수 있습니다.",
    page: "/",
  },
  {
    id: "mutual-overview",
    targetSelector: '[data-tour-id="hero-kpi"]',
    title: "상조 VC · 활동원가 탐색",
    narration:
      "상조 VC · 장지 VC 페이지에서는 각 vertical의 활동원가 · Root Cause 분석을 탐색합니다. 주요 화면 흐름을 순서대로 안내합니다.",
    page: "/mutual",
  },
];

const TOUR_STORAGE_KEY = "ypl-bi-tour-completed";
const TOUR_TRIGGER_EVENT = "ypl-bi-tour-start";

// 외부에서 Tour 시작을 트리거하는 helper
export function startTour() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOUR_TRIGGER_EVENT));
}

// 대상 element rect 측정 — 패딩 약간 추가
type Rect = { top: number; left: number; width: number; height: number };

function getElementRect(selector: string, padding = 8): Rect | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: Math.max(0, r.top - padding),
    left: Math.max(0, r.left - padding),
    width: r.width + padding * 2,
    height: r.height + padding * 2,
  };
}

// narration 박스 위치 자동 계산
type Placement = { top: number; left: number; arrow: "left" | "right" | "top" | "bottom" };

function computePlacement(rect: Rect, boxWidth = 360, boxHeight = 180): Placement {
  if (typeof window === "undefined") {
    return { top: rect.top, left: rect.left, arrow: "left" };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 16;

  // 대상이 화면 좌측 절반 → 우측 부착, 우측이면 좌측 부착
  const targetCenterX = rect.left + rect.width / 2;
  const placeRight = targetCenterX < vw / 2;

  let left = placeRight ? rect.left + rect.width + gap : rect.left - boxWidth - gap;
  // viewport 안에 들어오지 않으면 아래로 부착
  let top = rect.top + rect.height / 2 - boxHeight / 2;
  let arrow: Placement["arrow"] = placeRight ? "left" : "right";

  // 좌·우 둘 다 viewport에 안 들어가면 아래에 부착
  if (left < 12 || left + boxWidth > vw - 12) {
    left = Math.min(Math.max(rect.left, 12), vw - boxWidth - 12);
    top = rect.top + rect.height + gap;
    arrow = "top";
    // 아래로도 안 들어가면 위로
    if (top + boxHeight > vh - 12) {
      top = rect.top - boxHeight - gap;
      arrow = "bottom";
    }
  } else {
    // 세로 클램프
    top = Math.min(Math.max(top, 12), vh - boxHeight - 12);
  }
  return { top, left, arrow };
}

export function TourOverlay() {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const pendingStepRef = useRef<number | null>(null);

  // 첫 진입 시 자동 발동
  useEffect(() => {
    if (typeof window === "undefined") return;
    const completed = window.localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      // mount 직후 페이지 layout 안정화를 짧게 기다림
      const t = setTimeout(() => {
        setStepIdx(0);
        setActive(true);
      }, 400);
      return () => clearTimeout(t);
    }
  }, []);

  // 외부 트리거 (헤더 "?" 버튼)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStart = () => {
      setStepIdx(0);
      setActive(true);
    };
    window.addEventListener(TOUR_TRIGGER_EVENT, onStart);
    return () => window.removeEventListener(TOUR_TRIGGER_EVENT, onStart);
  }, []);

  // 현재 단계 step
  const step = active ? TOUR_STEPS[stepIdx] : null;

  // 대상 rect 계산 — step·pathname 바뀔 때마다 재측정
  const measureTarget = useCallback(() => {
    if (!step) return;
    const r = getElementRect(step.targetSelector);
    if (r) {
      setRect(r);
      setPlacement(computePlacement(r));
    } else {
      setRect(null);
      setPlacement(null);
    }
  }, [step]);

  useEffect(() => {
    if (!step) return;

    // step.page가 현재 페이지와 다르면 router.push 후 대기
    if (step.page && step.page !== pathname) {
      pendingStepRef.current = stepIdx;
      router.push(step.page);
      return;
    }

    // 페이지 도착 후 짧은 delay (렌더·layout 안정화)
    const t = setTimeout(() => {
      measureTarget();
    }, 200);

    // 추가 재측정 (대상이 lazy-mount일 수 있음)
    const t2 = setTimeout(() => {
      measureTarget();
    }, 600);

    // 스크롤 / 리사이즈 시 재측정
    const onResize = () => measureTarget();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [step, stepIdx, pathname, router, measureTarget]);

  // 대상 element가 viewport 밖이면 부드럽게 스크롤
  useEffect(() => {
    if (!step || !rect) return;
    const el = document.querySelector(step.targetSelector);
    if (!el) return;
    const r = (el as Element).getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.top < 80 || r.bottom > vh - 80) {
      (el as Element).scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [step, rect]);

  // 컨트롤 — finish · next · prev (선언 순서 중요: keyboard useEffect보다 먼저)
  const finish = useCallback(() => {
    setActive(false);
    setRect(null);
    setPlacement(null);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOUR_STORAGE_KEY, "1");
    }
  }, []);

  const next = useCallback(() => {
    setStepIdx((idx) => {
      if (idx < TOUR_STEPS.length - 1) return idx + 1;
      // 마지막 단계 — 완료 처리
      finish();
      return idx;
    });
  }, [finish]);

  const prev = useCallback(() => {
    setStepIdx((idx) => (idx > 0 ? idx - 1 : idx));
  }, []);

  // 키보드 — ESC 종료, 화살표로 이동
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        finish();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish, next, prev]);

  if (!active || !step) return null;

  // spotlight 영역이 없으면 (대상 미발견) — 중앙에 narration만 띄움
  const hasSpotlight = rect !== null;
  const lastStep = stepIdx === TOUR_STEPS.length - 1;

  // 4면 마스킹 박스 (대상 외부를 검게 덮어 spotlight 구현)
  // 대상이 없으면 전체 화면 덮음
  const maskColor = "rgba(15, 23, 42, 0.55)";

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {/* spotlight 마스크 — 4면 div 방식 (clip-path 대비 호환성 우수) */}
      {hasSpotlight && rect ? (
        <>
          {/* 상단 */}
          <div
            className="pointer-events-auto absolute left-0 right-0 top-0 transition-all duration-300"
            style={{ height: rect.top, backgroundColor: maskColor }}
            onClick={next}
          />
          {/* 하단 */}
          <div
            className="pointer-events-auto absolute bottom-0 left-0 right-0 transition-all duration-300"
            style={{ top: rect.top + rect.height, backgroundColor: maskColor }}
            onClick={next}
          />
          {/* 좌측 */}
          <div
            className="pointer-events-auto absolute transition-all duration-300"
            style={{
              top: rect.top,
              left: 0,
              width: rect.left,
              height: rect.height,
              backgroundColor: maskColor,
            }}
            onClick={next}
          />
          {/* 우측 */}
          <div
            className="pointer-events-auto absolute transition-all duration-300"
            style={{
              top: rect.top,
              left: rect.left + rect.width,
              right: 0,
              height: rect.height,
              backgroundColor: maskColor,
            }}
            onClick={next}
          />
          {/* spotlight 테두리 — 대상 element 외곽 hint */}
          <div
            className="absolute rounded-md ring-2 ring-[#0095A9] transition-all duration-300"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              boxShadow: "0 0 0 2px rgba(0, 149, 169, 0.18)",
            }}
          />
        </>
      ) : (
        <div
          className="pointer-events-auto absolute inset-0"
          style={{ backgroundColor: maskColor }}
          onClick={next}
        />
      )}

      {/* narration 박스 */}
      <div
        className="pointer-events-auto absolute rounded-md border border-stone-200 bg-white p-5 shadow-lg transition-all duration-200"
        style={{
          top: placement?.top ?? window.innerHeight / 2 - 90,
          left: placement?.left ?? window.innerWidth / 2 - 180,
          width: 360,
          maxWidth: "calc(100vw - 24px)",
        }}
      >
        {/* 닫기 */}
        <button
          type="button"
          onClick={finish}
          aria-label="가이드 닫기"
          className="absolute right-2 top-2 rounded-sm p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        {/* 헤더 — 단계 인디케이터 */}
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0095A9]">
          <span>가이드 모드</span>
          <span className="text-stone-300">·</span>
          <span className="tnum text-stone-500">
            {stepIdx + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        {/* 타이틀 */}
        <h3 className="mt-2 pr-6 text-[14px] font-semibold leading-snug text-stone-900">
          {step.title}
        </h3>

        {/* 본문 */}
        <p className="mt-2 text-[13px] leading-relaxed text-stone-600">
          {step.narration}
        </p>

        {/* 컨트롤 */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-[11px] text-stone-400 underline-offset-2 transition-colors hover:text-stone-600 hover:underline"
          >
            건너뛰기
          </button>
          <div className="flex items-center gap-2">
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={prev}
                className="rounded-sm border border-stone-200 bg-white px-3 py-1.5 text-[12px] font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900"
              >
                이전
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-sm bg-[#0095A9] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#007a8c]"
            >
              {lastStep ? "완료" : "다음"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
