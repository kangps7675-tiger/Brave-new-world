"use client";

import { useEffect, useMemo, useState } from "react";
import { Z_ABOVE_NAV } from "@/lib/uiStack";
import {
  emitLayerCapUndo,
  onLayerCapEvicted,
  type LayerCapEvictedDetail,
} from "@/lib/layerCapNotice";
import { LAYER_ITEM_PREF_KEYS } from "@/lib/layerItemPrefKeys";
import { layerItemLabel } from "@/lib/layerPanel/layerPanelLabels";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

const VISIBLE_MS = 5_200;

type Props = {
  lang: LabelLanguage;
  /** 레이어 패널이 열려 있으면 숨김 — 패널은 자체 인라인 경고를 쓴다 (중복 방지) */
  suppressed?: boolean;
};

function labelsForEvicted(
  keys: Array<keyof LayerPrefs>,
  lang: LabelLanguage,
): string[] {
  const reverse = new Map<string, string>();
  for (const [itemId, prefKey] of Object.entries(LAYER_ITEM_PREF_KEYS)) {
    if (prefKey) reverse.set(String(prefKey), itemId);
  }
  return keys.map((key) => {
    const itemId = reverse.get(String(key));
    if (itemId) return layerItemLabel(itemId, lang, String(key));
    return String(key).replace(/^show/, "").replace(/([A-Z])/g, " $1").trim();
  });
}

/**
 * 레이어 자동 강등 토스트 (P2-2).
 *
 * 상한에 걸리면 거부하지 않고 우선순위 낮은 레이어를 잠시 끈다.
 * "상한" 숫자 문구는 UI에 내지 않고, 끈 레이어 이름 + [되돌리기]만 보여준다.
 */
export function LayerCapToast({ lang, suppressed = false }: Props) {
  const [detail, setDetail] = useState<LayerCapEvictedDetail | null>(null);

  useEffect(() => onLayerCapEvicted(setDetail), []);

  useEffect(() => {
    if (!detail) return;
    const id = window.setTimeout(() => setDetail(null), VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [detail]);

  const names = useMemo(
    () => (detail ? labelsForEvicted(detail.evicted, lang).slice(0, 3) : []),
    [detail, lang],
  );

  if (!detail || suppressed || names.length === 0) return null;

  const listed = names.join(lang === "en" ? ", " : "·");
  const more =
    detail.evicted.length > names.length
      ? lang === "en"
        ? ` +${detail.evicted.length - names.length}`
        : ` 외 ${detail.evicted.length - names.length}`
      : "";

  return (
    <div
      role="status"
      className={`pointer-events-auto fixed bottom-[calc(var(--bottom-intel-stack-clearance,3.25rem)+1rem+env(safe-area-inset-bottom,0px))] left-1/2 ${Z_ABOVE_NAV} w-[min(92vw,26rem)] -translate-x-1/2`}
    >
      <div className="rounded-xl border border-sky-400/35 bg-[#071018]/96 px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <p className="text-body font-semibold text-sky-50">
          {t("layerEvictTitle", lang)}
        </p>
        <p className="mt-1 text-caption leading-relaxed text-sky-100/85">
          {t("layerEvictBody", lang).replace("{names}", listed + more)}
        </p>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-meta text-sky-50/90 transition hover:bg-white/10"
            onClick={() => {
              emitLayerCapUndo(detail.undo);
              setDetail(null);
            }}
          >
            {t("layerEvictUndo", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
