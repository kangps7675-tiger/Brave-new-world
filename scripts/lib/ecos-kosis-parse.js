/**
 * 한국은행 ECOS · 통계청 KOSIS 정규화 — 의존성 없는 순수 모듈.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 별도 파서인가
 * ══════════════════════════════════════════════════════════════════════
 *
 * 이 둘은 **data.go.kr 이 아니라 자체 포털**이다.
 * 응답 구조도 에러 규약도 data.go.kr 과 다르다.
 *
 *   ECOS   https://ecos.bok.or.kr/api/StatisticSearch/{키}/json/kr/{시작}/{끝}/...
 *          정상: { StatisticSearch: { list_total_count, row: [...] } }
 *          실패: { RESULT: { CODE: "INFO-200", MESSAGE: "..." } }
 *
 *   KOSIS  https://kosis.kr/openapi/Param/statisticsParameterData.do?...&format=json
 *          정상: [ { PRD_DE, DT, UNIT_NM, ITM_NM, ... }, ... ]  ← 최상위가 배열
 *          실패: { err: "30", errMsg: "..." }
 *
 * ⚠️ 둘 다 **실패를 HTTP 200 으로 준다.** data.go.kr 과 같은 함정이다.
 *    조용한 실패를 막으려면 본문을 반드시 확인해야 한다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  시계열 데이터의 함정
 * ══════════════════════════════════════════════════════════════════════
 *
 * 1. **주기(CYCLE)가 섞인다** — 연(A)·분기(Q)·월(M)·일(D)
 *    기간 문자열 길이로 구분해야 한다. 분기는 "2026Q1" 이 아니라 "20261" 로 온다.
 *
 * 2. **결측을 0 으로 만들면 안 된다.**
 *    ECOS 는 결측을 빈 문자열이나 "-" 로 준다. 0 으로 바꾸면
 *    "환율 0원"이 되어 차트가 무너진다.
 *
 * 3. **단위가 행마다 다를 수 있다** — 원/달러 · 지수 · %
 *    단위를 버리면 서로 다른 지표를 같은 축에 그리게 된다.
 */

/** 숫자 변환 — `Number(null)===0` 함정 방지 */
function num(value) {
  if (value == null) return NaN;
  const text = String(value).replace(/,/g, "").trim();
  if (text === "" || text === "-" || text === "...") return NaN;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

// ─────────────────────────────────────────────────────────────────────
//  ECOS
// ─────────────────────────────────────────────────────────────────────

/**
 * ECOS 응답에서 에러를 확인한다.
 * @returns {{code:string,message:string}|null} 정상이면 null
 */
function ecosError(payload) {
  const r = payload?.RESULT;
  if (!r) return null;
  const code = String(r.CODE ?? "").trim();
  // INFO-000 이 정상, 나머지는 전부 실패
  if (!code || code === "INFO-000") return null;
  return { code, message: String(r.MESSAGE ?? "").trim() };
}

/** ECOS 응답에서 행 배열을 뽑는다 */
function ecosRows(payload) {
  const rows = payload?.StatisticSearch?.row;
  return Array.isArray(rows) ? rows : [];
}

/**
 * ECOS 기간 문자열 → 정규화.
 *
 * ⚠️ 분기는 "20261"(5자리) 로 온다. "2026-01"(월)과 헷갈리면 안 된다.
 *
 * @param {string} raw
 * @param {string} cycle "A"|"Q"|"M"|"D" — 없으면 길이로 추정
 */
function ecosPeriod(raw, cycle) {
  if (raw == null) return null;
  const d = String(raw).replace(/\D/g, "");
  if (!d) return null;
  const c = cycle ? String(cycle).toUpperCase() : null;

  if (c === "A" || d.length === 4) return { period: d, cycle: "annual" };
  if (c === "Q" || d.length === 5) {
    return { period: `${d.slice(0, 4)}Q${d.slice(4, 5)}`, cycle: "quarterly" };
  }
  if (c === "M" || d.length === 6) {
    return { period: `${d.slice(0, 4)}-${d.slice(4, 6)}`, cycle: "monthly" };
  }
  if (c === "D" || d.length === 8) {
    return {
      period: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      cycle: "daily",
    };
  }
  return null;
}

/**
 * ECOS 행 → 정규화 레코드.
 * @returns {object|null} 값이 결측이면 `value: null` (0 아님)
 */
function normalizeEcosRow(row) {
  if (!row || typeof row !== "object") return null;
  const p = ecosPeriod(row.TIME, row.CYCLE);
  if (!p) return null;

  const v = num(row.DATA_VALUE);
  return {
    statCode: row.STAT_CODE ?? null,
    statName: row.STAT_NAME ?? null,
    itemCode: row.ITEM_CODE1 ?? null,
    itemName: row.ITEM_NAME1 ?? null,
    period: p.period,
    cycle: p.cycle,
    // ⚠️ 결측을 0 으로 만들면 "환율 0원"이 되어 차트가 무너진다
    value: Number.isFinite(v) ? v : null,
    unit: row.UNIT_NAME ?? null,
  };
}

function normalizeEcosRows(payload) {
  const err = ecosError(payload);
  if (err) {
    const e = new Error(`ECOS ${err.code}: ${err.message || "(메시지 없음)"}`);
    e.code = err.code;
    throw e;
  }
  const out = [];
  for (const r of ecosRows(payload)) {
    const rec = normalizeEcosRow(r);
    if (rec) out.push(rec);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
//  KOSIS
// ─────────────────────────────────────────────────────────────────────

/**
 * KOSIS 응답에서 에러를 확인한다.
 * ⚠️ 정상 응답은 **최상위가 배열**이고, 실패는 객체다.
 */
function kosisError(payload) {
  if (Array.isArray(payload)) return null;
  if (!payload || typeof payload !== "object") return null;
  const code = payload.err ?? payload.errCd ?? null;
  if (code == null) return null;
  return { code: String(code), message: String(payload.errMsg ?? "").trim() };
}

/** KOSIS 기간 정규화 — PRD_DE 는 주기에 따라 자릿수가 다르다 */
function kosisPeriod(raw, prdSe) {
  if (raw == null) return null;
  const d = String(raw).replace(/\D/g, "");
  if (!d) return null;
  const se = prdSe ? String(prdSe).toUpperCase() : null;

  if (se === "Y" || d.length === 4) return { period: d, cycle: "annual" };
  if (se === "Q" || d.length === 5) {
    return { period: `${d.slice(0, 4)}Q${d.slice(4, 5)}`, cycle: "quarterly" };
  }
  if (se === "M" || d.length === 6) {
    return { period: `${d.slice(0, 4)}-${d.slice(4, 6)}`, cycle: "monthly" };
  }
  if (d.length === 8) {
    return { period: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, cycle: "daily" };
  }
  return null;
}

function normalizeKosisRow(row) {
  if (!row || typeof row !== "object") return null;
  const p = kosisPeriod(row.PRD_DE, row.PRD_SE);
  if (!p) return null;

  const v = num(row.DT);
  return {
    tableId: row.TBL_ID ?? null,
    tableName: row.TBL_NM ?? null,
    itemName: row.ITM_NM ?? null,
    categoryName: row.C1_NM ?? row.C1_OBJ_NM ?? null,
    period: p.period,
    cycle: p.cycle,
    value: Number.isFinite(v) ? v : null,
    unit: row.UNIT_NM ?? null,
  };
}

function normalizeKosisRows(payload) {
  const err = kosisError(payload);
  if (err) {
    const e = new Error(`KOSIS ${err.code}: ${err.message || "(메시지 없음)"}`);
    e.code = err.code;
    throw e;
  }
  const rows = Array.isArray(payload) ? payload : [];
  const out = [];
  for (const r of rows) {
    const rec = normalizeKosisRow(r);
    if (rec) out.push(rec);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
//  공통
// ─────────────────────────────────────────────────────────────────────

/**
 * 시계열에서 최신값과 전기 대비 변화를 뽑는다.
 *
 * ⚠️ 결측(null)은 건너뛴다. 0 으로 채우면 가짜 급락이 생긴다.
 * ⚠️ 기저가 0 이면 변화율은 null — Infinity 를 화면에 그리면 안 된다.
 */
function latestChange(records) {
  const valid = records
    .filter((r) => r.value != null && Number.isFinite(r.value))
    .sort((a, b) => String(a.period).localeCompare(String(b.period)));
  if (valid.length === 0) return null;

  const latest = valid.at(-1);
  const prev = valid.length > 1 ? valid.at(-2) : null;
  const change =
    prev && prev.value !== 0 ? (latest.value - prev.value) / Math.abs(prev.value) : null;

  return {
    period: latest.period,
    value: latest.value,
    unit: latest.unit ?? null,
    previousPeriod: prev?.period ?? null,
    previousValue: prev?.value ?? null,
    changeRate: change,
    // 결측 때문에 건너뛴 구간이 있으면 표시 — 사용자가 알아야 한다
    missingCount: records.length - valid.length,
  };
}

module.exports = {
  num,
  ecosError,
  ecosRows,
  ecosPeriod,
  normalizeEcosRow,
  normalizeEcosRows,
  kosisError,
  kosisPeriod,
  normalizeKosisRow,
  normalizeKosisRows,
  latestChange,
};
