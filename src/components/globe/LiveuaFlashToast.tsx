"use client";

import { useEffect } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import { zc } from "@/lib/uiStack";

const VISIBLE_MS = 5_000;

type Props = {
  lang: LabelLanguage;
  event: LiveuamapEvent | null;
  onDismiss: () => void;
};

export function LiveuaFlashToast({ lang, event, onDismiss }: Props) {
  useEffect(() => {
    if (!event) return;
    const id = window.setTimeout(onDismiss, VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [event?.id, onDismiss, event]);

  if (!event) return null;

  const title =
    lang === "ko" ? event.titleKo?.trim() || event.title : event.title;

  return (
    <div
      className={`pointer-events-auto absolute right-3 top-3 ${zc("toast")} max-w-[min(20rem,72vw)] rounded-sm border border-amber-700/40 bg-[#1a140c]/92 px-3 py-2 shadow-lg backdrop-blur-sm`}
      role="status"
      aria-live="polite"
    >
      <p className="text-micro uppercase tracking-wide text-amber-200/70">
        {lang === "en" ? "Frontline flash" : "전선 속보"}
      </p>
      <p className="mt-0.5 line-clamp-2 text-meta text-amber-50">{title}</p>
    </div>
  );
}
