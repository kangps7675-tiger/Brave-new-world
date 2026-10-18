// NGA MSI 항행 경보(NAVAREA IV / XII …) → GeoJSON
// 사용: const fc = await fetchNgaNavWarnings();  (Cloudflare Worker cron / Next.js route 어디서든)
//
// 원본: navareaNga.ts (Downloads). 아래 `ngaWarningsToNavareaCollection`은 이 파서의 결과를
// 기존 D1 스냅샷(`navarea_features`)이 쓰는 NavareaFeatureProps 모양으로 바꿔 주는 어댑터다.

import type { Feature, FeatureCollection, Geometry as GeoGeometry } from "geojson";
import type { NavareaFeatureProps } from "./parseNavareaText";

/**
 * Postman에서 200이 확인된 형태(`sort=date&output=json`). `status=active`는 확인되지 않아 쓰지 않는다 —
 * 대신 응답의 status·cancelDate로 종료 경보를 코드에서 거른다(isNgaWarningExpired).
 */
export const NGA_URL = "https://msi.nga.mil/api/publications/broadcast-warn?sort=date&output=json";

export interface NgaWarning {
  msgYear: number;
  msgNumber: number;
  navArea: string; // "4" = NAVAREA IV, "12" = NAVAREA XII, "C"/"P"/"A" = HYDROLANT/HYDROPAC/HYDROARC
  subregion?: string;
  text: string;
  status?: string;
  /** 응답에 있으면 그대로 경보 ID로 쓴다 (예: "IV-517/24") */
  warningId?: string;
  issueDate?: string; // 예: "081630Z MAY 2024"
  authority?: string;
  cancelDate?: string | null;
  [k: string]: unknown;
}

type Geometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "Polygon"; coordinates: [number, number][][] }
  | { type: "LineString"; coordinates: [number, number][] };

export interface NavWarnFeature {
  type: "Feature";
  id: string;
  geometry: Geometry;
  properties: {
    warningId: string; // 예: "IV-517/24"
    navArea: string;
    subregion?: string;
    issueDate?: string;
    label?: string; // 항목 이름(예: 시추선 이름)
    kind: "point" | "area" | "track";
    text: string;
  };
}

// 19-23.0N 092-03.1W / 19-23N 092-03W / 19-23.0 N 092-03.1 W (줄바꿈 허용)
const COORD_RE =
  /(\d{1,2})-(\d{1,2}(?:\.\d+)?)\s*([NS])[\s,]*(\d{1,3})-(\d{1,2}(?:\.\d+)?)\s*([EW])/g;

export function parseCoords(s: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of s.matchAll(COORD_RE)) {
    let lat = +m[1] + +m[2] / 60;
    let lon = +m[4] + +m[5] / 60;
    if (m[3] === "S") lat = -lat;
    if (m[6] === "W") lon = -lon;
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      out.push([+lon.toFixed(5), +lat.toFixed(5)]); // GeoJSON = [lon, lat]
    }
  }
  return out;
}

const ROMAN_TENS = ["", "X", "XX", "XXX"];
const ROMAN_ONES = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

/** NAVAREA 번호(1~39) → 로마 숫자. 숫자가 아니면(HYDROLANT 등 문자 코드) 그대로. */
export function navAreaRegionCode(navArea: string): string {
  const raw = String(navArea).trim().toUpperCase();
  if (raw === "C") return "HYDROLANT";
  if (raw === "P") return "HYDROPAC";
  if (raw === "A") return "HYDROARC";
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 39) return raw;
  return `${ROMAN_TENS[Math.floor(n / 10)]}${ROMAN_ONES[n % 10]}`;
}

// 경보 본문을 "A. ...", "B. ..." 항목 단위로 쪼갬 (없으면 통째로 1개)
function splitItems(text: string): { label?: string; body: string }[] {
  const parts = text.split(/(?:^|\n)\s*(?=[A-Z]\.\s)/);
  const items = parts
    .map((p) => p.trim())
    .filter((p) => /^[A-Z]\.\s/.test(p))
    .map((p) => {
      const firstCoord = p.search(/\d{1,2}-\d{1,2}(?:\.\d+)?\s*[NS]/);
      const head = (firstCoord > 0 ? p.slice(2, firstCoord) : "")
        .replace(/\((?:NEW POSITION|CORRECTED)\)/g, "")
        .trim();
      return { label: head && head.length <= 60 ? head : undefined, body: p };
    });
  return items.length ? items : [{ body: text }];
}

export function warningToFeatures(w: NgaWarning): NavWarnFeature[] {
  const area = navAreaRegionCode(w.navArea);
  const warningId = w.warningId ?? `${area}-${w.msgNumber}/${String(w.msgYear).slice(-2)}`;
  const base = {
    warningId,
    navArea: w.navArea,
    subregion: w.subregion,
    issueDate: w.issueDate,
    text: w.text,
  };
  const feats: NavWarnFeature[] = [];

  let items = splitItems(w.text);
  // "AREA BOUND BY\n A. 좌표\n B. 좌표..." 처럼 꼭짓점을 항목으로 나열한 경우 → 통째로 하나의 영역
  if (
    /BOUND/i.test(w.text) &&
    items.length > 1 &&
    items.every((it) => parseCoords(it.body).length <= 1 && !/BOUND/i.test(it.body))
  ) {
    items = [{ body: w.text }];
  }

  items.forEach((item, i) => {
    const pts = parseCoords(item.body);
    if (!pts.length) return;
    const isArea = /BOUND|AREA (?:BETWEEN|WITHIN)|POLYGON/i.test(item.body);
    const isTrack = /TRACK ?LINE|BETWEEN .* AND|ROUTE|CABLE/i.test(item.body);

    const push = (geometry: Geometry, kind: NavWarnFeature["properties"]["kind"], j = 0) =>
      feats.push({
        type: "Feature",
        id: `${warningId}#${i}.${j}`,
        geometry,
        properties: { ...base, label: item.label, kind },
      });

    if (isArea && pts.length >= 3) {
      const ring = [...pts];
      const [f, l] = [ring[0], ring[ring.length - 1]];
      if (f[0] !== l[0] || f[1] !== l[1]) ring.push(f);
      push({ type: "Polygon", coordinates: [ring] }, "area");
    } else if (isTrack && pts.length >= 2) {
      push({ type: "LineString", coordinates: pts }, "track");
    } else {
      pts.forEach((p, j) => push({ type: "Point", coordinates: p }, "point", j));
    }
  });
  return feats;
}

/** NGA 응답 → 경보 배열. 형식이 다르면(점검 페이지 등) 빈 배열이 아니라 에러로 알린다. */
export function extractNgaWarnings(json: unknown): NgaWarning[] {
  const root = json as { "broadcast-warn"?: unknown } | unknown[] | null;
  const list = Array.isArray(root) ? root : root?.["broadcast-warn"];
  if (!Array.isArray(list)) throw new Error("NGA response has no broadcast-warn list");
  return list as NgaWarning[];
}

export async function fetchNgaNavWarnings(url: string = NGA_URL): Promise<{
  type: "FeatureCollection";
  features: NavWarnFeature[];
  meta: { fetchedAt: string; warnings: number; withoutCoords: number };
}> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`NGA ${res.status}`);
  const list = extractNgaWarnings(await res.json());

  const features: NavWarnFeature[] = [];
  let withoutCoords = 0;
  for (const w of list) {
    const f = warningToFeatures(w);
    if (!f.length) withoutCoords++;
    features.push(...f);
  }
  return {
    type: "FeatureCollection",
    features,
    meta: { fetchedAt: new Date().toISOString(), warnings: list.length, withoutCoords },
  };
}

/* ──────────────── 기존 D1 스냅샷 어댑터 ──────────────── */

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "081630Z MAY 2024" → ISO. 못 읽으면 그 해 1월 1일(기존 NGA 텍스트 파서와 같은 폴백). */
export function ngaIssueDateToIso(issueDate: string | undefined, fallbackYear: number): string {
  const m = /(\d{2})(\d{2})(\d{2})Z\s+([A-Za-z]{3})\s+(\d{4})/.exec(issueDate ?? "");
  if (m) {
    const month = MONTHS.indexOf(m[4]!.toUpperCase());
    if (month >= 0) {
      return new Date(Date.UTC(+m[5]!, month, +m[1]!, +m[2]!, +m[3]!)).toISOString();
    }
  }
  return `${fallbackYear}-01-01T00:00:00Z`;
}

function radiusNm(text: string): number | undefined {
  const m = /RADIUS OF\s+([\d.]+)\s*MILE/i.exec(text);
  const n = m?.[1] ? Number(m[1]) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 이미 종료된 경보인지 — 응답이 활성만 준다 해도 cancelDate가 지났으면 뺀다.
 * status는 "active가 아니면 종료"로 보지 않는다: 실제 값 표기("A" 등)를 확인하지 못했고,
 * 잘못 가정하면 경보가 전부 조용히 사라진다. 명시적인 취소·종료 표기일 때만 뺀다.
 */
export function isNgaWarningExpired(w: NgaWarning, now: number = Date.now()): boolean {
  if (w.status && /cancel|expire|inactive|closed|rescind/i.test(w.status)) return true;
  if (!w.cancelDate) return false;
  const t = Date.parse(w.cancelDate);
  return Number.isFinite(t) && t <= now;
}

/**
 * NGA 경보 → `navarea_features` 스냅샷용 FeatureCollection.
 * id는 기존 NGA 텍스트 파서와 같은 `IV-26-0695` 모양(리전-연도2자리-번호4자리).
 * 한 경보가 여러 지점·항목이면 `#항목.순번`을 붙여 id 충돌을 막는다.
 */
export function ngaWarningsToNavareaCollection(
  warnings: readonly NgaWarning[],
  now: number = Date.now(),
): FeatureCollection {
  const features: Feature[] = [];
  for (const w of warnings) {
    if (typeof w.text !== "string" || !w.text.trim()) continue;
    if (isNgaWarningExpired(w, now)) continue;
    const region = navAreaRegionCode(w.navArea);
    const yy = String(w.msgYear).slice(-2).padStart(2, "0");
    const num = String(w.msgNumber).padStart(4, "0");
    const baseId = `${region}-${yy}-${num}`;
    const date = ngaIssueDateToIso(w.issueDate, w.msgYear);
    const radius = radiusNm(w.text);
    const parts = warningToFeatures(w);
    const multi = parts.length > 1;
    for (const part of parts) {
      const props: NavareaFeatureProps = {
        id: multi ? `${baseId}#${part.id.split("#")[1]}` : baseId,
        date,
        areaHint: part.properties.label ?? w.subregion ?? "",
        description: w.text,
        region,
        source: "nga",
        ...(radius !== undefined && part.geometry.type === "Point" ? { radiusNm: radius } : {}),
      };
      features.push({
        type: "Feature",
        geometry: part.geometry as GeoGeometry,
        properties: props,
      });
    }
  }
  return { type: "FeatureCollection", features };
}
