/**
 * AIS ship type → 지정학(군) / 지경학(민) 분류.
 * ITU-R M.1371 ship and cargo type; MarineTraffic generic: 2/4/6/7/8.
 */

import { lookupDisguisedVessel } from "@/data/disguisedVessels";

export type AisVesselCategory = "military" | "commercial" | "other";

export type AisClassFilter = "military" | "commercial" | "all" | "disguised";

/**
 * 항모 레이어에 안 잡힌 군함의 함종.
 * 선명·헐넘버 휴리스틱 — AIS type 35만으로는 세분 불가.
 */
export type AisMilitaryKind =
  | "destroyer"
  | "frigate"
  | "corvette"
  | "cruiser"
  | "submarine"
  | "amphibious"
  | "carrier"
  | "patrol"
  | "auxiliary"
  | "law-enforcement"
  | "unknown";

const MILITARY_NAME =
  /\b(USS|HMS|HMAS|HMCS|HNLMS|HDMS|HSWMS|FS\s|FGS|ITS\s|ORP\s|ROKS|INS\s|JS\s|KRI\s|BRP\s|BNS\s|PLAN|PLANS|WARSHIP|NAVAL|DESTROYER|FRIGATE|CORVETTE|SUBMARINE|CARRIER|CVN|DDG|FFG|CG\s*\d)\b/i;

/** AIS Type 35 = Military ops; 55 = Law enforcement (군/치안으로 지정학에 포함) */
export function aisGenericClass(shipType: number | null | undefined): number | null {
  if (shipType == null || !Number.isFinite(shipType)) return null;
  return Math.floor(shipType / 10);
}

export function classifyAisVessel(input: {
  shipType?: number | null;
  shipName?: string | null;
}): AisVesselCategory {
  const type = input.shipType ?? null;
  if (type === 35 || type === 55) return "military";
  if (input.shipName && MILITARY_NAME.test(input.shipName)) return "military";

  const g = aisGenericClass(type);
  if (g === null) return "other";

  // 2 Fishing · 4 HSC · 6 Passenger · 7 Cargo · 8 Tanker
  if (g === 2 || g === 4 || g === 6 || g === 7 || g === 8) return "commercial";
  // 3x special craft except 35/55 already handled
  if (g === 3) return "other";
  // 9 Other / 0–1 reserved → other
  return "other";
}

/**
 * 군함 함종 — 비군함이면 null.
 * 우선순위: 잠수함 → 상륙 → 항모 → 순양 → 구축 → 호위 → 초계 → 순찰 → 보급 → 치안 → unknown
 */
export function classifyMilitaryKind(input: {
  shipType?: number | null;
  shipName?: string | null;
}): AisMilitaryKind | null {
  if (classifyAisVessel(input) !== "military") return null;

  if (input.shipType === 55) return "law-enforcement";

  const name = (input.shipName || "").trim();
  if (!name) return "unknown";

  if (
    /\b(SUBMARINE|SUBMARIN)\b/i.test(name) ||
    /\bSSBN\b|\bSSN\b|\bSSK\b|\bSSGN\b/i.test(name) ||
    /\b(SORYU|TAIGEI|VIRGINIA|COLUMBIA|ASTUTE|BARRACUDA)\b/i.test(name)
  ) {
    return "submarine";
  }

  if (
    /\b(LHD|LHA|LPD|LSD|LST|LPH)\b/i.test(name) ||
    /\b(AMPHIBIOUS|ASSAULT\s*SHIP|LANDING\s*SHIP|DOCK\s*LANDING)\b/i.test(name)
  ) {
    return "amphibious";
  }

  if (
    /\b(AIRCRAFT\s*CARRIER|SUPER\s*CARRIER)\b/i.test(name) ||
    /\bCVN[-\s]?\d+\b|\bCVW\b|\bCV[-\s]?\d+\b/i.test(name) ||
    /\b(NIMITZ|FORD|ABRAHAM\s*LINCOLN|GEORGE\s*WASHINGTON|THEODORE\s*ROOSEVELT|RONALD\s*REAGAN|CARL\s*VINSON|HARRY\s*S\.?\s*TRUMAN|JOHN\s*C\.?\s*STENNIS|GEORGE\s*H\.?\s*W\.?\s*BUSH|GERALD\s*R\.?\s*FORD|QUEEN\s*ELIZABETH|CHARLES\s*DE\s*GAULLE|LIAONING|SHANDONG|FUJIAN)\b/i.test(
      name,
    )
  ) {
    return "carrier";
  }

  if (/\b(CRUISER|CGN)\b/i.test(name) || /\bCG[-\s]?\d+\b/i.test(name)) {
    return "cruiser";
  }

  if (
    /\bDESTROYER\b/i.test(name) ||
    /\bDDG\b/i.test(name) ||
    /\bDDG[-\s]?\d+\b/i.test(name) ||
    /\bDD[-\s]?\d+\b/i.test(name) ||
    /\b(ARLEIGH\s*BURKE|SEJONG|KONGO|ATAGO|MAYA|TYPE\s*052|TYPE\s*055|HOBART|DARING|HORIZON)\b/i.test(
      name,
    )
  ) {
    return "destroyer";
  }

  if (
    /\bFRIGATE\b/i.test(name) ||
    /\bFFG\b/i.test(name) ||
    /\bFFG[-\s]?\d+\b/i.test(name) ||
    /\bFF[-\s]?\d+\b/i.test(name) ||
    /\b(TYPE\s*054|TYPE\s*26|TYPE\s*31|FREMM|MEKO|INCHEON|DAEGU)\b/i.test(name)
  ) {
    return "frigate";
  }

  if (/\bCORVETTE\b/i.test(name) || /\b(POHANG|GUMDOKSEORI|VISBY|STEREGUSHCHIY)\b/i.test(name)) {
    return "corvette";
  }

  if (
    /\b(PATROL|OPV|COAST\s*GUARD|CUTTER|PCG)\b/i.test(name) ||
    /\bPC[-\s]?\d+\b/i.test(name) ||
    /\bWHEC\b|\bWMSL\b/i.test(name)
  ) {
    return "patrol";
  }

  if (
    /\b(AUXILIARY|REPLENISHMENT|SUPPLY\s*SHIP|OILER|TANKER\s*SHIP)\b/i.test(name) ||
    /\b(T-AO|T-AKE|AOR|AOE|AKR)\b/i.test(name)
  ) {
    return "auxiliary";
  }

  return "unknown";
}

const MILITARY_KIND_LABEL: Record<AisMilitaryKind, { ko: string; en: string }> = {
  destroyer: { ko: "구축함", en: "Destroyer" },
  frigate: { ko: "호위함", en: "Frigate" },
  corvette: { ko: "초계함", en: "Corvette" },
  cruiser: { ko: "순양함", en: "Cruiser" },
  submarine: { ko: "잠수함", en: "Submarine" },
  amphibious: { ko: "상륙함", en: "Amphibious" },
  carrier: { ko: "항공모함", en: "Aircraft carrier" },
  patrol: { ko: "고속정·순찰", en: "Patrol" },
  auxiliary: { ko: "군수지원함", en: "Auxiliary" },
  "law-enforcement": { ko: "해경·치안", en: "Law enforcement" },
  unknown: { ko: "군함(미분류)", en: "Warship (unspecified)" },
};

/** 구축·호위·초계·순양 — 동일 3D(俯視) 표지 */
export const AIS_SURFACE_COMBATANT_KINDS = [
  "destroyer",
  "frigate",
  "corvette",
  "cruiser",
] as const satisfies ReadonlyArray<AisMilitaryKind>;

export type AisSurfaceCombatantKind = (typeof AIS_SURFACE_COMBATANT_KINDS)[number];

export function isAisSurfaceCombatant(
  kind: AisMilitaryKind | null | undefined,
): kind is AisSurfaceCombatantKind {
  return (
    kind === "destroyer" ||
    kind === "frigate" ||
    kind === "corvette" ||
    kind === "cruiser"
  );
}

/** 8방위 실루엣 표지 (수상전투함·잠수함) */
export function isAisAspectHullMarker(kind: AisMilitaryKind | null | undefined): boolean {
  return isAisSurfaceCombatant(kind) || kind === "submarine";
}

export function militaryKindLabel(
  kind: AisMilitaryKind | null | undefined,
  lang: "ko" | "en" = "ko",
): string | null {
  if (!kind) return null;
  return lang === "en" ? MILITARY_KIND_LABEL[kind].en : MILITARY_KIND_LABEL[kind].ko;
}

/** UI 표시용 — 군함이면 함종, 아니면 AIS shipType 라벨 */
export function aisDisplayTypeLabel(
  vessel: {
    category: AisVesselCategory;
    shipTypeLabel?: string | null;
    militaryKind?: AisMilitaryKind | null;
  },
  lang: "ko" | "en" = "ko",
): string | null {
  if (vessel.category === "military") {
    return (
      militaryKindLabel(vessel.militaryKind ?? "unknown", lang) || vessel.shipTypeLabel || null
    );
  }
  return vessel.shipTypeLabel ?? null;
}

export function aisShipTypeLabel(shipType: number | null | undefined): string | null {
  if (shipType == null || !Number.isFinite(shipType)) return null;
  const labels: Record<number, string> = {
    30: "Fishing",
    35: "Military",
    36: "Sailing",
    37: "Pleasure",
    40: "HSC",
    50: "Pilot",
    51: "SAR",
    52: "Tug",
    53: "Port tender",
    55: "Law enforcement",
    60: "Passenger",
    70: "Cargo",
    80: "Tanker",
    90: "Other",
  };
  if (labels[shipType]) return labels[shipType];
  const g = Math.floor(shipType / 10);
  const generic: Record<number, string> = {
    2: "Fishing",
    3: "Special",
    4: "HSC",
    5: "Special",
    6: "Passenger",
    7: "Cargo",
    8: "Tanker",
    9: "Other",
  };
  return generic[g] ?? `Type ${shipType}`;
}

/** 지정학: 군함만. 지경학: 민간. disguised: AIS_Tracker 위장·다크플리트. */
export function matchesAisClassFilter(
  category: AisVesselCategory,
  filter: AisClassFilter,
  disguised?: boolean,
): boolean {
  if (filter === "all") return true;
  if (filter === "disguised") return Boolean(disguised);
  if (filter === "military") return category === "military";
  // commercial: 군용 절대 제외. other만 민간 후보로 포함.
  return category === "commercial" || category === "other";
}

/** 민간 AIS — 함종별 색 (화물/탱커/여객/어선/고속선/기타) */
export function aisCommercialPointColor(shipType: number | null | undefined): string {
  if (shipType == null || !Number.isFinite(shipType)) return "rgba(148, 163, 184, 0.88)";
  if (shipType === 35 || shipType === 55) return "rgba(52, 211, 153, 0.92)";
  const g = Math.floor(shipType / 10);
  switch (g) {
    case 8:
      return "rgba(251, 146, 60, 0.92)"; // Tanker
    case 7:
      return "rgba(56, 189, 248, 0.92)"; // Cargo
    case 6:
      return "rgba(244, 114, 182, 0.92)"; // Passenger
    case 2:
      return "rgba(52, 211, 153, 0.9)"; // Fishing
    case 4:
      return "rgba(167, 139, 250, 0.92)"; // HSC
    case 3:
      return "rgba(250, 204, 21, 0.88)"; // Special
    default:
      return "rgba(125, 211, 252, 0.88)";
  }
}

/** 함종별 포인트 틴트 (군함 점·마커) */
export function aisMilitaryKindColor(kind: AisMilitaryKind | null | undefined): string {
  if (isAisSurfaceCombatant(kind)) return "#ef4444";
  switch (kind) {
    case "submarine":
      return "#7c3aed";
    case "amphibious":
      return "#eab308";
    case "carrier":
      return "#fbbf24";
    case "patrol":
      return "#f43f5e";
    case "auxiliary":
      return "#94a3b8";
    case "law-enforcement":
      return "#38bdf8";
    default:
      return "#ef4444";
  }
}

export function parseAisClassFilter(raw: string | null): AisClassFilter {
  if (raw === "military" || raw === "commercial" || raw === "all" || raw === "disguised") {
    return raw;
  }
  return "all";
}

/** category / militaryKind / labels 한 번에 (+ AIS_Tracker 위장 매칭) */
export function enrichAisClassification(input: {
  shipType?: number | null;
  shipName?: string | null;
  mmsi?: string | null;
}): {
  category: AisVesselCategory;
  shipTypeLabel: string | null;
  militaryKind: AisMilitaryKind | null;
  disguised: boolean;
  disguisedKind: "arsenal-ship" | "dark-fleet" | null;
} {
  const shipType = input.shipType ?? null;
  const category = classifyAisVessel(input);
  const hit = lookupDisguisedVessel({ mmsi: input.mmsi, shipName: input.shipName });
  return {
    category,
    shipTypeLabel: aisShipTypeLabel(shipType),
    militaryKind: category === "military" ? classifyMilitaryKind(input) : null,
    disguised: hit != null,
    disguisedKind: hit?.kind ?? null,
  };
}
