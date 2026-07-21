"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

type DonateQrModalProps = {
  lang: LabelLanguage;
  open: boolean;
  onClose: () => void;
  title?: string;
  detail?: string;
};

/** 후원 QR 모달 — ServerDonateChip과 NavAnnouncementBanner가 공유하는 단일 모달. */
export function DonateQrModal({ lang, open, onClose, title, detail }: DonateQrModalProps) {
  const isEn = lang === "en";
  const resolvedTitle = title ?? (isEn ? "☕ Server tip jar" : "☕ 서버비 후원");
  const resolvedDetail =
    detail ?? (isEn ? "Scan the QR to help keep the map online." : "QR을 스캔해 서버비를 보태 주세요.");

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label={isEn ? "Close tip jar" : "후원 창 닫기"}
        className="fixed inset-0 z-[90] bg-[#0a1528]/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={resolvedTitle}
        className="fixed left-1/2 top-1/2 z-[91] w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-amber-300/25 bg-[#1a140c]/95 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-amber-200/15 px-4 py-3">
          <p className="text-sm font-semibold text-amber-50">{resolvedTitle}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-amber-200/20 px-2 py-1 text-xs text-amber-100/80 transition hover:border-amber-200/40 hover:text-amber-50"
          >
            {isEn ? "Close" : "닫기"}
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 px-5 py-5">
          <Image
            src="/donate-qr.png"
            alt={isEn ? "Donation QR code" : "후원 QR 코드"}
            width={280}
            height={280}
            className="h-[min(70vw,17.5rem)] w-[min(70vw,17.5rem)] rounded-xl bg-white p-2"
            draggable={false}
          />
          <p className="text-center text-[11px] leading-5 text-amber-100/65">{resolvedDetail}</p>
        </div>
      </div>
    </>
  );
}
