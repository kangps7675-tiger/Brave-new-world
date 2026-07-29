"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { captureMapAsImage, shareOrDownloadImageBlob } from "@/lib/captureShareImage";
import { PARCHMENT_PRO_TIP_COPY } from "@/components/ParchmentProTipChip";
import { trackEvent } from "@/lib/trackClient";
import { buildSceneUrl } from "@/lib/sceneLink";
import type { LayerPrefs } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

const DISCORD_INVITE =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_DISCORD_INVITE ?? "").trim()
    : "";

type UtilityChromeMenuProps = {
  lang: LabelLanguage;
  showProTip?: boolean;
  getCanvas: () => HTMLCanvasElement | null;
  /** 카메라·모드·레이어 스냅샷 — 진짜 장면 딥링크(?scene=…)용 */
  getScene?: () => {
    mode: ViewerMode;
    lat: number;
    lng: number;
    altitude: number;
    prefs: LayerPrefs;
  } | null;
  onTour: () => void;
  onHelp: () => void;
  siteName?: string;
};

const MENU_COPY = {
  ko: {
    trigger: "메뉴",
    triggerAria: "유틸리티 메뉴 열기",
    tour: "투어",
    discord: "디스코드",
    sceneLink: "장면 링크",
    sceneCopied: "링크 복사됨",
    sceneFail: "복사 실패",
    share: "공유",
    shareBusy: "공유 중…",
    help: "도움말",
  },
  en: {
    trigger: "Menu",
    triggerAria: "Open utility menu",
    tour: "Tour",
    discord: "Discord",
    sceneLink: "Scene link",
    sceneCopied: "Link copied",
    sceneFail: "Copy failed",
    share: "Share",
    shareBusy: "Sharing…",
    help: "Help",
  },
} as const;

/**
 * 우상단 유틸(투어·공유·도움말)을 하나로 묶은 드롭다운.
 * 신뢰도·자료출처는 MapAttributionBar(지구본)에서 연다.
 */
export function UtilityChromeMenu({
  lang,
  showProTip = true,
  getCanvas,
  getScene,
  onTour,
  onHelp,
  siteName = "멋진 신세계",
}: UtilityChromeMenuProps) {
  const copy = MENU_COPY[lang] ?? MENU_COPY.ko;
  const tipCopy = PARCHMENT_PRO_TIP_COPY[lang] ?? PARCHMENT_PRO_TIP_COPY.ko;
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [sceneStatus, setSceneStatus] = useState<"idle" | "ok" | "fail">("idle");

  const dismiss = useCallback(() => {
    setOpen(false);
    setTipsOpen(false);
    setSceneStatus("idle");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) dismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, dismiss]);

  const runAndClose = useCallback(
    (action: () => void) => {
      dismiss();
      action();
    },
    [dismiss],
  );

  const handleShare = useCallback(async () => {
    if (shareBusy) return;
    const canvas = getCanvas();
    if (!canvas) return;
    trackEvent("share_view_click", undefined, { lang });
    setShareBusy(true);
    try {
      const url = typeof window !== "undefined" ? window.location.host : "";
      const blob = await captureMapAsImage(canvas, { siteName, url });
      if (!blob) return;
      const filename = `${siteName.replace(/\s+/g, "-")}-${Date.now()}.png`;
      await shareOrDownloadImageBlob(
        blob,
        filename,
        siteName,
        lang === "en" ? `Captured from ${siteName}` : `${siteName}에서 캡처`,
      );
      trackEvent("share_view_success", undefined, { lang });
      dismiss();
    } finally {
      setShareBusy(false);
    }
  }, [dismiss, getCanvas, lang, shareBusy, siteName]);

  const handleSceneLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    // 카메라·모드·레이어가 담긴 진짜 딥링크(?scene=…). 없으면 현재 URL 폴백.
    const scene = getScene?.();
    const href = scene ? buildSceneUrl(window.location.origin, scene) : window.location.href;
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
      setSceneStatus("ok");
      trackEvent("scene_link_copy", { deep: scene ? 1 : 0 }, { lang });
      window.setTimeout(() => setSceneStatus("idle"), 1600);
    } catch {
      setSceneStatus("fail");
      window.setTimeout(() => setSceneStatus("idle"), 1600);
    }
  }, [getScene, lang]);

  const handleDiscord = useCallback(() => {
    if (!DISCORD_INVITE) return;
    trackEvent("discord_click", undefined, { lang });
    window.open(DISCORD_INVITE, "_blank", "noopener,noreferrer");
    dismiss();
  }, [dismiss, lang]);

  const itemClass =
    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-sky-50/95 transition hover:bg-sky-400/12 disabled:opacity-55";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={copy.triggerAria}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 px-3 text-[11px] font-medium text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65"
      >
        <span aria-hidden>☰</span>
        <span>{copy.trigger}</span>
        <span aria-hidden className="text-[9px] opacity-70">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={copy.trigger}
          className="absolute right-0 top-[calc(100%+0.4rem)] z-[85] w-[min(calc(100vw-1.5rem),15.5rem)] overflow-hidden rounded-2xl border border-sky-300/20 bg-[#0c1a2e]/94 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
        >
          <div className="max-h-[min(70vh,28rem)] space-y-0.5 overflow-y-auto p-1.5">
            {showProTip ? (
              <div className="rounded-lg">
                <button
                  type="button"
                  role="menuitem"
                  aria-expanded={tipsOpen}
                  className={`${itemClass} text-[#f0d9a8]`}
                  onClick={() => setTipsOpen((prev) => !prev)}
                >
                  <span aria-hidden>✦</span>
                  <span>{tipCopy.label}</span>
                  <span aria-hidden className="ml-auto text-[9px] opacity-70">
                    {tipsOpen ? "▴" : "▾"}
                  </span>
                </button>
                {tipsOpen ? (
                  <ol className="m-0 space-y-1.5 px-2.5 pb-2 pt-0.5 text-[11px] leading-snug text-sky-100/75">
                    {tipCopy.tips.map((tip, index) => (
                      <li key={tip} className="flex gap-1.5">
                        <span className="shrink-0 tabular-nums opacity-60">{index + 1}.</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => runAndClose(onTour)}
            >
              <span aria-hidden>🎬</span>
              <span>{copy.tour}</span>
            </button>

            {DISCORD_INVITE ? (
              <button
                type="button"
                role="menuitem"
                className={`${itemClass} text-[#c4b5fd]`}
                onClick={handleDiscord}
              >
                <span aria-hidden>💬</span>
                <span>{copy.discord}</span>
              </button>
            ) : null}

            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => void handleSceneLink()}
            >
              <span aria-hidden>🔗</span>
              <span>
                {sceneStatus === "ok"
                  ? copy.sceneCopied
                  : sceneStatus === "fail"
                    ? copy.sceneFail
                    : copy.sceneLink}
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={shareBusy}
              className={itemClass}
              onClick={() => void handleShare()}
            >
              <span aria-hidden>{shareBusy ? "⏳" : "📤"}</span>
              <span>{shareBusy ? copy.shareBusy : copy.share}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => runAndClose(onHelp)}
            >
              <span aria-hidden>?</span>
              <span>{copy.help}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
