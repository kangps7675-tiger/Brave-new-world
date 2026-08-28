"use client";

import { useEffect, useMemo, useState } from "react";
import Map from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ensurePmtilesProtocol,
  toPmtilesUrl,
} from "@/lib/osmTiles/pmtilesProtocol";
import {
  buildOsmDarkStyle,
  fetchOsmTileManifest,
  type OsmTileRegion,
} from "@/lib/osmTiles/style";

if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}

type Props = {
  initialRegionId?: string;
};

export function OsmPmtilesMap({ initialRegionId }: Props) {
  const [regions, setRegions] = useState<OsmTileRegion[]>([]);
  const [regionId, setRegionId] = useState(initialRegionId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensurePmtilesProtocol();
    let cancelled = false;
    void (async () => {
      const manifest = await fetchOsmTileManifest();
      if (cancelled) return;
      if (!manifest?.regions?.length) {
        setError(
          "No baked tiles yet. Run: npm run osm:tiles:bake:antarctica",
        );
        setReady(true);
        return;
      }
      setRegions(manifest.regions);
      const preferred =
        manifest.regions.find((r) => r.id === initialRegionId) ??
        manifest.regions[0];
      setRegionId(preferred.id);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialRegionId]);

  const active = regions.find((r) => r.id === regionId) ?? regions[0];

  const mapStyle = useMemo(() => {
    if (!active?.url) return null;
    return buildOsmDarkStyle(toPmtilesUrl(active.url));
  }, [active?.url]);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0b0c10] text-slate-300">
        Loading OSM tile manifest…
      </div>
    );
  }

  if (error || !mapStyle || !active) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#0b0c10] px-6 text-center text-slate-300">
        <p className="text-sm">{error ?? "No region selected"}</p>
        <code className="rounded bg-slate-900 px-3 py-2 text-xs text-sky-200">
          npm run osm:tiles:bake:antarctica
        </code>
        <p className="max-w-md text-xs text-slate-500">
          See scripts/osm-tiles/README.md for Australia / Central America
          (larger heap + longer bake).
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-auto absolute left-3 top-3 z-10 flex max-w-[min(100%,28rem)] flex-wrap gap-2 rounded-lg border border-slate-700/80 bg-[#0f1d35]/92 p-2 shadow-lg backdrop-blur">
        {regions.map((r) => {
          const mb = r.bytes != null ? `${(r.bytes / 1e6).toFixed(0)} MB` : "";
          const activeBtn = r.id === active.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRegionId(r.id)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                activeBtn
                  ? "bg-sky-500/25 text-sky-50 ring-1 ring-sky-300/40"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
              title={mb}
            >
              {r.label}
              {mb ? <span className="ml-1 opacity-60">{mb}</span> : null}
            </button>
          );
        })}
      </div>

      <Map
        key={active.id}
        initialViewState={{
          longitude: active.center[0],
          latitude: active.center[1],
          zoom: active.zoom,
        }}
        mapStyle={mapStyle as never}
        style={{ width: "100%", height: "100%" }}
        attributionControl={{}}
      />
    </div>
  );
}
