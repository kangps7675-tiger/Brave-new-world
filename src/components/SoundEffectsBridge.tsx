"use client";

import { useEffect, useRef } from "react";
import {
  AUDIO_MANIFEST,
  type AudioEventId,
} from "@/data/audioManifest";
import type { GlobeLodTier } from "@/lib/globeLod";
import { useSoundStream, type PlaySoundOptions } from "@/hooks/useSoundStream";
import { wtiAmbientVolumeScale } from "@/lib/wti";

/** 공습경보·A급 속보 타전·양피지 UI 버스 — 티커/일반 UI 클릭음은 차단 */
export const CV_SOUND_EVENT = "cv-sound";

/** 버스 허용 이벤트 */
const DASHBOARD_BUS_EVENT_IDS = new Set<AudioEventId>([
  "tzeva-red-alert",
  "tzeva-all-clear",
  "neptun-air-alert",
  "hero-breaking",
  "parchment-unfold",
  "parchment-fold",
  "parchment-flyaway",
]);

export type DashboardSoundDetail = {
  eventId: AudioEventId;
} & PlaySoundOptions;

export function emitDashboardSound(
  eventId: AudioEventId,
  playOpts?: PlaySoundOptions,
) {
  if (typeof window === "undefined") return;
  if (!DASHBOARD_BUS_EVENT_IDS.has(eventId)) return;
  window.dispatchEvent(
    new CustomEvent(CV_SOUND_EVENT, {
      detail: { eventId, ...playOpts } satisfies DashboardSoundDetail,
    }),
  );
}

/** A급 속보 히어로 슬라이드업 시 SOS 모스 타전 */
export function emitBreakingDispatchSound() {
  emitDashboardSound("hero-breaking", {
    force: true,
    volumeScale: 0.9,
    durationMs: 9000,
  });
}

/** 양피지 펼칠 때 — 종이 바스락 */
export function emitParchmentUnfoldSound() {
  emitDashboardSound("parchment-unfold", {
    force: true,
    volumeScale: 1,
    /** waveVolume으로 루프 버스트 방지 · 클립 한 번만 */
    durationMs: 3600,
    waveVolume: { minFactor: 1, maxFactor: 1, periodMs: 2000 },
  });
}

/** 양피지 접기 CTA — 접히며 올라가는 소리 + 날아가는 whoosh */
export function emitParchmentFoldSound() {
  emitDashboardSound("parchment-fold", {
    force: true,
    volumeScale: 1.05,
    /** FS#140891 ~22s — 접힘 모션 구간에 맞춰 컷 */
    durationMs: 2200,
    waveVolume: { minFactor: 1, maxFactor: 1, periodMs: 900 },
    chain: {
      eventId: "parchment-flyaway",
      force: true,
      volumeScale: 0.85,
      overlap: true,
    },
  });
}

/** regional = 멀리(포격) · close = near+village 통일(총성+포격+드론) */
type FrontlineSoundLod = "regional" | "close";

type WeightedPick = {
  id: AudioEventId;
  weight: number;
};

/** LOD별 원샷 가중치 풀 */
const FRONTLINE_POOL_BY_LOD: Record<FrontlineSoundLod, WeightedPick[]> = {
  /** 멀리 — 포격 위주 + 짧고 음량 들쭉날쭉한 폭격 스팅 · 총성 없음 · FPV 희귀 */
  regional: [
    { id: "frontline-artillery-shot", weight: 4 },
    { id: "neptun-impact", weight: 5 },
    { id: "frontline-bombing", weight: 1 },
    { id: "frontline-mlrs", weight: 1 },
    { id: "frontline-fpv-drone", weight: 1 },
  ],
  /**
   * 가까이(near·village 동일) — 예전 village 풀:
   * 총성 2종 + 포격·폭격·MLRS·FPV가 같이 들림. near 이탈(→ regional/상위)까지 연속.
   */
  close: [
    { id: "frontline-gunfire", weight: 4 },
    { id: "frontline-gunfire-distant-auto", weight: 3 },
    { id: "frontline-artillery-shot", weight: 2 },
    { id: "frontline-bombing", weight: 1 },
    { id: "frontline-mlrs", weight: 1 },
    { id: "frontline-fpv-drone", weight: 3 },
  ],
};

const GUNFIRE_IDS = new Set<AudioEventId>([
  "frontline-gunfire",
  "frontline-gunfire-distant-auto",
]);

function toFrontlineSoundLod(tier: GlobeLodTier | undefined): FrontlineSoundLod {
  // near·village 통일 → close (고도 ≤ ~0.72)
  if (tier === "near" || tier === "village") return "close";
  return "regional";
}

function pickWeighted(pool: WeightedPick[]): AudioEventId {
  const total = pool.reduce((sum, row) => sum + row.weight, 0);
  let roll = Math.random() * total;
  for (const row of pool) {
    roll -= row.weight;
    if (roll <= 0) return row.id;
  }
  return pool[pool.length - 1]!.id;
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** FPV: 비행 풀볼륨 → 하드스톱(인지 불가) → 즉시 큰 폭발 */
function playFrontlineFpvPass(
  play: (id: AudioEventId, opts?: PlaySoundOptions) => void | Promise<void>,
  lod: FrontlineSoundLod,
  cameraAltitude: number | undefined,
) {
  const volumeScale =
    lod === "close" ? randBetween(0.9, 1.1) : randBetween(0.4, 0.55);
  const boomId: AudioEventId = Math.random() < 0.55 ? "neptun-impact" : "frontline-fpv-detonation";
  void play("frontline-fpv-drone", {
    altitude: cameraAltitude,
    volumeScale,
    force: true,
    overlap: true,
    /** 파도 페이드 없음 — 끊김을 느끼게 하지 않고 pause 후 즉시 boom */
    durationMs: Math.round(randBetween(6500, 10500)),
    chain: {
      eventId: boomId,
      volumeScale:
        boomId === "frontline-fpv-detonation"
          ? randBetween(1.45, 1.7)
          : randBetween(1.4, 1.65),
      durationMs:
        boomId === "frontline-fpv-detonation"
          ? Math.round(randBetween(3200, 4000))
          : Math.round(randBetween(2800, 4200)),
      force: true,
      overlap: true,
    },
  });
}

/** 원샷별 LOD 볼륨·컷 길이 */
function frontlineOneshotOpts(
  id: AudioEventId,
  lod: FrontlineSoundLod,
): { volumeScale: number; durationMs?: number } {
  if (lod === "regional" && id === "neptun-impact") {
    return {
      volumeScale: randBetween(0.55, 1.15),
      durationMs: Math.round(randBetween(2500, 3500)),
    };
  }
  if (id === "neptun-impact") {
    return { volumeScale: randBetween(0.85, 1.15), durationMs: 4500 };
  }
  if (GUNFIRE_IDS.has(id)) {
    return {
      volumeScale: randBetween(1.0, 1.15),
      durationMs: id === "frontline-gunfire" ? 4500 : 3500,
    };
  }
  if (id === "frontline-artillery-shot") {
    return { volumeScale: randBetween(0.95, 1.12), durationMs: lod === "regional" ? 4500 : 5000 };
  }
  if (id === "frontline-bombing") {
    return { volumeScale: randBetween(0.9, 1.1), durationMs: 4500 };
  }
  if (id === "frontline-mlrs") {
    return { volumeScale: 1.25, durationMs: 5000 };
  }
  return { volumeScale: 1.05 };
}

/** 전선 베드 — 멀리서 키우고, 가까이선 총성·드론에 자리 양보 */
function frontlineBedVolumeScale(lod: FrontlineSoundLod): number {
  if (lod === "regional") return 1.28;
  return 0.68;
}

export type EconomyAmbientKind = "port" | "construction" | "datacenter" | "pipeline" | null;
export type ConflictAmbientKind = "frontline" | "taiwan-tension" | "tension" | "carrier" | null;

type SoundEffectsBridgeProps = {
  viewerMode?: "conflict" | "economy";
  /** 뷰포트 안 NEPTUN 탄착이 있으면 true — 진입 시 폭발음 */
  neptunImpactInView?: boolean;
  /** 뷰포트 안 FIRMS 전투(폭격 추정) 화재가 있으면 true */
  firmsCombatInView?: boolean;
  /**
   * 지정학 앰비언스 우선순위: frontline > taiwan-tension > tension > carrier
   * (전선 교전음 윈도우는 frontline일 때만)
   */
  conflictAmbient?: ConflictAmbientKind;
  /** 경제 허브/항만/파이프 등 해당 레이어 */
  economyAmbient?: EconomyAmbientKind;
  cameraAltitude?: number;
  /** 전선 원샷 풀·베드 볼륨 LOD */
  globeLodTier?: GlobeLodTier;
  /**
   * 오늘의 WTI (0–100). 긴장·대만해협 앰비언트 음량에 매핑.
   * 음원 없는 dashboard-bgm 도 나중에 같은 곡선(wtiBgmVolumeScale) 사용.
   */
  wtiScore?: number | null;
};

/**
 * 사운드 규칙
 * - 공습경보: 칩/버튼 fly 시에만 (emitDashboardSound)
 * - 그 외: 카메라가 해당 지역·레이어 위에 있을 때 자동 재생 (클릭 없음)
 * - 전선: LOD별 원샷 풀 (regional=포격/짧은폭격, close=near+village 통일 · 총성+포격+드론 연속)
 * - 긴장 앰비언트: WTI 숫자가 강도 (계기판 = 사운드)
 */
export function SoundEffectsBridge({
  viewerMode,
  neptunImpactInView = false,
  firmsCombatInView = false,
  conflictAmbient = null,
  economyAmbient = null,
  cameraAltitude,
  globeLodTier,
  wtiScore = null,
}: SoundEffectsBridgeProps) {
  const { play, setAmbient, stopAmbient, setCameraAltitude, canPlay } = useSoundStream();

  const primedRef = useRef(false);
  const neptunInViewRef = useRef(false);
  const firmsInViewRef = useRef(false);
  const frontlineAmbient = conflictAmbient === "frontline";
  const frontlineLod = toFrontlineSoundLod(globeLodTier);
  const wtiVol = wtiAmbientVolumeScale(wtiScore);

  useEffect(() => {
    setCameraAltitude(cameraAltitude);
  }, [cameraAltitude, setCameraAltitude]);

  // 대시보드 배경음악(BGM) — 아직 public/audio/dashboard-bgm.mp3 음원을 안 넣기로 해서
  // 자동 트리거는 꺼둠(파일 없는 채로 매 세션 404 요청만 발생하는 걸 방지).
  // 나중에 음원 넣으면: 위 destructuring에 playBgm 추가하고, 아래 트리거를 되살리면 됨.
  //   useEffect(() => {
  //     if (!canPlay) return;
  //     void playBgm("dashboard-bgm");
  //   }, [canPlay, playBgm]);
  // useSoundStream()의 playBgm/stopBgm 자체는 이미 구현돼 있어 그대로 씀.

  useEffect(() => {
    if (!canPlay || primedRef.current) return;
    primedRef.current = true;
    // 현재 이미 보고 있는 구역은 "진입"으로 치지 않음 — 다음 진입부터
    neptunInViewRef.current = neptunImpactInView;
    firmsInViewRef.current = firmsCombatInView;
  }, [canPlay, firmsCombatInView, neptunImpactInView]);

  // 공습경보 · A급 속보 타전
  useEffect(() => {
    const onBus = (event: Event) => {
      const detail = (event as CustomEvent<DashboardSoundDetail>).detail;
      const eventId = detail?.eventId;
      if (!eventId || !DASHBOARD_BUS_EVENT_IDS.has(eventId)) return;
      if (!(eventId in AUDIO_MANIFEST)) return;
      void play(eventId, {
        altitude: detail.altitude ?? cameraAltitude,
        volumeScale: detail.volumeScale,
        durationMs: detail.durationMs,
        force: detail.force,
        overlap: detail.overlap,
        chain: detail.chain,
        waveVolume: detail.waveVolume,
      });
    };
    window.addEventListener(CV_SOUND_EVENT, onBus);
    return () => window.removeEventListener(CV_SOUND_EVENT, onBus);
  }, [cameraAltitude, play]);

  // NEPTUN 탄착 지역 진입
  useEffect(() => {
    if (!canPlay || !primedRef.current) return;
    const entered = neptunImpactInView && !neptunInViewRef.current;
    neptunInViewRef.current = neptunImpactInView;
    if (!entered) return;
    void play("neptun-impact", {
      altitude: cameraAltitude,
      volumeScale: 1.2,
      force: true,
      durationMs: 5000,
    });
  }, [cameraAltitude, canPlay, neptunImpactInView, play]);

  // FIRMS 폭격 추정 지역 진입 + 머무는 동안 간헐
  useEffect(() => {
    if (!canPlay || !primedRef.current) return;
    const entered = firmsCombatInView && !firmsInViewRef.current;
    firmsInViewRef.current = firmsCombatInView;
    if (entered) {
      void play("firms-combat-burst", {
        altitude: cameraAltitude,
        volumeScale: 1.15,
        force: true,
        durationMs: 5000,
      });
    }
    if (!firmsCombatInView) return;

    let cancelled = false;
    let timer: number | null = null;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        void play("firms-combat-burst", {
          altitude: cameraAltitude,
          volumeScale: 1.05,
          force: true,
          durationMs: 5000,
        });
        schedule();
      }, 7000 + Math.floor(Math.random() * 8000));
    };
    schedule();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [cameraAltitude, canPlay, firmsCombatInView, play]);

  // 지정학 / 경제 지역 앰비언스
  useEffect(() => {
    if (!canPlay) {
      stopAmbient();
      return;
    }

    if (viewerMode === "conflict") {
      if (conflictAmbient === "frontline") {
        void play("frontline-artillery-ambient", {
          altitude: cameraAltitude,
          volumeScale: frontlineBedVolumeScale(frontlineLod),
        });
        return;
      }
      if (conflictAmbient === "taiwan-tension") {
        void play("taiwan-strait-tension", { volumeScale: wtiVol });
        return;
      }
      if (conflictAmbient === "tension") {
        void play("dispute-tension-high", { volumeScale: wtiVol });
        return;
      }
      if (conflictAmbient === "carrier") {
        setAmbient("carrier-deck-ambient");
        return;
      }
      stopAmbient();
      return;
    }

    if (viewerMode === "economy") {
      if (economyAmbient === "pipeline") setAmbient("pipeline-hum");
      else if (economyAmbient === "datacenter") setAmbient("datacenter-hum");
      else if (economyAmbient === "port") setAmbient("port-ambient");
      else if (economyAmbient === "construction") setAmbient("construction-ambient");
      else stopAmbient();
      return;
    }

    stopAmbient();
  }, [
    cameraAltitude,
    canPlay,
    conflictAmbient,
    economyAmbient,
    frontlineLod,
    play,
    setAmbient,
    stopAmbient,
    viewerMode,
    wtiVol,
  ]);

  // 실제 교전 전장 — LOD 가중 풀
  // close(near+village): 쉼 없이 연속 · regional: ~20초 버스트 / 6초 쉼
  useEffect(() => {
    if (!canPlay || !primedRef.current) return;
    if (viewerMode !== "conflict" || !frontlineAmbient) return;

    let cancelled = false;
    let burstTimer: number | null = null;
    let windowTimer: number | null = null;
    const continuous = frontlineLod === "close";
    const WINDOW_MS = continuous ? Number.POSITIVE_INFINITY : 20_000;
    const PAUSE_MS = continuous ? 0 : 6_000;
    const pool = FRONTLINE_POOL_BY_LOD[frontlineLod];

    const fireOne = () => {
      const pick = pickWeighted(pool);
      if (pick === "frontline-fpv-drone") {
        playFrontlineFpvPass(play, frontlineLod, cameraAltitude);
        return;
      }
      const opts = frontlineOneshotOpts(pick, frontlineLod);
      void play(pick, {
        altitude: cameraAltitude,
        volumeScale: opts.volumeScale,
        force: true,
        overlap: true,
        durationMs: opts.durationMs,
      });
    };

    const runWindow = () => {
      if (cancelled) return;
      const windowEnd = continuous ? Number.POSITIVE_INFINITY : Date.now() + WINDOW_MS;

      const tick = () => {
        if (cancelled) return;
        if (!continuous && Date.now() >= windowEnd) {
          windowTimer = window.setTimeout(runWindow, PAUSE_MS);
          return;
        }
        fireOne();
        const delay = continuous
          ? 650 + Math.floor(Math.random() * 950)
          : 550 + Math.floor(Math.random() * 900);
        burstTimer = window.setTimeout(tick, delay);
      };

      fireOne();
      burstTimer = window.setTimeout(() => {
        if (cancelled) return;
        fireOne();
        tick();
      }, 450);
    };

    runWindow();

    return () => {
      cancelled = true;
      if (burstTimer != null) window.clearTimeout(burstTimer);
      if (windowTimer != null) window.clearTimeout(windowTimer);
    };
  }, [cameraAltitude, canPlay, frontlineAmbient, frontlineLod, play, viewerMode]);

  return null;
}
