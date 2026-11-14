import type { MediaTrustTier, NewsStreamItem } from "@/lib/news/types";

/**
 * 속보 한 건에 붙이는 확인 상태. 랜딩이 약속한 세 칸과 같은 말을 쓴다.
 * - confirmed: 서로 다른 독립 매체 둘 이상이 같은 일을 보도했고, 그 중 하나는 1등급(와이어·주요 언론)
 * - likely:    독립 매체 한 곳만 보도했다 (1·2등급). 아직 다른 곳이 받쳐 주지 않는다
 * - nodata:    독립 보도가 없다. 국영·당사자 발표·텔레그램 같은 전언뿐이다
 *
 * "맞다/틀리다"를 가르는 판정이 아니라 "누가 몇 곳이 말했나"를 센 것이다.
 * 3등급(국영·당사자)은 아무리 많아도 서로를 받쳐 주지 못하므로 센 수에 넣지 않는다.
 *
 * 같은 통신사 기사를 받아 쓴 매체들은 독립 보도가 아니다. 본문·요약에 통신사 표기(예: "(Reuters)",
 * "according to AP")가 있으면 그 통신사 한 곳으로 합쳐 센다. 합치는 쪽이 항상 보수적이다
 * (확인이 유력으로 내려갈 수는 있어도, 유력이 확인으로 올라가지는 않는다).
 */
export type FlashVerdict = "confirmed" | "likely" | "nodata";

export type FlashVerdictInfo = {
  verdict: FlashVerdict;
  /** 독립 보도 매체 수 (1·2등급, 같은 매체·같은 통신사 기사 중복 제거) */
  independentCount: number;
  /** 근거가 된 매체 이름 (최대 4곳) */
  sources: string[];
  /** 당사자·국영 발표만 있는 경우 true */
  partyOnly: boolean;
  /** 통신사 기사를 받아 쓴 탓에 그 통신사 한 곳으로 합친 매체 수. 없으면 0이거나 빠져 있다 */
  wireMerged?: number;
};

/** 판정에 넣는 기사 한 건. 제목·요약은 통신사 표기를 찾는 데만 쓴다 */
export type VerdictClusterItem = Pick<NewsStreamItem, "publisher" | "source" | "trustTier"> & {
  title?: string;
  summary?: string;
};

function publisherKey(item: Pick<NewsStreamItem, "publisher" | "source">): string {
  const raw = (item.publisher || item.source || "").toLowerCase();
  return raw
    .replace(/\b(news|the|world|international|online|co\.?|ltd\.?)\b/g, " ")
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim();
}

function isIndependent(tier: MediaTrustTier): boolean {
  return tier === 1 || tier === 2;
}

/** 통신사. 모두 1등급 와이어다 (mediaRegistry 기준) */
const WIRES: ReadonlyArray<{ key: string; name: string; own: RegExp }> = [
  { key: "reuters", name: "Reuters", own: /^reuters\b/ },
  { key: "ap", name: "Associated Press", own: /^(associated press|ap)$/ },
  { key: "afp", name: "AFP", own: /^(afp|agence france presse)\b/ },
  { key: "dpa", name: "dpa", own: /^dpa\b/ },
  { key: "efe", name: "EFE", own: /^efe$/ },
  { key: "ansa", name: "ANSA", own: /^ansa$/ },
  { key: "pti", name: "PTI", own: /^pti$/ },
  { key: "kyodo", name: "Kyodo", own: /^kyodo\b/ },
  { key: "jiji", name: "Jiji", own: /^jiji\b/ },
  { key: "yonhap", name: "Yonhap", own: /^yonhap\b/ },
];

const WIRE_BY_KEY = new Map(WIRES.map((w) => [w.key, w]));

/** 기사 첫머리의 발신지 표기: "KYIV (Reuters) -", "BEIRUT (AP) —". "(AP)"만으로는 안트라프라데시(AP) 같은 약어와 섞이므로 줄표까지 본다 */
const DATELINE_RE = /^[^()]{0,60}\(\s*(Reuters|AP|AFP|dpa|EFE|ANSA|PTI|Kyodo|Yonhap|Jiji)\s*\)\s*[-–—]/;
/** 괄호 속 통신사 표기: "... (Reuters)". 약어가 겹치기 쉬운 AP·PTI·EFE·ANSA는 뺀다 */
const PAREN_RE = /\((Reuters|AFP|Kyodo|Yonhap|dpa)\)/;
/** 본문 속 인용: "according to Reuters", "told AP", "via AFP" */
const CITE_RE =
  /\b(?:[Aa]ccording to|[Pp]er|[Vv]ia|[Cc]iting|[Rr]eported by|[Rr]eports? by|[Tt]old|[Ff]rom)\s+(?:the\s+)?(Reuters|Associated Press|Agence France-Presse|AFP|AP|dpa|EFE|ANSA|PTI|Kyodo|Jiji|Yonhap)\b/;

function wireKeyFromName(name: string): string | null {
  const n = name.toLowerCase();
  if (n === "associated press") return "ap";
  if (n === "agence france-presse") return "afp";
  return WIRE_BY_KEY.has(n) ? n : null;
}

/** 이 기사가 통신사 자신의 기사인가 */
function ownWireKey(pubKey: string): string | null {
  return WIRES.find((w) => w.own.test(pubKey))?.key ?? null;
}

/** 이 기사가 다른 통신사의 기사를 받아 쓴 것으로 읽히는가 */
function creditedWireKey(item: VerdictClusterItem): string | null {
  const title = (item.title ?? "").trim();
  const summary = (item.summary ?? "").trim();
  if (!title && !summary) return null;
  for (const part of [title, summary]) {
    const dateline = part.match(DATELINE_RE);
    if (dateline?.[1]) return wireKeyFromName(dateline[1]);
  }
  const text = `${title} ${summary}`;
  const paren = text.match(PAREN_RE);
  if (paren?.[1]) return wireKeyFromName(paren[1]);
  const cite = text.match(CITE_RE);
  if (cite?.[1]) return wireKeyFromName(cite[1]);
  return null;
}

type Origin = { key: string; name: string; tier: MediaTrustTier; viaWire: boolean; pubKey: string };

function originOf(item: VerdictClusterItem): Origin | null {
  const pubKey = publisherKey(item);
  const own = ownWireKey(pubKey);
  if (own) {
    return { key: `wire:${own}`, name: WIRE_BY_KEY.get(own)!.name, tier: 1, viaWire: false, pubKey };
  }
  const credited = creditedWireKey(item);
  if (credited) {
    return { key: `wire:${credited}`, name: WIRE_BY_KEY.get(credited)!.name, tier: 1, viaWire: true, pubKey };
  }
  if (!pubKey) return null;
  return {
    key: pubKey,
    name: item.publisher || item.source,
    tier: item.trustTier,
    viaWire: false,
    pubKey,
  };
}

export function computeFlashVerdict(cluster: VerdictClusterItem[]): FlashVerdictInfo {
  const byKey = new Map<string, { name: string; tier: MediaTrustTier }>();
  const mergedOutlets = new Set<string>();
  let partyOnly = false;
  for (const item of cluster) {
    if (!isIndependent(item.trustTier)) {
      partyOnly = true;
      continue;
    }
    const origin = originOf(item);
    if (!origin) continue;
    if (origin.viaWire && origin.pubKey) mergedOutlets.add(origin.pubKey);
    const prev = byKey.get(origin.key);
    // 같은 곳이 두 번 나오면 더 높은 등급으로 남긴다
    if (!prev || origin.tier < prev.tier) {
      byKey.set(origin.key, { name: origin.name, tier: origin.tier });
    }
  }
  const independent = [...byKey.values()].sort((a, b) => a.tier - b.tier);
  const independentCount = independent.length;
  const hasTier1 = independent.some((s) => s.tier === 1);
  const sources = independent.slice(0, 4).map((s) => s.name);
  const wireMerged = mergedOutlets.size;

  if (independentCount >= 2 && hasTier1) {
    return { verdict: "confirmed", independentCount, sources, partyOnly: false, wireMerged };
  }
  if (independentCount >= 1) {
    return { verdict: "likely", independentCount, sources, partyOnly, wireMerged };
  }
  return { verdict: "nodata", independentCount: 0, sources: [], partyOnly, wireMerged: 0 };
}

const LABELS: Record<FlashVerdict, { ko: string; en: string }> = {
  confirmed: { ko: "확인", en: "Confirmed" },
  likely: { ko: "유력", en: "Likely" },
  nodata: { ko: "자료 없음", en: "No source" },
};

export function flashVerdictLabel(verdict: FlashVerdict, lang: "ko" | "en"): string {
  return LABELS[verdict][lang];
}

/** 도장 옆에 늘 붙이는 주의 문구. 이 칸이 무엇을 센 것인지 말한다. */
export function flashVerdictNote(lang: "ko" | "en"): string {
  return lang === "en"
    ? "This counts how many independent outlets reported it. It does not rule on whether it is true."
    : "보도한 독립 매체의 수를 센 것입니다. 사실인지 아닌지를 가린 판정은 아닙니다.";
}

/** 라벨 옆에 붙이는 한 줄 근거. 숫자와 매체 이름만 말한다. */
export function flashVerdictBasis(info: FlashVerdictInfo, lang: "ko" | "en"): string {
  if (info.verdict === "nodata") {
    return lang === "en"
      ? "Only state or party statements so far. No independent report."
      : "국영·당사자 발표뿐입니다. 독립 매체 보도는 아직 없습니다.";
  }
  const names = info.sources.join(", ");
  const merged = info.wireMerged ?? 0;
  const mergedKo = merged > 0 ? ` 통신사 기사를 받아 쓴 ${merged}곳은 그 통신사 한 곳으로 셌습니다.` : "";
  const mergedEn = merged > 0 ? ` ${merged} outlet${merged > 1 ? "s" : ""} that reran a wire story count as that wire once.` : "";
  if (info.verdict === "confirmed") {
    return lang === "en"
      ? `${info.independentCount} independent outlets reported it: ${names}.${mergedEn}`
      : `독립 매체 ${info.independentCount}곳이 보도했습니다: ${names}.${mergedKo}`;
  }
  return lang === "en"
    ? `Only one outlet so far: ${names}. Not yet backed by another.${mergedEn}`
    : `한 곳만 보도했습니다: ${names}. 다른 매체가 아직 받쳐 주지 않습니다.${mergedKo}`;
}
