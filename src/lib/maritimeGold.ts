import type { GoldStrike } from "@/data/gold/maritimeStrikes";

/** 우리 판정이 「확인」 또는 「유력」으로 낸 피격 한 건 */
export type PredictedStrike = { vessel: string | null; at: string; lat?: number; lng?: number };

const GEO_MATCH_NM = 40;

function distNm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(toRad(bLat - aLat) / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(toRad(bLng - aLng) / 2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.sqrt(h));
}

export type GoldScore = {
  goldCount: number;
  predictedCount: number;
  matched: number;
  /** 우리가 낸 것 중 정답표에 있는 비율. 비교 가능한 건이 없으면 null */
  precision: number | null;
  /** 정답표 중 우리가 낸 비율. 정답표가 비면 null */
  recall: number | null;
  missed: string[];
  unmatchedPredictions: string[];
};

const norm = (s: string) => s.toUpperCase().replace(/^(MV|M\/V|MT|M\/T)\s+/, "").replace(/[^A-Z0-9]+/g, " ").trim();

/** 날짜가 월 단위면 같은 달이면 일치, 일 단위면 ±2일까지 일치 */
export function sameDate(goldDate: string, at: string): boolean {
  if (goldDate.length === 7) return at.slice(0, 7) === goldDate;
  const g = Date.parse(goldDate);
  const a = Date.parse(at);
  return Number.isFinite(g) && Number.isFinite(a) && Math.abs(a - g) <= 2 * 86_400_000;
}

/**
 * 정밀도·재현율. 리뷰가 끝난(reviewed=true) 정답만 쓴다.
 * 정밀도는 정답표가 다루는 기간 안의 예측만 센다 (표 밖 기간의 맞는 예측을 오답으로 치지 않기 위해).
 */
export function scoreAgainstGold(
  predicted: PredictedStrike[],
  gold: readonly GoldStrike[],
  opts: { includeDraft?: boolean } = {},
): GoldScore {
  const g = opts.includeDraft ? [...gold] : gold.filter((x) => x.reviewed);
  const times = g.map((x) => Date.parse(x.date.length === 7 ? `${x.date}-01` : x.date)).filter(Number.isFinite);
  const lo = times.length ? Math.min(...times) : Infinity;
  const hi = times.length ? Math.max(...times) + 31 * 86_400_000 : -Infinity;
  const inRange = predicted.filter((p) => {
    const t = Date.parse(p.at);
    return Number.isFinite(t) && t >= lo && t <= hi;
  });
  const used = new Set<number>();
  const missed: string[] = [];
  let matched = 0;
  for (const x of g) {
    const byName = (p: PredictedStrike) => p.vessel !== null && norm(p.vessel) === norm(x.vessel) && sameDate(x.date, p.at);
    // UKMTO는 선명을 가리는 일이 많다 — 정답 쪽에 좌표가 있으면 같은 날(일 단위 정답만) 40해리 안이면 같은 사건으로 본다
    const byGeo = (p: PredictedStrike) =>
      x.date.length === 10 &&
      x.lat !== undefined && x.lng !== undefined && p.lat !== undefined && p.lng !== undefined &&
      sameDate(x.date, p.at) && distNm(x.lat, x.lng, p.lat, p.lng) <= GEO_MATCH_NM;
    const i = inRange.findIndex((p, idx) => !used.has(idx) && (byName(p) || byGeo(p)));
    if (i >= 0) {
      used.add(i);
      matched++;
    } else missed.push(x.vessel);
  }
  return {
    goldCount: g.length,
    predictedCount: inRange.length,
    matched,
    precision: inRange.length ? matched / inRange.length : null,
    recall: g.length ? matched / g.length : null,
    missed,
    unmatchedPredictions: inRange.filter((_, i) => !used.has(i)).map((p) => `${p.vessel ?? "(선명 없음)"} ${p.at.slice(0, 10)}`),
  };
}
