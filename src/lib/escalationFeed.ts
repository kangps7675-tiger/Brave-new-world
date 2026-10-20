/**
 * 확전 신호 피드 — 뉴스 스트림에 판정을 붙이고 노출량을 조절한다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 별도 레이어가 필요한가
 * ══════════════════════════════════════════════════════════════════════
 *
 * `scoreEscalation()` 은 기사 하나를 판정한다. 하지만 제품에서는
 * **하루에 몇 번 보여줄 것인가**가 더 중요한 문제다.
 *
 * 확전 신호가 하루 20번 뜨면 사용자는 그걸 배경음으로 처리한다.
 * 그러면 정말 중요한 신호도 같이 묻힌다 — 경보 피로(alert fatigue).
 * 이 제품은 **조용한 게 기본값**이어야 한다.
 *
 * 그래서 여기서:
 *   · 같은 사건의 중복 보도를 하나로 접는다
 *   · 시간당·일당 노출 상한을 둔다
 *   · 점수 높은 것을 우선한다
 *   · 이미 보여준 건 다시 안 띄운다
 *
 * ⚠️ 상한에 걸려 잘린 신호도 **버리지 않고 목록에는 남긴다.**
 *    "지금은 조용하다"와 "우리가 안 보여줬다"는 다르다.
 */

import type { NewsTheater } from "@/lib/news/types";
import {
  ESCALATION_FLASH_THRESHOLD,
  scoreEscalation,
  type EscalationSignal,
} from "@/lib/escalationSignals";

export type EscalationFeedItem = {
  /** 기사 id — 중복 판정·이미 본 것 추적의 키 */
  id: string;
  title: string;
  link?: string;
  publisher?: string;
  pubDate?: string;
  signal: EscalationSignal;
  /** 상한에 걸려 화면에는 안 뜨지만 목록에는 남은 것 */
  suppressed: boolean;
  /** 같은 사건으로 접힌 중복 보도 수 */
  duplicates: number;
};

export type EscalationFeedInput = {
  id: string;
  title: string;
  summary?: string;
  link?: string;
  publisher?: string;
  pubDate?: string;
  theater?: NewsTheater;
};

export type EscalationFeedOptions = {
  /** 최근 활성 전장 — dailyRanks/GDELT 밀도에서 */
  hotTheaters?: NewsTheater[];
  /** 화면에 띄울 최대 개수 (기본 3) */
  maxVisible?: number;
  /** 이미 보여준 기사 id */
  seenIds?: ReadonlySet<string>;
  /** 기사 최대 나이(분). 오래된 건 신호로 안 띄운다 */
  maxAgeMinutes?: number;
};

/** 화면 동시 노출 상한 — 3개를 넘으면 사용자가 읽지 않는다 */
const DEFAULT_MAX_VISIBLE = 3;
/** 이보다 오래된 기사는 "신호"가 아니라 "기록"이다 */
const DEFAULT_MAX_AGE_MINUTES = 180;

function ageMinutes(pubDate?: string): number | null {
  if (!pubDate) return null;
  const t = Date.parse(pubDate);
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 60_000;
}

/**
 * 같은 사건인지 판정하는 지문.
 *
 * 같은 사건을 5개 매체가 보도하면 5번 띄우면 안 된다.
 * 패턴 + 넘은 임계선 + 관련 경계국/전장이 같으면 같은 사건으로 본다.
 *
 * ⚠️ 제목 유사도는 쓰지 않는다 — 번역·의역 때문에 신뢰할 수 없다.
 */
export function eventFingerprint(signal: EscalationSignal): string {
  return [
    signal.pattern,
    [...signal.thresholds].sort().join("+"),
    [...signal.perimeter.map((p) => p.iso2)].sort().join(","),
    [...signal.theaters].sort().join(","),
  ].join("|");
}

/**
 * 뉴스 배열 → 확전 신호 피드.
 *
 * 반환 순서: 점수 내림차순. `suppressed=false` 인 것만 화면에 띄운다.
 */
export function buildEscalationFeed(
  items: readonly EscalationFeedInput[],
  options: EscalationFeedOptions = {},
): EscalationFeedItem[] {
  const maxVisible = Math.max(1, options.maxVisible ?? DEFAULT_MAX_VISIBLE);
  const maxAge = options.maxAgeMinutes ?? DEFAULT_MAX_AGE_MINUTES;
  const seen = options.seenIds ?? new Set<string>();

  // ① 판정
  const scored: EscalationFeedItem[] = [];
  for (const item of items) {
    const age = ageMinutes(item.pubDate);
    if (age != null && age > maxAge) continue;

    const signal = scoreEscalation({
      title: item.title,
      summary: item.summary,
      theater: item.theater,
      hotTheaters: options.hotTheaters,
    });
    if (!signal) continue;

    scored.push({
      id: item.id,
      title: item.title,
      link: item.link,
      publisher: item.publisher,
      pubDate: item.pubDate,
      signal,
      suppressed: false,
      duplicates: 0,
    });
  }

  if (scored.length === 0) return [];

  // ② 점수 높은 순 — 잘릴 때 약한 게 먼저 잘리도록
  scored.sort((a, b) => {
    if (b.signal.score !== a.signal.score) return b.signal.score - a.signal.score;
    // 동점이면 최신 우선
    return String(b.pubDate ?? "").localeCompare(String(a.pubDate ?? ""));
  });

  // ③ 같은 사건 접기 — 대표는 점수가 가장 높은 것
  const byFingerprint = new Map<string, EscalationFeedItem>();
  for (const item of scored) {
    const fp = eventFingerprint(item.signal);
    const existing = byFingerprint.get(fp);
    if (existing) {
      existing.duplicates += 1;
      continue;
    }
    byFingerprint.set(fp, item);
  }
  const deduped = [...byFingerprint.values()];

  // ④ 노출 상한 — 이미 본 것은 자리를 차지하지 않는다
  let shown = 0;
  for (const item of deduped) {
    if (seen.has(item.id)) {
      item.suppressed = true;
      continue;
    }
    if (shown >= maxVisible) {
      item.suppressed = true;
      continue;
    }
    shown += 1;
  }

  return deduped;
}

/** 화면에 띄울 것만 */
export function visibleSignals(feed: readonly EscalationFeedItem[]): EscalationFeedItem[] {
  return feed.filter((f) => !f.suppressed);
}

/** 속보 타전·푸시 후보 — 가장 강한 하나만 */
export function flashCandidate(
  feed: readonly EscalationFeedItem[],
): EscalationFeedItem | null {
  const candidates = feed.filter(
    (f) => !f.suppressed && f.signal.score >= ESCALATION_FLASH_THRESHOLD,
  );
  return candidates[0] ?? null;
}

/**
 * 요약 — HUD 한 줄용.
 * 신호가 없으면 `null` 을 돌려준다. **조용한 게 기본값이다.**
 */
export function summarizeFeed(
  feed: readonly EscalationFeedItem[],
  lang: "ko" | "en" = "ko",
): string | null {
  const visible = visibleSignals(feed);
  if (visible.length === 0) return null;
  const top = visible[0]!;
  const head = lang === "ko" ? top.signal.headlineKo : top.signal.headlineEn;
  if (visible.length === 1) return head;
  return lang === "ko"
    ? `${head} 외 ${visible.length - 1}건`
    : `${head} +${visible.length - 1} more`;
}

/**
 * 상한에 걸려 숨긴 개수.
 * UI 에 "3건 더 있음" 을 표시해야 한다 —
 * 우리가 가린 것을 "아무 일 없음"으로 오독하게 하면 안 된다.
 */
export function suppressedCount(feed: readonly EscalationFeedItem[]): number {
  return feed.filter((f) => f.suppressed).length;
}
