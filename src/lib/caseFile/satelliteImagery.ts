/**
 * Copernicus Data Space (Sentinel Hub API) — 사건 전후 위성 장면.
 *
 * 1. Catalog로 사건 전(최대 30일)·후(최대 20일) Sentinel-2 장면 후보를 찾는다.
 * 2. Statistical API로 사건 지점 주변만의 구름 비율(SCL 구름·그림자 픽셀)을 계산한다.
 *    타일 전체 구름 비율(eo:cloud_cover)은 사건 지점과 무관할 수 있어 보조로만 쓴다.
 * 3. 가장 가까운 "맑은" 장면으로 전후 이미지를 잘라 받는다.
 * 4. 광학이 구름에 가리면 Sentinel-1 레이더(구름 통과) 전후 쌍을 대신 받는다.
 *
 * 필요한 환경 변수: CDSE_CLIENT_ID, CDSE_CLIENT_SECRET
 * (dataspace.copernicus.eu → Sentinel Hub 대시보드 → OAuth client)
 */

const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const SH_BASE = "https://sh.dataspace.copernicus.eu";
const CRS_4326 = "http://www.opengis.net/def/crs/EPSG/0/4326";
const FETCH_TIMEOUT_MS = 20_000;

export const SATELLITE_BEFORE_DAYS = 30;
export const SATELLITE_AFTER_DAYS = 20;
/** 사건 지점 구름 비율이 이 이하면 "맑음" */
export const CLEAR_SKY_MAX_CLOUD = 0.3;
/** 이 이상이면 광학으로는 확인 불가 */
export const CLOUD_BLOCKED_MIN = 0.6;
/** 잘라 받는 영역 반경 (km) — 10m 해상도에서 512px ≈ 5km */
export const CHIP_RADIUS_KM = 2.5;
const CHIP_PX = 512;
const MAX_CLOUD_CHECKS_PER_SIDE = 4;

export type SatelliteCollection = "sentinel-2-l2a" | "sentinel-1-grd";

export type SatelliteScene = {
  collection: SatelliteCollection;
  sceneId: string;
  datetime: string;
  /** 타일 전체 구름 비율 0–1 (S2만) */
  cloudTile: number | null;
  /** 사건 지점 주변 구름 비율 0–1 (S2만, 계산 실패 시 null) */
  cloudLocal: number | null;
};

export type SatelliteChip = SatelliteScene & {
  png: ArrayBuffer;
};

export type SatellitePairResult = {
  bbox: [number, number, number, number];
  optical: { before: SatelliteChip | null; after: SatelliteChip | null };
  sar: { before: SatelliteChip | null; after: SatelliteChip | null } | null;
  /** 장면 후보 수 (사건 전/후) */
  candidates: { before: number; after: number };
  notes: string[];
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export function satelliteCredentialsConfigured(): boolean {
  return Boolean(process.env.CDSE_CLIENT_ID?.trim() && process.env.CDSE_CLIENT_SECRET?.trim());
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;
  const id = process.env.CDSE_CLIENT_ID?.trim();
  const secret = process.env.CDSE_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new Error("CDSE_CLIENT_ID / CDSE_CLIENT_SECRET 미설정 — 위성 조회 불가");
  const res = await fetchWithTimeout(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Copernicus 인증 실패 HTTP ${res.status}`);
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("Copernicus 인증 응답에 토큰 없음");
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 300) * 1000,
  };
  return cachedToken.value;
}

export function chipBbox(lat: number, lng: number, radiusKm = CHIP_RADIUS_KM): [number, number, number, number] {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

type CatalogFeature = {
  id?: string;
  properties?: { datetime?: string; "eo:cloud_cover"?: number };
};

async function searchCatalog(
  token: string,
  collection: SatelliteCollection,
  bbox: [number, number, number, number],
  fromIso: string,
  toIso: string,
): Promise<SatelliteScene[]> {
  const res = await fetchWithTimeout(`${SH_BASE}/api/v1/catalog/1.0.0/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      bbox,
      datetime: `${fromIso}/${toIso}`,
      collections: [collection],
      limit: 50,
    }),
  });
  if (!res.ok) throw new Error(`Copernicus 장면 검색 실패 HTTP ${res.status}`);
  const body = (await res.json()) as { features?: CatalogFeature[] };
  const seen = new Set<string>();
  const scenes: SatelliteScene[] = [];
  for (const f of body.features ?? []) {
    const dt = f.properties?.datetime;
    if (!f.id || !dt || !Number.isFinite(Date.parse(dt))) continue;
    // 같은 날 인접 타일은 하나로
    const day = dt.slice(0, 10);
    if (seen.has(day)) continue;
    seen.add(day);
    const cc = f.properties?.["eo:cloud_cover"];
    scenes.push({
      collection,
      sceneId: f.id,
      datetime: new Date(Date.parse(dt)).toISOString(),
      cloudTile: typeof cc === "number" ? Math.round(cc) / 100 : null,
      cloudLocal: null,
    });
  }
  return scenes;
}

function dayRange(datetime: string): { from: string; to: string } {
  const day = datetime.slice(0, 10);
  return { from: `${day}T00:00:00Z`, to: `${day}T23:59:59Z` };
}

const CLOUD_EVALSCRIPT = `//VERSION=3
function setup(){return{input:[{bands:["SCL","dataMask"]}],output:[{id:"cloud",bands:1,sampleType:"FLOAT32"},{id:"dataMask",bands:1}]}}
function evaluatePixel(s){var c=(s.SCL===3||s.SCL===8||s.SCL===9||s.SCL===10)?1:0;return{cloud:[c],dataMask:[s.dataMask]}}`;

/** 사건 지점 주변 구름·그림자 픽셀 비율 */
async function localCloudFraction(
  token: string,
  bbox: [number, number, number, number],
  datetime: string,
): Promise<number | null> {
  const { from, to } = dayRange(datetime);
  try {
    const res = await fetchWithTimeout(`${SH_BASE}/api/v1/statistics`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          bounds: { bbox, properties: { crs: CRS_4326 } },
          data: [{ type: "sentinel-2-l2a", dataFilter: { timeRange: { from, to } } }],
        },
        aggregation: {
          timeRange: { from, to },
          aggregationInterval: { of: "P1D" },
          evalscript: CLOUD_EVALSCRIPT,
          width: 64,
          height: 64,
        },
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Array<{ outputs?: { cloud?: { bands?: { B0?: { stats?: { mean?: number } } } } } }>;
    };
    const mean = body.data?.[0]?.outputs?.cloud?.bands?.B0?.stats?.mean;
    return typeof mean === "number" && Number.isFinite(mean) ? Math.round(mean * 100) / 100 : null;
  } catch {
    return null;
  }
}

const TRUE_COLOR_EVALSCRIPT = `//VERSION=3
function setup(){return{input:["B02","B03","B04","dataMask"],output:{bands:4}}}
function evaluatePixel(s){return[2.5*s.B04,2.5*s.B03,2.5*s.B02,s.dataMask]}`;

const SAR_EVALSCRIPT = `//VERSION=3
function setup(){return{input:["VV","dataMask"],output:{bands:2}}}
function evaluatePixel(s){var db=10*Math.log(Math.max(s.VV,0.0001))/Math.LN10;var v=Math.max(0,Math.min(1,(db+25)/25));return[v,s.dataMask]}`;

async function renderChip(
  token: string,
  scene: SatelliteScene,
  bbox: [number, number, number, number],
): Promise<ArrayBuffer | null> {
  const { from, to } = dayRange(scene.datetime);
  const isOptical = scene.collection === "sentinel-2-l2a";
  const res = await fetchWithTimeout(`${SH_BASE}/api/v1/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify({
      input: {
        bounds: { bbox, properties: { crs: CRS_4326 } },
        data: [
          {
            type: scene.collection,
            dataFilter: {
              timeRange: { from, to },
              ...(isOptical ? { mosaickingOrder: "leastCC" } : {}),
            },
          },
        ],
      },
      output: {
        width: CHIP_PX,
        height: CHIP_PX,
        responses: [{ identifier: "default", format: { type: "image/png" } }],
      },
      evalscript: isOptical ? TRUE_COLOR_EVALSCRIPT : SAR_EVALSCRIPT,
    }),
  });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return buf.byteLength > 64 ? buf : null;
}

/**
 * 후보 중 사건 시각에 가까운 순으로 지점 구름을 재고, 맑은 첫 장면(없으면 가장 덜 흐린 장면).
 */
async function pickClearest(
  token: string,
  scenes: SatelliteScene[],
  bbox: [number, number, number, number],
): Promise<SatelliteScene | null> {
  const measured: SatelliteScene[] = [];
  for (const scene of scenes.slice(0, MAX_CLOUD_CHECKS_PER_SIDE)) {
    const cloudLocal = await localCloudFraction(token, bbox, scene.datetime);
    const s = { ...scene, cloudLocal };
    measured.push(s);
    const cloud = cloudLocal ?? scene.cloudTile;
    if (cloud != null && cloud <= CLEAR_SKY_MAX_CLOUD) return s;
  }
  if (!measured.length) return null;
  return [...measured].sort(
    (a, b) => (a.cloudLocal ?? a.cloudTile ?? 1) - (b.cloudLocal ?? b.cloudTile ?? 1),
  )[0]!;
}

function splitAround(scenes: SatelliteScene[], incidentMs: number) {
  const before = scenes
    .filter((s) => Date.parse(s.datetime) < incidentMs)
    .sort((a, b) => b.datetime.localeCompare(a.datetime));
  const after = scenes
    .filter((s) => Date.parse(s.datetime) > incidentMs)
    .sort((a, b) => a.datetime.localeCompare(b.datetime));
  return { before, after };
}

export function opticalCloudBlocked(scene: SatelliteScene | null): boolean {
  if (!scene) return false;
  const c = scene.cloudLocal ?? scene.cloudTile;
  return c != null && c >= CLOUD_BLOCKED_MIN;
}

export async function fetchSatellitePair(args: {
  lat: number;
  lng: number;
  incidentIso: string;
}): Promise<SatellitePairResult> {
  const token = await accessToken();
  const incidentMs = Date.parse(args.incidentIso);
  const bbox = chipBbox(args.lat, args.lng);
  const fromIso = new Date(incidentMs - SATELLITE_BEFORE_DAYS * 86_400_000).toISOString();
  const toIso = new Date(
    Math.min(Date.now(), incidentMs + SATELLITE_AFTER_DAYS * 86_400_000),
  ).toISOString();
  const notes: string[] = [];

  const s2 = splitAround(await searchCatalog(token, "sentinel-2-l2a", bbox, fromIso, toIso), incidentMs);
  const beforeScene = await pickClearest(token, s2.before, bbox);
  const afterScene = await pickClearest(token, s2.after, bbox);
  if (!s2.after.length) notes.push("사건 후 Sentinel-2 촬영 장면이 아직 없음");
  if (!s2.before.length) notes.push(`사건 전 ${SATELLITE_BEFORE_DAYS}일 안 Sentinel-2 장면 없음`);

  const toChip = async (scene: SatelliteScene | null): Promise<SatelliteChip | null> => {
    if (!scene) return null;
    const png = await renderChip(token, scene, bbox);
    return png ? { ...scene, png } : null;
  };
  const optical = { before: await toChip(beforeScene), after: await toChip(afterScene) };

  let sar: SatellitePairResult["sar"] = null;
  if (
    !optical.before ||
    !optical.after ||
    opticalCloudBlocked(beforeScene) ||
    opticalCloudBlocked(afterScene)
  ) {
    try {
      const s1 = splitAround(await searchCatalog(token, "sentinel-1-grd", bbox, fromIso, toIso), incidentMs);
      sar = { before: await toChip(s1.before[0] ?? null), after: await toChip(s1.after[0] ?? null) };
      if (!s1.after.length) notes.push("사건 후 Sentinel-1 레이더 장면도 아직 없음");
    } catch (error) {
      notes.push(`레이더 보완 실패: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  return {
    bbox,
    optical,
    sar,
    candidates: { before: s2.before.length, after: s2.after.length },
    notes,
  };
}
