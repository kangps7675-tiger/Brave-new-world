"use client";

import { useEffect, useRef } from "react";
import {
  AUDIO_MANIFEST,
  type AudioEventId,
} from "@/data/audioManifest";
import type { GlobeLodTier } from "@/lib/globeLod";
import { useSoundStream, type PlaySoundOptions } from "@/hooks/useSoundStream";
import { gtiAmbientVolumeScale } from "@/lib/gti";
import {
  CV_LAYER_SOUND_EVENT,
  emitLayerClickSounds,
  type LayerSoundDetail,
} from "@/lib/infraClickSounds";
import {
  isBreakingMorseSuppressing,
  markBreakingMorsePlayed,
  type TickerTelegraphDirection,
} from "@/lib/tickerSpikeTelegraph";

/** 공습경보·A급 속보 타전·양피지 UI 버스 — 티커/일반 UI 클릭음은 차단 */
export const CV_SOUND_EVENT = "cv-sound";

/** 버스 허용 이벤트 */
const DASHBOARD_BUS_EVENT_IDS = new Set<AudioEventId>([
  "tzeva-red-alert",
  "tzeva-all-clear",
  "neptun-air-alert",
  "nato-perimeter-klaxon",
  "hero-breaking",
  "breaking-dark-bed",
  "parchment-unfold",
  "parchment-fold",
  "parchment-flyaway",
  "oil-spike",
  "ticker-telegraph-up",
  "ticker-telegraph-down",
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

/** 유가 SPIKE (CL=F / BZ=F) — 레거시; 티커 SPIKE는 emitTickerTelegraphSound */
export function emitOilSpikeSound() {
  emitDashboardSound("oil-spike", {
    force: true,
    volumeScale: 0.95,
    durationMs: 4200,
  });
}

/** Databento 선물 SPIKE 전보 — 속보 모스 직후면 스킵 */
export function emitTickerTelegraphSound(direction: TickerTelegraphDirection): boolean {
  if (isBreakingMorseSuppressing()) return false;
  if (direction === "up") {
    emitDashboardSound("ticker-telegraph-up", {
      force: true,
      volumeScale: 0.7,
      durationMs: 1800,
    });
  } else {
    emitDashboardSound("ticker-telegraph-down", {
      force: true,
      volumeScale: 0.85,
      durationMs: 3200,
    });
  }
  return true;
}

/** A급 속보·등불/양피지 경보 — 모스 타전 (+ 선택적 깔개) */
export type BreakingDispatchBed = "dark" | "cheer" | "morse";

export function emitBreakingDispatchSound(opts?: {
  /** dark=지정학 등불 · cheer=지경학 등불 · morse=깔개 없이 모스만 (중립·애매) */
  bed?: BreakingDispatchBed;
}) {
  const bed = opts?.bed ?? "dark";
  const cues: Array<{
    eventId: "economy-lamp-cheer" | "breaking-dark-bed" | "hero-breaking";
    volumeScale: number;
    durationMs: number;
  }> = [];

  if (bed === "cheer") {
    cues.push({
      eventId: "economy-lamp-cheer",
      volumeScale: 0.9,
      /** 원본 ~32s — 앞부분 환호만 */
      durationMs: 7200,
    });
  } else if (bed === "dark") {
    cues.push({
      eventId: "breaking-dark-bed",
      volumeScale: 1.85,
      durationMs: 10_000,
    });
  }
  // morse: 깔개 없음 — 모스만

  cues.push({
    eventId: "hero-breaking",
    volumeScale: 0.95,
    durationMs: 12_000,
  });

  markBreakingMorsePlayed();
  emitLayerClickSounds(cues);
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

/** regional = 멀리(포격 위주+총성) · close = near+village (총성+포격 밀집) */
type FrontlineSoundLod = "regional" | "close";

type WeightedPick = {
  id: AudioEventId;
  weight: number;
};

/** LOD별 원샷 가중치 풀 — regional부터 포격·총성 모두 가동 */
const FRONTLINE_POOL_BY_LOD: Record<FrontlineSoundLod, WeightedPick[]> = {
  /** regional(전선 LOD 진입점) — 포격 중심 + 총성 상시 */
  regional: [
    { id: "frontline-artillery-shot", weight: 7 },
    { id: "neptun-impact", weight: 4 },
    { id: "frontline-bombing", weight: 3 },
    { id: "frontline-mlrs", weight: 2 },
    { id: "frontline-gunfire", weight: 3 },
    { id: "frontline-gunfire-distant-auto", weight: 3 },
    { id: "frontline-fpv-drone", weight: 1 },
  ],
  /**
   * 가까이(near·village) — 총성 더 밀집 + 포격 병행.
   */
  close: [
    { id: "frontline-gunfire", weight: 6 },
    { id: "frontline-gunfire-distant-auto", weight: 5 },
    { id: "frontline-artillery-shot", weight: 5 },
    { id: "frontline-bombing", weight: 3 },
    { id: "frontline-mlrs", weight: 2 },
    { id: "neptun-impact", weight: 2 },
    { id: "frontline-fpv-drone", weight: 2 },
  ],
};

const GUNFIRE_IDS = new Set<AudioEventId>([
  "frontline-gunfire",
  "frontline-gunfire-distant-auto",
]);

/** 전역·대륙 궤도 — 먼 천둥만 (비/바람 베드 제외 · 3종 로테이션) */
const GLOBAL_THUNDER_POOL: readonly AudioEventId[] = [
  "global-thunder-a",
  "global-thunder-b",
  "global-thunder-c",
] as const;

function pickGlobalThunder(exclude: AudioEventId | null): AudioEventId {
  const pool =
    exclude == null
      ? GLOBAL_THUNDER_POOL
      : GLOBAL_THUNDER_POOL.filter((id) => id !== exclude);
  return pool[Math.floor(Math.random() * pool.length)] ?? GLOBAL_THUNDER_POOL[0];
}

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
    lod === "close" ? randBetween(1.05, 1.25) : randBetween(0.75, 0.95);
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

/** 원샷별 LOD 볼륨·컷 길이 — regional 진입점부터 크게 */
function frontlineOneshotOpts(
  id: AudioEventId,
  lod: FrontlineSoundLod,
): { volumeScale: number; durationMs?: number } {
  if (lod === "regional" && id === "neptun-impact") {
    return {
      volumeScale: randBetween(1.15, 1.45),
      durationMs: Math.round(randBetween(2800, 3800)),
    };
  }
  if (id === "neptun-impact") {
    return { volumeScale: randBetween(1.2, 1.5), durationMs: 4500 };
  }
  if (GUNFIRE_IDS.has(id)) {
    return {
      volumeScale:
        lod === "close" ? randBetween(1.35, 1.55) : randBetween(1.2, 1.4),
      durationMs: id === "frontline-gunfire" ? 4800 : 3800,
    };
  }
  if (id === "frontline-artillery-shot") {
    return {
      volumeScale:
        lod === "close" ? randBetween(1.35, 1.55) : randBetween(1.3, 1.5),
      durationMs: lod === "regional" ? 4800 : 5200,
    };
  }
  if (id === "frontline-bombing") {
    return { volumeScale: randBetween(1.2, 1.4), durationMs: 4500 };
  }
  if (id === "frontline-mlrs") {
    return { volumeScale: 1.45, durationMs: 5200 };
  }
  return { volumeScale: 1.25 };
}

/** 전선 베드 — regional부터 크게, close에서도 포격 rumble 유지 */
function frontlineBedVolumeScale(lod: FrontlineSoundLod): number {
  if (lod === "regional") return 1.65;
  return 1.15;
}

export type EconomyAmbientKind =
  | "port"
  | "lng"
  | "construction"
  | "datacenter"
  | "pipeline"
  | null;
/** 항모는 클릭 전용 — 패스오버 앰비언트에서 제외 */
export type ConflictAmbientKind = "global" | "frontline" | "taiwan-tension" | "tension" | null;

type SoundEffectsBridgeProps = {
  viewerMode?: "conflict" | "economy";
  /** 뷰포트 안 NEPTUN 탄착이 있으면 true — 진입 시 폭발음 */
  neptunImpactInView?: boolean;
  /** 뷰포트 안 FIRMS 전투(폭격 추정) 화재가 있으면 true */
  firmsCombatInView?: boolean;
  /**
   * 지정학 앰비언스 우선순위: frontline > taiwan-tension > tension > global
   * (전선 교전음 윈도우는 frontline일 때만 · 항모는 클릭 · global=전역/대륙 LOD)
   */
  conflictAmbient?: ConflictAmbientKind;
  /** 경제 허브/항만/파이프 등 해당 레이어 */
  economyAmbient?: EconomyAmbientKind;
  /** ReefWatch 근접 항적이 화면에 보이면 — 미세 자동음 */
  reefWatchTrafficVisible?: boolean;
  cameraAltitude?: number;
  /** 전선 원샷 풀·베드 볼륨 LOD */
  globeLodTier?: GlobeLodTier;
  /**
   * 오늘의 GTI (0–100). 긴장·대만해협 앰비언트 음량에 매핑.
   * 음원 없는 dashboard-bgm 도 나중에 같은 곡선(wtiBgmVolumeScale) 사용.
   */
  wtiScore?: number | null;
};

/**
 * 사운드 규칙
 * - 공습경보: 칩/버튼 fly 시에만 (emitDashboardSound)
 * - 인프라·이동체: 클릭 시 (emitLayerClickSounds)
 * - 전장/긴장/경제 레이어: 카메라가 해당 지역·레이어 위에 있을 때 자동
 * - ReefWatch 항적: 화면에 보이면 미세 자동
 * - 전선: LOD별 원샷 풀
 * - 긴장 앰비언트: GTI 숫자가 강도
 */
export function SoundEffectsBridge({
  viewerMode,
  neptunImpactInView = false,
  firmsCombatInView = false,
  conflictAmbient = null,
  economyAmbient = null,
  reefWatchTrafficVisible = false,
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
  const wtiVol = gtiAmbientVolumeScale(wtiScore);

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

  // 공습경보 · A급 속보 타전 · ticker-telegraph / oil-spike
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

  // 인프라·이동체 레이어 클릭 (겹침 허용)
  useEffect(() => {
    const onLayer = (event: Event) => {
      const detail = (event as CustomEvent<LayerSoundDetail>).detail;
      const cues = detail?.cues;
      if (!cues?.length) return;
      for (const cue of cues) {
        if (!(cue.eventId in AUDIO_MANIFEST)) continue;
        void play(cue.eventId, {
          altitude: detail.altitude ?? cameraAltitude,
          volumeScale: cue.volumeScale ?? detail.volumeScale ?? 1,
          durationMs: cue.durationMs ?? detail.durationMs,
          force: true,
          overlap: true,
        });
      }
    };
    window.addEventListener(CV_LAYER_SOUND_EVENT, onLayer);
    return () => window.removeEventListener(CV_LAYER_SOUND_EVENT, onLayer);
  }, [cameraAltitude, play]);

  // ReefWatch 근접 항적 — 화면 보일 때 아주 미세한 민간기 패스 (클릭 없음)
  useEffect(() => {
    if (!canPlay || !primedRef.current || !reefWatchTrafficVisible) return;
    let cancelled = false;
    let timer: number | null = null;
    const tick = () => {
      if (cancelled) return;
      void play("aircraft-civil-pass", {
        altitude: cameraAltitude,
        volumeScale: 0.09,
        force: true,
        overlap: true,
        durationMs: 2800,
      });
      timer = window.setTimeout(tick, 11_000 + Math.floor(Math.random() * 9_000));
    };
    timer = window.setTimeout(tick, 2_500 + Math.floor(Math.random() * 2_000));
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [cameraAltitude, canPlay, play, reefWatchTrafficVisible]);

  // 전역·대륙 궤도 — 먼 천둥 원샷만 불규칙·겹침 (전장/긴장 앰비언트와 분리)
  useEffect(() => {
    if (!canPlay || !primedRef.current) return;
    const orbitFar =
      globeLodTier === "global" || globeLodTier === "continent";
    if (!orbitFar) return;
    // 줌인해 전장·긴장 구역이면 천둥 중단
    if (conflictAmbient != null) return;

    let cancelled = false;
    let timer: number | null = null;
    let echoTimer: number | null = null;
    let lastId: AudioEventId | null = null;

    const fireOne = (id: AudioEventId, volumeScale: number) => {
      void play(id, {
        altitude: cameraAltitude,
        volumeScale,
        force: true,
        overlap: true,
        durationMs: 6_500 + Math.floor(Math.random() * 2_500),
      });
    };

    const schedule = (delayMs: number) => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const id = pickGlobalThunder(lastId);
        lastId = id;
        // 멀리서 듣는 수준 — 가끔 조금 더 크게
        const vol = 0.72 + Math.random() * 0.45;
        fireOne(id, vol);

        // ~25% 확률로 짧은 간격 두 번째 천둥 겹침 (다른 클립)
        if (Math.random() < 0.28) {
          const echo = pickGlobalThunder(id);
          echoTimer = window.setTimeout(() => {
            if (cancelled) return;
            fireOne(echo, 0.45 + Math.random() * 0.35);
          }, 900 + Math.floor(Math.random() * 2_200));
        }

        // 다음 천둥까지 불규칙 간격 (8~28초)
        schedule(8_000 + Math.floor(Math.random() * 20_000));
      }, delayMs);
    };

    // 첫 천둥은 입장 직후 살짝 늦게
    schedule(3_500 + Math.floor(Math.random() * 4_500));

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
      if (echoTimer != null) window.clearTimeout(echoTimer);
    };
  }, [cameraAltitude, canPlay, conflictAmbient, globeLodTier, play]);

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
      if (conflictAmbient === "global") {
        setAmbient("globe-global-thunder");
        return;
      }
      stopAmbient();
      return;
    }

    if (viewerMode === "economy") {
      if (economyAmbient === "pipeline") setAmbient("pipeline-hum");
      else if (economyAmbient === "datacenter") setAmbient("datacenter-hum");
      else if (economyAmbient === "port") setAmbient("port-ambient");
      else if (economyAmbient === "lng") {
        // LNG만 ON — 간접음 미세
        void play("port-ambient", { volumeScale: 0.38 });
      } else if (economyAmbient === "construction") setAmbient("construction-ambient");
      else if (globeLodTier === "global" || globeLodTier === "continent") {
        // 허브 레이어 앰비언트 없을 때 전역·대륙 LOD 뇌우
        setAmbient("globe-global-thunder");
      } else stopAmbient();
      return;
    }

    stopAmbient();
  }, [
    cameraAltitude,
    canPlay,
    conflictAmbient,
    economyAmbient,
    frontlineLod,
    globeLodTier,
    play,
    setAmbient,
    stopAmbient,
    viewerMode,
    wtiVol,
  ]);

  // 실제 교전 전장 — LOD 가중 풀
  // regional(전선 LOD 진입)부터 연속·고빈도 · close는 더 촘촘
  useEffect(() => {
    if (!canPlay || !primedRef.current) return;
    if (viewerMode !== "conflict" || !frontlineAmbient) return;

    let cancelled = false;
    let burstTimer: number | null = null;
    const pool = FRONTLINE_POOL_BY_LOD[frontlineLod];
    /** regional도 쉼 없이 — close만 간격 더 짧게 */
    const delayMin = frontlineLod === "close" ? 220 : 320;
    const delaySpan = frontlineLod === "close" ? 480 : 620;

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

    const tick = () => {
      if (cancelled) return;
      fireOne();
      // ~35% 확률로 즉시 한 발 더 겹침 (포격/총성 밀집감)
      if (Math.random() < 0.35) {
        burstTimer = window.setTimeout(() => {
          if (cancelled) return;
          fireOne();
          burstTimer = window.setTimeout(
            tick,
            delayMin + Math.floor(Math.random() * delaySpan),
          );
        }, 90 + Math.floor(Math.random() * 180));
        return;
      }
      burstTimer = window.setTimeout(
        tick,
        delayMin + Math.floor(Math.random() * delaySpan),
      );
    };

    // 진입 직후 2연타로 체감
    fireOne();
    burstTimer = window.setTimeout(() => {
      if (cancelled) return;
      fireOne();
      tick();
    }, 280);

    return () => {
      cancelled = true;
      if (burstTimer != null) window.clearTimeout(burstTimer);
    };
  }, [cameraAltitude, canPlay, frontlineAmbient, frontlineLod, play, viewerMode]);

  return null;
}
