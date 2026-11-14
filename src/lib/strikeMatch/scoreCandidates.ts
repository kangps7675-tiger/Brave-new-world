/**
 * "어떤 배가 진짜 맞았나" — 피격 사건 1건 × 주변 선박 항적 → 후보 순위.
 *
 * 판정 원칙 (화면 문구와 직결 — 함부로 올리지 말 것):
 *  - confirmed(확인): 경보·기사에 나온 선명 = AIS 선명 + 사건 지점 근처에 실제로 있었음. 둘 다 있어야만.
 *  - likely(유력): 선명은 없지만 사건 지점 30km 안 + 사건 앞뒤 표본으로 확인된 급감속·급선회 + 선종 불일치 아님.
 *                  신호 끊김만으로는 유력이 아니다(수신 공백과 구별 불가). 점수가 비슷한 다른 후보가 있으면 못 좁힘.
 *  - possible(가능성): 근처에 있었다는 것만 확인
 *  - 거리만 가깝다고 "맞았다"고 쓰지 않는다. 홍해·호르무즈는 배가 많아서 근처에 수십 척이 있다.
 *
 * UKMTO 좌표는 "호데이다 서쪽 50해리" 식의 근사치라 반경을 넉넉히(기본 60km) 잡고,
 * 거리는 점수의 한 요소로만 쓴다.
 *
 * 의존성 없음 (Worker·Next·테스트 공통).
 */

export type TrackPoint = {
  lat: number;
  lng: number;
  sog: number | null;
  cog: number | null;
  sampledAt: string;
};

export type VesselTrack = {
  mmsi: string;
  name: string | null;
  imo: string | null;
  /** AIS ship type 코드 (80~89 탱커, 70~79 화물 등). 모르면 null */
  shipType: number | null;
  category: string | null;
  points: TrackPoint[];
};

export type StrikeIncident = {
  lat: number;
  lng: number;
  atIso: string;
  /** 경보·기사에 나온 선종 (예: "Tanker", "Bulk Carrier") */
  vesselType: string | null;
  /** 경보·기사에 나온 선명 (예: "MV Tutor") */
  vesselName: string | null;
};

export type Verdict = "confirmed" | "likely" | "possible";

export type SignalKey =
  | "name_match"
  | "near"
  | "type_match"
  | "type_mismatch"
  | "slowdown"
  | "turn"
  | "dark_at_incident"
  | "went_dark"
  | "military";

export type Signal = {
  key: SignalKey;
  /** 비전문가용 한 줄 설명 */
  ko: string;
  en?: string;
  weight: number;
};

export type ScoredCandidate = {
  mmsi: string;
  imo: string | null;
  name: string | null;
  shipType: number | null;
  verdict: Verdict;
  score: number;
  /** 사건 시각 기준 추정 위치까지 거리 */
  distanceKm: number;
  /** interpolated(앞뒤 표본 사이 보간) | nearest(가장 가까운 시각 표본) */
  positionBasis: "interpolated" | "nearest";
  /** 추정에 쓴 표본과 사건 시각의 차이(분) */
  sampleOffsetMin: number;
  signals: Signal[];
};

const R_KM = 6371;
function toRad(d: number) {
  return (d * Math.PI) / 180;
}
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const MIN = 60_000;
/** 앞뒤 표본 간격이 이보다 길면 보간하지 않는다 */
const MAX_INTERP_GAP_MIN = 180;
/** 이 이상 비면 "신호 끊김" (수집 버킷 30분의 4배 — trackFreeze.TRACK_GAP_MINUTES 와 같게) */
export const DARK_GAP_MIN = 120;
/** 사건 시각과 표본이 이보다 멀면 "그때 근처에 있었다"고 말하지 않는다 */
const MAX_SAMPLE_OFFSET_MIN = 360;

/**
 * 화면에 "이 배"라고 한 척을 지목하는 판정(유력·확인)의 문턱 — 정확도가 커버리지보다 우선이다.
 * 못 좁히면 '못 좁힘'으로 두고 후보만 보여 준다. 문턱을 낮추려면 실제 사건 정답으로 오탐률을 먼저 재야 한다.
 */
/** 유력: 사건 시각 추정 위치가 이 안이어야 한다 (UKMTO 좌표 오차를 감안해도 한 척으로 좁혀지는 거리) */
export const LIKELY_MAX_KM = 30;
/** 유력: 위치 추정에 쓴 표본이 사건과 이 이상 떨어져 있으면(보간이 아닌 경우) 근처에 있었다고 단정하지 않는다 */
export const LIKELY_MAX_OFFSET_MIN = 60;
/** 확인: 선명이 같아도 위치 표본이 이보다 멀면(보간이 아닌 경우) 확인하지 않는다 */
export const CONFIRM_MAX_OFFSET_MIN = 180;
/** 행동 변화(급감속·급선회)는 사건 앞뒤 가장 가까운 표본이 이 안에 있을 때만 믿는다 */
export const BEHAVIOR_MAX_GAP_MIN = 90;
/** 1순위와 점수 차가 이보다 작은 다른 후보가 있으면 하나로 못 좁힌 것 */
export const RIVAL_SCORE_MARGIN = 15;

function ms(iso: string): number {
  return Date.parse(iso);
}

function sortedPoints(points: TrackPoint[]): TrackPoint[] {
  return points
    .filter((p) => Number.isFinite(ms(p.sampledAt)))
    .sort((a, b) => ms(a.sampledAt) - ms(b.sampledAt));
}

/** 사건 시각의 위치 추정 */
export function positionAt(
  points: TrackPoint[],
  atMs: number,
): { lat: number; lng: number; basis: "interpolated" | "nearest"; offsetMin: number } | null {
  const pts = sortedPoints(points);
  if (pts.length === 0) return null;
  let before: TrackPoint | null = null;
  let after: TrackPoint | null = null;
  for (const p of pts) {
    if (ms(p.sampledAt) <= atMs) before = p;
    else {
      after = p;
      break;
    }
  }
  if (before && after) {
    const tb = ms(before.sampledAt);
    const ta = ms(after.sampledAt);
    if ((ta - tb) / MIN <= MAX_INTERP_GAP_MIN) {
      const f = ta === tb ? 0 : (atMs - tb) / (ta - tb);
      return {
        lat: before.lat + (after.lat - before.lat) * f,
        lng: before.lng + (after.lng - before.lng) * f,
        basis: "interpolated",
        offsetMin: Math.round(Math.min(atMs - tb, ta - atMs) / MIN),
      };
    }
  }
  const nearest = [before, after]
    .filter((p): p is TrackPoint => p !== null)
    .sort((a, b) => Math.abs(ms(a.sampledAt) - atMs) - Math.abs(ms(b.sampledAt) - atMs))[0]!;
  return {
    lat: nearest.lat,
    lng: nearest.lng,
    basis: "nearest",
    offsetMin: Math.round(Math.abs(ms(nearest.sampledAt) - atMs) / MIN),
  };
}

/** "M/V TUTOR", "mv  Tutor " → "TUTOR" */
export function normalizeShipName(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\b(M ?V|M ?T|SS|THE)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 경보가 선명 대신 쓰는 일반 단어 — 이런 이름이 AIS 선명에 들어 있다고 같은 배가 아니다 */
export const GENERIC_NAMES = new Set([
  "MERCHANT", "TANKER", "TKR", "TUG", "CARGO", "VESSEL", "SHIP", "CONTAINER", "BULK", "CARRIER",
  "UNKNOWN", "OIL TANKER", "CRUDE TANKER", "CONTAINER SHIP", "BULK CARRIER", "GENERAL CARGO",
]);

export function namesMatch(a: string | null, b: string | null): boolean {
  const x = normalizeShipName(a);
  const y = normalizeShipName(b);
  if (x.length < 3 || y.length < 3) return false;
  if (GENERIC_NAMES.has(x) || GENERIC_NAMES.has(y)) return false;
  if (x === y) return true;
  // 부분 일치는 단어 경계 기준, 짧은 쪽이 5자 이상일 때만 ("STAR" 같은 흔한 단어 오매칭 방지)
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 5 && new RegExp(`(^| )${short}( |$)`).test(long);
}

/** 경보 선종 → AIS 타입 대분류 */
export function reportedTypeGroup(t: string | null): "tanker" | "cargo" | "passenger" | null {
  if (!t) return null;
  if (/tanker|lng|lpg|crude|chemical|product/i.test(t)) return "tanker";
  if (/bulk|container|cargo|general|ro-?ro|vehicle|car carrier|reefer|merchant|freighter/i.test(t)) {
    return "cargo";
  }
  if (/passenger|cruise|ferry/i.test(t)) return "passenger";
  return null;
}

function aisTypeGroup(code: number | null): "tanker" | "cargo" | "passenger" | "other" | null {
  if (code == null || !Number.isFinite(code)) return null;
  const g = Math.floor(code / 10);
  if (g === 8) return "tanker";
  if (g === 7) return "cargo";
  if (g === 6) return "passenger";
  return "other";
}

function avg(xs: number[]): number | null {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
}

function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** 사건 전후 3시간 행동 이상 */
export function behaviorSignals(points: TrackPoint[], atMs: number): Signal[] {
  const out: Signal[] = [];
  const pts = sortedPoints(points);
  const window = 3 * 60 * MIN;
  const pre = pts.filter((p) => ms(p.sampledAt) <= atMs && atMs - ms(p.sampledAt) <= window);
  const post = pts.filter((p) => ms(p.sampledAt) > atMs && ms(p.sampledAt) - atMs <= window);

  // 앞뒤 표본이 사건에서 멀면(수신 공백) 속도·방향 변화가 사건 때문인지 알 수 없다
  const adjacent =
    pre.length > 0 &&
    post.length > 0 &&
    atMs - ms(pre.at(-1)!.sampledAt) <= BEHAVIOR_MAX_GAP_MIN * MIN &&
    ms(post[0]!.sampledAt) - atMs <= BEHAVIOR_MAX_GAP_MIN * MIN;

  const preSog = avg(pre.map((p) => p.sog).filter((v): v is number => v != null));
  const postSog = avg(post.map((p) => p.sog).filter((v): v is number => v != null));
  if (adjacent && preSog !== null && postSog !== null && preSog >= 7 && postSog <= Math.max(2, preSog * 0.35)) {
    out.push({
      key: "slowdown",
      ko: `사건 직후 속도가 ${preSog.toFixed(0)}노트에서 ${postSog.toFixed(0)}노트로 떨어짐 (멈추거나 표류)`,
      en: `Speed fell from ${preSog.toFixed(0)} kn to ${postSog.toFixed(0)} kn right after the event (stopped or drifting)`,
      weight: 25,
    });
  }

  const preCog = pre.at(-1)?.cog;
  const postCog = post[0]?.cog;
  if (adjacent && preCog != null && postCog != null && angleDiff(preCog, postCog) >= 60) {
    out.push({
      key: "turn",
      ko: `사건 직후 진행 방향이 ${Math.round(angleDiff(preCog, postCog))}° 바뀜 (회항·회피 기동 가능)`,
      en: `Course changed ${Math.round(angleDiff(preCog, postCog))}° right after the event (possible turn-away)`,
      weight: 15,
    });
  }

  const last = pts.filter((p) => ms(p.sampledAt) <= atMs).at(-1);
  const next = pts.find((p) => ms(p.sampledAt) > atMs);
  if (last && next) {
    const gap = (ms(next.sampledAt) - ms(last.sampledAt)) / MIN;
    if (gap >= DARK_GAP_MIN) {
      out.push({
        key: "dark_at_incident",
        ko: `사건 시각을 끼고 AIS 신호가 ${Math.round(gap)}분 끊김`,
        en: `AIS signal went dark for ${Math.round(gap)} minutes across the incident time`,
        weight: 15,
      });
    }
  } else if (last && !next && atMs - ms(last.sampledAt) <= 90 * MIN) {
    out.push({
      key: "went_dark",
      ko: "사건 직전까지 신호가 잡히다가 이후 끊김",
      en: "Signal was present until the incident, then went dark",
      weight: 10,
    });
  }
  return out;
}

function verdictOf(
  signals: Signal[],
  d: number,
  pos: { basis: "interpolated" | "nearest"; offsetMin: number },
): Verdict {
  const has = (k: SignalKey) => signals.some((s) => s.key === k);
  const nearInTime = pos.basis === "interpolated";
  if (
    has("name_match") &&
    d <= 150 &&
    !has("military") &&
    (nearInTime || pos.offsetMin <= CONFIRM_MAX_OFFSET_MIN)
  ) {
    return "confirmed";
  }
  // 신호 끊김(dark_at_incident·went_dark)만으로는 유력이 아니다 — 수신 공백일 뿐 피격 때문인지 알 수 없다.
  // 급감속·급선회처럼 사건 앞뒤 표본으로 확인된 행동 변화가 있어야 한다.
  const kinematic = has("slowdown") || has("turn");
  if (
    kinematic &&
    !has("type_mismatch") &&
    !has("military") &&
    d <= LIKELY_MAX_KM &&
    (nearInTime || pos.offsetMin <= LIKELY_MAX_OFFSET_MIN)
  ) {
    return "likely";
  }
  return "possible";
}

const VERDICT_RANK: Record<Verdict, number> = { confirmed: 3, likely: 2, possible: 1 };

export function scoreCandidates(
  incident: StrikeIncident,
  tracks: VesselTrack[],
  opts: { radiusKm?: number } = {},
): ScoredCandidate[] {
  const radiusKm = opts.radiusKm ?? 60;
  const atMs = ms(incident.atIso);
  if (!Number.isFinite(atMs)) return [];
  const wantType = reportedTypeGroup(incident.vesselType);
  const out: ScoredCandidate[] = [];

  for (const v of tracks) {
    const pos = positionAt(v.points, atMs);
    if (!pos || pos.offsetMin > MAX_SAMPLE_OFFSET_MIN) continue;
    const d = distanceKm(incident, pos);
    const nameHit = namesMatch(incident.vesselName, v.name);
    // 선명이 맞으면 경보 좌표 오차를 감안해 150km 까지 봐준다
    if (d > radiusKm && !(nameHit && d <= 150)) continue;

    const signals: Signal[] = [];
    if (nameHit) {
      signals.push({
        key: "name_match",
        ko: `경보에 나온 선명(${incident.vesselName})과 AIS 선명(${v.name})이 같음`,
        en: `The name in the alert (${incident.vesselName}) matches the AIS name (${v.name})`,
        weight: 50,
      });
    }
    const nearW = d <= 5 ? 30 : d <= 20 ? 22 : d <= 40 ? 14 : 8;
    signals.push({
      key: "near",
      ko: `사건 시각에 사건 지점에서 약 ${d < 1 ? "1km 이내" : `${Math.round(d)}km`}${
        pos.basis === "nearest" ? ` (가장 가까운 위치 기록은 사건과 ${pos.offsetMin}분 차이)` : ""
      }`,
      en: `About ${d < 1 ? "within 1 km" : `${Math.round(d)} km`} from the site at the incident time${
        pos.basis === "nearest" ? ` (nearest position record is ${pos.offsetMin} min off)` : ""
      }`,
      weight: nearW,
    });

    const isMilitary = v.category === "military" || v.shipType === 35 || v.shipType === 55;
    const g = aisTypeGroup(v.shipType);
    // 군함은 아래 military 신호로 따로 낮추므로 선종 비교는 건너뛴다 (감점 중복 방지)
    if (wantType && g && !isMilitary) {
      if (g === wantType) {
        signals.push({
          key: "type_match",
          ko: `선종 일치 (${incident.vesselType})`,
          en: `Ship type matches (${incident.vesselType})`,
          weight: 10,
        });
      } else {
        signals.push({
          key: "type_mismatch",
          ko: `선종 불일치 — 경보는 ${incident.vesselType}, AIS는 다른 선종`,
          en: `Ship type mismatch — alert says ${incident.vesselType}, AIS is a different type`,
          weight: -25,
        });
      }
    }
    if (isMilitary) {
      signals.push({
        key: "military",
        ko: "군함·관공선 — 상선 피격 후보에서 낮춤",
        en: "Warship or government vessel — down-ranked as a merchant-ship hit",
        weight: -40,
      });
    }

    signals.push(...behaviorSignals(v.points, atMs));

    const score = Math.max(0, Math.min(100, signals.reduce((s, x) => s + x.weight, 0)));
    out.push({
      mmsi: v.mmsi,
      imo: v.imo,
      name: v.name,
      shipType: v.shipType,
      verdict: verdictOf(signals, d, pos),
      score,
      distanceKm: Math.round(d * 10) / 10,
      positionBasis: pos.basis,
      sampleOffsetMin: pos.offsetMin,
      signals,
    });
  }

  return out.sort(
    (a, b) =>
      VERDICT_RANK[b.verdict] - VERDICT_RANK[a.verdict] ||
      b.score - a.score ||
      a.distanceKm - b.distanceKm,
  );
}

export type MatchStatus = "confirmed" | "likely" | "ambiguous" | "unknown";

/**
 * 사건 1건의 결론.
 *  - confirmed / likely: 상위 후보 하나를 찍을 수 있음
 *  - ambiguous: 근처 배는 있는데 하나로 못 좁힘 (유력 후보가 비슷한 점수로 여럿이거나 근처에 있었다는 것뿐)
 *  - unknown: 근처 AIS 기록 자체가 없음 (수집 공백일 수 있음 — "아무도 안 맞았다"가 아님)
 */
export function summarizeMatch(cands: ScoredCandidate[]): {
  status: MatchStatus;
  top: ScoredCandidate | null;
  nearbyCount: number;
} {
  const top = cands[0] ?? null;
  if (!top) return { status: "unknown", top: null, nearbyCount: 0 };
  const nearbyCount = cands.length;
  if (top.verdict === "confirmed") {
    const twin = cands.slice(1).some((c) => c.verdict === "confirmed");
    return { status: twin ? "ambiguous" : "confirmed", top, nearbyCount };
  }
  if (top.verdict === "likely") {
    // 점수가 비슷한 다른 후보가 하나라도 있으면(판정 등급과 무관) 한 척을 지목하지 않는다
    const rival = cands.slice(1).some((c) => top.score - c.score < RIVAL_SCORE_MARGIN);
    return { status: rival ? "ambiguous" : "likely", top, nearbyCount };
  }
  return { status: "ambiguous", top, nearbyCount };
}
