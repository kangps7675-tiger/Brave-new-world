"use client";

import { useCallback, useEffect, useState } from "react";
import { ensurePushSubscription } from "@/lib/pushClient";
import { LAYER_PREFS_KEY } from "@/lib/layerPrefs";
import { trackEvent } from "@/lib/trackClient";
import { bumpVisitCountOncePerSession, getVisitCount } from "@/lib/visitPrefs";
import { zc } from "@/lib/uiStack";

/**
 * 재방문 푸시 옵트인 — PWA 설치와 분리.
 * sitrep 변화 알림을 받을 구독자를 모으는 Step 2.
 *
 * 노출:
 *  - 2회 이상 방문
 *  - Notification permission === default
 *  - 온보딩과 겹치지 않게 dwell 후
 *  - 닫으면 쿨다운
 *  - 데스크톱·모바일 공통 (홈화면 추가와 무관)
 */

const DISMISS_KEY = "cv-push-optin-dismissed-at";
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 55_000;
const MIN_VISITS = 2;

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

function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function readUiLang(): "ko" | "en" {
  try {
    const raw = localStorage.getItem(LAYER_PREFS_KEY);
    if (!raw) return "ko";
    const parsed = JSON.parse(raw) as { labelLanguage?: string };
    return parsed.labelLanguage === "en" ? "en" : "ko";
  } catch {
    return "ko";
  }
}

export function PushOptInBanner() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<"ko" | "en">("ko");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pushSupported()) return;
    if (process.env.NODE_ENV !== "production") {
      // 개발에서도 UI 확인 가능 — 권한 요청은 동일
    }

    bumpVisitCountOncePerSession();
    const visits = getVisitCount();
    if (visits < MIN_VISITS) return;
    if (recentlyDismissed()) return;

    const permission = Notification.permission;
    if (permission === "granted" || permission === "denied") return;

    setLang(readUiLang());

    const timer = window.setTimeout(() => {
      if (Notification.permission !== "default") return;
      if (recentlyDismissed()) return;
      setVisible(true);
      trackEvent("push_optin_shown");
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
    trackEvent("push_optin_dismiss");
  }, []);

  const accept = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    trackEvent("push_optin_accept");
    try {
      const result = await ensurePushSubscription({
        requestIfNeeded: true,
        lang: readUiLang(),
      });
      if (result.ok) {
        trackEvent("push_subscribed", { source: "optin" });
        try {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
        setVisible(false);
      } else if (result.reason === "denied") {
        trackEvent("push_subscribe_denied", { source: "optin" });
        try {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
        setVisible(false);
      }
    } finally {
      setBusy(false);
    }
  }, [busy]);

  if (!visible) return null;

  const en = lang === "en";

  return (
    <div
      className={`pointer-events-auto fixed inset-x-0 bottom-0 ${zc("panel")} px-3 sm:bottom-4 sm:left-auto sm:right-4 sm:w-auto sm:px-0`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      role="dialog"
      aria-modal="false"
      aria-label={en ? "Situation change alerts" : "상황 변화 알림"}
    >
      <div className="mx-auto flex w-[min(96vw,420px)] items-start gap-3 rounded-2xl border border-amber-300/30 bg-[#12100c]/96 p-3.5 shadow-2xl backdrop-blur-xl sm:mx-0">
        <span aria-hidden className="mt-0.5 shrink-0 text-[18px] text-amber-100/90">
          ●
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-amber-50">
            {en ? "Get a ping when something shifts" : "상황이 바뀌면 알려드릴까요?"}
          </p>
          <p className="mt-1 text-meta leading-4 text-stone-300/85">
            {en
              ? "Only when our desk judgment changes — score jump or verification flip. Quiet days stay quiet."
              : "판단이 바뀐 날만 보냅니다 — 점수 급변·검증 등급 전환. 아무 일 없는 날은 보내지 않습니다."}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void accept()}
              className="tap-target min-h-[36px] rounded-lg border border-amber-300/40 bg-amber-500/15 px-3 text-caption font-medium text-amber-50 transition hover:border-amber-200/55 hover:bg-amber-500/25 disabled:opacity-60"
            >
              {busy
                ? en
                  ? "Connecting…"
                  : "연결 중…"
                : en
                  ? "Turn on alerts"
                  : "알림 받기"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="tap-target min-h-[36px] rounded-lg px-2.5 text-caption text-stone-400 transition hover:text-stone-200"
            >
              {en ? "Not now" : "나중에"}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={en ? "Close" : "닫기"}
          className="tap-target -mr-1 -mt-1 flex min-h-[32px] min-w-[32px] shrink-0 items-center justify-center rounded-lg text-body text-stone-500 transition hover:text-stone-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
