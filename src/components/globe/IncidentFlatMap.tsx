"use client";

import Map, { Marker } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { INTEL_VECTOR_STYLE_URL } from "@/lib/basemapMode";

if (typeof window !== "undefined") setWorkerUrl(`/maplibre-gl/${process.env.NEXT_PUBLIC_MAPLIBRE_VERSION}/maplibre-gl-worker.mjs`);

type Props = {
  lat: number;
  lng: number;
  /** 해역 단위로 보이는 기본 줌 */
  zoom?: number;
  ariaLabel: string;
};

/**
 * 사건 위치를 보여 주는 작은 평면 지도(MapLibre, 메인 지도와 같은 다크 벡터 스타일).
 * 카드 안에서 스크롤을 가로채지 않도록 휠 줌은 끄고, 드래그·핀치만 둔다.
 * 위치는 근사치이므로 점 주변에 퍼지는 링으로 "정확한 지점이 아님"을 표현한다.
 */
export default function IncidentFlatMap({ lat, lng, zoom = 5.4, ariaLabel }: Props) {
  return (
    <Map
      key={`${lat.toFixed(3)}:${lng.toFixed(3)}`}
      initialViewState={{ latitude: lat, longitude: lng, zoom }}
      mapStyle={INTEL_VECTOR_STYLE_URL}
      minZoom={2}
      maxZoom={10}
      scrollZoom={false}
      dragRotate={false}
      touchZoomRotate={{ around: "center" }}
      style={{ width: "100%", height: "100%" }}
      aria-label={ariaLabel}
    >
      <Marker latitude={lat} longitude={lng} anchor="center">
        <span className="relative block h-5 w-5" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500/45" />
          <span className="absolute inset-[5px] rounded-full border-2 border-white bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
        </span>
      </Marker>
    </Map>
  );
}
