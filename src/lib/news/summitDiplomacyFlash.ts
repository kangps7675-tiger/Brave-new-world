/**
 * 정상회담·외교 신속속보 — 양자/다자·합의 문구 추출.
 * LLM 없음. 제목·요약에 있는 문장만. 합의 문구를 지어내지 않음.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import { josa } from "@/lib/koreanJosa";
import type { FlashActors } from "@/lib/news/breakingFlashNarrative";

// 한국어는 \b 경계가 안 먹음 — 영문만 \b, 한글 키워드는 밖에 둔다.
const SUMMIT_RE =
  /\b(summit|peace\s?talks|bilateral\s?(?:talks?|meeting)|trilateral|multilateral|state\s?visit|ministerial|leaders?\s?meeting)\b|정상회담|평화회담|양자회담|다자회담|장관회담|국빈|정상회의|정상\s?회동/i;

const MULTILATERAL_RE =
  /\b(multilateral|trilateral|g7|g20|asean|brics|nato\s?summit|quad\b|aukus|sco\b|csto|un\s?general\s?assembly)\b|다자|3자|삼국|쿼드|브릭스|나토\s?정상|유엔총회/i;

const BILATERAL_RE =
  /\b(bilateral|two[\s-]?way)\b|양자/i;

const AGREEMENT_HINT_RE =
  /\b(agree(?:d|ment|s)?|accord|treaty|pact|deal|memorandum|mou\b|joint\s?statement|communiqu[eé]|signed|reached\s?a\s?deal)\b|합의|조약|협정|합의문|공동성명|양해각서|서명|타결/i;

export type SummitFormat = "bilateral" | "multilateral" | "unknown";

export type SummitDiplomacyMeta = {
  isSummit: boolean;
  format: SummitFormat;
  parties: string[];
  /** 원문에 합의·조약 힌트가 있을 때만 — 해당 문장 발췌 */
  agreementSnippet: string | null;
};

export function isSummitDiplomacyText(text: string): boolean {
  return SUMMIT_RE.test(text);
}

function truncateSnippet(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** 합의·조약 키워드가 들어 있는 문장만 발췌. 없으면 null. */
export function extractAgreementSnippet(text: string): string | null {
  const blob = text.replace(/\s+/g, " ").trim();
  if (!blob || !AGREEMENT_HINT_RE.test(blob)) return null;

  const parts = blob.split(/(?<=[.。!?？])\s+|\n+/);
  for (const part of parts) {
    const s = part.trim();
    if (s.length < 12) continue;
    if (AGREEMENT_HINT_RE.test(s)) return truncateSnippet(s, 220);
  }
  const m = blob.match(
    /([^.。!?\n]{0,80}(?:agree(?:d|ment|s)?|accord|treaty|pact|deal|합의|조약|협정|합의문|공동성명|서명|타결)[^.。!?\n]{0,120})/i,
  );
  if (m?.[1]) return truncateSnippet(m[1], 220);
  return null;
}

export function detectSummitFormat(
  text: string,
  partyCount: number,
): SummitFormat {
  if (MULTILATERAL_RE.test(text)) return "multilateral";
  if (BILATERAL_RE.test(text)) return "bilateral";
  if (partyCount >= 3) return "multilateral";
  if (partyCount === 2) return "bilateral";
  return "unknown";
}

/** 미중·한미 등 축약 — extractFlashActors가 못 잡을 때 보강 */
const KO_PAIR_HINTS: Array<{ re: RegExp; parties: string[] }> = [
  { re: /미\s*[·\-]?중|미중/, parties: ["미국", "중국"] },
  { re: /한\s*[·\-]?미|한미/, parties: ["한국", "미국"] },
  { re: /한\s*[·\-]?일|한일/, parties: ["한국", "일본"] },
  { re: /미\s*[·\-]?러|미러/, parties: ["미국", "러시아"] },
  { re: /중\s*[·\-]?러|중러/, parties: ["중국", "러시아"] },
  { re: /일\s*[·\-]?중|일중/, parties: ["일본", "중국"] },
  { re: /북\s*[·\-]?미|북미\s*정상/, parties: ["북한", "미국"] },
  { re: /한\s*[·\-]?중|한중/, parties: ["한국", "중국"] },
];

function partiesFromKoHints(text: string): string[] {
  for (const hint of KO_PAIR_HINTS) {
    if (hint.re.test(text)) return [...hint.parties];
  }
  return [];
}

export function extractSummitDiplomacyMeta(
  text: string,
  actors: FlashActors,
): SummitDiplomacyMeta {
  const blob = text.replace(/\s+/g, " ").trim();
  const isSummit = isSummitDiplomacyText(blob);
  if (!isSummit) {
    return {
      isSummit: false,
      format: "unknown",
      parties: [],
      agreementSnippet: null,
    };
  }
  const parties =
    actors.mentioned.length > 0
      ? actors.mentioned.slice(0, 4)
      : partiesFromKoHints(blob);
  return {
    isSummit: true,
    format: detectSummitFormat(blob, parties.length),
    parties,
    agreementSnippet: extractAgreementSnippet(blob),
  };
}

function formatPartiesList(parties: string[], ko: boolean): string {
  if (parties.length === 0) return "";
  if (ko) {
    if (parties.length === 1) return parties[0];
    if (parties.length === 2) {
      return `${josa(parties[0], "과/와")} ${parties[1]}`;
    }
    return `${parties.slice(0, -1).join("·")} 및 ${parties[parties.length - 1]}`;
  }
  if (parties.length === 1) return parties[0];
  if (parties.length === 2) return `${parties[0]} and ${parties[1]}`;
  return `${parties.slice(0, -1).join(", ")}, and ${parties[parties.length - 1]}`;
}

/**
 * 회담 양피지 상단 문단 — 양자/다자 + (있을 때만) 합의 문구.
 * 합의가 원문에 없으면 합의 단락을 만들지 않는다.
 */
export function buildSummitDiplomacyParagraphs(
  meta: SummitDiplomacyMeta,
  lang: LabelLanguage,
): string[] {
  if (!meta.isSummit) return [];
  const ko = lang !== "en";
  const who = formatPartiesList(meta.parties, ko);
  const paras: string[] = [];

  if (meta.format === "bilateral") {
    if (ko) {
      const pair =
        meta.parties.length >= 2
          ? `${josa(meta.parties[0], "과/와")} ${josa(meta.parties[1], "이/가")}`
          : who
            ? josa(who, "이/가")
            : "두 쪽이";
      paras.push(
        `이번 회담은 양자 만남으로 읽힙니다. ${pair} 자리를 같이했다는 보도가 중심입니다.`,
      );
    } else {
      paras.push(
        who
          ? `This reads as a bilateral meeting. Reporting centers on ${who} sitting down together.`
          : `This reads as a bilateral meeting. Reporting centers on two sides sitting down together.`,
      );
    }
  } else if (meta.format === "multilateral") {
    if (ko) {
      paras.push(
        who
          ? `이번 회담은 다자(또는 3자 이상) 자리로 읽힙니다. ${who} 등이 한자리에 모였다는 보도가 중심입니다.`
          : `이번 회담은 다자(또는 3자 이상) 자리로 읽힙니다. 여러 쪽이 한자리에 모였다는 보도가 중심입니다.`,
      );
    } else {
      paras.push(
        who
          ? `This reads as a multilateral (or three-or-more party) meeting. Reporting centers on ${who} gathering in one place.`
          : `This reads as a multilateral (or three-or-more party) meeting.`,
      );
    }
  } else if (ko) {
    paras.push(
      who
        ? `정상·고위급 회담 보도입니다. ${josa(who, "이/가")} 관련된 만남으로 읽히지만, 양자·다자 구분은 원문에 더 분명히 나오지 않았습니다.`
        : `정상·고위급 회담 보도입니다. 양자·다자 구분은 원문에 더 분명히 나오지 않았습니다.`,
    );
  } else {
    paras.push(
      who
        ? `This is a leaders’ or high-level talks report. ${who} appear involved, but bilateral vs multilateral is not stated clearly in the wires.`
        : `This is a leaders’ or high-level talks report. Bilateral vs multilateral is not stated clearly in the wires.`,
    );
  }

  if (meta.agreementSnippet) {
    paras.push(
      ko
        ? `보도에 담긴 합의·타결 관련 문구는 다음과 같습니다. 「${meta.agreementSnippet}」 원문 밖의 합의 내용은 덧붙이지 않았습니다.`
        : `Agreement-related wording in the wires: “${meta.agreementSnippet}” Nothing beyond the source text is added.`,
    );
  }

  return paras;
}
