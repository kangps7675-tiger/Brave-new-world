import { FRICTION_EPISODES } from "@/data/frictionEpisodes";
import { allEconInsightBriefs } from "@/data/econInsightBriefs";
import type { BriefingPeriodStats } from "@/lib/briefingPeriodStats";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

/**
 * 매일 등불 브리핑 — 지정학·지경학 각각 하루 종일 이용.
 *
 * - 첫 방문: 입장 인트로(경고→편지→도메인)가 끝난 뒤에 점화
 * - 접기: 양피지를 접어 두고, 같은 날 칩으로 다시 펼칠 수 있음
 * - 뉴스 본문: 로컬 시각 기준 6시간 슬롯(0·6·12·18시)마다 갱신
 * - 모드 키 = `daily-YYYY-MM-DD-{conflict|economy}`
 * - 본문 = (지경학) 한국 겨냥 지리경제·기업·거시 하드뉴스 + SOTW Korea 매크로
 * - 지정학 = 전 세계 지정학 중 한국을 겨냥한 발언·압박 우선
 * - 서술 뼈대 = 육하원칙(누가·언제·어디서·무엇을·왜·어떻게)을 논리 순서로 따르는 정부 정례 브리핑 어조
 */

export type BriefingTier = "monthly" | "weekly" | "daily";

/** 등불 카드에 보이는 요약 상한 — RSS 본문 스니펫(1000)과 분리 */
export const LAMP_DISPLAY_SUMMARY_MAX = 320;

/** 등불 뉴스 콘텐츠 갱신 주기 (6시간) */
export const LAMP_CONTENT_SLOT_HOURS = 6;

/** 지경학·지정학 등불 — 사진 필수 초대형 뉴스 카드 */
export type LampFeaturedNews = {
  id: string;
  title: string;
  /** 등불용 요약본 (본문 전체가 아님) */
  summary: string;
  imageUrl: string;
  link: string;
  source: string;
  trustTier: 1 | 2 | 3;
  /** 예: Nvidia · 반도체 / 중동 · IDF */
  focusLabel?: string;
  /** 외교·정상회담 등 — 뱃지·슬롯 캡용 */
  isDiplomacy?: boolean;
  /** 외교 카드용 한 줄 훅 (왜 중요한지 맛보기) */
  matterHook?: string;
};

/** 지경학 등불 상단·사이드바 거시 표 */
export type LampMacroRow = {
  country: string;
  indicator: string;
  value: string;
};

export type PeriodicBriefing = {
  tier: BriefingTier;
  /** 등불 모드 키 — 캘린더 일 + 뷰어 모드 */
  key: string;
  /** 콘텐츠 슬롯 — `daily-YYYY-MM-DD-s0` … s3 (6시간) */
  contentSlot?: string;
  title: string;
  paragraphs: string[];
  /** 대형 양피지 — 사진 있는 시장·전장 뉴스 */
  featuredNews?: LampFeaturedNews[];
  /** 지경학 — 텍스트 브리핑 대신 표로 보여주는 거시 지표 */
  macroTable?: LampMacroRow[];
  /** 지정학 등불 사이드 — 오늘의 WTI (세계 긴장도 지수) */
  wti?: {
    score: number;
    deltaScore: number | null;
    lead: string;
  } | null;
  /** 그날의 잊혀진 경고 — 역사 콜백 1건 */
  forgottenWarning?: {
    id: string;
    date: string;
    yearsAgo: number;
    titleKo: string;
    titleEn: string;
    summaryKo: string;
    summaryEn: string;
    lat: number | null;
    lng: number | null;
    altitude?: number;
    exactAnniversary: boolean;
    lead: string;
  } | null;
};

const STORAGE_PREFIX = "cv-periodic-brief-seen-";
/** 그날 접어 둔 등불 — 다시 펼치기용 (하루 종일 유지) */
const FOLDED_PREFIX = "cv-periodic-brief-folded-";
/** 월요일 주간 회고 접힘 */
const WEEKLY_RECAP_FOLDED_PREFIX = "cv-weekly-recap-folded-";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 브라우저 로컬 캘린더 날짜 키 — 등불 모드 키 / 자정 감지의 기준 */
export function localCalendarDayKey(now: Date = new Date()): string {
  return `daily-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** 0–3: 0–5시 / 6–11시 / 12–17시 / 18–23시 */
export function lampContentSlotIndex(now: Date = new Date()): number {
  return Math.floor(now.getHours() / LAMP_CONTENT_SLOT_HOURS);
}

/** 등불 뉴스 콘텐츠 슬롯 키 (6시간 단위) */
export function lampContentSlotKey(now: Date = new Date()): string {
  return `${localCalendarDayKey(now)}-s${lampContentSlotIndex(now)}`;
}

/** 다음 6시간 슬롯까지 남은 ms */
export function msUntilNextLampContentSlot(now: Date = new Date()): number {
  const slotHours = LAMP_CONTENT_SLOT_HOURS;
  const nextHour = (Math.floor(now.getHours() / slotHours) + 1) * slotHours;
  const next = new Date(now);
  if (nextHour >= 24) {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  } else {
    next.setHours(nextHour, 0, 0, 0);
  }
  return Math.max(1_000, next.getTime() - now.getTime());
}

function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);

  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);

  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return { year: d.getUTCFullYear(), week };
}

function isMonthEndWindow(date: Date): boolean {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getDate() >= lastDay - 2 || date.getDate() === 1;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** 로컬 월요일 — 지난 ISO 주 회고 양피지를 띄울 때 */
export function isLocalMonday(now: Date = new Date()): boolean {
  return now.getDay() === 1;
}

/** 지난주 ISO 주 period_key (`weekly-YYYY-Www`) — 월요일 회고용 */
export function previousWeeklyPeriodKey(now: Date = new Date()): string {
  const ref = new Date(now);
  ref.setDate(ref.getDate() - 3); // 월요일이면 지난주로 확실히 들어감
  const { year, week } = isoWeek(ref);
  return `weekly-${year}-W${pad2(week)}`;
}

/**
 * 월요일 지난주 회고 오퍼.
 * 평일·주말엔 null — 등불 일간 파이프와 분리.
 */
export function resolveMondayWeeklyRecap(now: Date = new Date()): {
  weekKey: string;
  tier: "weekly";
} | null {
  if (!isLocalMonday(now)) return null;
  return { weekKey: previousWeeklyPeriodKey(now), tier: "weekly" };
}

/** 카피/집계 티어 — 월말 > 주말 > 평일 (동시에 하나만). 월요일 회고는 resolveMondayWeeklyRecap 사용. */
export function resolvePeriodTier(now: Date = new Date()): { tier: BriefingTier; key: string } {
  if (isMonthEndWindow(now)) {
    const ref =
      now.getDate() === 1 ? new Date(now.getFullYear(), now.getMonth() - 1, 15) : now;
    return {
      tier: "monthly",
      key: `monthly-${ref.getFullYear()}-${pad2(ref.getMonth() + 1)}`,
    };
  }
  if (isWeekend(now)) {
    const { year, week } = isoWeek(now);
    return { tier: "weekly", key: `weekly-${year}-W${pad2(week)}` };
  }
  return {
    tier: "daily",
    key: localCalendarDayKey(now),
  };
}

/** 등불 주기 = 로컬 캘린더 하루. 티어는 카피용. 콘텐츠는 6시간 슬롯. */
export function resolveLampPeriod(now: Date = new Date()): {
  dayKey: string;
  tier: BriefingTier;
  statsKey: string;
  contentSlot: string;
} {
  const { tier, key: statsKey } = resolvePeriodTier(now);
  return {
    dayKey: localCalendarDayKey(now),
    tier,
    statsKey,
    contentSlot: lampContentSlotKey(now),
  };
}

/** 모드별 일일 등불 키 — 지정학·지경학 각각 하루 단위 */
export function lampSeenKey(dayKey: string, mode: ViewerMode): string {
  return `${dayKey}-${mode}`;
}

/** @deprecated 하루 종일 이용으로 전환 — 접힘 상태는 hasFoldedLamp 사용 */
export function hasSeenPeriod(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === "1";
  } catch {
    return true;
  }
}

/** @deprecated 접기만으로는 하루 종료하지 않음 */
export function markPeriodSeen(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, "1");
  } catch {
    /* ignore */
  }
}

export function hasFoldedLamp(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FOLDED_PREFIX + key) === "1";
  } catch {
    return false;
  }
}

export function markLampFolded(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FOLDED_PREFIX + key, "1");
  } catch {
    /* ignore */
  }
}

export function clearLampFolded(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FOLDED_PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** 월요일 주간 회고 storage 키 — `weekly-YYYY-Www-{conflict|economy}` */
export function weeklyRecapStorageKey(weekKey: string, mode: ViewerMode): string {
  return `${weekKey}-${mode}`;
}

export function hasFoldedWeeklyRecap(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WEEKLY_RECAP_FOLDED_PREFIX + key) === "1";
  } catch {
    return false;
  }
}

export function markWeeklyRecapFolded(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WEEKLY_RECAP_FOLDED_PREFIX + key, "1");
  } catch {
    /* ignore */
  }
}

export function clearWeeklyRecapFolded(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WEEKLY_RECAP_FOLDED_PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** 주간 회고 양피지 제목 — 「지난주 리캡」리듬 */
export function weeklyRecapTitle(
  viewerMode: ViewerMode,
  lang: LabelLanguage,
  focusLine?: string,
): string {
  const ko = lang !== "en";
  const econ = viewerMode === "economy";
  const kicker = ko
    ? econ
      ? "지난주 시장 회고"
      : "지난주 전장 회고"
    : econ
      ? "Last week's market recap"
      : "Last week's theater recap";
  const focus =
    focusLine?.trim() ||
    (ko
      ? econ
        ? "한 주간의 가격·물류·제재 신호"
        : "한 주간의 전선·외교·열원 신호"
      : econ
        ? "A week of prices, logistics, and sanctions"
        : "A week of fronts, diplomacy, and heat");
  return `${kicker}\n${focus}`;
}

function hashKeyToIndex(key: string, mod: number): number {
  if (mod <= 0) return 0;
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

const LAMP_TITLE = {
  ko: {
    daily: "오늘의 전장 등불",
    weekly: "이번 주 전장 등불",
    monthly: "이번 달 전장 등불",
  },
  en: {
    daily: "Today's frontline lamp",
    weekly: "This week's frontline lamp",
    monthly: "This month's frontline lamp",
  },
} as const;

const LAMP_TITLE_ECON = {
  ko: {
    daily: "오늘의 시장 등불",
    weekly: "이번 주 시장 등불",
    monthly: "이번 달 시장 등불",
  },
  en: {
    daily: "Today's market lamp",
    weekly: "This week's market lamp",
    monthly: "This month's market lamp",
  },
} as const;

/**
 * 등불 서술 — 육하원칙(누가·언제·어디서·무엇을·왜·어떻게)을 논리 순서로 따르되
 * 라벨 나열이 아니라 정부 정례 브리핑처럼 단정한 공식 문장으로 이어 쓴다.
 */
function looksMostlyKorean(text: string): boolean {
  const ko = (text.match(/[\uac00-\ud7a3]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return ko >= 6 && ko >= latin * 0.5;
}

function pickKoreanLines(lines: string[], limit = 2): string[] {
  return lines.filter(looksMostlyKorean).slice(0, limit);
}

function partyLabel(parties: string[]): string {
  if (parties.length === 0) return "관련 세력";
  return parties.join("·");
}

function buildGeoFallback(tier: BriefingTier, dayKey: string, lang: LabelLanguage): PeriodicBriefing | null {
  if (FRICTION_EPISODES.length === 0) return null;
  const ko = lang !== "en";
  const episode = FRICTION_EPISODES[hashKeyToIndex(dayKey, FRICTION_EPISODES.length)];
  const kicker = ko ? LAMP_TITLE.ko[tier] : LAMP_TITLE.en[tier];
  const yearText = episode.yearEnd
    ? `${episode.historicalYear}–${episode.yearEnd}`
    : `${episode.historicalYear}`;
  const who = partyLabel(episode.parties);

  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${episode.title}`,
    paragraphs: ko
      ? [
          // 언제 · 어디서 · 누가
          `보고드립니다. ${yearText}, ${episode.locationName}에서 ${who}이(가) 충돌했습니다. 금일 정례 보고는 라이브 집계가 비어 있어 이 사례를 기준 자료로 다룹니다.`,
          // 무엇을 · 왜
          episode.briefing,
          // 어떻게
          "이상은 확인된 과거 기록에 근거한 정리이며, 오늘의 긴장을 판단하는 참고 자료입니다. 상세 내용은 지도 허브 「반서방국 충돌사」에서 확인하실 수 있습니다. 다음 보고는 6시간마다 갱신됩니다.",
        ]
      : [
          `Briefing. In ${yearText}, at ${episode.locationName}, ${who} collided. With live aggregates empty, today's report uses this case as reference material.`,
          episode.briefing,
          "The above is drawn from verified historical record and serves as reference for reading today's tension. Full detail is available in the Frictions hub. The next report updates every 6 hours.",
        ],
  };
}

function buildEconFallback(tier: BriefingTier, dayKey: string, lang: LabelLanguage): PeriodicBriefing | null {
  const briefs = allEconInsightBriefs();
  if (briefs.length === 0) return null;
  const ko = lang !== "en";
  const brief = briefs[hashKeyToIndex(dayKey, briefs.length)];
  const kicker = ko ? LAMP_TITLE_ECON.ko[tier] : LAMP_TITLE_ECON.en[tier];

  if (ko) {
    const koLines = pickKoreanLines(brief.paragraphs, 2);
    const whatWhy =
      koLines.length > 0
        ? koLines
        : [
            `${brief.titleKo}은(는) 물자와 가격이 지나가는 병목 지점입니다.`,
            "긴장이 번지면 에너지·물류·물가 경로로 파급됩니다. 금일 보고가 이 지점을 다루는 배경입니다.",
          ];
    return {
      tier,
      key: dayKey,
      title: `${kicker}\n${brief.titleKo}`,
      paragraphs: [
        // 언제 · 어디서 · 무엇을
        `보고드립니다. 금일 시장 정례 보고 대상은 ${brief.titleKo}입니다. 라이브 집계가 비어 있어 축적된 분석 자료를 기준으로 정리합니다.`,
        // 무엇을 · 왜
        ...whatWhy.slice(0, 2),
        // 어떻게
        "이상은 확인된 자료에 근거한 정리이며, 수치는 시리즈별 기준 시점이 다를 수 있습니다. 다음 보고는 6시간마다 갱신됩니다.",
      ],
    };
  }

  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${brief.titleEn}`,
    paragraphs: [
      `Briefing. Today's market report covers ${brief.titleEn}. With live aggregates empty, this draws on standing analysis.`,
      brief.impactLine,
      ...brief.paragraphs.slice(0, 2),
      "This organizes verified material only; series may differ in reference date. The next report updates every 6 hours.",
    ],
  };
}

/** 통계·샘플로 본문 구성. 데이터 없으면 null → 호출부가 폴백. */
export function buildBriefingFromStats(
  stats: BriefingPeriodStats | null | undefined,
  tier: BriefingTier,
  dayKey: string,
  lang: LabelLanguage,
  viewerMode: ViewerMode,
): PeriodicBriefing | null {
  if (!stats) return null;
  const total =
    stats.gdeltCount + stats.firmsCount + stats.telegramCount + stats.newsItemCount;
  if (total <= 0 && !(stats.detail?.gdeltSamples?.length || stats.detail?.telegramSamples?.length)) {
    return null;
  }

  const ko = lang !== "en";
  const econ = viewerMode === "economy";
  const kicker = econ
    ? ko
      ? LAMP_TITLE_ECON.ko[tier]
      : LAMP_TITLE_ECON.en[tier]
    : ko
      ? LAMP_TITLE.ko[tier]
      : LAMP_TITLE.en[tier];

  const hotTag = stats.topGdeltTag || null;
  const hotRegion = stats.topTelegramRegion || null;
  const hot = [hotTag, hotRegion].filter(Boolean).join(ko ? "·" : " / ") || null;

  const gdeltSamples = stats.detail?.gdeltSamples?.slice(0, 3) ?? [];
  const placeNames = (() => {
    const koPlaces = gdeltSamples
      .map((s) => s.name)
      .filter((n) => looksMostlyKorean(n) || /[가-힣]/.test(n));
    if (koPlaces.length > 0) return koPlaces.slice(0, 3).join(" · ");
    return gdeltSamples
      .map((s) => s.name)
      .slice(0, 2)
      .join(" · ");
  })();

  const tgSamples = stats.detail?.telegramSamples?.slice(0, 3) ?? [];
  const koTg = tgSamples.filter((s) => looksMostlyKorean(s.text));
  const tgRegions = [...new Set(tgSamples.map((s) => s.region).filter(Boolean))].slice(0, 2);

  const titleLine = hot
    ? ko
      ? `${hot} 상황 정례 보고`
      : `${hot} — situation report`
    : ko
      ? econ
        ? "시장 관측 정례 보고"
        : "전선 관측 정례 보고"
      : econ
        ? "Market situation report"
        : "Frontline situation report";

  const paragraphs: string[] = [];

  if (ko) {
    // 언제 · 어디서
    const whenWhere = hot
      ? `보고드립니다. 기준 시점은 금일 관측 창이며, 주요 관측 지역은 ${hot}${placeNames ? ` 일대입니다. 인접 지점으로 ${placeNames}이(가) 함께 포착되었습니다` : "입니다"}.`
      : placeNames
        ? `보고드립니다. 기준 시점은 금일 관측 창이며, 주요 관측 지역은 ${placeNames} 일대입니다.`
        : "보고드립니다. 기준 시점은 금일 관측 창이며, 특정 지역에 국한되지 않고 지도 전역에서 신호가 포착되었습니다.";
    paragraphs.push(whenWhere);

    // 누가 · 무엇을
    const actors: string[] = [];
    if (stats.gdeltCount > 0) {
      actors.push(`긴장 관측 ${stats.gdeltCount.toLocaleString()}건`);
    }
    if (stats.firmsCount > 0) {
      actors.push(`열원 탐지 ${stats.firmsCount.toLocaleString()}건`);
    }
    if (stats.telegramCount > 0) {
      actors.push(`현장 채널 보고 ${stats.telegramCount.toLocaleString()}건`);
    } else if (stats.newsItemCount > 0) {
      actors.push(`뉴스 보도 ${stats.newsItemCount.toLocaleString()}건`);
    }
    if (actors.length > 0) {
      paragraphs.push(
        `집계 항목은 ${actors.join(", ")}입니다. 동일 관측 창에서 수집된 신호를 종합한 수치입니다.${
          econ ? " 시장 거래 마감 시간대에도 관측은 계속되었습니다." : ""
        }`,
      );
    }

    // 왜
    if (koTg.length > 0) {
      const s = koTg[0]!;
      paragraphs.push(
        `주목 배경은 다음과 같습니다. ${s.region} 방면에서 「${s.text.slice(0, 120)}${s.text.length > 120 ? "…" : ""}」라는 현장 전언이 접수되어 긴장 수위가 상승했습니다. 미확인 전언으로, 교차 확인이 필요합니다.`,
      );
    } else if (tgRegions.length > 0) {
      paragraphs.push(
        `주목 배경은 ${tgRegions.join("·")} 일대 채널이 해당 지점을 지목한 데 있습니다. 원문에 외국어가 다수 섞여 위치 정보만 확인했습니다.`,
      );
    } else if (hot || placeNames) {
      paragraphs.push(
        `주목 배경은 ${hot || placeNames}이(가) 금일 관측 창에서 가장 먼저·가장 강하게 반응한 점입니다.`,
      );
    }

    // 어떻게
    paragraphs.push(
      econ
        ? "종합하면, 본 보고는 누가·언제·어디서·무엇을·왜·어떻게 순서로 확인된 사실만 정리한 것입니다. 수치는 시리즈별 기준 시점이 달라 단정적 해석은 유보합니다. 다음 보고는 6시간마다 갱신됩니다."
        : "종합하면, 본 보고는 확인된 관측 사실을 육하원칙 순서로 정리한 것이며 추정·전망은 포함하지 않았습니다. 다음 보고는 6시간마다 갱신됩니다.",
    );
  } else {
    paragraphs.push(
      hot
        ? `Briefing. As of this observation window, the primary area of interest is ${hot}${placeNames ? `, with adjacent activity near ${placeNames}` : ""}.`
        : placeNames
          ? `Briefing. As of this observation window, the primary area of interest is ${placeNames}.`
          : "Briefing. As of this observation window, signals were recorded across the map with no single dominant area.",
    );
    const actors: string[] = [];
    if (stats.gdeltCount > 0) actors.push(`${stats.gdeltCount.toLocaleString()} tension observations`);
    if (stats.firmsCount > 0) actors.push(`${stats.firmsCount.toLocaleString()} heat detections`);
    if (stats.telegramCount > 0) actors.push(`${stats.telegramCount.toLocaleString()} field-channel reports`);
    if (actors.length > 0) {
      paragraphs.push(`Recorded items: ${actors.join("; ")}, aggregated from the same observation window.`);
    }
    if (tgSamples[0]) {
      const s = tgSamples[0];
      paragraphs.push(
        `Context: a field report from ${s.region} — “${s.text.slice(0, 120)}${s.text.length > 120 ? "…" : ""}” — raised the tension level. Unverified; pending corroboration.`,
      );
    } else if (hot || placeNames) {
      paragraphs.push(`Context: ${hot || placeNames} responded first and most strongly in this window.`);
    }
    paragraphs.push(
      "In summary, this report organizes verified observations in 5W1H order and excludes projection. The next report updates every 6 hours.",
    );
  }

  if (paragraphs.length < 2) return null;

  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${titleLine}`,
    paragraphs,
  };
}

/**
 * 폴백만 — 라이브 집계 없을 때.
 * 호출부에서 key를 lampSeenKey(dayKey, mode)로 덮어쓴다.
 */
export function buildPeriodicBriefing(
  viewerMode: ViewerMode,
  lang: LabelLanguage,
  now: Date = new Date(),
): PeriodicBriefing | null {
  const { dayKey, tier } = resolveLampPeriod(now);
  if (viewerMode === "economy") {
    return buildEconFallback(tier, dayKey, lang) ?? buildGeoFallback(tier, dayKey, lang);
  }
  return buildGeoFallback(tier, dayKey, lang);
}

/** @deprecated 본문이 이미 집계 기반이면 no-op에 가깝게 유지 */
export function mergeBriefingStats(
  briefing: PeriodicBriefing,
  stats: BriefingPeriodStats | null | undefined,
  lang: LabelLanguage,
): PeriodicBriefing {
  if (!stats) return briefing;
  const fromStats = buildBriefingFromStats(
    stats,
    briefing.tier,
    briefing.key,
    lang,
    "conflict",
  );
  return fromStats ?? briefing;
}

const LAMP_NEWS_GENRE_PRIORITY: Record<string, number> = {
  macro: 0,
  markets: 1,
  tech: 2,
  chips: 3,
  auto: 4,
  energy: 5,
  shipping: 6,
  infra: 7,
};

/** 시장이 가장 민감하게 보는 기업·기관 — 미·중·유럽·러시아·아시아 */
const MARKET_FOCUS_ENTITIES: Array<{
  id: string;
  labelKo: string;
  labelEn: string;
  re: RegExp;
  bloc: "us" | "china" | "europe" | "russia" | "asia" | "other";
}> = [
  { id: "nvidia", labelKo: "엔비디아", labelEn: "Nvidia", re: /\bnvidia\b|\b엔비디아\b/i, bloc: "us" },
  { id: "apple", labelKo: "애플", labelEn: "Apple", re: /\bapple\b|\b애플\b/i, bloc: "us" },
  { id: "microsoft", labelKo: "마이크로소프트", labelEn: "Microsoft", re: /\bmicrosoft\b|\bmsft\b|\b마이크로소프트\b/i, bloc: "us" },
  { id: "google", labelKo: "구글·알파벳", labelEn: "Google", re: /\bgoogle\b|\balphabet\b|\b구글\b|\b알파벳\b/i, bloc: "us" },
  { id: "amazon", labelKo: "아마존", labelEn: "Amazon", re: /\bamazon\b|\bamzn\b|\b아마존\b/i, bloc: "us" },
  { id: "meta", labelKo: "메타", labelEn: "Meta", re: /\bmeta\b|\bfacebook\b|\b메타\b/i, bloc: "us" },
  { id: "openai", labelKo: "OpenAI", labelEn: "OpenAI", re: /\bopenai\b|\bchatgpt\b/i, bloc: "us" },
  { id: "intel", labelKo: "인텔", labelEn: "Intel", re: /\bintel\b|\b인텔\b/i, bloc: "us" },
  { id: "tesla", labelKo: "테슬라", labelEn: "Tesla", re: /\btesla\b|\b테슬라\b/i, bloc: "us" },
  { id: "exxon", labelKo: "엑손모빌", labelEn: "Exxon", re: /\bexxon\b|\b엑손\b/i, bloc: "us" },
  { id: "chevron", labelKo: "셰브론", labelEn: "Chevron", re: /\bchevron\b|\b셰브론\b/i, bloc: "us" },
  { id: "fed", labelKo: "연준", labelEn: "Fed", re: /\bfederal reserve\b|\bfed\b|\bjerome powell\b|\b연준\b|\b파월\b/i, bloc: "us" },
  { id: "jpmorgan", labelKo: "JP모건", labelEn: "JPMorgan", re: /\bjpmorgan\b|\bjp morgan\b|\bjpm\b/i, bloc: "us" },
  { id: "goldman", labelKo: "골드만삭스", labelEn: "Goldman", re: /\bgoldman\b|\b골드만\b/i, bloc: "us" },
  { id: "blackrock", labelKo: "블랙록", labelEn: "BlackRock", re: /\bblackrock\b|\b블랙록\b/i, bloc: "us" },
  // 중국
  { id: "china", labelKo: "중국", labelEn: "China", re: /\bchina\b|\bchinese\b|\bbeijing\b|\b중국\b|\b베이징\b/i, bloc: "china" },
  { id: "huawei", labelKo: "화웨이", labelEn: "Huawei", re: /\bhuawei\b|\b화웨이\b/i, bloc: "china" },
  { id: "alibaba", labelKo: "알리바바", labelEn: "Alibaba", re: /\balibaba\b|\b알리바바\b/i, bloc: "china" },
  { id: "tencent", labelKo: "텐센트", labelEn: "Tencent", re: /\btencent\b|\b텐센트\b/i, bloc: "china" },
  { id: "bytedance", labelKo: "바이트댄스", labelEn: "ByteDance", re: /\bbytedance\b|\btiktok\b|\b바이트댄스\b|\b틱톡\b/i, bloc: "china" },
  { id: "smic", labelKo: "SMIC", labelEn: "SMIC", re: /\bsmic\b/i, bloc: "china" },
  { id: "catl", labelKo: "CATL", labelEn: "CATL", re: /\bcatl\b/i, bloc: "china" },
  { id: "byd", labelKo: "BYD", labelEn: "BYD", re: /\bbyd\b/i, bloc: "china" },
  { id: "xiaomi", labelKo: "샤오미", labelEn: "Xiaomi", re: /\bxiaomi\b|\b샤오미\b/i, bloc: "china" },
  { id: "pboc", labelKo: "인민은행", labelEn: "PBOC", re: /\bpboc\b|\bpeople'?s bank of china\b|\b인민은행\b/i, bloc: "china" },
  // 유럽
  { id: "ecb", labelKo: "ECB", labelEn: "ECB", re: /\becb\b|\beuropean central bank\b|\blagarde\b|\b유럽중앙은행\b|\b라가르드\b/i, bloc: "europe" },
  { id: "eu", labelKo: "EU", labelEn: "EU", re: /\beurozone\b|\beuropean union\b|\beu commission\b|\b유럽연합\b|\b유로존\b/i, bloc: "europe" },
  { id: "siemens", labelKo: "지멘스", labelEn: "Siemens", re: /\bsiemens\b|\b지멘스\b/i, bloc: "europe" },
  { id: "sap", labelKo: "SAP", labelEn: "SAP", re: /\bsap\b/i, bloc: "europe" },
  { id: "lvmh", labelKo: "LVMH", labelEn: "LVMH", re: /\blvmh\b|\blouis vuitton\b/i, bloc: "europe" },
  { id: "vw", labelKo: "폭스바겐", labelEn: "Volkswagen", re: /\bvolkswagen\b|\bvw\b|\b폭스바겐\b/i, bloc: "europe" },
  { id: "total", labelKo: "토탈", labelEn: "TotalEnergies", re: /\btotalenergies\b|\btotal\b/i, bloc: "europe" },
  { id: "bp", labelKo: "BP", labelEn: "BP", re: /\bbp\b|\bbritish petroleum\b/i, bloc: "europe" },
  { id: "shell", labelKo: "셸", labelEn: "Shell", re: /\bshell\b/i, bloc: "europe" },
  { id: "asml", labelKo: "ASML", labelEn: "ASML", re: /\basml\b/i, bloc: "europe" },
  { id: "deutschebank", labelKo: "도이치은행", labelEn: "Deutsche Bank", re: /\bdeutsche bank\b|\b도이치은행\b/i, bloc: "europe" },
  // 러시아
  { id: "russia", labelKo: "러시아", labelEn: "Russia", re: /\brussia\b|\brussian\b|\bmoscow\b|\bkremlin\b|\b러시아\b|\b모스크바\b|\b크렘린\b/i, bloc: "russia" },
  { id: "gazprom", labelKo: "가즈프롬", labelEn: "Gazprom", re: /\bgazprom\b|\b가즈프롬\b/i, bloc: "russia" },
  { id: "rosneft", labelKo: "로스네프트", labelEn: "Rosneft", re: /\brosneft\b|\b로스네프트\b/i, bloc: "russia" },
  { id: "cbr", labelKo: "러시아중앙은행", labelEn: "CBR", re: /\bcentral bank of russia\b|\bcbr\b|\bruble\b|\b루블\b/i, bloc: "russia" },
  // 한국 · 일본
  { id: "korea", labelKo: "한국", labelEn: "Korea", re: /\bkorea\b|\bkorean\b|\bseoul\b|\bsouth korea\b|\b한국\b|\b서울\b|\b대한민국\b/i, bloc: "asia" },
  { id: "japan", labelKo: "일본", labelEn: "Japan", re: /\bjapan\b|\bjapanese\b|\btokyo\b|\b일본\b|\b도쿄\b/i, bloc: "asia" },
  { id: "samsung", labelKo: "삼성", labelEn: "Samsung", re: /\bsamsung\b|\b삼성\b/i, bloc: "asia" },
  { id: "skhynix", labelKo: "SK하이닉스", labelEn: "SK hynix", re: /\bhynix\b|\b하이닉스\b/i, bloc: "asia" },
  { id: "hyundai", labelKo: "현대차", labelEn: "Hyundai", re: /\bhyundai\b|\b현대차\b|\b현대자동차\b/i, bloc: "asia" },
  { id: "bok", labelKo: "한국은행", labelEn: "BOK", re: /\bbank of korea\b|\bbok\b|\b한국은행\b/i, bloc: "asia" },
  { id: "toyota", labelKo: "토요타", labelEn: "Toyota", re: /\btoyota\b|\b토요타\b|\b도요타\b/i, bloc: "asia" },
  { id: "softbank", labelKo: "소프트뱅크", labelEn: "SoftBank", re: /\bsoftbank\b|\b소프트뱅크\b/i, bloc: "asia" },
  { id: "sony", labelKo: "소니", labelEn: "Sony", re: /\bsony\b|\b소니\b/i, bloc: "asia" },
  { id: "boj", labelKo: "일본은행", labelEn: "BOJ", re: /\bbank of japan\b|\bboj\b|\b일본은행\b/i, bloc: "asia" },
  { id: "tsmc", labelKo: "TSMC", labelEn: "TSMC", re: /\btsmc\b|\btaiwan semiconductor\b|\b대만반도체\b/i, bloc: "other" },
  { id: "aramco", labelKo: "아람코", labelEn: "Aramco", re: /\baramco\b|\b아람코\b/i, bloc: "other" },
  { id: "imf", labelKo: "IMF", labelEn: "IMF", re: /\bimf\b|\binternational monetary fund\b/i, bloc: "other" },
  { id: "opec", labelKo: "OPEC", labelEn: "OPEC", re: /\bopec\b/i, bloc: "other" },
];

/** 미·중 경쟁·디리스킹 키워드 — 점수 가산 */
const US_CHINA_RIVALRY_RE =
  /us[\s-]?china|u\.?s\.?[\s-]?china|china[\s-]?us|trade war|export control|de-?risk|decoupl|rare earth|chip ban|tariff|제재|관세|미중|미·중|디리스킹|디커플링|희토류|수출통제/i;

type GeoBloc = "us" | "china" | "europe" | "russia" | "asia" | "other";

/** 등불 초대형 뉴스 최소 건수 — 당일 핫 토픽 조합 */
export const ECONOMY_LAMP_NEWS_MIN = 8;

function detectGeoBloc(
  text: string,
  theater?: string,
  entities: typeof MARKET_FOCUS_ENTITIES = [],
): GeoBloc {
  if (theater === "china-taiwan") return "china";
  if (theater === "russia-ukraine") {
    if (/\beurope\b|\beu\b|\becb\b|\bgermany\b|\bfrance\b|\b유럽\b/i.test(text)) return "europe";
    return "russia";
  }
  if (theater === "korea" || theater === "japan") return "asia";

  const blocHit = entities.find((e) => e.bloc !== "us");
  if (blocHit?.bloc === "china") return "china";
  if (blocHit?.bloc === "europe") return "europe";
  if (blocHit?.bloc === "russia") return "russia";
  if (blocHit?.bloc === "asia") return "asia";

  if (US_CHINA_RIVALRY_RE.test(text) && /\bchina\b|\bchinese\b|\b중국\b/i.test(text)) return "china";
  if (/\brussia\b|\brussian\b|\bmoscow\b|\bgazprom\b|\b러시아\b|\b가즈프롬\b/i.test(text)) {
    return "russia";
  }
  if (
    /\beurope\b|\beurozone\b|\beu\b|\becb\b|\bgermany\b|\bfrance\b|\buk\b|\b유럽\b|\b독일\b|\b프랑스\b/i.test(
      text,
    )
  ) {
    return "europe";
  }
  if (
    /\bkorea\b|\bkorean\b|\bjapan\b|\bjapanese\b|\bseoul\b|\btokyo\b|\b삼성\b|\b한국\b|\b일본\b|\b도쿄\b|\b서울\b/i.test(
      text,
    )
  ) {
    return "asia";
  }
  if (entities.some((e) => e.bloc === "us") && !/\bchina\b|\brussia\b|\beurope\b|\beu\b|\bkorea\b|\bjapan\b/i.test(text)) {
    return "us";
  }
  if (blocHit?.bloc === "other") return "other";
  if (/\bchina\b|\bchinese\b|\bbeijing\b|\b중국\b/i.test(text)) return "china";
  if (/\bindia\b|\bindian\b|\b인도\b/i.test(text)) return "other";
  if (entities.some((e) => e.bloc === "us")) return "us";
  return "other";
}

const GENRE_FOCUS_KO: Record<string, string> = {
  macro: "거시·정책",
  markets: "시장·와이어",
  tech: "AI·빅테크",
  chips: "반도체",
  auto: "모빌리티",
  energy: "에너지",
  shipping: "물류·해운",
  infra: "인프라",
};

const GENRE_FOCUS_EN: Record<string, string> = {
  macro: "Macro · Policy",
  markets: "Markets",
  tech: "AI · Big Tech",
  chips: "Semiconductors",
  auto: "Mobility",
  energy: "Energy",
  shipping: "Shipping",
  infra: "Infrastructure",
};

type NewsPickInput = {
  id: string;
  title: string;
  link: string;
  source: string;
  publisher?: string;
  trustTier: 1 | 2 | 3;
  imageUrl?: string;
  summary?: string;
  econGenre?: string;
  theater?: string;
  pubDate?: string;
  urgencyScore?: number;
  breakingGrade?: number;
  clusterId?: string;
};

function lampClusterKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
}

function ageMinutes(pubDate?: string): number {
  if (!pubDate) return 9999;
  const t = Date.parse(pubDate);
  if (!Number.isFinite(t)) return 9999;
  return Math.max(0, (Date.now() - t) / 60_000);
}

/** 당일(로컬) 기사인지 */
function isLocalCalendarToday(pubDate?: string): boolean {
  if (!pubDate) return false;
  const d = new Date(pubDate);
  if (!Number.isFinite(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function matchedFocusEntities(text: string) {
  return MARKET_FOCUS_ENTITIES.filter((e) => e.re.test(text));
}

function buildFocusLabel(
  text: string,
  genre: string | undefined,
  lang: "ko" | "en",
): string | undefined {
  const hits = matchedFocusEntities(text).slice(0, 2);
  const genreLabel =
    lang === "en" ? GENRE_FOCUS_EN[genre ?? ""] : GENRE_FOCUS_KO[genre ?? ""];
  const names = hits.map((h) => (lang === "en" ? h.labelEn : h.labelKo));
  const koreaTag = isKoreaTargetedSpeech(text)
    ? lang === "en"
      ? "Aimed at Korea"
      : "한국 겨냥"
    : mentionsSouthKorea(text)
      ? lang === "en"
        ? "Korea"
        : "한국"
      : null;
  const rivalry =
    US_CHINA_RIVALRY_RE.test(text) && (lang === "en" ? "US–China" : "미·중 경쟁");
  const parts = [koreaTag, rivalry || undefined, ...names, genreLabel].filter(Boolean) as string[];
  if (parts.length === 0) return undefined;
  return parts.join(" · ");
}

function deepenSummary(raw: string | undefined, title: string): string {
  const clean = (raw ?? "").replace(/\s+/g, " ").trim();
  const max = LAMP_DISPLAY_SUMMARY_MAX;
  if (clean.length >= 160) return clean.slice(0, max);
  if (clean.length >= 40 && !clean.toLowerCase().includes(title.toLowerCase().slice(0, 24))) {
    return `${title}. ${clean}`.slice(0, max);
  }
  return clean.length > 0 ? clean.slice(0, max) : title;
}

type ScoredLampNews = {
  item: NewsPickInput;
  entities: ReturnType<typeof matchedFocusEntities>;
  bloc: GeoBloc;
  score: number;
  clusterSize: number;
  ageMin: number;
};

function scoreLampCandidate(
  item: NewsPickInput,
  clusterSize: number,
): ScoredLampNews {
  const blob = `${item.title} ${item.summary ?? ""}`;
  const entities = matchedFocusEntities(blob);
  const bloc = detectGeoBloc(blob, item.theater, entities);
  const summaryLen = (item.summary ?? "").trim().length;
  const ageMin = ageMinutes(item.pubDate);
  const genreScore = LAMP_NEWS_GENRE_PRIORITY[item.econGenre ?? ""] ?? 40;
  const tierScore = (item.trustTier - 1) * 28;
  const companyScore = entities.length === 0 ? 35 : Math.max(0, 12 - entities.length * 14);
  // RSS 본문 스니펫 길이로 심층도 추정 (등불 표시 길이와 무관)
  const depthScore =
    summaryLen >= 700 ? -28 : summaryLen >= 400 ? -16 : summaryLen >= 200 ? -6 : summaryLen >= 80 ? 0 : 30;
  const thinPenalty = summaryLen < 40 ? 40 : 0;
  const rivalryBonus = US_CHINA_RIVALRY_RE.test(blob) ? -22 : 0;
  const opinionPenalty = isEconomyOpinionPiece(blob, item.publisher || item.source) ? 80 : 0;
  const hardBonus = isEconomyHardNews(blob, item.econGenre) ? -24 : 18;
  const koreaTargeted = isKoreaTargetedSpeech(blob);
  const koreaMention = mentionsSouthKorea(blob);
  const koreaBonus = koreaTargeted ? -46 : koreaMention ? -30 : 26;
  const koreaCompanyBonus =
    entities.some((e) => e.id === "korea" || e.id === "samsung" || e.id === "skhynix" || e.id === "hyundai" || e.id === "bok")
      ? -18
      : 0;
  const blocBonus =
    bloc === "asia"
      ? -18
      : bloc === "china"
        ? -10
        : bloc === "europe" || bloc === "russia"
          ? -6
          : bloc === "other"
            ? -4
            : 0;
  // 당일·최근성 — 시장 주시의 시간축 근거
  const freshnessBonus = isLocalCalendarToday(item.pubDate)
    ? ageMin <= 180
      ? -28
      : ageMin <= 720
        ? -18
        : -10
    : ageMin <= 1440
      ? -4
      : 25;
  // 다매체 중복(클러스터) — 여러 와이어가 같은 사건을 다룰수록 핫
  const clusterBonus =
    clusterSize >= 4 ? -30 : clusterSize >= 3 ? -20 : clusterSize >= 2 ? -12 : 0;
  // news-stream hero 등급이 있으면 재사용
  const breakingBonus =
    typeof item.breakingGrade === "number"
      ? item.breakingGrade >= 8
        ? -24
        : item.breakingGrade >= 6
          ? -14
          : item.breakingGrade >= 4
            ? -6
            : 0
      : typeof item.urgencyScore === "number"
        ? Math.max(-20, -Math.round(item.urgencyScore / 5))
        : 0;

  return {
    item,
    entities,
    bloc,
    clusterSize,
    ageMin,
    score:
      tierScore +
      genreScore +
      companyScore +
      depthScore +
      thinPenalty +
      rivalryBonus +
      opinionPenalty +
      hardBonus +
      koreaBonus +
      koreaCompanyBonus +
      blocBonus +
      freshnessBonus +
      clusterBonus +
      breakingBonus,
  };
}

function toFeatured(
  row: ScoredLampNews,
  lang: "ko" | "en",
): LampFeaturedNews {
  const item = row.item;
  return {
    id: item.id,
    title: item.title,
    summary: deepenSummary(item.summary, item.title),
    imageUrl: item.imageUrl!.trim(),
    link: item.link,
    source: item.publisher || item.source,
    trustTier: item.trustTier,
    focusLabel: buildFocusLabel(
      `${item.title} ${item.summary ?? ""}`,
      item.econGenre,
      lang,
    ),
  };
}

/**
 * 지경학 등불 — 한국을 겨냥한 지리경제·기업·거시 하드뉴스.
 * 칼럼·사설·오피니언 제외. 사진 필수.
 */
export function pickEconomyLampNews(
  items: NewsPickInput[],
  limit = ECONOMY_LAMP_NEWS_MIN,
  lang: "ko" | "en" = "ko",
): LampFeaturedNews[] {
  const target = Math.max(limit, ECONOMY_LAMP_NEWS_MIN);
  const withImage = items.filter((item) => {
    if (typeof item.imageUrl !== "string" || item.imageUrl.trim().length <= 8) return false;
    const blob = `${item.title} ${item.summary ?? ""}`;
    if (isEconomyOpinionPiece(blob, item.publisher || item.source)) return false;
    return true;
  });

  const clusterMap = new Map<string, number>();
  for (const item of withImage) {
    const key = item.clusterId || lampClusterKey(item.title);
    clusterMap.set(key, (clusterMap.get(key) ?? 0) + 1);
  }

  const scored = withImage
    .map((item) => {
      const key = item.clusterId || lampClusterKey(item.title);
      return scoreLampCandidate(item, clusterMap.get(key) ?? 1);
    })
    .sort((a, b) => a.score - b.score);

  const out: LampFeaturedNews[] = [];
  const seenLinks = new Set<string>();
  const seenEntity = new Set<string>();
  const seenClusters = new Set<string>();
  const genreCounts = new Map<string, number>();

  const tryPush = (row: ScoredLampNews, relax = false): boolean => {
    const item = row.item;
    const key = item.link || item.id;
    if (seenLinks.has(key)) return false;

    const cKey = item.clusterId || lampClusterKey(item.title);
    if (seenClusters.has(cKey) && !relax) return false;

    const blob = `${item.title} ${item.summary ?? ""}`;
    if (!relax && isEconomyOpinionPiece(blob, item.publisher || item.source)) return false;
    if (!relax && !isEconomyHardNews(blob, item.econGenre) && row.entities.length === 0) {
      return false;
    }

    const primaryEntity = row.entities[0]?.id;
    if (primaryEntity && seenEntity.has(primaryEntity) && !relax) return false;

    const summary = deepenSummary(item.summary, item.title);
    if (summary.length < 60 && row.entities.length === 0 && item.trustTier > 1 && !relax) {
      return false;
    }

    const genre = item.econGenre ?? "markets";
    const gCount = genreCounts.get(genre) ?? 0;
    if (!relax && gCount >= 3) return false;

    seenLinks.add(key);
    seenClusters.add(cKey);
    if (primaryEntity) seenEntity.add(primaryEntity);
    genreCounts.set(genre, gCount + 1);
    out.push(toFeatured(row, lang));
    return true;
  };

  const targeted = scored.filter((row) =>
    isKoreaTargetedSpeech(`${row.item.title} ${row.item.summary ?? ""}`),
  );
  const koreaRelated = scored.filter((row) =>
    mentionsSouthKorea(`${row.item.title} ${row.item.summary ?? ""}`),
  );

  for (const row of targeted) {
    if (out.length >= target) break;
    tryPush(row);
  }
  if (out.length < target) {
    for (const row of koreaRelated) {
      if (out.length >= target) break;
      tryPush(row);
    }
  }
  if (out.length < target) {
    for (const row of targeted) {
      if (out.length >= target) break;
      tryPush(row, true);
    }
    for (const row of koreaRelated) {
      if (out.length >= target) break;
      tryPush(row, true);
    }
  }
  // 최후 — 한국 관련 하드뉴스가 전혀 없을 때만 전역 기업·거시로 채움
  if (out.length === 0) {
    for (const row of scored) {
      if (out.length >= target) break;
      const blob = `${row.item.title} ${row.item.summary ?? ""}`;
      if (!isEconomyHardNews(blob, row.item.econGenre) && row.entities.length === 0) continue;
      tryPush(row, true);
    }
  }

  return out.slice(0, Math.max(out.length, Math.min(target, scored.length)));
}

/** 지정학 등불 최소 건수 — 한국 겨냥 발언 슬롯 */
export const CONFLICT_LAMP_NEWS_MIN = 10;
/** 등불 안 외교 슬롯 상한 — 전쟁만/회담만으로 치우치지 않게 */
export const CONFLICT_LAMP_DIPLOMACY_MAX = 3;

type ConflictTheater =
  | "middle-east"
  | "russia-ukraine"
  | "china-taiwan"
  | "korea"
  | "japan"
  | "south-asia"
  | "arctic"
  | "atlantic"
  | "global";

const APAC_CONFLICT_THEATERS: ConflictTheater[] = [
  "china-taiwan",
  "korea",
  "japan",
  "south-asia",
];

const ARCTIC_ATLANTIC_THEATERS: ConflictTheater[] = ["arctic", "atlantic"];

const THEATER_FOCUS_KO: Record<ConflictTheater, string> = {
  "middle-east": "중동",
  "russia-ukraine": "러·우",
  "china-taiwan": "미·중·아태",
  korea: "한반도",
  japan: "일본·인도태평양",
  "south-asia": "남아시아·인도양",
  arctic: "북극",
  atlantic: "대서양",
  global: "글로벌 국방",
};

const THEATER_FOCUS_EN: Record<ConflictTheater, string> = {
  "middle-east": "Middle East",
  "russia-ukraine": "Russia–Ukraine",
  "china-taiwan": "US–China · Asia-Pacific",
  korea: "Korean Peninsula",
  japan: "Japan · Indo-Pacific",
  "south-asia": "South Asia · Indian Ocean",
  arctic: "Arctic",
  atlantic: "Atlantic",
  global: "Global defense",
};

const CONFLICT_ACTOR_RE: Array<{ id: string; labelKo: string; labelEn: string; re: RegExp }> = [
  { id: "nato", labelKo: "NATO", labelEn: "NATO", re: /\bnato\b|\b나토\b/i },
  { id: "pla", labelKo: "PLA", labelEn: "PLA", re: /\bpla\b|\bpeople'?s liberation army\b|\b인민해방군\b/i },
  { id: "idf", labelKo: "IDF", labelEn: "IDF", re: /\bidf\b|\bisrael defense\b|\b이스라엘군\b/i },
  { id: "iran", labelKo: "이란", labelEn: "Iran", re: /\biran\b|\biranian\b|\btehran\b|\b이란\b|\b테헤란\b/i },
  { id: "israel", labelKo: "이스라엘", labelEn: "Israel", re: /\bisrael\b|\bisraeli\b|\b이스라엘\b/i },
  { id: "ukraine", labelKo: "우크라이나", labelEn: "Ukraine", re: /\bukraine\b|\bukrainian\b|\bkyiv\b|\bkiev\b|\b우크라이나\b|\b키이우\b/i },
  { id: "russia", labelKo: "러시아", labelEn: "Russia", re: /\brussia\b|\brussian\b|\bkremlin\b|\b러시아\b|\b크렘린\b/i },
  { id: "china", labelKo: "중국", labelEn: "China", re: /\bchina\b|\bchinese\b|\bbeijing\b|\b중국\b|\b베이징\b/i },
  { id: "nk", labelKo: "북한", labelEn: "North Korea", re: /\bnorth korea\b|\bpyongyang\b|\bkim jong\b|\b북한\b|\b평양\b/i },
  { id: "sk", labelKo: "한국", labelEn: "South Korea", re: /\bsouth korea\b|\bseoul\b|\brok\b|\b한국\b|\b서울\b/i },
  { id: "japan", labelKo: "일본", labelEn: "Japan", re: /\bjapan\b|\bjapanese\b|\btokyo\b|\b일본\b|\b도쿄\b/i },
  { id: "india", labelKo: "인도", labelEn: "India", re: /\bindia\b|\bindian\b|\bmodi\b|\b인도\b|\b모디\b/i },
  { id: "pakistan", labelKo: "파키스탄", labelEn: "Pakistan", re: /\bpakistan\b|\bpakistani\b|\b파키스탄\b/i },
  { id: "philippines", labelKo: "필리핀", labelEn: "Philippines", re: /\bphilippines\b|\bphilippine\b|\bmanila\b|\b필리핀\b/i },
  { id: "australia", labelKo: "호주", labelEn: "Australia", re: /\baustralia\b|\baukus\b|\b호주\b/i },
  { id: "quad", labelKo: "QUAD", labelEn: "QUAD", re: /\bquad\b|\b쿼드\b/i },
  { id: "norway", labelKo: "노르웨이", labelEn: "Norway", re: /\bnorway\b|\bnorwegian\b|\b노르웨이\b/i },
  { id: "greenland", labelKo: "그린란드", labelEn: "Greenland", re: /\bgreenland\b|\b그린란드\b/i },
  { id: "canada", labelKo: "캐나다", labelEn: "Canada", re: /\bcanada\b|\bcanadian\b|\b캐나다\b/i },
  { id: "hamas", labelKo: "하마스", labelEn: "Hamas", re: /\bhamas\b|\b하마스\b/i },
  { id: "houthis", labelKo: "후티", labelEn: "Houthis", re: /\bhouthi\b|\b후티\b/i },
  { id: "hezbollah", labelKo: "헤즈볼라", labelEn: "Hezbollah", re: /\bhezbollah\b|\b헤즈볼라\b/i },
  { id: "centcom", labelKo: "CENTCOM", labelEn: "CENTCOM", re: /\bcentcom\b/i },
  { id: "taiwan", labelKo: "대만", labelEn: "Taiwan", re: /\btaiwan\b|\btaipei\b|\b대만\b|\b타이완\b/i },
  { id: "brics", labelKo: "BRICS", labelEn: "BRICS", re: /\bbrics\b|\b브릭스\b/i },
  { id: "sco", labelKo: "SCO", labelEn: "SCO", re: /\bsco\b|\bshanghai cooperation\b|\b상하이협력\b/i },
  { id: "csto", labelKo: "CSTO", labelEn: "CSTO", re: /\bcsto\b|\bcollective security treaty\b/i },
  { id: "venezuela", labelKo: "베네수엘라", labelEn: "Venezuela", re: /\bvenezuela\b|\bmaduro\b|\b베네수엘라\b|\b마두로\b/i },
  { id: "cuba", labelKo: "쿠바", labelEn: "Cuba", re: /\bcuba\b|\bcuban\b|\b쿠바\b/i },
  { id: "belarus", labelKo: "벨라루스", labelEn: "Belarus", re: /\bbelarus\b|\blukashenko\b|\b벨라루스\b|\b루카셴코\b/i },
  { id: "syria", labelKo: "시리아", labelEn: "Syria", re: /\bsyria\b|\bassad\b|\b시리아\b|\b아사드\b/i },
];

const CONFLICT_HARD_NEWS_RE =
  /strike|missile|drone|airstrike|air.?raid|offensive|invasion|artillery|front.?line|ceasefire|sanction|deployment|exercise|nuclear|bombard|shelling|intercept|공습|미사일|드론|타격|공세|전선|휴전|제재|배치|핵|포격/i;

/** 외교·동맹 재편 — 전쟁과 함께 지정학 등불에 올릴 축 */
const CONFLICT_DIPLOMACY_RE =
  /diplomacy|diplomatic|summit|alliance|foreign\s?minister|bilateral|multilateral|normalization|state\s?visit|treaty|accord|strategic\s?dialogue|strategic\s?partnership|peace\s?talks|mediation|realignment|embassy|ambassador|g7|brics|quad\b|aukus|indo[\s-]?pacific|arctic\s?council|nato\s?summit|sco\b|csto|multipolar|global\s?south|no[\s-]?limits|crink|axis\s?of\s?upheaval|외교|정상회담|동맹|외무장관|전략대화|정상화|조약|대사|다극|브릭스|인도태평양|북극이사회/i;

const CONFLICT_SOFT_NEWS_RE =
  /celebrity|sport|football|soccer|nba|oscar|grammy|fashion|recipe|연예|스포츠|축구|야구|영화제/i;

/** 한국(남한) 언급 — 북한 단독 기사는 제외 */
const SOUTH_KOREA_MENTION_RE =
  /\bsouth\s?korea\b|\brepublic of korea\b|\brok\b|\bseoul\b|\busfk\b|\b한국\b|\b서울\b|\b대한민국\b|\b한미\b|\b한일\b|\b한중\b|\b윤석열\b|\blee jae[\s-]?myung\b/i;

const KOREA_GENERIC_RE = /\bkorea\b|\bkorean\b/i;

const NORTH_KOREA_ONLY_RE =
  /\bnorth\s?korea\b|\bdprk\b|\bpyongyang\b|\bkim\s?jong\b|\b북한\b|\b평양\b/i;

/** 한국을 향한 경고·비난·압박·외교 발언 */
const KOREA_TARGETED_SPEECH_RE =
  /warn(?:ed|s|ing)?|threat(?:en(?:ed|s|ing)?|s)?|criticiz(?:e|ed|es|ing)|condemn(?:ed|s|ing)?|slam(?:med|s)?|accus(?:e|ed|es|ing)|pressure|sanction(?:ed|s)?|rebuke|blast(?:ed)?|target(?:ed|s|ing)?|aim(?:ed|s)?\s+at|remark(?:s|ed)?|statement|foreign\s?ministr|spokeswoman|spokesperson|발언|겨냥|경고|비난|압박|비판|규탄|지적|언급|밝혔다|경고했|위협|도발|적대|강력\s?대응|엄중|항의/i;

/** 외부 행위자 ↔ 한국 근접 언급 */
const KOREA_FOREIGN_ACTOR_NEAR_RE =
  /(china|beijing|xi\s?jinping|pyongyang|north\s?korea|moscow|kremlin|putin|tokyo|japan|washington|white\s?house|pentagon|중국|베이징|시진핑|평양|북한|모스크바|크렘린|푸틴|도쿄|일본|워싱턴|백악관|국방부).{0,48}(south\s?korea|seoul|rok\b|한국|서울|대한민국|한미|한일|한중)|(south\s?korea|seoul|rok\b|한국|서울|대한민국|한미|한일|한중).{0,48}(china|beijing|pyongyang|north\s?korea|moscow|tokyo|japan|washington|중국|베이징|평양|북한|모스크바|도쿄|일본|워싱턴)/i;

/** 지경학 — 칼럼·사설·오피니언 배제 */
const ECONOMY_OPINION_RE =
  /\bop[\s-]?ed\b|\bopinion\b|\beditorial\b|\bcolumn(?:ist)?\b|\bcommentary\b|\bessay\b|\bperspective\b|\banalyst\s?view\b|\bguest\s?essay\b|칼럼|사설|논평|기고|오피니언|시론|해설\s?칼럼|외부\s?기고/i;

/** 지경학 — 기업·거시·지리경제 하드뉴스 */
const ECONOMY_HARD_NEWS_RE =
  /earnings|revenue|profit|guidance|gdp|inflation|cpi|ppi|interest\s?rate|policy\s?rate|tariff|sanction|export|import|trade\s?surplus|fdi|investment|m&a|merger|acquisition|supply\s?chain|semiconductor|chip|foundry|factory|plant|capex|bond|yield|won\b|환율|실적|매출|영업이익|gdp|성장률|물가|금리|관세|제재|수출|수입|무역|투자|인수|합병|공급망|반도체|공장|설비투자|원화|환율|지정학\s?리스크|지리경제|geoeconom/i;

function mentionsSouthKorea(text: string): boolean {
  if (SOUTH_KOREA_MENTION_RE.test(text)) return true;
  if (NORTH_KOREA_ONLY_RE.test(text) && !SOUTH_KOREA_MENTION_RE.test(text) && !/\bsouth\b|\brok\b|\bseoul\b/i.test(text)) {
    // 북한만 다루고 남한 맥락이 없으면 제외 — 단 "Korea" + 외부 행위자는 통과 가능
    if (!KOREA_GENERIC_RE.test(text)) return false;
  }
  if (KOREA_GENERIC_RE.test(text) && KOREA_FOREIGN_ACTOR_NEAR_RE.test(text)) return true;
  if (KOREA_GENERIC_RE.test(text) && !NORTH_KOREA_ONLY_RE.test(text)) return true;
  return false;
}

/** 지정학·지경학 공통 — 한국을 겨냥한 발언·압박 신호 */
function isKoreaTargetedSpeech(text: string): boolean {
  if (!mentionsSouthKorea(text)) return false;
  return KOREA_TARGETED_SPEECH_RE.test(text) || KOREA_FOREIGN_ACTOR_NEAR_RE.test(text);
}

function isEconomyOpinionPiece(text: string, source?: string): boolean {
  const blob = `${source ?? ""} ${text}`;
  return ECONOMY_OPINION_RE.test(blob);
}

function isEconomyHardNews(text: string, genre?: string): boolean {
  if (genre === "macro" || genre === "markets" || genre === "chips" || genre === "energy" || genre === "shipping") {
    return true;
  }
  return ECONOMY_HARD_NEWS_RE.test(text);
}

function normalizeConflictTheater(theater?: string): ConflictTheater {
  if (
    theater === "middle-east" ||
    theater === "russia-ukraine" ||
    theater === "china-taiwan" ||
    theater === "korea" ||
    theater === "japan" ||
    theater === "south-asia" ||
    theater === "arctic" ||
    theater === "atlantic" ||
    theater === "global"
  ) {
    return theater;
  }
  return "global";
}

/**
 * global·공유 피드에 묻힌 지역 이슈를 텍스트로 재분류.
 * 피드 태그(중동/러우)는 유지하고, 강한 키워드가 있으면 덮어쓴다.
 */
function inferGeoTheater(text: string): ConflictTheater | null {
  if (
    /arctic|high\s?north|northern\s?sea\s?route|northwest\s?passage|svalbard|barents|arctic\s?council|icebreaker|arctic\s?lng|북극|북해항로|스발바르|하이\s?노스/i.test(
      text,
    ) ||
    (/greenland|그린란드/i.test(text) &&
      /military|base|security|nato|russia|china|mine|rare\s?earth|국방|기지|안보|나토|러시아|중국/i.test(
        text,
      ))
  ) {
    return "arctic";
  }
  if (
    /giuk|north\s?atlantic|atlantic\s?fleet|second\s?fleet|transatlantic|atlantic\s?alliance|anti[\s-]?submarine|대서양|지유케이/i.test(
      text,
    ) ||
    (/\biceland\b|\bazores\b|아이슬란드/i.test(text) &&
      /nato|navy|submarine|patrol|military|나토|해군|잠수함/i.test(text))
  ) {
    return "atlantic";
  }
  if (
    /north\s?korea|pyongyang|kim\s?jong|dprk|korean\s?peninsula|dmz|icbm|북한|평양|한반도/i.test(
      text,
    )
  ) {
    return "korea";
  }
  if (
    /indian\s?ocean|bay\s?of\s?bengal|maldives|sri\s?lanka|hambantota|andaman|kashmir|line\s?of\s?actual|lac\b|pakistan|modi|string\s?of\s?pearls|인도양|카슈미르|파키스탄|몰디브/i.test(
      text,
    ) &&
    /india|pakistan|china|navy|port|missile|border|security|인도|중국|해군|항구/i.test(text)
  ) {
    return "south-asia";
  }
  if (
    /\bindia\b|\bpakistan\b|\bbangladesh\b|\bmyanmar\b|\bafghanistan\b|\btaliban\b|인도\b|미얀마|아프간/i.test(
      text,
    ) &&
    /military|missile|border|navy|security|conflict|geopolit|defense|전쟁|미사일|국경|안보/i.test(
      text,
    )
  ) {
    return "south-asia";
  }
  if (
    /taiwan|pla\b|south\s?china\s?sea|west\s?philippine|scarborough|spratly|paracel|us[\s-]?china|china[\s-]?us|great\s?power\s?competition|first\s?island|second\s?island|guam|philippine\s?sea|대만|남중국해|미중|괌/i.test(
      text,
    )
  ) {
    return "china-taiwan";
  }
  if (
    /aukus|quad\b|indo[\s-]?pacific|okinawa|senkaku|self[\s-]?defense\s?force|\bsdf\b|인도태평양|오키나와|센카쿠/i.test(
      text,
    )
  ) {
    return "japan";
  }
  if (
    /\bjapan\b|\btokyo\b|일본|도쿄/i.test(text) &&
    /defense|military|security|missile|alliance|china|korea|국방|안보|미사일|동맹|중국/i.test(text)
  ) {
    return "japan";
  }
  return null;
}

function resolveConflictTheater(item: NewsPickInput): ConflictTheater {
  const feedTheater = normalizeConflictTheater(item.theater);
  const blob = `${item.title} ${item.summary ?? ""}`;
  const inferred = inferGeoTheater(blob);

  if (!inferred) return feedTheater;

  // 중동·러우 피드는 유지하되, 아태·북극·대서양 키워드가 뚜렷하면 재분류
  if (feedTheater === "middle-east" || feedTheater === "russia-ukraine") {
    const strongGeo =
      /taiwan|south\s?china\s?sea|indo[\s-]?pacific|aukus|north\s?korea|pyongyang|indian\s?ocean|arctic|high\s?north|northern\s?sea\s?route|giuk|north\s?atlantic|대만|남중국해|인도태평양|북한|인도양|북극|북해항로|대서양|지유케이/i.test(
        blob,
      );
    return strongGeo ? inferred : feedTheater;
  }

  if (
    feedTheater === "global" ||
    APAC_CONFLICT_THEATERS.includes(feedTheater) ||
    ARCTIC_ATLANTIC_THEATERS.includes(feedTheater)
  ) {
    return inferred;
  }

  return inferred;
}

function matchedConflictActors(text: string) {
  return CONFLICT_ACTOR_RE.filter((a) => a.re.test(text)).slice(0, 2);
}

function buildConflictFocusLabel(
  text: string,
  theater: ConflictTheater,
  lang: "ko" | "en",
): string {
  const theaterLabel = lang === "en" ? THEATER_FOCUS_EN[theater] : THEATER_FOCUS_KO[theater];
  const actors = matchedConflictActors(text).map((a) => (lang === "en" ? a.labelEn : a.labelKo));
  const koreaTag = isKoreaTargetedSpeech(text)
    ? lang === "en"
      ? "Aimed at Korea"
      : "한국 겨냥"
    : mentionsSouthKorea(text)
      ? lang === "en"
        ? "Korea"
        : "한국"
      : null;
  const diplomacyTag = CONFLICT_DIPLOMACY_RE.test(text)
    ? lang === "en"
      ? "Diplomacy"
      : "외교"
    : null;
  const parts = [koreaTag ?? theaterLabel, ...actors];
  if (diplomacyTag) parts.push(diplomacyTag);
  return parts.filter(Boolean).join(" · ");
}

type ScoredConflictNews = {
  item: NewsPickInput;
  theater: ConflictTheater;
  score: number;
  clusterSize: number;
};

function scoreConflictCandidate(item: NewsPickInput, clusterSize: number): ScoredConflictNews {
  const blob = `${item.title} ${item.summary ?? ""}`;
  const theater = resolveConflictTheater(item);
  const summaryLen = (item.summary ?? "").trim().length;
  const ageMin = ageMinutes(item.pubDate);
  const tierScore = (item.trustTier - 1) * 30;
  // 본문 스니펫으로 심층도 추정 — 표시용 요약과 분리
  const depthScore =
    summaryLen >= 700 ? -30 : summaryLen >= 400 ? -18 : summaryLen >= 200 ? -8 : summaryLen >= 80 ? 4 : 36;
  const thinPenalty = summaryLen < 50 ? 45 : 0;
  const hardBonus = CONFLICT_HARD_NEWS_RE.test(blob) ? -18 : 0;
  const isDiplomacy = CONFLICT_DIPLOMACY_RE.test(blob);
  // 전쟁·행위자와 엮인 외교는 가산, 단독 soft summit은 약하게
  const diplomacyBonus = isDiplomacy
    ? CONFLICT_HARD_NEWS_RE.test(blob) || matchedConflictActors(blob).length > 0
      ? -16
      : -6
    : 0;
  const softDiplomacyPenalty =
    isDiplomacy && !CONFLICT_HARD_NEWS_RE.test(blob) && matchedConflictActors(blob).length === 0
      ? 12
      : 0;
  const softPenalty = CONFLICT_SOFT_NEWS_RE.test(blob) ? 50 : 0;
  const koreaTargeted = isKoreaTargetedSpeech(blob);
  const koreaMention = mentionsSouthKorea(blob);
  // 등불 기본축: 한국 겨냥 발언 > 한국 관련 지정학 > 그 외
  const koreaBonus = koreaTargeted ? -48 : koreaMention ? -28 : 22;
  // 아태·남아시아·북극·대서양을 중동·러우와 동급으로
  const theaterBonus =
    theater === "middle-east" ||
    theater === "russia-ukraine" ||
    theater === "china-taiwan" ||
    theater === "korea" ||
    theater === "japan" ||
    theater === "south-asia" ||
    theater === "arctic" ||
    theater === "atlantic"
      ? -12
      : -2;
  const freshnessBonus = isLocalCalendarToday(item.pubDate)
    ? ageMin <= 180
      ? -28
      : ageMin <= 720
        ? -18
        : -10
    : ageMin <= 1440
      ? -4
      : 28;
  const clusterBonus =
    clusterSize >= 4 ? -30 : clusterSize >= 3 ? -20 : clusterSize >= 2 ? -12 : 0;
  const breakingBonus =
    typeof item.breakingGrade === "number"
      ? item.breakingGrade >= 8
        ? -24
        : item.breakingGrade >= 6
          ? -14
          : item.breakingGrade >= 4
            ? -6
            : 0
      : typeof item.urgencyScore === "number"
        ? Math.max(-20, -Math.round(item.urgencyScore / 5))
        : 0;
  // Tier3 단독·짧은 본문은 가혹하게
  const tier3Thin =
    item.trustTier === 3 && clusterSize < 2 && summaryLen < 300 ? 35 : 0;

  return {
    item,
    theater,
    clusterSize,
    score:
      tierScore +
      depthScore +
      thinPenalty +
      hardBonus +
      diplomacyBonus +
      softDiplomacyPenalty +
      softPenalty +
      koreaBonus +
      theaterBonus +
      freshnessBonus +
      clusterBonus +
      breakingBonus +
      tier3Thin,
  };
}

function buildMatterHook(
  text: string,
  theater: ConflictTheater,
  isDiplomacy: boolean,
  lang: "ko" | "en",
): string | undefined {
  if (!isDiplomacy) return undefined;
  const theaterLabel = lang === "en" ? THEATER_FOCUS_EN[theater] : THEATER_FOCUS_KO[theater];
  const actors = matchedConflictActors(text).map((a) => (lang === "en" ? a.labelEn : a.labelKo));
  if (lang === "en") {
    return actors.length > 0
      ? `${actors.join("–")} near ${theaterLabel} — tap Why it matters for the map read.`
      : `Diplomatic signal in ${theaterLabel} — Why it matters unlocks the context.`;
  }
  return actors.length > 0
    ? `${actors.join("·")} · ${theaterLabel} 축 — 「왜 중요?」로 맥락 확인.`
    : `${theaterLabel} 외교 신호 — 「왜 중요?」로 맥락을 보세요.`;
}

function toConflictFeatured(row: ScoredConflictNews, lang: "ko" | "en"): LampFeaturedNews {
  const item = row.item;
  const blob = `${item.title} ${item.summary ?? ""}`;
  const isDiplomacy = CONFLICT_DIPLOMACY_RE.test(blob);
  return {
    id: item.id,
    title: item.title,
    summary: deepenSummary(item.summary, item.title),
    imageUrl: item.imageUrl!.trim(),
    link: item.link,
    source: item.publisher || item.source,
    trustTier: item.trustTier,
    focusLabel: buildConflictFocusLabel(blob, row.theater, lang),
    isDiplomacy,
    matterHook: buildMatterHook(blob, row.theater, isDiplomacy, lang),
  };
}

/**
 * 지정학 등불 — 전 세계 지정학 뉴스 중 **한국을 겨냥한 발언·압박**을 우선 채움.
 * 사진 필수 · 고신뢰. 후보가 부족하면 한국 관련 하드뉴스로 완화.
 */
export function pickConflictLampNews(
  items: NewsPickInput[],
  limit = CONFLICT_LAMP_NEWS_MIN,
  lang: "ko" | "en" = "ko",
): LampFeaturedNews[] {
  const target = Math.max(limit, CONFLICT_LAMP_NEWS_MIN);
  const withImage = items.filter(
    (item) => typeof item.imageUrl === "string" && item.imageUrl.trim().length > 8,
  );

  const clusterMap = new Map<string, number>();
  for (const item of withImage) {
    const key = item.clusterId || lampClusterKey(item.title);
    clusterMap.set(key, (clusterMap.get(key) ?? 0) + 1);
  }

  const scored = withImage
    .map((item) => {
      const key = item.clusterId || lampClusterKey(item.title);
      return scoreConflictCandidate(item, clusterMap.get(key) ?? 1);
    })
    .sort((a, b) => a.score - b.score);

  const out: LampFeaturedNews[] = [];
  const seenLinks = new Set<string>();
  const seenClusters = new Set<string>();
  let diplomacyCount = 0;

  const tryPush = (row: ScoredConflictNews, relax = false): boolean => {
    const item = row.item;
    const key = item.link || item.id;
    if (seenLinks.has(key)) return false;

    const cKey = item.clusterId || lampClusterKey(item.title);
    if (seenClusters.has(cKey) && !relax) return false;

    const bodyLen = (item.summary ?? "").trim().length;
    if (!relax && bodyLen < 80 && item.trustTier > 1) return false;
    if (!relax && item.trustTier === 3 && row.clusterSize < 2 && bodyLen < 250) return false;

    const blob = `${item.title} ${item.summary ?? ""}`;
    if (!relax && CONFLICT_SOFT_NEWS_RE.test(blob)) return false;

    const isDiplomacy = CONFLICT_DIPLOMACY_RE.test(blob);
    if (isDiplomacy && diplomacyCount >= CONFLICT_LAMP_DIPLOMACY_MAX && !relax) return false;

    seenLinks.add(key);
    seenClusters.add(cKey);
    if (isDiplomacy) diplomacyCount += 1;
    out.push(toConflictFeatured(row, lang));
    return true;
  };

  const targeted = scored.filter((row) =>
    isKoreaTargetedSpeech(`${row.item.title} ${row.item.summary ?? ""}`),
  );
  const koreaRelated = scored.filter((row) =>
    mentionsSouthKorea(`${row.item.title} ${row.item.summary ?? ""}`),
  );

  // 1) 한국 겨냥 발언 우선
  for (const row of targeted) {
    if (out.length >= target) break;
    tryPush(row);
  }

  // 2) 한국 관련 지정학 하드뉴스
  if (out.length < target) {
    for (const row of koreaRelated) {
      if (out.length >= target) break;
      tryPush(row);
    }
  }

  // 3) 완화 — 남은 겨냥·한국 관련
  if (out.length < target) {
    for (const row of targeted) {
      if (out.length >= target) break;
      tryPush(row, true);
    }
    for (const row of koreaRelated) {
      if (out.length >= target) break;
      tryPush(row, true);
    }
  }

  // 4) 최후 — 풀이 비면 전역 하드뉴스 (빈 등불 방지)
  if (out.length === 0) {
    for (const row of scored) {
      if (out.length >= target) break;
      tryPush(row, true);
    }
  }

  return out.slice(0, Math.max(out.length, Math.min(target, scored.length)));
}

/** market-lamp macros → 사이드바 표 행 */
export function buildLampMacroTable(
  macros: Array<{
    name?: string | null;
    id?: string | null;
    inflationPct?: number | null;
    gdpGrowthPct?: number | null;
    unemploymentPct?: number | null;
    gdpPerCapitaUsd?: number | null;
    gdpUsd?: number | null;
  }>,
  lang: LabelLanguage,
): LampMacroRow[] {
  const ko = lang !== "en";
  const rows: LampMacroRow[] = [];
  const fmtPct = (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? "—" : `${v.toFixed(1)}%`;
  const fmtUsd = (v: number | null | undefined) => {
    if (v == null || !Number.isFinite(v)) return "—";
    if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (Math.abs(v) >= 1e3) return `$${Math.round(v).toLocaleString()}`;
    return `$${v.toFixed(0)}`;
  };

  for (const m of macros.slice(0, 3)) {
    const country = (m.name || m.id || (ko ? "국가" : "Country")).trim();
    rows.push({
      country,
      indicator: ko ? "GDP 성장" : "GDP growth",
      value: fmtPct(m.gdpGrowthPct),
    });
    rows.push({
      country,
      indicator: ko ? "물가(CPI)" : "Inflation (CPI)",
      value: fmtPct(m.inflationPct),
    });
    rows.push({
      country,
      indicator: ko ? "실업률" : "Unemployment",
      value: fmtPct(m.unemploymentPct),
    });
    rows.push({
      country,
      indicator: ko ? "1인당 GDP" : "GDP / capita",
      value: fmtUsd(m.gdpPerCapitaUsd),
    });
  }
  return rows;
}

/** 지경학 등불은 표·뉴스가 본문 — 서술 문단은 최대 1개로 압축 */
export function shortenEconomyLampParagraphs(paragraphs: string[], max = 1): string[] {
  return paragraphs
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((p) => (p.length > 220 ? `${p.slice(0, 217)}…` : p));
}

/**
 * 한글 UI일 때 등불 본문(제목·문단·뉴스 카드·거시표·WTI)을 최대한 한국어로 맞춤.
 * 이미 한글이 주를 이루면 재번역하지 않음.
 */
export async function localizePeriodicBriefing(
  briefing: PeriodicBriefing,
  lang: LabelLanguage,
): Promise<PeriodicBriefing> {
  if (lang === "en") return briefing;

  const { isMostlyKorean, mapPool, translateTextToKorean } = await import(
    "@/lib/koreanTranslate"
  );

  const toKo = async (text: string | undefined | null): Promise<string> => {
    if (!text?.trim()) return text ?? "";
    if (isMostlyKorean(text)) return text;
    return translateTextToKorean(text);
  };

  const [title, paragraphs, featuredNews, macroTable] = await Promise.all([
    toKo(briefing.title),
    mapPool(briefing.paragraphs, toKo, 3),
    briefing.featuredNews
      ? mapPool(
          briefing.featuredNews,
          async (item) => ({
            ...item,
            title: await toKo(item.title),
            summary: await toKo(item.summary),
            focusLabel: item.focusLabel ? await toKo(item.focusLabel) : item.focusLabel,
            matterHook: item.matterHook ? await toKo(item.matterHook) : item.matterHook,
          }),
          4,
        )
      : undefined,
    briefing.macroTable
      ? mapPool(
          briefing.macroTable,
          async (row) => ({
            ...row,
            country: await toKo(row.country),
            indicator: isMostlyKorean(row.indicator)
              ? row.indicator
              : await toKo(row.indicator),
          }),
          4,
        )
      : undefined,
  ]);

  const wti = briefing.wti
    ? { ...briefing.wti, lead: await toKo(briefing.wti.lead) }
    : briefing.wti;

  return {
    ...briefing,
    title,
    paragraphs,
    featuredNews,
    macroTable,
    wti,
  };
}
