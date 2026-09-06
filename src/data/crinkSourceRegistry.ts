/**
 * CRINK 허브 전문 소스 SSOT.
 * feedCatalog / referenceMonitor / mediaTiers / thumb 차단이 여기를 읽는다.
 *
 * 텍스트: 제목·짧은 요약·원문 링크만. 본문·위성 원본·전선 타일 재전시 금지.
 * 이미지: never-source-asset — 기관 og/enclosure를 카드 메인으로 쓰지 않음.
 */

import type { AxisHubId } from "@/data/axisNetwork";
import type { NewsTheater } from "@/lib/news/types";

export type CrinkSourceRole =
  | "primary"
  | "secondary"
  | "counterLens"
  | "outboundOnly";

export type CrinkIngestKind = "rss" | "google-site" | "outbound";

export type CrinkSourceDef = {
  id: string;
  label: string;
  labelKo: string;
  hub: AxisHubId;
  role: CrinkSourceRole;
  /** 허브 모니터(분석) vs 전장 속보 보조 */
  stream: "hub-monitor" | "theater-news";
  ingest: CrinkIngestKind;
  /** RSS URL 또는 Google News q= 용 site 쿼리 */
  feedUrl?: string;
  googleQuery?: string;
  homepage: string;
  /** og/enclosure 차단용 호스트 (소문자, www 없이) */
  blockHosts: string[];
  imagePolicy: "never-source-asset";
  commercialUse: "unknown" | "license-required";
  commercialNote: string;
  /** mediaTiers 매칭용 키워드 */
  tierNeedles: string[];
  /** counterLens / outbound 안내 */
  note?: string;
};

const G = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

export const CRINK_SOURCES: CrinkSourceDef[] = [
  // ── PRK ──────────────────────────────────────────────
  {
    id: "38-north",
    label: "38 North",
    labelKo: "38 노스",
    hub: "PRK",
    role: "primary",
    stream: "hub-monitor",
    ingest: "rss",
    feedUrl: "https://www.38north.org/feed/",
    homepage: "https://www.38north.org/",
    blockHosts: ["38north.org"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "Stimson 38 North — RSS 제목·요약·링크 인용만. 위성 그래픽 재전시 금지.",
    tierNeedles: ["38 north", "38north"],
  },
  {
    id: "csis-beyond-parallel",
    label: "CSIS Beyond Parallel",
    labelKo: "CSIS 비욘드 패럴렐",
    hub: "PRK",
    role: "secondary",
    stream: "hub-monitor",
    ingest: "rss",
    feedUrl: "https://beyondparallel.csis.org/feed/",
    homepage: "https://beyondparallel.csis.org/",
    blockHosts: ["beyondparallel.csis.org", "csis.org"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "CSIS Beyond Parallel — RSS 인용 범위 확인 필요. 위성 자산 재전시 금지.",
    tierNeedles: ["beyond parallel", "csis"],
  },
  {
    id: "nk-news",
    label: "NK News",
    labelKo: "NK 뉴스",
    hub: "PRK",
    role: "secondary",
    stream: "theater-news",
    ingest: "google-site",
    googleQuery: 'site:nknews.org (missile OR nuclear OR Kim OR Pyongyang OR satellite)',
    feedUrl: G('site:nknews.org (missile OR nuclear OR Kim OR Pyongyang OR satellite)'),
    homepage: "https://www.nknews.org/",
    blockHosts: ["nknews.org", "nkpro.org"],
    imagePolicy: "never-source-asset",
    commercialUse: "license-required",
    commercialNote: "NK News/NK Pro — 무료 헤드라인·사이트 검색만. Pro 유료 본문 수집 금지.",
    tierNeedles: ["nk news", "nknews", "nk pro"],
  },
  // ── CHN ──────────────────────────────────────────────
  {
    id: "amti",
    label: "AMTI (CSIS)",
    labelKo: "AMTI",
    hub: "CHN",
    role: "primary",
    stream: "hub-monitor",
    ingest: "rss",
    feedUrl: "https://amti.csis.org/feed/",
    homepage: "https://amti.csis.org/",
    blockHosts: ["amti.csis.org", "csis.org"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "CSIS AMTI — RSS 인용만. 섬 군사기지화 위성 원본 재전시 금지.",
    tierNeedles: ["amti", "asia maritime transparency"],
  },
  {
    id: "chinapower",
    label: "ChinaPower (CSIS)",
    labelKo: "차이나파워",
    hub: "CHN",
    role: "primary",
    stream: "hub-monitor",
    ingest: "google-site",
    googleQuery: "site:chinapower.csis.org (PLA OR Taiwan OR military OR South China Sea)",
    feedUrl: G("site:chinapower.csis.org (PLA OR Taiwan OR military OR South China Sea)"),
    homepage: "https://chinapower.csis.org/",
    blockHosts: ["chinapower.csis.org", "csis.org"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "CSIS ChinaPower — 제목·링크 인용. 차트·그래픽 재호스팅 금지.",
    tierNeedles: ["chinapower", "china power"],
  },
  {
    id: "jamestown-china-brief",
    label: "Jamestown China Brief",
    labelKo: "제임스톤 차이나 브리프",
    hub: "CHN",
    role: "secondary",
    stream: "hub-monitor",
    ingest: "google-site",
    googleQuery: 'site:jamestown.org "China Brief" (PLA OR Taiwan OR military)',
    feedUrl: G('site:jamestown.org "China Brief" (PLA OR Taiwan OR military)'),
    homepage: "https://jamestown.org/",
    blockHosts: ["jamestown.org"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "Jamestown — RSS/사이트 검색 인용만.",
    tierNeedles: ["jamestown", "china brief"],
  },
  {
    id: "aspi-pressure-points",
    label: "ASPI Pressure Points",
    labelKo: "ASPI 프레셔 포인트",
    hub: "CHN",
    role: "secondary",
    stream: "hub-monitor",
    ingest: "google-site",
    googleQuery: 'site:aspi.org.au (PLA OR "South China Sea" OR coercion OR Taiwan)',
    feedUrl: G('site:aspi.org.au (PLA OR "South China Sea" OR coercion OR Taiwan)'),
    homepage: "https://www.aspi.org.au/",
    blockHosts: ["aspi.org.au"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "ASPI — 오픈소스 DB 링크 인용. 원본 데이터셋 무단 미러 금지.",
    tierNeedles: ["aspi", "pressure points"],
  },
  {
    id: "scspi",
    label: "SCSPI (PKU)",
    labelKo: "SCSPI",
    hub: "CHN",
    role: "counterLens",
    stream: "hub-monitor",
    ingest: "outbound",
    homepage: "https://www.scspi.org/",
    blockHosts: ["scspi.org"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "북경대 관변 성격 — 1차 카드 제외, 반대편 렌즈 링크만.",
    tierNeedles: ["scspi"],
    note: "counter-lens only",
  },
  // ── RUS ──────────────────────────────────────────────
  {
    id: "isw-ukraine",
    label: "ISW",
    labelKo: "ISW",
    hub: "RUS",
    role: "primary",
    stream: "hub-monitor",
    ingest: "google-site",
    googleQuery: "site:understandingwar.org Ukraine",
    feedUrl: G("site:understandingwar.org Ukraine"),
    homepage: "https://www.understandingwar.org/",
    blockHosts: ["understandingwar.org"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "ISW — 제목·링크 인용. 전선 맵·그래픽 재전시 금지.",
    tierNeedles: ["isw", "institute for the study of war", "understandingwar"],
  },
  {
    id: "oryx",
    label: "Oryx",
    labelKo: "오릭스",
    hub: "RUS",
    role: "secondary",
    stream: "theater-news",
    ingest: "rss",
    feedUrl: "https://www.oryxspioenkop.com/feeds/posts/default",
    homepage: "https://www.oryxspioenkop.com/",
    blockHosts: ["oryxspioenkop.com"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "Oryx — 장비 손실 트래킹 링크. 원본 사진 재호스팅 금지.",
    tierNeedles: ["oryx"],
  },
  {
    id: "mediazona",
    label: "Mediazona",
    labelKo: "메디아조나",
    hub: "RUS",
    role: "secondary",
    stream: "theater-news",
    ingest: "rss",
    feedUrl: "https://zona.media/rss",
    homepage: "https://zona.media/",
    blockHosts: ["zona.media"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "Mediazona — RSS 인용. 전사자 명단 원본 재배포 금지.",
    tierNeedles: ["mediazona", "zona.media"],
  },
  {
    id: "russia-matters",
    label: "Russia Matters",
    labelKo: "러시아 매터스",
    hub: "RUS",
    role: "secondary",
    stream: "hub-monitor",
    ingest: "google-site",
    googleQuery: 'site:russiamatters.org (Ukraine OR ISW OR DeepState OR frontline)',
    feedUrl: G('site:russiamatters.org (Ukraine OR ISW OR DeepState OR frontline)'),
    homepage: "https://www.russiamatters.org/",
    blockHosts: ["russiamatters.org"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "Harvard Belfer Russia Matters — 주간 비교 리포트 링크.",
    tierNeedles: ["russia matters", "russiamatters"],
  },
  {
    id: "deepstate-map",
    label: "DeepState Map",
    labelKo: "딥스테이트 맵",
    hub: "RUS",
    role: "outboundOnly",
    stream: "hub-monitor",
    ingest: "outbound",
    homepage: "https://deepstatemap.live/",
    blockHosts: ["deepstatemap.live"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "전선 타일 미러 금지 — 아웃바운드 칩만.",
    tierNeedles: ["deepstate"],
    note: "outbound link chip only — no tile scrape",
  },
  // ── IRN ──────────────────────────────────────────────
  {
    id: "critical-threats",
    label: "Critical Threats",
    labelKo: "크리티컬 쓰레츠",
    hub: "IRN",
    role: "primary",
    stream: "hub-monitor",
    ingest: "google-site",
    googleQuery: 'site:criticalthreats.org (Iran OR IRGC OR "Iran Update")',
    feedUrl: G('site:criticalthreats.org (Iran OR IRGC OR "Iran Update")'),
    homepage: "https://www.criticalthreats.org/",
    blockHosts: ["criticalthreats.org"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "AEI CTP — Iran Update 제목·링크. 지도·그래픽 재전시 금지.",
    tierNeedles: ["critical threats", "criticalthreats"],
  },
  {
    id: "isis-wisconsin",
    label: "ISIS (Wisconsin Project)",
    labelKo: "ISIS(위스콘신 프로젝트)",
    hub: "IRN",
    role: "secondary",
    stream: "hub-monitor",
    ingest: "google-site",
    googleQuery: "site:isis-online.org (Iran OR Natanz OR Fordow OR enrichment OR centrifuge)",
    feedUrl: G("site:isis-online.org (Iran OR Natanz OR Fordow OR enrichment OR centrifuge)"),
    homepage: "https://isis-online.org/",
    blockHosts: ["isis-online.org"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "Institute for Science and International Security — 핵시설 분석 링크. IS(이슬람국가)와 별개.",
    tierNeedles: ["isis-online", "isis wisconsin", "wisconsin project"],
  },
  {
    id: "washington-institute",
    label: "Washington Institute",
    labelKo: "워싱턴 연구소",
    hub: "IRN",
    role: "secondary",
    stream: "hub-monitor",
    ingest: "google-site",
    googleQuery: "site:washingtoninstitute.org (Iran OR IRGC OR proxy OR Hezbollah)",
    feedUrl: G("site:washingtoninstitute.org (Iran OR IRGC OR proxy OR Hezbollah)"),
    homepage: "https://www.washingtoninstitute.org/",
    blockHosts: ["washingtoninstitute.org"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "TWI — 정책 분석 링크 인용.",
    tierNeedles: ["washington institute", "washingtoninstitute"],
  },
  {
    id: "iran-international",
    label: "Iran International",
    labelKo: "이란 인터내셔널",
    hub: "IRN",
    role: "secondary",
    stream: "theater-news",
    ingest: "rss",
    feedUrl: "https://www.iranintl.com/en/rss",
    homepage: "https://www.iranintl.com/",
    blockHosts: ["iranintl.com"],
    imagePolicy: "never-source-asset",
    commercialUse: "unknown",
    commercialNote: "반체제 성향 페르시아어권 뉴스 — Tier2·편향 라벨. RSS 헤드라인만.",
    tierNeedles: ["iran international", "iranintl"],
  },
];

export function crinkSourcesForHub(hub: AxisHubId): CrinkSourceDef[] {
  return CRINK_SOURCES.filter((s) => s.hub === hub);
}

export function crinkHubMonitorSources(): CrinkSourceDef[] {
  return CRINK_SOURCES.filter(
    (s) => s.stream === "hub-monitor" && s.ingest !== "outbound" && s.role !== "counterLens",
  );
}

export function crinkTheaterNewsSources(): CrinkSourceDef[] {
  return CRINK_SOURCES.filter((s) => s.stream === "theater-news" && s.ingest !== "outbound");
}

export function crinkOutboundChips(hub: AxisHubId): CrinkSourceDef[] {
  return CRINK_SOURCES.filter(
    (s) => s.hub === hub && (s.role === "outboundOnly" || s.role === "counterLens"),
  );
}

export function crinkSourceById(id: string): CrinkSourceDef | undefined {
  return CRINK_SOURCES.find((s) => s.id === id);
}

/** og/enclosure 차단 호스트 집합 (www 제거·소문자) */
export function crinkBlockedImageHosts(): Set<string> {
  const set = new Set<string>();
  for (const s of CRINK_SOURCES) {
    for (const h of s.blockHosts) {
      set.add(h.replace(/^www\./, "").toLowerCase());
    }
  }
  // 공통 CSIS / ISW
  set.add("csis.org");
  set.add("understandingwar.org");
  set.add("38north.org");
  return set;
}

export function isCrinkBlockedImageHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  const blocked = crinkBlockedImageHosts();
  if (blocked.has(host)) return true;
  for (const b of blocked) {
    if (host === b || host.endsWith(`.${b}`)) return true;
  }
  return false;
}

export function isCrinkAnalysisUrl(url: string): boolean {
  try {
    return isCrinkBlockedImageHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

export const HUB_TO_THEATER: Record<AxisHubId, NewsTheater> = {
  PRK: "korea",
  CHN: "china-taiwan",
  RUS: "russia-ukraine",
  IRN: "middle-east",
};

export const THEATER_TO_HUB: Partial<Record<NewsTheater, AxisHubId>> = {
  korea: "PRK",
  "china-taiwan": "CHN",
  "russia-ukraine": "RUS",
  "middle-east": "IRN",
};

export const HUB_TOPIC_FOR_API: Record<AxisHubId, string[]> = {
  PRK: ["dprk", "nuclear-facility", "missile-test", "hub:PRK"],
  CHN: ["china", "naval", "plarf", "hub:CHN"],
  RUS: ["russia", "hub:RUS"],
  IRN: ["iran", "nuclear-facility", "hub:IRN"],
};
