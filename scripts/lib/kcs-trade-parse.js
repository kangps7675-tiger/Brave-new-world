/**
 * 관세청 무역통계 정규화 — 의존성 없는 순수 모듈.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 파싱을 따로 빼는가
 * ══════════════════════════════════════════════════════════════════════
 *
 * GEM 널섬 사고(2,000건)의 교훈: **가장 틀리기 쉬운 함수는
 * 의존성 없이 검증 가능해야 한다.** 네트워크가 필요한 fetch 스크립트 안에
 * 파싱을 인라인하면 테스트가 불가능하다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  관세청 응답의 함정
 * ══════════════════════════════════════════════════════════════════════
 *
 * 1. **필드명이 축약형이고 기관 관례를 따른다**
 *      hsSgn      HS 부호 (Sign)
 *      expDlr     수출 금액 (Dollar, 천 달러)
 *      impDlr     수입 금액
 *      expWgt     수출 중량 (kg)
 *      balPayments 무역수지
 *
 * 2. **금액 단위가 천 달러다.** 그대로 쓰면 1000배 틀린다.
 *
 * 3. **HS 부호 자릿수가 섞인다.** 2·4·6·10자리가 같은 응답에 온다.
 *    앞자리 0 이 잘려서 오는 경우도 있다 ("208" ← 실제 "0208").
 *
 * 4. **누적값과 당월값이 함께 온다.** 구분 안 하면 이중 계상된다.
 */

/** 숫자 변환 — `Number(null)===0` 함정 방지 */
function num(value) {
  if (value == null) return NaN;
  const text = String(value).replace(/,/g, "").trim();
  if (text === "" || text === "-") return NaN;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * HS 부호 정규화.
 *
 * 관세청 응답은 앞자리 0 이 잘려 올 수 있다 ("208" ← "0208").
 * 자릿수를 보고 2·4·6·10 중 가장 가까운 표준 길이로 좌측 0 패딩한다.
 *
 * @returns {{code:string, digits:number, chapter:number}|null}
 */
function normalizeHs(raw) {
  if (raw == null) return null;
  const digitsOnly = String(raw).replace(/\D/g, "");
  if (!digitsOnly) return null;

  // 표준 자릿수로 올림 패딩 (2 → 4 → 6 → 10)
  const STANDARD = [2, 4, 6, 8, 10];
  const target = STANDARD.find((d) => digitsOnly.length <= d);
  if (!target) return null;
  const code = digitsOnly.padStart(target, "0");

  return {
    code,
    digits: target,
    // HS 챕터 = 앞 2자리. GTA `hs_chapter` 와 조인하는 키다.
    chapter: Number(code.slice(0, 2)),
  };
}

/** 기간 문자열 정규화 — "202601" · "2026-01" · "2026.01" 을 받는다 */
function normalizePeriod(raw) {
  if (raw == null) return null;
  const d = String(raw).replace(/\D/g, "");
  if (d.length === 6) return `${d.slice(0, 4)}-${d.slice(4, 6)}`;
  if (d.length === 4) return d; // 연도만
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return null;
}

/** 필드 별칭 — 관세청 API 마다 표기가 조금씩 다르다 */
const FIELD = {
  hs: ["hsSgn", "hsCd", "hsCode", "hsNo"],
  hsName: ["hsSgnNm", "hsNm", "statKor", "prnm"],
  period: ["year", "yymm", "statYymm", "basDt", "prd"],
  country: ["statCd", "cntyCd", "natCd", "countryCode"],
  countryName: ["statCdCntnKor1", "cntyNm", "natNm", "countryName"],
  expDlr: ["expDlr", "expUsdAmt", "expAmt"],
  impDlr: ["impDlr", "impUsdAmt", "impAmt"],
  expWgt: ["expWgt", "expWt"],
  impWgt: ["impWgt", "impWt"],
  balance: ["balPayments", "tradeBal", "balance"],
};

function pick(row, keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== "") return row[k];
  }
  // 대소문자 무시 폴백
  const lower = Object.keys(row).reduce((acc, k) => {
    acc[k.toLowerCase()] = row[k];
    return acc;
  }, {});
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v != null && String(v).trim() !== "") return v;
  }
  return null;
}

/**
 * 관세청 응답 1행 → 정규화 레코드.
 *
 * ⚠️ 금액은 **천 달러 단위**로 들어온다. `usd` 필드로 실제 달러를 계산해 둔다.
 *    화면에 천 달러를 달러로 표기하면 1000배 틀린다.
 *
 * @returns {object|null} HS 코드나 기간이 없으면 null (조용히 0 으로 만들지 않는다)
 */
function normalizeRow(row) {
  if (!row || typeof row !== "object") return null;

  const hs = normalizeHs(pick(row, FIELD.hs));
  const period = normalizePeriod(pick(row, FIELD.period));
  // HS 도 기간도 없으면 집계행이거나 헤더행이다 — 버린다
  if (!hs && !period) return null;

  const expK = num(pick(row, FIELD.expDlr));
  const impK = num(pick(row, FIELD.impDlr));

  const rec = {
    hsCode: hs?.code ?? null,
    hsDigits: hs?.digits ?? null,
    hsChapter: hs?.chapter ?? null,
    hsName: pick(row, FIELD.hsName) ?? null,
    period,
    countryCode: pick(row, FIELD.country) ?? null,
    countryName: pick(row, FIELD.countryName) ?? null,
    // 원본은 천 달러 — 그대로 보존
    exportThousandUsd: Number.isFinite(expK) ? expK : null,
    importThousandUsd: Number.isFinite(impK) ? impK : null,
    // 실제 달러 — 화면·계산용
    exportUsd: Number.isFinite(expK) ? expK * 1000 : null,
    importUsd: Number.isFinite(impK) ? impK * 1000 : null,
    exportWeightKg: Number.isFinite(num(pick(row, FIELD.expWgt)))
      ? num(pick(row, FIELD.expWgt))
      : null,
    importWeightKg: Number.isFinite(num(pick(row, FIELD.impWgt)))
      ? num(pick(row, FIELD.impWgt))
      : null,
  };

  // 무역수지 — 응답에 있으면 쓰고, 없으면 계산
  const bal = num(pick(row, FIELD.balance));
  rec.balanceThousandUsd = Number.isFinite(bal)
    ? bal
    : Number.isFinite(expK) && Number.isFinite(impK)
      ? expK - impK
      : null;

  return rec;
}

/** 응답 배열 → 정규화 배열 (해석 불가 행은 버린다) */
function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const r of rows) {
    const rec = normalizeRow(r);
    if (rec) out.push(rec);
  }
  return out;
}

/**
 * HS 챕터별 집계 — GTA 조인용.
 *
 * GTA 는 `hs_chapter` 를 갖고 있고 관세청은 HS 부호를 갖고 있다.
 * 챕터(앞 2자리)가 두 데이터를 잇는 키다.
 *
 * 예: 중국이 철강(72장)에 수출제한 → 한국 72장 수입이 실제로 어떻게 움직였나
 */
function aggregateByChapter(records) {
  const byChapter = new Map();
  for (const r of records) {
    if (r.hsChapter == null || !Number.isFinite(r.hsChapter)) continue;
    const cur = byChapter.get(r.hsChapter) ?? {
      hsChapter: r.hsChapter,
      exportUsd: 0,
      importUsd: 0,
      exportWeightKg: 0,
      importWeightKg: 0,
      rows: 0,
    };
    cur.exportUsd += r.exportUsd ?? 0;
    cur.importUsd += r.importUsd ?? 0;
    cur.exportWeightKg += r.exportWeightKg ?? 0;
    cur.importWeightKg += r.importWeightKg ?? 0;
    cur.rows += 1;
    byChapter.set(r.hsChapter, cur);
  }
  return [...byChapter.values()].sort((a, b) => a.hsChapter - b.hsChapter);
}

/**
 * 전기 대비 변화율.
 *
 * ⚠️ 기저가 0 이면 변화율이 무한대가 된다. `null` 을 돌려주고
 *    화면에서 "신규"로 표기해야 한다 — Infinity 를 그리면 안 된다.
 */
function changeRate(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

module.exports = {
  num,
  normalizeHs,
  normalizePeriod,
  normalizeRow,
  normalizeRows,
  aggregateByChapter,
  changeRate,
  FIELD,
};
