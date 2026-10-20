/**
 * 비로그인(게스트) 정책 스캐폴딩 — 로그인 없이도 앱은 전부 동작한다.
 * 로그인 구현 시 이 파일 + sessionPolicy.ts 를 함께 연결한다.
 *
 * 제품 결정:
 * - 로그인 강제 없음. 게스트 = 기본 사용 모드.
 * - 설정·등불·온보딩·레이어는 **이 브라우저 localStorage** 에만 저장 (기기 로컬).
 * - PC와 모바일은 로그인 전엔 서로 동기화되지 않음 (각각 독립 게스트).
 * - 최초 로그인 시: 로컬 설정을 계정으로 가져올지 묻고, 이후엔 계정 동기화가 우선.
 */

export const GUEST_POLICY = {
  /** 로그인 없이 전체 기능 사용 가능 */
  requireLogin: false as const,
  /** 게스트 상태 저장소 */
  storage: "localStorage" as const,
  /** 기기 간 동기화는 로그인 후에만 */
  syncAcrossDevices: false as const,
  /**
   * 로그인 직후 로컬 → 계정 마이그레이션
   * - ask: 유저에게 한 번 확인
   * - always: 자동 병합
   * - never: 계정 기본값만 사용
   */
  onFirstLoginMigrateLocal: "ask" as const,
  /** 로그아웃 후에도 이 기기 게스트 설정은 유지 (계정 전용 데이터만 내림) */
  keepLocalPrefsOnLogout: true as const,
} as const;

/** 로그인 붙일 때 계정으로 올릴 로컬 키 후보 (실제 마이그레이션 목록) */
export const GUEST_LOCAL_PREF_KEYS = [
  "geowatch-layers-v21",
  "geowatch-view-config-v1",
  "geowatch-watch-symbols-v1",
  "geowatch-interest-v1",
  /** 게스트 예측 deviceId — 로그인 시 계정 연동 후보 */
  "geowatch-predict-device-v1",
  /** 로컬 스트릭·오늘 픽 캐시 */
  "geowatch-predict-prefs-v1",
  /** 진행형 분쟁 팔로우 */
  "geowatch-living-conflicts-v1",
  /** UI 글꼴 프리셋·커스텀 Google family */
  "geowatch-ui-font-v1",
  /** 첫 방문 1~10 화면 투어 */
  "geowatch-first-visit-tour-v1",
  "geowatch-tour-invite-v1",
  "cv-intel-dock-collapsed",
  "cv-watch-focus-v1",
  "cv-app-update-seen",
  // 등불·온보딩은 prefix 매칭으로 수집
] as const;

export const GUEST_LOCAL_PREF_PREFIXES = [
  "cv-periodic-brief-seen-",
  "cv-periodic-brief-folded-",
  "cv-weekly-recap-folded-",
] as const;

export const GUEST_POLICY_COPY = {
  ko: {
    title: "비로그인 · 게스트",
    steps: [
      "로그인 없이도 지도를 그대로 쓸 수 있습니다. 계정은 선택 사항입니다.",
      "레이어·모드·매일 등불·온보딩 안내는 이 기기(브라우저)에만 저장됩니다.",
      "로그인 전에는 PC와 모바일이 서로 설정을 공유하지 않습니다. 각각 독립 게스트입니다.",
      "나중에 로그인하면 이 기기 설정을 계정으로 가져올지 묻고, 이후 PC·모바일 동시 접속이 이어집니다.",
    ],
  },
  en: {
    title: "Guest · no login",
    steps: [
      "You can use the map fully without an account — login is optional.",
      "Layers, mode, the daily lamp, and onboarding stay on this browser only.",
      "Before login, desktop and mobile do not sync — each device is its own guest.",
      "On first login we’ll ask whether to bring this device’s settings into your account; then dual desktop+mobile sessions apply.",
    ],
  },
} as const;

/** 현재는 항상 게스트 — 로그인 연결 시 userId 유무로 교체 */
export function isGuestSession(): boolean {
  return true;
}
