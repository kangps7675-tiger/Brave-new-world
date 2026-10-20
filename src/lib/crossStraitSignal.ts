import type { GeoJsonGeometry, TransportPath } from "@/data/geoTypes";
import type { ChinaTheaterIncident } from "@/data/chinaTheaterIncidentsSeed";
import type { MilitaryExercise, ExerciseActor } from "@/lib/militaryExercises";
import { geometryToAccentOutlineAndHatch } from "@/lib/disputeHatch";
import type { PublicShipObservation } from "@/lib/shipMovements/types";

export const CROSS_STRAIT_SIGNAL_ATTRIBUTION = {
  name: "Cross-Strait Signal",
  url: "https://strait-signal.net",
  repository: "https://github.com/Parkemoon/cross-strait-signal",
  license: "GPL-3.0",
} as const;

export type CrossStraitIncursion = {
  date: string;
  aircraftTotal: number | null;
  aircraftIntruded: number | null;
  aircraftZones: string[];
  vesselsTotal: number | null;
  coastGuardTotal: number | null;
  sourceUrl: string | null;
};

export type CrossStraitSignalPayload = {
  exercises: MilitaryExercise[];
  incursions: CrossStraitIncursion[];
  escalationIncidents: ChinaTheaterIncident[];
  shipObservations: PublicShipObservation[];
  fetchedAt: string;
  attribution: typeof CROSS_STRAIT_SIGNAL_ATTRIBUTION;
  errors?: string[];
};

type RawExercise = {
  id?: unknown;
  name_en?: unknown;
  name_zh?: unknown;
  name_raw?: unknown;
  performer?: unknown;
  participants?: unknown;
  exercise_kind?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  location_label?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  description_en?: unknown;
  description_zh?: unknown;
  confidence?: unknown;
  article?: {
    url?: unknown;
    published_at?: unknown;
    source_name?: unknown;
  } | null;
};

type RawIncursion = {
  date?: unknown;
  aircraft_total?: unknown;
  aircraft_intruded?: unknown;
  aircraft_zones?: unknown;
  vessels_total?: unknown;
  coast_guard_total?: unknown;
  source_url?: unknown;
};

type RawArticleEntity = {
  id?: unknown;
  entity_name?: unknown;
  entity_name_en?: unknown;
  entity_type?: unknown;
  entity_role?: unknown;
  location_name?: unknown;
};

type RawArticle = {
  id?: unknown;
  url?: unknown;
  title_original?: unknown;
  title_en?: unknown;
  published_at?: unknown;
  topic_primary?: unknown;
  sentiment_score?: unknown;
  urgency?: unknown;
  summary_en?: unknown;
  is_escalation_signal?: unknown;
  escalation_note?: unknown;
  event_cluster_id?: unknown;
  source_name?: unknown;
  entities?: unknown;
};

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function actorForPerformer(performer: string): ExerciseActor {
  if (performer === "PRC") return "cn";
  if (performer === "ROC") return "other";
  if (performer === "US") return "us";
  if (performer === "JP") return "jp";
  return "other";
}

function activeAt(end: string | null, start: string | null, now = new Date()): boolean {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - 45);
  const date = new Date(`${end ?? start ?? ""}T23:59:59Z`);
  return Number.isFinite(date.getTime()) && date >= cutoff;
}

export function normalizeCrossStraitExercises(rows: unknown): MilitaryExercise[] {
  if (!Array.isArray(rows)) return [];
  const out: MilitaryExercise[] = [];
  for (const value of rows) {
    if (!value || typeof value !== "object") continue;
    const row = value as RawExercise;
    const lat = numberOrNull(row.latitude);
    const lng = numberOrNull(row.longitude);
    if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const performer = stringOrNull(row.performer) ?? "OTHER";
    const participants = Array.isArray(row.participants)
      ? row.participants.filter((v): v is string => typeof v === "string")
      : [];
    const actors = [...new Set([actorForPerformer(performer), ...participants.map(actorForPerformer)])];
    const title =
      stringOrNull(row.name_en) ??
      stringOrNull(row.name_zh) ??
      stringOrNull(row.name_raw) ??
      `Exercise ${String(row.id ?? "")}`;
    const startsAt = stringOrNull(row.start_date);
    const endsAt = stringOrNull(row.end_date);
    const articleUrl = stringOrNull(row.article?.url);
    const sourceName = stringOrNull(row.article?.source_name) ?? CROSS_STRAIT_SIGNAL_ATTRIBUTION.name;
    out.push({
      id: `css-${String(row.id ?? title)}`,
      title,
      summary: stringOrNull(row.description_en) ?? stringOrNull(row.description_zh),
      performer,
      exerciseKind: stringOrNull(row.exercise_kind),
      locationLabel: stringOrNull(row.location_label),
      actors,
      coalition: performer === "MULTI" ? participants.join("-").toLowerCase() || "multi" : null,
      theater: "china-taiwan",
      lat,
      lng,
      geojson: { type: "Point", coordinates: [lng, lat] },
      startsAt,
      endsAt,
      announcedAt: stringOrNull(row.article?.published_at) ?? startsAt,
      confidence: "announced_osint",
      sources: [
        {
          name: CROSS_STRAIT_SIGNAL_ATTRIBUTION.name,
          url: CROSS_STRAIT_SIGNAL_ATTRIBUTION.url,
          official: false,
        },
        ...(articleUrl
          ? [{ name: sourceName, url: articleUrl, official: false }]
          : []),
      ],
      rfGapNote:
        performer === "PRC"
          ? "공개 보도·분석가 승인 위치입니다. 실시간 항적이 아닙니다."
          : null,
      active: activeAt(endsAt, startsAt),
      ingestedAt: new Date().toISOString(),
    });
  }
  return out;
}

export function normalizeCrossStraitIncursions(rows: unknown): CrossStraitIncursion[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as RawIncursion;
    const date = stringOrNull(row.date);
    if (!date) return [];
    const zones = (stringOrNull(row.aircraft_zones) ?? "")
      .split(",")
      .map((zone) => zone.trim().toUpperCase())
      .filter(Boolean);
    return [{
      date,
      aircraftTotal: numberOrNull(row.aircraft_total),
      aircraftIntruded: numberOrNull(row.aircraft_intruded),
      aircraftZones: zones,
      vesselsTotal: numberOrNull(row.vessels_total),
      coastGuardTotal: numberOrNull(row.coast_guard_total),
      sourceUrl: stringOrNull(row.source_url),
    }];
  });
}

type SectorDef = {
  code: string;
  labelKo: string;
  labelEn: string;
  ring: number[][];
};

// MND의 N/C/SW/SE/E 문구를 지도에서 읽기 위한 자체 개략 구역.
// 공식 경계나 개별 항적이 아니며 데이터의 "해당 구역 활동 여부"만 시각화한다.
const INCURSION_SECTORS: SectorDef[] = [
  { code: "N", labelKo: "대만 북부", labelEn: "North of Taiwan", ring: [[120.1, 24.8], [123.5, 24.8], [123.5, 27], [120.1, 27], [120.1, 24.8]] },
  { code: "C", labelKo: "대만해협 중부", labelEn: "Central Strait", ring: [[118.7, 23.1], [121.4, 23.1], [121.4, 24.8], [118.7, 24.8], [118.7, 23.1]] },
  { code: "SW", labelKo: "대만 남서부", labelEn: "Southwest of Taiwan", ring: [[117.4, 20.5], [120.7, 20.5], [120.7, 23.2], [117.4, 23.2], [117.4, 20.5]] },
  { code: "S", labelKo: "대만 남부", labelEn: "South of Taiwan", ring: [[120.0, 20.2], [122.4, 20.2], [122.4, 22.3], [120.0, 22.3], [120.0, 20.2]] },
  { code: "SE", labelKo: "대만 남동부", labelEn: "Southeast of Taiwan", ring: [[120.7, 20.5], [123.8, 20.5], [123.8, 23.3], [120.7, 23.3], [120.7, 20.5]] },
  { code: "E", labelKo: "대만 동부", labelEn: "East of Taiwan", ring: [[121.3, 22.4], [124.2, 22.4], [124.2, 25.5], [121.3, 25.5], [121.3, 22.4]] },
];

export function buildPlaIncursionHeatPaths(
  rows: CrossStraitIncursion[],
  lang: "ko" | "en" = "ko",
): TransportPath[] {
  if (rows.length === 0) return [];
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const zone of new Set(row.aircraftZones)) {
      counts.set(zone, (counts.get(zone) ?? 0) + 1);
    }
  }
  const max = Math.max(1, ...counts.values());
  const out: TransportPath[] = [];
  for (const sector of INCURSION_SECTORS) {
    const count = counts.get(sector.code) ?? 0;
    if (count <= 0) continue;
    const ratio = count / max;
    const alpha = 0.2 + ratio * 0.58;
    const label = `${lang === "en" ? sector.labelEn : sector.labelKo} · ${count}/${rows.length}d`;
    out.push(
      ...geometryToAccentOutlineAndHatch(
        `css-adiz-${sector.code.toLowerCase()}`,
        label,
        { type: "Polygon", coordinates: [sector.ring] } as GeoJsonGeometry,
        {
          outlineKind: "dispute-zone",
          hatchKind: "conflict-hatch",
          outlineColor: `rgba(239, 68, 68, ${Math.min(0.96, alpha + 0.18).toFixed(2)})`,
          hatchColor: `rgba(239, 68, 68, ${alpha.toFixed(2)})`,
          pattern: "cross",
          preferDetailSegments: true,
        },
      ),
    );
  }
  return out;
}

type GazetteerHit = {
  lat: number;
  lng: number;
  label: string;
  precisionKm: number;
};

const LOCATION_GAZETTEER: Array<{ re: RegExp; hit: GazetteerHit }> = [
  { re: /waters east of taiwan|east(?:ern)? (?:waters|seaboard) of taiwan/i, hit: { lat: 23.5, lng: 122.5, label: "대만 동부 해역", precisionKm: 140 } },
  { re: /taiwan strait|台灣海峽|台湾海峡/i, hit: { lat: 24.0, lng: 119.5, label: "대만해협", precisionKm: 150 } },
  { re: /kinmen|金門|金门/i, hit: { lat: 24.44, lng: 118.33, label: "진먼 해역", precisionKm: 35 } },
  { re: /lanyu|orchid island|蘭嶼|兰屿/i, hit: { lat: 22.05, lng: 121.55, label: "란위 해역", precisionKm: 45 } },
  { re: /hualien|花蓮|花莲/i, hit: { lat: 23.9, lng: 121.75, label: "화롄 외해", precisionKm: 45 } },
  { re: /eluanbi|鵝鑾鼻|鹅銮鼻/i, hit: { lat: 21.9, lng: 120.95, label: "어롼비 외해", precisionKm: 55 } },
  { re: /pratas|dongsha|東沙|东沙/i, hit: { lat: 20.71, lng: 116.71, label: "둥사군도 해역", precisionKm: 55 } },
  { re: /western pacific|西太平洋/i, hit: { lat: 23.5, lng: 124.0, label: "서태평양", precisionKm: 220 } },
  { re: /east china sea|東海|东海/i, hit: { lat: 27.0, lng: 124.0, label: "동중국해", precisionKm: 240 } },
  { re: /bashi|巴士海峽|巴士海峡/i, hit: { lat: 21.0, lng: 121.5, label: "바시 해협", precisionKm: 90 } },
];

function locate(texts: Array<string | null>): GazetteerHit | null {
  const blob = texts.filter(Boolean).join(" · ");
  return LOCATION_GAZETTEER.find((entry) => entry.re.test(blob))?.hit ?? null;
}

function hashOffset(id: string): { lat: number; lng: number } {
  let hash = 2166136261;
  for (const ch of id) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return {
    lat: (((hash >>> 8) % 1000) / 1000 - 0.5) * 0.7,
    lng: (((hash >>> 18) % 1000) / 1000 - 0.5) * 0.7,
  };
}

function articleEntities(row: RawArticle): RawArticleEntity[] {
  return Array.isArray(row.entities)
    ? row.entities.filter((v): v is RawArticleEntity => Boolean(v) && typeof v === "object")
    : [];
}

function articleLocation(row: RawArticle): GazetteerHit | null {
  const entities = articleEntities(row);
  return locate([
    ...entities.map((entity) => stringOrNull(entity.location_name)),
    ...entities
      .filter((entity) => stringOrNull(entity.entity_type) === "location")
      .flatMap((entity) => [stringOrNull(entity.entity_name_en), stringOrNull(entity.entity_name)]),
    stringOrNull(row.title_en),
    stringOrNull(row.title_original),
    stringOrNull(row.summary_en),
  ]);
}

export function normalizeEscalationIncidents(articles: unknown): ChinaTheaterIncident[] {
  if (!Array.isArray(articles)) return [];
  const out: ChinaTheaterIncident[] = [];
  const clusters = new Set<string>();
  for (const value of articles) {
    if (!value || typeof value !== "object") continue;
    const row = value as RawArticle;
    if (row.is_escalation_signal !== 1 && row.is_escalation_signal !== true) continue;
    const id = String(row.id ?? "");
    if (!id) continue;
    const cluster = stringOrNull(row.event_cluster_id) ?? `article-${id}`;
    if (clusters.has(cluster)) continue;
    clusters.add(cluster);
    const located = articleLocation(row);
    const offset = hashOffset(id);
    const anchor = located ?? {
      lat: 23.85 + offset.lat,
      lng: 120.55 + offset.lng,
      label: "대만해협 앵커(위치 미확정)",
      precisionKm: 250,
    };
    const score = Math.abs(numberOrNull(row.sentiment_score) ?? 0.55);
    const urgency = stringOrNull(row.urgency);
    const note =
      stringOrNull(row.escalation_note) ??
      stringOrNull(row.summary_en) ??
      `${CROSS_STRAIT_SIGNAL_ATTRIBUTION.name} escalation signal`;
    out.push({
      id: `css-escalation-${id}`,
      dyad: "china-taiwan",
      sea: anchor.lng >= 121.3 ? "west-pacific" : "taiwan-strait",
      lat: anchor.lat,
      lng: anchor.lng,
      titleKo: stringOrNull(row.title_original) ?? stringOrNull(row.title_en) ?? "대만해협 긴장 신호",
      titleEn: stringOrNull(row.title_en) ?? stringOrNull(row.title_original) ?? "Cross-strait escalation signal",
      bodyKo: `${anchor.label} · ${CROSS_STRAIT_SIGNAL_ATTRIBUTION.name} · ${note}`,
      bodyEn: `${anchor.label} · ${CROSS_STRAIT_SIGNAL_ATTRIBUTION.name} · ${note}`,
      intensity: Math.max(0.48, Math.min(1, score + (urgency === "flash" ? 0.2 : urgency === "priority" ? 0.1 : 0))),
      ...(stringOrNull(row.url) ? { sourceUrl: stringOrNull(row.url)! } : {}),
    });
    if (out.length >= 12) break;
  }
  return out;
}

export function normalizeShipObservations(articles: unknown): PublicShipObservation[] {
  if (!Array.isArray(articles)) return [];
  const out: PublicShipObservation[] = [];
  const seen = new Set<string>();
  for (const value of articles) {
    if (!value || typeof value !== "object") continue;
    const row = value as RawArticle;
    const articleId = String(row.id ?? "");
    const hit = articleLocation(row);
    if (!articleId || !hit) continue;
    for (const entity of articleEntities(row)) {
      if (stringOrNull(entity.entity_type) !== "ship") continue;
      const vesselName = stringOrNull(entity.entity_name_en) ?? stringOrNull(entity.entity_name);
      if (!vesselName) continue;
      const key = `${articleId}:${vesselName.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const role = stringOrNull(entity.entity_role) ?? "";
      const vesselIdentity = `${role} ${vesselName}`;
      const isPrc =
        /\b(PRC|PLAN|China|Chinese)\b|中國|中国|共軍|解放軍|解放军|海警/i.test(
          vesselIdentity,
        ) &&
        !/\b(Taiwan|Taiwanese|ROC|US|U\.S\.|Japan|Japanese)\b|台灣|台湾|日本/i.test(
          vesselIdentity,
        );
      if (!isPrc) continue;
      const isCoastGuard = /coast guard|海警/i.test(vesselIdentity);
      out.push({
        id: `css-ship-${String(entity.id ?? key)}`,
        reportId: `css-article-${articleId}`,
        vesselKey: vesselName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        vesselName,
        hullNumber: null,
        navyCode: isCoastGuard ? "CN-CG" : "CN",
        navyLabel: isCoastGuard ? "중국 해경" : "중국 해군·정부선",
        title: stringOrNull(row.title_en) ?? stringOrNull(row.title_original) ?? vesselName,
        summary: stringOrNull(row.summary_en),
        locationLabel: hit.label,
        missingLocationNote: null,
        observedAt: stringOrNull(row.published_at),
        locationStatus: hit.precisionKm <= 60 ? "chokepoint" : "broad",
        confidence: "reported",
        vesselConfidence: "medium",
        method: "gazetteer-sea",
        mapEligible: true,
        lat: hit.lat,
        lng: hit.lng,
        precisionKm: hit.precisionKm,
        weekStart: null,
        source: "cross-strait-signal",
        sourceUrl: stringOrNull(row.url) ?? CROSS_STRAIT_SIGNAL_ATTRIBUTION.url,
        evidenceQuotes: [
          stringOrNull(row.escalation_note) ?? stringOrNull(row.summary_en) ?? vesselName,
        ],
      });
      if (out.length >= 30) return out;
    }
  }
  return out;
}
