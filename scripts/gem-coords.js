/**
 * GEM 좌표 파싱 — **의존성 없는 순수 함수 모듈.**
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 분리했나
 * ══════════════════════════════════════════════════════════════════════
 *
 * 이 함수들이 2026-07-31 감사에서 **2,000개 시설을 널섬(0,0)으로 보낸 지점**이다.
 * 원래는 `build-gem-trackers.js` 안에 있었는데, 그 파일은 `xlsx` 와
 * `build-profile`(파일시스템 접근)을 로드해서 **단독 테스트가 불가능**했다.
 *
 * 정확도가 제품의 핵심인 이상, 가장 틀리기 쉬운 함수는
 * **의존성 없이 검증 가능해야 한다.** 그래서 여기로 뺐다.
 *
 * 테스트: `src/data/gemCoordParser.test.ts`
 *
 * ══════════════════════════════════════════════════════════════════════
 *  사고 요약
 * ══════════════════════════════════════════════════════════════════════
 *
 *   Number(null) === 0        이고
 *   Number.isFinite(0) === true 다.
 *
 * 그래서 `Number(firstVal(row, ["Latitude", ...]))` 를 isFinite 로 검사하면
 * **컬럼이 아예 없는 시트에서도 {lat:0, lng:0} 이 가드를 통과**하고,
 * `Coordinates` 통합 컬럼 파서에 영원히 도달하지 못했다.
 *
 * GEM 트래커는 두 형식이 섞여 있다:
 *   · 석탄발전·태양광·풍력   → `Latitude` / `Longitude` 별도 컬럼
 *   · 철강·시멘트·철광석·화학 → `Coordinates` 통합 ("31.2304, 121.4737")
 *
 * 후자 넷이 전멸했다. 이름·국가·용량은 정상이라 **조용한 실패**였다.
 */

/**
 * 행에서 첫 번째로 값이 있는 컬럼을 찾는다.
 * 대소문자 무시 fuzzy 매칭까지 시도한다 (GEM 은 릴리스마다 표기가 흔들린다).
 */
function firstVal(row, keys) {
  for (const key of keys || []) {
    if (row[key] != null && String(row[key]).trim() !== "") return row[key];
  }
  const rowKeys = Object.keys(row);
  for (const want of keys || []) {
    const hit = rowKeys.find((k) => k.toLowerCase() === String(want).toLowerCase());
    if (hit && row[hit] != null && String(row[hit]).trim() !== "") return row[hit];
  }
  return null;
}

/**
 * 안전한 수치 변환.
 *
 * ⚠️ **절대 `Number()` 직접 호출로 되돌리지 말 것.**
 *    `Number(null) === 0` 이 이 프로젝트에서 2,000건을 죽였다.
 */
function num(value) {
  if (value == null) return NaN;
  const text = String(value).trim();
  if (text === "") return NaN;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * (0,0) 널섬 판정.
 * GEM 원본에 진짜 이 좌표인 시설은 없다 — 결측의 신호로 본다.
 */
function isNullIsland(lat, lng) {
  return lat === 0 && lng === 0;
}

/** 위경도 컬럼 후보 (GEM 릴리스별 표기 흔들림 흡수) */
const LAT_KEYS = ["Latitude", "Lat", "latitude", "lat"];
const LNG_KEYS = ["Longitude", "Long", "Lng", "Lon", "longitude", "lon", "lng"];
/** 통합 좌표 컬럼 후보 — 철강·시멘트·철광석·화학이 이 형식이다 */
const COMBINED_KEYS = ["Coordinates", "Coordinate", "Lat/Long", "LatLong", "Location"];

/**
 * 행에서 좌표를 뽑는다.
 * @returns {{lat:number,lng:number}|null} 결측·오류는 **null** (0,0 아님)
 */
function parseCoords(row) {
  if (!row || typeof row !== "object") return null;

  // ① 별도 위경도 컬럼
  const latDirect = num(firstVal(row, LAT_KEYS));
  const lngDirect = num(firstVal(row, LNG_KEYS));
  if (
    Number.isFinite(latDirect) &&
    Number.isFinite(lngDirect) &&
    !isNullIsland(latDirect, lngDirect) &&
    Math.abs(latDirect) <= 90 &&
    Math.abs(lngDirect) <= 180
  ) {
    return { lat: latDirect, lng: lngDirect };
  }

  // ② 통합 Coordinates 컬럼 — ①이 비었을 때 **반드시 여기로 와야 한다**
  const raw = firstVal(row, COMBINED_KEYS);
  if (raw == null) return null;
  const m = /(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/.exec(String(raw).trim());
  if (!m) return null;

  const a = num(m[1]);
  const b = num(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (isNullIsland(a, b)) return null;

  // GEM 은 보통 lat,lng — |a| > 90 이면 lng,lat 순서로 본다
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b };
  if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return { lat: b, lng: a };
  return null;
}

module.exports = { parseCoords, num, firstVal, isNullIsland, LAT_KEYS, LNG_KEYS, COMBINED_KEYS };
