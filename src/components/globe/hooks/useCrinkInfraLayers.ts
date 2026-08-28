"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { TransportPath } from "@/data/geoTypes";
import type { BasemapMode } from "@/lib/basemapMode";
import {
  CRINK_INFRA_LAYERS,
  isAnyCrinkInfraEnabled,
  type CrinkInfraLayerDef,
} from "@/lib/crinkInfraCatalog";
import {
  crinkInfraToPaths,
  fetchCrinkInfraCollection,
  type CrinkInfraCategory,
} from "@/lib/crinkInfraLayers";
import {
  CRINK_INFRA_MAX_PATHS_PER_CATEGORY,
  crinkInfraArmedNext,
  crinkInfraDropZoom,
  crinkInfraEligible,
  crinkInfraMinZoom,
  crinkInfraVisibilityHint,
} from "@/lib/crinkInfraVisibility";
import type { LayerPrefs } from "@/lib/layerPrefs";
import type { ViewPoint } from "@/lib/viewportCull";

export type CrinkInfraLoadStatus = "idle" | "loading" | "ready" | "missing";

function enabledCategories(prefs: LayerPrefs): CrinkInfraCategory[] {
  return CRINK_INFRA_LAYERS.filter((l) => Boolean(prefs[l.prefKey])).map((l) => l.id);
}

export function useCrinkInfraLayers(opts: {
  layerPrefs: LayerPrefs;
  basemapMode: BasemapMode;
  ultraLite: boolean;
  mapZoom: number;
  view: ViewPoint;
  radiusDeg: number;
  lang?: "ko" | "en";
}) {
  const { layerPrefs, basemapMode, ultraLite, mapZoom, view, radiusDeg, lang = "ko" } = opts;
  const [collections, setCollections] = useState<
    Partial<Record<CrinkInfraCategory, FeatureCollection>>
  >({});
  const [status, setStatus] = useState<CrinkInfraLoadStatus>("idle");
  const [counts, setCounts] = useState<Partial<Record<CrinkInfraCategory, number>>>({});
  const [detailArmed, setDetailArmed] = useState(false);
  const [powerArmed, setPowerArmed] = useState(false);
  const [transportArmed, setTransportArmed] = useState(false);

  const enabled = useMemo(() => enabledCategories(layerPrefs), [layerPrefs]);
  const anyEnabled = isAnyCrinkInfraEnabled(layerPrefs);
  const eligible = crinkInfraEligible({ basemapMode, ultraLite });

  useEffect(() => {
    setDetailArmed((prev) =>
      crinkInfraArmedNext(
        prev,
        mapZoom,
        eligible,
        crinkInfraMinZoom("aeroway"),
        crinkInfraDropZoom("aeroway"),
      ),
    );
    setPowerArmed((prev) =>
      crinkInfraArmedNext(
        prev,
        mapZoom,
        eligible,
        crinkInfraMinZoom("power"),
        crinkInfraDropZoom("power"),
      ),
    );
    setTransportArmed((prev) =>
      crinkInfraArmedNext(
        prev,
        mapZoom,
        eligible,
        crinkInfraMinZoom("rail"),
        crinkInfraDropZoom("rail"),
      ),
    );
  }, [eligible, mapZoom]);

  const categoryArmed = (cat: CrinkInfraCategory) => {
    if (cat === "power") return powerArmed;
    if (cat === "rail" || cat === "road") return transportArmed;
    return detailArmed;
  };

  const shouldFetch =
    anyEnabled && eligible && (detailArmed || powerArmed || transportArmed);

  useEffect(() => {
    if (!shouldFetch) {
      if (!anyEnabled) setStatus("idle");
      else if (Object.values(collections).some((fc) => (fc?.features?.length ?? 0) > 0)) {
        setStatus("ready");
      } else {
        setStatus("idle");
      }
      return;
    }
    let cancelled = false;
    setStatus("loading");

    void (async () => {
      const next: Partial<Record<CrinkInfraCategory, FeatureCollection>> = { ...collections };
      const nextCounts: Partial<Record<CrinkInfraCategory, number>> = { ...counts };
      let anyLoaded = false;

      for (const cat of enabled) {
        if (!categoryArmed(cat)) continue;
        if (next[cat]?.features?.length) {
          anyLoaded = true;
          continue;
        }
        const fc = await fetchCrinkInfraCollection(cat);
        if (cancelled) return;
        if (fc?.features?.length) {
          next[cat] = fc;
          nextCounts[cat] = fc.features.length;
          anyLoaded = true;
        } else {
          nextCounts[cat] = 0;
        }
      }

      if (cancelled) return;
      setCollections(next);
      setCounts(nextCounts);
      setStatus(anyLoaded ? "ready" : "missing");
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch missing cats when zoom-armed
  }, [shouldFetch, enabled.join(","), detailArmed, powerArmed, transportArmed]);

  const paths = useMemo(() => {
    if (!anyEnabled || !eligible) return [] as TransportPath[];
    const out: TransportPath[] = [];
    for (const layer of CRINK_INFRA_LAYERS) {
      if (!layerPrefs[layer.prefKey]) continue;
      if (!categoryArmed(layer.id)) continue;
      const fc = collections[layer.id];
      if (!fc) continue;
      out.push(
        ...crinkInfraToPaths(fc, layer.id, {
          view,
          radiusDeg,
          maxCount: CRINK_INFRA_MAX_PATHS_PER_CATEGORY,
        }),
      );
    }
    return out;
  }, [
    anyEnabled,
    eligible,
    collections,
    layerPrefs,
    detailArmed,
    powerArmed,
    transportArmed,
    view.lat,
    view.lng,
    radiusDeg,
  ]);

  const pathCountByCategory = useMemo(() => {
    const out: Partial<Record<CrinkInfraCategory, number>> = {};
    for (const layer of CRINK_INFRA_LAYERS) {
      if (!layerPrefs[layer.prefKey]) continue;
      out[layer.id] = counts[layer.id] ?? collections[layer.id]?.features?.length ?? 0;
    }
    return out;
  }, [collections, counts, layerPrefs]);

  const anyArmed = detailArmed || powerArmed || transportArmed;
  const visibilityHint = crinkInfraVisibilityHint({
    enabled: anyEnabled,
    eligible,
    anyArmed,
    lang,
  });

  return {
    status,
    paths,
    pathCountByCategory,
    totalPaths: paths.length,
    enabledLayers: enabled,
    eligible,
    detailArmed,
    powerArmed,
    transportArmed,
    visibilityHint,
  };
}

export function crinkInfraLayerLabel(layer: CrinkInfraLayerDef, lang: "ko" | "en"): string {
  return lang === "en" ? layer.labelEn : layer.labelKo;
}
