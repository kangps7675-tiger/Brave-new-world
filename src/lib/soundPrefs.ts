/** localStorage key — useSoundStream / 주의 창 / 음소거 토글 공유 */
export const SOUND_PREF_KEY = "cv-sound-enabled";

/** 같은 탭 내 여러 훅 인스턴스 동기화 */
export const CV_SOUND_PREF_EVENT = "cv-sound-pref";

/**
 * 기본값 ON (2026-09 재전환).
 *
 * 사이렌·모스는 제품의 핵심 감각이다. 시끄러우면 유저가 음소거하면 된다.
 * 브라우저 autoplay 정책상 첫 제스처 전에는 실제로 안 날 수 있지만,
 * 선호 기본은 켠 상태로 둔다.
 *
 * 이미 `cv-sound-enabled`를 저장한 유저는 그 선택을 존중한다.
 */
export const DEFAULT_SOUND_ENABLED = true;

export function readSoundEnabled(): boolean {
  if (typeof window === "undefined") return DEFAULT_SOUND_ENABLED;
  try {
    const raw = localStorage.getItem(SOUND_PREF_KEY);
    if (raw === null) return DEFAULT_SOUND_ENABLED;
    return raw === "1" || raw === "true";
  } catch {
    return DEFAULT_SOUND_ENABLED;
  }
}

/**
 * 유저가 소리를 한 번이라도 직접 선택했는가.
 * false면 "아직 아무도 안 물어봤다" → (기본 OFF였을 때) 언뮤트 유도용.
 * 기본 ON에서도 명시적 선택 여부를 구분하는 데 쓴다.
 */
export function hasSoundChoice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SOUND_PREF_KEY) !== null;
  } catch {
    return false;
  }
}

export function writeSoundEnabled(next: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_PREF_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(CV_SOUND_PREF_EVENT, { detail: { enabled: next } }),
  );
}
