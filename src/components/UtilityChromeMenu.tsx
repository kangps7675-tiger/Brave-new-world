"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { captureMapAsImage, shareOrDownloadImageBlob } from "@/lib/captureShareImage";
import { PARCHMENT_PRO_TIP_COPY } from "@/components/ParchmentProTipChip";
import { trackEvent } from "@/lib/trackClient";
import { buildSceneUrl } from "@/lib/sceneLink";
import type { LayerPrefs } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";
import { useBasemapTone } from "@/hooks/useBasemapTone";

const DISCORD_INVITE =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_DISCORD_INVITE ?? "").trim()
    : "";

type UtilityChromeMenuProps = {
  lang: LabelLanguage;
  showProTip?: boolean;
  /** 현재 프레임 스냅샷 (MapGlobeMethods.captureFrame) — preserveDrawingBuffer 미사용 */
  captureFrame: () => Promise<HTMLCanvasElement | null>;
  /** 카메라·모드·레이어 스냅샷 — 진짜 장면 딥링크(?scene=…)용 */
  getScene?: () => {
    mode: ViewerMode;
    lat: number;
    lng: number;
    altitude: number;
    prefs: LayerPrefs;
    asOf?: string | null;
  } | null;
  onTour: () => void;
  onHelp: () => void;
  onOpenSources?: () => void;
  onOpenParchment?: () => void;
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
    sources: "데이터 출처",
    parchment: "출처 양피지 (8)",
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
    sources: "Data sources",
    parchment: "Source guide (8)",
  },
} as const;

/**
 * 우상단 유틸(투어·공유·도움말·출처)을 하나로 묶은 드롭다운.
 */
export function UtilityChromeMenu({
  lang,
  showProTip = true,
  captureFrame,
  getScene,
  onTour,
  onHelp,
  onOpenSources,
  onOpenParchment,
  siteName = "멋진 신세계",
}: UtilityChromeMenuProps) {
  const copy = MENU_COPY[lang] ?? MENU_COPY.ko;
  const tipCopy = PARCHMENT_PRO_TIP_COPY[lang] ?? PARCHMENT_PRO_TIP_COPY.ko;
  const menuId = useId();
  const light = useBasemapTone() === "light";
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
    trackEvent("share_view_click", undefined, { lang });
    setShareBusy(true);
    try {
      const canvas = await captureFrame();
      if (!canvas) return;
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
  }, [dismiss, captureFrame, lang, shareBusy, siteName]);

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

  const itemClass = light
    ? "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-caption font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-55"
    : "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-caption font-medium text-sky-50/95 transition hover:bg-sky-400/12 disabled:opacity-55";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={copy.triggerAria}
        onClick={() => setOpen((prev) => !prev)}
        className={`map-chrome-control flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-meta font-medium shadow-lg transition ${
          light
            ? "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
            : "border-sky-200/15 bg-[#1e3a5f]/55 text-sky-50/90 backdrop-blur-md hover:border-sky-200/30 hover:bg-[#254875]/65"
        }`}
      >
        <span aria-hidden>☰</span>
        <span>{copy.trigger}</span>
        <span aria-hidden className="text-micro opacity-70">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={copy.trigger}
          className={`absolute right-0 top-[calc(100%+0.4rem)] z-[600] w-[min(calc(100vw-1.5rem),15.5rem)] overflow-hidden rounded-2xl border shadow-[0_16px_40px_rgba(15,23,42,0.18)] ${
            light
              ? "border-slate-200 bg-white"
              : "border-sky-300/20 bg-[#0c1a2e]/94 backdrop-blur-md"
          }`}
        >
          <div className="max-h-[min(70vh,28rem)] space-y-0.5 overflow-y-auto p-1.5">
            {showProTip ? (
              <div className="rounded-lg">
                <button
                  type="button"
                  role="menuitem"
                  aria-expanded={tipsOpen}
                  className={`${itemClass} ${light ? "text-amber-800" : "text-[#f0d9a8]"}`}
                  onClick={() => setTipsOpen((prev) => !prev)}
                >
                  <span aria-hidden>✦</span>
                  <span>{tipCopy.label}</span>
                  <span aria-hidden className="ml-auto text-micro opacity-70">
                    {tipsOpen ? "▴" : "▾"}
                  </span>
                </button>
                {tipsOpen ? (
                  <ol className={`m-0 space-y-1.5 px-2.5 pb-2 pt-0.5 text-meta leading-snug ${light ? "text-slate-600" : "text-sky-100/75"}`}>
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

            {onOpenSources ? (
              <button
                type="button"
                role="menuitem"
                className={`${itemClass} text-sky-200`}
                onClick={() => runAndClose(onOpenSources)}
              >
                <span aria-hidden>📚</span>
                <span>{copy.sources}</span>
              </button>
            ) : null}

            {onOpenParchment ? (
              <button
                type="button"
                role="menuitem"
                className={`${itemClass} text-amber-100`}
                onClick={() => runAndClose(onOpenParchment)}
              >
                <span aria-hidden>📜</span>
                <span>{copy.parchment}</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
