"use client";

/**
 * 확전 신호 훅 — 뉴스 스트림에 판정을 붙여 배너 후보를 만든다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  설계 원칙
 * ══════════════════════════════════════════════════════════════════════
 *
 * **조용한 게 기본값이다.** 확전 신호가 하루 20번 뜨면 사용자는 배경음으로
 * 처리하고, 정말 중요한 신호도 같이 묻힌다(alert fatigue).
 *
 * 그래서:
 *   · 새 크롤러를 만들지 않는다 — 이미 들어온 뉴스에 판정만 붙인다
 *   · `escalationFeed` 가 중복 접기·상한·우선순위를 처리한다
 *   · 한 번 보여준 신호는 세션 동안 다시 안 뜬다
 *   · 억제된 신호도 목록에는 남긴다 (가린 것 ≠ 없는 것)
 *
 * ⚠️ 자동 fly-to 를 하지 않는다. 공습경보와 달리 확전 신호는
 *    "지금 대피하라"가 아니라 "이걸 읽어보라"이기 때문에,
 *    사용자가 보던 화면을 뺏으면 안 된다.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { NewsStreamItem, NewsTheater } from "@/lib/news/types";
import {
  buildEscalationFeed,
  suppressedCount,
  visibleSignals,
  type EscalationFeedItem,
} from "@/lib/escalationFeed";

export type EscalationOffer = {
  /** 화면에 띄울 최상위 신호 */
  top: EscalationFeedItem;
  /** 상한·기시청으로 가린 개수 — "N건 더" 표기용 */
  suppressed: number;
  /** 이번 판정에서 나온 전체 (패널 목록용) */
  all: EscalationFeedItem[];
};

type Options = {
  /** 뉴스 스트림 (이미 수집된 것 — 새로 긁지 않는다) */
  items: readonly NewsStreamItem[];
  /** 레이어 토글 — 꺼져 있으면 계산조차 안 한다 */
  enabled: boolean;
  /** 최근 활성 전장 — dailyRanks/GDELT 밀도에서 */
  hotTheaters?: NewsTheater[];
  /** 동시 노출 상한 (기본 3) */
  maxVisible?: number;
};

export function useEscalationSignals({
  items,
  enabled,
  hotTheaters,
  maxVisible,
}: Options) {
  // 세션 동안 이미 보여준 신호 — 같은 걸 반복해 띄우지 않는다
  const seenRef = useRef<Set<string>>(new Set());
  const [dismissedAt, setDismissedAt] = useState(0);

  const feed = useMemo(() => {
    // dismissedAt tick — 닫은 뒤 seen 반영 재계산을 강제한다
    void dismissedAt;
    if (!enabled || items.length === 0) return [];
    return buildEscalationFeed(
      items.map((n) => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        link: n.link,
        publisher: n.publisher ?? n.source,
        pubDate: n.pubDate,
        theater: n.theater,
      })),
      { hotTheaters, maxVisible, seenIds: seenRef.current },
    );
  }, [enabled, items, hotTheaters, maxVisible, dismissedAt]);

  const visible = useMemo(() => visibleSignals(feed), [feed]);

  const offer: EscalationOffer | null = useMemo(() => {
    const top = visible[0];
    if (!top) return null;
    return { top, suppressed: suppressedCount(feed), all: feed };
  }, [visible, feed]);

  /** 배너를 닫으면 그 신호는 세션 동안 다시 안 뜬다 */
  const dismiss = useCallback(() => {
    const top = visible[0];
    if (top) seenRef.current.add(top.id);
    setDismissedAt(Date.now());
  }, [visible]);

  /** 전부 닫기 — 지금 보이는 것 전부를 seen 처리 */
  const dismissAll = useCallback(() => {
    for (const v of visible) seenRef.current.add(v.id);
    setDismissedAt(Date.now());
  }, [visible]);

  return { offer, feed, visible, dismiss, dismissAll };
}
