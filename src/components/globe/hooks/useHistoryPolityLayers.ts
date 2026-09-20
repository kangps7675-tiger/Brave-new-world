"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import {
  cliopatriaSnapshotUrl,
  fetchCliopatriaManifest,
} from "@/lib/historical/cliopatriaManifest";
import { colorForCliopatriaPolity } from "@/lib/historical/polityColors";
import {
  buildKoreaTerritoryGeoJson,
  fetchKoreaManifest,
  koreaSnapshotUrl,
  nearestHistoryYear,
} from "@/lib/historical/koreaManifest";
import { fetchHistoryLayersConfig } from "@/lib/historical/historyLayers";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

export type HistoryPolityLayers = {
  year: number;
  snapYear: number;
  cliopatriaGeoJson: FeatureCollection;
  koreaGeoJson: FeatureCollection;
  years: number[];
  loading: boolean;
  error: string | null;
};

/**
 * Load Cliopatria (worldwide, KR excluded) + Korea territory overlay for 역사 mode.
 * Korea paint follows GeoJSON research (Balhae peak → bh-ext-830-textbook, mid Primorye coast).
 */
export function useHistoryPolityLayers(opts: {
  enabled: boolean;
  year: number;
}): HistoryPolityLayers {
  const { enabled, year } = opts;
  const [koreaYears, setKoreaYears] = useState<number[]>([]);
  const [cliopatriaYears, setCliopatriaYears] = useState<number[]>([]);
  const [cliopatriaGeoJson, setCliopatria] =
    useState<FeatureCollection>(EMPTY_FC);
  const [koreaRaw, setKoreaRaw] = useState<FeatureCollection>(EMPTY_FC);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const [layers, koreaMan, clioMan] = await Promise.all([
          fetchHistoryLayersConfig().catch(() => null),
          fetchKoreaManifest().catch(() => null),
          fetchCliopatriaManifest().catch(() => null),
        ]);
        if (cancelled) return;
        const kr = layers?.koreaYears?.length
          ? layers.koreaYears
          : koreaMan?.years?.map((y) => y.year) || [];
        const clio = layers?.cliopatriaYears?.length
          ? layers.cliopatriaYears
          : clioMan?.years?.map((y) => y.year) || [];
        setKoreaYears([...new Set(kr)].sort((a, b) => a - b));
        setCliopatriaYears([...new Set(clio)].sort((a, b) => a - b));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "history years failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const years = useMemo(() => {
    return [...new Set([...koreaYears, ...cliopatriaYears])].sort(
      (a, b) => a - b
    );
  }, [koreaYears, cliopatriaYears]);

  const snapYear = useMemo(
    () => nearestHistoryYear(year, koreaYears.length ? koreaYears : years),
    [year, koreaYears, years]
  );
  const clioSnapYear = useMemo(
    () =>
      nearestHistoryYear(
        year,
        cliopatriaYears.length ? cliopatriaYears : years
      ),
    [year, cliopatriaYears, years]
  );

  useEffect(() => {
    if (!enabled) {
      setCliopatria(EMPTY_FC);
      setKoreaRaw(EMPTY_FC);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [clioRes, krRes] = await Promise.all([
          fetch(cliopatriaSnapshotUrl(clioSnapYear), { signal: ac.signal }),
          fetch(koreaSnapshotUrl(snapYear), { signal: ac.signal }),
        ]);
        if (!clioRes.ok) throw new Error(`cliopatria ${clioRes.status}`);
        if (!krRes.ok) throw new Error(`korea ${krRes.status}`);
        const [clioJson, krJson] = await Promise.all([
          clioRes.json() as Promise<FeatureCollection>,
          krRes.json() as Promise<FeatureCollection>,
        ]);
        if (cancelled) return;
        setCliopatria({
          type: "FeatureCollection",
          features: (clioJson.features || []).map((f) => {
            const props = (f.properties || {}) as {
              name?: string;
              wikidata?: string;
              seshatId?: string;
              fill?: string;
            };
            const paint = colorForCliopatriaPolity(props);
            return {
              ...f,
              properties: {
                ...props,
                fill: props.fill || paint.fill,
                fillOpacity: paint.fillOpacity,
                stroke: paint.stroke,
                label: props.name || "",
              },
            };
          }),
        });
        setKoreaRaw(krJson);
      } catch (e) {
        if (
          cancelled ||
          (e instanceof DOMException && e.name === "AbortError")
        ) {
          return;
        }
        setError(e instanceof Error ? e.message : "history fetch failed");
        setCliopatria(EMPTY_FC);
        setKoreaRaw(EMPTY_FC);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [enabled, snapYear, clioSnapYear]);

  const koreaGeoJson = useMemo(
    () => (enabled ? buildKoreaTerritoryGeoJson(koreaRaw) : EMPTY_FC),
    [enabled, koreaRaw]
  );

  return {
    year,
    snapYear,
    cliopatriaGeoJson: enabled ? cliopatriaGeoJson : EMPTY_FC,
    koreaGeoJson,
    years: koreaYears.length ? koreaYears : years,
    loading,
    error,
  };
}
