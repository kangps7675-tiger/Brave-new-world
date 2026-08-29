import { isUsMilitaryOperator, OSM_FRONTLINE_COUNTRIES } from "@/lib/osmFrontlineBases";

export const MILITARY_BASE_FORCES = [
  "us",
  "rok",
  "japan",
  "taiwan",
  "philippines",
  "australia",
  "eastern-nato",
] as const;

export type MilitaryBaseForceId = (typeof MILITARY_BASE_FORCES)[number];

const EASTERN_NATO_ISO = new Set(
  OSM_FRONTLINE_COUNTRIES.filter((country) => country.theater === "eastern-nato").map(
    (country) => country.iso,
  ),
);

const EASTERN_NATO_NAME =
  /^(Poland|Estonia|Latvia|Lithuania|Finland|Romania|Slovakia)$/i;

export type MilitaryBaseForceFlags = {
  showMilitaryBases?: boolean;
  showRokMilitaryBases?: boolean;
  showJapanMilitaryBases?: boolean;
  showTaiwanMilitaryBases?: boolean;
  showPhilippinesMilitaryBases?: boolean;
  showAustraliaMilitaryBases?: boolean;
  showEasternNatoMilitaryBases?: boolean;
};

export function enabledMilitaryBaseForces(
  flags: MilitaryBaseForceFlags,
): MilitaryBaseForceId[] {
  const out: MilitaryBaseForceId[] = [];
  if (flags.showMilitaryBases) out.push("us");
  if (flags.showRokMilitaryBases) out.push("rok");
  if (flags.showJapanMilitaryBases) out.push("japan");
  if (flags.showTaiwanMilitaryBases) out.push("taiwan");
  if (flags.showPhilippinesMilitaryBases) out.push("philippines");
  if (flags.showAustraliaMilitaryBases) out.push("australia");
  if (flags.showEasternNatoMilitaryBases) out.push("eastern-nato");
  return out;
}

export function anyMilitaryBaseForceOn(flags: MilitaryBaseForceFlags): boolean {
  return enabledMilitaryBaseForces(flags).length > 0;
}

/** 쿼리 `forces=` — 비어 있거나 없으면 undefined(필터 없음). 잘못된 값만 있으면 빈 배열. */
export function parseMilitaryBaseForces(
  raw: string | undefined,
): MilitaryBaseForceId[] | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const known = new Set<string>(MILITARY_BASE_FORCES);
  const out: MilitaryBaseForceId[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id as MilitaryBaseForceId);
  }
  return out;
}

type ForcePoint = {
  meta?: Record<string, string | number | null> | null;
};

/**
 * 운용 주체. 주일·주한 미군은 host가 일본·한국이어도 US.
 * 분류 불명은 어느 체크에도 넣지 않는다.
 */
export function militaryBaseForceId(point: ForcePoint): MilitaryBaseForceId | null {
  const meta = point.meta ?? {};
  const country = String(meta.country ?? "").trim();
  const iso = String(meta.iso ?? "")
    .trim()
    .toUpperCase();
  const source = String(meta.source ?? "").trim();

  if (isUsMilitaryOperator(country)) return "us";
  if (source === "military-bases-csv" || source === "seed-overseas") return "us";

  if (iso === "KR" || /^(South Korea|Republic of Korea|Korea)$/i.test(country)) {
    return "rok";
  }
  if (iso === "JP" || /^Japan$/i.test(country)) return "japan";
  if (iso === "TW" || /^(Taiwan|Republic of China|ROC)$/i.test(country)) return "taiwan";
  if (iso === "PH" || /^Philippines$/i.test(country)) return "philippines";
  if (iso === "AU" || /^Australia$/i.test(country)) return "australia";
  if (EASTERN_NATO_ISO.has(iso) || EASTERN_NATO_NAME.test(country)) {
    return "eastern-nato";
  }

  return null;
}

export function filterPointsByMilitaryBaseForces<T extends ForcePoint>(
  points: T[],
  forces: readonly MilitaryBaseForceId[],
): T[] {
  if (forces.length === 0) return [];
  const allowed = new Set(forces);
  return points.filter((point) => {
    const id = militaryBaseForceId(point);
    return id != null && allowed.has(id);
  });
}
