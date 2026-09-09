"use client";

import { useEffect } from "react";
import { ensurePushSubscription } from "@/lib/pushClient";
import { trackEvent } from "@/lib/trackClient";

const RELOAD_FLAG = "cv-sw-reload-once";

function reloadOnceForNewSw() {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG) === "1") return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
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

        void registration.update();

        const onVisible = () => {
          if (document.visibilityState === "visible") {
            void registration.update();
          }
        };
        document.addEventListener("visibilitychange", onVisible);

        void ensurePushSubscription({ requestIfNeeded: false }).then((result) => {
          if (result.ok) trackEvent("push_subscribed", { quiet: true });
        });

        return () => document.removeEventListener("visibilitychange", onVisible);
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
      removeVisibility?.();
    };
  }, []);

  return null;
}
