/**
 * 동맹·경계 독트린 코퍼스 — NATO 조약 원문 + CSIS 등 공개 연구 구조화 메모.
 *
 * 용도:
 *  - Perimeter(주변국) 감시 ISO / 신호 어휘
 *  - 대만해협 시나리오 사다리·무역 사실(출처 필수)
 *  - 방법론·양피지 각주 (조약 발동 예측 금지)
 *
 * 원본 PDF: scripts/vendor/alliance-doctrine/reports/
 * 정규화 JSON: src/data/alliance-doctrine/ (런타임) · scripts/vendor/alliance-doctrine/ (보존 복사)
 */

import doctrineJson from "./alliance-doctrine/alliance-doctrine.normalized.json";
import natoJson from "./alliance-doctrine/nato-north-atlantic-treaty-1949.json";

export type AllianceFlank = "atlantic" | "indo-pacific" | "both";

export type NatoArticle = {
  n: number;
  titleEn: string;
  textEn: string;
  uiTag?: string;
  noteKo?: string;
};

export type DoctrineSource = {
  id: string;
  kind: string;
  titleEn: string;
  publisher: string;
  vendorPath?: string;
  url?: string;
  date?: string;
  flank?: AllianceFlank | string;
  authors?: string[];
};

export type ScenarioRung = {
  id: string;
  labelKo: string;
  labelEn: string;
  intensity: number;
  primarySources: string[];
  claimKo: string;
  claimEn: string;
};

export type TradeFact = {
  id: string;
  sourceId: string;
  factKo: string;
  factEn: string;
  tags: string[];
};

export const NATO_TREATY = natoJson as {
  id: string;
  title: string;
  signed: string;
  place: string;
  sourceUrl: string;
  caveatKo: string;
  articles: NatoArticle[];
};

export const ALLIANCE_DOCTRINE = doctrineJson as {
  id: string;
  updated: string;
  caveatKo: string;
  sources: DoctrineSource[];
  scenarioLadder: ScenarioRung[];
  tradeFacts: TradeFact[];
  perimeterSets: {
    natoEastFlankIso: string[];
    indoPacificAllyPartnerIso: string[];
    usForcePresenceHintIso: string[];
    noteKo: string;
  };
  spilloverSignalLexicon: {
    kineticOrAlert: string[];
    excludeSoft: string[];
    noteKo: string;
  };
  usageHooks: Array<{ id: string; howKo: string }>;
};

export function natoArticle(n: number): NatoArticle | undefined {
  return NATO_TREATY.articles.find((a) => a.n === n);
}

/** Article 4 = consult 신호 각주 / Article 5 = collective-defence 각주 (발동 단정 금지) */
export function natoUiFootnote(
  tag: "consult" | "collective-defence" | "scope",
  lang: "ko" | "en" = "ko",
): string {
  const art = NATO_TREATY.articles.find((a) => a.uiTag === tag);
  if (!art) return NATO_TREATY.caveatKo;
  if (lang === "en") {
    return `${NATO_TREATY.title}, Article ${art.n}: ${art.titleEn}. This app never declares treaty activation.`;
  }
  return art.noteKo ?? NATO_TREATY.caveatKo;
}

export function isNatoEastFlankIso(iso: string): boolean {
  return ALLIANCE_DOCTRINE.perimeterSets.natoEastFlankIso.includes(iso.toUpperCase());
}

export function isIndoPacificPerimeterIso(iso: string): boolean {
  return ALLIANCE_DOCTRINE.perimeterSets.indoPacificAllyPartnerIso.includes(
    iso.toUpperCase(),
  );
}

export function isPerimeterIso(iso: string): boolean {
  const u = iso.toUpperCase();
  return isNatoEastFlankIso(u) || isIndoPacificPerimeterIso(u);
}

export function allPerimeterIsos(): string[] {
  const s = ALLIANCE_DOCTRINE.perimeterSets;
  return [...new Set([...s.natoEastFlankIso, ...s.indoPacificAllyPartnerIso])];
}

/** 공개 기사 텍스트가 주변국 유출 ‘후보’인지 — 뇌피셜 없이 키워드∩경계만 */
export function matchSpilloverSignal(text: string): {
  hit: boolean;
  flank: AllianceFlank | null;
  matchedAlert: string | null;
} {
  const blob = text || "";
  const lex = ALLIANCE_DOCTRINE.spilloverSignalLexicon;
  if (lex.excludeSoft.some((w) => new RegExp(w, "i").test(blob))) {
    return { hit: false, flank: null, matchedAlert: null };
  }
  let matchedAlert: string | null = null;
  for (const w of lex.kineticOrAlert) {
    if (new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(blob)) {
      matchedAlert = w;
      break;
    }
  }
  if (!matchedAlert) return { hit: false, flank: null, matchedAlert: null };

  const atlanticHints =
    /\b(poland|romania|lithuania|latvia|estonia|slovakia|hungary|bulgaria|finland|nato|article\s?4)\b|폴란드|루마니아|리투아니아|라트비아|에스토니아|나토/i.test(
      blob,
    );
  const pacificHints =
    /\b(japan|korea|australia|philippines|taiwan|guam|adiz|miyako|luzon)\b|일본|한국|호주|필리핀|대만|괌|방공식별구역|미야코|루손/i.test(
      blob,
    );

  if (atlanticHints && pacificHints) {
    return { hit: true, flank: "both", matchedAlert };
  }
  if (atlanticHints) return { hit: true, flank: "atlantic", matchedAlert };
  if (pacificHints) return { hit: true, flank: "indo-pacific", matchedAlert };
  return { hit: false, flank: null, matchedAlert: null };
}

export function tradeFactsForTag(tag: string): TradeFact[] {
  return ALLIANCE_DOCTRINE.tradeFacts.filter((f) => f.tags.includes(tag));
}

export function scenarioById(id: string): ScenarioRung | undefined {
  return ALLIANCE_DOCTRINE.scenarioLadder.find((s) => s.id === id);
}

/** 대만·해협 긴장 UI용 — 예측 문장 없이 출처 달린 사실 1~2줄 */
export function taiwanStraitWhyItMattersLines(lang: "ko" | "en" = "ko"): string[] {
  const japan = ALLIANCE_DOCTRINE.tradeFacts.find((f) => f.id === "strait-japan-trade-share-2024");
  const rok = ALLIANCE_DOCTRINE.tradeFacts.find((f) => f.id === "strait-rok-trade-share-2024");
  const lines: string[] = [];
  if (japan) lines.push(lang === "en" ? japan.factEn : japan.factKo);
  if (rok) lines.push(lang === "en" ? rok.factEn : rok.factKo);
  lines.push(
    lang === "en"
      ? "Source: CSIS ChinaPower — Crossroads of Commerce (Aug 2024). Not a forecast."
      : "출처: CSIS ChinaPower Crossroads of Commerce (2024-08). 예측이 아닌 공개 추산.",
  );
  return lines;
}

export function doctrineSourceById(id: string): DoctrineSource | undefined {
  return ALLIANCE_DOCTRINE.sources.find((s) => s.id === id);
}
