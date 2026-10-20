/**
 * 영토분쟁 아카이브 — 심층 문서·전개 콜아웃·양피지 줄글.
 * 한글 모드: `src/lib/koreanProseRules.ts` 하드코딩 규칙
 * (쉬운 말, 주어·조사·서술어, 한 문단 ~습니다/~입니다만).
 */

import type { FrictionTimelineStage } from "@/data/frictionEpisodeDeep";
import {
  TERRITORIAL_DISPUTE_EPISODES,
  type TerritorialDisputeEpisode,
} from "@/data/territorialDisputeEpisodes";
import { josa } from "@/lib/koreanJosa";

export type TerritorialSixW = {
  whoKo: string;
  whoEn: string;
  whatKo: string;
  whatEn: string;
  whenKo: string;
  whenEn: string;
  whereKo: string;
  whereEn: string;
  whyKo: string;
  whyEn: string;
  howKo: string;
  howEn: string;
};

export type TerritorialDeepDoc = {
  episodeId: string;
  paragraphsKo: string[];
  paragraphsEn: string[];
  sixW: TerritorialSixW;
  stages: FrictionTimelineStage[];
};

function offset(
  base: readonly [number, number],
  dLng: number,
  dLat: number,
): readonly [number, number] {
  return [base[0] + dLng, base[1] + dLat] as const;
}

function yearSpan(ep: TerritorialDisputeEpisode): string {
  return ep.yearEnd ? `${ep.historicalYear}–${ep.yearEnd}` : `${ep.historicalYear}`;
}

function partiesLine(ep: TerritorialDisputeEpisode, en: boolean): string {
  if (ep.parties.length === 0) return en ? "contending parties" : "관련 당사국";
  return en ? ep.parties.join(" · ") : ep.parties.join("·");
}

/** 에피소드당 4단 콜아웃 — 시작 → 현장 → 멈춤 → 오늘 */
function buildStages(ep: TerritorialDisputeEpisode): FrictionTimelineStage[] {
  const base = ep.coordinates;
  const y0 = ep.historicalYear;
  const y1 = ep.yearEnd ?? y0 + 3;
  const mid = Math.round((y0 + y1) / 2);
  const parties = partiesLine(ep, false);
  return [
    {
      id: `${ep.id}-origin`,
      order: 1,
      yearLabel: `${y0}`,
      titleKo: "분쟁이 시작된 때",
      titleEn: "How the dispute began",
      bodyKo: `${ep.locationName}에서 ${parties} 사이에는 누구의 땅과 바다인지에 대한 해석이 갈리기 시작했습니다.`,
      bodyEn: `At ${ep.locationNameEn}, ${partiesLine(ep, true)} begin to disagree on who owns or governs the place.`,
      coordinates: offset(base, -0.42, 0.28),
    },
    {
      id: `${ep.id}-escalate`,
      order: 2,
      yearLabel: `${mid}`,
      titleKo: "현장에서 실제 충돌",
      titleEn: "From map to the ground",
      bodyKo:
        "순찰과 점거, 포격, 외교 항의가 겹쳤습니다. 지도 위의 선은 병력과 주민의 일상으로 바뀌었습니다.",
      bodyEn:
        "Patrols, occupation, fire, and protest notes pile up. A line on a map becomes daily life for troops and civilians.",
      coordinates: offset(base, 0.38, 0.22),
    },
    {
      id: `${ep.id}-freeze`,
      order: 3,
      yearLabel: ep.yearEnd ? `${ep.yearEnd}` : `${y0 + 5}`,
      titleKo: "해결 없이 선이 굳음",
      titleEn: "Frozen without a full settlement",
      bodyKo:
        "휴전과 회담, 판결, 일방적 실효 지배가 섞인 채 경계는 굳었습니다. 인정받지 못하거나 획정되지 않은 구간이 남았습니다.",
      bodyEn:
        "Ceasefires, talks, awards, and faits accomplis harden the line without full settlement. Unrecognized or undelimited stretches remain.",
      coordinates: offset(base, 0.32, -0.3),
    },
    {
      id: `${ep.id}-present`,
      order: 4,
      yearLabel: "오늘",
      titleKo: "오늘도 긴장이 남은 곳",
      titleEn: "Still tense today",
      bodyKo: ep.presentLinkKo,
      bodyEn: ep.presentLinkEn,
      coordinates: offset(base, -0.28, -0.35),
    },
  ];
}

function buildSixW(ep: TerritorialDisputeEpisode): TerritorialSixW {
  const span = yearSpan(ep);
  const parties = partiesLine(ep, false);
  const titleBare = ep.title.replace(/\s*\(\d{4}.*$/, "");
  return {
    whoKo: `${josa(parties, "이/가")} 이 땅과 바다의 영유권과 관할권, 실효 지배를 다투고 있습니다.`,
    whoEn: `${partiesLine(ep, true)} — the sides contesting title, jurisdiction, and control.`,
    whatKo: `${josa(titleBare, "을/를")} 둘러싼 국경·영토 분쟁입니다.`,
    whatEn: `A territorial and border dispute centered on ${ep.titleEn.replace(/\s*\(\d{4}.*$/, "")}.`,
    whenKo: `${span} 전후가 핵심 국면이었고, 그 여파는 오늘까지 이어지고 있습니다.`,
    whenEn: `The core phase was around ${span}; aftershocks reach the present.`,
    whereKo: ep.locationName,
    whereEn: ep.locationNameEn,
    whyKo:
      "관련 당사국이 지도와 조약, 전쟁, 식민 유산을 서로 다르게 읽었고, 그 위에 안보와 자원, 정체성 문제가 겹쳤기 때문입니다.",
    whyEn:
      "Clashing readings of maps, treaties, wars, and colonial legacies stacked security, resources, and identity onto one line.",
    howKo:
      "현장 병력과 해경, 민병, 외교, 법정이 번갈아 나섰습니다. 때로는 포화로, 때로는 조용한 실효 지배로 선을 지켰습니다.",
    howEn:
      "Troops, coast guards, militias, diplomats, and courts took turns — sometimes with fire, sometimes with quiet control of the ground.",
  };
}

function buildParagraphs(ep: TerritorialDisputeEpisode): {
  ko: string[];
  en: string[];
} {
  const span = yearSpan(ep);
  const partiesKo = partiesLine(ep, false);
  const partiesEn = partiesLine(ep, true);
  return {
    ko: [
      `여기는 ${ep.locationName}입니다. ${span} 무렵 ${josa(partiesKo, "이/가")} 그은 경계는 서로 다른 이야기를 하고 있었습니다.`,
      ep.briefing,
      `국경은 종이 위에만 있지 않습니다. 순찰로가 생기고 주민의 일상이 바뀌며, 포대와 회담장이 같은 좌표를 씁니다. ‘우리 땅’이라는 말은 병력 배치로 바뀝니다.`,
      `완전히 끝나는 경우는 드뭅니다. 휴전선과 실질통제선, 인정받지 못한 경계, 바다 경제수역의 중첩이 남고, 다음 위기가 그 빈칸을 다시 읽습니다.`,
      ep.presentLinkKo,
      `이 좌표를 다시 여는 이유는 옛이야기 때문이 아닙니다. 경계가 흔들리면 시장과 동맹, 물류도 함께 흔들립니다. 영토분쟁사는 과거 목록이 아니라 오늘의 긴장을 읽는 렌즈입니다.`,
    ],
    en: [
      `This is ${ep.locationNameEn}. Around ${span}, the lines drawn by ${partiesEn} told different stories.`,
      ep.briefingEn,
      `A border does not live on paper alone. Patrol routes appear, daily life shifts, and gun positions share coordinates with conference halls. “Our land” becomes force posture.`,
      `Full closure is rare. Ceasefire lines, lines of control, unrecognized edges, and overlapping exclusive economic zones remain — and the next crisis rereads those blanks.`,
      ep.presentLinkEn,
      `We reopen this place not for nostalgia. When the line shakes, markets, alliances, and logistics shake with it. Territorial dispute history is a lens on present tension, not a museum list.`,
    ],
  };
}

function buildDeepDoc(ep: TerritorialDisputeEpisode): TerritorialDeepDoc {
  const paras = buildParagraphs(ep);
  return {
    episodeId: ep.id,
    sixW: buildSixW(ep),
    paragraphsKo: paras.ko,
    paragraphsEn: paras.en,
    stages: buildStages(ep),
  };
}

const DEEP_CACHE = new Map<string, TerritorialDeepDoc>();

export function territorialDeepDoc(episodeId: string): TerritorialDeepDoc | null {
  const cached = DEEP_CACHE.get(episodeId);
  if (cached) return cached;
  const ep = TERRITORIAL_DISPUTE_EPISODES.find((e) => e.id === episodeId);
  if (!ep) return null;
  const doc = buildDeepDoc(ep);
  DEEP_CACHE.set(episodeId, doc);
  return doc;
}

/**
 * 영토분쟁 양피지 — 육하원칙·전개·오늘을 쉬운 줄글로.
 * 한글: ~습니다/~입니다만. 라벨 나열 금지.
 */
export function territorialParchmentParagraphs(
  ep: TerritorialDisputeEpisode,
  lang: "ko" | "en",
): string[] {
  const deep = territorialDeepDoc(ep.id);
  const span = yearSpan(ep);
  if (!deep) {
    return lang === "en"
      ? [ep.briefingEn, ep.presentLinkEn]
      : [ep.briefing, ep.presentLinkKo];
  }

  const six = deep.sixW;
  const body = lang === "en" ? deep.paragraphsEn : deep.paragraphsKo;
  const stages = [...deep.stages].sort((a, b) => a.order - b.order);
  const paragraphs: string[] = [];

  if (lang === "en") {
    paragraphs.push(
      `Focus: ${ep.locationNameEn}. Around ${span}: ${six.whenEn.replace(/\.$/, "")}. Who was involved: ${six.whoEn}`,
    );
    paragraphs.push(
      `What it was: ${six.whatEn.replace(/\.$/, "")}. Why it stuck: ${six.whyEn}`,
    );
    paragraphs.push(`How it unfolded: ${six.howEn}`);
    if (stages.length > 0) {
      const arc = stages
        .map((s) => {
          const stageBody = s.bodyEn.replace(/\.$/, "");
          return `${s.yearLabel} — ${s.titleEn}: ${stageBody}`;
        })
        .join(". ");
      paragraphs.push(`Timeline: ${arc}.`);
    }
    paragraphs.push(...body);
  } else {
    paragraphs.push(
      `지금은 ${josa(ep.locationName, "을/를")} 보고 있습니다. ${six.whenKo} ${six.whoKo}`,
    );
    paragraphs.push(`${six.whatKo} ${six.whyKo}`);
    paragraphs.push(`전개는 이렇게 흘러갔습니다. ${six.howKo}`);
    if (stages.length > 0) {
      const arc = stages
        .map((s) => `${s.yearLabel}년 「${s.titleKo}」에서는 ${s.bodyKo.replace(/\.$/, "")}`)
        .join(" ");
      paragraphs.push(`시간 순서로 보면 이렇습니다. ${arc}.`);
    }
    paragraphs.push(...body);
  }

  return paragraphs.filter((p) => p.trim().length > 0);
}

export function territorialEpisodeWarGeometry(ep: TerritorialDisputeEpisode): {
  type: "Polygon";
  coordinates: number[][][];
} {
  const lng = ep.coordinates[0];
  const lat = ep.coordinates[1];
  const halfLng = Math.max(0.32, 0.55 / Math.max(ep.zoom, 3));
  const halfLat = halfLng * 0.72;
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - halfLng, lat - halfLat],
        [lng + halfLng, lat - halfLat],
        [lng + halfLng, lat + halfLat],
        [lng - halfLng, lat + halfLat],
        [lng - halfLng, lat - halfLat],
      ],
    ],
  };
}

export function territorialEpisodeLat(ep: TerritorialDisputeEpisode): number {
  return ep.coordinates[1];
}

export function territorialEpisodeLng(ep: TerritorialDisputeEpisode): number {
  return ep.coordinates[0];
}

export function altitudeFromTerritorialZoom(zoom: number): number {
  return Math.max(0.38, Math.min(1.25, 5.5 / zoom));
}
