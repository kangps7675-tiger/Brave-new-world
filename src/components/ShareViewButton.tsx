"use client";

import { useCallback, useState } from "react";
import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import { brandName } from "@/lib/brand";
import { captureMapAsImage, shareOrDownloadImageBlob } from "@/lib/captureShareImage";
import { trackEvent } from "@/lib/trackClient";

type ShareViewButtonProps = {
  /**
   * 현재 프레임 스냅샷을 비동기로 돌려준다 (MapGlobeMethods.captureFrame).
   * preserveDrawingBuffer를 상시 켜지 않으므로 캔버스를 그냥 넘겨받으면
   * 빈 화면이 캡처된다 — 반드시 캡처 시점에 리페인트를 거쳐야 한다.
   */
  captureFrame: () => Promise<HTMLCanvasElement | null>;
  siteName?: string;
  className?: string;
};

/**
 * 지금 보고 있는 지구본 화면을 워터마크(사이트명+URL) 박힌 PNG로 캡처.
 * 모바일 등 Web Share API 지원 환경에선 공유 시트로, 아니면 다운로드로 폴백.
 */
export function ShareViewButton({
  captureFrame,
  siteName,
  className = "",
}: ShareViewButtonProps) {
  const { t, lang } = useLocale();
  const resolvedSiteName = siteName ?? brandName(lang === "en" ? "en" : "ko");
  const [busy, setBusy] = useState(false);

  const handleShare = useCallback(async () => {
    if (busy) return;

    trackEvent("share_view_click", undefined, { lang });
    setBusy(true);
    try {
      const canvas = await captureFrame();
      if (!canvas) return;
      const url = typeof window !== "undefined" ? window.location.host : "";
      const blob = await captureMapAsImage(canvas, { siteName: resolvedSiteName, url });
      if (!blob) return;

      const filename = `${resolvedSiteName.replace(/\s+/g, "-")}-${Date.now()}.png`;
      await shareOrDownloadImageBlob(
        blob,
        filename,
        resolvedSiteName,
        lang === "en" ? `Captured from ${resolvedSiteName}` : `${resolvedSiteName}에서 캡처`,
      );
      trackEvent("share_view_success", undefined, { lang });
    } finally {
      setBusy(false);
    }
  }, [busy, captureFrame, lang, resolvedSiteName]);

  return (
    <HoverHint placement="bottom" title={t("hoverShareView")} detail={t("hoverShareViewHint")}>
      <button
        type="button"
        aria-label={t("hoverShareViewAria")}
        onClick={handleShare}
        disabled={busy}
        className={`flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 px-2.5 text-meta font-medium text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65 disabled:opacity-60 ${className}`}
      >
        <span aria-hidden>{busy ? "⏳" : "📤"}</span>
        <span>{t("shareView")}</span>
      </button>
    </HoverHint>
  );
}
