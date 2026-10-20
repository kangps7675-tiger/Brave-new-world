export type GlobeLodTier = "global" | "continent" | "regional" | "near" | "village";

export type GlobeLod = {
  tier: GlobeLodTier;
  label: string;
  radiusDeg: number;
};

const LABELS_KO: Record<GlobeLodTier, string> = {
  global: "전역",
  continent: "대륙",
  regional: "지역",
  near: "근접",
  village: "도시와 마을",
};

const LABELS_EN: Record<GlobeLodTier, string> = {
  global: "Global",
  continent: "Continent",
  regional: "Regional",
  near: "Near",
  village: "Local",
};

const RADIUS_DEG: Record<GlobeLodTier, number> = {
  global: 0,
  continent: 28,
  regional: 16,
  near: 8,
  village: 2.2,
};

export function getGlobeLod(altitude: number, lang: "ko" | "en" = "ko"): GlobeLod {
  let tier: GlobeLodTier;
  if (altitude > 1.65) tier = "global";
  else if (altitude > 1.1) tier = "continent";
  else if (altitude > 0.72) tier = "regional";
  else if (altitude > 0.28) tier = "near";
  else tier = "village";

  return globeLodFromTier(tier, lang);
}

export function globeLodFromTier(tier: GlobeLodTier, lang: "ko" | "en" = "ko"): GlobeLod {
  const labels = lang === "en" ? LABELS_EN : LABELS_KO;
  return { tier, label: labels[tier], radiusDeg: RADIUS_DEG[tier] };
}

export function getGlobeLodLabel(altitude: number, lang: "ko" | "en" = "ko"): string {
  return getGlobeLod(altitude, lang).label;
}
