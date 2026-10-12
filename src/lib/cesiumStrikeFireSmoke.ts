/**
 * 관측(Cesium) — 확인된 타격 지점의 화염·연기 파티클.
 * 좌표 중심에서 불기둥이 솟고 검은 연기 기둥이 바람에 기울며 올라간다.
 *
 * - 파티클 크기는 미터 단위(sizeInMeters) — 줌인하면 실제 규모로 커 보인다.
 * - 발생 시각으로 단계가 갈린다: blaze(불+연기) → smolder(연기만) → none(핀만).
 * - 카메라가 높으면 숨기고 렌더 hold도 푼다 (requestRenderMode 유지).
 */

import {
  holdObserveRender,
  releaseObserveRender,
} from "@/lib/cesiumObserveRenderGovernor";
import type { LiveuaStrikeKind } from "@/lib/liveuamap/confirmedStrike";

type CesiumNS = typeof import("cesium");

export type StrikeFxPoint = {
  id: string;
  lat: number;
  lng: number;
  kind: LiveuaStrikeKind;
  /** ISO — 없으면 smolder로 취급 */
  publishedAt?: string;
};

export type StrikeBurnPhase = "blaze" | "smolder" | "none";

/** 이 안쪽은 불길이 살아 있다 */
export const STRIKE_BLAZE_MS = 3 * 60 * 60 * 1000;
/** 이 안쪽은 연기만 남는다. 넘으면 핀만 */
export const STRIKE_SMOLDER_MS = 12 * 60 * 60 * 1000;
/** 동시에 태우는 지점 상한 — 최신순 */
export const STRIKE_FX_MAX = 16;
/** 카메라 고도가 이보다 높으면 파티클을 끈다 (m) */
export const STRIKE_FX_MAX_CAMERA_HEIGHT_M = 600_000;

const RENDER_HOLD_ID = "strike-fire-smoke";

export function strikeBurnPhase(
  publishedAt: string | undefined,
  nowMs = Date.now(),
): StrikeBurnPhase {
  const at = publishedAt ? Date.parse(publishedAt) : NaN;
  if (!Number.isFinite(at)) return "smolder";
  const age = nowMs - at;
  if (age < 0 || age <= STRIKE_BLAZE_MS) return "blaze";
  if (age <= STRIKE_SMOLDER_MS) return "smolder";
  return "none";
}

/** 폭발 규모 배율 — 미사일·유도폭탄이 드론보다 크다 */
export function strikeFxScale(kind: LiveuaStrikeKind): number {
  if (kind === "bomb") return 1.25;
  if (kind === "missile") return 1.0;
  return 0.7;
}

/** 최신순으로 상한만큼, 불이 꺼진 건 뺀다 */
export function pickStrikeFxPoints(
  strikes: StrikeFxPoint[],
  nowMs = Date.now(),
): Array<StrikeFxPoint & { phase: Exclude<StrikeBurnPhase, "none"> }> {
  const out: Array<StrikeFxPoint & { phase: Exclude<StrikeBurnPhase, "none"> }> = [];
  const sorted = [...strikes].sort((a, b) => {
    const ta = Date.parse(a.publishedAt ?? "");
    const tb = Date.parse(b.publishedAt ?? "");
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
  for (const s of sorted) {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
    const phase = strikeBurnPhase(s.publishedAt, nowMs);
    if (phase === "none") continue;
    out.push({ ...s, phase });
    if (out.length >= STRIKE_FX_MAX) break;
  }
  return out;
}

// ── 스프라이트 (캔버스 생성, 에셋 불필요) ────────────────────────────────

let fireSprite: HTMLCanvasElement | null = null;
let smokeSprite: HTMLCanvasElement | null = null;

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  return [canvas, ctx];
}

function getFireSprite(): HTMLCanvasElement {
  if (fireSprite) return fireSprite;
  const [canvas, ctx] = makeCanvas(128);
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, "rgba(255,250,215,1)");
  g.addColorStop(0.22, "rgba(255,200,90,0.95)");
  g.addColorStop(0.55, "rgba(245,110,25,0.6)");
  g.addColorStop(1, "rgba(160,30,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  fireSprite = canvas;
  return canvas;
}

function getSmokeSprite(): HTMLCanvasElement {
  if (smokeSprite) return smokeSprite;
  const [canvas, ctx] = makeCanvas(128);
  // 겹친 연무 덩어리 — 완전한 원이 아니라 몽실한 윤곽
  const blobs: Array<[number, number, number, number]> = [
    [64, 64, 52, 0.55],
    [44, 56, 34, 0.45],
    [84, 50, 32, 0.42],
    [58, 82, 30, 0.4],
    [86, 80, 26, 0.36],
  ];
  for (const [x, y, r, a] of blobs) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.6, `rgba(255,255,255,${a * 0.45})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  smokeSprite = canvas;
  return canvas;
}

// ── 효과 관리 ──────────────────────────────────────────────────────────

type Effect = {
  key: string;
  systems: import("cesium").ParticleSystem[];
};

const effectsByViewer = new WeakMap<import("cesium").Viewer, Map<string, Effect>>();

function effectsOf(viewer: import("cesium").Viewer): Map<string, Effect> {
  let map = effectsByViewer.get(viewer);
  if (!map) {
    map = new Map();
    effectsByViewer.set(viewer, map);
  }
  return map;
}

function removeEffect(viewer: import("cesium").Viewer, effect: Effect): void {
  for (const sys of effect.systems) {
    try {
      if (!viewer.isDestroyed()) viewer.scene.primitives.remove(sys);
      else if (!sys.isDestroyed()) sys.destroy();
    } catch {
      /* already gone */
    }
  }
}

function buildSystems(
  Cesium: CesiumNS,
  point: StrikeFxPoint,
  phase: Exclude<StrikeBurnPhase, "none">,
  modelMatrix: import("cesium").Matrix4,
): import("cesium").ParticleSystem[] {
  const k = strikeFxScale(point.kind);
  const blaze = phase === "blaze";
  const systems: import("cesium").ParticleSystem[] = [];

  // ENU 국소 바람(동쪽으로 조금, 위로 부력) → 월드 벡터
  const windLocal = new Cesium.Cartesian3(2.2, 0.6, 1.4);
  const windWorld = Cesium.Matrix4.multiplyByPointAsVector(
    modelMatrix,
    windLocal,
    new Cesium.Cartesian3(),
  );
  const scratch = new Cesium.Cartesian3();

  if (blaze) {
    systems.push(
      new Cesium.ParticleSystem({
        image: getFireSprite(),
        startColor: Cesium.Color.fromBytes(255, 226, 140, 235),
        endColor: Cesium.Color.fromBytes(205, 38, 6, 0),
        startScale: 0.8,
        endScale: 2.1,
        minimumParticleLife: 0.9,
        maximumParticleLife: 2.6,
        minimumSpeed: 3 * k,
        maximumSpeed: 12 * k,
        minimumImageSize: new Cesium.Cartesian2(34 * k, 34 * k),
        maximumImageSize: new Cesium.Cartesian2(78 * k, 78 * k),
        sizeInMeters: true,
        emissionRate: 26 * k,
        emitter: new Cesium.CircleEmitter(16 * k),
        modelMatrix,
        lifetime: 16,
        loop: true,
      }),
    );
  }

  systems.push(
    new Cesium.ParticleSystem({
      image: getSmokeSprite(),
      startColor: blaze
        ? Cesium.Color.fromBytes(34, 30, 28, 200)
        : Cesium.Color.fromBytes(70, 66, 62, 120),
      endColor: Cesium.Color.fromBytes(138, 134, 130, 0),
      startScale: 1.0,
      endScale: 4.6,
      minimumParticleLife: blaze ? 7 : 6,
      maximumParticleLife: blaze ? 16 : 12,
      minimumSpeed: 6 * k,
      maximumSpeed: 17 * k,
      minimumImageSize: new Cesium.Cartesian2(74 * k, 74 * k),
      maximumImageSize: new Cesium.Cartesian2(150 * k, 150 * k),
      sizeInMeters: true,
      emissionRate: (blaze ? 11 : 5) * k,
      emitter: new Cesium.CircleEmitter(20 * k),
      modelMatrix,
      lifetime: 16,
      loop: true,
      updateCallback: (particle, dt) => {
        // 위로 오를수록 바람에 쓸려 기울어지는 연기 기둥
        Cesium.Cartesian3.multiplyByScalar(windWorld, dt, scratch);
        Cesium.Cartesian3.add(particle.velocity, scratch, particle.velocity);
      },
    }),
  );
  return systems;
}

function effectKey(
  point: StrikeFxPoint,
  phase: Exclude<StrikeBurnPhase, "none">,
): string {
  return `${point.lat.toFixed(5)},${point.lng.toFixed(5)}|${point.kind}|${phase}`;
}

function enuMatrix(
  Cesium: CesiumNS,
  lng: number,
  lat: number,
  heightM: number,
): import("cesium").Matrix4 {
  return Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(lng, lat, heightM),
  );
}

/**
 * 확인된 타격 좌표에 화염·연기를 맞춘다. 사라진 건 지운다.
 * 지형 고도는 비동기로 샘플해 좌표 중심에 앉힌다 (실패하면 해수면).
 */
export function syncStrikeFireSmokeEffects(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  strikes: StrikeFxPoint[],
  nowMs = Date.now(),
): void {
  if (viewer.isDestroyed()) return;
  const effects = effectsOf(viewer);
  const wanted = pickStrikeFxPoints(strikes, nowMs);
  const wantedIds = new Set(wanted.map((w) => w.id));

  for (const [id, effect] of effects) {
    if (!wantedIds.has(id)) {
      removeEffect(viewer, effect);
      effects.delete(id);
    }
  }

  for (const point of wanted) {
    const key = effectKey(point, point.phase);
    const existing = effects.get(point.id);
    if (existing?.key === key) continue;
    if (existing) removeEffect(viewer, existing);

    const matrix = enuMatrix(Cesium, point.lng, point.lat, 2);
    const systems = buildSystems(Cesium, point, point.phase, matrix);
    for (const sys of systems) viewer.scene.primitives.add(sys);
    const effect: Effect = { key, systems };
    effects.set(point.id, effect);

    // 지형 위에 앉히기 — 불기둥이 땅속에서 시작하지 않게
    const terrain = viewer.terrainProvider;
    if (terrain && !(terrain instanceof Cesium.EllipsoidTerrainProvider)) {
      void Cesium.sampleTerrainMostDetailed(terrain, [
        Cesium.Cartographic.fromDegrees(point.lng, point.lat),
      ])
        .then(([sampled]) => {
          if (viewer.isDestroyed() || effects.get(point.id) !== effect) return;
          const h = sampled?.height;
          if (typeof h !== "number" || !Number.isFinite(h)) return;
          const lifted = enuMatrix(Cesium, point.lng, point.lat, h + 2);
          for (const sys of effect.systems) {
            if (!sys.isDestroyed()) sys.modelMatrix = lifted;
          }
        })
        .catch(() => {
          /* 지형 샘플 실패 — 해수면 기준 유지 */
        });
    }
  }
}

/**
 * 카메라가 낮을 때만 파티클을 켠다. 높으면 숨기고 연속 렌더 hold를 푼다.
 * @returns detach — 효과 전부 제거 + hold 해제
 */
export function attachStrikeFireSmokeLoop(
  viewer: import("cesium").Viewer,
): () => void {
  let holding = false;
  const tick = () => {
    if (viewer.isDestroyed()) return;
    const effects = effectsByViewer.get(viewer);
    const height = viewer.camera.positionCartographic.height;
    const near =
      Number.isFinite(height) && height <= STRIKE_FX_MAX_CAMERA_HEIGHT_M;
    let any = false;
    if (effects) {
      for (const effect of effects.values()) {
        for (const sys of effect.systems) {
          if (sys.isDestroyed()) continue;
          if (sys.show !== near) sys.show = near;
        }
        any = true;
      }
    }
    const shouldHold = near && any;
    if (shouldHold !== holding) {
      holding = shouldHold;
      if (shouldHold) holdObserveRender(RENDER_HOLD_ID);
      else releaseObserveRender(RENDER_HOLD_ID);
    }
  };
  const timer = window.setInterval(tick, 250);
  return () => {
    window.clearInterval(timer);
    releaseObserveRender(RENDER_HOLD_ID);
    holding = false;
    const effects = effectsByViewer.get(viewer);
    if (effects) {
      for (const effect of effects.values()) removeEffect(viewer, effect);
      effects.clear();
    }
  };
}
