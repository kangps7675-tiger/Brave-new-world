/** 카메라·데이터 갱신 최소 간격 (ms) — 드래그/휠 중 CPU·GPU 부하 억제 */
export const DATA_UPDATE_THROTTLE_MS = 150;

/** 드래그 중 live viewState 갱신 throttle */
export const VIEW_STATE_THROTTLE_MS = DATA_UPDATE_THROTTLE_MS;

/** 카메라 idle debounce — LOD·filterCenter 교체 */
export const CAMERA_IDLE_DEBOUNCE_MS = 420;

/** 히트맵·라벨·경로 레이어 cadence (≥ DATA_UPDATE_THROTTLE_MS) */
export const HEATMAP_UPDATE_CADENCE_MS = 420;
export const LABEL_UPDATE_CADENCE_MS = 340;
export const PATH_UPDATE_CADENCE_MS = 380;

/** NEPTUN WebSocket → React state publish 간격 (카메라 idle 시) */
export const NEPTUN_PUBLISH_THROTTLE_MS = 220;

/** MapLibre zoom — 이 값 초과에서만 정착지·세부 HTML 마커 허용 */
export const SETTLEMENT_DETAIL_MIN_MAP_ZOOM = 6;

/** 줌아웃 시 주요 도시 라벨 상한 (global tier) */
export const GLOBAL_MAJOR_CITY_LABEL_MAX = 9;
