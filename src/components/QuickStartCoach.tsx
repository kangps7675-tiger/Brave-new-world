"use client";

import { useCallback, useEffect, useState } from "react";
import type { ViewerMode } from "@/lib/viewPackages";

const QUICKSTART_KEYS: Record<ViewerMode, string> = {
  conflict: "cv-quickstart-v2-conflict",
  economy: "cv-quickstart-v2-economy",
};

const CONFLICT_STEPS = [
  {
    title: "지도 탐색",
    body: "드래그로 회전 · 스크롤로 줌 · 빈 바다 더블클릭으로 해당 지점 확대",
  },
  {
    title: "레이어 켜기",
    body: "좌상단 ≡ 버튼에서 전선·GDELT·에너지 등 표시 항목을 켜고 끕니다",
  },
  {
    title: "뉴스·전선 Intel",
    body: "하단 📰 버튼으로 검증 보도·VIINA 전선·텔레그램 OSINT를 봅니다",
  },
  {
    title: "상세 보기",
    body: "지도 위 핀·분쟁 구역·궤적을 클릭하면 우측에 설명과 관련 정보가 열립니다",
  },
] as const;

const ECONOMY_STEPS = [
  {
    title: "지도 탐색",
    body: "드래그·줌으로 글로벌 시장·물류 허브를 탐색합니다",
  },
  {
    title: "인프라 레이어",
    body: "≡ 버튼에서 유가·가스·해운·제재·AI DC 레이어를 켭니다",
  },
  {
    title: "증시·경제 RSS",
    body: "하단 📈 버튼과 티커로 주요 지수·VIX·경제 속보를 봅니다",
  },
  {
    title: "초크포인트 클릭",
    body: "상단 nav에서 수에즈·호르무즈 등을 선택하면 관련 시장·RSS가 열립니다",
  },
] as const;

export function shouldShowQuickStart(viewerMode: ViewerMode = "conflict"): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(QUICKSTART_KEYS[viewerMode]) !== "done";
  } catch {
    return true;
  }
}

/** 자동 팝업 없이 도움말에서만 쓸 때 — 첫 진입 연쇄에서 건너뛰기 */
export function markQuickStartDone(viewerMode: ViewerMode) {
  try {
    localStorage.setItem(QUICKSTART_KEYS[viewerMode], "done");
  } catch {
    // ignore
  }
}

type QuickStartCoachProps = {
  visible: boolean;
  viewerMode: ViewerMode;
  onDismiss: () => void;
};

export function QuickStartCoach({ visible, viewerMode, onDismiss }: QuickStartCoachProps) {
  const [step, setStep] = useState(0);
  const isEconomy = viewerMode === "economy";
  const STEPS = isEconomy ? ECONOMY_STEPS : CONFLICT_STEPS;

  const finish = useCallback(() => {
    markQuickStartDone(viewerMode);
    onDismiss();
  }, [onDismiss, viewerMode]);

  useEffect(() => {
    if (!visible) return;
    setStep(0);
  }, [visible, viewerMode]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      if (step >= STEPS.length - 1) finish();
    }, 45_000);
    return () => window.clearTimeout(timer);
  }, [visible, step, finish, STEPS.length]);

  if (!visible) return null;

  const current = STEPS[step];
  const isFirst = step <= 0;
  const isLast = step >= STEPS.length - 1;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--bottom-intel-stack-clearance,5.5rem)+0.5rem)] z-[600] flex justify-center px-3"
      role="dialog"
      aria-label="빠른 시작 안내"
    >
      <div
        className={`pointer-events-auto w-full max-w-md rounded-2xl border p-4 shadow-2xl backdrop-blur-md ${
          isEconomy
            ? "border-emerald-300/25 bg-[#071018]/92"
            : "border-sky-300/25 bg-[#0a1830]/92"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={`text-micro font-medium uppercase tracking-[0.28em] ${
                isEconomy ? "text-emerald-200/65" : "text-sky-200/65"
              }`}
            >
              빠른 시작 {step + 1}/{STEPS.length}
            </p>
            <h3 className={`mt-1 text-sm font-semibold ${isEconomy ? "text-emerald-50" : "text-sky-50"}`}>
              {current.title}
            </h3>
            <p
              className={`mt-1.5 text-caption leading-5 ${
                isEconomy ? "text-emerald-100/78" : "text-sky-100/78"
              }`}
            >
              {current.body}
            </p>
          </div>
          <button
            type="button"
            onClick={finish}
            className={`shrink-0 rounded-lg border px-2 py-1 text-meta transition ${
              isEconomy
                ? "border-emerald-200/15 text-emerald-100/60 hover:text-emerald-50"
                : "border-sky-200/15 text-sky-100/60 hover:text-sky-50"
            }`}
            aria-label="빠른 시작 닫기"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  index === step
                    ? isEconomy
                      ? "bg-emerald-300"
                      : "bg-sky-300"
                    : index < step
                      ? isEconomy
                        ? "bg-emerald-400/40"
                        : "bg-sky-400/40"
                      : "bg-slate-600"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className={`rounded-lg border px-2.5 py-1.5 text-meta transition ${
                isFirst
                  ? "cursor-not-allowed border-transparent text-slate-500/50"
                  : isEconomy
                    ? "border-emerald-300/25 text-emerald-100/75 hover:border-emerald-300/40 hover:text-emerald-50"
                    : "border-sky-300/25 text-sky-100/75 hover:border-sky-300/40 hover:text-sky-50"
              }`}
            >
              ← 이전
            </button>
            <button
              type="button"
              onClick={finish}
              className={`rounded-lg px-2 py-1.5 text-meta transition ${
                isEconomy ? "text-emerald-100/55 hover:text-emerald-100" : "text-sky-100/55 hover:text-sky-100"
              }`}
            >
              건너뛰기
            </button>
            <button
              type="button"
              onClick={() => {
                if (isLast) finish();
                else setStep((s) => s + 1);
              }}
              className={`rounded-lg border px-3 py-1.5 text-meta font-semibold transition ${
                isEconomy
                  ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-50 hover:bg-emerald-400/25"
                  : "border-sky-300/35 bg-sky-400/15 text-sky-50 hover:bg-sky-400/25"
              }`}
            >
              {isLast ? "시작하기" : "다음 →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
