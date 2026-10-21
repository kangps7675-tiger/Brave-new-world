import { LAB_UI } from "@/lib/labFlag";
import type { CesiumSatelliteGlobeProps } from "@/components/globe/CesiumSatelliteGlobe";

/**
 * 세슘(위성) 화면에는 선박(AIS) 점을 그리지 않는다. 선박 위치는 Datalastic(유료)·AISstream 으로 보는 데이터라서
 * 지도(MapLibre)와 세슘에 둘 다 그리면 무거워지고, 세슘은 "사건 현장을 위성사진으로 보는 곳"이어서다.
 * 항공기·불꽃·해협 오버레이·라벨·콜아웃 등 나머지는 그대로 그린다. (2026-10-21 필성 확정)
 * 코드는 지우지 않는다 — NEXT_PUBLIC_LAB=1(실험실)이면 선박도 예전처럼 그린다.
 */
export const SATELLITE_DRAWS_SHIPS = LAB_UI;

/** 세슘에 넘기는 선박 데이터·표시 플래그 — 이 값들만 비운다. */
export const CESIUM_SHIPS_OFF: Partial<CesiumSatelliteGlobeProps> = {
  aisVessels: undefined,
  disguisedVessels: undefined,
  showAis: false,
  showAisMilitary: false,
  showAisCommercial: false,
  showDisguisedVessels: false,
};

/** 실험실이 아니면 선박 props 를 비운다. 나머지는 그대로 통과. */
export function cesiumShipProps<T extends Partial<CesiumSatelliteGlobeProps>>(
  props: T,
  draw: boolean = SATELLITE_DRAWS_SHIPS,
): T {
  return draw ? props : { ...props, ...CESIUM_SHIPS_OFF };
}
