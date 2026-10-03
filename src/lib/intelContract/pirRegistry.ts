/**
 * Priority Intelligence Requirements — 정적 레지스트리.
 * Watchboard 정렬·충족도 표시용.
 */

export type PirId =
  | "pir-ukraine-72h"
  | "pir-iran-gulf-72h"
  | "pir-redsea-yemen-72h"
  | "pir-taiwan-72h"
  | "pir-korea-72h"
  | "pir-israel-gaza-72h"
  | "pir-syria-iraq-72h"
  | "pir-sahel-72h"
  | "pir-south-china-sea-72h"
  | "pir-baltic-nato-72h"
  | "pir-chokepoint-stress"
  | "pir-hormuz-freight"
  | "pir-multi-channel-convergence"
  | "pir-escalation-watch";

export type PirDef = {
  id: PirId;
  titleKo: string;
  titleEn: string;
  /** sitrep region 또는 theater / theme */
  match: {
    sitrepRegion?: "ukraine" | "iran" | "yemen";
    theaterIds?: string[];
    themes?: Array<"chokepoint" | "convergence" | "escalation">;
  };
  windowHours: number;
  requiredModalities: Array<"media" | "sensor" | "alert" | "stat">;
};

export const PIR_REGISTRY: PirDef[] = [
  {
    id: "pir-ukraine-72h",
    titleKo: "우크라 전장 72h 강압·타격 신호",
    titleEn: "Ukraine theater 72h strike/coercion signals",
    match: { sitrepRegion: "ukraine", theaterIds: ["ukraine", "russia-ukraine"] },
    windowHours: 72,
    requiredModalities: ["sensor", "media"],
  },
  {
    id: "pir-iran-gulf-72h",
    titleKo: "이란·페르시아만 72h",
    titleEn: "Iran–Persian Gulf 72h",
    match: { sitrepRegion: "iran", theaterIds: ["iran", "middle-east"] },
    windowHours: 72,
    requiredModalities: ["media", "alert"],
  },
  {
    id: "pir-redsea-yemen-72h",
    titleKo: "홍해·예멘 72h",
    titleEn: "Red Sea–Yemen 72h",
    match: { sitrepRegion: "yemen", theaterIds: ["yemen", "middle-east"] },
    windowHours: 72,
    requiredModalities: ["media", "alert"],
  },
  {
    id: "pir-taiwan-72h",
    titleKo: "대만 해협 긴장 신호",
    titleEn: "Taiwan Strait tension signals",
    match: { theaterIds: ["taiwan", "china-taiwan"] },
    windowHours: 72,
    requiredModalities: ["media", "stat"],
  },
  {
    id: "pir-korea-72h",
    titleKo: "한반도 관련 공개 신호",
    titleEn: "Korea theater open signals",
    match: { theaterIds: ["korea"] },
    windowHours: 72,
    requiredModalities: ["media"],
  },
  {
    id: "pir-israel-gaza-72h",
    titleKo: "이스라엘·가자 72h",
    titleEn: "Israel–Gaza 72h",
    match: { theaterIds: ["israel", "gaza", "middle-east"] },
    windowHours: 72,
    requiredModalities: ["media", "alert"],
  },
  {
    id: "pir-syria-iraq-72h",
    titleKo: "시리아·이라크 타격 신호",
    titleEn: "Syria–Iraq strike signals",
    match: { theaterIds: ["syria", "iraq", "middle-east"] },
    windowHours: 72,
    requiredModalities: ["media", "sensor"],
  },
  {
    id: "pir-sahel-72h",
    titleKo: "사헬 안보 신호",
    titleEn: "Sahel security signals",
    match: { theaterIds: ["sahel", "africa"] },
    windowHours: 72,
    requiredModalities: ["media"],
  },
  {
    id: "pir-south-china-sea-72h",
    titleKo: "남중국해 마찰 신호",
    titleEn: "South China Sea friction",
    match: { theaterIds: ["south-china-sea", "china", "philippines"] },
    windowHours: 72,
    requiredModalities: ["media", "alert"],
  },
  {
    id: "pir-baltic-nato-72h",
    titleKo: "발트·NATO 주변 공개 신호",
    titleEn: "Baltic–NATO perimeter signals",
    match: { theaterIds: ["europe", "baltic", "nato"] },
    windowHours: 72,
    requiredModalities: ["media", "stat"],
  },
  {
    id: "pir-chokepoint-stress",
    titleKo: "핵심 초크포인트 물류 스트레스",
    titleEn: "Key chokepoint logistics stress",
    match: { themes: ["chokepoint"] },
    windowHours: 168,
    requiredModalities: ["alert", "stat"],
  },
  {
    id: "pir-hormuz-freight",
    titleKo: "호르무즈·운임·통항",
    titleEn: "Hormuz freight / transit",
    match: { themes: ["chokepoint"], theaterIds: ["iran", "middle-east"] },
    windowHours: 168,
    requiredModalities: ["alert", "stat"],
  },
  {
    id: "pir-multi-channel-convergence",
    titleKo: "전장 다채널 수렴 (z-score)",
    titleEn: "Theater multi-channel convergence",
    match: { themes: ["convergence"] },
    windowHours: 48,
    requiredModalities: ["stat", "sensor"],
  },
  {
    id: "pir-escalation-watch",
    titleKo: "확전 패턴 워치",
    titleEn: "Escalation pattern watch",
    match: { themes: ["escalation"] },
    windowHours: 48,
    requiredModalities: ["media", "stat"],
  },
];

export function pirById(id: PirId): PirDef | undefined {
  return PIR_REGISTRY.find((p) => p.id === id);
}

export function matchPirsForOrigin(input: {
  sitrepRegion?: string | null;
  theater?: string | null;
  theme?: "chokepoint" | "convergence" | "escalation" | null;
}): PirDef[] {
  return PIR_REGISTRY.filter((pir) => {
    if (
      input.sitrepRegion &&
      pir.match.sitrepRegion &&
      pir.match.sitrepRegion === input.sitrepRegion
    ) {
      return true;
    }
    if (
      input.theater &&
      pir.match.theaterIds?.some(
        (t) => t === input.theater || input.theater?.includes(t),
      )
    ) {
      return true;
    }
    if (input.theme && pir.match.themes?.includes(input.theme)) return true;
    return false;
  });
}

/** 필요 modality 대비 충족 비율 0–1 */
export function pirFulfillment(
  pir: PirDef,
  presentModalities: Iterable<string>,
): number {
  return pirModalityStatus(pir, presentModalities).score;
}

export type PirModalityStatus = {
  pir: PirDef;
  required: PirDef["requiredModalities"];
  present: PirDef["requiredModalities"];
  missing: PirDef["requiredModalities"];
  score: number;
};

/** PIR 충족 카드용 — 필요 / 확보 / 빈칸 */
export function pirModalityStatus(
  pir: PirDef,
  presentModalities: Iterable<string>,
): PirModalityStatus {
  const have = new Set(presentModalities);
  const required = pir.requiredModalities;
  if (required.length === 0) {
    return { pir, required, present: [], missing: [], score: 1 };
  }
  const present = required.filter((m) => have.has(m));
  const missing = required.filter((m) => !have.has(m));
  return {
    pir,
    required,
    present,
    missing,
    score: present.length / required.length,
  };
}
