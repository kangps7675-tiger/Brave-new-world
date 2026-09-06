/**
 * NATO 접경 UAV 경보 — 해당 사건 전용 뉴스 매칭.
 * 속보 = trustTier 1–2 오피셜 + 보호국 + 드론/영공 + 사진.
 */

import { NATO_PERIMETER_COUNTRY_META, type NatoPerimeterCrossEvent } from "@/lib/natoEasternPerimeter";
import { hasLampPhoto } from "@/lib/news/lampThumbnail";
import type { NewsStreamItem } from "@/lib/news/types";

const UAV_AIRSPACE_RE =
  /\b(uav|drone|shahed|geran|unmanned|airspace|air\s?space|incursion|violation|intercept)\b|드론|무인기|샤헤드|영공|월경|침범|요격/i;

const FRONTLINE_ONLY_RE =
  /\b(donetsk|luhansk|kharkiv|zaporizh|kherson|bakhmut|avdiivka|pokrovsk|front\s?line|frontline)\b|도네츠크|루한스크|하르키우|자포리자|헤르손|바흐무트|전선/i;

export type PerimeterNewsMatch = {
  item: NewsStreamItem;
  score: number;
};

export function countryMentionRe(cross: NatoPerimeterCrossEvent): RegExp {
  const meta = NATO_PERIMETER_COUNTRY_META[cross.isoA3];
  const parts = [meta.nameEn, meta.nameKo, meta.iso2, cross.isoA3];
  if (cross.isoA3 === "LTU" || cross.isoA3 === "POL") {
    parts.push("kaliningrad", "칼리닌그라드", "suwalki", "수바우키");
  }
  const escaped = parts
    .filter(Boolean)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(?:${escaped.join("|")})`, "i");
}

export function isOfficialPerimeterStory(item: Pick<NewsStreamItem, "trustTier">): boolean {
  return item.trustTier <= 2;
}

/**
 * 해당 월경 사건만 — 일반 우크라 전선·다른 국가 드론·무사진·tier3 탈락.
 */
export function matchPerimeterDroneStory(
  item: NewsStreamItem,
  cross: NatoPerimeterCrossEvent,
  opts?: { requirePhoto?: boolean; maxAgeMinutes?: number },
): PerimeterNewsMatch | null {
  if (!isOfficialPerimeterStory(item)) return null;

  const requirePhoto = opts?.requirePhoto !== false;
  if (requirePhoto && !hasLampPhoto(item.imageUrl)) return null;

  const text = `${item.title} ${item.summary ?? ""}`;
  if (!UAV_AIRSPACE_RE.test(text)) return null;

  const countryRe = countryMentionRe(cross);
  if (!countryRe.test(text)) return null;

  // 보호국 언급 없이 전선만 다루는 기사 탈락은 위에서 country로 걸러짐.
  // 보호국+전선이 함께 있어도 드론/영공이 있으면 통과; 전선만이면 이미 UAV_RE 탈락.
  if (FRONTLINE_ONLY_RE.test(text) && !countryRe.test(item.title)) {
    // 제목에 보호국이 없고 본문만 약하면 감점 후 탈락 가능 — 제목 우선
    if (!countryRe.test(item.title) && !UAV_AIRSPACE_RE.test(item.title)) {
      return null;
    }
  }

  const maxAge = opts?.maxAgeMinutes ?? 180;
  const pubMs = Date.parse(item.pubDate);
  if (Number.isFinite(pubMs)) {
    const ageMin = (Date.now() - pubMs) / 60_000;
    if (ageMin > maxAge || ageMin < -30) return null;
  }

  let score = 40;
  if (item.trustTier === 1) score += 25;
  else score += 12;
  if (UAV_AIRSPACE_RE.test(item.title)) score += 20;
  if (countryRe.test(item.title)) score += 20;
  if (hasLampPhoto(item.imageUrl)) score += 15;

  return { item, score };
}

export function pickBestPerimeterDroneStory(
  items: NewsStreamItem[],
  cross: NatoPerimeterCrossEvent,
  opts?: { requirePhoto?: boolean; maxAgeMinutes?: number },
): NewsStreamItem | null {
  let best: PerimeterNewsMatch | null = null;
  for (const item of items) {
    const m = matchPerimeterDroneStory(item, cross, opts);
    if (!m) continue;
    if (!best || m.score > best.score) best = m;
  }
  return best?.item ?? null;
}

export function collectNewsStreamItems(payload: {
  verified?: NewsStreamItem[];
  stateMedia?: NewsStreamItem[];
  hero?: NewsStreamItem | null;
  flashHeroes?: NewsStreamItem[];
}): NewsStreamItem[] {
  const out: NewsStreamItem[] = [];
  const seen = new Set<string>();
  const push = (item: NewsStreamItem | null | undefined) => {
    if (!item?.id || seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  };
  push(payload.hero ?? null);
  for (const h of payload.flashHeroes ?? []) push(h);
  for (const v of payload.verified ?? []) push(v);
  // stateMedia(tier3)는 속보 아님 — 수집만 하되 매칭에서 trustTier로 탈락
  for (const s of payload.stateMedia ?? []) push(s);
  return out;
}
