import type { MediaTrustTier, NewsStreamItem } from "@/lib/news/types";

/**
 * 속보 한 건에 붙이는 확인 상태. 랜딩이 약속한 세 칸과 같은 말을 쓴다.
 * - confirmed: 서로 다른 독립 매체 둘 이상이 같은 일을 보도했고, 그 중 하나는 1등급(와이어·주요 언론)
 * - likely:    독립 매체 한 곳만 보도했다 (1·2등급). 아직 다른 곳이 받쳐 주지 않는다
 * - nodata:    독립 보도가 없다. 국영·당사자 발표·텔레그램 같은 전언뿐이다
 *
 * "맞다/틀리다"를 가르는 판정이 아니라 "누가 몇 곳이 말했나"를 센 것이다.
 * 3등급(국영·당사자)은 아무리 많아도 서로를 받쳐 주지 못하므로 센 수에 넣지 않는다.
 */
export type FlashVerdict = "confirmed" | "likely" | "nodata";

export type FlashVerdictInfo = {
  verdict: FlashVerdict;
  /** 독립 보도 매체 수 (1·2등급, 같은 매체 중복 제거) */
  independentCount: number;
  /** 근거가 된 매체 이름 (최대 4곳) */
  sources: string[];
  /** 당사자·국영 발표만 있는 경우 true */
  partyOnly: boolean;
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

export function computeFlashVerdict(
  cluster: Array<Pick<NewsStreamItem, "publisher" | "source" | "trustTier">>,
): FlashVerdictInfo {
  const byKey = new Map<string, { name: string; tier: MediaTrustTier }>();
  let partyOnly = false;
  for (const item of cluster) {
    if (!isIndependent(item.trustTier)) {
      partyOnly = true;
      continue;
    }
    const key = publisherKey(item);
    if (!key) continue;
    const prev = byKey.get(key);
    // 같은 매체가 두 번 나오면 더 높은 등급으로 남긴다
    if (!prev || item.trustTier < prev.tier) {
      byKey.set(key, { name: item.publisher || item.source, tier: item.trustTier });
    }
  }
  const independent = [...byKey.values()].sort((a, b) => a.tier - b.tier);
  const independentCount = independent.length;
  const hasTier1 = independent.some((s) => s.tier === 1);
  const sources = independent.slice(0, 4).map((s) => s.name);

  if (independentCount >= 2 && hasTier1) {
    return { verdict: "confirmed", independentCount, sources, partyOnly: false };
  }
  if (independentCount >= 1) {
    return { verdict: "likely", independentCount, sources, partyOnly };
  }
  return { verdict: "nodata", independentCount: 0, sources: [], partyOnly };
}

const LABELS: Record<FlashVerdict, { ko: string; en: string }> = {
  confirmed: { ko: "확인", en: "Confirmed" },
  likely: { ko: "유력", en: "Likely" },
  nodata: { ko: "자료 없음", en: "No source" },
};

export function flashVerdictLabel(verdict: FlashVerdict, lang: "ko" | "en"): string {
  return LABELS[verdict][lang];
}

/** 라벨 옆에 붙이는 한 줄 근거. 숫자와 매체 이름만 말한다. */
export function flashVerdictBasis(info: FlashVerdictInfo, lang: "ko" | "en"): string {
  if (info.verdict === "nodata") {
    return lang === "en"
      ? "Only state or party statements so far. No independent report."
      : "국영·당사자 발표뿐입니다. 독립 매체 보도는 아직 없습니다.";
  }
  const names = info.sources.join(", ");
  if (info.verdict === "confirmed") {
    return lang === "en"
      ? `${info.independentCount} independent outlets reported it: ${names}.`
      : `독립 매체 ${info.independentCount}곳이 보도했습니다: ${names}.`;
  }
  return lang === "en"
    ? `Only one outlet so far: ${names}. Not yet backed by another.`
    : `한 곳만 보도했습니다: ${names}. 다른 매체가 아직 받쳐 주지 않습니다.`;
}
