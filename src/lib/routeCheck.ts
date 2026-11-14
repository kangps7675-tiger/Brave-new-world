import { classifyActor, countActors, type Actor, type ActorInput } from "@/lib/attackActor";
import { stanceFrom, type SeaIncident, type SeaStance } from "@/lib/seaBrief";

/**
 * 항구 → 항구 항로 확인.
 * 항로선은 항구마다 정한 대표 경로(길목 통과점)를 이어 만든 근사치다. 실제 항차 경로·분리통항로(TSS)와 다를 수 있다.
 */
type LL = readonly [number, number];
type Zone = "gulf" | "hormuz" | "oman" | "aden" | "redsea";

export type Port = { id: string; ko: string; en: string; lat: number; lng: number; zone: Zone };

export const PORTS: readonly Port[] = [
  { id: "ras-tanura", ko: "라스타누라", en: "Ras Tanura", lat: 26.65, lng: 50.16, zone: "gulf" },
  { id: "jebel-ali", ko: "제벨알리", en: "Jebel Ali", lat: 25.01, lng: 55.06, zone: "gulf" },
  { id: "ras-laffan", ko: "라스라판", en: "Ras Laffan", lat: 25.9, lng: 51.55, zone: "gulf" },
  { id: "shuaiba", ko: "쿠웨이트(슈와이바)", en: "Kuwait (Shuaiba)", lat: 29.03, lng: 48.17, zone: "gulf" },
  { id: "bandar-abbas", ko: "반다르아바스", en: "Bandar Abbas", lat: 27.1, lng: 56.1, zone: "hormuz" },
  { id: "fujairah", ko: "푸자이라", en: "Fujairah", lat: 25.12, lng: 56.37, zone: "oman" },
  { id: "khor-fakkan", ko: "호르파칸", en: "Khor Fakkan", lat: 25.35, lng: 56.38, zone: "oman" },
  { id: "sohar", ko: "소하르", en: "Sohar", lat: 24.5, lng: 56.7, zone: "oman" },
  { id: "muscat", ko: "무스카트", en: "Muscat", lat: 23.62, lng: 58.6, zone: "oman" },
  { id: "aden", ko: "아덴", en: "Aden", lat: 12.8, lng: 45.0, zone: "aden" },
  { id: "djibouti", ko: "지부티", en: "Djibouti", lat: 11.6, lng: 43.15, zone: "aden" },
  { id: "jeddah", ko: "제다", en: "Jeddah", lat: 21.5, lng: 39.15, zone: "redsea" },
];

const GULF_MID: LL = [26.9, 53.2];
const HORMUZ_W: LL = [26.55, 56.15];
const HORMUZ_E: LL = [26.2, 56.75];
const OMAN_SEA: LL = [24.8, 58.0];
const ARABIAN_1: LL = [14.0, 50.5];
const ARABIAN_2: LL = [19.0, 58.5];
const BAB: LL = [12.65, 43.3];

/** 항구에서 공통 기점(OMAN_SEA)까지 가는 대표 경로. 두 항구의 경로에서 겹치는 꼬리는 잘라 낸다. */
function chain(p: Port): LL[] {
  const self: LL = [p.lat, p.lng];
  switch (p.zone) {
    case "gulf":
      return [self, GULF_MID, HORMUZ_W, HORMUZ_E, OMAN_SEA];
    case "hormuz":
      return [self, HORMUZ_E, OMAN_SEA];
    case "oman":
      return [self, OMAN_SEA];
    case "aden":
      return [self, ARABIAN_1, ARABIAN_2, OMAN_SEA];
    case "redsea":
      return [self, BAB, ARABIAN_1, ARABIAN_2, OMAN_SEA];
  }
}

export function portById(id: string): Port | undefined {
  return PORTS.find((p) => p.id === id);
}

export function planRoute(fromId: string, toId: string): LL[] | null {
  const a = portById(fromId);
  const b = portById(toId);
  if (!a || !b || a.id === b.id) return null;
  // 같은 바다 안의 항구끼리(걸프 제외 — 걸프는 카타르 반도 때문에 직선이 육지를 지난다)는 직선
  if (a.zone === b.zone && a.zone !== "gulf") return [[a.lat, a.lng], [b.lat, b.lng]];
  const ca = chain(a);
  const cb = chain(b);
  // 꼬리(공통 경로)가 겹치면 한 점만 남기고 자른다
  let i = ca.length - 1;
  let j = cb.length - 1;
  while (i > 0 && j > 0 && ca[i - 1]![0] === cb[j - 1]![0] && ca[i - 1]![1] === cb[j - 1]![1]) {
    i--;
    j--;
  }
  return [...ca.slice(0, i + 1), ...cb.slice(0, j).reverse()];
}

const R_NM = 3440.065;
const rad = (d: number) => (d * Math.PI) / 180;

/** 점과 선분 사이 거리(해리) — 선분 근처 좁은 범위에서 쓰는 등장방형 근사 */
function distPointSegNm(p: LL, a: LL, b: LL): number {
  const k = Math.cos(rad((a[0] + b[0]) / 2));
  const ax = rad(a[1]) * k * R_NM, ay = rad(a[0]) * R_NM;
  const bx = rad(b[1]) * k * R_NM, by = rad(b[0]) * R_NM;
  const px = rad(p[1]) * k * R_NM, py = rad(p[0]) * R_NM;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function distToRouteNm(p: LL, route: readonly LL[]): number {
  let best = Infinity;
  for (let i = 0; i < route.length - 1; i++) best = Math.min(best, distPointSegNm(p, route[i]!, route[i + 1]!));
  return best;
}

export function routeLengthNm(route: readonly LL[]): number {
  let sum = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const [a, b] = [route[i]!, route[i + 1]!];
    const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
    sum += 2 * R_NM * Math.asin(Math.sqrt(h));
  }
  return Math.round(sum);
}

export type RouteIncident = SeaIncident & ActorInput & { vesselType?: string | null };
export type NavWarning = { id: string; areaHint: string; description: string; date: string | null; points: LL[]; radiusNm: number | null };

export type RouteBrief = {
  from: Port;
  to: Port;
  route: LL[];
  lengthNm: number;
  bufferNm: number;
  strikes30d: number;
  strikesPrev30d: number;
  actors: Record<Actor, number>;
  /** 항로 40해리 안 최근 사건 (최대 6건) */
  recent: Array<{ id: string; at: string | null; type: string; place: string | null; vesselType: string | null; distanceNm: number; actor: Actor; evidence: string }>;
  warnings: Array<{ id: string; areaHint: string; text: string; distanceNm: number }>;
  stance: SeaStance;
  limits: string[];
};

const HARD = new Set(["Attack", "Hijack", "Boarding"]);
const DAY = 86_400_000;
export const ROUTE_BUFFER_NM = 40;

export function checkRoute(
  fromId: string,
  toId: string,
  input: { incidents: RouteIncident[]; warnings: NavWarning[]; now?: number },
): RouteBrief | null {
  const route = planRoute(fromId, toId);
  const from = portById(fromId);
  const to = portById(toId);
  if (!route || !from || !to) return null;
  const now = input.now ?? Date.now();

  const near = input.incidents
    .map((i) => ({ i, d: distToRouteNm([i.lat, i.lng], route), t: i.utcDateOfIncident ? Date.parse(i.utcDateOfIncident) : NaN }))
    .filter((x) => x.d <= ROUTE_BUFFER_NM && Number.isFinite(x.t))
    .sort((a, b) => b.t - a.t);

  const hard = near.filter((x) => HARD.has(x.i.incidentTypeName));
  const cur = hard.filter((x) => now - x.t <= 30 * DAY);
  const prev = hard.filter((x) => now - x.t > 30 * DAY && now - x.t <= 60 * DAY).length;
  const lastAge = cur[0] ? (now - cur[0].t) / DAY : null;

  const warnings = input.warnings
    .map((w) => {
      const pts = w.points.length ? w.points : [];
      const d = pts.length ? Math.min(...pts.map((p) => distToRouteNm(p, route))) - (w.radiusNm ?? 0) : Infinity;
      return { w, d: Math.max(0, d) };
    })
    .filter((x) => x.d <= 30)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
    .map(({ w, d }) => ({ id: w.id, areaHint: w.areaHint, text: w.description.slice(0, 160), distanceNm: Math.round(d) }));

  return {
    from,
    to,
    route,
    lengthNm: routeLengthNm(route),
    bufferNm: ROUTE_BUFFER_NM,
    strikes30d: cur.length,
    strikesPrev30d: prev,
    actors: countActors(cur.map((x) => x.i)),
    recent: near.slice(0, 6).map(({ i, d }) => {
      const a = classifyActor(i);
      return { id: i.id, at: i.utcDateOfIncident ?? null, type: i.incidentTypeName, place: i.place ?? null, vesselType: i.vesselType ?? null, distanceNm: Math.round(d), actor: a.actor, evidence: a.evidence };
    }),
    warnings,
    stance: stanceFrom({ strikes30d: cur.length, lastAgeDays: lastAge, premiumUp: false, hasData: input.incidents.length > 0 }),
    limits: [
      "항로선은 대표 경로 근사입니다. 실제 항차 경로·통항분리대와 다를 수 있습니다.",
      `항로에서 ${ROUTE_BUFFER_NM}해리 안 사건만 셉니다. 위치는 UKMTO 문구의 대략 좌표입니다.`,
      "UKMTO는 공격 주체를 거의 밝히지 않아 「주체 미상」이 많습니다.",
      "항행경보는 경보 위치 점들과의 거리로 근사합니다(면 안쪽 판정이 아닙니다).",
      "참고용 판단입니다. 운항 결정은 선사·보험사 기준과 함께 보세요.",
    ],
  };
}
