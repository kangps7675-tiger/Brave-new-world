/**
 * 초크포인트(해협·운하) 뉴스 감지 — 등불·뉴스 스트림 공통.
 * 지정학: 봉쇄·해군·공격 축 / 지경학: 유가·물류·운임 축을 더 세게 가산.
 */

export type ChokepointId =
  | "hormuz"
  | "suez"
  | "bab-el-mandeb"
  | "malacca"
  | "taiwan-strait"
  | "panama"
  | "bosporus"
  | "gibraltar"
  | "good-hope"
  | "generic";

export type ChokepointHit = {
  id: ChokepointId;
  labelKo: string;
  labelEn: string;
};

/** 해협·운하·초크 지명 */
export const CHOKEPOINT_PLACE_RE =
  /\b(hormuz|strait of hormuz|suez|suez canal|bab[\s-]?el[\s-]?mandeb|bab al[- ]mandab|malacca|strait of malacca|taiwan strait|panama canal|bosporus|bosphorus|dardanelles|gibraltar|cape of good hope|good hope|red sea|persian gulf|hormuz strait|海峡|호르무즈|수에즈|바브[\s-]?엘[\s-]?만데브|말라카|대만해협|파나마\s?운하|보스포루스|지브롤터|희망봉|홍해|페르시아만)\b/i;

/** 지경학 — 유가·물류·운임 각도 */
export const CHOKEPOINT_ECON_ANGLE_RE =
  /\b(oil|crude|brent|wti|lng|gas|freight|shipping|container|tanker|bunker|insurance|premium|supply\s?chain|logistics|reroute|diversion|transit|port\b|rate|war\s?risk|유가|원유|브렌트|운임|해운|컨테이너|유조선|물류|보험|할증|우회|통항|공급망)\b/i;

/** 지정학 — 군사·봉쇄·공격 각도 */
export const CHOKEPOINT_SECURITY_ANGLE_RE =
  /\b(navy|naval|blockade|mine|missile|drone|attack|strike|houthi|irgc|centcom|carrier|destroyer|escort|seizure|board|convoy|해군|봉쇄|기뢰|미사일|드론|공격|후티|호위|나포|함정|항모)\b/i;

const CHOKE_DEFS: Array<{
  id: ChokepointId;
  re: RegExp;
  labelKo: string;
  labelEn: string;
}> = [
  {
    id: "hormuz",
    re: /\b(hormuz|strait of hormuz|호르무즈)\b/i,
    labelKo: "호르무즈",
    labelEn: "Hormuz",
  },
  {
    id: "suez",
    re: /\b(suez|suez canal|수에즈)\b/i,
    labelKo: "수에즈",
    labelEn: "Suez",
  },
  {
    id: "bab-el-mandeb",
    re: /\b(bab[\s-]?el[\s-]?mandeb|bab al[- ]mandab|바브[\s-]?엘[\s-]?만데브|홍해|red sea)\b/i,
    labelKo: "바브엘만데브·홍해",
    labelEn: "Bab-el-Mandeb · Red Sea",
  },
  {
    id: "malacca",
    re: /\b(malacca|strait of malacca|말라카)\b/i,
    labelKo: "말라카",
    labelEn: "Malacca",
  },
  {
    id: "taiwan-strait",
    re: /\b(taiwan strait|대만해협)\b/i,
    labelKo: "대만해협",
    labelEn: "Taiwan Strait",
  },
  {
    id: "panama",
    re: /\b(panama canal|파나마\s?운하)\b/i,
    labelKo: "파나마",
    labelEn: "Panama",
  },
  {
    id: "bosporus",
    re: /\b(bosporus|bosphorus|dardanelles|보스포루스|다르다넬스)\b/i,
    labelKo: "보스포루스",
    labelEn: "Bosporus",
  },
  {
    id: "gibraltar",
    re: /\b(gibraltar|지브롤터)\b/i,
    labelKo: "지브롤터",
    labelEn: "Gibraltar",
  },
  {
    id: "good-hope",
    re: /\b(cape of good hope|good hope|희망봉)\b/i,
    labelKo: "희망봉",
    labelEn: "Cape of Good Hope",
  },
];

export function detectChokepoint(text: string): ChokepointHit | null {
  if (!text?.trim()) return null;
  for (const def of CHOKE_DEFS) {
    if (def.re.test(text)) {
      return { id: def.id, labelKo: def.labelKo, labelEn: def.labelEn };
    }
  }
  if (CHOKEPOINT_PLACE_RE.test(text)) {
    return { id: "generic", labelKo: "초크포인트", labelEn: "Chokepoint" };
  }
  return null;
}

export function isChokepointNews(text: string): boolean {
  return detectChokepoint(text) != null;
}

/** 지경학 등불·시트 — 초크 + 유가·물류 각도 */
export function isChokepointEconomyNews(text: string): boolean {
  if (!isChokepointNews(text)) return false;
  return CHOKEPOINT_ECON_ANGLE_RE.test(text);
}

/** 지정학 등불·시트 — 초크 + 군사·봉쇄 각도 (지명만 있어도 약하게 인정) */
export function isChokepointSecurityNews(text: string): boolean {
  if (!isChokepointNews(text)) return false;
  return CHOKEPOINT_SECURITY_ANGLE_RE.test(text);
}

export function chokepointFocusTag(text: string, lang: "ko" | "en"): string | null {
  const hit = detectChokepoint(text);
  if (!hit) return null;
  return lang === "en" ? hit.labelEn : hit.labelKo;
}

/**
 * 점수 가산 (낮을수록 우선). mode에 따라 경제/안보 각도를 더 세게.
 */
export function chokepointScoreBonus(
  text: string,
  mode: "economy" | "conflict",
): number {
  if (!isChokepointNews(text)) return 0;
  if (mode === "economy") {
    if (isChokepointEconomyNews(text)) return -36;
    return -14;
  }
  if (isChokepointSecurityNews(text)) return -32;
  return -16;
}
