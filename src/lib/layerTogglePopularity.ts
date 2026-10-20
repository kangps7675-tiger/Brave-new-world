/**
 * 레이어 토글 인기 — 로컬 Pareto (P3-5).
 * trackLayerToggle과 함께 빈도를 쌓아 카테고리 "추천 3개"에 쓴다.
 */

const STORAGE_KEY = "geowatch-layer-toggle-popularity-v1";

type PopularityMap = Record<string, number>;

function readMap(): PopularityMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PopularityMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: PopularityMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

/** ON 토글만 집계 (끄기는 의도 신호로 약함) */
export function recordLayerTogglePopular(itemId: string, on: boolean): void {
  if (!on || !itemId) return;
  const map = readMap();
  map[itemId] = (map[itemId] ?? 0) + 1;
  writeMap(map);
}

/**
 * 후보 id 중 상위 n개. 기록이 없으면 seedIds 순서를 따른다.
 */
export function topLayerItemIds(
  candidateIds: string[],
  n: number,
  seedIds: string[] = [],
): string[] {
  if (n <= 0 || candidateIds.length === 0) return [];
  const map = readMap();
  const scored = candidateIds.map((id) => ({
    id,
    score: map[id] ?? 0,
    seed: seedIds.indexOf(id),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.seed !== b.seed) {
      if (a.seed < 0) return 1;
      if (b.seed < 0) return -1;
      return a.seed - b.seed;
    }
    return a.id.localeCompare(b.id);
  });
  return scored.slice(0, Math.min(n, scored.length)).map((s) => s.id);
}

/** 카테고리별 정적 시드 추천 (데이터 없을 때) */
export const CATEGORY_SEED_RECOMMENDED: Record<string, string[]> = {
  conflict: ["ukraine", "disputes", "gdelt-war"],
  energy: ["oil-pipelines", "gas-pipelines", "lng-terminals"],
  transport: ["shipping-lanes", "ais", "airports"],
  military: ["military-bases", "us-carriers", "adsb"],
};
