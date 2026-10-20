/**
 * 슬롯 C — 우측 서랍장(피드 탭) 규칙.
 *
 * - 이름표(탭)는 항상 보인다. 내용은 누른 서랍 하나만 펼쳐진다.
 * - 새 소식은 이름표에 점만. 자동으로 펼치지 않는다.
 * - 지금 서랍은 하나뿐 — 선박 사건이 아닌 일반 liveuamap 전선 소식("전선 속보").
 *   선박 사건(UKMTO·내 케이스·해역 안 선박 속보)은 서랍이 아니라 사건 스택(슬롯 A)이 맡는다.
 *
 * @see docs/right-rail-triage-2026-10-17.md
 */

export type FeedTabId = "front";

export type FeedTabDef = {
  id: FeedTabId;
  ko: string;
  en: string;
};

/** 서랍 순서 = 화면 위→아래 순서 */
export const FEED_TABS: readonly FeedTabDef[] = [
  { id: "front", ko: "전선 속보", en: "Front news" },
];

/** 이름표를 눌렀을 때 다음에 열릴 서랍. 열린 걸 다시 누르면 닫힌다. */
export function nextOpenTab(current: FeedTabId | null, clicked: FeedTabId): FeedTabId | null {
  return current === clicked ? null : clicked;
}

/**
 * 점 표시 여부. sig = 지금 피드 내용의 지문, seen = 마지막으로 열었을 때의 지문.
 * 처음 보는 피드(seen 없음)도 내용이 있으면 점을 찍는다.
 */
export function hasUnread(sig: string | null, seen: string | undefined): boolean {
  if (!sig) return false;
  return sig !== seen;
}
