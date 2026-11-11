/**
 * Observe 모드 live track 명세 타입. (세슘 뷰어 제거 후 타입만 남김 — 호출부 정리되면 이름도 바꾼다)
 */
export type ObserveLiveTrackKind = "ais" | "aircraft" | "neptun";

export type ObserveLiveTrackSpec = {
  entityId: string;
  kind: ObserveLiveTrackKind;
  follow: boolean;
  lat: number;
  lng: number;
  /** 카메라/엔티티 높이(m) */
  heightM: number;
  speedKn: number | null;
  courseDeg: number | null;
};
