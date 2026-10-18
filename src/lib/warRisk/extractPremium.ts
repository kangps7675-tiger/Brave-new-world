/**
 * 기사 텍스트(제목·요약)에서 "보도된 전쟁위험(war risk) 보험료"를 뽑는 규칙.
 *
 * 전쟁위험 보험료는 공개 시세가 없다 — 브로커가 선박 가치(hull value)의 %로 건별 견적을 낸다.
 * 그래서 이 모듈은 "실시간 시세"가 아니라 "언론이 보도한 수치"만 다룬다.
 * 화면 문구도 반드시 "보도 기준"으로 써야 한다 (시세처럼 보이게 하면 오보).
 *
 * 원칙: 확실하지 않으면 버린다.
 *  - % 수치는 바로 옆(같은 절)에 hull/ship value 또는 war-risk premium 표현이 있어야 채택
 *  - 유가·주가·운임 % 는 배제 (oil, shares, freight rate 등이 더 가까이 있으면 탈락)
 *  - 선박 가치 대비 보험료는 0.01%~15% 범위만 채택 (2026년 호르무즈 7.5~10% 보도 실재 — 상한을 너무 낮추지 말 것)
 *  - "7.5%-10%" 같은 범위는 ratePct=하단, rateHighPct=상단
 */

export type WarRiskRegionId =
  | "red-sea"
  | "hormuz"
  | "black-sea"
  | "taiwan-strait"
  | "malacca"
  | "other";

export type WarRiskDirection = "up" | "down" | "flat" | null;

export type WarRiskQuote = {
  region: WarRiskRegionId;
  /** 선박 가치 대비 % (예: 0.7 = 0.7%). 범위 보도면 하단 */
  ratePct: number | null;
  /** 범위 보도("7.5%-10%")의 상단, 단일 수치면 null */
  rateHighPct: number | null;
  /** "from X% to Y%" 의 X (X 가 범위면 상단) */
  ratePrevPct: number | null;
  /** 항차당 USD (예: "$1 million per voyage") */
  usdPerVoyage: number | null;
  direction: WarRiskDirection;
  /** strong = hull/ship value 명시, medium = war-risk premium 근처의 % */
  confidence: "strong" | "medium";
  /** 근거가 된 구절 (원문 그대로, 240자 이내) */
  quote: string;
};

const REGION_DEFS: Array<{ id: WarRiskRegionId; re: RegExp }> = [
  {
    id: "red-sea",
    re: /\b(red sea|bab[\s-]?el[\s-]?mandeb|bab al[- ]mandab|gulf of aden|houthis?|yemen|suez)\b|홍해|후티|아덴만|수에즈|바브엘만데브/i,
  },
  {
    id: "hormuz",
    re: /\b(hormuz|persian gulf|arabian gulf|gulf(?! of (?:mexico|aden|guinea|thailand|finland|bothnia|alaska|california))|iran(?:ian)?|fujairah)\b|호르무즈|페르시아만|오만만|이란/i,
  },
  {
    id: "black-sea",
    re: /\b(black sea|ukrain(?:e|ian)|odesa|odessa|novorossiysk|sea of azov|bosporus|bosphorus)\b|흑해|우크라이나|오데사/i,
  },
  { id: "taiwan-strait", re: /\b(taiwan strait|taiwan)\b|대만해협|대만/i },
  { id: "malacca", re: /\b(malacca|south china sea|singapore strait)\b|말라카|남중국해/i },
];

/** 가장 먼저(텍스트 앞쪽에) 나오는 해역을 고른다 — 제목 첫 지명이 기사 주제인 경우가 대부분 */
export function detectWarRiskRegion(text: string): WarRiskRegionId {
  let best: { id: WarRiskRegionId; at: number } | null = null;
  for (const def of REGION_DEFS) {
    const m = def.re.exec(text);
    if (m && (best === null || m.index < best.at)) best = { id: def.id, at: m.index };
  }
  return best?.id ?? "other";
}

/** 전쟁위험 보험 기사인지 — 이게 없으면 아예 보지 않는다 */
const WAR_RISK_TOPIC =
  /\bwar[\s-]?risks?\b|\b(?:additional|extra)\s+premiums?\b|\bmarine insur\w*|\bhull (?:and|&) machinery\b|\bunderwriters?\b|\bjoint war committee\b|전쟁\s?위험|전쟁보험|해상보험|추가\s?보험료/i;

/** 선박 가치 대비 % 라는 강한 표지 */
const HULL_VALUE =
  /\b(?:hull|insured)\s+value\b|\b(?:ship|ship's|vessel|vessel's|ships'|vessels')\s+(?:hull\s+)?value\b|\bvalue\s+of\s+(?:the|a)\s+(?:ship|vessel|hull)\b|선가|선박\s?가치|선체\s?가치/i;

const PREMIUM_WORD = /\bpremiums?\b|\brates?\b|보험료|요율/i;

/** % 바로 앞뒤에 이게 있으면 보험료가 아니라 다른 % 다 */
const OTHER_PCT_SUBJECT =
  /\b(oil|crude|brent|wti|shares?|stocks?|index|indices|freight|charter|container rates?|spot rates?|gdp|inflation|traffic|transits?|volumes?|exports?|imports?|cargo|tonnage|capacity|arrivals|throughput|stake)\b|유가|주가|운임|물동량|통항량/i;

const UP_RE = /\b(rose|rise|rises|rising|jump(?:ed|s)?|surg(?:ed|es|e)|soar(?:ed|s)?|climb(?:ed|s)?|spik(?:ed|es|e)|doubl(?:ed|es|e)|tripl(?:ed|es|e)|increas(?:ed|es|e)|hike[ds]?|up\s+to|higher|skyrocket(?:ed|s)?|hit|hits|reach(?:ed|es)?|top(?:ped|s)?)\b|상승|급등|인상|올라/i;
const DOWN_RE = /\b(fell|fall|falls|falling|drop(?:ped|s)?|eas(?:ed|es|e)|declin(?:ed|es|e)|cut|lower(?:ed)?|halv(?:ed|es)|slid|retreat(?:ed|s)?|soften(?:ed|s)?)\b|하락|인하|내려/i;
const FLAT_RE = /\b(unchanged|steady|stable|held at|remain(?:ed|s)? at)\b|보합|유지/i;

const MAX_PCT = 15;

/** 앞에 숫자가 붙어 있으면 안 됨 — "115%" 에서 "15%" 를 줍지 않게 */
const NUM = String.raw`(?<![\d.])(\d{1,2}(?:\.\d{1,3})?)`;
const PCT_UNIT = String.raw`\s?(?:%|per\s?cent\b|percent\b|퍼센트)`;
/** 단일 "0.7%" 또는 범위 "7.5%-10%" / "1-3%" / "between 1% and 3%" */
const RATE_SRC = String.raw`(?:between\s+)?${NUM}(?:${PCT_UNIT})?\s?(?:-|–|—|~|and)\s?${NUM}${PCT_UNIT}|${NUM}${PCT_UNIT}`;
const RATE_RE = new RegExp(RATE_SRC, "gi");
const FROM_TO_RE = new RegExp(
  String.raw`from\s+(?:about\s+|around\s+|roughly\s+)?(${RATE_SRC})[^.;]{0,60}?\bto\s+(?:about\s+|around\s+|as much as\s+|as high as\s+)?(${RATE_SRC})`,
  "i",
);

type Rate = { low: number; high: number | null };

function parseRate(tok: string): Rate | null {
  const m = new RegExp(`^(?:${RATE_SRC})$`, "i").exec(tok.trim());
  if (!m) return null;
  if (m[1] !== undefined && m[2] !== undefined) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (!(a >= 0 && b > a)) return null;
    return { low: a, high: b };
  }
  return { low: Number(m[3]), high: null };
}

function plausible(r: Rate | null): r is Rate {
  if (!r) return false;
  const top = r.high ?? r.low;
  return r.low >= 0 && top > 0 && top <= MAX_PCT;
}

/** 숫자 대신 말로 쓴 비율 — "a tenth of a vessel's hull value" */
const WORD_RATE_RE = /\b(a|one)\s+(tenth|twentieth|fifth|quarter|half)\s+of\s+(?:a|an|the)\s+/i;
const WORD_RATE: Record<string, number> = { tenth: 10, twentieth: 5, fifth: 20, quarter: 25, half: 50 };

const USD_VOYAGE_RE =
  /\$\s?(\d{1,4}(?:[.,]\d{1,3})?)\s?(million|mln|m|k|thousand)?\b[^.;]{0,40}?\b(?:per|a|for\s+(?:a|each|one)(?:\s+single)?)\s+(?:voyage|transit|trip|passage|call)\b/i;

function clauseAround(text: string, start: number, end: number): string {
  // 문장 경계(. ; | — 줄바꿈) 안에서만 본다 — 옆 문장의 hull value 가 엉뚱한 % 를 살리지 않게
  const left = Math.max(
    text.lastIndexOf(". ", start),
    text.lastIndexOf("; ", start),
    text.lastIndexOf(" | ", start),
    text.lastIndexOf(" - ", start),
    text.lastIndexOf("\n", start),
  );
  const rightCandidates = [". ", "; ", " | ", " - ", "\n"]
    .map((s) => text.indexOf(s, end))
    .filter((i) => i >= 0);
  const right = rightCandidates.length ? Math.min(...rightCandidates) : text.length;
  return text.slice(left < 0 ? 0 : left + 1, right).trim();
}

function trimQuote(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > 240 ? `${t.slice(0, 237)}…` : t;
}

function directionOf(clause: string): WarRiskDirection {
  if (UP_RE.test(clause)) return "up";
  if (DOWN_RE.test(clause)) return "down";
  if (FLAT_RE.test(clause)) return "flat";
  return null;
}

function parseUsd(num: string, unit: string | undefined): number | null {
  const n = Number(num.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const u = (unit || "").toLowerCase();
  if (u === "million" || u === "mln" || u === "m") return Math.round(n * 1_000_000);
  if (u === "k" || u === "thousand") return Math.round(n * 1_000);
  return n >= 10_000 ? Math.round(n) : null; // 단위 없이 작은 숫자는 신뢰 안 함
}

/** 이 % 가 보험료 % 인지 판정. 가까운 쪽 단어가 이긴다. */
function classifyPct(clause: string, pctIndexInClause: number): "strong" | "medium" | null {
  const near = clause.slice(
    Math.max(0, pctIndexInClause - 70),
    Math.min(clause.length, pctIndexInClause + 70),
  );
  if (HULL_VALUE.test(near)) return "strong";
  if (!PREMIUM_WORD.test(near)) return null;
  // premium 근처지만 다른 주어가 % 바로 앞(30자)에 있으면 탈락
  const tight = clause.slice(Math.max(0, pctIndexInClause - 30), pctIndexInClause);
  if (OTHER_PCT_SUBJECT.test(tight)) return null;
  if (!WAR_RISK_TOPIC.test(clause) && !/\bpremiums?\b|보험료/i.test(near)) return null;
  return "medium";
}

/**
 * 텍스트 한 덩어리(보통 기사 제목 + 요약)에서 보험료 언급을 0~1건 뽑는다.
 * 같은 기사에서 여러 수치가 나오면 가장 신뢰도 높은 첫 건만 쓴다 (기사당 1점).
 */
export function extractWarRiskQuote(text: string): WarRiskQuote | null {
  const clean = text.replace(/\s+/g, " ").trim();
  // hull value 표현만 있어도 주제로 인정 ("Hormuz rates hit 7.5%-10% of hull value")
  if (!clean || !(WAR_RISK_TOPIC.test(clean) || HULL_VALUE.test(clean))) return null;

  const region = detectWarRiskRegion(clean);
  const base = { region, usdPerVoyage: null as number | null };

  // 1) "from X% to Y%" (X·Y 각각 범위일 수 있음)
  const ft = FROM_TO_RE.exec(clean);
  if (ft) {
    // 매치 안의 수치 토큰을 다시 훑어 첫 토큰 = 이전값, 마지막 토큰 = 현재값
    const toks = [...ft[0].matchAll(new RegExp(RATE_SRC, "gi"))].map((t) => parseRate(t[0]));
    const prev = toks[0] ?? null;
    const second = toks.length >= 2 ? toks[toks.length - 1] : null;
    const clause = clauseAround(clean, ft.index, ft.index + ft[0].length);
    const conf = classifyPct(clause, Math.max(0, clause.indexOf(ft[0])));
    if (conf && plausible(prev) && plausible(second)) {
      const prevTop = prev.high ?? prev.low;
      const curTop = second.high ?? second.low;
      return {
        ...base,
        ratePct: second.low,
        rateHighPct: second.high,
        ratePrevPct: prevTop,
        direction: curTop > prevTop ? "up" : curTop < prevTop ? "down" : "flat",
        confidence: conf,
        quote: trimQuote(clause),
      };
    }
  }

  // 2) 단일 % 또는 범위
  let best: WarRiskQuote | null = null;
  RATE_RE.lastIndex = 0;
  for (let m = RATE_RE.exec(clean); m; m = RATE_RE.exec(clean)) {
    const r = parseRate(m[0]);
    if (!plausible(r)) continue;
    const clause = clauseAround(clean, m.index, m.index + m[0].length);
    const conf = classifyPct(clause, Math.max(0, clause.indexOf(m[0])));
    if (!conf) continue;
    const q: WarRiskQuote = {
      ...base,
      ratePct: r.low,
      rateHighPct: r.high,
      ratePrevPct: null,
      direction: directionOf(clause),
      confidence: conf,
      quote: trimQuote(clause),
    };
    if (conf === "strong") {
      best = q;
      break;
    }
    if (!best) best = q;
  }

  // 2b) "a tenth of a vessel's hull value"
  if (!best) {
    const w = WORD_RATE_RE.exec(clean);
    if (w) {
      const after = clean.slice(w.index + w[0].length, w.index + w[0].length + 40);
      const val = WORD_RATE[w[2].toLowerCase()];
      if (HULL_VALUE.test(after) && val <= MAX_PCT) {
        const clause = clauseAround(clean, w.index, w.index + w[0].length);
        best = {
          ...base,
          ratePct: val,
          rateHighPct: null,
          ratePrevPct: null,
          direction: directionOf(clause),
          confidence: "strong",
          quote: trimQuote(clause),
        };
      }
    }
  }

  // 3) 항차당 금액 — % 와 함께 나오면 합친다
  const usd = USD_VOYAGE_RE.exec(clean);
  if (usd) {
    const amount = parseUsd(usd[1], usd[2]);
    if (amount !== null) {
      const clause = clauseAround(clean, usd.index, usd.index + usd[0].length);
      if (best) {
        best.usdPerVoyage = amount;
      } else if (/\b(premiums?|insur\w*|war[\s-]?risk|cover)\b|보험/i.test(clause)) {
        best = {
          ...base,
          usdPerVoyage: amount,
          ratePct: null,
          rateHighPct: null,
          ratePrevPct: null,
          direction: directionOf(clause),
          confidence: "medium",
          quote: trimQuote(clause),
        };
      }
    }
  }

  return best;
}
