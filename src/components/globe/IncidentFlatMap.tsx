"use client";

import Map, { Marker } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { INTEL_VECTOR_STYLE_URL } from "@/lib/basemapMode";
import type { NearbyPlace } from "@/lib/nearbyContext";

if (typeof window !== "undefined") setWorkerUrl(`/maplibre-gl/${process.env.NEXT_PUBLIC_MAPLIBRE_VERSION}/maplibre-gl-worker.mjs`);

type Props = {
  lat: number;
  lng: number;
  /** 해역 단위로 보이는 기본 줌 */
  zoom?: number;
  ariaLabel: string;
  /** 점 위에 붙는 말풍선 — 지명/사건 종류/시각 */
  callout?: { title: string; subtitle?: string };
  /** 같은 지도에 흐리게 찍는 다른 최근 사건 */
  dots?: Array<{ id: string; lat: number; lng: number }>;
  /** 근처 해협·감시 시설 라벨 */
  places?: NearbyPlace[];
  /** 지도 안에서도 휠 줌을 쓸 때(전체 화면 지도) */
  interactive?: boolean;
};

/**
 * 사건 위치를 보여 주는 작은 평면 지도(MapLibre, 메인 지도와 같은 다크 벡터 스타일).
 * 카드 안에서 스크롤을 가로채지 않도록 휠 줌은 끄고, 드래그·핀치만 둔다.
 * 위치는 근사치이므로 점 주변에 퍼지는 링으로 "정확한 지점이 아님"을 표현한다.
 */
export default function IncidentFlatMap({
  lat,
  lng,
  zoom = 5.4,
  ariaLabel,
  callout,
  dots = [],
  places = [],
  interactive = false,
}: Props) {
  return (
    <Map
      key={`${lat.toFixed(3)}:${lng.toFixed(3)}`}
      initialViewState={{ latitude: lat, longitude: lng, zoom }}
      mapStyle={INTEL_VECTOR_STYLE_URL}
      minZoom={2}
      maxZoom={10}
      scrollZoom={interactive}
      dragRotate={false}
      touchZoomRotate={{ around: "center" }}
      style={{ width: "100%", height: "100%" }}
      aria-label={ariaLabel}
    >
      {dots.map((d) => (
        <Marker key={d.id} latitude={d.lat} longitude={d.lng} anchor="center">
          <span className="block h-2 w-2 rounded-full bg-red-400/45 ring-1 ring-white/30" aria-hidden />
        </Marker>
      ))}
      {places.map((p) => (
        <Marker key={p.id} latitude={p.lat} longitude={p.lng} anchor="top">
          <span
            className={`pointer-events-none block max-w-[9rem] truncate rounded-sm bg-black/55 px-1 text-[10px] leading-4 ${
              p.kind === "choke" ? "text-cyan-200" : "text-amber-200"
            }`}
          >
            {p.kind === "choke" ? "⚓ " : "▪ "}
            {p.name}
          </span>
        </Marker>
      ))}
      <Marker latitude={lat} longitude={lng} anchor="center">
        <span className="relative block h-5 w-5" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500/45" />
          <span className="absolute inset-[5px] rounded-full border-2 border-white bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
        </span>
      </Marker>
      {callout ? (
        <Marker latitude={lat} longitude={lng} anchor="bottom" offset={[0, -14]}>
          <span className="pointer-events-none block max-w-[12rem] rounded-md border border-red-300/50 bg-[#1a0c0c]/92 px-2 py-1 text-[11px] leading-snug text-red-50 shadow-lg">
            <span className="block font-semibold">{callout.title}</span>
            {callout.subtitle ? <span className="block text-[10px] text-red-200/80">{callout.subtitle}</span> : null}
          </span>
        </Marker>
      ) : null}
    </Map>
  );
}
