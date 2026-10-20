"use client";

/**
 * 해역 지구본 — maplibre globe projection + 기존 인텔 다크 베이스맵.
 *
 * 예전 MapGlobeView(4천 줄, 레이어 수십 개)를 대체한다. 여기엔 해역 판단에
 * 직접 쓰이는 것만 올린다: 피격 경보 · 항행경보 · 해상 사건 속보 ·
 * 에너지 시설 피격 · (탭을 켰을 때만) 우크라이나 전쟁 동향.
 * 사건 하나를 깊게 볼 때는 세슘(CesiumSatelliteGlobe)으로 넘어간다.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import Map, { Layer, Marker, Source, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { applyBasemapGlobeProjection, INTEL_VECTOR_STYLE_URL } from "@/lib/basemapMode";
import { ENERGY_FACILITIES } from "@/data/energyFacilities";
import type { EnergyStrike } from "@/lib/sea/energyStrikes";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";
import { EventCalloutCard } from "@/components/globe/EventCalloutCard";
import type { EventCallout } from "@/lib/eventCallout";
import { ensureStrikeFlameImage, STRIKE_FLAME_ICON_ID } from "@/lib/strikeFlameIcon";
import type { StrikeFlame } from "@/lib/strikeFlames";

if (typeof window !== "undefined") {
  // 워커는 maplibre-gl 버전 폴더에서 받는다 (scripts/copy-maplibre-worker.mjs) —
  // 메인 번들과 워커 버전이 어긋나면 "can't deserialize unregistered class" 로 지도가 죽는다.
  setWorkerUrl(`/maplibre-gl/${process.env.NEXT_PUBLIC_MAPLIBRE_VERSION}/maplibre-gl-worker.mjs`);
}

export type SeaGlobeSelection =
  | { type: "ukmto"; id: string }
  | { type: "liveua"; id: string }
  | { type: "energy"; id: string }
  | { type: "facility"; id: string }
  | { type: "flame"; id: string };

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
  /** 양피지를 닫은 뒤 사건 좌표에 남는 콜아웃 */
  /** LiveUAMap 통제면(우크라 점령지 + 중동) */
  control?: FeatureCollection;
  /** 전쟁 중인 나라 국경 폴리곤 */
  warCountries?: FeatureCollection;
  /** 드론·미사일 공습 — 촛불 불꽃 */
  flames?: StrikeFlame[];
  callout?: EventCallout | null;
  onCalloutClose?: () => void;
};

const INTERACTIVE = ["sea-ukmto", "sea-liveua", "sea-energy", "sea-facility", "sea-war", "sea-flame"];
const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

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

  const flameFc = useMemo(
    () =>
      points(props.flames ?? [], (f) => ({
        lat: f.lat,
        lng: f.lng,
        props: { id: f.id, kind: "flame" },
      })),
    [props.flames],
  );
  const flameCount = flameFc.features.length;

  // 촛불 불꽃 깜빡임 — 후광 투명도를 흔들어 네온처럼 보이게 한다.
  useEffect(() => {
    if (flameCount === 0) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = window.requestAnimationFrame(tick);
      if (now - last < 90 || document.hidden) return;
      last = now;
      const map = mapRef.current?.getMap();
      if (!map?.getLayer("sea-flame")) return;
      const t = now / 1000;
      const flicker = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 9.3)) * (0.6 + 0.4 * Math.sin(t * 23.7 + 1.3));
      try {
        map.setPaintProperty("sea-flame", "icon-opacity", 0.86 + 0.14 * flicker);
        if (map.getLayer("sea-flame-bloom")) map.setPaintProperty("sea-flame-bloom", "circle-opacity", 0.16 + 0.26 * flicker);
        if (map.getLayer("sea-flame-glow")) map.setPaintProperty("sea-flame-glow", "circle-opacity", 0.32 + 0.36 * flicker);
      } catch {
        /* 스타일 교체 중 */
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [flameCount]);

  const handleLoad = useCallback(() => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    applyBasemapGlobeProjection(m as never);
    void ensureStrikeFlameImage(m as never);
    m.on("styleimagemissing", () => void ensureStrikeFlameImage(m as never));
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
      {/* 전쟁 중인 나라 국경 — 줌인하면 경계선만 남고 칠은 거의 사라진다 */}
      <Source id="sea-war-countries" type="geojson" data={props.warCountries ?? EMPTY_FC}>
        <Layer
          id="sea-war-countries-fill"
          type="fill"
          paint={{
            "fill-color": "#a52714",
            "fill-opacity": ["interpolate", ["linear"], ["zoom"], 2, 0.22, 5, 0.14, 8, 0.05, 10, 0.02],
          }}
        />
        <Layer
          id="sea-war-countries-line"
          type="line"
          paint={{
            "line-color": "#ef9a9a",
            "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.8, 8, 1.6],
            "line-opacity": 0.75,
          }}
        />
      </Source>

      {/* LiveUAMap 통제면 — 우크라 점령지·중동 통제 구역 */}
      <Source id="sea-control" type="geojson" data={props.control ?? EMPTY_FC}>
        <Layer
          id="sea-control-fill"
          type="fill"
          filter={["==", ["geometry-type"], "Polygon"]}
          paint={{
            "fill-color": ["coalesce", ["get", "fill"], "#a52714"],
            "fill-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.32, 7, 0.22, 10, 0.1],
          }}
        />
        <Layer
          id="sea-control-line"
          type="line"
          filter={["!=", ["geometry-type"], "Point"]}
          paint={{
            "line-color": ["coalesce", ["get", "stroke"], "#ef9a9a"],
            "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.6, 9, 1.4],
            "line-opacity": 0.8,
          }}
        />
      </Source>

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
      {/* 드론·미사일 공습 — 촛농 위의 네온 촛불 (러-우 + 중동 공통) */}
      <Source id="sea-flame" type="geojson" data={flameFc}>
        <Layer
          id="sea-flame-bloom"
          type="circle"
          paint={{
            "circle-color": "#ff4a0e",
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 1.5, 17, 4, 21, 7, 27, 10, 36],
            "circle-blur": 1,
            "circle-opacity": 0.3,
            "circle-translate": ["interpolate", ["linear"], ["zoom"], 1.5, ["literal", [0, -10]], 10, ["literal", [0, -22]]],
            "circle-translate-anchor": "viewport",
            "circle-pitch-alignment": "viewport",
          }}
        />
        <Layer
          id="sea-flame-glow"
          type="circle"
          paint={{
            "circle-color": "#ffb347",
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 1.5, 7, 4, 9, 7, 12, 10, 16],
            "circle-blur": 0.75,
            "circle-opacity": 0.55,
            "circle-translate": ["interpolate", ["linear"], ["zoom"], 1.5, ["literal", [0, -10]], 10, ["literal", [0, -22]]],
            "circle-translate-anchor": "viewport",
            "circle-pitch-alignment": "viewport",
          }}
        />
        <Layer
          id="sea-flame"
          type="symbol"
          layout={{
            "icon-image": STRIKE_FLAME_ICON_ID,
            "icon-size": ["interpolate", ["linear"], ["zoom"], 1.5, 0.3, 4, 0.36, 7, 0.46, 10, 0.62],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-anchor": "bottom",
            "icon-pitch-alignment": "viewport",
            "icon-rotation-alignment": "viewport",
          }}
        />
      </Source>

      {props.callout ? (
        <Marker longitude={props.callout.lng} latitude={props.callout.lat} anchor="bottom">
          <EventCalloutCard callout={props.callout} onClose={() => props.onCalloutClose?.()} />
        </Marker>
      ) : null}
    </Map>
  );
});
