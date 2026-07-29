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
 * detail 뒤에 붙였던 상한 표시를 걷어내는 패턴.
 * ko "· 상한 3/30" / en "· cap 3/30" 양쪽을 다 지워야 언어 전환 시 찌꺼기가 남지 않는다.
 */
const CAP_SUFFIX_PATTERN = / · (상한|cap) .*/i;

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

  useEffect(() => {
    if (!capWarn) return;
    const timer = window.setTimeout(() => setCapWarn(false), 4200);
    return () => window.clearTimeout(timer);
  }, [capWarn]);

  const showCapWarn = useCallback(() => {
    setCapWarn(true);
  }, []);

  const applyItem = useCallback(
    (itemId: string, value: boolean) => {
      const key = LAYER_ITEM_PREF_KEYS[itemId];
      if (
        value &&
        key &&
        isLayerCapCountedKey(key) &&
        countCheckedLayers(checked) >= activeLayerCap(ultraLite)
      ) {
        showCapWarn();
        return;
      }
      setChecked((prev) => ({ ...prev, [itemId]: value }));
      if (key) {
        onPatch({ [key]: value } as Partial<LayerPrefs>);
      }
    },
    [checked, onPatch, showCapWarn, ultraLite],
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
      const blocked = !isOn && atCap && counted;
      const heavy = ultraLite && isUltraLiteHeavyRenderKey(key);
      const capSuffix = t("layerCapDetailSuffix", lang)
        .replace("{active}", String(activeCount))
        .replace("{cap}", String(cap));
      const baseDetail = item.detail.replace(CAP_SUFFIX_PATTERN, "");
      return {
        ...item,
        checked: isOn,
        /**
         * 상한에 걸린 항목을 `disabled`로 두지 않는다.
         * disabled면 클릭이 아예 먹지 않아 **왜 안 되는지 알 방법이 없다** —
         * 상한 표시는 10px로 잘려 있어 사실상 안 보인다.
         * 대신 클릭을 받아 `applyItem`이 상한 경고를 띄우게 한다.
         * (끄는 동작은 언제나 허용되므로 blocked는 OFF 항목에만 걸린다.)
         */
        disabled: item.disabled,
        detail: blocked ? `${baseDetail} · ${capSuffix}` : baseDetail,
        cautionTag: blocked
          ? t("layerCapTag", lang)
          : heavy
            ? t("layerClickCautionTag", lang)
            : item.cautionTag,
        cautionHint: blocked
          ? t("layerCapWarnBody", lang).replace("{cap}", String(cap))
          : heavy
            ? t("layerClickCautionHint", lang)
            : item.cautionHint,
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
            setChecked((prev) => {
              const next = { ...prev };
              const patch: Partial<LayerPrefs> = {};
              let slots = activeLayerCap(ultraLite) - countCheckedLayers(prev);
              if (slots <= 0) {
                showCapWarn();
                return prev;
              }
              let enabledAny = false;
              const leafIds = flattenLayerItemIds(category.items);
              for (const id of leafIds) {
                if (next[id]) continue;
                const key = LAYER_ITEM_PREF_KEYS[id];
                if (!key) continue;
                if (!isLayerCapCountedKey(key)) {
                  next[id] = true;
                  (patch as Record<string, boolean>)[key as string] = true;
                  enabledAny = true;
                  continue;
                }
                if (slots <= 0) break;
                next[id] = true;
                (patch as Record<string, boolean>)[key as string] = true;
                slots -= 1;
                enabledAny = true;
              }
              if (!enabledAny) showCapWarn();
              if (Object.keys(patch).length > 0) onPatch(patch);
              return next;
            });
          }
        : undefined,
      items: category.items.map((item) => wrapItem(item)),
    }));
  }, [
    categories,
    onPatch,
    showCapWarn,
    ultraLite,
    wrapItem,
  ]);

  const warnBody = t("layerCapWarnBody", lang).replace("{cap}", String(cap));

  return (
    <div className="space-y-2">
      {capWarn ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2.5 text-caption leading-relaxed text-amber-50"
        >
          <p className="font-semibold">{t("layerCapWarnTitle", lang)}</p>
          <p className="mt-1 text-amber-100/90">{warnBody}</p>
          {ultraLite ? (
            <p className="mt-1 text-meta text-amber-200/70">{t("layerCapWarnUltra", lang)}</p>
          ) : null}
        </div>
      ) : null}
      <LayerCategoryPanel
        categories={wrappedCategories}
        batchStatus={
          batchStatus ??
          `${t(atCap ? "layerCapStatusFull" : "layerCapStatusOk", lang)
            .replace("{active}", String(activeCount))
            .replace("{cap}", String(cap))}${ultraLite ? " · Ultra-Lite" : ""}`
        }
        autoExpandCategoryId={autoExpandCategoryId}
        autoExpandWhen={autoExpandWhen}
        expandActiveCategories={expandActiveCategories}
      />
    </div>
  );
});
