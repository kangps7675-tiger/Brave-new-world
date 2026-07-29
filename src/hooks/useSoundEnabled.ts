"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CV_SOUND_PREF_EVENT,
  DEFAULT_SOUND_ENABLED,
  SOUND_PREF_KEY,
  readSoundEnabled,
  writeSoundEnabled,
} from "@/lib/soundPrefs";

/** 오디오 엔진 없이 음소거 선호만 읽고/쓰는 훅 */
export function useSoundEnabled() {
  /**
   * 초기값은 반드시 DEFAULT_SOUND_ENABLED — 하드코딩 `true` 금지.
   *
   * localStorage는 useEffect에서야 읽히므로, 첫 렌더는 이 값으로 그려진다.
   * 예전처럼 `true`로 두면 기본 OFF 정책에도 불구하고 **첫 프레임 동안
   * soundEnabled === true**가 되어, 마운트 시 재생하는 소비자가 있으면
   * 음소거 상태에서도 소리가 새어 나간다.
   *
   * SSR에서도 readSoundEnabled()가 같은 상수를 돌려주므로 하이드레이션 안전.
   */
  const [soundEnabled, setSoundEnabledState] = useState(DEFAULT_SOUND_ENABLED);

  useEffect(() => {
    setSoundEnabledState(readSoundEnabled());

    const onPref = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === "boolean") {
        setSoundEnabledState(detail.enabled);
        return;
      }
      setSoundEnabledState(readSoundEnabled());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== SOUND_PREF_KEY) return;
      setSoundEnabledState(readSoundEnabled());
    };

    window.addEventListener(CV_SOUND_PREF_EVENT, onPref);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CV_SOUND_PREF_EVENT, onPref);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setSoundEnabled = useCallback((next: boolean) => {
    setSoundEnabledState(next);
    writeSoundEnabled(next);
  }, []);

  return { soundEnabled, setSoundEnabled };
}
