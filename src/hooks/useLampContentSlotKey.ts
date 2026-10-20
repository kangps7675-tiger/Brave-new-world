"use client";

import { useEffect, useState } from "react";
import {
  lampContentSlotKey,
  msUntilNextLampContentSlot,
} from "@/lib/news/periodicBriefing";

/**
 * 등불 뉴스 6시간 슬롯 키 — 슬롯 경계(0·6·12·18시)에 갱신.
 */
export function useLampContentSlotKey(): string {
  const [slotKey, setSlotKey] = useState(() =>
    typeof window === "undefined" ? "" : lampContentSlotKey(),
  );

  useEffect(() => {
    let timer: number | undefined;

    const arm = () => {
      setSlotKey(lampContentSlotKey());
      timer = window.setTimeout(arm, msUntilNextLampContentSlot() + 80);
    };

    setSlotKey(lampContentSlotKey());
    timer = window.setTimeout(arm, msUntilNextLampContentSlot() + 80);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setSlotKey(lampContentSlotKey());
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer != null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return slotKey || lampContentSlotKey();
}
