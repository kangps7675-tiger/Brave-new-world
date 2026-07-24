/**
 * NAVAREA (JHOD / NGA) in-force maritime warnings → D1 snapshot replace.
 *
 * 소스(JHOD/NGA)는 상황이 생기면 그때 TXT에 추가하는 이벤트 발행이지만
 * 웹훅/푸시가 없어 멋진 신세계가 주기적으로 fetch해야만 지도에 반영된다.
 * Worker cron(*/10)은 다른 레이어 때문에 자주 돌고, 이 모듈은
 * NAVAREA_POLL_MIN_INTERVAL_MINUTES(기본 30)로 자체 스로틀한다.
 *
 * TXT → parseNavareaText → region 단위 DELETE + INSERT (append-only 금지).
 * 실패해도 메인 인제스트는 깨지지 않게 try/catch로 감싼다.
 */

import type { FeatureCollection, Geometry } from "geojson";
import {
  parseNavareaText,
  type NavareaFeatureProps,
  type NavareaRegionCode,
} from "../../../src/lib/navarea/parseNavareaText";
import type { IngestEnv } from "./env";
import { readIntVar } from "./db";

/** JHOD NAVAREA XI 공개 TXT (일본 해상보안청). URL은 env로 덮어쓰기. */
const JHOD_XI_URL_DEFAULT =
  "https://www1.kaiho.mlit.go.jp/TUHO/freetext/NavareaXI.txt";

export type NavareaFeatureRow = {
  id: string;
  region: string;
  source: string;
  warning_date: string;
  area_hint: string | null;
  description: string;
  geometry_type: string;
  geojson: string;
  radius_nm: number | null;
  lat: number | null;
  lng: number | null;
};

function centroidOfGeometry(geometry: Geometry): { lat: number; lng: number } | null {
  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates;
    if (typeof lng === "number" && typeof lat === "number") return { lat, lng };
    return null;
  }
  if (geometry.type === "LineString") {
    const coords = geometry.coordinates;
    if (coords.length === 0) return null;
    let sx = 0;
    let sy = 0;
    for (const c of coords) {
      sx += c[0] ?? 0;
      sy += c[1] ?? 0;
    }
    return { lng: sx / coords.length, lat: sy / coords.length };
  }
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0] ?? [];
    if (ring.length === 0) return null;
    let sx = 0;
    let sy = 0;
    const n = ring.length > 1 ? ring.length - 1 : ring.length;
    for (let i = 0; i < n; i++) {
      sx += ring[i]?.[0] ?? 0;
      sy += ring[i]?.[1] ?? 0;
    }
    return { lng: sx / n, lat: sy / n };
  }
  return null;
}

function featureCollectionToRows(fc: FeatureCollection): NavareaFeatureRow[] {
  const rows: NavareaFeatureRow[] = [];
  for (const f of fc.features) {
    const props = f.properties as NavareaFeatureProps | null;
    if (!props?.id || !f.geometry) continue;
    const center = centroidOfGeometry(f.geometry);
    rows.push({
      id: props.id,
      region: props.region,
      source: props.source,
      warning_date: props.date,
      area_hint: props.areaHint || null,
      description: props.description,
      geometry_type: f.geometry.type,
      geojson: JSON.stringify(f.geometry),
      radius_nm: props.radiusNm ?? null,
      lat: center?.lat ?? null,
      lng: center?.lng ?? null,
    });
  }
  return rows;
}

type NavareaFeed = {
  url: string;
  sourceHint?: "jhod" | "nga";
  jhodRegion?: NavareaRegionCode;
  label: string;
};

function resolveFeeds(env: IngestEnv): NavareaFeed[] {
  const feeds: NavareaFeed[] = [];
  const jhodUrl = (env.NAVAREA_JHOD_XI_URL || "").trim() || JHOD_XI_URL_DEFAULT;
  if (jhodUrl && jhodUrl !== "off") {
    feeds.push({
      url: jhodUrl,
      sourceHint: "jhod",
      jhodRegion: "XI",
      label: "JHOD XI",
    });
  }
  const ngaRaw = (env.NAVAREA_NGA_TXT_URLS || "").trim();
  if (ngaRaw) {
    for (const part of ngaRaw.split(",")) {
      const url = part.trim();
      if (!url) continue;
      feeds.push({ url, sourceHint: "nga", label: "NGA" });
    }
  }
  return feeds;
}

async function shouldPoll(db: D1Database, minIntervalMinutes: number): Promise<boolean> {
  try {
    const row = await db
      .prepare(`SELECT MAX(ingested_at) AS last FROM navarea_features`)
      .first<{ last: string | null }>();
    const last = row?.last;
    if (!last) return true;
    const lastMs = new Date(last).getTime();
    if (!Number.isFinite(lastMs)) return true;
    return Date.now() - lastMs >= minIntervalMinutes * 60 * 1000;
  } catch {
    return true;
  }
}

async function fetchFeedText(
  feed: NavareaFeed,
): Promise<{ text: string; error?: string }> {
  try {
    const res = await fetch(feed.url, {
      headers: {
        Accept: "text/plain, text/*, */*",
        "User-Agent":
          "BraveNewWorld-Ingest/1.0 (+contact: kangps7675@gmail.com; NAVAREA situational dashboard)",
      },
    });
    if (!res.ok) return { text: "", error: `${feed.label} HTTP ${res.status}` };
    return { text: await res.text() };
  } catch (error) {
    return {
      text: "",
      error: error instanceof Error ? error.message : `${feed.label} fetch failed`,
    };
  }
}

/** 스냅샷 원자 교체 — region 단위 DELETE 후 INSERT */
export async function replaceNavareaSnapshot(
  db: D1Database,
  rows: NavareaFeatureRow[],
  regions: string[],
): Promise<number> {
  const ingestedAt = new Date().toISOString();
  const stmts: D1PreparedStatement[] = [];

  for (const region of regions) {
    stmts.push(db.prepare(`DELETE FROM navarea_features WHERE region = ?1`).bind(region));
  }

  for (const row of rows) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO navarea_features (
             id, region, source, warning_date, area_hint, description,
             geometry_type, geojson, radius_nm, lat, lng, ingested_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
        )
        .bind(
          row.id,
          row.region,
          row.source,
          row.warning_date,
          row.area_hint,
          row.description,
          row.geometry_type,
          row.geojson,
          row.radius_nm,
          row.lat,
          row.lng,
          ingestedAt,
        ),
    );
  }

  if (stmts.length === 0) return 0;
  await db.batch(stmts);
  return rows.length;
}

export async function fetchAndReplaceNavarea(env: IngestEnv): Promise<{
  count: number;
  fetched: number;
  errors: string[];
  skipped: boolean;
}> {
  const enabled = (env.NAVAREA_INGEST_ENABLED ?? "true").trim().toLowerCase();
  if (enabled === "0" || enabled === "false" || enabled === "off") {
    return { count: 0, fetched: 0, errors: [], skipped: true };
  }

  const minInterval = Math.max(15, readIntVar(env.NAVAREA_POLL_MIN_INTERVAL_MINUTES, 30));
  if (!(await shouldPoll(env.DB, minInterval))) {
    return { count: 0, fetched: 0, errors: [], skipped: true };
  }

  const feeds = resolveFeeds(env);
  if (feeds.length === 0) {
    return { count: 0, fetched: 0, errors: ["no NAVAREA feed URLs configured"], skipped: false };
  }

  const errors: string[] = [];
  const allRows: NavareaFeatureRow[] = [];
  const regions = new Set<string>();
  let fetched = 0;

  for (const feed of feeds) {
    const { text, error } = await fetchFeedText(feed);
    if (error || !text) {
      if (error) errors.push(error);
      continue;
    }
    fetched += 1;
    try {
      const fc = parseNavareaText(text, {
        source: feed.sourceHint,
        jhodRegion: feed.jhodRegion,
      });
      const rows = featureCollectionToRows(fc);
      // 성공한 피드의 리전은 feature 0건이어도 DELETE 대상에 넣는다
      // (안 그러면 전부 CANCEL된 스냅샷에서 죽은 지오메트리가 남음)
      if (feed.jhodRegion) regions.add(feed.jhodRegion);
      for (const row of rows) {
        regions.add(row.region);
        allRows.push(row);
      }
      if (rows.length === 0 && !feed.jhodRegion) {
        const fromText = text.match(/NAVAREA\s+([IVXLCDM]+)\s+(?:IN FORCE|IV|XII|\d)/i);
        if (fromText?.[1]) regions.add(fromText[1].toUpperCase());
      }
    } catch (err) {
      errors.push(
        `${feed.label} parse: ${err instanceof Error ? err.message : "parse failed"}`,
      );
    }
  }

  // 동일 id 중복 시 마지막 피드 승
  const byId = new Map<string, NavareaFeatureRow>();
  for (const row of allRows) byId.set(row.id, row);
  const deduped = [...byId.values()];

  try {
    const count = await replaceNavareaSnapshot(env.DB, deduped, [...regions]);
    return { count, fetched, errors, skipped: false };
  } catch (err) {
    return {
      count: 0,
      fetched,
      errors: [
        ...errors,
        err instanceof Error ? err.message : "navarea D1 replace failed",
      ],
      skipped: false,
    };
  }
}
