/**
 * 군사 훈련 경보 — 공시·OSINT·(보너스) RF 다층.
 * 항적만으로 북·중·러·이란을 서방 수준으로 “정확”히 보는 용도가 아님.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsTheater } from "@/lib/news/types";
import { newsTheaterFromCoords } from "@/lib/news/theaterMap";

export type ExerciseConfidence =
  | "announced"
  | "announced_rf"
  | "announced_osint"
  | "unverified";

export type ExerciseActor =
  | "nk"
  | "cn"
  | "ru"
  | "ir"
  | "us"
  | "rok"
  | "jp"
  | "nato"
  | "other";

export type ExerciseSource = {
  name: string;
  url?: string;
  official?: boolean;
};

export type MilitaryExercise = {
  id: string;
  title: string;
  summary: string | null;
  actors: ExerciseActor[];
  coalition: string | null;
  theater: NewsTheater | null;
  lat: number | null;
  lng: number | null;
  geojson: GeoJSON.Geometry | null;
  startsAt: string | null;
  endsAt: string | null;
  announcedAt: string | null;
  confidence: ExerciseConfidence;
  sources: ExerciseSource[];
  rfGapNote: string | null;
  active: boolean;
  ingestedAt: string;
};

export const EXERCISE_CONFIDENCE_LABEL: Record<
  ExerciseConfidence,
  { ko: string; en: string }
> = {
  announced: { ko: "확인(공시)", en: "Confirmed (announced)" },
  announced_rf: { ko: "확인+항적", en: "Confirmed + tracks" },
  announced_osint: { ko: "공시+OSINT", en: "Announced + OSINT" },
  unverified: { ko: "미확인 속보", en: "Unverified" },
};

export const EXERCISE_ACTOR_LABEL: Record<ExerciseActor, { ko: string; en: string }> = {
  nk: { ko: "북한", en: "DPRK" },
  cn: { ko: "중국", en: "China" },
  ru: { ko: "러시아", en: "Russia" },
  ir: { ko: "이란", en: "Iran" },
  us: { ko: "미국", en: "US" },
  rok: { ko: "한국", en: "ROK" },
  jp: { ko: "일본", en: "Japan" },
  nato: { ko: "NATO", en: "NATO" },
  other: { ko: "기타", en: "Other" },
};

/** 행위자별 RF 공백 고지 (양피지·호버) */
export function rfGapNoteForActors(
  actors: ExerciseActor[],
  lang: LabelLanguage = "ko",
): string | null {
  const opaque = actors.filter((a) => a === "nk" || a === "cn" || a === "ru" || a === "ir");
  if (opaque.length === 0) return null;
  const en = lang === "en";
  if (opaque.includes("nk")) {
    return en
      ? "DPRK rarely appears on public ADS-B/AIS — do not expect live tracks."
      : "북한은 공개 ADS-B/AIS에 거의 나타나지 않습니다. 항적 기대를 하지 마십시오.";
  }
  if (opaque.includes("ir") && opaque.length === 1) {
    return en
      ? "Iran often limits RF in contested airspace/seas — tracks are incomplete."
      : "이란은 분쟁 공역·해역에서 RF를 자주 제한합니다. 항적은 불완전할 수 있습니다.";
  }
  return en
    ? "CN/RU/IR often go dark during exercises — RF is a bonus, not proof."
    : "중·러·이란은 훈련 시 RF를 끄는 경우가 많습니다. 항적은 보조 신호일 뿐입니다.";
}

export function parseActorsJson(raw: string | null | undefined): ExerciseActor[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is ExerciseActor => typeof x === "string");
  } catch {
    return [];
  }
}

export function parseSourcesJson(raw: string | null | undefined): ExerciseSource[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x): x is ExerciseSource =>
        Boolean(x) && typeof x === "object" && typeof (x as ExerciseSource).name === "string",
    );
  } catch {
    return [];
  }
}

export function parseConfidence(raw: string | null | undefined): ExerciseConfidence {
  if (
    raw === "announced" ||
    raw === "announced_rf" ||
    raw === "announced_osint" ||
    raw === "unverified"
  ) {
    return raw;
  }
  return "announced";
}

/** NAVAREA 본문에서 행위자 휴리스틱 */
export function inferActorsFromText(blob: string): ExerciseActor[] {
  const t = blob.toUpperCase();
  const out = new Set<ExerciseActor>();
  if (/\b(DPRK|NORTH\s*KOREA|PRK)\b/.test(t) || /북한|조선민주주의/.test(blob)) out.add("nk");
  if (/\b(PLA|PRC|CHINA|CHINESE)\b/.test(t) || /중국|인민해방군/.test(blob)) out.add("cn");
  if (/\b(RUSSIA|RUSSIAN|RF\b)\b/.test(t) || /러시아/.test(blob)) out.add("ru");
  if (/\b(IRAN|IRGC|IRIAN)\b/.test(t) || /이란/.test(blob)) out.add("ir");
  if (/\b(UNITED\s*STATES|U\.S\.|USN|USAF|USA)\b/.test(t) || /미국/.test(blob)) out.add("us");
  if (/\b(ROK|SOUTH\s*KOREA|REPUBLIC\s*OF\s*KOREA)\b/.test(t) || /한국|대한민국/.test(blob))
    out.add("rok");
  if (/\b(JAPAN|JMSDF|JASDF)\b/.test(t) || /일본/.test(blob)) out.add("jp");
  if (/\bNATO\b/.test(t)) out.add("nato");
  return out.size ? [...out] : ["other"];
}

export function inferCoalition(actors: ExerciseActor[]): string | null {
  const set = new Set(actors);
  if (set.has("cn") && set.has("ru")) return "cn-ru";
  if (set.has("nk") && set.has("ru")) return "nk-ru";
  if (set.has("rok") && set.has("us") && set.has("jp")) return "rok-us-jp";
  if (set.has("rok") && set.has("us")) return "rok-us";
  if (set.has("us") && set.has("jp")) return "us-jp";
  if (set.has("nato")) return "nato";
  if (actors.length === 1) return `solo-${actors[0]}`;
  return null;
}

export function theaterFromExerciseCoords(
  lat: number | null,
  lng: number | null,
): NewsTheater | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return newsTheaterFromCoords(lat, lng);
}

export type ExerciseBBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/** 훈련 구역 대략 bbox (클라이언트 RF soft bump용) */
export function exerciseApproxBBox(ex: MilitaryExercise): ExerciseBBox | null {
  if (ex.geojson?.type === "Polygon") {
    const ring = ex.geojson.coordinates[0] as number[][];
    return ringToBBox(ring);
  }
  if (ex.geojson?.type === "MultiPolygon") {
    const rings = (ex.geojson.coordinates as number[][][][]).flatMap((poly) => poly[0] ?? []);
    return ringToBBox(rings);
  }
  if (ex.geojson?.type === "Point") {
    const [lng, lat] = ex.geojson.coordinates;
    if (typeof lat === "number" && typeof lng === "number") {
      return padPointBBox(lat, lng, 0.2);
    }
  }
  if (ex.lat != null && ex.lng != null) {
    return padPointBBox(ex.lat, ex.lng, 0.2);
  }
  return null;
}

function padPointBBox(lat: number, lng: number, padDeg: number): ExerciseBBox {
  return {
    minLat: lat - padDeg,
    maxLat: lat + padDeg,
    minLng: lng - padDeg,
    maxLng: lng + padDeg,
  };
}

function ringToBBox(ring: number[][] | undefined): ExerciseBBox | null {
  if (!ring?.length) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const pt of ring) {
    const lng = Number(pt[0]);
    const lat = Number(pt[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  if (!Number.isFinite(minLat)) return null;
  return { minLat, maxLat, minLng, maxLng };
}

export function pointInExerciseBBox(
  lat: number,
  lng: number,
  bbox: ExerciseBBox,
): boolean {
  return (
    lat >= bbox.minLat &&
    lat <= bbox.maxLat &&
    lng >= bbox.minLng &&
    lng <= bbox.maxLng
  );
}

/**
 * 클라이언트 soft bump: 공시/OSINT 등급 + bbox 안 ADS-B/AIS 점이 있으면 announced_rf.
 * DB는 갱신하지 않음. unverified는 올리지 않음.
 */
export function applyRfTrackBoost(
  ex: MilitaryExercise,
  tracks: ReadonlyArray<{ lat: number; lng: number }>,
): MilitaryExercise {
  if (ex.confidence === "announced_rf" || ex.confidence === "unverified") return ex;
  if (ex.confidence !== "announced" && ex.confidence !== "announced_osint") return ex;
  const bbox = exerciseApproxBBox(ex);
  if (!bbox || tracks.length === 0) return ex;
  const hit = tracks.some(
    (t) =>
      Number.isFinite(t.lat) &&
      Number.isFinite(t.lng) &&
      pointInExerciseBBox(t.lat, t.lng, bbox),
  );
  if (!hit) return ex;
  return { ...ex, confidence: "announced_rf" };
}

export function rowToMilitaryExercise(row: {
  id: string;
  title: string;
  summary: string | null;
  actorsJson: string;
  coalition: string | null;
  theater: string | null;
  lat: number | null;
  lng: number | null;
  geojson: string | null;
  startsAt: string | null;
  endsAt: string | null;
  announcedAt: string | null;
  confidence: string;
  sourcesJson: string;
  rfGapNote: string | null;
  active: number;
  ingestedAt: string;
}): MilitaryExercise {
  let geometry: GeoJSON.Geometry | null = null;
  if (row.geojson) {
    try {
      geometry = JSON.parse(row.geojson) as GeoJSON.Geometry;
    } catch {
      geometry = null;
    }
  }
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    actors: parseActorsJson(row.actorsJson),
    coalition: row.coalition,
    theater: (row.theater as NewsTheater | null) || null,
    lat: row.lat,
    lng: row.lng,
    geojson: geometry,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    announcedAt: row.announcedAt,
    confidence: parseConfidence(row.confidence),
    sources: parseSourcesJson(row.sourcesJson),
    rfGapNote: row.rfGapNote,
    active: row.active === 1,
    ingestedAt: row.ingestedAt,
  };
}
