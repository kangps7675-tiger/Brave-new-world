"use client";

import { useCallback } from "react";
import { trustIntroLine, type TrustLang } from "@/data/newsTrustTiers";
import { getViewerChrome } from "@/lib/viewerChrome";
import type { ViewerMode } from "@/lib/viewPackages";

const INTRO_KEYS: Record<ViewerMode, string> = {
  conflict: "cv-viewer-intro-v2-conflict",
  economy: "cv-viewer-intro-v2-economy",
};

export function shouldShowViewerIntro(viewerMode: ViewerMode): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(INTRO_KEYS[viewerMode]) !== "done";
  } catch {
    return true;
  }
}

/** 첫 진입 연쇄 축소 — 도메인 선택만으로 인트로 스킵 */
export function markViewerIntroDone(viewerMode: ViewerMode) {
  try {
    localStorage.setItem(INTRO_KEYS[viewerMode], "done");
  } catch {
    // ignore
  }
}

type ViewerIntroOverlayProps = {
  visible: boolean;
  viewerMode: ViewerMode;
  onDismiss: () => void;
  /** 신뢰도 등급 패널 열기 — 첫화면 한 줄 링크 */
  onOpenTrust?: () => void;
  trustLang?: TrustLang;
};

export function ViewerIntroOverlay({
  visible,
  viewerMode,
  onDismiss,
  onOpenTrust,
  trustLang = "ko",
}: ViewerIntroOverlayProps) {
  const chrome = getViewerChrome(viewerMode);
  const isEconomy = viewerMode === "economy";

  const finish = useCallback(() => {
    markViewerIntroDone(viewerMode);
    onDismiss();
  }, [onDismiss, viewerMode]);

  const openTrust = useCallback(() => {
    onOpenTrust?.();
  }, [onOpenTrust]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[4.75rem] z-[600] flex justify-center px-3"
      role="dialog"
      aria-label={`${chrome.modePickerTitle} 시작 안내`}
    >
      <div
        className={`pointer-events-auto w-full max-w-lg rounded-2xl border p-4 shadow-2xl backdrop-blur-md ${
          isEconomy
            ? "border-emerald-300/30 bg-[#071018]/94"
            : "border-sky-300/30 bg-[#0a1830]/94"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={`text-micro font-medium uppercase tracking-[0.28em] ${
                isEconomy ? "text-emerald-200/70" : "text-sky-200/70"
              }`}
            >
              {chrome.navHeaderLabel}
            </p>
            <h2
              className={`mt-1 text-base font-semibold ${
                isEconomy ? "text-emerald-50" : "text-sky-50"
              }`}
            >
              {chrome.modePickerTitle} — 시작하면 보이는 것
            </h2>
            <p
              className={`mt-1 text-meta ${
                isEconomy ? "text-emerald-100/55" : "text-sky-100/55"
              }`}
            >
              {chrome.modePickerTagline}
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
            aria-label="안내 닫기"
          >
            ✕
          </button>
        </div>

        <ul className="mt-3 flex flex-wrap gap-2">
          {chrome.modePickerBullets.map((line) => (
            <li
              key={line}
              className={`rounded-full border px-2.5 py-1 text-meta leading-snug ${
                isEconomy
                  ? "border-emerald-400/25 bg-emerald-950/40 text-emerald-100/90"
                  : "border-sky-400/25 bg-sky-950/40 text-sky-100/90"
              }`}
            >
              {line}
            </li>
          ))}
        </ul>

        <div
          className={`mt-3 rounded-xl border px-3 py-2.5 ${
            isEconomy
              ? "border-emerald-400/20 bg-emerald-950/35"
              : "border-sky-400/20 bg-sky-950/35"
          }`}
        >
          <p
            className={`text-meta leading-snug ${
              isEconomy ? "text-emerald-100/80" : "text-sky-100/80"
            }`}
          >
            {trustIntroLine(trustLang)}
          </p>
          {onOpenTrust ? (
            <button
              type="button"
              onClick={openTrust}
              className={`mt-2 text-meta font-semibold underline-offset-2 transition hover:underline ${
                isEconomy ? "text-emerald-200" : "text-sky-200"
              }`}
            >
              {trustLang === "en" ? "View grades →" : "등급 보기 →"}
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={finish}
            className={`rounded-lg border px-4 py-2 text-xs font-semibold transition ${
              isEconomy
                ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25"
                : "border-sky-400/35 bg-sky-400/15 text-sky-50 hover:bg-sky-400/25"
            }`}
          >
            지도 탐색 시작
          </button>
        </div>
      </div>
    </div>
  );
}
