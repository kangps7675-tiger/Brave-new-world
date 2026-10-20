/**
 * 우크라·러 에너지 인프라(정유·유정·전력망) 타격 → 병목 데스크와 같은 양피지.
 * 좌표는 공개 보도 앵커 근사 — 탄착 확정이 아님.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  buildInsightParagraph,
  type ChokepointStressBriefing,
} from "@/lib/chokepointStressBriefing";
import { stressDisclaimer } from "@/lib/logisticsStress";
import {
  isUkraineRussiaEnergyInfraStrike,
} from "@/lib/news/breakingFlash";
import { josa } from "@/lib/koreanJosa";

export type EnergyInfraAnchor = {
  id: string;
  lat: number;
  lng: number;
  labelKo: string;
  labelEn: string;
  /** 헤드라인 매칭용 */
  needles: string[];
};

/** 자주 보도되는 에너지 앵커 — 보도 좌표 근사, 탄착 확정 아님. */
export const ENERGY_INFRA_STRIKE_ANCHORS: EnergyInfraAnchor[] = [
  {
    id: "ua-kremenchuk-refinery",
    lat: 49.06,
    lng: 33.42,
    labelKo: "크레멘추크 정유",
    labelEn: "Kremenchuk refinery",
    needles: ["kremenchuk", "kremenchug", "크레멘추크"],
  },
  {
    id: "ua-lisichansk-refinery",
    lat: 48.97,
    lng: 38.4,
    labelKo: "리시찬스크 정유",
    labelEn: "Lysychansk refinery",
    needles: ["lisichansk", "lysychansk", "리시찬스크"],
  },
  {
    id: "ua-shebelinka-gas",
    lat: 49.5,
    lng: 36.5,
    labelKo: "셰벨린카 가스",
    labelEn: "Shebelinka gas field",
    needles: ["shebelinka", "셰벨린카"],
  },
  {
    id: "ua-odesa-energy",
    lat: 46.48,
    lng: 30.73,
    labelKo: "오데사 에너지·항만",
    labelEn: "Odesa energy / port",
    needles: ["odesa", "odessa", "오데사"],
  },
  {
    id: "ru-tuapse-refinery",
    lat: 44.1,
    lng: 39.08,
    labelKo: "투압세 정유",
    labelEn: "Tuapse refinery",
    needles: ["tuapse", "투압세"],
  },
  {
    id: "ru-ryazan-refinery",
    lat: 54.63,
    lng: 39.74,
    labelKo: "랴잔 정유",
    labelEn: "Ryazan refinery",
    needles: ["ryazan", "랴잔"],
  },
  {
    id: "theater-ua-energy",
    lat: 48.45,
    lng: 32.05,
    labelKo: "우크라이나 에너지 시설",
    labelEn: "Ukraine energy facility",
    needles: ["ukraine", "ukrainian", "우크라이나", "우크라", "유정", "정유", "oil well", "refinery"],
  },
];

export function matchEnergyInfraAnchor(headline: string): EnergyInfraAnchor {
  const lower = headline.toLowerCase();
  for (const a of ENERGY_INFRA_STRIKE_ANCHORS) {
    if (a.id === "theater-ua-energy") continue;
    if (a.needles.some((n) => lower.includes(n.toLowerCase()))) return a;
  }
  return ENERGY_INFRA_STRIKE_ANCHORS[ENERGY_INFRA_STRIKE_ANCHORS.length - 1]!;
}

export function pickEnergyInfraStrikeHeadline(titles: string[]): string | null {
  for (const t of titles) {
    if (isUkraineRussiaEnergyInfraStrike(t)) return t;
  }
  return null;
}

export function buildEnergyInfraStressBriefing(params: {
  headline: string;
  lang: LabelLanguage;
  extraHeadlines?: string[];
}): ChokepointStressBriefing {
  const { headline, lang, extraHeadlines = [] } = params;
  const en = lang === "en";
  const anchor = matchEnergyInfraAnchor(headline);
  const snippets = [headline, ...extraHeadlines.filter((h) => h !== headline)].slice(0, 3);
  const place = en ? anchor.labelEn : anchor.labelKo;

  const title = en
    ? `Energy infra · ${anchor.labelEn} · strike watch`
    : `에너지 인프라 · ${anchor.labelKo} · 타격 관측`;

  const paragraphs: string[] = [];
  if (en) {
    paragraphs.push(
      `Open reporting points to a kinetic hit near ${anchor.labelEn}. Headline: “${headline.slice(0, 180)}”. Coordinates are approximate anchors, not confirmed impact points.`,
    );
    paragraphs.push(
      `Linked assets to watch: Brent · NatGas · VIX. Ukraine/Russia energy and Black Sea export risk often co-move with oil and gas proxies — the chart slot below stays reserved until futures equivalence is wired.`,
    );
    paragraphs.push(buildInsightParagraph(lang, "tighten", snippets.slice(1)));
    paragraphs.push(stressDisclaimer(lang));
  } else {
    paragraphs.push(
      `${josa(place, "은/는")} 인근에서 에너지 인프라 타격 보도가 잡혔습니다. 헤드라인은 “${headline.slice(0, 180)}”입니다. 좌표는 공개 보도 앵커 근사이며 탄착 확정이 아닙니다.`,
    );
    paragraphs.push(
      `함께 볼 자산 후보는 Brent · NatGas · VIX입니다. 우크라·러 정유·유정·전력망 타격은 유가·가스 대리지표와 같이 움직일 때가 많습니다. 아래 그래프 칸은 선물 등가 연동 전까지 자리만 비워 둡니다.`,
    );
    paragraphs.push(buildInsightParagraph(lang, "tighten", snippets.slice(1)));
    paragraphs.push(stressDisclaimer(lang));
  }

  return {
    id: `energy-infra:${anchor.id}:${headline.slice(0, 48)}`,
    chokepointId: anchor.id,
    title,
    paragraphs,
    lat: anchor.lat,
    lng: anchor.lng,
    direction: "elevated",
    assetSlotLabel: "Brent",
    transitChangePct: null,
    headlineSnippets: snippets,
    insightTone: "tighten",
    kind: "energy-infra",
  };
}
