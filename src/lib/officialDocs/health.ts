/**
 * 공식 문서 수집원의 건강 상태. 사이트가 구조를 바꾸거나 서버를 막아도 수집은 에러 없이 0건이 되기 쉬워서,
 * 마지막 수집 결과(official_doc_poll)와 실제로 쌓인 문서(official_doc_feed)를 겹쳐 "조용히 죽은" 소스를 가려낸다.
 * DB 칸을 새로 만들지 않고 이미 있는 두 표만으로 계산한다.
 */

export type FeedHealth = "ok" | "failed" | "empty" | "quiet" | "unchecked";

export type PollInfo = { ok: number; items: number; error: string | null; checkedAt: string };
export type StoredInfo = { count: number; newestPublishedAt: string | null };

/** 이 일수 동안 새 문서가 하나도 없으면 "조용함"으로 본다(수집은 되는데 사이트가 바뀌어 새 글을 못 읽는 경우를 의심) */
export const QUIET_DAYS = 30;

export function feedHealth(poll: PollInfo | undefined, stored: StoredInfo | undefined, now: Date = new Date(), quietDays = QUIET_DAYS): FeedHealth {
  if (!poll) return "unchecked";
  if (poll.ok !== 1) return "failed";
  if (!stored || stored.count === 0) return "empty";
  if (stored.newestPublishedAt) {
    const age = (now.getTime() - Date.parse(stored.newestPublishedAt)) / 86_400_000;
    if (Number.isFinite(age) && age > quietDays) return "quiet";
  }
  return "ok";
}

export const HEALTH_LABEL: Record<FeedHealth, string> = {
  ok: "정상",
  failed: "수집 실패(막혔거나 구조가 바뀜)",
  empty: "수집은 되는데 저장된 문서가 0건(필터가 다 걸렀거나 읽기 오류)",
  quiet: `${QUIET_DAYS}일 넘게 새 문서 없음(사이트가 바뀌었을 수 있음)`,
  unchecked: "아직 수집 기록 없음",
};

export type FeedStatusRow = {
  feed: string;
  health: FeedHealth;
  reason: string;
  checkedAt: string | null;
  error: string | null;
  stored: number;
  newestPublishedAt: string | null;
};

export function buildFeedStatus(
  polls: ReadonlyArray<PollInfo & { feed: string }>,
  stored: ReadonlyArray<StoredInfo & { feed: string }>,
  now: Date = new Date(),
): { feeds: FeedStatusRow[]; counts: Record<FeedHealth, number>; needsAttention: FeedStatusRow[] } {
  const pollBy = new Map(polls.map((p) => [p.feed, p]));
  const storedBy = new Map(stored.map((s) => [s.feed, s]));
  const names = [...new Set([...pollBy.keys(), ...storedBy.keys()])];
  const feeds: FeedStatusRow[] = names.map((feed) => {
    const p = pollBy.get(feed);
    const s = storedBy.get(feed);
    const health = feedHealth(p, s, now);
    return {
      feed,
      health,
      reason: HEALTH_LABEL[health],
      checkedAt: p?.checkedAt ?? null,
      error: p?.error ?? null,
      stored: s?.count ?? 0,
      newestPublishedAt: s?.newestPublishedAt ?? null,
    };
  });
  const counts: Record<FeedHealth, number> = { ok: 0, failed: 0, empty: 0, quiet: 0, unchecked: 0 };
  for (const f of feeds) counts[f.health] += 1;
  const order: FeedHealth[] = ["failed", "empty", "quiet", "unchecked", "ok"];
  feeds.sort((a, b) => order.indexOf(a.health) - order.indexOf(b.health) || a.feed.localeCompare(b.feed));
  return { feeds, counts, needsAttention: feeds.filter((f) => f.health !== "ok") };
}
