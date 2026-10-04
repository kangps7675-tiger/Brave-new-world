/**
 * 안건 포커스 시 “검증 시퀀스” — 텍스트 대신 채널 점등·교차 링 타이밍.
 */

import type { ObservationModality } from "@/lib/intelContract/types";

/** 채널 1개 점등 간격 */
export const DESK_CHANNEL_STEP_MS = 420;
/** 교차 링 1겹 등장 간격 (채널 이후) */
export const DESK_RING_STEP_MS = 320;
/** 등급 확정 펄스 전 여유 */
export const DESK_GRADE_LOCK_MS = 280;

export const MODALITY_RING_COLOR: Record<ObservationModality, string> = {
  media: "#38bdf8",
  sensor: "#f59e0b",
  alert: "#f472b6",
  official: "#a78bfa",
  stat: "#34d399",
  tip: "#94a3b8",
};

export type CorroborationRingSpec = {
  /** 0-based */
  index: number;
  /** 스포트라이트 반경 대비 비율 (작을수록 안쪽) */
  radiusFactor: number;
  colorCss: string;
  /** 시퀀스에서 이 링이 켜지는 시각(ms, focus 시작 기준) */
  appearAtMs: number;
};

export type DeskVerifyPhase =
  | "idle"
  | "channels"
  | "rings"
  | "locked"
  | "done";

/**
 * 독립 출처 수·모달리티 → 교차 링 스펙.
 * 1출처 = 점만(링 0), 2+ = 이중·다중 링. 이질 modality면 색이 갈림.
 */
export function buildCorroborationRings(input: {
  independenceCount: number;
  modalities: ObservationModality[];
  channelCount: number;
  /** 반증 히트 — 링 수·반경 축소 */
  disconfirmHitCount?: number;
}): CorroborationRingSpec[] {
  const indep = Math.max(0, Math.min(4, input.independenceCount || 0));
  // 1 = 점만, 2+ = 링 indep겹
  const ringCount = indep >= 2 ? indep : 0;
  const hits = input.disconfirmHitCount ?? 0;
  const collapse = hits > 0 ? Math.max(0.25, 1 - hits * 0.22) : 1;
  const mods =
    input.modalities.length > 0
      ? input.modalities
      : (["media"] as ObservationModality[]);
  const channelLead = input.channelCount * DESK_CHANNEL_STEP_MS;
  const rings: CorroborationRingSpec[] = [];
  for (let i = 0; i < ringCount; i++) {
    const mod = mods[i % mods.length]!;
    rings.push({
      index: i,
      radiusFactor: (0.18 + i * 0.12) * collapse,
      colorCss: MODALITY_RING_COLOR[mod] ?? "#2dd4bf",
      appearAtMs: channelLead + i * DESK_RING_STEP_MS,
    });
  }
  return rings;
}

export function deskVerifyPhase(
  elapsedMs: number,
  channelCount: number,
  ringCount: number,
): DeskVerifyPhase {
  if (elapsedMs < 0) return "idle";
  const channelEnd = channelCount * DESK_CHANNEL_STEP_MS;
  const ringEnd = channelEnd + ringCount * DESK_RING_STEP_MS;
  const lockEnd = ringEnd + DESK_GRADE_LOCK_MS;
  if (elapsedMs < channelEnd) return "channels";
  if (elapsedMs < ringEnd) return "rings";
  if (elapsedMs < lockEnd) return "locked";
  return "done";
}

/** 시퀀스상 몇 번째 채널까지 점등됐는지 (0 = 아직 없음) */
export function litChannelCount(
  elapsedMs: number,
  totalChannels: number,
): number {
  if (totalChannels <= 0 || elapsedMs < 0) return 0;
  return Math.min(
    totalChannels,
    Math.floor(elapsedMs / DESK_CHANNEL_STEP_MS) + 1,
  );
}

/** 시퀀스상 몇 겹의 교차 링이 켜졌는지 */
export function litRingCount(
  elapsedMs: number,
  rings: CorroborationRingSpec[],
): number {
  let n = 0;
  for (const r of rings) {
    if (elapsedMs >= r.appearAtMs) n += 1;
  }
  return n;
}

/** HUD 슬롯 표시 순서 — 센서 → 경보 → 보도 → 지표 */
export const DESK_HUD_SLOT_ORDER: ObservationModality[] = [
  "sensor",
  "alert",
  "media",
  "stat",
];

export function modalityHudLabel(
  m: ObservationModality,
  lang: "ko" | "en",
): string {
  if (lang === "en") {
    if (m === "sensor") return "Sensor";
    if (m === "alert") return "Alert";
    if (m === "media") return "Press";
    if (m === "official") return "Official";
    if (m === "stat") return "Indicator";
    return "Tip";
  }
  if (m === "sensor") return "센서";
  if (m === "alert") return "경보";
  if (m === "media") return "보도";
  if (m === "official") return "공식";
  if (m === "stat") return "지표";
  return "제보";
}
