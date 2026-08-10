import type { BriefingPeriodStats } from "@/lib/briefingPeriodStats";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";
import {
  chokepointFocusTag,
  chokepointScoreBonus,
  isChokepointEconomyNews,
  isChokepointNews,
  isChokepointSecurityNews,
} from "@/lib/news/chokepointNews";
import { isArticleUrl } from "@/lib/news/articleLink";
import { normalizeLampImageUrl, hasLampPhoto } from "@/lib/news/lampThumbnail";
import { isJapanGeopoliticsNews } from "@/lib/news/japanGeopolitics";
import { isGeopoliticsOnlyTheater } from "@/lib/news/regionalConflictNews";

/**
 * 매일 등불 브리핑 — 지정학·지경학 각각 6시간 슬롯으로 갱신.
 *
 * - 첫 방문 / 새 슬롯: 입장 온보딩 이후 양피지 자동 점화 (사진 데스크)
 * - 접기: 우측 「등불」탭으로 접어 두고 같은 슬롯 안에서 다시 펼침
 * - 뉴스 본문: 로컬 0·6·12·18시마다 새 슬롯 → 대표 뉴스·큰 사진 다시 점화
 * - storage 키 = `daily-YYYY-MM-DD-sN-{conflict|economy}` (슬롯마다 seen/folded 분리)
 * - 본문 = (지경학) 관심도 우선 하드뉴스 + soft 지역 다양성 + SOTW 매크로
 * - 지정학 = 관심도 우선 전장·외교 + 적대→한국 콕집힘 soft
 * - 등불 카드 = 선명 사진 + 개별 원문 URL (섹션/종합 링크·시드 패딩 금지)
 * - RSS 이미지 없으면 서버가 기사 og:image로 보강; 그래도 없으면 빈 데스크
 * - 서술 뼈대 = 육하원칙(누가·언제·어디서·무엇을·왜·어떻게)을 논리 순서로 따르는 정부 정례 브리핑 어조
 */

export type BriefingTier = "monthly" | "weekly" | "daily";

/**
 * 등불 카드 요약 표시 길이 — `RSS_BODY_SNIPPET_MAX`(220) 범위 안에 있어야 한다.
 *
 * ⚠️ 이 값은 **화면에 실제로 재현되는 타 매체 본문의 양**이다.
 *    파싱 상한만 줄이고 여기를 안 줄이면 정책이 반쪽이 된다.
 *    올릴 때는 반드시 rssParser.ts 의 상한과 함께 검토할 것.
 *
 * @see src/lib/news/rssParser.ts — RSS_BODY_SNIPPET_MAX
 * @see docs/copyright-audit-2026-08-01.md — R-3
 */
export const LAMP_DISPLAY_SUMMARY_MIN = 110;
export const LAMP_DISPLAY_SUMMARY_MAX = 200;

/** 등불 뉴스 콘텐츠 갱신 주기 (6시간) */
export const LAMP_CONTENT_SLOT_HOURS = 6;

/** 지경학·지정학 등불 — 초대형 뉴스 카드 (썸네일은 RSS 또는 CSS 면) */
export type LampFeaturedNews = {
  id: string;
  title: string;
  /** 등불용 요약본 (본문 전체가 아님) */
  summary: string;
  /** RSS/og http(s) 이미지 — 등불 픽에서는 필수 */
  imageUrl: string;
  link: string;
  source: string;
  trustTier: 1 | 2 | 3;
  /** 예: Nvidia · 반도체 / 중동 · IDF */
  focusLabel?: string;
  /** 지역·전장 버킷 — 사이드 집계·컬러 면 */
  theater?: string;
  /** 지경학 장르 — 컬러 테마·라벨 */
  econGenre?: string;
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
  /** 지정학 등불 사이드 — 오늘의 GTI (글로벌 긴장지수) */
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

/**
 * 모드·6시간 슬롯별 등불 storage 키.
 * @param contentSlot `lampContentSlotKey` / `resolveLampPeriod().contentSlot`
 *   (`daily-YYYY-MM-DD-s0` … `s3`)
 */
export function lampSeenKey(contentSlot: string, mode: ViewerMode): string {
  return `${contentSlot}-${mode}`;
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

const LAMP_TITLE = {
  ko: {
    daily: "오늘의 지정학 등불",
    weekly: "이번 주 지정학 등불",
    monthly: "이번 달 지정학 등불",
  },
  en: {
    daily: "Today's geopolitics lamp",
    weekly: "This week's geopolitics lamp",
    monthly: "This month's geopolitics lamp",
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

/**
 * 라이브 대형 사진 + 개별 원문 URL만 유지.
 * 섹션/종합 링크·무사진 시드 패딩 금지.
 */
export function ensureLampFeaturedNews(picked: LampFeaturedNews[]): LampFeaturedNews[] {
  return picked.filter(
    (n) => hasLampPhoto(n.imageUrl) && isArticleUrl(n.link),
  );
}

function buildGeoFallback(tier: BriefingTier, dayKey: string, lang: LabelLanguage): PeriodicBriefing | null {
  const ko = lang !== "en";
  const kicker = ko ? LAMP_TITLE.ko[tier] : LAMP_TITLE.en[tier];
  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${ko ? "전 세계 지역별 심층 데스크" : "Global regional deep desk"}`,
    paragraphs: [],
    featuredNews: [],
  };
}

function buildEconFallback(tier: BriefingTier, dayKey: string, lang: LabelLanguage): PeriodicBriefing | null {
  const ko = lang !== "en";
  const kicker = ko ? LAMP_TITLE_ECON.ko[tier] : LAMP_TITLE_ECON.en[tier];
  // 사진 데스크 셸 — 허브 서술 양피지로 떨어지지 않게 featuredNews 빈 배열 유지
  return {
    tier,
    key: dayKey,
    title: `${kicker}\n${ko ? "시장이 주목하는 뉴스" : "Markets in focus"}`,
    paragraphs: [],
    featuredNews: [],
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
      ? `보고드립니다. 기준 시점은 금일 관측 창입니다. 주요 관측 지역은 ${hot} 일대입니다.${
          placeNames ? ` 인접 지점으로 ${placeNames}이(가) 함께 포착되었습니다.` : ""
        }`
      : placeNames
        ? `보고드립니다. 기준 시점은 금일 관측 창입니다. 주요 관측 지역은 ${placeNames} 일대입니다.`
        : "보고드립니다. 기준 시점은 금일 관측 창입니다. 특정 지역에 국한되지 않고 지도 전역에서 신호가 포착되었습니다.";
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

/** 낮을수록 유리 — 투자·거시·칩·테크를 상단으로 */
const LAMP_NEWS_GENRE_PRIORITY: Record<string, number> = {
  macro: 0,
  markets: 1,
  chips: 2,
  tech: 3,
  auto: 4,
  infra: 5,
  energy: 8,
  shipping: 10,
};

/** 등불 — 초크포인트(해협·운하) 최소 확보 슬롯 */
export const ECONOMY_LAMP_CHOKE_MIN = 1;
export const CONFLICT_LAMP_CHOKE_MIN = 2;
/**
 * 활성 전선(중동·러·우) 각각 최소 슬롯 — 동일 비중.
 * 동아시아 긴장권(중·대·한반도·일본)도 같은 수치.
 */
export const CONFLICT_LAMP_ACTIVE_FRONT_MIN = 2;
export const CONFLICT_LAMP_EAST_ASIA_MIN = 2;
/** @deprecated 동아시아 통합 슬롯으로 대체 — 호환용 alias */
export const CONFLICT_LAMP_JAPAN_MIN = CONFLICT_LAMP_EAST_ASIA_MIN;
/** 지경학 등불 — shipping+energy 합산 상한 (초크 독점 방지) */
export const ECONOMY_LAMP_CHOKE_GENRE_MAX = 2;
/** 지경학 등불 — 중국 산업·미중 경제전쟁 soft 목표 (관심도 풀 안에서만) */
export const ECONOMY_LAMP_CHINA_INDUSTRY_MIN = 1;
/** 지경학 등불 — 한·일·대만 soft 목표 */
export const ECONOMY_LAMP_KR_JP_TW_MIN = 1;
/** 지경학 등불 — 동남아·남아시아·중동 soft 목표 */
export const ECONOMY_LAMP_ASEAN_SA_MENA_MIN = 1;
/** 지정학 등불 — 적대 행위자 한국 콕집힘 최대 슬롯 */
export const CONFLICT_LAMP_ADVERSARY_KOREA_MAX = 2;

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
  { id: "crrc", labelKo: "중국중차", labelEn: "CRRC", re: /\bcrrc\b|\b중국중차\b/i, bloc: "china" },
  { id: "longi", labelKo: "롱지", labelEn: "LONGi", re: /\blongi\b|\b롱지\b/i, bloc: "china" },
  { id: "nio", labelKo: "니오", labelEn: "NIO", re: /\bnio\b|\b니오\b/i, bloc: "china" },
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
  { id: "taiwan", labelKo: "대만", labelEn: "Taiwan", re: /\btaiwan\b|\btaipei\b|\b대만\b|\b타이베이\b/i, bloc: "asia" },
  { id: "tsmc", labelKo: "TSMC", labelEn: "TSMC", re: /\btsmc\b|\btaiwan semiconductor\b|\b대만반도체\b/i, bloc: "asia" },
  { id: "india", labelKo: "인도", labelEn: "India", re: /\bindia\b|\bindian\b|\bmodi\b|\bmumbai\b|\b인도\b|\b모디\b/i, bloc: "asia" },
  { id: "asean", labelKo: "아세안", labelEn: "ASEAN", re: /\basean\b|\bindonesia\b|\bvietnam\b|\bthailand\b|\bmalaysia\b|\bphilippines\b|\bsingapore\b|\b아세안\b|\b인도네시아\b|\b베트남\b/i, bloc: "asia" },
  { id: "aramco", labelKo: "아람코", labelEn: "Aramco", re: /\baramco\b|\b아람코\b/i, bloc: "other" },
  { id: "saudi", labelKo: "사우디", labelEn: "Saudi", re: /\bsaudi\b|\briyadh\b|\bvision\s?2030\b|\b사우디\b|\b리야드\b/i, bloc: "other" },
  { id: "adnoc", labelKo: "ADNOC", labelEn: "ADNOC", re: /\badnoc\b|\bu\.?a\.?e\.?\b|\bdubai\b|\babu\s?dhabi\b|\b아랍에미리트\b|\b두바이\b/i, bloc: "other" },
  { id: "imf", labelKo: "IMF", labelEn: "IMF", re: /\bimf\b|\binternational monetary fund\b/i, bloc: "other" },
  { id: "opec", labelKo: "OPEC", labelEn: "OPEC", re: /\bopec\b/i, bloc: "other" },
];

/** 미·중 경쟁·디리스킹 키워드 — 점수 가산 */
const US_CHINA_RIVALRY_RE =
  /us[\s-]?china|u\.?s\.?[\s-]?china|china[\s-]?us|trade war|export control|de-?risk|decoupl|rare earth|chip ban|tariff|entity\s?list|section\s?301|outbound\s?investment|제재|관세|미중|미·중|디리스킹|디커플링|희토류|수출통제|경제전쟁/i;

/** 중국 최신 산업·제조 발전 — 미중 경제전쟁 맥락의 공급측 신호 */
const CHINA_INDUSTRIAL_RE =
  /made\s?in\s?china(?:\s?2025)?|new\s?productive\s?forces|industrial\s?policy|advanced\s?manufacturing|smart\s?manufacturing|industrial\s?robot|factory\s?expansion|capacity\s?expansion|gigafactory|shipbuilding|photovoltaic|solar\s?(?:panel|export|capacity)|wind\s?power|high[\s-]?speed\s?rail|power\s?grid|semiconductor\s?self[\s-]?reliab|chip\s?self[\s-]?reliab|중국\s?제조|신질\s?생산력|산업정책|첨단\s?제조|스마트\s?팩토리|산업용\s?로봇|공장\s?증설|생산능력|조선|태양광|풍력|고속철|전력망|반도체\s?자립/i;

/** 한·일·대만 경제·지경학 */
const KR_JP_TW_ECON_RE =
  /south\s?korea|seoul|samsung|hynix|hyundai|bank\s?of\s?korea|japan|tokyo|toyota|softbank|sony|bank\s?of\s?japan|\byen\b|nikkei|taiwan|taipei|tsmc|mediatek|\bumc\b|한국|서울|삼성|하이닉스|현대|일본|도쿄|엔화|대만|타이베이/i;

/** 동남아·남아시아·중동 지경학 */
const ASEAN_SA_MENA_ECON_RE =
  /\basean\b|indonesia|vietnam|thailand|malaysia|philippines|singapore|malacca|friendshoring|nearshoring|\bindia\b|modi|\brbi\b|rupee|sensex|hambantota|bangladesh|pakistan|maldives|saudi|aramco|adnoc|qatar|u\.?a\.?e\.?|dubai|vision\s?2030|hormuz|red\s?sea|suez|bab[\s-]?el|아세안|인도네시아|베트남|인도|사우디|아람코|두바이|호르무즈|홍해|수에즈/i;

/** 지경학 등불 — 투자·거시 하드 신호 (넓은 타깃군) */
const ECONOMY_INVEST_RE =
  /\bfomc\b|\bfederal reserve\b|\brate\s?(?:cut|hike|decision|hold)\b|\binterest\s?rates?\b|\bcpi\b|\bpce\b|\binflation\b|\bearnings\b|\bguidance\b|\brevenue\b|\bipo\b|\bm\s?&\s?a\b|\bmerger\b|\bacquisition\b|\byield\b|\bs&p\b|\bnasdaq\b|\bdow\b|\bcapex\b|\bstock\s?buyback\b|\bdividend\b|\b연준\b|\b금리\b|\b기준금리\b|\b물가\b|\b실적\b|\b가이던스\b|\b인수\b|\b합병\b|\b증시\b|\b채권\b|\b수익률\b/i;

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
  if (theater === "korea" || theater === "japan" || theater === "south-asia" || theater === "southeast-asia") {
    return "asia";
  }
  if (theater === "middle-east") return "other";
  if (theater === "south-america" || theater === "africa") return "other";

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
    /\bkorea\b|\bkorean\b|\bjapan\b|\bjapanese\b|\btaiwan\b|\btaipei\b|\btsmc\b|\basean\b|\bindia\b|\bvietnam\b|\bindonesia\b|\bseoul\b|\btokyo\b|\b삼성\b|\b한국\b|\b일본\b|\b대만\b|\b인도\b|\b도쿄\b|\b서울\b/i.test(
      text,
    )
  ) {
    return "asia";
  }
  if (
    /\bsaudi\b|\bu\.?a\.?e\.?\b|\bdubai\b|\bqatar\b|\baramco\b|\badnoc\b|\biran\b|\bisrael\b|\bhormuz\b|\b사우디\b|\b두바이\b|\b카타르\b|\b이란\b|\b이스라엘\b|\b호르무즈\b/i.test(
      text,
    )
  ) {
    return "other";
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

/** 지경학 등불 — 지역 요약 라벨 (지정학 전장 라벨과 동일 축, 시장 톤) */
const ECONOMY_REGION_FOCUS_KO: Record<string, string> = {
  "middle-east": "중동",
  "russia-ukraine": "러·우 · 에너지",
  "china-taiwan": "미·중 · 아태",
  korea: "한반도",
  japan: "일본",
  "south-asia": "남아시아",
  "southeast-asia": "동남아",
  "south-america": "남미",
  africa: "아프리카",
  arctic: "북극",
  atlantic: "대서양",
  global: "글로벌",
};

const ECONOMY_REGION_FOCUS_EN: Record<string, string> = {
  "middle-east": "Middle East",
  "russia-ukraine": "Russia–Ukraine · energy",
  "china-taiwan": "US–China · Asia-Pacific",
  korea: "Korean Peninsula",
  japan: "Japan",
  "south-asia": "South Asia",
  "southeast-asia": "SE Asia",
  "south-america": "South America",
  africa: "Africa",
  arctic: "Arctic",
  atlantic: "Atlantic",
  global: "Global",
};

function economyRegionLabel(
  theater: string | undefined,
  lang: "ko" | "en",
): string | undefined {
  if (!theater) return undefined;
  const map = lang === "en" ? ECONOMY_REGION_FOCUS_EN : ECONOMY_REGION_FOCUS_KO;
  return map[theater];
}

function buildFocusLabel(
  text: string,
  genre: string | undefined,
  lang: "ko" | "en",
  theater?: string,
): string | undefined {
  const hits = matchedFocusEntities(text).slice(0, 2);
  const genreLabel =
    lang === "en" ? GENRE_FOCUS_EN[genre ?? ""] : GENRE_FOCUS_KO[genre ?? ""];
  const names = hits.map((h) => (lang === "en" ? h.labelEn : h.labelKo));
  const regionTag = economyRegionLabel(theater, lang);
  const koreaTag = mentionsSouthKorea(text)
    ? lang === "en"
      ? "Korea"
      : "한국"
    : null;
  const rivalry =
    US_CHINA_RIVALRY_RE.test(text) && (lang === "en" ? "US–China" : "미·중 경쟁");
  const chinaIndustry =
    isChinaIndustrialDevelopmentNews(text) &&
    (lang === "en" ? "China industry" : "중국 산업");
  const choke = chokepointFocusTag(text, lang);
  const chokeTag = choke
    ? lang === "en"
      ? `Chokepoint · ${choke}`
      : `초크 · ${choke}`
    : null;
  // 지정학과 같이 지역을 맨 앞에 — 사이드 집계·컬러 면 라벨용
  const parts = [
    koreaTag ?? regionTag,
    chokeTag || undefined,
    rivalry || undefined,
    chinaIndustry || undefined,
    ...names,
    genreLabel,
  ].filter(Boolean) as string[];
  if (parts.length === 0) return undefined;
  // koreaTag가 지역을 대체해도 theater가 있으면 중복 제거 후 지역 유지
  const deduped: string[] = [];
  for (const p of parts) {
    if (!deduped.includes(p)) deduped.push(p);
  }
  return deduped.join(" · ");
}

function deepenSummary(raw: string | undefined, title: string): string {
  let clean = (raw ?? "").replace(/\s+/g, " ").trim();
  const max = LAMP_DISPLAY_SUMMARY_MAX;
  const min = LAMP_DISPLAY_SUMMARY_MIN;
  const titleTrim = title.replace(/\s+/g, " ").trim();

  if (
    clean.length < min &&
    titleTrim.length > 0 &&
    !clean.toLowerCase().includes(titleTrim.toLowerCase().slice(0, 24))
  ) {
    clean = `${titleTrim}. ${clean}`.trim();
  }

  if (clean.length === 0) return titleTrim.slice(0, max);

  if (clean.length > max) {
    const sliced = clean.slice(0, max);
    const lastStop = Math.max(
      sliced.lastIndexOf("。"),
      sliced.lastIndexOf(". "),
      sliced.lastIndexOf("…"),
      sliced.lastIndexOf("! "),
      sliced.lastIndexOf("? "),
    );
    if (lastStop >= min) return sliced.slice(0, lastStop + 1).trim();
    return sliced.trim();
  }

  return clean;
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
  // RSS 본문 스니펫 길이로 심층도 추정 (등불 표시 길이와 무관) — 300자+ 가산
  const depthScore =
    summaryLen >= 700
      ? -32
      : summaryLen >= LAMP_DISPLAY_SUMMARY_MIN
        ? -22
        : summaryLen >= 200
          ? -6
          : summaryLen >= 80
            ? 0
            : 30;
  const thinPenalty = summaryLen < 40 ? 40 : 0;
  const rivalryBonus = US_CHINA_RIVALRY_RE.test(blob) ? -22 : 0;
  const chinaIndustryBonus = isChinaIndustrialDevelopmentNews(blob) ? -26 : 0;
  const regionalPeerBonus =
    KR_JP_TW_ECON_RE.test(blob) ? -18 : ASEAN_SA_MENA_ECON_RE.test(blob) ? -14 : 0;
  const opinionPenalty = isEconomyOpinionPiece(blob, item.publisher || item.source) ? 80 : 0;
  const hardBonus = isEconomyHardNews(blob, item.econGenre) ? -24 : 18;
  // 한국 soft — 비한국 강페널티 없음 (넓은 타깃)
  const koreaMention = mentionsSouthKorea(blob);
  const koreaBonus = koreaMention ? -12 : 0;
  const koreaCompanyBonus =
    entities.some((e) => e.id === "korea" || e.id === "samsung" || e.id === "skhynix" || e.id === "hyundai" || e.id === "bok")
      ? -14
      : 0;
  const investBonus =
    ECONOMY_INVEST_RE.test(blob) ||
    entities.some((e) => e.id === "fed" || e.id === "ecb" || e.id === "boj" || e.id === "bok" || e.id === "imf")
      ? -28
      : entities.length > 0
        ? -10
        : 0;
  const blocBonus =
    bloc === "asia"
      ? -8
      : bloc === "china"
        ? -8
        : bloc === "europe" || bloc === "russia"
          ? -4
          : bloc === "us"
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
  // news-stream hero 등급이 있으면 재사용 — 관심도 1순위
  const breakingBonus =
    typeof item.breakingGrade === "number"
      ? item.breakingGrade >= 8
        ? -40
        : item.breakingGrade >= 6
          ? -28
          : item.breakingGrade >= 4
            ? -14
            : 0
      : typeof item.urgencyScore === "number"
        ? Math.max(-32, -Math.round(item.urgencyScore / 4))
        : 0;
  // 등불은 대형 선명 사진 필수 — 점수 가산은 보조(풀에서 이미 필터)
  const imageBonus = hasLampPhoto(item.imageUrl) ? -50 : 80;
  // 물류·에너지 스트레스 사건 강력 우선
  const logisticsStressBonus =
    item.econGenre === "shipping" || item.econGenre === "energy" || isChokepointEconomyNews(blob)
      ? -42
      : isChokepointNews(blob)
        ? -28
        : 0;
  // 초크는 유지하되 투자 부스트보다 약하게 (chokepointScoreBonus 결과 축소)
  const chokeRaw = chokepointScoreBonus(blob, "economy");
  const chokeBonus = chokeRaw < 0 ? Math.max(chokeRaw, -12) : chokeRaw;
  const chokeGenreBonus =
    chokeBonus < 0 && (item.econGenre === "shipping" || item.econGenre === "energy")
      ? -4
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
      chinaIndustryBonus +
      regionalPeerBonus +
      opinionPenalty +
      hardBonus +
      koreaBonus +
      koreaCompanyBonus +
      investBonus +
      blocBonus +
      freshnessBonus +
      clusterBonus +
      breakingBonus +
      imageBonus +
      logisticsStressBonus +
      chokeBonus +
      chokeGenreBonus,
  };
}

function toFeatured(
  row: ScoredLampNews,
  lang: "ko" | "en",
): LampFeaturedNews {
  const item = row.item;
  const blob = `${item.title} ${item.summary ?? ""}`;
  const theater = item.theater?.trim() || undefined;
  return {
    id: item.id,
    title: item.title,
    summary: deepenSummary(item.summary, item.title),
    imageUrl: normalizeLampImageUrl(item.imageUrl),
    link: item.link,
    source: item.publisher || item.source,
    trustTier: item.trustTier,
    theater,
    econGenre: item.econGenre,
    focusLabel: buildFocusLabel(blob, item.econGenre, lang, theater),
  };
}

/**
 * 지경학 등불 — 물류·시장 충격 심층 + 대형 선명 사진 필수.
 */
export function pickEconomyLampNews(
  items: NewsPickInput[],
  limit = ECONOMY_LAMP_NEWS_MIN,
  lang: "ko" | "en" = "ko",
): LampFeaturedNews[] {
  const target = Math.max(limit, ECONOMY_LAMP_NEWS_MIN);
  // 사진 + 개별 원문 필수 · 지정학 전용 전장·오피니언 제외
  const pool = items.filter((item) => {
    if (!hasLampPhoto(item.imageUrl)) return false;
    if (!isArticleUrl(item.link)) return false;
    if (isGeopoliticsOnlyTheater(item.theater)) return false;
    const blob = `${item.title} ${item.summary ?? ""}`;
    if (isEconomyOpinionPiece(blob, item.publisher || item.source)) return false;
    return true;
  });

  const clusterMap = new Map<string, number>();
  for (const item of pool) {
    const key = item.clusterId || lampClusterKey(item.title);
    clusterMap.set(key, (clusterMap.get(key) ?? 0) + 1);
  }

  const scored = pool
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

  /** 관심도 상위 풀 — 할당은 이 안에서만 (약한 기사로 채우지 않음) */
  const interestPool = scored.slice(0, Math.max(target * 3, 18));

  const chokeGenreCount = (): number =>
    (genreCounts.get("shipping") ?? 0) + (genreCounts.get("energy") ?? 0);

  const tryPush = (row: ScoredLampNews, relax = false): boolean => {
    const item = row.item;
    if (!hasLampPhoto(item.imageUrl)) return false;
    if (!isArticleUrl(item.link)) return false;
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
    // RSS 스니펫 상한(220) 이후 — 과도한 본문 길이 가드는 카드 전량 탈락시킴
    if (summary.length < 40 && row.entities.length === 0 && item.trustTier > 1 && !relax) {
      return false;
    }

    const genre = item.econGenre ?? "markets";
    const gCount = genreCounts.get(genre) ?? 0;
    if (!relax && gCount >= 3) return false;
    if (
      !relax &&
      (genre === "shipping" || genre === "energy") &&
      chokeGenreCount() >= ECONOMY_LAMP_CHOKE_GENRE_MAX
    ) {
      return false;
    }

    seenLinks.add(key);
    seenClusters.add(cKey);
    if (primaryEntity) seenEntity.add(primaryEntity);
    genreCounts.set(genre, gCount + 1);
    out.push(toFeatured(row, lang));
    return true;
  };

  const softFill = (
    predicate: (row: ScoredLampNews) => boolean,
    already: (n: LampFeaturedNews) => boolean,
    min: number,
  ) => {
    let filled = out.filter(already).length;
    if (filled >= min) return;
    for (const row of interestPool) {
      if (out.length >= target || filled >= min) break;
      if (!predicate(row)) continue;
      if (tryPush(row)) filled += 1;
    }
  };

  const audience = scored.filter((row) =>
    isEconomyLampAudienceRelevant(
      `${row.item.title} ${row.item.summary ?? ""}`,
      row.entities,
      row.item.econGenre,
    ),
  );

  // 1) 관심도 상위 · 넓은 타깃군
  for (const row of audience) {
    if (out.length >= target) break;
    tryPush(row);
  }

  // 2) 나머지 점수순 하드뉴스
  if (out.length < target) {
    for (const row of scored) {
      if (out.length >= target) break;
      tryPush(row);
    }
  }

  // 3~6) soft 다양성 — 관심도 풀 안에서만 (부족해도 약한 기사로 억지 채움 금지)
  softFill(
    (row) => isChokepointEconomyNews(`${row.item.title} ${row.item.summary ?? ""}`),
    (n) => isChokepointNews(`${n.title} ${n.summary}`),
    ECONOMY_LAMP_CHOKE_MIN,
  );
  softFill(
    (row) => isChokepointNews(`${row.item.title} ${row.item.summary ?? ""}`),
    (n) => isChokepointNews(`${n.title} ${n.summary}`),
    ECONOMY_LAMP_CHOKE_MIN,
  );
  softFill(
    (row) => isChinaEconomyWarOrIndustryNews(`${row.item.title} ${row.item.summary ?? ""}`),
    (n) => isChinaEconomyWarOrIndustryNews(`${n.title} ${n.summary}`),
    ECONOMY_LAMP_CHINA_INDUSTRY_MIN,
  );
  softFill(
    (row) => KR_JP_TW_ECON_RE.test(`${row.item.title} ${row.item.summary ?? ""}`),
    (n) => KR_JP_TW_ECON_RE.test(`${n.title} ${n.summary}`),
    ECONOMY_LAMP_KR_JP_TW_MIN,
  );
  softFill(
    (row) => ASEAN_SA_MENA_ECON_RE.test(`${row.item.title} ${row.item.summary ?? ""}`),
    (n) => ASEAN_SA_MENA_ECON_RE.test(`${n.title} ${n.summary}`),
    ECONOMY_LAMP_ASEAN_SA_MENA_MIN,
  );

  // 7) 부족 시 점수순으로만 채움 (오피니언만 완화)
  if (out.length < target) {
    for (const row of scored) {
      if (out.length >= target) break;
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
  | "southeast-asia"
  | "south-america"
  | "africa"
  | "arctic"
  | "atlantic"
  | "global";

const APAC_CONFLICT_THEATERS: ConflictTheater[] = [
  "china-taiwan",
  "korea",
  "japan",
  "south-asia",
  "southeast-asia",
];

const GLOBAL_SOUTH_CONFLICT_THEATERS: ConflictTheater[] = [
  "south-america",
  "africa",
];

const ARCTIC_ATLANTIC_THEATERS: ConflictTheater[] = ["arctic", "atlantic"];

const THEATER_FOCUS_KO: Record<ConflictTheater, string> = {
  "middle-east": "중동",
  "russia-ukraine": "러·우",
  "china-taiwan": "미·중·아태",
  korea: "한반도",
  japan: "일본·인도태평양",
  "south-asia": "남아시아·인도양",
  "southeast-asia": "동남아·남중국해",
  "south-america": "남미 전선",
  africa: "아프리카 전선",
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
  "southeast-asia": "SE Asia · South China Sea",
  "south-america": "South America frontline",
  africa: "Africa frontline",
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
  /strike|missile|drone|airstrike|air.?raid|offensive|invasion|artillery|front.?line|ceasefire|sanction|deployment|exercise|nuclear|bombard|shelling|intercept|blockade|chokepoint|hormuz|suez|malacca|공습|미사일|드론|타격|공세|전선|휴전|제재|배치|핵|포격|봉쇄|호르무즈|수에즈|말라카/i;

/** 긴장도를 급격히 끌어올릴 수 있는 고충격 속보 */
const CONFLICT_TENSION_SPIKE_RE =
  /nuclear|warhead|hypersonic|invasion|massacre|genocide|escalat|red\s?line|carrier\s?strike|assassinate|tactical\s?nuke|핵탄두|침공|학살|확전|레드라인|항모타격|암살|전술핵/i;

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
  /warn(?:ed|s|ing)?|threat(?:en(?:ed|s|ing)?|s)?|criticiz(?:e|ed|es|ing)|condemn(?:ed|s|ing)?|slam(?:med|s)?|accus(?:e|ed|es|ing)|pressure|sanction(?:ed|s)?|rebuke|blast(?:ed)?|target(?:ed|s|ing)?|aim(?:ed|s)?\s+at|remark(?:s|ed)?|statement|foreign\s?ministr|spokeswoman|spokesperson|tilt(?:ing|s)?\s+toward|lean(?:ing|s)?\s+toward|nato[\s-]?bound|발언|겨냥|경고|비난|압박|비판|규탄|지적|언급|밝혔다|경고했|위협|도발|적대|강력\s?대응|엄중|항의|경도|나토/i;

/** 외부 행위자 ↔ 한국 근접 언급 */
const KOREA_FOREIGN_ACTOR_NEAR_RE =
  /(china|beijing|xi\s?jinping|pyongyang|north\s?korea|moscow|kremlin|putin|tokyo|japan|washington|white\s?house|pentagon|중국|베이징|시진핑|평양|북한|모스크바|크렘린|푸틴|도쿄|일본|워싱턴|백악관|국방부).{0,48}(south\s?korea|seoul|rok\b|한국|서울|대한민국|한미|한일|한중)|(south\s?korea|seoul|rok\b|한국|서울|대한민국|한미|한일|한중).{0,48}(china|beijing|pyongyang|north\s?korea|moscow|tokyo|japan|washington|중국|베이징|평양|북한|모스크바|도쿄|일본|워싱턴)/i;

/** 적대·비동맹 화자 — 한국 콕집힘 슬롯 */
const ADVERSARY_KOREA_SPEAKER_RE =
  /\brussia\b|\brussian\b|\bmoscow\b|\bkremlin\b|\bputin\b|\bchina\b|\bchinese\b|\bbeijing\b|\bxi\s?jinping\b|\bnorth\s?korea\b|\bdprk\b|\bpyongyang\b|\bkim\s?jong\b|\biran\b|\biranian\b|\btehran\b|\b러시아\b|\b모스크바\b|\b크렘린\b|\b푸틴\b|\b중국\b|\b베이징\b|\b시진핑\b|\b북한\b|\b평양\b|\b김정은\b|\b이란\b|\b테헤란\b/i;

/** 동맹 화자 — 콕집힘에서 동맹 주도 기사 판별에 사용 */
const ALLY_KOREA_SPEAKER_RE =
  /\bwashington\b|\bwhite\s?house\b|\bpentagon\b|\bunited\s?states\b|\bu\.?s\.?\b|\bjapan\b|\bjapanese\b|\btokyo\b|\baustralia\b|\bnato\b|\b한미\b|\b한일\b|\b미일\b|\b백악관\b|\b워싱턴\b|\b국방부\b|\b일본\b|\b도쿄\b|\b호주\b|\b나토\b/i;

/** 지경학 — 칼럼·사설·오피니언 배제 */
const ECONOMY_OPINION_RE =
  /\bop[\s-]?ed\b|\bopinion\b|\beditorial\b|\bcolumn(?:ist)?\b|\bcommentary\b|\bessay\b|\bperspective\b|\banalyst\s?view\b|\bguest\s?essay\b|칼럼|사설|논평|기고|오피니언|시론|해설\s?칼럼|외부\s?기고/i;

/** 지경학 — 기업·거시·지리경제 하드뉴스 */
const ECONOMY_HARD_NEWS_RE =
  /earnings|revenue|profit|guidance|gdp|inflation|cpi|ppi|interest\s?rate|policy\s?rate|tariff|sanction|export|import|trade\s?surplus|fdi|investment|m&a|merger|acquisition|supply\s?chain|semiconductor|chip|foundry|factory|plant|capex|bond|yield|won\b|oil|crude|brent|freight|shipping|lng|hormuz|suez|malacca|red\s?sea|industrial\s?policy|made\s?in\s?china|new\s?productive\s?forces|advanced\s?manufacturing|shipbuilding|photovoltaic|환율|실적|매출|영업이익|gdp|성장률|물가|금리|관세|제재|수출|수입|무역|투자|인수|합병|공급망|반도체|공장|설비투자|원화|환율|지정학\s?리스크|지리경제|geoeconom|유가|원유|운임|해운|호르무즈|수에즈|중국\s?제조|신질\s?생산력|산업정책|첨단\s?제조/i;

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

/**
 * 지정학 등불 — 적대 행위자가 한국을 콕 집는 경우만.
 * 동맹(미·일·호주·나토 우호) 단독 화자는 제외.
 */
function isAdversaryKoreaSingledOut(text: string): boolean {
  if (!mentionsSouthKorea(text)) return false;
  if (!ADVERSARY_KOREA_SPEAKER_RE.test(text)) return false;

  const adversaryNearKorea =
    /(russia|moscow|kremlin|putin|china|beijing|xi\s?jinping|north\s?korea|dprk|pyongyang|kim\s?jong|iran|tehran|러시아|모스크바|크렘린|푸틴|중국|베이징|시진핑|북한|평양|김정은|이란|테헤란).{0,96}(south\s?korea|seoul|rok\b|한국|서울|대한민국|한미|한일)|(south\s?korea|seoul|rok\b|한국|서울|대한민국).{0,96}(russia|moscow|kremlin|putin|china|beijing|north\s?korea|dprk|pyongyang|iran|tehran|러시아|모스크바|중국|베이징|북한|평양|이란|테헤란)/i.test(
      text,
    );
  const pressure = KOREA_TARGETED_SPEECH_RE.test(text);
  if (!adversaryNearKorea && !pressure) return false;

  // 한미·한일 동맹·정상 기사가 적대를 배경으로만 언급하는 경우 제외
  const allyLed =
    ALLY_KOREA_SPEAKER_RE.test(text) &&
    /\b(us[\s-]?rok|rok[\s-]?us|us[\s-]?south\s?korea|south\s?korea[\s-]?us|japan[\s-]?korea|korea[\s-]?japan|한미|한일).{0,48}(summit|alliance|joint\s?drill|extended\s?deterrence|정상|동맹|연합훈련|확장억제)|(summit|alliance|정상|동맹).{0,48}(us[\s-]?rok|한미|한일)/i.test(
      text,
    );
  if (allyLed && !adversaryNearKorea) return false;

  return adversaryNearKorea || (pressure && ADVERSARY_KOREA_SPEAKER_RE.test(text));
}

/** 지경학 등불 — 넓은 타깃군 (투자·거시·기업·미중·중국 산업·한국 soft) */
function isEconomyLampAudienceRelevant(
  text: string,
  entities: ReturnType<typeof matchedFocusEntities>,
  genre?: string,
): boolean {
  if (entities.length > 0) return true;
  if (ECONOMY_INVEST_RE.test(text)) return true;
  if (US_CHINA_RIVALRY_RE.test(text)) return true;
  if (isChinaIndustrialDevelopmentNews(text)) return true;
  if (KR_JP_TW_ECON_RE.test(text)) return true;
  if (ASEAN_SA_MENA_ECON_RE.test(text)) return true;
  if (mentionsSouthKorea(text)) return true;
  if (genre === "macro" || genre === "markets" || genre === "chips" || genre === "tech" || genre === "infra") {
    return isEconomyHardNews(text, genre);
  }
  return false;
}

function isChinaIndustrialDevelopmentNews(text: string): boolean {
  if (!/\bchina\b|\bchinese\b|\bbeijing\b|\b중국\b|\b베이징\b/i.test(text)) return false;
  if (CHINA_INDUSTRIAL_RE.test(text)) return true;
  // 중국 챔피언 + 생산·수출·설비 맥락
  return (
    /\b(huawei|alibaba|tencent|bytedance|smic|catl|byd|xiaomi|crrc|longi|nio|xpeng|li\s?auto|화웨이|알리바바|텐센트|샤오미)\b/i.test(
      text,
    ) &&
    /\b(factory|plant|production|export|capacity|manufactur|chip|ev\b|battery|solar|robot|AI|공장|생산|수출|설비|반도체|전기차|배터리|태양광|로봇)\b/i.test(
      text,
    )
  );
}

function isChinaEconomyWarOrIndustryNews(text: string): boolean {
  return US_CHINA_RIVALRY_RE.test(text) || isChinaIndustrialDevelopmentNews(text);
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
    theater === "southeast-asia" ||
    theater === "south-america" ||
    theater === "africa" ||
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
    /\bindia\b|\bpakistan\b|\bbangladesh\b|\bafghanistan\b|\btaliban\b|인도\b|아프간/i.test(text) &&
    /military|missile|border|navy|security|conflict|geopolit|defense|전쟁|미사일|국경|안보/i.test(
      text,
    )
  ) {
    return "south-asia";
  }
  // 동남아 — 미얀마·ASEAN·남중국해 (중국·대만 광역보다 먼저)
  if (
    /asean|vietnam|philippines?|indonesia|malaysia|myanmar|burma|tatmadaw|arakan|rakhine|scarborough|spratly|paracel|malacca|marawi|abu\s?sayyaf|동남아|베트남|필리핀|인도네시아|미얀마|말라카/i.test(
      text,
    ) &&
    /military|navy|militia|junta|rebel|missile|pla\b|coast\s?guard|confrontation|strike|war|군사|해군|민병|쿠데타|미사일/i.test(
      text,
    )
  ) {
    return "southeast-asia";
  }
  if (
    /venezuela|guyana|essequibo|colombia|farc|eln\b|maduro|latin\s?america|south\s?america|남미|베네수엘라|가이아나|콜롬비아/i.test(
      text,
    ) &&
    /military|militia|border|navy|missile|armed|clash|russia|iran|china|군사|민병|국경|해군/i.test(
      text,
    )
  ) {
    return "south-america";
  }
  if (
    /sahel|mali|niger|burkina|sudan|darfur|rsf\b|congo|drc\b|m23\b|somalia|al[\s-]?shabaab|libya|haftar|wagner|africa\s?corps|ethiopia|tigray|boko\s?haram|아프리카|사헬|말리|니제르|수단|콩고|소말리아|와그너/i.test(
      text,
    ) &&
    /military|militia|jihad|coup|rebel|war|drone|strike|offensive|군사|민병|쿠데타|반군|전쟁/i.test(
      text,
    )
  ) {
    return "africa";
  }
  if (
    /taiwan|pla\b|south\s?china\s?sea|west\s?philippine|scarborough|spratly|paracel|us[\s-]?china|china[\s-]?us|great\s?power\s?competition|first\s?island|second\s?island|guam|philippine\s?sea|대만|남중국해|미중|괌/i.test(
      text,
    )
  ) {
    return "china-taiwan";
  }
  if (
    /aukus|quad\b|indo[\s-]?pacific|okinawa|senkaku|kuril|northern\s?territor|self[\s-]?defense\s?force|\bsdf\b|인도태평양|오키나와|센카쿠|쿠릴|북방영토/i.test(
      text,
    )
  ) {
    return "japan";
  }
  if (isJapanGeopoliticsNews(text)) {
    return "japan";
  }
  // 중동 — 이집트·시나이·수에즈 포함 (레반트·이란·걸프·홍해)
  if (
    /iran|israel|gaza|palestine|west\s?bank|lebanon|hezbollah|syria|iraq|yemen|houthi|hamas|tehran|idf\b|irgc|egypt|cairo|suez|sinai|qatar|saudi|u\.?a\.?e\.?|dubai|hormuz|red\s?sea|bab[\s-]?el|persian\s?gulf|strait of hormuz|이란|이스라엘|가자|팔레스타인|레바논|헤즈볼라|시리아|이라크|예멘|후티|하마스|테헤란|이집트|카이로|수에즈|시나이|카타르|사우디|두바이|호르무즈|홍해|페르시아만/i.test(
      text,
    ) &&
    /military|missile|drone|strike|war|ceasefire|sanction|navy|blockade|militia|nuclear|airstrike|offensive|diplomacy|security|conflict|군대|군사|미사일|드론|타격|전쟁|휴전|제재|해군|봉쇄|핵|공습|안보|분쟁/i.test(
      text,
    )
  ) {
    return "middle-east";
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
      /taiwan|south\s?china\s?sea|indo[\s-]?pacific|aukus|north\s?korea|pyongyang|indian\s?ocean|asean|myanmar|venezuela|sahel|sudan|congo|arctic|high\s?north|northern\s?sea\s?route|giuk|north\s?atlantic|대만|남중국해|인도태평양|북한|인도양|동남아|미얀마|베네수엘라|사헬|수단|콩고|북극|북해항로|대서양|지유케이/i.test(
        blob,
      );
    return strongGeo ? inferred : feedTheater;
  }

  if (
    feedTheater === "global" ||
    APAC_CONFLICT_THEATERS.includes(feedTheater) ||
    GLOBAL_SOUTH_CONFLICT_THEATERS.includes(feedTheater) ||
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
  const koreaTag = isAdversaryKoreaSingledOut(text)
    ? lang === "en"
      ? "Adversary · Korea"
      : "적대 · 한국 지목"
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
  const choke = chokepointFocusTag(text, lang);
  const chokeTag = choke
    ? lang === "en"
      ? `Chokepoint · ${choke}`
      : `초크 · ${choke}`
    : null;
  const parts = [koreaTag ?? theaterLabel, chokeTag, ...actors];
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
  // 본문 스니펫으로 심층도 추정 — 300자+ 심층 우선
  const depthScore =
    summaryLen >= 700
      ? -34
      : summaryLen >= LAMP_DISPLAY_SUMMARY_MIN
        ? -24
        : summaryLen >= 200
          ? -8
          : summaryLen >= 80
            ? 4
            : 36;
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
  // 적대 콕집힘 soft만 — 비한국 강페널티·일반 한국 언급 대폭 가산 제거
  const adversaryKorea = isAdversaryKoreaSingledOut(blob);
  const koreaBonus = adversaryKorea ? -36 : mentionsSouthKorea(blob) ? -4 : 0;
  // 일본·인도태평양 — 지정학 하드만 가산 (내정·사회 탈락)
  const japanGeo = theater === "japan" && isJapanGeopoliticsNews(blob);
  const japanBonus = japanGeo ? -16 : theater === "japan" ? 40 : 0;
  // 아태·남아시아·북극·대서양을 중동·러우와 동급으로
  const theaterBonus =
    theater === "middle-east" ||
    theater === "russia-ukraine" ||
    theater === "china-taiwan" ||
    theater === "korea" ||
    theater === "japan" ||
    theater === "south-asia" ||
    theater === "southeast-asia" ||
    theater === "south-america" ||
    theater === "africa" ||
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
        ? -40
        : item.breakingGrade >= 6
          ? -28
          : item.breakingGrade >= 4
            ? -14
            : 0
      : typeof item.urgencyScore === "number"
        ? Math.max(-32, -Math.round(item.urgencyScore / 4))
        : 0;
  // 대형 선명 사진 필수 — 없으면 가혹 페널티(풀에서도 필터)
  const imageBonus = hasLampPhoto(item.imageUrl) ? -50 : 80;
  // 긴장 강도를 끌어올리는 무서운 군사·확전 속보 우선
  const tensionSpikeBonus = CONFLICT_TENSION_SPIKE_RE.test(blob)
    ? -45
    : CONFLICT_HARD_NEWS_RE.test(blob)
      ? -22
      : 0;
  // Tier3 단독·짧은 본문은 가혹하게
  const tier3Thin =
    item.trustTier === 3 && clusterSize < 2 && summaryLen < 300 ? 35 : 0;
  const chokeBonus = chokepointScoreBonus(blob, "conflict");

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
      japanBonus +
      theaterBonus +
      freshnessBonus +
      clusterBonus +
      breakingBonus +
      imageBonus +
      tensionSpikeBonus +
      tier3Thin +
      chokeBonus,
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
    ? `${actors.join("·")}과(와) ${theaterLabel} 일대입니다. 「왜 중요?」에서 맥락을 확인하십시오.`
    : `${theaterLabel}의 외교 신호입니다. 「왜 중요?」에서 맥락을 확인하십시오.`;
}

function toConflictFeatured(row: ScoredConflictNews, lang: "ko" | "en"): LampFeaturedNews {
  const item = row.item;
  const blob = `${item.title} ${item.summary ?? ""}`;
  const isDiplomacy = CONFLICT_DIPLOMACY_RE.test(blob);
  return {
    id: item.id,
    title: item.title,
    summary: deepenSummary(item.summary, item.title),
    imageUrl: normalizeLampImageUrl(item.imageUrl),
    link: item.link,
    source: item.publisher || item.source,
    trustTier: item.trustTier,
    theater: row.theater,
    focusLabel: buildConflictFocusLabel(blob, row.theater, lang),
    isDiplomacy,
    matterHook: buildMatterHook(blob, row.theater, isDiplomacy, lang),
  };
}

/**
 * 지정학 등불 — 긴장 강도·무서운 속보 심층 + 대형 선명 사진 필수.
 */
export function pickConflictLampNews(
  items: NewsPickInput[],
  limit = CONFLICT_LAMP_NEWS_MIN,
  lang: "ko" | "en" = "ko",
): LampFeaturedNews[] {
  const target = Math.max(limit, CONFLICT_LAMP_NEWS_MIN);
  const pool = items.filter(
    (item) => hasLampPhoto(item.imageUrl) && isArticleUrl(item.link),
  );

  const clusterMap = new Map<string, number>();
  for (const item of pool) {
    const key = item.clusterId || lampClusterKey(item.title);
    clusterMap.set(key, (clusterMap.get(key) ?? 0) + 1);
  }

  const scored = pool
    .map((item) => {
      const key = item.clusterId || lampClusterKey(item.title);
      return scoreConflictCandidate(item, clusterMap.get(key) ?? 1);
    })
    .sort((a, b) => a.score - b.score);

  const interestPool = scored.slice(0, Math.max(target * 3, 24));

  const out: LampFeaturedNews[] = [];
  const seenLinks = new Set<string>();
  const seenClusters = new Set<string>();
  let diplomacyCount = 0;
  let adversaryKoreaCount = 0;

  const tryPush = (row: ScoredConflictNews, relax = false): boolean => {
    const item = row.item;
    if (!hasLampPhoto(item.imageUrl)) return false;
    if (!isArticleUrl(item.link)) return false;
    const key = item.link || item.id;
    if (seenLinks.has(key)) return false;

    const cKey = item.clusterId || lampClusterKey(item.title);
    if (seenClusters.has(cKey) && !relax) return false;

    const bodyLen = (item.summary ?? "").trim().length;
    // RSS 스니펫 상한(~220)에 맞춤 — 예전 250·300자 가드는 거의 전량 탈락시킴
    if (!relax && bodyLen < 40 && item.trustTier > 1) return false;
    if (!relax && item.trustTier === 3 && row.clusterSize < 2 && bodyLen < 40) return false;

    const blob = `${item.title} ${item.summary ?? ""}`;
    if (!relax && CONFLICT_SOFT_NEWS_RE.test(blob)) return false;
    // 일본 전장 태그는 지정학 키워드만 (내정·사회 배제)
    if (!relax && row.theater === "japan" && !isJapanGeopoliticsNews(blob)) return false;

    const isDiplomacy = CONFLICT_DIPLOMACY_RE.test(blob);
    if (isDiplomacy && diplomacyCount >= CONFLICT_LAMP_DIPLOMACY_MAX && !relax) return false;

    seenLinks.add(key);
    seenClusters.add(cKey);
    if (isDiplomacy) diplomacyCount += 1;
    if (isAdversaryKoreaSingledOut(blob)) adversaryKoreaCount += 1;
    out.push(toConflictFeatured(row, lang));
    return true;
  };

  const softFill = (
    predicate: (row: ScoredConflictNews) => boolean,
    already: (n: LampFeaturedNews) => boolean,
    min: number,
    pool: ScoredConflictNews[] = interestPool,
  ) => {
    let filled = out.filter(already).length;
    if (filled >= min) return;
    for (const row of pool) {
      if (out.length >= target || filled >= min) break;
      if (!predicate(row)) continue;
      if (tryPush(row)) filled += 1;
    }
  };

  const isEastAsiaTheater = (t: ConflictTheater) =>
    t === "china-taiwan" || t === "korea" || t === "japan";

  const singledOut = scored.filter((row) =>
    isAdversaryKoreaSingledOut(`${row.item.title} ${row.item.summary ?? ""}`),
  );

  // 1) 적대 행위자 한국 콕집힘 — 최대 2슬롯
  for (const row of singledOut) {
    if (out.length >= target) break;
    if (adversaryKoreaCount >= CONFLICT_LAMP_ADVERSARY_KOREA_MAX) break;
    tryPush(row);
  }

  // 2) 활성 전선·동아시아 긴장권 선확보 (중동 = 러·우 = 동아시아 동등 비중)
  //    점수순 본체를 먼저 채우면 soft가 끼어들 자리가 없어 전선이 통째로 빠지던 문제 수정
  softFill(
    (row) => row.theater === "middle-east",
    (n) => n.theater === "middle-east",
    CONFLICT_LAMP_ACTIVE_FRONT_MIN,
    scored,
  );
  softFill(
    (row) => row.theater === "russia-ukraine",
    (n) => n.theater === "russia-ukraine",
    CONFLICT_LAMP_ACTIVE_FRONT_MIN,
    scored,
  );
  softFill(
    (row) =>
      isEastAsiaTheater(row.theater) &&
      (row.theater !== "japan" ||
        isJapanGeopoliticsNews(`${row.item.title} ${row.item.summary ?? ""}`)),
    (n) =>
      n.theater === "china-taiwan" ||
      n.theater === "korea" ||
      n.theater === "japan",
    CONFLICT_LAMP_EAST_ASIA_MIN,
    scored,
  );
  softFill(
    (row) => isChokepointSecurityNews(`${row.item.title} ${row.item.summary ?? ""}`),
    (n) => isChokepointSecurityNews(`${n.title} ${n.summary}`),
    CONFLICT_LAMP_CHOKE_MIN,
    scored,
  );

  // 3) 나머지 점수순 (관심도)
  if (out.length < target) {
    for (const row of scored) {
      if (out.length >= target) break;
      tryPush(row);
    }
  }

  // 4) 부족 시 relax
  if (out.length < target) {
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
 * 한글 UI일 때 등불 본문(제목·문단·뉴스 카드·거시표·GTI)을 최대한 한국어로 맞춤.
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
