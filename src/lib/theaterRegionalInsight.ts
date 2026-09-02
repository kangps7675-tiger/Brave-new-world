/**
 * 전장·초크포인트 — RSS · 텔레그램 · GTI 드라이버를 짧은 분석 문단으로 합성 (규칙 기반 v0).
 */

import { resolveEconInsightBrief } from "@/data/econInsightBriefs";
import {
  dailyRankLabel,
  displayTensionScore,
  type DailyRankEntry,
} from "@/lib/dailyRanks";
import {
  formatGtiDeltaLabel,
  gtiBand,
  gtiBandLabel,
} from "@/lib/gti";
import type { NewsTheater } from "@/lib/news/types";
import { formatTensionDriverLine } from "@/lib/tensionDrivers";
import type { TelegramAlert, TelegramAlertRegion } from "@/lib/telegramAlerts";

export type TheaterInsightSignal = {
  id: string;
  labelKo: string;
  labelEn: string;
  detailKo: string;
  detailEn: string;
};

export type TheaterRegionalInsight = {
  headlineKo: string;
  headlineEn: string;
  paragraphsKo: string[];
  paragraphsEn: string[];
  signals: TheaterInsightSignal[];
  rankEntry: DailyRankEntry | null;
  rankScore: number | null;
};

export type BuildTheaterRegionalInsightInput = {
  regionLabelKo: string;
  regionLabelEn: string;
  selectionId: string;
  newsTheater: NewsTheater;
  rssTitles: string[];
  gdeltCount: number;
  telegramAlerts: TelegramAlert[];
  telegramRegion: TelegramAlertRegion | "all";
  theaterRanks: DailyRankEntry[];
  chokeRanks: DailyRankEntry[];
};

const THEATER_RANK_IDS: Partial<Record<NewsTheater, string[]>> = {
  "middle-east": ["middle-east"],
  "russia-ukraine": ["russia-ukraine", "ukraine"],
  "china-taiwan": ["china-taiwan", "taiwan"],
  korea: ["korea"],
  japan: ["japan"],
  "southeast-asia": ["southeast-asia"],
  "south-asia": ["south-asia"],
  "south-america": ["south-america"],
  africa: ["africa"],
  arctic: ["arctic"],
  atlantic: ["atlantic"],
};

const NAV_CHOKE_IDS: Record<string, string> = {
  hormuz: "choke-hormuz",
  "persian-gulf": "choke-hormuz",
  iran: "choke-hormuz",
  levant: "choke-hormuz",
  gulf: "choke-hormuz",
  suez: "choke-suez",
  egypt: "choke-suez",
  sinai: "choke-suez",
  "red-sea": "choke-bab-el-mandeb",
  yemen: "choke-bab-el-mandeb",
  "bab-el-mandeb": "choke-bab-el-mandeb",
  malacca: "choke-malacca",
  asean: "choke-malacca",
  gibraltar: "choke-gibraltar",
  taiwan: "choke-taiwan",
  "taiwan-strait": "choke-taiwan",
  "south-china-sea": "choke-malacca",
};

function normalizeNavKey(id: string): string {
  return id.toLowerCase().replace(/^choke-/, "");
}

export function rankEntityCandidates(
  selectionId: string,
  newsTheater: NewsTheater,
): { theaterIds: string[]; chokeIds: string[] } {
  const key = normalizeNavKey(selectionId);
  const chokeIds = new Set<string>();
  for (const [navKey, chokeId] of Object.entries(NAV_CHOKE_IDS)) {
    if (key === navKey || key.includes(navKey)) chokeIds.add(chokeId);
  }
  if (key.startsWith("choke-")) chokeIds.add(key);

  const theaterIds = new Set<string>(THEATER_RANK_IDS[newsTheater] ?? []);
  if (newsTheater !== "global") theaterIds.add(newsTheater);
  if (key.includes("ukraine")) theaterIds.add("ukraine");
  if (key.includes("taiwan") || key.includes("china")) {
    theaterIds.add("china-taiwan");
    theaterIds.add("taiwan");
  }

  return {
    theaterIds: [...theaterIds],
    chokeIds: [...chokeIds],
  };
}

function findBestRankEntry(
  list: DailyRankEntry[],
  ids: string[],
): DailyRankEntry | null {
  if (ids.length === 0) return null;
  const idSet = new Set(ids);
  return list.find((e) => idSet.has(e.entityId)) ?? null;
}

export function pickRegionalRankEntry(
  input: Pick<
    BuildTheaterRegionalInsightInput,
    "selectionId" | "newsTheater" | "theaterRanks" | "chokeRanks"
  >,
): DailyRankEntry | null {
  const { theaterIds, chokeIds } = rankEntityCandidates(
    input.selectionId,
    input.newsTheater,
  );
  const theaterHit = findBestRankEntry(input.theaterRanks, theaterIds);
  const chokeHit = findBestRankEntry(input.chokeRanks, chokeIds);
  if (theaterHit && chokeHit) {
    return theaterHit.score >= chokeHit.score ? theaterHit : chokeHit;
  }
  return theaterHit ?? chokeHit;
}

function truncateTitle(title: string, max = 72): string {
  const t = title.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function joinTitles(titles: string[], lang: "ko" | "en", max = 3): string | null {
  const slice = titles.filter(Boolean).slice(0, max);
  if (slice.length === 0) return null;
  const bits = slice.map((t) => `「${truncateTitle(t, 56)}」`);
  if (lang === "en") {
    return bits.map((b) => b.replace(/「|」/g, '"')).join("; ");
  }
  return bits.join(", ");
}

function telegramForRegion(
  alerts: TelegramAlert[],
  region: TelegramAlertRegion | "all",
): TelegramAlert[] {
  if (region === "all") return alerts;
  return alerts.filter((a) => a.region === region);
}

function scoreLead(
  entry: DailyRankEntry,
  regionLabel: string,
  lang: "ko" | "en",
): string {
  const score = Math.round(displayTensionScore(entry));
  const band = gtiBandLabel(gtiBand(score), lang === "ko");
  const delta = entry.deltaScore;
  const deltaLabel =
    delta == null ? null : formatGtiDeltaLabel(delta, lang);
  const rising = delta == null ? score >= 55 : delta >= 0;
  const driver = formatTensionDriverLine(entry.detail, lang, { rising, max: 2 });

  if (lang === "en") {
    const deltaPart =
      deltaLabel && deltaLabel.length > 0
        ? ` ${deltaLabel.replace(/\.$/, "")}.`
        : " Roughly flat vs yesterday.";
    const driverPart = driver ? ` ${driver}.` : "";
    return `Today's tension score for ${regionLabel} is ${score} (${band}).${deltaPart}${driverPart}`;
  }

  const deltaPart =
    deltaLabel && !deltaLabel.includes("변동")
      ? ` ${deltaLabel.replace(/\.$/, "")}.`
      : " 어제와 비슷한 수준입니다.";
  const driverPart = driver ? ` ${driver}.` : "";
  return `오늘 ${regionLabel} 긴장 점수는 ${score}(${band})입니다.${deltaPart}${driverPart}`;
}

function quietLead(regionLabel: string, lang: "ko" | "en"): string {
  if (lang === "en") {
    return `${regionLabel} looks relatively quiet in today's feeds — no standout tension spike in the ranking snapshot yet.`;
  }
  return `오늘 ${regionLabel}은 랭킹·피드 기준으로 비교적 조용합니다. 눈에 띄는 급등 신호는 아직 없습니다.`;
}

export function buildTheaterRegionalInsight(
  input: BuildTheaterRegionalInsightInput,
): TheaterRegionalInsight {
  const rankEntry = pickRegionalRankEntry(input);
  const rankScore = rankEntry ? displayTensionScore(rankEntry) : null;
  const rising =
    rankEntry?.deltaScore == null
      ? (rankScore ?? 0) >= 55
      : rankEntry.deltaScore >= 0;

  const tgAlerts = telegramForRegion(input.telegramAlerts, input.telegramRegion);
  const econBrief = resolveEconInsightBrief(normalizeNavKey(input.selectionId));

  const paragraphsKo: string[] = [];
  const paragraphsEn: string[] = [];

  if (rankEntry) {
    paragraphsKo.push(scoreLead(rankEntry, input.regionLabelKo, "ko"));
    paragraphsEn.push(scoreLead(rankEntry, input.regionLabelEn, "en"));
  } else {
    paragraphsKo.push(quietLead(input.regionLabelKo, "ko"));
    paragraphsEn.push(quietLead(input.regionLabelEn, "en"));
  }

  const newsKo = joinTitles(input.rssTitles, "ko");
  const newsEn = joinTitles(input.rssTitles, "en");
  if (newsKo) {
    paragraphsKo.push(
      input.gdeltCount > 0
        ? `뉴스·GDELT 흐름: RSS ${input.rssTitles.length}건, 좌표 이벤트 ${input.gdeltCount}건. 대표 헤드라인 — ${newsKo}.`
        : `뉴스 흐름: ${newsKo}.`,
    );
  } else if (input.gdeltCount > 0) {
    paragraphsKo.push(
      `GDELT 지도 이벤트 ${input.gdeltCount}건이 이 전장에 포착됐습니다. RSS 헤드라인은 아직 적거나 로딩 중일 수 있습니다.`,
    );
  }
  if (newsEn) {
    paragraphsEn.push(
      input.gdeltCount > 0
        ? `News & GDELT: ${input.rssTitles.length} RSS headlines, ${input.gdeltCount} mapped events. Headlines — ${newsEn}.`
        : `News flow: ${newsEn}.`,
    );
  } else if (input.gdeltCount > 0) {
    paragraphsEn.push(
      `${input.gdeltCount} GDELT map events match this theater; RSS headlines may still be loading.`,
    );
  }

  if (tgAlerts.length > 0) {
    const snippets = tgAlerts
      .slice(0, 2)
      .map((a) => truncateTitle(a.text.replace(/\s+/g, " "), 64))
      .join(" · ");
    paragraphsKo.push(
      `텔레그램 현장 채널 ${tgAlerts.length}건 — ${snippets}${tgAlerts.length > 2 ? " …" : ""}`,
    );
    paragraphsEn.push(
      `Telegram field feed: ${tgAlerts.length} alerts — ${snippets}${tgAlerts.length > 2 ? " …" : ""}`,
    );
  }

  if (econBrief?.paragraphs[0]) {
    const ctx = econBrief.paragraphs[0].slice(0, 180);
    paragraphsKo.push(`물류·시장 맥락: ${ctx}`);
    paragraphsEn.push(
      `Market & logistics context: ${econBrief.paragraphs[0].slice(0, 180)}`,
    );
  }

  const signals: TheaterInsightSignal[] = [];
  if (rankEntry) {
    signals.push({
      id: "gti",
      labelKo: "GTI 전장 랭크",
      labelEn: "GTI theater rank",
      detailKo: `#${rankEntry.rank} · ${Math.round(displayTensionScore(rankEntry))}점`,
      detailEn: `#${rankEntry.rank} · ${Math.round(displayTensionScore(rankEntry))} pts`,
    });
  }
  signals.push({
    id: "rss",
    labelKo: "RSS·GDELT",
    labelEn: "RSS · GDELT",
    detailKo: `RSS ${input.rssTitles.length} · GDELT ${input.gdeltCount}`,
    detailEn: `RSS ${input.rssTitles.length} · GDELT ${input.gdeltCount}`,
  });
  if (input.telegramRegion !== "all" || tgAlerts.length > 0) {
    signals.push({
      id: "telegram",
      labelKo: "텔레그램",
      labelEn: "Telegram",
      detailKo: `${tgAlerts.length}건`,
      detailEn: `${tgAlerts.length} alerts`,
    });
  }

  const headlineKo = rankEntry
    ? rising
      ? `오늘 ${input.regionLabelKo} — 평소보다 시끄럽습니다`
      : `오늘 ${input.regionLabelKo} — 긴장이 다소 완화된 편입니다`
    : `오늘 ${input.regionLabelKo} — 피드 요약`;
  const headlineEn = rankEntry
    ? rising
      ? `${input.regionLabelEn} — louder than usual today`
      : `${input.regionLabelEn} — tension easing somewhat`
    : `${input.regionLabelEn} — feed summary`;

  return {
    headlineKo,
    headlineEn,
    paragraphsKo: paragraphsKo.slice(0, 4),
    paragraphsEn: paragraphsEn.slice(0, 4),
    signals,
    rankEntry,
    rankScore,
  };
}

export function regionalRankLabel(
  entry: DailyRankEntry | null,
  fallbackKo: string,
  fallbackEn: string,
  lang: "ko" | "en",
): string {
  if (!entry) return lang === "en" ? fallbackEn : fallbackKo;
  return dailyRankLabel(entry, lang);
}
