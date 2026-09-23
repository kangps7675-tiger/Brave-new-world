"use client";

import { useMemo } from "react";
import Map, { Layer, Marker, NavigationControl, Source } from "react-map-gl/maplibre";
import { setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Feature } from "geojson";
import { AGENCY_COLOR, illustrationEndpoints, trackPosition, type MissileAgency, type MissileEvent } from "@/lib/missileTrack";

if (typeof window !== "undefined") setWorkerUrl("/maplibre-gl-worker.mjs");
const style: StyleSpecification = {
  version: 8,
  sources: { countries: { type: "geojson", data: "/data/missile-context.geojson", attribution: "Natural Earth" } },
  layers: [
    { id: "water", type: "background", paint: { "background-color": "#0b1724" } },
    { id: "land", type: "fill", source: "countries", paint: { "fill-color": "#243440" } },
    { id: "borders", type: "line", source: "countries", paint: { "line-color": "#4a5e6b", "line-width": 1 } },
  ],
};
const labels: [number, number, string][] = [[127.4, 36.1, "대한민국"], [127, 40.4, "북한"], [140.5, 40, "일본"], [132.5, 37.6, "동해 / Sea of Japan"]];

export default function MissileTrackMap({ event, visible, progress, onReport, onError }: {
  event: MissileEvent; visible: MissileAgency[]; progress: number;
  onReport: (id: string) => void; onError: () => void;
}) {
  const reports = useMemo(() => event.reports.filter(r => visible.includes(r.agency)), [event, visible]);
  const endpoints = useMemo(() => illustrationEndpoints(event, visible), [event, visible]);
  const areas = useMemo<Feature[]>(() => reports.flatMap(report => [report.launch, report.landing].flatMap(place => {
    if (!place?.bounds) return [];
    const [w, s, e, n] = place.bounds;
    return [{ type: "Feature" as const, properties: { color: AGENCY_COLOR[report.agency] }, geometry: {
      type: "Polygon" as const, coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
    } }];
  })), [reports]);
  const regions = useMemo<FeatureCollection>(() => ({ type: "FeatureCollection", features: areas }), [areas]);
  const path = useMemo<FeatureCollection>(() => ({ type: "FeatureCollection", features: endpoints ? [{
    type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: Array.from({ length: 101 }, (_, i) => trackPosition(endpoints.launch.coordinates, endpoints.landing.coordinates, i / 100)) },
  }] : [] }), [endpoints]);
  const position = endpoints ? trackPosition(endpoints.launch.coordinates, endpoints.landing.coordinates, progress) : null;

  return <Map initialViewState={{ bounds: [[123, 35], [142, 45]], fitBoundsOptions: { padding: 45 } }} mapStyle={style}
    minZoom={2} maxZoom={9} style={{ width: "100%", height: "100%" }} onError={onError}>
    <NavigationControl position="bottom-right" showCompass={false} />
    <Source id="report-areas" type="geojson" data={regions}>
      <Layer id="report-areas-fill" type="fill" paint={{ "fill-color": ["get", "color"], "fill-opacity": 0.13 }} />
      <Layer id="report-areas-outline" type="line" paint={{ "line-color": ["get", "color"], "line-width": 1.5, "line-dasharray": [3, 3] }} />
    </Source>
    <Source id="illustrative-track" type="geojson" data={path}>
      <Layer id="illustrative-track-line" type="line" paint={{ "line-color": "#fbbf24", "line-width": 2, "line-dasharray": [3, 4] }} />
    </Source>
    {labels.map(([lng, lat, label]) => <Marker key={label} longitude={lng} latitude={lat}><span style={{ color: "#aabac7", fontSize: 12 }}>{label}</span></Marker>)}
    {reports.flatMap(report => [report.launch, report.landing].flatMap((place, index) => place ? [
      <Marker key={`${report.id}-${index}`} longitude={place.coordinates[0]} latitude={place.coordinates[1]}>
        <button onClick={() => onReport(report.id)} title={place.basis} style={{ border: `1px solid ${AGENCY_COLOR[report.agency]}`, color: AGENCY_COLOR[report.agency], background: "#101e2eee", padding: "7px 10px", borderRadius: 5, fontSize: 12 }}>
          {place.precision === "published-coordinate" ? "●" : "◇"} {place.label}<br />{place.precision === "published-coordinate" ? "발표 좌표" : "지명 참조 · 좌표 미공개"}
        </button>
      </Marker>,
    ] : []))}
    {position && <Marker longitude={position[0]} latitude={position[1]}><span aria-label="개략 이동 위치" style={{ display: "block", width: 12, height: 12, background: "#fbbf24", border: "2px solid white", borderRadius: "50%", boxShadow: "0 0 16px #fbbf2488", pointerEvents: "none" }} /></Marker>}
  </Map>;
}
