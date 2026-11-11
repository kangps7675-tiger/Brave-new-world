import type { AisVessel, MilitaryAircraft } from "@/data/geoTypes";
import type { CesiumFirmsFirePoint } from "@/lib/cesiumFirmsFires";
import type { ObserveLiveTrackSpec } from "@/lib/cesiumTrackedEntity";
import type { FlyCameraOpts } from "@/lib/globeCamera";
import type { NeptunLiveThreat } from "@/lib/neptun";
import type { StraitId } from "@/lib/straitReplay/types";

/**
 * 위성(세슘) 뷰어는 제거됐다(CLAUDE.md "세슘 제거"). 렌더러는 없고, GlobeDashboard가
 * 들고 있는 핸들 ref는 항상 null이다. 호출부 정리가 끝나면 이 파일도 지운다.
 */

export type StraitReplayMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  dim: boolean;
  kind: "anchor" | "similar" | "focus";
};

export type StraitReplayScene = {
  straitId: StraitId;
  focusId: string | null;
  markers: StraitReplayMarker[];
  onSelectEventId?: (id: string) => void;
};

export type CesiumEntitySelection =
  | { kind: "ais"; item: AisVessel }
  | { kind: "mil"; item: MilitaryAircraft; traffic: "military" | "civil" }
  | { kind: "firms"; item: CesiumFirmsFirePoint }
  | { kind: "neptun"; item: NeptunLiveThreat };

/** GlobeDashboard가 관측(Cesium) 모드에서 카메라를 조작하기 위한 최소 핸들 */
export type CesiumGlobeHandle = {
  flyTo: (
    lat: number,
    lng: number,
    altitude?: number,
    durationMs?: number,
    camera?: FlyCameraOpts,
  ) => void;
  /**
   * 「위치로 내려가기」— 미터 단위 수직 하강 (지면 + clearanceM, 기본 300m).
   * flyTo의 0.02(≈127km) 하한과 무관. 도착 시선은 수직, 기울기는 유저 몫.
   */
  descendTo: (
    lat: number,
    lng: number,
    opts?: { clearanceM?: number },
  ) => void;
  /** 하루 리플레이 — UTC 시각(0–24)으로 태양 시계(터미네이터) 설정 */
  setClockHourUtc: (hourUtc: number) => void;
  /** 실시간 시계로 복귀 */
  resetClockLive: () => void;
  /** 하루 재생 multiplier (0=정지, 예: 1200 ≈ 하루를 약 72초에) */
  setClockMultiplier: (multiplier: number) => void;
  captureFrame: () => Promise<HTMLCanvasElement | null>;
  /** 녹화용 라이브 WebGL 캔버스 */
  getCanvas: () => HTMLCanvasElement | null;
  /**
   * preserveDrawingBuffer=false 녹화 — present 직후 콜백 + continuous hold.
   * 반환 disposer로 해제.
   */
  bindPresenting: (onPresent: () => void) => () => void;
  /** 장면 링크용 카메라 (globe.gl altitude 단위) */
  pointOfView: () => { lat: number; lng: number; altitude: number } | null;
  /** 해협 이력 리플레이 마커 동기화 (null이면 제거) */
  setStraitReplayScene: (scene: StraitReplayScene | null) => void;
  /**
   * AIS/항공기 live track — Cesium trackedEntity + DR.
   * null이면 추적 해제. follow=false면 엔티티 DR만 유지·카메라는 해제.
   */
  setLiveTrackFollow: (spec: ObserveLiveTrackSpec | null) => void;
};
