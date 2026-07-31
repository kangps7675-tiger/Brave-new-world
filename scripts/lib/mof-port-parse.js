/**
 * 해양수산부 항만·입출항 정규화 — 의존성 없는 순수 모듈.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 이 데이터가 중요한가
 * ══════════════════════════════════════════════════════════════════════
 *
 * 「한중일물류 입출항정보」는 **화물량 · 다음 항구 · 목적지**를 포함한다.
 *
 * 이게 결정적인 이유:
 *   · **신고 기반**이라 AIS 보다 정확하다 (AIS 는 암전·스푸핑이 가능)
 *   · 공공데이터라 `ais` 레이어의 MarineTraffic 상업 라이선스 문제를
 *     부분적으로 우회한다
 *   · "이 배가 지금 어디 있나"가 아니라 **"물량이 어디로 흐르나"** 를 준다 —
 *     해운 B2B 가 실제로 묻는 질문이다
 *
 * ══════════════════════════════════════════════════════════════════════
 *  이 데이터의 함정
 * ══════════════════════════════════════════════════════════════════════
 *
 * 1. **항구 코드 체계가 섞인다**
 *    UN/LOCODE(KRPUS) · 해수부 자체 코드 · 한글 항구명이 같은 응답에 온다.
 *
 * 2. **입항/출항 방향 표기가 제각각**
 *    "I"/"O" · "입항"/"출항" · "ENTRY"/"DEPARTURE"
 *
 * 3. **톤수 단위가 다르다** — G/T(총톤수) vs D/W/T(재화중량톤수) vs 실화물톤
 *    섞어서 합산하면 무의미한 숫자가 나온다.
 *
 * 4. **날짜에 시각이 붙기도 안 붙기도 한다** — "20260131" · "202601311430"
 */

/** 숫자 변환 — `Number(null)===0` 함정 방지 */
function num(value) {
  if (value == null) return NaN;
  const text = String(value).replace(/,/g, "").trim();
  if (text === "" || text === "-") return NaN;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

function pick(row, keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== "") return row[k];
  }
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

const FIELD = {
  portCode: ["prtAgCd", "portCd", "portCode", "prtCd", "locode"],
  portName: ["prtAgNm", "portNm", "portName", "prtNm"],
  shipName: ["shipNm", "vsslNm", "shipName", "vesselName"],
  callSign: ["cllSgn", "callSign", "clsgnNo", "callsign"],
  imo: ["imoNo", "imo", "imoNum"],
  direction: ["etryDprtSe", "inoutSe", "direction", "ioGb"],
  date: ["etryDt", "dprtDt", "etryDprtDt", "baseDt", "prtEntryDt"],
  nextPort: ["nxtPrtNm", "nextPort", "nxtPrt", "nextPortName"],
  destination: ["dstnPrtNm", "destination", "dstnPrt", "arvlPrtNm"],
  cargoWeight: ["cargoWt", "frgtWt", "cargoWeight", "loadWt"],
  grossTonnage: ["grsTong", "gt", "grossTon", "totTong"],
  deadweight: ["dwt", "dwTong", "deadweight"],
  shipCount: ["shipCnt", "vsslCnt", "entryCnt", "cnt"],
};

/**
 * 항구 코드 정규화.
 * UN/LOCODE 형태(KRPUS)면 그대로, 아니면 원본을 유지하고 형식만 표시한다.
 */
function normalizePortCode(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toUpperCase();
  if (!s) return null;
  // UN/LOCODE: 2자리 국가코드 + 3자리 항구코드
  if (/^[A-Z]{2}[A-Z0-9]{3}$/.test(s)) {
    return { code: s, scheme: "unlocode", country: s.slice(0, 2) };
  }
  return { code: s, scheme: "national", country: null };
}

/**
 * 입출항 방향 정규화.
 * 표기가 제각각이라 명시적으로 매핑한다 — 못 알아보면 `null` (추측 금지).
 */
function normalizeDirection(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toUpperCase();
  if (!s) return null;
  if (["I", "IN", "ENTRY", "ARRIVAL", "입항", "입"].includes(s)) return "entry";
  if (["O", "OUT", "DEPARTURE", "DEPART", "출항", "출"].includes(s)) return "departure";
  return null;
}

/**
 * 날짜 정규화 — 시각이 붙기도 안 붙기도 한다.
 * @returns {string|null} ISO 유사 형식 (YYYY-MM-DD 또는 YYYY-MM-DDTHH:mm)
 */
function normalizeDate(raw) {
  if (raw == null) return null;
  const d = String(raw).replace(/\D/g, "");
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.length === 12) {
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(8, 10)}:${d.slice(10, 12)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(8, 10)}:${d.slice(10, 12)}:${d.slice(12, 14)}`;
  }
  if (d.length === 6) return `${d.slice(0, 4)}-${d.slice(4, 6)}`;
  return null;
}

/**
 * 입출항 1행 → 정규화 레코드.
 *
 * ⚠️ 톤수는 **단위를 섞어 합산하지 않는다.** G/T 와 D/W/T 를 별도 필드로 둔다.
 */
function normalizeMovement(row) {
  if (!row || typeof row !== "object") return null;

  const port = normalizePortCode(pick(row, FIELD.portCode));
  const portName = pick(row, FIELD.portName);
  const date = normalizeDate(pick(row, FIELD.date));

  // 항구도 날짜도 없으면 해석 불가 — 조용히 0 으로 만들지 않는다
  if (!port && !portName && !date) return null;

  return {
    portCode: port?.code ?? null,
    portScheme: port?.scheme ?? null,
    portName: portName ?? null,
    date,
    direction: normalizeDirection(pick(row, FIELD.direction)),
    shipName: pick(row, FIELD.shipName) ?? null,
    callSign: pick(row, FIELD.callSign) ?? null,
    imo: pick(row, FIELD.imo) ?? null,
    // 이 둘이 이 데이터셋의 값어치다 — 물량이 어디로 흐르는가
    nextPort: pick(row, FIELD.nextPort) ?? null,
    destination: pick(row, FIELD.destination) ?? null,
    cargoWeightTon: Number.isFinite(num(pick(row, FIELD.cargoWeight)))
      ? num(pick(row, FIELD.cargoWeight))
      : null,
    // ⚠️ 단위가 다르므로 별도 보존 — 합산 금지
    grossTonnage: Number.isFinite(num(pick(row, FIELD.grossTonnage)))
      ? num(pick(row, FIELD.grossTonnage))
      : null,
    deadweightTonnage: Number.isFinite(num(pick(row, FIELD.deadweight)))
      ? num(pick(row, FIELD.deadweight))
      : null,
    shipCount: Number.isFinite(num(pick(row, FIELD.shipCount)))
      ? num(pick(row, FIELD.shipCount))
      : null,
  };
}

function normalizeMovements(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const r of rows) {
    const rec = normalizeMovement(r);
    if (rec) out.push(rec);
  }
  return out;
}

/**
 * 항구별 집계.
 *
 * ⚠️ 톤수 단위별로 따로 합산한다. G/T 와 D/W/T 를 더하면 무의미하다.
 */
function aggregateByPort(records) {
  const byPort = new Map();
  for (const r of records) {
    const key = r.portCode ?? r.portName;
    if (!key) continue;
    const cur = byPort.get(key) ?? {
      portCode: r.portCode,
      portName: r.portName,
      entries: 0,
      departures: 0,
      cargoWeightTon: 0,
      grossTonnage: 0,
      records: 0,
    };
    if (r.direction === "entry") cur.entries += r.shipCount ?? 1;
    else if (r.direction === "departure") cur.departures += r.shipCount ?? 1;
    cur.cargoWeightTon += r.cargoWeightTon ?? 0;
    cur.grossTonnage += r.grossTonnage ?? 0;
    cur.records += 1;
    if (!cur.portName && r.portName) cur.portName = r.portName;
    byPort.set(key, cur);
  }
  return [...byPort.values()].sort((a, b) => b.records - a.records);
}

/**
 * 목적지 흐름 집계 — 초크포인트 레이어와 잇는 지점.
 *
 * "부산에서 나간 배가 어디로 가는가"를 센다.
 * AIS 실시간 위치가 못 주는 **의도(declared destination)** 를 준다.
 */
function aggregateFlows(records, { minCount = 1 } = {}) {
  const flows = new Map();
  for (const r of records) {
    const from = r.portName ?? r.portCode;
    const to = r.destination ?? r.nextPort;
    if (!from || !to || from === to) continue;
    const key = `${from}→${to}`;
    const cur = flows.get(key) ?? {
      from,
      to,
      count: 0,
      cargoWeightTon: 0,
    };
    cur.count += r.shipCount ?? 1;
    cur.cargoWeightTon += r.cargoWeightTon ?? 0;
    flows.set(key, cur);
  }
  return [...flows.values()]
    .filter((f) => f.count >= minCount)
    .sort((a, b) => b.count - a.count);
}

module.exports = {
  num,
  normalizePortCode,
  normalizeDirection,
  normalizeDate,
  normalizeMovement,
  normalizeMovements,
  aggregateByPort,
  aggregateFlows,
  FIELD,
};
