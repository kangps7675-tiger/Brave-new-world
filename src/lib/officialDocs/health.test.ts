import { describe, expect, it } from "vitest";
import { buildFeedStatus, feedHealth } from "./health";

const NOW = new Date("2026-11-12T12:00:00Z");
const poll = (ok: number) => ({ ok, items: 5, error: ok ? null : "HTTP 403", checkedAt: "2026-11-12T11:30:00Z" });

describe("공식 문서 수집원 건강 상태", () => {
  it("수집 기록이 없으면 unchecked, 실패면 failed", () => {
    expect(feedHealth(undefined, undefined, NOW)).toBe("unchecked");
    expect(feedHealth(poll(0), { count: 10, newestPublishedAt: "2026-11-11" }, NOW)).toBe("failed");
  });

  it("성공했는데 저장된 문서가 0건이면 empty", () => {
    expect(feedHealth(poll(1), undefined, NOW)).toBe("empty");
    expect(feedHealth(poll(1), { count: 0, newestPublishedAt: null }, NOW)).toBe("empty");
  });

  it("가장 최근 문서가 30일보다 오래됐으면 quiet, 아니면 ok", () => {
    expect(feedHealth(poll(1), { count: 40, newestPublishedAt: "2026-09-20" }, NOW)).toBe("quiet");
    expect(feedHealth(poll(1), { count: 40, newestPublishedAt: "2026-11-10" }, NOW)).toBe("ok");
    expect(feedHealth(poll(1), { count: 3, newestPublishedAt: null }, NOW)).toBe("ok");
  });

  it("요약은 문제 있는 소스를 앞에 세우고 개수를 센다", () => {
    const r = buildFeedStatus(
      [
        { feed: "A", ...poll(1) },
        { feed: "B", ...poll(0) },
        { feed: "C", ...poll(1) },
      ],
      [
        { feed: "A", count: 12, newestPublishedAt: "2026-11-12" },
        { feed: "C", count: 4, newestPublishedAt: "2026-08-01" },
      ],
      NOW,
    );
    expect(r.counts).toMatchObject({ ok: 1, failed: 1, quiet: 1 });
    expect(r.feeds.map((f) => f.feed)).toEqual(["B", "C", "A"]);
    expect(r.needsAttention.map((f) => f.feed)).toEqual(["B", "C"]);
    expect(r.feeds[0]).toMatchObject({ error: "HTTP 403", health: "failed" });
  });
});
