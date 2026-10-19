"use client";

/**
 * 해역 지구본 — maplibre globe projection + 기존 인텔 다크 베이스맵.
 *
 * 예전 MapGlobeView(4천 줄, 레이어 수십 개)를 대체한다. 여기엔 해역 판단에
 * 직접 쓰이는 것만 올린다: 피격 경보 · 항행경보 · 해상 사건 속보 ·
 * 에너지 시설 피격 · (탭을 켰을 때만) 우크라이나 전쟁 동향.
 * 사건 하나를 깊게 볼 때는 세슘(CesiumSatelliteGlobe)으로 넘어간다.
 */

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import Map, { Layer, Source, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { applyBasemapGlobeProjection, INTEL_VECTOR_STYLE_URL } from "@/lib/basemapMode";
import { ENERGY_FACILITIES } from "@/data/energyFacilities";
import type { EnergyStrike } from "@/lib/sea/energyStrikes";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";

if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}

export type SeaGlobeSelection =
  | { type: "ukmto"; id: string }
  | { type: "liveua"; id: string }
  | { type: "energy"; id: string }
  | { type: "facility"; id: string };

export type SeaGlobeHandle = {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
};

type Props = {
  initial: { lat: number; lng: number; zoom: number };
  ukmto: UkmtoIncidentPoint[];
  /** /api/strikes 판정 — id → 확인/유력 등 */
  strikeStatus: Record<string, string>;
  navarea: FeatureCollection;
  maritimeEvents: LiveuamapEvent[];
  energyStrikes: EnergyStrike[];
  warEvents: LiveuamapEvent[];
  showWar: boolean;
  selectedId: string | null;
  onSelect: (sel: SeaGlobeSelection) => void;
};

const INTERACTIVE = ["sea-ukmto", "sea-liveua", "sea-energy", "sea-facility", "sea-war"];

function points<T>(rows: readonly T[], f: (r: T) => { lat: number; lng: number; props: Record<string, unknown> } | null) {
  const features = [];
  for (const r of rows) {
    const p = f(r);
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    features.push({
      type: "Feature" as const,
      geometry: { type: "Point", coordinates: [p.lng, p.lat] } as Point,
      properties: p.props,
    });
  }
  return { type: "FeatureCollection" as const, features };
}

export const SeaGlobe = forwardRef<SeaGlobeHandle, Props>(function SeaGlobe(props, ref) {
  const mapRef = useRef<MapRef | null>(null);

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, zoom = 6) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1400, essential: true });
    },
  }));

  const ukmtoFc = useMemo(
    () =>
      points(props.ukmto, (u) => ({
        lat: u.lat,
        lng: u.lng,
        props: {
          id: u.id,
          kind: "ukmto",
          status: props.strikeStatus[u.id] ?? "none",
          attack: /attack|hijack|boarding|explosion/i.test(u.incidentTypeName) ? 1 : 0,
          selected: props.selectedId === u.id ? 1 : 0,
        },
      })),
    [props.ukmto, props.strikeStatus, props.selectedId],
  );

  const liveuaFc = useMemo(
    () =>
      points(props.maritimeEvents, (e) => ({
        lat: e.lat,
        lng: e.lng,
        props: { id: e.id, kind: "liveua", selected: props.selectedId === e.id ? 1 : 0 },
      })),
    [props.maritimeEvents, props.selectedId],
  );

  const energyFc = useMemo(
    () =>
      points(props.energyStrikes, (s) => ({
        lat: s.event.lat,
        lng: s.event.lng,
        props: {
          id: s.id,
          kind: "energy",
          firms: s.evidence === "firms" ? 1 : 0,
          selected: props.selectedId === s.id ? 1 : 0,
        },
      })),
    [props.energyStrikes, props.selectedId],
  );

  const facilityFc = useMemo(
    () =>
      points(ENERGY_FACILITIES, (f) => ({
        lat: f.lat,
        lng: f.lng,
        props: { id: f.id, kind: "facility", name: f.nameKo, coastal: f.coastal ? 1 : 0 },
      })),
    [],
  );

  const warFc = useMemo(
    () =>
      points(props.showWar ? props.warEvents : [], (e) => ({
        lat: e.lat,
        lng: e.lng,
        props: { id: e.id, kind: "war" },
      })),
    [props.warEvents, props.showWar],
  );

  const handleLoad = useCallback(() => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    applyBasemapGlobeProjection(m as never);
    // OpenFreeMap 스타일은 projection 이 없어 스타일 재로딩 때 Mercator 로 떨어진다
    m.on("style.load", () => applyBasemapGlobeProjection(m as never));
  }, []);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const id = f?.properties?.id as string | undefined;
      const kind = f?.properties?.kind as string | undefined;
      if (!id || !kind) return;
      if (kind === "war") props.onSelect({ type: "liveua", id });
      else props.onSelect({ type: kind as SeaGlobeSelection["type"], id } as SeaGlobeSelection);
    },
    [props],
  );

  return (
    <Map
      ref={mapRef}
      mapStyle={INTEL_VECTOR_STYLE_URL}
      initialViewState={{ longitude: props.initial.lng, latitude: props.initial.lat, zoom: props.initial.zoom }}
      style={{ width: "100%", height: "100%" }}
      attributionControl={{ compact: true }}
      renderWorldCopies={false}
      maxZoom={13.8}
      interactiveLayerIds={INTERACTIVE}
      onLoad={handleLoad}
      onClick={handleClick}
      cursor="grab"
    >
      {/* 항행경보 (NAVAREA) — 보라 면·선 */}
      <Source id="sea-navarea" type="geojson" data={props.navarea}>
        <Layer
          id="sea-navarea-fill"
          type="fill"
          filter={["==", ["geometry-type"], "Polygon"]}
          paint={{ "fill-color": "#a855f7", "fill-opacity": 0.14 }}
        />
        <Layer
          id="sea-navarea-line"
          type="line"
          filter={["!=", ["geometry-type"], "Point"]}
          paint={{ "line-color": "#c084fc", "line-width": 1.2, "line-opacity": 0.8 }}
        />
        <Layer
          id="sea-navarea-point"
          type="circle"
          filter={["==", ["geometry-type"], "Point"]}
          paint={{ "circle-radius": 4, "circle-color": "#a855f7", "circle-opacity": 0.7 }}
        />
      </Source>

      {/* 에너지·항만 감시 시설 — 작은 빈 원 */}
      <Source id="sea-facility" type="geojson" data={facilityFc}>
        <Layer
          id="sea-facility"
          type="circle"
          paint={{
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2, 7, 5],
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-color": ["case", ["==", ["get", "coastal"], 1], "#fbbf24", "#a3a3a3"],
            "circle-stroke-width": 1,
            "circle-stroke-opacity": 0.6,
          }}
        />
      </Source>

      {/* 우크라이나 전쟁 동향 (탭을 켰을 때만) */}
      <Source id="sea-war" type="geojson" data={warFc}>
        <Layer
          id="sea-war"
          type="circle"
          paint={{ "circle-radius": 3, "circle-color": "#94a3b8", "circle-opacity": 0.65 }}
        />
      </Source>

      {/* 해상 사건 속보 (LiveUAMap 해역 슬롯) */}
      <Source id="sea-liveua" type="geojson" data={liveuaFc}>
        <Layer
          id="sea-liveua"
          type="circle"
          paint={{
            "circle-radius": ["case", ["==", ["get", "selected"], 1], 8, 4.5],
            "circle-color": "#38bdf8",
            "circle-opacity": 0.85,
            "circle-stroke-color": "#0c4a6e",
            "circle-stroke-width": 1,
          }}
        />
      </Source>

      {/* 에너지 시설 피격 — 위성 열점 확인은 진하게 */}
      <Source id="sea-energy" type="geojson" data={energyFc}>
        <Layer
          id="sea-energy"
          type="circle"
          paint={{
            "circle-radius": ["case", ["==", ["get", "selected"], 1], 10, ["==", ["get", "firms"], 1], 7, 5.5],
            "circle-color": ["case", ["==", ["get", "firms"], 1], "#f97316", "#fdba74"],
            "circle-opacity": 0.9,
            "circle-stroke-color": "#431407",
            "circle-stroke-width": 1.2,
          }}
        />
      </Source>

      {/* UKMTO 상선 피격·의심 경보 — 판정 등급별 색 */}
      <Source id="sea-ukmto" type="geojson" data={ukmtoFc}>
        <Layer
          id="sea-ukmto-halo"
          type="circle"
          filter={["==", ["get", "selected"], 1]}
          paint={{ "circle-radius": 16, "circle-color": "#fb7185", "circle-opacity": 0.25 }}
        />
        <Layer
          id="sea-ukmto"
          type="circle"
          paint={{
            "circle-radius": ["case", ["==", ["get", "attack"], 1], 7, 4.5],
            "circle-color": [
              "match",
              ["get", "status"],
              "confirmed",
              "#f43f5e",
              "likely",
              "#f59e0b",
              "ambiguous",
              "#e5e7eb",
              "unknown",
              "#9ca3af",
              "#d4d4d8",
            ],
            "circle-stroke-color": "#111827",
            "circle-stroke-width": 1.5,
          }}
        />
      </Source>
    </Map>
  );
});
