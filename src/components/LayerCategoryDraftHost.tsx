"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  LayerCategoryPanel,
  type LayerCategory,
  type LayerToggleItem,
} from "@/components/LayerCategoryPanel";
import type { LayerPrefs } from "@/lib/layerPrefs";
import {
  LAYER_ITEM_PREF_KEYS,
  flattenLayerItemIds,
  patchFromCategoryItems,
} from "@/lib/layerItemPrefKeys";
import {
  activeLayerCap,
  isLayerCapCountedKey,
} from "@/lib/layerExclusiveCap";
import { isUltraLiteHeavyRenderKey } from "@/lib/ultraLiteMode";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/uiStrings";

/**
 * detail 뒤에 붙였던 밀도 표시를 걷어내는 패턴.
 * ko "· 활성 3/30" / en "· on 3/30" · 구형 "상한/cap" 찌꺼기까지.
 */
const CAP_SUFFIX_PATTERN = / · (활성|상한|on|cap) .*/i;

function walkChecked(item: LayerToggleItem, map: Record<string, boolean>) {
  map[item.id] = item.checked;
  if (item.options?.length) {
    for (const opt of item.options) walkChecked(opt, map);
  }
}

function extractChecked(categories: LayerCategory[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const category of categories) {
    for (const item of category.items) walkChecked(item, map);
  }
  return map;
}

function countCheckedLayers(checked: Record<string, boolean>): number {
  let n = 0;
  for (const [id, on] of Object.entries(checked)) {
    if (!on) continue;
    const key = LAYER_ITEM_PREF_KEYS[id];
    if (key && isLayerCapCountedKey(key)) n += 1;
  }
  return n;
}

type LayerCategoryDraftHostProps = {
  categories: LayerCategory[];
  batchStatus?: string | null;
  autoExpandCategoryId?: string;
  autoExpandWhen?: boolean;
  expandActiveCategories?: boolean;
  ultraLite?: boolean;
  onPatch: (patch: Partial<LayerPrefs>) => void;
};

export const LayerCategoryDraftHost = memo(function LayerCategoryDraftHost({
  categories,
  batchStatus,
  autoExpandCategoryId,
  autoExpandWhen,
  expandActiveCategories,
  ultraLite = false,
  onPatch,
}: LayerCategoryDraftHostProps) {
  const { lang } = useLocale();
  const [checked, setChecked] = useState(() => extractChecked(categories));
  const [capWarn, setCapWarn] = useState(false);
  const cap = activeLayerCap(ultraLite);
  const activeCount = countCheckedLayers(checked);
  const atCap = activeCount >= cap;

  /** prefs 반영된 categories가 오면 로컬 checked를 동기화 (자동 강등 포함) */
  useEffect(() => {
    setChecked(extractChecked(categories));
  }, [categories]);

  useEffect(() => {
    if (!capWarn) return;
    const timer = window.setTimeout(() => setCapWarn(false), 4200);
    return () => window.clearTimeout(timer);
  }, [capWarn]);

  const applyItem = useCallback(
    (itemId: string, value: boolean) => {
      const key = LAYER_ITEM_PREF_KEYS[itemId];
      /**
       * P2-2: 더 이상 상한에서 거부하지 않는다.
       * onPatch → patchLayerPrefsSoft가 clamp/evict 후 토스트로 통보한다.
       */
      if (value && key && isLayerCapCountedKey(key) && atCap) {
        setCapWarn(true);
      }
      setChecked((prev) => ({ ...prev, [itemId]: value }));
      if (key) {
        onPatch({ [key]: value } as Partial<LayerPrefs>);
      }
    },
    [atCap, onPatch],
  );

  const wrapItem = useCallback(
    (item: LayerToggleItem): LayerToggleItem => {
      if (item.presentation === "dropdown" && item.options?.length) {
        const wrappedOptions = item.options.map((opt) => wrapItem(opt));
        const leafIds = flattenLayerItemIds([item]);
        const anyOn = leafIds.some((id) => checked[id] ?? false);
        return {
          ...item,
          checked: anyOn,
          options: wrappedOptions,
          onChange: (value: boolean) => {
            for (const id of leafIds) applyItem(id, value);
          },
        };
      }
      const isOn = checked[item.id] ?? item.checked;
      const key = LAYER_ITEM_PREF_KEYS[item.id];
      const counted = key ? isLayerCapCountedKey(key) : false;
      const dense = !isOn && atCap && counted;
      const heavy = ultraLite && isUltraLiteHeavyRenderKey(key);
      const capSuffix = t("layerCapDetailSuffix", lang)
        .replace("{active}", String(activeCount))
        .replace("{cap}", String(cap));
      const baseDetail = item.detail.replace(CAP_SUFFIX_PATTERN, "");
      return {
        ...item,
        checked: isOn,
        disabled: item.disabled,
        detail: dense ? `${baseDetail} · ${capSuffix}` : baseDetail,
        cautionTag: dense
          ? t("layerCapTag", lang)
          : heavy
            ? t("layerClickCautionTag", lang)
            : item.cautionTag,
        cautionHint: dense
          ? t("layerCapWarnBody", lang)
          : heavy
            ? t("layerClickCautionHint", lang)
            : item.cautionHint,
        rejected: false,
        rejectedNote: null,
        onChange: (value: boolean) => applyItem(item.id, value),
      };
    },
    [activeCount, applyItem, atCap, cap, checked, lang, ultraLite],
  );

  const wrappedCategories = useMemo<LayerCategory[]>(() => {
    return categories.map((category) => ({
      ...category,
      onToggleAll: category.onToggleAll
        ? (enabled: boolean) => {
            if (!enabled) {
              const patch = patchFromCategoryItems(category.items, false);
              const ids = flattenLayerItemIds(category.items);
              setChecked((prev) => {
                const next = { ...prev };
                for (const id of ids) next[id] = false;
                for (const item of category.items) next[item.id] = false;
                return next;
              });
              onPatch(patch);
              return;
            }
            /** 전부 ON — prefs 쪽에서 clamp/evict (P2-2) */
            if (atCap) setCapWarn(true);
            const patch = patchFromCategoryItems(category.items, true);
            const ids = flattenLayerItemIds(category.items);
            setChecked((prev) => {
              const next = { ...prev };
              for (const id of ids) next[id] = true;
              return next;
            });
            onPatch(patch);
          }
        : undefined,
      items: category.items.map((item) => wrapItem(item)),
    }));
  }, [atCap, categories, onPatch, wrapItem]);

  const warnBody = t("layerCapWarnBody", lang);

  return (
    <div className="space-y-2">
      {capWarn ? (
        <div
          role="alert"
          className="rounded-lg border border-sky-400/35 bg-sky-950/40 px-3 py-2 text-caption text-sky-50/90"
        >
          {warnBody}
        </div>
      ) : null}
      <LayerCategoryPanel
        batchStatus={batchStatus}
        autoExpandCategoryId={autoExpandCategoryId}
        autoExpandWhen={autoExpandWhen}
        expandActiveCategories={expandActiveCategories}
        categories={wrappedCategories}
      />
      <p className="px-1 text-meta text-white/45" aria-live="polite">
        {t(atCap ? "layerCapStatusFull" : "layerCapStatusOk", lang)
          .replace("{active}", String(activeCount))
          .replace("{cap}", String(cap))}
      </p>
    </div>
  );
});
