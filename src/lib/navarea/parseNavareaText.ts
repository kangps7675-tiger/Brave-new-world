/**
 * NAVAREA 텍스트 파서 (JHOD / NGA 등 소스 자동 감지)
 * - 무료 TXT 소스(JHOD, NGA 등)를 fetch한 결과를 넣으면
 *   "현재 유효한(in-force)" 경고만 걸러서 GeoJSON FeatureCollection으로 변환한다.
 *
 * 소스별 in-force 판정 방식이 다름:
 *   - JHOD (NAVAREA XI 등): "WARNING MESSAGES IN FORCE" 블록에 유효 ID 번호 목록이 별도로 있음
 *     → 그 스냅샷 + 스냅샷 발행일 이후 신규 메시지를 후보로 삼고, CANCEL 언급된 건 제외
 *   - NGA (NAVAREA IV/XII): 상단에 "NAVAREA IV IN FORCE AS OF ..."라고만 쓰여있고
 *     그 아래 나열된 메시지 전체가 이미 in-force 스냅샷임 (별도 번호 리스트 없음)
 *     → 전체를 후보로 삼고, CANCEL 언급된 건만 제외하면 됨 (스냅샷 교집합 단계 스킵)
 *
 * id는 리전 prefix 포함 — `XI-26-0330` / `IV-26-0695` (IV·XI 충돌 방지)
 *
 * 사용처: Cloudflare Worker cron ingest → D1 "스냅샷 교체" 방식으로 upsert
 * (append-only로 쌓지 말 것 — 죽은 지오메트리가 안 빠짐)
 */

import type { Feature, FeatureCollection, Geometry } from "geojson";

export type NavareaSource = "jhod" | "nga";

/** NAVAREA 리전 코드 (로마 숫자·문자). JHOD 기본 XI. */
export type NavareaRegionCode = string;

export interface NavareaFeatureProps {
  id: string;
  date: string;
  areaHint: string;
  description: string;
  region: NavareaRegionCode;
  source: NavareaSource;
  /** RADIUS OF N MILE — Point 중심일 때 렌더 버퍼용 */
  radiusNm?: number;
}

interface RawBlock {
  id: string;
  yy: string;
  num: string;
  dateISO: string;
  body: string;
  region: NavareaRegionCode;
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

const JHOD_HEADER_RE =
  /NO\.(\d{2})-(\d{4})\s+Date:(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2})\s+UTC/g;

const NGA_HEADER_RE =
  /(\d{2})(\d{2})(\d{2})Z\s+([A-Z]{3})\s+(\d{2})\s*\n\s*NAVAREA\s+([IVXLCDM]+)\s+(\d+)\/(\d{2})(?:\(\w+\))?\.?/g;

const COORD_RE = /(\d{1,3})-(\d{2})(?:\.(\d+)|-(\d{2}))?([NSEW])/g;

const JHOD_DETECT_RE = /NO\.\d{2}-\d{4}\s+Date:\d{4}\/\d{2}\/\d{2}\s+\d{2}\s+UTC/;

export function detectSource(text: string): NavareaSource {
  return JHOD_DETECT_RE.test(text) ? "jhod" : "nga";
}

function regionPrefixedId(region: NavareaRegionCode, yy: string, num: string): string {
  return `${region}-${yy}-${num}`;
}

export function splitJhodBlocks(
  text: string,
  region: NavareaRegionCode = "XI",
): RawBlock[] {
  const matches = [...text.matchAll(JHOD_HEADER_RE)];
  const blocks: RawBlock[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (!m) continue;
    const [, yy, num, yyyy, mm, dd, hh] = m;
    if (!yy || !num || !yyyy || !mm || !dd || !hh) continue;
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1]?.index ?? text.length) : text.length;
    const body = text.slice(start, end).trim();

    blocks.push({
      id: regionPrefixedId(region, yy, num),
      yy,
      num,
      dateISO: `${yyyy}-${mm}-${dd}T${hh}:00:00Z`,
      body,
      region,
    });
  }
  return blocks;
}

function splitNgaBlocks(text: string): RawBlock[] {
  const matches = [...text.matchAll(NGA_HEADER_RE)];
  const blocks: RawBlock[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (!m) continue;
    const [, dd, hh, mi, monStr, yy, regionRaw, num, msgYy] = m;
    if (!dd || !hh || !mi || !monStr || !yy || !regionRaw || !num || !msgYy) continue;
    const region = regionRaw.toUpperCase();
    const monthIdx = MONTHS.indexOf(monStr as (typeof MONTHS)[number]);
    const yyyy = 2000 + parseInt(yy, 10);
    const dateISO =
      monthIdx >= 0
        ? new Date(
            Date.UTC(yyyy, monthIdx, parseInt(dd, 10), parseInt(hh, 10), parseInt(mi, 10)),
          ).toISOString()
        : `${yyyy}-01-01T00:00:00Z`;

    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1]?.index ?? text.length) : text.length;
    const body = text.slice(start, end).trim();
    const padded = num.padStart(4, "0");

    blocks.push({
      id: regionPrefixedId(region, msgYy, padded),
      yy: msgYy,
      num: padded,
      dateISO,
      body,
      region,
    });
  }
  return blocks;
}

export function extractInForceSnapshot(blocks: RawBlock[]): {
  ids: Set<string>;
  bulletinDate: string | null;
} {
  const bulletin = blocks.find((b) => b.body.includes("WARNING MESSAGES IN FORCE"));
  if (!bulletin) return { ids: new Set(), bulletinDate: null };

  const listMatch = bulletin.body.match(/((?:\d{4}\s+)*\d{4})\/(\d{2})\./);
  const ids = new Set<string>();
  if (listMatch?.[1] && listMatch[2]) {
    const nums = listMatch[1].split(/\s+/);
    const yy = listMatch[2];
    for (const n of nums) {
      if (n) ids.add(regionPrefixedId(bulletin.region, yy, n));
    }
  }
  return { ids, bulletinDate: bulletin.dateISO };
}

export function extractCancelledIds(blocks: RawBlock[]): Set<string> {
  const cancelled = new Set<string>();

  for (const block of blocks) {
    const cancelClauses = block.body.matchAll(
      /CANCEL\s+(?:NAVAREA\s+[IVXLCDM]+\s+)?([\d\s,\/]+?)\.(?:\s|$)/gi,
    );

    for (const clause of cancelClauses) {
      const raw = clause[1];
      if (!raw) continue;
      const tokens = [...raw.matchAll(/(\d+)(?:\/(\d{2}))?/g)];

      let lastYear: string | null = null;
      const resolved: { num: string; yy: string | null }[] = tokens.map((t) => ({
        num: (t[1] ?? "0").padStart(4, "0"),
        yy: t[2] ?? null,
      }));
      for (let i = resolved.length - 1; i >= 0; i--) {
        const row = resolved[i];
        if (!row) continue;
        if (row.yy) lastYear = row.yy;
        else row.yy = lastYear;
      }
      for (const r of resolved) {
        if (r.yy) cancelled.add(regionPrefixedId(block.region, r.yy, r.num));
      }
    }

    const selfExpire = block.body.match(
      /CANCEL THIS MSG\s+(\d{2})(\d{2})(\d{2})Z\s+([A-Z]{3})(?:\s+(\d{2}))?/,
    );
    if (selfExpire) {
      const [, dd, hh, mi, monStr, explicitYy] = selfExpire;
      if (dd && hh && mi && monStr) {
        const monthIdx = MONTHS.indexOf(monStr as (typeof MONTHS)[number]);
        if (monthIdx >= 0) {
          const year = 2000 + parseInt(explicitYy ?? block.yy, 10);
          const expiry = new Date(
            Date.UTC(year, monthIdx, parseInt(dd, 10), parseInt(hh, 10), parseInt(mi, 10)),
          );
          if (expiry.getTime() <= Date.now()) {
            cancelled.add(block.id);
          }
        }
      }
    }

    if (/AND THIS MSG/i.test(block.body)) {
      cancelled.add(block.id);
    }
  }

  return cancelled;
}

function dmsToDecimal(
  deg: string,
  min: string,
  dec: string | undefined,
  sec: string | undefined,
  hemi: string,
): number {
  const m = dec !== undefined ? parseFloat(`${min}.${dec}`) : parseInt(min, 10);
  const s = sec !== undefined ? parseInt(sec, 10) : 0;
  let val = parseInt(deg, 10) + m / 60 + s / 3600;
  if (hemi === "S" || hemi === "W") val *= -1;
  return val;
}

function extractCoordPairs(body: string): [number, number][] {
  const tokens = [...body.matchAll(COORD_RE)];
  const pairs: [number, number][] = [];

  for (let i = 0; i < tokens.length - 1; i += 2) {
    const lat = tokens[i];
    const lon = tokens[i + 1];
    if (!lat || !lon) break;
    if (!"NS".includes(lat[5] ?? "") || !"EW".includes(lon[5] ?? "")) continue;

    const latVal = dmsToDecimal(lat[1]!, lat[2]!, lat[3], lat[4], lat[5]!);
    const lonVal = dmsToDecimal(lon[1]!, lon[2]!, lon[3], lon[4], lon[5]!);
    pairs.push([lonVal, latVal]);
  }
  return pairs;
}

function extractRadiusNm(body: string): number | undefined {
  const m = body.match(/RADIUS OF\s+([\d.]+)\s*MILE/i);
  if (!m?.[1]) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

function buildGeometry(body: string): Geometry | null {
  const coords = extractCoordPairs(body);
  if (coords.length === 0) return null;

  // JHOD: "AREA BOUNDED BY" / NGA: "AREA(S) BOUND BY" (괄호·복수·-ED 유무)
  if (/AREA(?:\(S\)|S)?\s+BOUND(?:ED)?\s+BY/i.test(body)) {
    const ring = [...coords];
    if (ring.length > 1) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
        ring.push(first);
      }
    }
    return { type: "Polygon", coordinates: [ring] };
  }

  if (/LINE JOINING/i.test(body)) {
    return { type: "LineString", coordinates: coords };
  }

  if (/RADIUS OF\s+([\d.]+)\s*MILE/i.test(body)) {
    return { type: "Point", coordinates: coords[0]! };
  }

  return { type: "Point", coordinates: coords[0]! };
}

function extractAreaHint(body: string): string {
  const firstLine = body.split("\n")[0]?.trim() ?? "";
  return /^[A-Z0-9,.\s-]+\.$/.test(firstLine) ? firstLine : "";
}

export type ParseNavareaOptions = {
  source?: NavareaSource;
  /** JHOD 기본 리전 (기본 XI). NGA는 헤더에서 추출. */
  jhodRegion?: NavareaRegionCode;
};

export function parseNavareaText(
  text: string,
  opts?: ParseNavareaOptions,
): FeatureCollection {
  const source = opts?.source ?? detectSource(text);
  const jhodRegion = opts?.jhodRegion ?? "XI";
  const blocks =
    source === "jhod" ? splitJhodBlocks(text, jhodRegion) : splitNgaBlocks(text);
  const cancelledIds = extractCancelledIds(blocks);
  const activeIds = new Set<string>();

  if (source === "jhod") {
    const { ids: inForceIds, bulletinDate } = extractInForceSnapshot(blocks);
    for (const b of blocks) {
      const isBulletinItself = b.body.includes("WARNING MESSAGES IN FORCE");
      if (isBulletinItself) continue;

      const isInSnapshot = inForceIds.has(b.id);
      const isNewerThanSnapshot = bulletinDate ? b.dateISO > bulletinDate : true;

      if ((isInSnapshot || isNewerThanSnapshot) && !cancelledIds.has(b.id)) {
        activeIds.add(b.id);
      }
    }
  } else {
    for (const b of blocks) {
      if (!cancelledIds.has(b.id)) activeIds.add(b.id);
    }
  }

  const features: Feature[] = [];

  for (const b of blocks) {
    if (!activeIds.has(b.id)) continue;
    const geometry = buildGeometry(b.body);
    if (!geometry) continue;

    const radiusNm = extractRadiusNm(b.body);
    const props: NavareaFeatureProps = {
      id: b.id,
      date: b.dateISO,
      areaHint: extractAreaHint(b.body),
      description: b.body.replace(/\n/g, " ").trim(),
      region: b.region,
      source,
      ...(radiusNm != null ? { radiusNm } : {}),
    };

    features.push({
      type: "Feature",
      geometry,
      properties: props,
    });
  }

  return { type: "FeatureCollection", features };
}
