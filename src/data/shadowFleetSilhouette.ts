/**
 * 위장·다크플리트(불법 그림자 함대) — 컨테이너/화물선형 다각도 실루엣.
 * 군함 이지스 실루엣과 분리. 긴 갑판·후부(또는 중부) 함교·컨테이너 스택·녹슨 흘수선.
 *
 * 참고:
 *   /assets/reference/shadow-fleet-tanker-stern.png  — 풍화·녹슨 선미 3/4
 *   /assets/reference/shadow-fleet-liberty-bow.png   — 화물선 선수·마스트·적색 흘수선
 */

import type { SurfaceCombatantAspect } from "@/data/surfaceCombatantSilhouette";
import {
  SURFACE_COMBATANT_ASPECTS,
  surfaceCombatantAspectFromRelativeHeading,
  surfaceCombatantRelativeHeading,
} from "@/data/surfaceCombatantSilhouette";

export type ShadowFleetAspect = SurfaceCombatantAspect;

export {
  surfaceCombatantAspectFromRelativeHeading as shadowFleetAspectFromRelativeHeading,
  surfaceCombatantRelativeHeading as shadowFleetRelativeHeading,
  SURFACE_COMBATANT_ASPECTS as SHADOW_FLEET_ASPECTS,
};

export const SHADOW_FLEET_VIEWBOX = { width: 64, height: 64 } as const;

export const SHADOW_FLEET_MARKER_SIZE = { width: 54, height: 54 } as const;

export const SHADOW_FLEET_REFERENCE = {
  sternPath: "/assets/reference/shadow-fleet-tanker-stern.png",
  bowPath: "/assets/reference/shadow-fleet-liberty-bow.png",
  description:
    "Illegal shadow-fleet cargo/container silhouette — long deck, aft bridge, container stacks, rusty boot stripe",
  sourceNote: "User tanker stern + Liberty-ship bow references (2026)",
};

export type ShadowFleetRadome = { cx: number; cy: number; r: number };

export type ShadowFleetDrawing = {
  /** 본체 헐 (주 채움색 — 앰버/다크) */
  hull: string;
  /** 적색 흘수선·하부 */
  bootStripe?: string;
  /** 함교·마스트·크레인 */
  details: readonly string[];
  /** 컨테이너 스택 블록 */
  containers?: readonly string[];
  /** 밝은 함교·갑판 하이라이트 */
  highlights?: readonly string[];
  radomes?: readonly ShadowFleetRadome[];
  axis?: string;
};

/** N: 俯視 선수↑ — 긴 컨테이너 갑판 + 선미 함교 */
const TOP_N: ShadowFleetDrawing = {
  hull:
    "M 32,2 L 36.5,8 L 38.5,16 L 39.2,28 L 39.2,42 L 38.2,52 L 36.5,58 L 35.5,61 L 28.5,61 L 27.5,58 L 25.8,52 L 24.8,42 L 24.8,28 L 25.5,16 L 27.5,8 Z",
  bootStripe:
    "M 27.2,58.5 L 36.8,58.5 L 36.2,61 L 27.8,61 Z",
  details: [
    // 선수 앵커·페어리더
    "M 30.5,6 L 33.5,6 L 33.5,9 L 30.5,9 Z",
    // 전방 마스트
    "M 31.4,10 L 32.6,10 L 32.4,22 L 31.6,22 Z",
    "M 28.5,14 L 35.5,14 L 35.2,15.5 L 28.8,15.5 Z",
    // 중부 마스트
    "M 31.4,28 L 32.6,28 L 32.4,40 L 31.6,40 Z",
    "M 28.5,32 L 35.5,32 L 35.2,33.5 L 28.8,33.5 Z",
    // 선미 함교(블록)
    "M 27,44 L 37,44 L 37.5,48 L 36.5,56 L 27.5,56 L 26.5,48 Z",
    "M 28.5,45.5 L 35.5,45.5 L 35.2,49 L 28.8,49 Z",
    // 굴뚝
    "M 30.5,46 L 33.5,46 L 33.2,42.5 L 30.8,42.5 Z",
  ],
  containers: [
    // 전방 컨테이너 3열
    "M 27.5,11 L 31,11 L 31,17 L 27.5,17 Z",
    "M 31.5,11 L 36.5,11 L 36.5,17 L 31.5,17 Z",
    "M 27.5,17.5 L 31,17.5 L 31,23.5 L 27.5,23.5 Z",
    "M 31.5,17.5 L 36.5,17.5 L 36.5,23.5 L 31.5,23.5 Z",
    // 중부 컨테이너
    "M 27.5,24.5 L 31,24.5 L 31,30.5 L 27.5,30.5 Z",
    "M 31.5,24.5 L 36.5,24.5 L 36.5,30.5 L 31.5,30.5 Z",
    "M 27.5,31 L 31,31 L 31,37 L 27.5,37 Z",
    "M 31.5,31 L 36.5,31 L 36.5,37 L 31.5,37 Z",
    // 후방(함교 앞)
    "M 27.5,37.5 L 31,37.5 L 31,42.5 L 27.5,42.5 Z",
    "M 31.5,37.5 L 36.5,37.5 L 36.5,42.5 L 31.5,42.5 Z",
  ],
  highlights: [
    "M 28.8,46 L 35.2,46 L 35,48.5 L 29,48.5 Z",
  ],
  radomes: [
    { cx: 32, cy: 43.5, r: 1.1 },
    { cx: 32, cy: 50.5, r: 0.85 },
  ],
  axis: "M 32,4 L 32,59",
};

const TOP_S: ShadowFleetDrawing = {
  hull:
    "M 32,62 L 36.5,56 L 38.5,48 L 39.2,36 L 39.2,22 L 38.2,12 L 36.5,6 L 35.5,3 L 28.5,3 L 27.5,6 L 25.8,12 L 24.8,22 L 24.8,36 L 25.5,48 L 27.5,56 Z",
  bootStripe: "M 27.2,3 L 36.8,3 L 36.2,5.5 L 27.8,5.5 Z",
  details: [
    "M 27,8 L 37,8 L 37.5,12 L 36.5,20 L 27.5,20 L 26.5,12 Z",
    "M 28.5,9.5 L 35.5,9.5 L 35.2,13 L 28.8,13 Z",
    "M 30.5,18 L 33.5,18 L 33.2,21.5 L 30.8,21.5 Z",
    "M 31.4,24 L 32.6,24 L 32.4,36 L 31.6,36 Z",
    "M 28.5,28 L 35.5,28 L 35.2,29.5 L 28.8,29.5 Z",
    "M 31.4,42 L 32.6,42 L 32.4,54 L 31.6,54 Z",
    "M 28.5,48 L 35.5,48 L 35.2,49.5 L 28.8,49.5 Z",
    "M 30.5,55 L 33.5,55 L 33.5,58 L 30.5,58 Z",
  ],
  containers: [
    "M 27.5,21.5 L 31,21.5 L 31,27.5 L 27.5,27.5 Z",
    "M 31.5,21.5 L 36.5,21.5 L 36.5,27.5 L 31.5,27.5 Z",
    "M 27.5,28 L 31,28 L 31,34 L 27.5,34 Z",
    "M 31.5,28 L 36.5,28 L 36.5,34 L 31.5,34 Z",
    "M 27.5,34.5 L 31,34.5 L 31,40.5 L 27.5,40.5 Z",
    "M 31.5,34.5 L 36.5,34.5 L 36.5,40.5 L 31.5,40.5 Z",
    "M 27.5,41 L 31,41 L 31,47 L 27.5,47 Z",
    "M 31.5,41 L 36.5,41 L 36.5,47 L 31.5,47 Z",
    "M 27.5,47.5 L 31,47.5 L 31,53.5 L 27.5,53.5 Z",
    "M 31.5,47.5 L 36.5,47.5 L 36.5,53.5 L 31.5,53.5 Z",
  ],
  highlights: ["M 28.8,10 L 35.2,10 L 35,12.5 L 29,12.5 Z"],
  radomes: [
    { cx: 32, cy: 13.5, r: 1.1 },
    { cx: 32, cy: 20.5, r: 0.85 },
  ],
  axis: "M 32,5 L 32,60",
};

/** E: 옆모습 선수→ — 높은 선수·긴 갑판·선미 함교·적색 흘수선 */
const SIDE_E: ShadowFleetDrawing = {
  hull:
    "M 2,46 L 5,40 L 10,35 L 16,32 L 24,30.5 L 36,30 L 48,30.2 L 56,31.5 L 60,34 L 61.5,39 L 61,46 L 56,48.5 L 40,49 L 22,48.5 L 10,47.5 L 4,47 L 2,46.5 Z",
  bootStripe:
    "M 3,45.5 L 60.5,45.5 L 60.5,48.2 L 4,48 Z",
  details: [
    // 선수
    "M 8,32 L 14,30.8 L 14,36 L 9,37 Z",
    // 전방 마스트+붐
    "M 20,30.5 L 21.5,30.5 L 21.2,14 L 20.3,14 Z",
    "M 15,20 L 27,22 L 26.5,23.5 L 15.5,21.5 Z",
    "M 21,18 L 28,16 L 28.3,17.5 L 21.3,19.5 Z",
    // 중부 마스트
    "M 34,30.2 L 35.5,30.2 L 35.2,15 L 34.3,15 Z",
    "M 29,21 L 41,23 L 40.5,24.5 L 29.5,22.5 Z",
    // 선미 함교
    "M 48,30.5 L 58,31.5 L 58.5,36 L 57,42 L 48.5,41.5 L 47.5,35 Z",
    "M 49.5,32 L 56.5,32.8 L 56.2,36.5 L 49.8,35.8 Z",
    // 굴뚝
    "M 52,24 L 55.5,24.5 L 55.2,31 L 52.2,30.5 Z",
    "M 52.5,22.5 L 55,23 L 54.8,24.5 L 52.7,24 Z",
  ],
  containers: [
    "M 16,26 L 22,25.5 L 22.5,30.2 L 16.5,30.5 Z",
    "M 23,25.2 L 29,25 L 29.5,30 L 23.5,30.2 Z",
    "M 30,24.8 L 36,24.8 L 36.5,30 L 30.5,30 Z",
    "M 37,25 L 43,25.2 L 43.5,30.2 L 37.5,30 Z",
    "M 16.5,22 L 22,21.5 L 22.3,25.5 L 16.8,26 Z",
    "M 23.5,21.2 L 29,21 L 29.3,25 L 23.8,25.2 Z",
    "M 30.5,21 L 36,21 L 36.3,24.8 L 30.8,24.8 Z",
  ],
  highlights: [
    "M 50,32.5 L 56,33.2 L 55.8,35.5 L 50.2,34.8 Z",
  ],
  radomes: [
    { cx: 53.5, cy: 26.5, r: 1.0 },
    { cx: 51, cy: 29.2, r: 0.7 },
  ],
  axis: "M 5,43 L 59,43",
};

const SIDE_W: ShadowFleetDrawing = {
  hull:
    "M 62,46 L 59,40 L 54,35 L 48,32 L 40,30.5 L 28,30 L 16,30.2 L 8,31.5 L 4,34 L 2.5,39 L 3,46 L 8,48.5 L 24,49 L 42,48.5 L 54,47.5 L 60,47 L 62,46.5 Z",
  bootStripe: "M 61,45.5 L 3.5,45.5 L 3.5,48.2 L 60,48 Z",
  details: [
    "M 56,32 L 50,30.8 L 50,36 L 55,37 Z",
    "M 44,30.5 L 42.5,30.5 L 42.8,14 L 43.7,14 Z",
    "M 49,20 L 37,22 L 37.5,23.5 L 48.5,21.5 Z",
    "M 43,18 L 36,16 L 35.7,17.5 L 42.7,19.5 Z",
    "M 30,30.2 L 28.5,30.2 L 28.8,15 L 29.7,15 Z",
    "M 35,21 L 23,23 L 23.5,24.5 L 34.5,22.5 Z",
    "M 16,30.5 L 6,31.5 L 5.5,36 L 7,42 L 15.5,41.5 L 16.5,35 Z",
    "M 14.5,32 L 7.5,32.8 L 7.8,36.5 L 14.2,35.8 Z",
    "M 12,24 L 8.5,24.5 L 8.8,31 L 11.8,30.5 Z",
    "M 11.5,22.5 L 9,23 L 9.2,24.5 L 11.3,24 Z",
  ],
  containers: [
    "M 48,26 L 42,25.5 L 41.5,30.2 L 47.5,30.5 Z",
    "M 41,25.2 L 35,25 L 34.5,30 L 40.5,30.2 Z",
    "M 34,24.8 L 28,24.8 L 27.5,30 L 33.5,30 Z",
    "M 27,25 L 21,25.2 L 20.5,30.2 L 26.5,30 Z",
    "M 47.5,22 L 42,21.5 L 41.7,25.5 L 47.2,26 Z",
    "M 40.5,21.2 L 35,21 L 34.7,25 L 40.2,25.2 Z",
    "M 33.5,21 L 28,21 L 27.7,24.8 L 33.2,24.8 Z",
  ],
  highlights: ["M 14,32.5 L 8,33.2 L 8.2,35.5 L 13.8,34.8 Z"],
  radomes: [
    { cx: 10.5, cy: 26.5, r: 1.0 },
    { cx: 13, cy: 29.2, r: 0.7 },
  ],
  axis: "M 59,43 L 5,43",
};

const QUARTER_NE: ShadowFleetDrawing = {
  hull:
    "M 42,5 L 50,12 L 53,24 L 51,38 L 46,50 L 38,57 L 28,58 L 18,52 L 14,40 L 15,26 L 20,14 L 30,7 Z",
  bootStripe: "M 20,54 L 44,56 L 42,58.5 L 22,56.5 Z",
  details: [
    "M 34,12 L 38,10 L 40,16 L 35,18 Z",
    "M 32,14 L 33.5,14 L 34,28 L 32.5,28 Z",
    "M 28,20 L 40,24 L 39,26 L 28,22 Z",
    "M 26,36 L 42,42 L 40,52 L 26,46 Z",
    "M 30,38 L 38,41 L 37.5,45 L 30.5,42 Z",
  ],
  containers: [
    "M 26,18 L 34,20 L 33,28 L 25.5,26 Z",
    "M 34.5,21 L 42,23.5 L 41,31 L 33.5,28.5 Z",
    "M 25,27 L 33,29.5 L 32,36 L 24.5,33.5 Z",
    "M 33.5,30 L 41,32.5 L 40,39 L 32.5,36.5 Z",
  ],
  highlights: ["M 31,39 L 37,41.5 L 36.5,43.5 L 31,41 Z"],
  radomes: [{ cx: 34, cy: 40, r: 1.1 }],
};

const QUARTER_NW: ShadowFleetDrawing = {
  hull:
    "M 22,5 L 14,12 L 11,24 L 13,38 L 18,50 L 26,57 L 36,58 L 46,52 L 50,40 L 49,26 L 44,14 L 34,7 Z",
  bootStripe: "M 44,54 L 20,56 L 22,58.5 L 42,56.5 Z",
  details: [
    "M 30,12 L 26,10 L 24,16 L 29,18 Z",
    "M 32,14 L 30.5,14 L 30,28 L 31.5,28 Z",
    "M 36,20 L 24,24 L 25,26 L 36,22 Z",
    "M 38,36 L 22,42 L 24,52 L 38,46 Z",
    "M 34,38 L 26,41 L 26.5,45 L 33.5,42 Z",
  ],
  containers: [
    "M 38,18 L 30,20 L 31,28 L 38.5,26 Z",
    "M 29.5,21 L 22,23.5 L 23,31 L 30.5,28.5 Z",
    "M 39,27 L 31,29.5 L 32,36 L 39.5,33.5 Z",
    "M 30.5,30 L 23,32.5 L 24,39 L 31.5,36.5 Z",
  ],
  highlights: ["M 33,39 L 27,41.5 L 27.5,43.5 L 33,41 Z"],
  radomes: [{ cx: 30, cy: 40, r: 1.1 }],
};

const QUARTER_SE: ShadowFleetDrawing = {
  hull:
    "M 42,59 L 50,52 L 53,40 L 51,26 L 46,14 L 38,7 L 28,6 L 18,12 L 14,24 L 15,38 L 20,50 L 30,57 Z",
  bootStripe: "M 20,8 L 44,6 L 42,8.5 L 22,10.5 Z",
  details: [
    "M 26,12 L 42,8 L 44,16 L 28,20 Z",
    "M 28,20 L 44,24 L 42,34 L 27,30 Z",
    "M 32,36 L 34,36 L 34.5,48 L 32,48 Z",
    "M 28,48 L 40,52 L 38,56 L 28,52 Z",
  ],
  containers: [
    "M 26,22 L 34,24 L 33,32 L 25.5,30 Z",
    "M 34.5,25 L 42,27 L 41,35 L 33.5,33 Z",
    "M 25.5,31 L 33.5,33 L 32.5,41 L 25,39 Z",
  ],
  highlights: ["M 30,14 L 40,11 L 40.5,14 L 30.5,16.5 Z"],
  radomes: [{ cx: 33, cy: 28, r: 1.0 }],
};

const QUARTER_SW: ShadowFleetDrawing = {
  hull:
    "M 22,59 L 14,52 L 11,40 L 13,26 L 18,14 L 26,7 L 36,6 L 46,12 L 50,24 L 49,38 L 44,50 L 34,57 Z",
  bootStripe: "M 44,8 L 20,6 L 22,8.5 L 42,10.5 Z",
  details: [
    "M 38,12 L 22,8 L 20,16 L 36,20 Z",
    "M 36,20 L 20,24 L 22,34 L 37,30 Z",
    "M 32,36 L 30,36 L 29.5,48 L 32,48 Z",
    "M 36,48 L 24,52 L 26,56 L 36,52 Z",
  ],
  containers: [
    "M 38,22 L 30,24 L 31,32 L 38.5,30 Z",
    "M 29.5,25 L 22,27 L 23,35 L 30.5,33 Z",
    "M 38.5,31 L 30.5,33 L 31.5,41 L 39,39 Z",
  ],
  highlights: ["M 34,14 L 24,11 L 23.5,14 L 33.5,16.5 Z"],
  radomes: [{ cx: 31, cy: 28, r: 1.0 }],
};

export const SHADOW_FLEET_ASPECT_DRAWINGS: Record<ShadowFleetAspect, ShadowFleetDrawing> = {
  n: TOP_N,
  ne: QUARTER_NE,
  e: SIDE_E,
  se: QUARTER_SE,
  s: TOP_S,
  sw: QUARTER_SW,
  w: SIDE_W,
  nw: QUARTER_NW,
};
