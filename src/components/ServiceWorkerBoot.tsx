"use client";

import { useEffect } from "react";
import { ensurePushSubscription } from "@/lib/pushClient";
import { trackEvent } from "@/lib/trackClient";

const RELOAD_AT_KEY = "cv-sw-reload-at";
/** 같은 세션에서 연속 리로드 루프 방지 */
const RELOAD_DEBOUNCE_MS = 12_000;
/** 설치된 PWA가 오래 켜져 있어도 주기적으로 새 sw.js 를 확인 */
const UPDATE_POLL_MS = 5 * 60_000;

function reloadOnceForNewSw() {
  try {
    const prev = Number(sessionStorage.getItem(RELOAD_AT_KEY) || "0");
    if (Number.isFinite(prev) && Date.now() - prev < RELOAD_DEBOUNCE_MS) return;
    sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
  window.location.reload();
}

/**
 * 서비스워커 등록 + 이미 허용된 푸시만 조용히 재동기화.
 * 설치된 크롬 데스크톱 앱이 옛 셸에 묶이지 않도록 update·controllerchange 처리.
 */
export function ServiceWorkerBoot() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const onControllerChange = () => {
      reloadOnceForNewSw();
    };

    const onSwMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | null;
      if (data?.type === "CV_SW_UPDATED") reloadOnceForNewSw();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.addEventListener("message", onSwMessage);

    const boot = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });
        if (cancelled) return;

        const checkUpdate = () => {
          void registration.update();
        };
        checkUpdate();

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            // skipWaiting() 후 activated → controllerchange / CV_SW_UPDATED 로 리로드
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              checkUpdate();
            }
          });
        });

        const onVisible = () => {
          if (document.visibilityState === "visible") checkUpdate();
        };
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", checkUpdate);
        pollTimer = setInterval(checkUpdate, UPDATE_POLL_MS);

        void ensurePushSubscription({ requestIfNeeded: false }).then((result) => {
          if (result.ok) trackEvent("push_subscribed", { quiet: true });
        });

        return () => {
          document.removeEventListener("visibilitychange", onVisible);
          window.removeEventListener("focus", checkUpdate);
        };
      } catch {
        /* SW 실패는 앱 동작에 영향 없음 */
      }
    };

    let removeVisibility: (() => void) | undefined;
    const onLoad = () => {
      void boot().then((cleanup) => {
        removeVisibility = cleanup;
      });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
      if (pollTimer) clearInterval(pollTimer);
      removeVisibility?.();
    };
  }, []);

  return null;
}
