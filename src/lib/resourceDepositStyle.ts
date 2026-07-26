/** Mineral deposit polygon fill — energy 군 단일 톤 (광종은 알파만 미세 차). */

import { groupHex, groupRgba, hexToRgba } from "@/lib/layerColorGroups";

/** 광종별 채움 알파 — 색상은 전부 energy 앰버 */
const DEPOSIT_ALPHA: Record<string, number> = {
  Lithium: 0.72,
  "Rare Earths": 0.78,
  Uranium: 0.7,
  Titanium: 0.66,
  Copper: 0.74,
  Nickel: 0.7,
  Cobalt: 0.72,
  Graphite: 0.62,
  "Platinum Group Metals": 0.76,
  PGM: 0.76,
  Iron: 0.74,
  "Iron Ore": 0.74,
  Bauxite: 0.7,
  Oil: 0.78,
  Gas: 0.64,
  "Natural Gas": 0.64,
  Coal: 0.55,
  Gold: 0.8,
  Manganese: 0.7,
  Phosphate: 0.68,
  Potash: 0.7,
  Diamond: 0.66,
  Tin: 0.72,
  Tungsten: 0.68,
  Molybdenum: 0.7,
  Zinc: 0.7,
  Lead: 0.64,
  Chromium: 0.72,
  Silver: 0.62,
  Helium: 0.58,
};

const DEFAULT_FILL_ALPHA = 0.7;

function strokeForFillAlpha(alpha: number): string {
  // 스트로크는 채움보다 진하게 — 색상은 활성 베이스맵 톤의 energy 기준색
  return hexToRgba(groupHex("energy"), Math.min(0.95, alpha + 0.18));
}

export function normalizeDepositMineral(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const t = raw.trim();
  if (DEPOSIT_ALPHA[t] != null) return t;
  const lower = t.toLowerCase();
  if (lower.includes("rare earth")) return "Rare Earths";
  if (lower.includes("platinum") || lower.includes("pgm")) return "Platinum Group Metals";
  if (lower.includes("lithium")) return "Lithium";
  if (lower.includes("uranium")) return "Uranium";
  if (lower.includes("titanium")) return "Titanium";
  if (lower.includes("copper")) return "Copper";
  if (lower.includes("nickel")) return "Nickel";
  if (lower.includes("cobalt")) return "Cobalt";
  if (lower.includes("graphite")) return "Graphite";
  if (lower.includes("iron")) return "Iron";
  if (lower.includes("bauxite")) return "Bauxite";
  if (lower.includes("coal")) return "Coal";
  if (lower.includes("helium")) return "Helium";
  if (lower.includes("gas") || lower.includes("lng")) return "Gas";
  if (lower.includes("oil") || lower.includes("crude") || lower.includes("petroleum")) return "Oil";
  if (lower.includes("gold")) return "Gold";
  if (lower.includes("manganese")) return "Manganese";
  if (lower.includes("phosphate") || lower.includes("phosphor")) return "Phosphate";
  if (lower.includes("potash") || lower.includes("potassium")) return "Potash";
  if (lower.includes("diamond")) return "Diamond";
  if (lower.includes("tungsten") || lower.includes("wolfram")) return "Tungsten";
  if (lower.includes("molybdenum") || lower.includes("moly")) return "Molybdenum";
  if (lower.includes("chromium") || lower.includes("chrome")) return "Chromium";
  if (lower.includes("silver")) return "Silver";
  if (lower.includes("zinc")) return "Zinc";
  if (lower.includes("lead")) return "Lead";
  if (lower.includes("tin") || lower.includes("cassiter")) return "Tin";
  return t;
}

export function mineralDepositFill(mineral: unknown): string {
  const key = normalizeDepositMineral(mineral);
  const alpha = DEPOSIT_ALPHA[key] ?? DEFAULT_FILL_ALPHA;
  return groupRgba("energy", alpha);
}

export function mineralDepositStroke(mineral: unknown): string {
  const key = normalizeDepositMineral(mineral);
  const alpha = DEPOSIT_ALPHA[key] ?? DEFAULT_FILL_ALPHA;
  return strokeForFillAlpha(alpha);
}
