/**
 * 한국 공공데이터 공용 클라이언트 — 의존성 없는 순수 모듈.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 공용 클라이언트가 필요한가
 * ══════════════════════════════════════════════════════════════════════
 *
 * data.go.kr OpenAPI 는 **데이터셋마다 규약이 다르다.**
 *
 *   · JSON 파라미터명이 제각각    `type` · `_type` · `resultType` · `dataType`
 *   · 어떤 건 XML 만 준다
 *   · serviceKey 인코딩이 갈린다  (URL 인코딩된 키 vs 디코딩된 키)
 *   · 에러도 HTTP 200 으로 온다   (본문에 resultCode 로 실패를 담아 보냄)
 *
 * 마지막 게 특히 위험하다. **HTTP 200 인데 데이터가 없는 조용한 실패**는
 * 이 프로젝트에서 이미 한 번 크게 당한 유형이다(빈 gzip, 널섬 좌표).
 * 그래서 여기서 resultCode 를 반드시 확인하고 실패를 예외로 올린다.
 *
 * ── 폴링 예의 ──────────────────────────────────────────────────────
 *
 * 저작권법 제93조 2항 단서:
 *   "개별 소재 ... 의 복제라도 **반복적이거나 특정한 목적을 위하여
 *    체계적으로** 함으로써 해당 데이터베이스의 통상적 이용과 충돌하거나
 *    제작자의 이익을 부당하게 해치는 경우 상당한 부분의 복제로 본다"
 *
 * 관세청 무역통계는 월간·10일 단위로 갱신된다. 하루 1회면 충분하고,
 * 그 이상은 조문에 걸릴 뿐 아니라 개발계정 일일 한도(보통 1만 건)도 태운다.
 */

const DEFAULT_UA =
  "BraveTheWorld/0.2 (Brave New World geopolitics map; kangps7675@gmail.com)";

/** data.go.kr 이 쓰는 JSON 파라미터명 변종 — 순서대로 시도한다 */
const JSON_PARAM_VARIANTS = ["type", "_type", "resultType", "dataType"];

/** 정상 응답 코드 (기관마다 표기가 다르다) */
const OK_CODES = new Set(["00", "0", "000", "INFO-000", "NORMAL SERVICE."]);

class KoreaOpenDataError extends Error {
  constructor(message, meta = {}) {
    super(message);
    this.name = "KoreaOpenDataError";
    Object.assign(this, meta);
  }
}

/**
 * serviceKey 를 안전하게 붙인다.
 *
 * ⚠️ data.go.kr 은 "인코딩 키"와 "디코딩 키" 두 개를 발급한다.
 *    URLSearchParams 로 붙이면 이미 인코딩된 키가 **이중 인코딩**되어
 *    401 이 난다. 그래서 쿼리스트링을 직접 조립한다.
 */
function buildUrl(baseUrl, serviceKey, params = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  // serviceKey 는 발급된 형태 그대로 (재인코딩 금지)
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}serviceKey=${serviceKey}${qs.length ? `&${qs.join("&")}` : ""}`;
}

/**
 * 응답 본문에서 결과 코드·메시지를 뽑는다.
 * JSON·XML 양쪽 형태를 받는다.
 */
function extractResult(payload, rawText) {
  // JSON: { response: { header: { resultCode, resultMsg } , body: {...} } }
  const header =
    payload?.response?.header ??
    payload?.header ??
    payload?.cmmMsgHeader ??
    null;
  if (header) {
    return {
      code: String(header.resultCode ?? header.returnReasonCode ?? "").trim(),
      msg: String(header.resultMsg ?? header.returnAuthMsg ?? header.errMsg ?? "").trim(),
    };
  }
  // XML 폴백 — 태그에서 직접
  if (typeof rawText === "string") {
    const code = /<resultCode>([^<]*)<\/resultCode>/i.exec(rawText)?.[1];
    const msg = /<resultMsg>([^<]*)<\/resultMsg>/i.exec(rawText)?.[1];
    if (code != null) return { code: code.trim(), msg: (msg ?? "").trim() };
  }
  return null;
}

/** 응답에서 레코드 배열을 뽑는다 (기관마다 중첩 깊이가 다르다) */
function extractItems(payload) {
  if (!payload || typeof payload !== "object") return [];
  const candidates = [
    payload?.response?.body?.items?.item,
    payload?.response?.body?.items,
    payload?.body?.items?.item,
    payload?.items?.item,
    payload?.items,
    payload?.data,
    payload,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
    // 단건이면 객체로 온다 — 배열로 감싼다
    if (c && typeof c === "object" && !Array.isArray(c)) {
      const keys = Object.keys(c);
      const looksLikeRecord = keys.length > 0 && !keys.some((k) => k === "items" || k === "body");
      if (looksLikeRecord && c !== payload) return [c];
    }
  }
  return [];
}

/**
 * 아주 단순한 XML → 객체 배열 파서.
 *
 * ⚠️ 범용 XML 파서가 아니다. data.go.kr 의 평평한 `<item>` 구조 전용이다.
 *    중첩·속성·CDATA 를 제대로 다루지 않는다. XML 만 주는 데이터셋을
 *    본격적으로 쓰게 되면 제대로 된 파서를 넣을 것.
 */
function parseFlatXmlItems(xml) {
  if (typeof xml !== "string") return [];
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const body = m[1];
    const row = {};
    const fieldRe = /<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g;
    let f;
    while ((f = fieldRe.exec(body)) !== null) {
      row[f[1]] = f[2].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim();
    }
    if (Object.keys(row).length) items.push(row);
  }
  return items;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 공공데이터 API 한 페이지를 가져온다.
 *
 * JSON 파라미터명 변종을 순서대로 시도하고, 전부 XML 이면 XML 을 파싱한다.
 * 결과 코드가 정상이 아니면 **예외로 올린다** (조용한 실패 금지).
 */
async function fetchPage(baseUrl, serviceKey, params = {}, options = {}) {
  const { userAgent = DEFAULT_UA, timeoutMs = 20_000, fetchImpl = fetch } = options;
  let lastText = null;

  for (const jsonParam of [...JSON_PARAM_VARIANTS, null]) {
    const merged = jsonParam ? { ...params, [jsonParam]: "json" } : { ...params };
    const url = buildUrl(baseUrl, serviceKey, merged);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(url, {
        headers: { Accept: "application/json, text/xml", "User-Agent": userAgent },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new KoreaOpenDataError(`HTTP ${res.status}`, { status: res.status, url: baseUrl });
    }

    const text = await res.text();
    lastText = text;

    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      // JSON 이 아니면 다음 변종으로 — 마지막(null)이면 XML 로 처리
      if (jsonParam !== null) continue;
    }

    const result = extractResult(payload, text);
    if (result && result.code && !OK_CODES.has(result.code)) {
      throw new KoreaOpenDataError(
        `API 오류 ${result.code}: ${result.msg || "(메시지 없음)"}`,
        { code: result.code, msg: result.msg, url: baseUrl },
      );
    }

    const items = payload ? extractItems(payload) : parseFlatXmlItems(text);
    return { items, payload, raw: text, format: payload ? "json" : "xml" };
  }

  throw new KoreaOpenDataError("응답을 해석하지 못했다", {
    url: baseUrl,
    sample: String(lastText).slice(0, 200),
  });
}

/**
 * 페이지네이션 전체 수집.
 *
 * @param {object} opts
 * @param {number} opts.maxPages  안전 상한 (기본 20) — 개발계정 일일 한도 보호
 * @param {number} opts.delayMs   페이지 간 간격 (기본 1,200ms) — 폴링 예의
 */
async function fetchAll(baseUrl, serviceKey, params = {}, opts = {}) {
  const {
    maxPages = 20,
    numOfRows = 500,
    delayMs = 1_200,
    pageParam = "pageNo",
    rowsParam = "numOfRows",
    ...rest
  } = opts;

  const all = [];
  let format = "json";
  for (let page = 1; page <= maxPages; page += 1) {
    const { items, format: f } = await fetchPage(
      baseUrl,
      serviceKey,
      { ...params, [pageParam]: page, [rowsParam]: numOfRows },
      rest,
    );
    format = f;
    if (items.length === 0) break;
    all.push(...items);
    if (items.length < numOfRows) break;
    await sleep(delayMs);
  }
  return { items: all, format };
}

/** 숫자 변환 — `Number(null)===0` 함정 방지 (GEM 널섬 사고와 같은 유형) */
function num(value) {
  if (value == null) return NaN;
  const text = String(value).replace(/,/g, "").trim();
  if (text === "" || text === "-") return NaN;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

module.exports = {
  fetchPage,
  fetchAll,
  buildUrl,
  extractItems,
  extractResult,
  parseFlatXmlItems,
  num,
  KoreaOpenDataError,
  JSON_PARAM_VARIANTS,
  OK_CODES,
  DEFAULT_UA,
};
