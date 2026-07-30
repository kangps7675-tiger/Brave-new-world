/**
 * 지정학 축(axis) 관계망 — 충돌 구역만이 아닌 허브 중심 외교·군수·하이브리드.
 * 핵심 허브: 이란 · 중국 · 러시아 · 북한 (IRN / CHN / RUS / PRK)
 */

export type AxisHubId = "IRN" | "CHN" | "RUS" | "PRK";

/** 관계 성격 — 지도 호 스타일·필터용 */
export type AxisRelationKind =
  | "patronage" // 후원·안보 동맹
  | "arms" // 군수·미사일·드론
  | "energy" // 에너지·원자재·운송
  | "hybrid" // 사보타주·사이버·정보·제재회피
  | "diplomatic"; // 정상외교·다자·경제벨트

export type AxisNode = {
  code: string;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
  hub?: AxisHubId;
};

export type AxisEdge = {
  id: string;
  a: string;
  b: string;
  kind: AxisRelationKind;
  /** 어느 허브 렌즈에 속하는지 (양방향이면 양쪽) */
  hubs: AxisHubId[];
  labelKo: string;
  labelEn: string;
};

/** ISO 알파3 노드 좌표 (수도·외교중심 근사) */
export const AXIS_NODES: Record<string, AxisNode> = {
  IRN: { code: "IRN", nameKo: "이란", nameEn: "Iran", lat: 35.69, lng: 51.39, hub: "IRN" },
  CHN: { code: "CHN", nameKo: "중국", nameEn: "China", lat: 39.9, lng: 116.41, hub: "CHN" },
  RUS: { code: "RUS", nameKo: "러시아", nameEn: "Russia", lat: 55.75, lng: 37.62, hub: "RUS" },
  PRK: { code: "PRK", nameKo: "북한", nameEn: "North Korea", lat: 39.04, lng: 125.76, hub: "PRK" },
  BLR: { code: "BLR", nameKo: "벨라루스", nameEn: "Belarus", lat: 53.9, lng: 27.56 },
  SYR: { code: "SYR", nameKo: "시리아", nameEn: "Syria", lat: 33.51, lng: 36.29 },
  IRQ: { code: "IRQ", nameKo: "이라크", nameEn: "Iraq", lat: 33.31, lng: 44.37 },
  YEM: { code: "YEM", nameKo: "예멘", nameEn: "Yemen", lat: 15.35, lng: 44.21 },
  LBN: { code: "LBN", nameKo: "레바논", nameEn: "Lebanon", lat: 33.89, lng: 35.5 },
  ARE: { code: "ARE", nameKo: "UAE", nameEn: "UAE", lat: 24.45, lng: 54.37 },
  SAU: { code: "SAU", nameKo: "사우디", nameEn: "Saudi Arabia", lat: 24.71, lng: 46.68 },
  KAZ: { code: "KAZ", nameKo: "카자흐스탄", nameEn: "Kazakhstan", lat: 51.17, lng: 71.45 },
  UZB: { code: "UZB", nameKo: "우즈베키스탄", nameEn: "Uzbekistan", lat: 41.3, lng: 69.24 },
  TKM: { code: "TKM", nameKo: "투르크메니스탄", nameEn: "Turkmenistan", lat: 37.96, lng: 58.38 },
  KGZ: { code: "KGZ", nameKo: "키르기스스탄", nameEn: "Kyrgyzstan", lat: 42.87, lng: 74.59 },
  TJK: { code: "TJK", nameKo: "타지키스탄", nameEn: "Tajikistan", lat: 38.56, lng: 68.77 },
  PAK: { code: "PAK", nameKo: "파키스탄", nameEn: "Pakistan", lat: 33.68, lng: 73.05 },
  CUB: { code: "CUB", nameKo: "쿠바", nameEn: "Cuba", lat: 23.11, lng: -82.37 },
  VEN: { code: "VEN", nameKo: "베네수엘라", nameEn: "Venezuela", lat: 10.48, lng: -66.9 },
  MMR: { code: "MMR", nameKo: "미얀마", nameEn: "Myanmar", lat: 19.76, lng: 96.08 },
};

/** 핵심 4허브 */
export const AXIS_HUB_CODES: ReadonlySet<AxisHubId> = new Set(["IRN", "CHN", "RUS", "PRK"]);

export const AXIS_HUB_META: Record<
  AxisHubId,
  { nameKo: string; nameEn: string; color: string }
> = {
  IRN: { nameKo: "이란 중심", nameEn: "Iran hub", color: "rgba(16, 185, 129, 0.88)" },
  CHN: { nameKo: "중국 중심", nameEn: "China hub", color: "rgba(230, 180, 34, 0.9)" },
  RUS: { nameKo: "러시아 중심", nameEn: "Russia hub", color: "rgba(96, 165, 250, 0.9)" },
  PRK: { nameKo: "북한 중심", nameEn: "DPRK hub", color: "rgba(255, 0, 85, 0.9)" },
};

export const AXIS_RELATION_COLORS: Record<AxisRelationKind, string> = {
  patronage: "rgba(167, 139, 250, 0.82)",
  arms: "rgba(248, 113, 113, 0.78)",
  energy: "rgba(250, 204, 21, 0.75)",
  hybrid: "rgba(251, 146, 60, 0.8)",
  diplomatic: "rgba(125, 211, 252, 0.78)",
};

/** 점선 호버용 — 관계 종류 짧은 이름 */
export const AXIS_RELATION_LABELS: Record<
  AxisRelationKind,
  { ko: string; en: string }
> = {
  patronage: { ko: "후원·안보", en: "Patronage & security" },
  arms: { ko: "군수·무기", en: "Arms & munitions" },
  energy: { ko: "에너지·원자재", en: "Energy & commodities" },
  hybrid: { ko: "하이브리드·제재회피", en: "Hybrid & sanctions evasion" },
  diplomatic: { ko: "외교·다자", en: "Diplomatic ties" },
};

/** 점선 호버용 — 한 줄 설명 */
export const AXIS_RELATION_BLURBS: Record<
  AxisRelationKind,
  { ko: string; en: string }
> = {
  patronage: {
    ko: "후원·안보 동맹 성격의 축 연결입니다.",
    en: "Patronage or security-aligned axis link.",
  },
  arms: {
    ko: "군수·미사일·드론 등 무기 협력 축 연결입니다.",
    en: "Arms, missile, or drone cooperation link.",
  },
  energy: {
    ko: "에너지·원자재·운송 협력 축 연결입니다.",
    en: "Energy, commodities, or transport link.",
  },
  hybrid: {
    ko: "사보타주·사이버·정보·제재회피 등 하이브리드 축 연결입니다.",
    en: "Hybrid channel — sabotage, cyber, intel, or sanctions evasion.",
  },
  diplomatic: {
    ko: "정상외교·다자·경제벨트 성격의 축 연결입니다.",
    en: "Diplomatic, multilateral, or economic-belt link.",
  },
};

export function axisRelationKindLabel(
  kind: AxisRelationKind,
  lang: "ko" | "en" = "ko",
): string {
  return AXIS_RELATION_LABELS[kind][lang];
}

export function axisRelationKindBlurb(
  kind: AxisRelationKind,
  lang: "ko" | "en" = "ko",
): string {
  return AXIS_RELATION_BLURBS[kind][lang];
}

function edge(
  a: string,
  b: string,
  kind: AxisRelationKind,
  hubs: AxisHubId[],
  labelKo: string,
  labelEn: string,
): AxisEdge {
  const [x, y] = a < b ? [a, b] : [b, a];
  return {
    id: `axis-${x}-${y}-${kind}`,
    a: x,
    b: y,
    kind,
    hubs,
    labelKo,
    labelEn,
  };
}

/**
 * 정적 관계망 호 — 핵심 메시 + 스포크.
 * (완전 그래프가 아니라 실중 전략 링크만)
 */
export const AXIS_EDGES: readonly AxisEdge[] = [
  // —— 핵심 4국 메시 ——
  edge("IRN", "CHN", "diplomatic", ["IRN", "CHN"], "중–이란 전략·에너지", "China–Iran strategic/energy"),
  edge("IRN", "RUS", "arms", ["IRN", "RUS"], "러–이란 군수·드론", "Russia–Iran arms/drones"),
  edge("IRN", "PRK", "arms", ["IRN", "PRK"], "북–이란 미사일·군수", "DPRK–Iran missiles/arms"),
  edge("CHN", "RUS", "patronage", ["CHN", "RUS"], "중–러 ‘무제한’ 파트너십", "China–Russia partnership"),
  edge("CHN", "PRK", "patronage", ["CHN", "PRK"], "중–북 후원·국경", "China–DPRK patronage"),
  edge("RUS", "PRK", "arms", ["RUS", "PRK"], "러–북 군수·조약", "Russia–DPRK arms/treaty"),

  // —— 러시아 스포크 ——
  edge("RUS", "BLR", "patronage", ["RUS"], "러–벨라루스 동맹국가", "Russia–Belarus Union State"),
  edge("RUS", "KAZ", "energy", ["RUS"], "러–카자흐 에너지·CSTO", "Russia–Kazakhstan energy/CSTO"),
  edge("RUS", "UZB", "diplomatic", ["RUS"], "러–우즈벡 안보·경제", "Russia–Uzbekistan ties"),
  edge("RUS", "TKM", "energy", ["RUS"], "러–투르크멘 가스", "Russia–Turkmenistan gas"),
  edge("RUS", "KGZ", "patronage", ["RUS"], "러–키르기스 기지·CSTO", "Russia–Kyrgyzstan CSTO"),
  edge("RUS", "TJK", "patronage", ["RUS"], "러–타직 기지·안보", "Russia–Tajikistan security"),
  edge("RUS", "SYR", "arms", ["RUS"], "러–시리아 군사 주둔", "Russia–Syria military"),

  // —— 중국 스포크 ——
  edge("CHN", "KAZ", "energy", ["CHN"], "중–카자흐 벨트·에너지", "China–Kazakhstan BRI/energy"),
  edge("CHN", "UZB", "diplomatic", ["CHN"], "중–우즈벡 BRI", "China–Uzbekistan BRI"),
  edge("CHN", "TKM", "energy", ["CHN"], "중–투르크멘 가스관", "China–Turkmenistan gas"),
  edge("CHN", "PAK", "patronage", ["CHN"], "중–파키스탄 CPEC", "China–Pakistan CPEC"),
  edge("CHN", "SAU", "energy", ["CHN"], "중–사우디 에너지·위안", "China–Saudi energy"),
  edge("CHN", "ARE", "diplomatic", ["CHN"], "중–UAE 금융·물류", "China–UAE finance/logistics"),
  edge("CHN", "MMR", "hybrid", ["CHN"], "중–미얀마 국경·자원", "China–Myanmar border/resources"),
  edge("CHN", "IRN", "energy", ["CHN", "IRN"], "중–이란 원유·제재회피", "China–Iran oil/sanctions"),

  // —— 이란 스포크 (중동) ——
  edge("IRN", "SYR", "patronage", ["IRN"], "이란–시리아 축", "Iran–Syria axis"),
  edge("IRN", "IRQ", "patronage", ["IRN"], "이란–이라크 영향권", "Iran–Iraq influence"),
  edge("IRN", "LBN", "hybrid", ["IRN"], "이란–레바논(헤즈볼라)", "Iran–Lebanon (Hezbollah)"),
  edge("IRN", "YEM", "arms", ["IRN"], "이란–예멘(후티) 군수", "Iran–Yemen (Houthi) arms"),

  // —— 북한 스포크 ——
  edge("PRK", "BLR", "diplomatic", ["PRK"], "북–벨라루스 외교·군수", "DPRK–Belarus diplomacy/arms"),
  edge("PRK", "SYR", "arms", ["PRK"], "북–시리아 군수 연계", "DPRK–Syria arms links"),
  edge("PRK", "YEM", "arms", ["PRK"], "북–예멘 무기 흐름", "DPRK–Yemen arms flows"),
  edge("PRK", "CUB", "diplomatic", ["PRK"], "북–쿠바 체제 연대", "DPRK–Cuba solidarity"),
  edge("PRK", "VEN", "diplomatic", ["PRK"], "북–베네수엘라 연대", "DPRK–Venezuela ties"),
  edge("PRK", "IRN", "hybrid", ["PRK", "IRN"], "북–이란 하이브리드·군수", "DPRK–Iran hybrid/arms"),

  // —— 하이브리드·우회 (허브 간 강조) ——
  edge("RUS", "IRN", "hybrid", ["RUS", "IRN"], "러–이란 제재회피·암시장", "Russia–Iran sanctions evasion"),
  edge("RUS", "PRK", "hybrid", ["RUS", "PRK"], "러–북 군수·노동·사이버", "Russia–DPRK hybrid logistics"),
  edge("CHN", "RUS", "hybrid", ["CHN", "RUS"], "중–러 이중용도·결제우회", "China–Russia dual-use/finance"),
];

/** 축 정렬 블록 — 이벤트 분류용 (허브+주요 스포크) */
export const AXIS_ALIGNMENT_CODES: ReadonlySet<string> = new Set([
  "IRN",
  "CHN",
  "RUS",
  "PRK",
  "BLR",
  "SYR",
  "IRQ",
  "YEM",
  "LBN",
  "KAZ",
  "UZB",
  "TKM",
  "KGZ",
  "TJK",
  "CUB",
  "VEN",
  "MMR",
  "PAK",
]);

const AXIS_EDGE_PAIR_KEYS = new Set(
  AXIS_EDGES.map((e) => `${e.a}|${e.b}`),
);

export function axisPairKey(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a || !b || a === b) return null;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** 정적 네트워크에 등록된 페어인가 */
export function isAxisNetworkPair(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const key = axisPairKey(a, b);
  return key ? AXIS_EDGE_PAIR_KEYS.has(key) : false;
}

/** 축 정렬 블록 내부 (허브·스포크) — 협력/마찰 모두 축 뉴스 */
export function isAxisAlignmentPair(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b || a === b) return false;
  if (isAxisNetworkPair(a, b)) return true;
  return AXIS_ALIGNMENT_CODES.has(a) && AXIS_ALIGNMENT_CODES.has(b);
}

export function isAxisHub(code: string | null | undefined): code is AxisHubId {
  return Boolean(code && AXIS_HUB_CODES.has(code as AxisHubId));
}

export function edgesForHub(hub: AxisHubId | "all"): AxisEdge[] {
  if (hub === "all") {
    // 동일 a-b 중복 kind는 지도에서 하나로 — patronage/arms 우선
    const seen = new Map<string, AxisEdge>();
    const rank: Record<AxisRelationKind, number> = {
      patronage: 0,
      arms: 1,
      hybrid: 2,
      energy: 3,
      diplomatic: 4,
    };
    for (const e of AXIS_EDGES) {
      const key = `${e.a}|${e.b}`;
      const prev = seen.get(key);
      if (!prev || rank[e.kind] < rank[prev.kind]) seen.set(key, e);
    }
    return [...seen.values()];
  }
  return edgesForHub("all").filter((e) => e.hubs.includes(hub));
}
