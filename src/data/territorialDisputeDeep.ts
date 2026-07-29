/**
 * 영토분쟁 아카이브 — 심층 문서·전개 콜아웃·양피지 줄글.
 * 반서방 분쟁사(frictionEpisodeDeep)와 같은 양식: 육하원칙·연대 스테이지·문학적 논픽션.
 * OpenAlex는 생략(메타 큐레이션 전 단계). 겹치는 주제는 일단 병행 보류.
 */

import type { FrictionTimelineStage } from "@/data/frictionEpisodeDeep";
import {
  TERRITORIAL_DISPUTE_EPISODES,
  type TerritorialDisputeEpisode,
} from "@/data/territorialDisputeEpisodes";

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

/** 에피소드당 4단 콜아웃 — 기원 → 격화 → 고착 → 현세 */
function buildStages(ep: TerritorialDisputeEpisode): FrictionTimelineStage[] {
  const base = ep.coordinates;
  const y0 = ep.historicalYear;
  const y1 = ep.yearEnd ?? y0 + 3;
  const mid = Math.round((y0 + y1) / 2);
  return [
    {
      id: `${ep.id}-origin`,
      order: 1,
      yearLabel: `${y0}`,
      titleKo: "균열의 기원",
      titleEn: "Origin of the rift",
      bodyKo: `${ep.locationName}에서 ${partiesLine(ep, false)} 사이의 영유·관할 해석이 갈리기 시작합니다. ${ep.briefing}`,
      bodyEn: `At ${ep.locationNameEn}, ${partiesLine(ep, true)} begin to diverge on title and jurisdiction. ${ep.briefingEn}`,
      coordinates: offset(base, -0.42, 0.28),
    },
    {
      id: `${ep.id}-escalate`,
      order: 2,
      yearLabel: `${mid}`,
      titleKo: "현장으로의 전화",
      titleEn: "From map to ground",
      bodyKo: "순찰·점거·포격·외교 항의가 겹치며, 선 위의 잉크가 병력과 주민의 일상이 됩니다. 국경은 이제 추상이 아닙니다.",
      bodyEn: "Patrols, occupation, fire, and notes of protest pile up—ink on a chart becomes the daily life of troops and civilians. The border is no longer abstract.",
      coordinates: offset(base, 0.38, 0.22),
    },
    {
      id: `${ep.id}-freeze`,
      order: 3,
      yearLabel: ep.yearEnd ? `${ep.yearEnd}` : `${y0 + 5}`,
      titleKo: "동결·미해결의 고착",
      titleEn: "Freeze and unfinished settlement",
      bodyKo: "정전·회담·판결·일방적 실효가 뒤섞인 채, 완전한 해결 없이 선이 굳습니다. 미인정·미획정·월경이 다음 세대를 기다립니다.",
      bodyEn: "Ceasefires, talks, awards, and unilateral faits accomplis harden the line without full settlement. Unrecognition and undelimited spaces wait for the next generation.",
      coordinates: offset(base, 0.32, -0.3),
    },
    {
      id: `${ep.id}-present`,
      order: 4,
      yearLabel: "오늘",
      titleKo: "현세의 화약고",
      titleEn: "Living powder keg",
      bodyKo: ep.presentLinkKo,
      bodyEn: ep.presentLinkEn,
      coordinates: offset(base, -0.28, -0.35),
    },
  ];
}

function buildSixW(ep: TerritorialDisputeEpisode): TerritorialSixW {
  const span = yearSpan(ep);
  return {
    whoKo: `${partiesLine(ep, false)} — 영유권·관할권·실효 지배를 다투는 주체들.`,
    whoEn: `${partiesLine(ep, true)} — actors contesting title, jurisdiction, and administration.`,
    whatKo: `${ep.title.replace(/\s*\(\d{4}.*$/, "")}을(를) 둘러싼 국경·영토 분쟁.`,
    whatEn: `A territorial and border dispute centered on ${ep.titleEn.replace(/\s*\(\d{4}.*$/, "")}.`,
    whenKo: `${span}을 전후로 한 핵심 국면. 여파는 오늘까지 이어집니다.`,
    whenEn: `Core phase around ${span}, with aftershocks that reach the present.`,
    whereKo: ep.locationName,
    whereEn: ep.locationNameEn,
    whyKo: "지도·조약·전쟁·식민 유산의 해석이 어긋난 채, 안보·자원·정체성이 한 선 위에 겹쳤기 때문입니다.",
    whyEn: "Because clashing readings of maps, treaties, wars, and colonial legacies stacked security, resources, and identity onto one line.",
    howKo: "현장 병력·해경·민병·외교·법정이 번갈아 전면에 섰고, 때로는 포화가, 때로는 침묵의 실효가 선을 지켰습니다.",
    howEn: "Troops, coast guards, militias, diplomats, and courts took turns on stage—sometimes with fire, sometimes with quiet faits accomplis holding the line.",
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
      `지도의 바늘은 ${ep.locationName}에 멈춥니다. ${span}, ${partiesKo}가 그은 선은 서로 다른 이야기를 말하고 있었습니다. ${ep.briefing}`,
      `국경은 종이 위에서만 존재하지 않습니다. 순찰로가 생기고, 주민의 말이 바뀌고, 포문과 회담장이 같은 좌표를 공유합니다. 그 과정에서 ‘우리 땅’이라는 문장이 병력 배치로 번역됩니다.`,
      `완전한 종결은 드뭅니다. 정전선·실질통제선·미인정 경계·EEZ 중첩이 남고, 다음 위기는 그 빈칸을 다시 읽습니다. 역사가 남긴 여백이 오늘의 화약고가 되는 방식입니다.`,
      `${ep.presentLinkKo}`,
      `이 좌표를 다시 펼치는 까닭은 향수가 아닙니다. 선이 흔들릴 때 시장·동맹·물류가 함께 흔들린다는 사실 때문입니다. 영토분쟁사는 과거 목록이 아니라, 현재 긴장도를 읽는 렌즈입니다.`,
    ],
    en: [
      `The needle stops at ${ep.locationNameEn}. In ${span}, the lines drawn by ${partiesEn} told different stories. ${ep.briefingEn}`,
      `A border does not live on paper alone. Patrol routes appear, languages of daily life shift, and gun positions share coordinates with conference halls. “Our land” becomes force posture.`,
      `Full closure is rare. Ceasefire lines, lines of control, unrecognized edges, and overlapping EEZs remain—and the next crisis rereads those blanks. History’s leftover margin becomes today’s powder keg.`,
      `${ep.presentLinkEn}`,
      `We reopen this coordinate not for nostalgia. When the line shakes, markets, alliances, and logistics shake with it. Territorial dispute history is a lens on present tension, not a museum list.`,
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
 * 영토분쟁 양피지 — 육하원칙·전개·의의를 라벨 없이 줄글로.
 * 반서방 분쟁사 parchment와 동일 톤.
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
      `The map returns to ${ep.locationNameEn}. In ${span}, ${six.whenEn.replace(/\.$/, "")}. There, ${six.whoEn.replace(/\.$/, "")} stood across a line that was never only ink on a chart.`,
    );
    paragraphs.push(
      `What unfolded was ${six.whatEn.replace(/\.$/, "")}. The reason was never thin: ${six.whyEn}`,
    );
    paragraphs.push(`It moved like this: ${six.howEn}`);
    if (stages.length > 0) {
      const arc = stages
        .map((s) => {
          const stageBody = s.bodyEn.replace(/\.$/, "");
          return `${s.yearLabel} — ${s.titleEn}: ${stageBody}`;
        })
        .join(". ");
      paragraphs.push(`Follow the arc of the years. ${arc}.`);
    }
    paragraphs.push(...body);
  } else {
    const whenLine = six.whenKo.replace(/\.$/, "");
    paragraphs.push(
      `지도는 다시 ${ep.locationName}으로 돌아갑니다. ${span}, ${whenLine}. 그 자리에서 마주친 세력은 이렇습니다. ${six.whoKo}`,
    );
    paragraphs.push(
      `벌어진 일은 이러합니다. ${six.whatKo} 까닭은 얇지 않았습니다. ${six.whyKo}`,
    );
    paragraphs.push(`전개는 이렇게 흘렀습니다. ${six.howKo}`);
    if (stages.length > 0) {
      const arc = stages
        .map((s) => {
          const stageBody = s.bodyKo.replace(/\.$/, "");
          return `${s.yearLabel}의 「${s.titleKo}」에서 ${stageBody}`;
        })
        .join(". ");
      paragraphs.push(`세월의 호를 따라가 보십시오. ${arc}.`);
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
