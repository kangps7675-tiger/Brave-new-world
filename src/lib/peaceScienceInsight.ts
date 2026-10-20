/**
 * peacesciencer 기반 역사 배경 한 겹 — 지정학/지경학 속보 전용.
 * 사실 코어 고정 + 속보 앵글 강조 + 연한 구조 전망. 역사 토글·관측·항적에는 붙이지 않음.
 */

import {
  PEACE_SCIENCE_DYADS,
  type PeaceScienceActorId,
  type PeaceScienceDyad,
} from "@/data/peaceScienceDyads";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  PEACE_SCIENCE_DISCLAIMER,
  angleCopyFor,
  detectPeaceScienceAngle,
  type PeaceScienceDomain,
} from "@/lib/peaceScienceAngles";

/** flash / 인사이트에서 넘기는 최소 행위자 형태 (순환 import 방지) */
export type PeaceScienceActorLabels = {
  active: string | null;
  passive: string | null;
  mentioned: string[];
};

export type PeaceScienceFlashOpts = {
  /** 지정학 | 지경학 — 그 외(역사 등)면 문단 생략 */
  domain: PeaceScienceDomain | null;
  /** 제목+요약 — 앵글 탐지용 */
  text?: string;
};

/** flash 라벨 → actor id (한·영 라벨 모두) */
const LABEL_TO_ACTOR: Record<string, PeaceScienceActorId> = {
  russia: "russia",
  러시아: "russia",
  ukraine: "ukraine",
  우크라이나: "ukraine",
  china: "china",
  중국: "china",
  taiwan: "taiwan",
  대만: "taiwan",
  japan: "japan",
  일본: "japan",
  "united states": "us",
  us: "us",
  미국: "us",
  india: "india",
  인도: "india",
  pakistan: "pakistan",
  파키스탄: "pakistan",
  israel: "israel",
  이스라엘: "israel",
  iran: "iran",
  이란: "iran",
  "north korea": "nk",
  nk: "nk",
  북한: "nk",
  "south korea": "sk",
  sk: "sk",
  한국: "sk",
};

function normalizeActorLabel(label: string | null | undefined): PeaceScienceActorId | null {
  if (!label) return null;
  const key = label.trim().toLowerCase();
  if (key in LABEL_TO_ACTOR) return LABEL_TO_ACTOR[key]!;
  if (label in LABEL_TO_ACTOR) return LABEL_TO_ACTOR[label]!;
  return null;
}

function dyadKey(a: PeaceScienceActorId, b: PeaceScienceActorId): string {
  return [a, b].sort().join("|");
}

const DYAD_BY_ACTORS = new Map<string, PeaceScienceDyad>();
for (const d of PEACE_SCIENCE_DYADS) {
  DYAD_BY_ACTORS.set(dyadKey(d.actors[0], d.actors[1]), d);
}

export function findPeaceScienceDyad(
  a: PeaceScienceActorId | null,
  b: PeaceScienceActorId | null,
): PeaceScienceDyad | null {
  if (!a || !b || a === b) return null;
  return DYAD_BY_ACTORS.get(dyadKey(a, b)) ?? null;
}

export function findPeaceScienceDyadFromFlashActors(
  actors: PeaceScienceActorLabels,
): PeaceScienceDyad | null {
  const active = normalizeActorLabel(actors.active);
  const passive = normalizeActorLabel(actors.passive);
  const hit = findPeaceScienceDyad(active, passive);
  if (hit) return hit;

  const mentioned = actors.mentioned
    .map((m) => normalizeActorLabel(m))
    .filter((x): x is PeaceScienceActorId => x != null);
  for (let i = 0; i < mentioned.length; i++) {
    for (let j = i + 1; j < mentioned.length; j++) {
      const d = findPeaceScienceDyad(mentioned[i]!, mentioned[j]!);
      if (d) return d;
    }
  }
  return null;
}

/**
 * 코어(고정) + 앵글 강조 + 연한 전망 + 고지.
 */
export function formatPeaceScienceBackgroundParagraph(
  dyad: PeaceScienceDyad,
  lang: LabelLanguage,
  domain: PeaceScienceDomain,
  text: string,
): string {
  const ko = lang !== "en";
  const angle = detectPeaceScienceAngle(text, domain);
  const angleCopy = angleCopyFor(domain, angle);
  const core = ko ? dyad.backgroundKo : dyad.backgroundEn;
  const note = ko ? dyad.dataNoteKo : dyad.dataNoteEn;
  const emphasize = ko ? angleCopy.emphasizeKo : angleCopy.emphasizeEn;
  const outlook = ko ? angleCopy.outlookKo : angleCopy.outlookEn;
  const disclaimer = ko ? PEACE_SCIENCE_DISCLAIMER.ko : PEACE_SCIENCE_DISCLAIMER.en;

  if (ko) {
    return `역사적 배경을 짧게 붙이면 이렇습니다. ${core} ${emphasize} ${outlook} (${note} · ${disclaimer})`;
  }
  return `Historical backdrop, briefly: ${core} ${emphasize} ${outlook} (${note} · ${disclaimer})`;
}

export function peaceScienceBackgroundForFlash(
  actors: PeaceScienceActorLabels,
  lang: LabelLanguage,
  opts?: PeaceScienceFlashOpts,
): string | null {
  const domain = opts?.domain ?? null;
  if (domain !== "conflict" && domain !== "economy") return null;

  const dyad = findPeaceScienceDyadFromFlashActors(actors);
  if (!dyad) return null;

  return formatPeaceScienceBackgroundParagraph(
    dyad,
    lang,
    domain,
    opts?.text ?? "",
  );
}
