"use client";

import { useState } from "react";
import { HoverHint } from "@/components/HoverHint";
import { DonateQrModal } from "@/components/DonateQrModal";
import type { LabelLanguage } from "@/lib/layerPrefs";

type ServerDonateChipProps = {
  lang: LabelLanguage;
};

/**
 * 우측 크롬(항모·공급망 토글) 열 — 레이어 패널·우측 분석 독이 열리면 부모에서 숨김.
 */
export function ServerDonateChip({ lang }: ServerDonateChipProps) {
  const [open, setOpen] = useState(false);
  const isEn = lang === "en";
  const title = isEn ? "☕ Server tip jar" : "☕ 서버비 후원";
  const detail = isEn
    ? "Scan the QR to help keep the map online."
    : "QR을 스캔해 서버비를 보태 주세요.";

  return (
    <>
      <HoverHint placement="top" title={title} detail={detail}>
        <button
          type="button"
          aria-label={title}
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-[#2a1e0f]/82 px-3.5 py-2 text-xs font-medium text-amber-50 shadow-lg backdrop-blur-md transition hover:border-amber-300/50 hover:bg-[#3a2a15]/88"
        >
          <span aria-hidden>☕</span>
          <span className="whitespace-nowrap tracking-tight">
            {isEn ? "Server tip jar" : "서버비 후원"}
          </span>
        </button>
      </HoverHint>

      <DonateQrModal lang={lang} open={open} onClose={() => setOpen(false)} title={title} detail={detail} />
    </>
  );
}
