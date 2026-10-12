/**
 * 해상 사건(UKMTO 등) ↔ AIS 선박 교차 대조.
 *
 * 「이 사건의 선박은 이것이다」를 단정하지 않는다. 이름·위치·시각·선종 근거를
 * 점수로 쌓아 strong / probable / candidate 등급으로만 돌려준다.
 * - 이름이 같고 도달 가능한 거리 안 → strong (그래도 AIS 오기·동명선 가능성은 남음)
 * - 이름이 비슷하거나 위치·시각만 맞음 → probable / candidate
 * - 아무것도 못 맞추면 빈 배열 — 억지로 채우지 않는다.
 */

import type { AisVessel } from "@/data/geoTypes";

export type VesselMatchGrade = "strong" | "probable" | "candidate";

export type VesselIncidentInput = {
  id: string;
  lat: number;
  lng: number;
  vesselName: string | null;
  vesselType: string | null;
  /** ISO / UKMTO utc 문자열 */
  utcDateOfIncident: string | null;
};

export type VesselIncidentMatch = {
  incidentId: string;
  mmsi: string;
  shipName: string | null;
  grade: VesselMatchGrade;
  /** 0~100 — 정렬용. 등급 경계는 grade를 따른다 */
  score: number;
  nameScore: number;
  distanceKm: number;
  /** 사건 시각 기준 AIS 보고가 얼마나 어긋나는지(시간). 알 수 없으면 null */
  aisOffsetHours: number | null;
  /** UI에 그대로 보여줄 근거 */
  reasons: string[];
};

/** 사건 시각에 AIS 위치가 얼마나 벗어날 수 있는지 계산하는 기본 반경(km) */
const BASE_REACH_KM = 25;
/** 항해 속력을 모를 때 가정하는 최소 속력(kn) */
const ASSUMED_SPEED_KN = 12;
const KM_PER_NM = 1.852;
/** 시간 경과 반영 상한 — 하루 넘는 어긋남은 근거로 쓰지 않는다 */
const MAX_ELAPSED_HOURS = 24;
/** 이름이 없는 사건에서 후보로 올릴 최대 반경(km) */
const NAMELESS_RADIUS_KM = 15;
/** 이름이 없는 사건에서 허용하는 시각 차(시간) */
const NAMELESS_MAX_OFFSET_HOURS = 3;
const MAX_MATCHES_PER_INCIDENT = 5;

/** 구두점을 공백으로 바꾼 뒤 적용 — "M/V X", "MV X", "M V X" 모두 */
const NAME_PREFIX_RE = /^(?:M\s?V|M\s?T|S\s?S|M\s?S|F\s?V)\s+/;

/** 선명 비교용 정규화 — 접두 MV/MT, 구두점, 공백 제거 */
export function normalizeVesselName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toUpperCase()
    .replace(/[“”"'`’.,()/\\-]+/g, " ")
    .replace(NAME_PREFIX_RE, "")
    .replace(/\s+/g, "")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= b.length; j += 1) {
      cur[j] = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** 0~1. 정규화 후 동일 = 1. 너무 짧은 이름은 오탐이 커서 fuzzy를 쓰지 않는다 */
export function vesselNameSimilarity(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const x = normalizeVesselName(a);
  const y = normalizeVesselName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (Math.min(x.length, y.length) < 5) return 0;
  const dist = levenshtein(x, y);
  return Math.max(0, 1 - dist / Math.max(x.length, y.length));
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** UKMTO 선종 문구 → ITU 선종 대분류(앞 자리). 모르면 null */
export function incidentVesselTypeToAisFamily(type: string | null | undefined): number | null {
  const t = (type ?? "").toLowerCase();
  if (!t) return null;
  if (/tanker|chemical|lng|lpg|oil/.test(t)) return 8;
  if (/bulk|cargo|general|container|ro-?ro|vehicle/.test(t)) return 7;
  if (/passenger|ferry|cruise/.test(t)) return 6;
  if (/tug|supply|offshore|pilot|towing/.test(t)) return 5;
  if (/fish/.test(t)) return 3;
  return null;
}

function shipTypeFamily(code: number | null): number | null {
  if (code == null || !Number.isFinite(code)) return null;
  return Math.floor(code / 10);
}

function parseTimeMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const direct = Date.parse(value);
  if (Number.isFinite(direct)) return direct;
  // "2026-10-12 08:15:00" 처럼 TZ 없는 UTC 문자열
  const iso = Date.parse(`${value.replace(" ", "T")}Z`);
  return Number.isFinite(iso) ? iso : null;
}

function gradeFor(
  nameScore: number,
  withinReach: boolean,
  typeOk: boolean | null,
  nameless: boolean,
): VesselMatchGrade | null {
  if (nameScore >= 0.999 && withinReach) return "strong";
  if (nameScore >= 0.999) return "probable"; // 이름은 같지만 도달 거리 밖 — 동명선 가능성
  if (nameScore >= 0.85 && withinReach) return "probable";
  if (nameScore >= 0.85) return "candidate";
  if (nameless && withinReach && typeOk !== false) return "candidate";
  return null;
}

const GRADE_BASE: Record<VesselMatchGrade, number> = {
  strong: 80,
  probable: 55,
  candidate: 25,
};

export function matchIncidentToAis(
  incident: VesselIncidentInput,
  vessels: AisVessel[],
): VesselIncidentMatch[] {
  if (!Number.isFinite(incident.lat) || !Number.isFinite(incident.lng)) return [];
  const incidentMs = parseTimeMs(incident.utcDateOfIncident);
  const wantedName = normalizeVesselName(incident.vesselName);
  const nameless = wantedName.length === 0;
  const wantedFamily = incidentVesselTypeToAisFamily(incident.vesselType);
  const out: VesselIncidentMatch[] = [];

  for (const v of vessels) {
    if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;

    const nameScore = nameless ? 0 : vesselNameSimilarity(incident.vesselName, v.shipName);
    if (!nameless && nameScore < 0.85) continue;

    const distanceKm = haversineKm(incident.lat, incident.lng, v.lat, v.lng);

    // AIS 보고 시각과 사건 시각의 차이 → 그 사이 배가 갈 수 있는 거리
    const aisMs = parseTimeMs(v.timestamp);
    const offsetHours =
      incidentMs != null && aisMs != null ? (aisMs - incidentMs) / 3_600_000 : null;
    const elapsed = Math.min(MAX_ELAPSED_HOURS, Math.abs(offsetHours ?? 0));
    const speed = Math.max(v.speedOverGround ?? 0, ASSUMED_SPEED_KN);
    const reachKm = BASE_REACH_KM + speed * KM_PER_NM * elapsed;
    const withinReach = distanceKm <= reachKm;

    if (nameless) {
      if (distanceKm > NAMELESS_RADIUS_KM) continue;
      if (offsetHours == null || Math.abs(offsetHours) > NAMELESS_MAX_OFFSET_HOURS) continue;
    }

    const family = shipTypeFamily(v.shipType);
    const typeOk =
      wantedFamily != null && family != null ? wantedFamily === family : null;
    if (nameless && typeOk === false) continue;

    const grade = gradeFor(nameScore, withinReach, typeOk, nameless);
    if (!grade) continue;

    // 점수: 등급 기준점 + 근접도 + 이름·선종 보정
    const proximity = Math.max(0, 1 - distanceKm / Math.max(reachKm, 1)) * 15;
    const score = Math.round(
      Math.min(
        99,
        GRADE_BASE[grade] +
          proximity +
          (typeOk === true ? 5 : 0) -
          (typeOk === false ? 10 : 0) +
          (nameScore >= 0.999 ? 0 : -5),
      ),
    );

    const reasons: string[] = [];
    if (!nameless) {
      reasons.push(
        nameScore >= 0.999
          ? `선명 일치 (${v.shipName})`
          : `선명 유사 ${Math.round(nameScore * 100)}% (${v.shipName})`,
      );
    } else {
      reasons.push("선명 미공개 — 위치·시각·선종으로만 추정");
    }
    reasons.push(
      withinReach
        ? `사건 지점에서 ${distanceKm.toFixed(1)}km (도달 가능 범위 ${reachKm.toFixed(0)}km 이내)`
        : `사건 지점에서 ${distanceKm.toFixed(0)}km — 도달 가능 범위(${reachKm.toFixed(0)}km) 밖`,
    );
    if (offsetHours != null) {
      reasons.push(
        `AIS 보고 시각이 사건보다 ${offsetHours >= 0 ? "" : "-"}${Math.abs(offsetHours).toFixed(1)}시간 ${offsetHours >= 0 ? "뒤" : "앞"}`,
      );
    } else {
      reasons.push("AIS 보고 시각을 알 수 없음");
    }
    if (typeOk === true) reasons.push("선종 계열 일치");
    if (typeOk === false) reasons.push("선종 계열 불일치");

    out.push({
      incidentId: incident.id,
      mmsi: v.mmsi,
      shipName: v.shipName,
      grade,
      score,
      nameScore,
      distanceKm,
      aisOffsetHours: offsetHours,
      reasons,
    });
  }

  out.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
  return out.slice(0, MAX_MATCHES_PER_INCIDENT);
}

export const VESSEL_MATCH_GRADE_LABEL_KO: Record<VesselMatchGrade, string> = {
  strong: "유력 (선명·위치 일치)",
  probable: "가능성 있음",
  candidate: "후보 (추정)",
};

const GRADE_LABEL_EN: Record<VesselMatchGrade, string> = {
  strong: "strong match",
  probable: "possible match",
  candidate: "candidate",
};

/**
 * 브리핑 문단용 한 단락. 일치 선박이 없다는 말이 "피격 선박 없음"으로 읽히지 않게
 * 항상 한계(끄기·수신 공백·동명선)를 같이 적는다.
 * @param checked 대조한 AIS 선박 수 (0이면 호출하지 말 것)
 */
export function formatAisMatchParagraph(
  matches: VesselIncidentMatch[],
  lang: "ko" | "en",
  checked: number,
): string {
  const top = matches[0];
  if (!top) {
    return lang === "en"
      ? `AIS cross-check: none of the ${checked} vessels currently received fit this incident. AIS can be switched off or have coverage gaps, so this does not mean no ship was hit.`
      : `AIS 대조: 현재 수신 중인 AIS ${checked}척 중 이 사건과 맞는 선박을 찾지 못했습니다. AIS 끄기·수신 공백일 수 있어 「피격 선박 없음」을 뜻하지 않습니다.`;
  }
  const rest = matches.length - 1;
  if (lang === "en") {
    const name = top.shipName?.trim() || "unnamed";
    return (
      `AIS cross-check (${GRADE_LABEL_EN[top.grade]}): ${name} (MMSI ${top.mmsi}), ` +
      `${top.distanceKm.toFixed(1)} km from the reported position` +
      (rest > 0 ? `; ${rest} more candidate${rest > 1 ? "s" : ""}` : "") +
      ". A same-name ship or a wrong AIS entry is possible — this is a cross-check, not a confirmation."
    );
  }
  const name = top.shipName?.trim() || "선명 없음";
  return (
    `AIS 대조(${VESSEL_MATCH_GRADE_LABEL_KO[top.grade]}): ${name} (MMSI ${top.mmsi}) — ` +
    `${top.reasons.slice(0, 2).join(", ")}` +
    (rest > 0 ? ` · 외 후보 ${rest}척` : "") +
    ". 동명선·AIS 오기 가능성이 있어 확정이 아니라 대조 결과입니다."
  );
}
