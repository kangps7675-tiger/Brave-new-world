import type { WarRiskRegionId } from "@/lib/warRisk/extractPremium";
import { ACTOR_LABEL, countActors } from "@/lib/attackActor";
import { warRiskRegionAt } from "@/lib/warRisk/regionGeo";

/** 해역 판단 카드에 쓰는 해역 (보험 시장이 부르는 단위, regionGeo.ts와 같은 id) */
export const SEA_REGIONS = ["red-sea", "hormuz", "black-sea", "taiwan-strait", "malacca"] as const;
export type SeaRegion = (typeof SEA_REGIONS)[number];

/** 카드를 열 때 지구본이 날아갈 중심점 */
export const SEA_REGION_VIEW: Record<SeaRegion, { lat: number; lng: number }> = {
  "red-sea": { lat: 15, lng: 42 },
  hormuz: { lat: 26.5, lng: 55.5 },
  "black-sea": { lat: 43.5, lng: 34 },
  "taiwan-strait": { lat: 24, lng: 119.5 },
  malacca: { lat: 3, lng: 100 },
};

export type SeaIncident = {
  id: string;
  incidentTypeName: string;
  lat: number;
  lng: number;
  vesselName?: string | null;
  place?: string | null;
  utcDateOfIncident?: string | null;
  detail?: string | null;
};

export type SeaQuote = {
  region: string;
  ratePct: number | null;
  ratePrevPct: number | null;
  direction: string | null;
  outlet: string | null;
  url: string;
  publishedAt: string | null;
};

export type SeaWx = { waveHeightM: number | null; windKmh: number | null; at: string | null };

export type SeaStance = "avoid" | "caution" | "normal" | "nodata";
export type SeaTrend = "rising" | "easing" | "flat" | "quiet";

export type SeaBrief = {
  region: SeaRegion;
  /** 실제로 배가 공격·나포·승선당한 사건 (의심 활동·권고는 뺀다) */
  strikes30d: number;
  strikesPrev30d: number;
  lastStrikeAt: string | null;
  lastStrikeVessel: string | null;
  trend: SeaTrend;
  premium: { ratePct: number | null; prevPct: number | null; direction: string | null; outlet: string | null; url: string; at: string | null } | null;
  weather: SeaWx | null;
  stance: SeaStance;
  /** 판정 근거 한 줄씩 */
  reasons: string[];
  /** 이 판정이 말해 주지 못하는 것 */
  limits: string[];
};

const HARD_TYPES = new Set(["Attack", "Hijack", "Boarding"]);
const DAY = 86_400_000;

function ts(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/** 해역·항로 판단이 같이 쓰는 규칙. 3건 이상이거나 3일 안 피격이면 우회 검토, 1건 이상이거나 보험료 상승이면 주의. (정답표로 검증하기 전의 임시 기준) */
export function stanceFrom(x: { strikes30d: number; lastAgeDays: number | null; premiumUp: boolean; hasData: boolean }): SeaStance {
  if (!x.hasData) return "nodata";
  if (x.strikes30d >= 3 || (x.strikes30d >= 1 && x.lastAgeDays !== null && x.lastAgeDays <= 3)) return "avoid";
  if (x.strikes30d >= 1 || x.premiumUp) return "caution";
  return "normal";
}

export function computeSeaBrief(
  region: SeaRegion,
  input: { incidents: SeaIncident[]; quotes: SeaQuote[]; weather: SeaWx | null; now?: number },
): SeaBrief {
  const now = input.now ?? Date.now();
  const hard = input.incidents
    .filter((i) => HARD_TYPES.has(i.incidentTypeName) && warRiskRegionAt(i.lat, i.lng) === (region as WarRiskRegionId))
    .map((i) => ({ i, t: ts(i.utcDateOfIncident) }))
    .filter((x): x is { i: SeaIncident; t: number } => x.t !== null)
    .sort((a, b) => b.t - a.t);

  const cur = hard.filter((x) => now - x.t <= 30 * DAY).length;
  const prev = hard.filter((x) => now - x.t > 30 * DAY && now - x.t <= 60 * DAY).length;
  const last = hard[0] ?? null;
  const lastAgeDays = last ? (now - last.t) / DAY : null;

  const trend: SeaTrend = cur === 0 && prev === 0 ? "quiet" : cur > prev ? "rising" : cur < prev ? "easing" : "flat";

  const q = input.quotes
    .filter((x) => x.region === region && x.ratePct !== null)
    .sort((a, b) => (ts(b.publishedAt) ?? 0) - (ts(a.publishedAt) ?? 0))[0];
  const premium = q
    ? { ratePct: q.ratePct, prevPct: q.ratePrevPct, direction: q.direction, outlet: q.outlet, url: q.url, at: q.publishedAt }
    : null;

  const stance = stanceFrom({ strikes30d: cur, lastAgeDays, premiumUp: premium?.direction === "up", hasData: input.incidents.length > 0 || !!premium });

  const reasons: string[] = [];
  reasons.push(`최근 30일 피격·나포·승선 ${cur}건 (직전 30일 ${prev}건)`);
  if (last && lastAgeDays !== null) {
    reasons.push(`가장 최근: ${Math.floor(lastAgeDays)}일 전${last.i.vesselName ? ` · ${last.i.vesselName}` : ""}`);
  }
  if (cur > 0) {
    const a = countActors(hard.filter((x) => now - x.t <= 30 * DAY).map((x) => x.i));
    const parts = (Object.keys(a) as Array<keyof typeof a>).filter((k) => a[k] > 0).map((k) => `${ACTOR_LABEL[k].ko} ${a[k]}`);
    reasons.push(`공격 주체: ${parts.join(" · ")} (UKMTO가 밝힌 것만)`);
  }
  if (premium?.ratePct != null) {
    const dir = premium.direction === "up" ? "상승" : premium.direction === "down" ? "하락" : "보합";
    reasons.push(`전쟁위험 보험료 선박가치의 ${premium.ratePct}% (${dir}, ${premium.outlet ?? "보도"})`);
  }
  if (input.weather?.waveHeightM != null && input.weather.waveHeightM >= 3) {
    reasons.push(`파고 ${input.weather.waveHeightM}m — 우회·대기 판단에 영향`);
  }

  const limits = [
    "UKMTO가 공지한 사건만 셉니다. 공지가 없거나 늦은 사건은 빠집니다.",
    "AIS 신호가 끊긴 구간은 「배가 없었다」가 아니라 「자료가 없다」입니다.",
    "보험료는 공개 시세가 없어 언론 보도에서 뽑은 값입니다. 실제 항차 견적과 다릅니다.",
    "참고용 판단입니다. 운항 결정은 선사·보험사 기준과 함께 보세요.",
  ];

  return { region, strikes30d: cur, strikesPrev30d: prev, lastStrikeAt: last ? last.i.utcDateOfIncident ?? null : null, lastStrikeVessel: last?.i.vesselName ?? null, trend, premium, weather: input.weather, stance, reasons, limits };
}
