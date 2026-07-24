import {
  ECON_NAV_MENU_GROUPS,
  ECON_REGION_KEYWORDS,
  econNavSelectionFromId,
} from "@/data/econNavRegions";
import type { NavSelection } from "@/data/navRegions";
import type { DisputeAlert } from "@/lib/disputeAlerts";
import type { NewsStreamPayload } from "@/lib/news/types";
import { navSelectionFromId } from "@/lib/theaterFocus";

export type EconomyHubChoice = "auto" | string;

export const ECONOMY_HUB_OPTIONS: Array<{ id: EconomyHubChoice; label: string }> = [
  { id: "auto", label: "자동" },
  { id: "hormuz", label: "호르무즈" },
  { id: "suez", label: "수에즈 · 홍해" },
  { id: "fed-dc", label: "연준 · 금리" },
  { id: "taiwan-chip", label: "대만 · 반도체" },
  { id: "chicago-cme", label: "시카고 · 곡물" },
  { id: "nyc", label: "뉴욕 · Fed" },
  { id: "bab-el-mandeb", label: "바브엘만데브" },
];

const ECON_HOT_PRIORITY = [
  "hormuz",
  "suez",
  "bab-el-mandeb",
  "taiwan-chip",
  "fed-dc",
  "chicago-cme",
  "malacca",
  "nyc",
  "london",
  "hong-kong",
] as const;

function matchesKeywords(text: string, keywords: string[]): boolean {
  const blob = text.toLowerCase();
  return keywords.some((kw) => blob.includes(kw.toLowerCase()));
}

/** alertScore 최상위 → nav id (가장 뜨거운 충돌지) */
export function hottestConflictNavId(alerts: DisputeAlert[]): string {
  const top = alerts[0];
  if (!top) return "taiwan";

  const fromMenu = top.menuRegion.id;
  if (navSelectionFromId(fromMenu)) return fromMenu;

  const { lat, lng } = top.center;
  if (lat >= 44 && lat <= 52 && lng >= 22 && lng <= 40) return "ukraine";
  if (lat >= 29 && lat <= 37 && lng >= 34 && lng <= 46) return "gulf";
  if (lat >= 22 && lat <= 28 && lng >= 118 && lng <= 125) return "taiwan";
  if (lat >= 33 && lat <= 43 && lng >= 124 && lng <= 132) return "korea";

  return "ukraine";
}

function economyHubFromAlert(alert: DisputeAlert): string | null {
  const { lat, lng } = alert.center;
  if (lat >= 22 && lat <= 30 && lng >= 52 && lng <= 60) return "hormuz";
  if (lat >= 10 && lat <= 32 && lng >= 30 && lng <= 45) return "suez";
  if (lat >= 10 && lat <= 16 && lng >= 42 && lng <= 46) return "bab-el-mandeb";
  if (lat >= 21 && lat <= 28 && lng >= 118 && lng <= 123) return "taiwan-chip";
  if (lat >= 0 && lat <= 8 && lng >= 99 && lng <= 106) return "malacca";
  if (lat >= 38 && lat <= 42 && lng >= -76 && lng <= -73) return "nyc";
  return null;
}

/** 경제 RSS 키워드 + 분쟁지 인접 가중 → 가장 핫한 지정학적 투자·물류 허브 */
export function hottestEconomyNavId(
  alerts: DisputeAlert[],
  payload?: NewsStreamPayload | null,
): string {
  const scores = new Map<string, number>();
  for (const id of ECON_HOT_PRIORITY) scores.set(id, 0);

  if (payload) {
    const economyItems = [...payload.verified, ...payload.stateMedia].filter(
      (item) => item.feedTopic === "economy",
    );
    for (const [id, keywords] of Object.entries(ECON_REGION_KEYWORDS)) {
      const hits = economyItems.filter((item) =>
        matchesKeywords(`${item.title} ${item.summary ?? ""}`, keywords),
      ).length;
      if (hits > 0) scores.set(id, (scores.get(id) ?? 0) + hits * 120);
    }
  }

  alerts.slice(0, 6).forEach((alert, index) => {
    const weight = (6 - index) * 80 + alert.alertScore / 5000;
    const hub = economyHubFromAlert(alert);
    if (hub) scores.set(hub, (scores.get(hub) ?? 0) + weight);
  });

  let best: string = ECON_HOT_PRIORITY[0];
  let bestScore = -1;
  for (const [id, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

export function resolveEconomyHubNavSelection(
  hub: EconomyHubChoice,
  alerts: DisputeAlert[],
  payload?: NewsStreamPayload | null,
): NavSelection | null {
  const id = hub === "auto" ? hottestEconomyNavId(alerts, payload) : hub;
  return econNavSelectionFromId(id);
}

export function resolveConflictAutoNavSelection(alerts: DisputeAlert[]): NavSelection | null {
  return navSelectionFromId(hottestConflictNavId(alerts));
}

/** ECON_NAV 모든 leaf id (검증용) */
export function isValidEconomyHubId(id: string): boolean {
  if (id === "auto") return true;
  return econNavSelectionFromId(id) != null;
}

export function economyHubLabel(id: EconomyHubChoice): string {
  return ECONOMY_HUB_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function allEconomyNavIds(): string[] {
  const ids: string[] = [];
  for (const group of ECON_NAV_MENU_GROUPS) {
    for (const item of group.items) {
      ids.push(item.id);
      for (const sub of item.subItems) ids.push(sub.id);
    }
  }
  return ids;
}
