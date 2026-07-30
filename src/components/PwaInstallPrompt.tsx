"use client";

import { useCallback, useEffect, useState } from "react";
import { trackEvent } from "@/lib/trackClient";
import { bumpVisitCountOncePerSession, getVisitCount } from "@/lib/visitPrefs";

/**
 * 홈 화면 추가 유도 (모바일 컴팩트 UI 전용).
 * 푸시 구독은 PushOptInBanner / ServiceWorkerBoot로 분리.
 *
 * ★ 노출 정책
 *  - 2번째 이상 방문
 *  - dwell 후 (온보딩과 겹치지 않게)
 *  - standalone이면 숨김
 */

const DISMISS_KEY = "cv-pwa-prompt-dismissed-at";
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 90_000;
const MIN_VISITS = 2;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosMode, setIosMode] = useState(false);
  const [delayPassed, setDelayPassed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || recentlyDismissed()) return;

    bumpVisitCountOncePerSession();
    if (getVisitCount() < MIN_VISITS) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const ios = isIos();
    setIosMode(ios);

    const timer = window.setTimeout(() => setDelayPassed(true), SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!delayPassed) return;
    if (!iosMode && !installEvent) return;
    setVisible(true);
  }, [delayPassed, iosMode, installEvent]);

  useEffect(() => {
    const onInstalled = () => {
      setVisible(false);
      trackEvent("pwa_installed");
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
    trackEvent("pwa_prompt_dismiss");
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    trackEvent("pwa_prompt_accept");
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } catch {
      /* cancelled */
    }
    setInstallEvent(null);
    setVisible(false);
  }, [installEvent]);

  useEffect(() => {
    if (visible) trackEvent("pwa_prompt_shown", { ios: iosMode });
  }, [visible, iosMode]);

  if (!visible) return null;

  return (
    <div
      className="cv-compact-only pointer-events-auto fixed inset-x-0 bottom-0 z-[580] px-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      role="dialog"
      aria-modal="false"
      aria-label="홈 화면에 추가"
    >
      <div className="mx-auto flex w-[min(96vw,440px)] items-start gap-3 rounded-2xl border border-sky-300/25 bg-[#0a1428]/97 p-3.5 shadow-2xl backdrop-blur-xl">
        <span aria-hidden className="mt-0.5 shrink-0 text-[20px]">
          🛰️
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-sky-50">홈 화면에 추가</p>
          <p className="mt-1 text-meta leading-4 text-slate-300/80">
            {iosMode
              ? "하단 공유 버튼 → “홈 화면에 추가”를 누르면 앱처럼 바로 열 수 있습니다."
              : "앱처럼 바로 열려면 홈 화면에 추가하세요. 상황 알림은 따로 켤 수 있습니다."}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            {!iosMode ? (
              <button
                type="button"
                onClick={() => void install()}
                className="tap-target min-h-[36px] rounded-lg border border-sky-300/35 bg-sky-500/15 px-3 text-caption font-medium text-sky-50 transition hover:border-sky-200/50 hover:bg-sky-500/25"
              >
                추가하기
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="tap-target min-h-[36px] rounded-lg px-2.5 text-caption text-slate-400 transition hover:text-slate-200"
            >
              나중에
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="tap-target -mr-1 -mt-1 flex min-h-[32px] min-w-[32px] shrink-0 items-center justify-center rounded-lg text-body text-slate-500 transition hover:text-slate-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
