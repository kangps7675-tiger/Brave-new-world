"use client";

import { useEffect } from "react";
import { ensurePushSubscription } from "@/lib/pushClient";
import { trackEvent } from "@/lib/trackClient";

/**
 * 서비스워커 등록 + 이미 허용된 푸시만 조용히 재동기화.
 * PWA 설치 배너와 분리 — 데스크톱·모바일 공통.
 */
export function ServiceWorkerBoot() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          void ensurePushSubscription({ requestIfNeeded: false }).then((result) => {
            if (result.ok) trackEvent("push_subscribed", { quiet: true });
          });
        })
        .catch(() => {
          /* SW 실패는 앱 동작에 영향 없음 */
        });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
