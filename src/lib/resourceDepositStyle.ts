/** Mineral deposit polygon fill colors (thematic map style). */

const DEPOSIT_FILL: Record<string, string> = {
  Lithium: "rgba(249, 115, 22, 0.78)",
  "Rare Earths": "rgba(220, 38, 38, 0.78)",
  Uranium: "rgba(203, 213, 225, 0.82)",
  Titanium: "rgba(71, 85, 105, 0.82)",
  Copper: "rgba(245, 158, 11, 0.72)",
  Nickel: "rgba(163, 230, 53, 0.72)",
  Cobalt: "rgba(129, 140, 248, 0.72)",
  Graphite: "rgba(148, 163, 184, 0.75)",
  "Platinum Group Metals": "rgba(244, 114, 182, 0.72)",
  PGM: "rgba(244, 114, 182, 0.72)",
  Iron: "rgba(251, 113, 133, 0.72)",
  "Iron Ore": "rgba(251, 113, 133, 0.72)",
  Bauxite: "rgba(217, 119, 6, 0.72)",
  Oil: "rgba(120, 53, 15, 0.7)",
  Gas: "rgba(56, 189, 248, 0.6)",
  "Natural Gas": "rgba(56, 189, 248, 0.6)",
  Coal: "rgba(24, 24, 27, 0.82)",
  Gold: "rgba(251, 191, 36, 0.75)",
  Manganese: "rgba(45, 212, 191, 0.72)",
  Phosphate: "rgba(132, 204, 22, 0.72)",
  Potash: "rgba(192, 132, 252, 0.72)",
  Diamond: "rgba(165, 243, 252, 0.78)",
  Tin: "rgba(161, 98, 7, 0.75)",
  Tungsten: "rgba(100, 116, 139, 0.78)",
  Molybdenum: "rgba(99, 102, 241, 0.72)",
  Zinc: "rgba(74, 222, 128, 0.72)",
  Lead: "rgba(113, 113, 122, 0.75)",
  Chromium: "rgba(34, 197, 94, 0.72)",
  Silver: "rgba(226, 232, 240, 0.8)",
  Helium: "rgba(244, 114, 182, 0.55)",
};

const DEPOSIT_STROKE: Record<string, string> = {
  Lithium: "rgba(254, 215, 170, 0.95)",
  "Rare Earths": "rgba(254, 202, 202, 0.95)",
  Uranium: "rgba(241, 245, 249, 0.9)",
  Titanium: "rgba(148, 163, 184, 0.9)",
  Oil: "rgba(253, 186, 116, 0.9)",
  Gas: "rgba(186, 230, 253, 0.95)",
  "Natural Gas": "rgba(186, 230, 253, 0.95)",
  Coal: "rgba(113, 113, 122, 0.9)",
  Gold: "rgba(254, 243, 199, 0.95)",
  Phosphate: "rgba(217, 249, 157, 0.9)",
  Potash: "rgba(233, 213, 255, 0.95)",
  Diamond: "rgba(207, 250, 254, 0.95)",
  Silver: "rgba(255, 255, 255, 0.85)",
};

export function normalizeDepositMineral(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const t = raw.trim();
  if (DEPOSIT_FILL[t]) return t;
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
  return DEPOSIT_FILL[key] ?? "rgba(251, 191, 36, 0.7)";
}

export function mineralDepositStroke(mineral: unknown): string {
  const key = normalizeDepositMineral(mineral);
  return DEPOSIT_STROKE[key] ?? "rgba(255, 255, 255, 0.55)";
}
