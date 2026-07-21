"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUDIO_MANIFEST,
  type AudioEventDef,
  type AudioEventId,
} from "@/data/audioManifest";
import { joinAudioCdnUrl } from "@/lib/cloudAudio";
import { getRuntimeConfig } from "@/lib/runtimeConfig.client";
import {
  CV_SOUND_PREF_EVENT,
  SOUND_PREF_KEY,
  readSoundEnabled,
  writeSoundEnabled,
} from "@/lib/soundPrefs";
import { isZoomScaledSound, scaledSoundVolume } from "@/lib/soundDistanceScale";

/** 로컬/스트림 URL — 캐시 버스팅으로 예전 개짖음 MP3 무효화 */
const AUDIO_URL_BUST = "v18-fpv-uav-537598";

/** 앰비언트 시작 시 서서히 커짐(팍 안 켜지게) · 전환/정지 시 서서히 작아짐 */
const AMBIENT_FADE_IN_MS = 1800;
const AMBIENT_FADE_OUT_MS = 900;

const ambientFadeTokens = new WeakMap<HTMLAudioElement, number>();
let ambientFadeTokenSeq = 0;

function cancelAmbientFade(audio: HTMLAudioElement) {
  ambientFadeTokens.set(audio, ++ambientFadeTokenSeq);
}

/** 음소거·세대 무효화 — fade 콜백이 볼륨을 다시 올리지 못하게 즉시 컷 */
function hardStopAudio(audio: HTMLAudioElement | null | undefined) {
  if (!audio) return;
  cancelAmbientFade(audio);
  try {
    audio.volume = 0;
    audio.pause();
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }
}

/** rAF 기반 볼륨 램프 — 같은 오디오 엘리먼트에 새 fade가 걸리면 이전 fade는 자동 무효화 */
function fadeAmbientVolume(
  audio: HTMLAudioElement,
  target: number,
  durationMs: number,
  onDone?: () => void,
) {
  const token = ++ambientFadeTokenSeq;
  ambientFadeTokens.set(audio, token);
  const start = audio.volume;
  const clampedTarget = Math.min(1, Math.max(0, target));
  const startedAt = performance.now();

  const step = (now: number) => {
    if (ambientFadeTokens.get(audio) !== token) return;
    const elapsed = now - startedAt;
    const progress = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
    audio.volume = start + (clampedTarget - start) * progress;
    if (progress >= 1) {
      onDone?.();
      return;
    }
    window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

function audioUrlForEvent(eventId: AudioEventId, def: AudioEventDef): string {
  if (def.localSrc) {
    return joinAudioCdnUrl(
      getRuntimeConfig().dataCdnBase,
      def.localSrc,
      AUDIO_URL_BUST,
    );
  }
  return `/api/sound-stream?eventId=${encodeURIComponent(eventId)}&v=${AUDIO_URL_BUST}`;
}

export type UseSoundStreamOptions = {
  /** false면 완전 무음 (환경설정 등) */
  enabled?: boolean;
};

export type PlaySoundOptions = {
  /** 카메라 altitude — 폭음/총격/포격 줌 연동 */
  altitude?: number | null;
  /** 매니페스트 볼륨에 곱함 (클릭 사이렌 등) */
  volumeScale?: number;
  /** 지정 시 이 시간(ms)에 정지 (루프 버스트 포함) */
  durationMs?: number;
  /** 원샷 스로틀 무시 */
  force?: boolean;
  /** true면 기존 원샷을 끊지 않고 겹쳐 재생 (전장 교전음) */
  overlap?: boolean;
  /**
   * duration 동안 음량을 사인파로 올렸다 내림 (파도).
   * factor는 계산된 기본 볼륨에 곱함.
   */
  waveVolume?: {
    minFactor: number;
    maxFactor: number;
    periodMs: number;
  };
  /** duration 종료 직후 연쇄 원샷 (FPV 컷→폭발 등) */
  chain?: {
    eventId: AudioEventId;
    volumeScale?: number;
    durationMs?: number;
    force?: boolean;
    overlap?: boolean;
  };
};

/**
 * Freesound HQ mp3를 `/api/sound-stream`으로 스트리밍 재생.
 * 브라우저 자동재생 정책: 첫 pointerdown에서 unlock.
 *
 * 음소거: hardStopAll + playGen — await audio.play() 이후 fade-in이
 * 벨 토글을 무시하고 전장음을 되살리는 레이스를 막음.
 */
export function useSoundStream(options?: UseSoundStreamOptions) {
  const enabledOpt = options?.enabled !== false;
  const [unlocked, setUnlocked] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const oneShotRef = useRef<HTMLAudioElement | null>(null);
  const overlapPoolRef = useRef<HTMLAudioElement[]>([]);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const ambientIdRef = useRef<AudioEventId | null>(null);
  const ambientBaseVolumeRef = useRef(0);
  const lastOneShotAtRef = useRef(0);
  const altitudeRef = useRef<number | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const bgmIdRef = useRef<AudioEventId | null>(null);
  const soundEnabledRef = useRef(true);
  const unlockedRef = useRef(false);
  const enabledOptRef = useRef(enabledOpt);
  const playGenRef = useRef(0);

  enabledOptRef.current = enabledOpt;

  const hardStopAll = useCallback(() => {
    playGenRef.current += 1;
    hardStopAudio(oneShotRef.current);
    oneShotRef.current = null;
    for (const a of overlapPoolRef.current) hardStopAudio(a);
    overlapPoolRef.current = [];
    hardStopAudio(ambientRef.current);
    ambientRef.current = null;
    ambientIdRef.current = null;
    hardStopAudio(bgmRef.current);
    bgmRef.current = null;
    bgmIdRef.current = null;
  }, []);

  const isLivePlay = useCallback((gen: number) => {
    return (
      enabledOptRef.current &&
      soundEnabledRef.current &&
      unlockedRef.current &&
      gen === playGenRef.current
    );
  }, []);

  useEffect(() => {
    const initial = readSoundEnabled();
    soundEnabledRef.current = initial;
    setSoundEnabledState(initial);

    const onPref = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      const next =
        typeof detail?.enabled === "boolean" ? detail.enabled : readSoundEnabled();
      soundEnabledRef.current = next;
      setSoundEnabledState(next);
      if (!next) hardStopAll();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== SOUND_PREF_KEY) return;
      const next = readSoundEnabled();
      soundEnabledRef.current = next;
      setSoundEnabledState(next);
      if (!next) hardStopAll();
    };

    window.addEventListener(CV_SOUND_PREF_EVENT, onPref);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CV_SOUND_PREF_EVENT, onPref);
      window.removeEventListener("storage", onStorage);
    };
  }, [hardStopAll]);

  useEffect(() => {
    if (!enabledOpt || unlocked) return;
    const unlock = () => {
      unlockedRef.current = true;
      setUnlocked(true);
    };
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [enabledOpt, unlocked]);

  const setSoundEnabled = useCallback(
    (next: boolean) => {
      soundEnabledRef.current = next;
      setSoundEnabledState(next);
      writeSoundEnabled(next);
      if (!next) hardStopAll();
    },
    [hardStopAll],
  );

  const canPlay = enabledOpt && soundEnabled && unlocked;

  const setCameraAltitude = useCallback((altitude: number | null | undefined) => {
    if (typeof altitude === "number" && Number.isFinite(altitude)) {
      altitudeRef.current = altitude;
    }
    const ambient = ambientRef.current;
    const ambientId = ambientIdRef.current;
    if (!ambient || !ambientId || !isZoomScaledSound(ambientId)) return;
    if (!soundEnabledRef.current) return;
    ambient.volume = scaledSoundVolume(
      ambientId,
      ambientBaseVolumeRef.current,
      altitudeRef.current,
    );
  }, []);

  const play = useCallback(
    async (eventId: AudioEventId, playOpts?: PlaySoundOptions) => {
      if (!enabledOptRef.current || !soundEnabledRef.current || !unlockedRef.current) return;
      const gen = playGenRef.current;
      const def = AUDIO_MANIFEST[eventId] as AudioEventDef | undefined;
      if (!def) return;

      if (typeof playOpts?.altitude === "number" && Number.isFinite(playOpts.altitude)) {
        altitudeRef.current = playOpts.altitude;
      }

      const timedBurst =
        typeof playOpts?.durationMs === "number" &&
        Number.isFinite(playOpts.durationMs) &&
        playOpts.durationMs > 0;

      if (!def.loop && !timedBurst && !playOpts?.force) {
        const now = Date.now();
        if (now - lastOneShotAtRef.current < 280) return;
        lastOneShotAtRef.current = now;
      }

      const volumeScale =
        typeof playOpts?.volumeScale === "number" && Number.isFinite(playOpts.volumeScale)
          ? Math.min(1.85, Math.max(0.05, playOpts.volumeScale))
          : 1;
      const volume = Math.min(
        1,
        scaledSoundVolume(eventId, def.volume, altitudeRef.current) * volumeScale,
      );

      if (def.loop && !timedBurst) {
        const ambientBase = def.volume * volumeScale;
        const targetVolume = scaledSoundVolume(eventId, ambientBase, altitudeRef.current);

        if (ambientIdRef.current === eventId && ambientRef.current && !ambientRef.current.paused) {
          if (!isLivePlay(gen)) return;
          ambientBaseVolumeRef.current = ambientBase;
          fadeAmbientVolume(ambientRef.current, targetVolume, 400);
          return;
        }

        const previous = ambientRef.current;
        if (previous) {
          fadeAmbientVolume(previous, 0, AMBIENT_FADE_OUT_MS, () => previous.pause());
        }

        const audio = new Audio(audioUrlForEvent(eventId, def));
        audio.loop = true;
        audio.volume = 0;
        ambientRef.current = audio;
        ambientIdRef.current = eventId;
        ambientBaseVolumeRef.current = ambientBase;
        try {
          await audio.play();
        } catch {
          return;
        }
        if (!isLivePlay(gen) || ambientRef.current !== audio) {
          hardStopAudio(audio);
          if (ambientRef.current === audio) {
            ambientRef.current = null;
            ambientIdRef.current = null;
          }
          return;
        }
        fadeAmbientVolume(audio, targetVolume, AMBIENT_FADE_IN_MS);
        return;
      }

      const audio = new Audio(audioUrlForEvent(eventId, def));
      const useWave = Boolean(playOpts?.waveVolume) && timedBurst;
      audio.loop = Boolean(timedBurst) && !useWave;
      audio.volume = volume;

      if (playOpts?.overlap) {
        overlapPoolRef.current = overlapPoolRef.current.filter((a) => !a.paused && !a.ended);
        if (overlapPoolRef.current.length >= 4) {
          const oldest = overlapPoolRef.current.shift();
          hardStopAudio(oldest);
        }
        overlapPoolRef.current.push(audio);
        audio.addEventListener(
          "ended",
          () => {
            overlapPoolRef.current = overlapPoolRef.current.filter((a) => a !== audio);
          },
          { once: true },
        );
      } else {
        hardStopAudio(oneShotRef.current);
        oneShotRef.current = audio;
      }

      let waveRaf = 0;
      if (useWave && playOpts?.waveVolume) {
        const { minFactor, maxFactor, periodMs } = playOpts.waveVolume;
        const peak = volume;
        const started = performance.now();
        const tickWave = (now: number) => {
          if (!isLivePlay(gen) || audio.paused || audio.ended) {
            if (waveRaf) window.cancelAnimationFrame(waveRaf);
            return;
          }
          const phase = ((now - started) / Math.max(400, periodMs)) * Math.PI * 2;
          const wave = (Math.sin(phase) + 1) / 2;
          const factor = minFactor + (maxFactor - minFactor) * wave;
          audio.volume = Math.min(1, Math.max(0, peak * factor));
          waveRaf = window.requestAnimationFrame(tickWave);
        };
        waveRaf = window.requestAnimationFrame(tickWave);
      }

      try {
        await audio.play();
      } catch {
        hardStopAudio(audio);
        overlapPoolRef.current = overlapPoolRef.current.filter((a) => a !== audio);
        if (oneShotRef.current === audio) oneShotRef.current = null;
        return;
      }
      if (!isLivePlay(gen)) {
        if (waveRaf) window.cancelAnimationFrame(waveRaf);
        hardStopAudio(audio);
        overlapPoolRef.current = overlapPoolRef.current.filter((a) => a !== audio);
        if (oneShotRef.current === audio) oneShotRef.current = null;
        return;
      }
      if (timedBurst) {
        const ms = playOpts!.durationMs!;
        const chain = playOpts?.chain;
        window.setTimeout(() => {
          if (waveRaf) window.cancelAnimationFrame(waveRaf);
          hardStopAudio(audio);
          if (oneShotRef.current === audio) oneShotRef.current = null;
          overlapPoolRef.current = overlapPoolRef.current.filter((a) => a !== audio);
          if (!isLivePlay(gen) || !chain?.eventId) return;
          void play(chain.eventId, {
            altitude: altitudeRef.current,
            volumeScale: chain.volumeScale,
            durationMs: chain.durationMs,
            force: chain.force ?? true,
            overlap: chain.overlap ?? true,
          });
        }, ms);
      }
    },
    [isLivePlay],
  );

  const stopAmbient = useCallback(() => {
    const current = ambientRef.current;
    if (current) {
      fadeAmbientVolume(current, 0, AMBIENT_FADE_OUT_MS, () => current.pause());
    }
    ambientRef.current = null;
    ambientIdRef.current = null;
  }, []);

  const setAmbient = useCallback(
    (eventId: AudioEventId | null) => {
      if (!eventId) {
        stopAmbient();
        return;
      }
      void play(eventId);
    },
    [play, stopAmbient],
  );

  const playBgm = useCallback(
    async (eventId: AudioEventId) => {
      if (!enabledOptRef.current || !soundEnabledRef.current || !unlockedRef.current) return;
      const gen = playGenRef.current;
      const def = AUDIO_MANIFEST[eventId] as AudioEventDef | undefined;
      if (!def) return;
      if (bgmIdRef.current === eventId && bgmRef.current && !bgmRef.current.paused) return;

      const previous = bgmRef.current;
      if (previous) {
        fadeAmbientVolume(previous, 0, AMBIENT_FADE_OUT_MS, () => previous.pause());
      }

      const audio = new Audio(audioUrlForEvent(eventId, def));
      audio.loop = true;
      audio.volume = 0;
      bgmRef.current = audio;
      bgmIdRef.current = eventId;
      try {
        await audio.play();
      } catch {
        return;
      }
      if (!isLivePlay(gen) || bgmRef.current !== audio) {
        hardStopAudio(audio);
        if (bgmRef.current === audio) {
          bgmRef.current = null;
          bgmIdRef.current = null;
        }
        return;
      }
      fadeAmbientVolume(audio, def.volume, AMBIENT_FADE_IN_MS);
    },
    [isLivePlay],
  );

  const stopBgm = useCallback(() => {
    const current = bgmRef.current;
    if (current) {
      fadeAmbientVolume(current, 0, AMBIENT_FADE_OUT_MS, () => current.pause());
    }
    bgmRef.current = null;
    bgmIdRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      hardStopAll();
    };
  }, [hardStopAll]);

  return {
    play,
    setAmbient,
    stopAmbient,
    playBgm,
    stopBgm,
    setCameraAltitude,
    unlocked,
    soundEnabled,
    setSoundEnabled,
    canPlay,
  };
}
