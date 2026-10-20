/**
 * 전장별 사상자 마커 좌표·시드 (우크라는 Mediazona 라이브로 덮어씀).
 * 지정학 지구본 — 실제 교전 전선(ACTIVE_WAR)에만 사망/부상 오버레이.
 */

import {
  isActiveWarTheater,
  type CombatTheaterId,
} from "@/lib/theaterCombat";

export type TheaterCasualtySeed = {
  theaterId: CombatTheaterId;
  lat: number;
  lng: number;
  killed: number;
  wounded: number;
  asOf: string;
  sourceHintKo: string;
  sourceHintEn: string;
  woundedNoteKo?: string;
  woundedNoteEn?: string;
};

/** 우크라이나 전선(Donetsk 부근) — 줌아웃해도 이 좌표에 고정 */
export const UKRAINE_CASUALTY_MARKER = {
  lat: 48.52,
  lng: 37.85,
} as const;

/** 표시용 — 실제 교전 전장만 (긴장 구간 제외) */
export const THEATER_CASUALTY_SEEDS: TheaterCasualtySeed[] = [
  {
    theaterId: "russia-ukraine",
    ...UKRAINE_CASUALTY_MARKER,
    killed: 0,
    wounded: 0,
    asOf: "",
    sourceHintKo: "Mediazona × BBC · CSIS WIA est.",
    sourceHintEn: "Mediazona × BBC · CSIS WIA est.",
    woundedNoteKo: "부상은 특정 고정 추정치입니다. (명의 확인 목록 없음 · CSIS)",
    woundedNoteEn: "Wounded is a fixed estimate (no named list · CSIS).",
  },
  {
    theaterId: "middle-east",
    lat: 29.2,
    lng: 42.5,
    killed: 62_400,
    wounded: 148_000,
    asOf: "2026-06",
    sourceHintKo: "UN OCHA · ACLED regional est.",
    sourceHintEn: "UN OCHA · ACLED regional est.",
    woundedNoteKo: "부상은 공개 추정치입니다. (명의 확인 목록 없음)",
    woundedNoteEn: "Wounded is a public estimate (no named list).",
  },
];

/** 개전 전 긴장 구간 — 시드만 보관, 지도 오버레이에는 쓰지 않음 */
export const TENSION_CASUALTY_SEEDS: TheaterCasualtySeed[] = [
  {
    theaterId: "china-taiwan",
    lat: 24.2,
    lng: 119.2,
    killed: 0,
    wounded: 0,
    asOf: "2026-07",
    sourceHintKo: "긴장 구간 · 개전 전",
    sourceHintEn: "Tension theater · no active war",
    woundedNoteKo: "개전 전 긴장 구간 — 누적 교전 사상자 집계 없음",
    woundedNoteEn: "Pre-war tension zone — no cumulative combat casualty tally",
  },
  {
    theaterId: "korea",
    lat: 38.0,
    lng: 127.3,
    killed: 0,
    wounded: 0,
    asOf: "2026-07",
    sourceHintKo: "긴장 구간 · 개전 전",
    sourceHintEn: "Tension theater · no active war",
    woundedNoteKo: "개전 전 긴장 구간 — 누적 교전 사상자 집계 없음",
    woundedNoteEn: "Pre-war tension zone — no cumulative combat casualty tally",
  },
];

export function getTheaterCasualtySeed(theaterId: CombatTheaterId): TheaterCasualtySeed | undefined {
  return [...THEATER_CASUALTY_SEEDS, ...TENSION_CASUALTY_SEEDS].find((s) => s.theaterId === theaterId);
}

/** 실제 교전 전선만 — 사망·부상 오버레이 표시 대상 */
export function getActiveCasualtySeeds(): TheaterCasualtySeed[] {
  return THEATER_CASUALTY_SEEDS.filter((seed) => isActiveWarTheater(seed.theaterId));
}
