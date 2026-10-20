"use client";

import { createPortal } from "react-dom";
import { Z } from "@/lib/uiStack";

/**
 * 위성(세슘) 화면의 "지도로 돌아가기" — 어떤 경로로 들어왔든(사건 카드, 속보 양피지, ADS-B 비상 배너…)
 * 항상 보여야 한다. 좌측 패널·배너·양피지 같은 다른 창에 가려지지 않게 body에 직접 붙이고
 * 경보 층(Z.alert)보다 한 단 위에 둔다. 토스트(1000) 아래.
 */
export function SatelliteExitButton({
  label,
  closeWord,
  onExit,
  phone,
}: {
  label: string;
  /** "닫기" / "Close" */
  closeWord: string;
  onExit: () => void;
  phone: boolean;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <button
      type="button"
      onClick={onExit}
      data-satellite-exit
      className={`tap-target pointer-events-auto fixed ${phone ? "right-3" : "left-3"} rounded-full border border-white/40 bg-[#0b0d12]/95 px-4 py-2 text-meta font-semibold text-white shadow-2xl backdrop-blur-md hover:bg-white/20`}
      style={{ top: "calc(var(--hover-nav-height, 4.5rem) + 0.5rem)", zIndex: Z.alert + 50 }}
    >
      ✕ {closeWord} · {label}
    </button>,
    document.body,
  );
}
