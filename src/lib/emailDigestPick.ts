/**
 * 하루 다이제스트에 넣을 사건·보험료를 고른다.
 * 워커에서 그대로 import 하므로 앱 별칭(@/)을 쓰지 않는다.
 */
import { classifySecurity } from "./navarea/msiNga";
import { ngaAreaLabel } from "./incidentStack/ngaArea";
import {
  extractVesselName,
  isUkmtoAttackType,
  realVesselName,
} from "./incidentStack/shipText";
import {
  isDigestRegion,
  type DigestIncident,
  type DigestLang,
  type DigestQuote,
} from "./emailDigest";
import { parseTime } from "./provenance";

const OVERLAP_MS = 72 * 3_600_000;
const OVERLAP_NM = 40;
const STALE_MS = 7 * 24 * 3_600_000;

const TYPE_KO: Record<string, string> = {
  Hijack: "납치·하이재킹",
  Boarding: "무단 승선",
  Attack: "공격",
  Robbery: "강도",
  Kidnap: "납치",
  Piracy: "해적 행위",
  "Fired Upon": "피격",
  "Attempted Boarding": "승선 시도",
  "Sea Robbery": "해상 강도",
};

const VESSEL_KO: Record<string, string> = {
  tanker: "유조선",
  cargo: "화물선",
  container: "컨테이너선",
  "container ship": "컨테이너선",
  bulk: "벌크선",
  "bulk carrier": "벌크선",
  merchant: "상선",
  "lng tanker": "LNG 운반선",
  fishing: "어선",
};

/** ukmtoHatch.localizeUkmtoPlaceText 와 같은 표기 */
const PLACE_KO: Array<[RegExp, string]> = [
  [/\bGulf of Aden\b/gi, "아덴만"],
  [/\bRed Sea\b/gi, "홍해"],
  [/\bBab el[\s-]?Mandeb\b/gi, "바브엘만데브"],
  [/\bStrait of Hormuz\b/gi, "호르무즈 해협"],
  [/\bPersian Gulf\b/gi, "페르시아만"],
  [/\bArabian Sea\b/gi, "아라비아해"],
  [/\bIndian Ocean\b/gi, "인도양"],
  [/\bSomalia\b/gi, "소말리아"],
  [/\bYemen\b/gi, "예멘"],
  [/\bOman\b/gi, "오만"],
  [/\bDjibouti\b/gi, "지부티"],
  [/\bOff\b/gi, "앞바다"],
];

export type UkmtoDigestRow = {
  id: string;
  incidentTypeName: string;
  place: string | null;
  region: string | null;
  vesselName: string | null;
  vesselType: string | null;
  utcDateOfIncident: string | null;
  utcDateCreated: string | null;
  firstSeenAt: string | null;
  lat: number;
  lng: number;
};

export type NgaDigestRow = {
  id: string;
  description: string;
  warningDate: string;
  lat: number | null;
  lng: number | null;
};

export type QuoteDigestRow = {
  region: string;
  ratePct: number | null;
  rateHighPct: number | null;
  ratePrevPct: number | null;
  direction: string | null;
  outlet: string | null;
  headline: string;
  url: string;
  publishedAt: string | null;
  ingestedAt: string | null;
};

type Pointed = DigestIncident & { at: number; lat: number; lng: number };

function placeKo(text: string, lang: DigestLang): string {
  if (lang === "en") return text;
  let out = text;
  for (const [re, ko] of PLACE_KO) out = out.replace(re, ko);
  return out.replace(/\s{2,}/g, " ").trim();
}

function separationNm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return Math.hypot(
    (a.lat - b.lat) * 60,
    (a.lng - b.lng) * 60 * Math.cos((b.lat * Math.PI) / 180),
  );
}

/** 화면 스택과 같음: 같은 시각 72시간·약 40해리 안의 NGA는 UKMTO와 겹치면 뺀다. */
export function omitNgaNearUkmto(items: Pointed[]): Pointed[] {
  const uk = items.filter((i) => i.source === "UKMTO");
  return items.filter((n) => {
    if (n.source !== "NGA") return true;
    return !uk.some(
      (u) => Math.abs(u.at - n.at) < OVERLAP_MS && separationNm(u, n) < OVERLAP_NM,
    );
  });
}

function inWindow(value: string | null | undefined, startMs: number, endMs: number): number | null {
  const t = parseTime(value);
  if (t == null || t < startMs || t >= endMs) return null;
  return t;
}

function directionOf(raw: string | null): DigestQuote["direction"] {
  if (raw === "up" || raw === "down" || raw === "flat") return raw;
  return null;
}

/**
 * 창 안에 새로 확인된 피습만. Advisory·의심활동·7일보다 오래된 발생·NGA 사고(표류만)는 빼다.
 * NGA는 피습("SECURITY INCIDENT")만, 선박명은 동사 앞에서 자른다.
 */
export function pickDigestIncidents(
  ukmto: UkmtoDigestRow[],
  nga: NgaDigestRow[],
  window: { startMs: number; endMs: number },
  lang: DigestLang,
): DigestIncident[] {
  const pointed: Pointed[] = [];

  for (const u of ukmto) {
    if (!isUkmtoAttackType(u.incidentTypeName)) continue;
    if (!Number.isFinite(u.lat) || !Number.isFinite(u.lng)) continue;
    if (inWindow(u.firstSeenAt, window.startMs, window.endMs) == null) continue;
    const at = parseTime(u.utcDateOfIncident);
    if (at == null) continue;
    if (window.endMs - at > STALE_MS) continue;
    const type = u.incidentTypeName.trim();
    const typeLabel = lang === "ko" ? (TYPE_KO[type] ?? type) : type;
    const vessel = u.vesselType?.trim();
    const vesselLabel = lang === "ko" && vessel ? (VESSEL_KO[vessel.toLowerCase()] ?? vessel) : vessel;
    const name = realVesselName(u.vesselName);
    const title = [typeLabel, vesselLabel, name].filter((p): p is string => Boolean(p && p.trim())).join(" · ");
    const placeRaw = u.place?.trim() || u.region?.trim() || "";
    pointed.push({
      source: "UKMTO",
      at,
      lat: u.lat,
      lng: u.lng,
      title,
      place: placeKo(placeRaw, lang),
      occurredAt: u.utcDateOfIncident,
      publishedAt: u.utcDateCreated,
      firstSeenAt: u.firstSeenAt,
    });
  }

  const seenNga = new Set<string>();
  for (const n of nga) {
    const base = n.id.split("#")[0]!;
    if (seenNga.has(base)) continue;
    if (n.lat == null || n.lng == null || !Number.isFinite(n.lat) || !Number.isFinite(n.lng)) continue;
    const at = inWindow(n.warningDate, window.startMs, window.endMs);
    if (at == null) continue;
    if (classifySecurity(n.description) !== "hostile") continue;
    seenNga.add(base);
    const text = n.description.replace(/\s+/g, " ").trim();
    const name = extractVesselName(text);
    pointed.push({
      source: "NGA",
      at,
      lat: n.lat,
      lng: n.lng,
      title:
        lang === "ko"
          ? name
            ? `보안 사건 · ${name}`
            : "보안 사건"
          : name
            ? `Security incident · ${name}`
            : "Security incident",
      place: ngaAreaLabel(text),
      occurredAt: n.warningDate,
      publishedAt: n.warningDate,
      firstSeenAt: null,
    });
  }

  return omitNgaNearUkmto(pointed)
    .sort((a, b) => b.at - a.at)
    .map(({ source, title, place, occurredAt, publishedAt, firstSeenAt }) => ({
      source,
      title,
      place,
      occurredAt,
      publishedAt,
      firstSeenAt,
    }));
}

/** 창 안에 새로 저장된 보도 수치. 해역별 최신 한 건. 시세 칸에 없는 해역은 뺀다. */
export function pickDigestQuotes(
  rows: QuoteDigestRow[],
  window: { startMs: number; endMs: number },
): DigestQuote[] {
  const by = new Map<string, QuoteDigestRow>();
  for (const q of rows) {
    if (q.ratePct === null || !isDigestRegion(q.region)) continue;
    if (inWindow(q.ingestedAt, window.startMs, window.endMs) == null) continue;
    const cur = by.get(q.region);
    if (!cur) {
      by.set(q.region, q);
      continue;
    }
    const tq = parseTime(q.publishedAt) ?? parseTime(q.ingestedAt) ?? 0;
    const tc = parseTime(cur.publishedAt) ?? parseTime(cur.ingestedAt) ?? 0;
    if (tq >= tc) by.set(q.region, q);
  }
  return [...by.values()]
    .sort((a, b) => (parseTime(b.publishedAt) ?? 0) - (parseTime(a.publishedAt) ?? 0))
    .map((q) => ({
      region: q.region,
      ratePct: q.ratePct,
      rateHighPct: q.rateHighPct,
      ratePrevPct: q.ratePrevPct,
      direction: directionOf(q.direction),
      outlet: q.outlet,
      headline: q.headline,
      url: q.url,
      publishedAt: q.publishedAt,
    }));
}
