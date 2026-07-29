/** localStorage key — useSoundStream / 주의 창 / 음소거 토글 공유 */
export const SOUND_PREF_KEY = "cv-sound-enabled";

/** 같은 탭 내 여러 훅 인스턴스 동기화 */
export const CV_SOUND_PREF_EVENT = "cv-sound-pref";

/**
 * 기본값 OFF (2026-07 결정).
 *
 * 이전에는 `true`였고 동의는 진입 주의창 PHASE 03에서 받았다. 첫 90초 재설계로
 * 주의창이 전면 게이트에서 빠지면서 **동의를 받을 화면이 사라졌다** →
 * 기본 ON을 유지하면 무동의 자동 재생(사무실·공공장소에서 공습 사이렌)이 된다.
 *
 * 사이렌·모스는 켠 사람에게만 강력하다. 안 켠 사람에겐 이탈 사유다.
 * 대신 `hasSoundChoice()`가 false인 사용자에게 「소리 켜기」 어포던스를 노출한다.
 */
export const DEFAULT_SOUND_ENABLED = false;

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
 * false면 "아직 아무도 안 물어봤다" → 언뮤트 유도를 띄울 수 있다.
 * (기본값이 OFF이므로, 이 신호가 없으면 "끈 사람"과 "모르는 사람"을 구분할 수 없다.)
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
