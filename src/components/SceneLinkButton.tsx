"use client";

import { useCallback, useRef, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { buildSceneUrl } from "@/lib/sceneLink";
import { trackShareScene } from "@/lib/analyticsEvents";
import { trackEvent } from "@/lib/trackClient";
import type { LayerPrefs } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

type SceneLinkButtonProps = {
  getScene: () => {
    mode: ViewerMode;
    lat: number;
    lng: number;
    altitude: number;
    prefs: LayerPrefs;
  } | null;
  className?: string;
};

/**
 * 「지금 이 장면」을 URL로 복사 — 카메라·모드·켜진 레이어가 그대로 담긴 딥링크.
 * 받은 사람은 입장 게이트 없이 같은 장면으로 바로 진입한다.
 */
export function SceneLinkButton({ getScene, className = "" }: SceneLinkButtonProps) {
  const { lang } = useLocale();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  const handleCopy = useCallback(async () => {
    const scene = getScene();
    if (!scene) return;

    const url = buildSceneUrl(window.location.origin, scene);
    trackShareScene("copy_link");
    trackEvent("scene_link_copy", { mode: scene.mode }, { lang });

    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // 클립보드 권한 실패 → Web Share API 폴백
      try {
        if (navigator.share) {
          await navigator.share({ url });
          ok = true;
        }
      } catch {
        ok = false;
      }
    }

    if (ok) {
      setCopied(true);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1800);
    }
  }, [getScene, lang]);

  return (
    <button
      type="button"
      aria-label={lang === "en" ? "Copy a link to this scene" : "이 장면 링크 복사"}
      onClick={handleCopy}
      className={`flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 px-2.5 text-meta font-medium text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65 ${className}`}
    >
      <span aria-hidden>{copied ? "✓" : "🔗"}</span>
      <span>
        {copied
          ? lang === "en"
            ? "Copied"
            : "복사됨"
          : lang === "en"
            ? "Scene link"
            : "장면 링크"}
      </span>
    </button>
  );
}
