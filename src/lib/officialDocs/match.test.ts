import { describe, expect, it } from "vitest";
import type { OfficialDocMeta } from "@/data/officialDocs";
import { articlesForFlash, docsForFlash } from "@/lib/officialDocs/match";
import type { NewsStreamItem } from "@/lib/news/types";

const doc = (id: string, tags: string[], at = "2026-11-01"): OfficialDocMeta => ({
  id, issuerIds: ["us"], kind: "factsheet", weight: "unilateral", title: id, publishedAt: at,
  sourceUrl: "https://x.gov/" + id, fetchedAt: "2026-11-12", sha256: "a".repeat(64), language: "en", relatedTags: tags, terms: "t",
});

describe("속보에 붙는 근거 문서", () => {
  it("희귀 지명이 겹칠 때만 붙이고 나라 이름만으로는 안 붙인다", () => {
    const docs = [doc("a", ["hormuz"]), doc("b", ["gaza"])];
    expect(docsForFlash("Tanker attacked near the Strait of Hormuz", docs).map((d) => d.id)).toEqual(["a"]);
    expect(docsForFlash("United States announces new sanctions", docs)).toEqual([]);
  });
  it("최신 문서부터 최대 3건", () => {
    const docs = [1, 2, 3, 4].map((n) => doc(`d${n}`, ["gaza"], `2026-11-0${n}`));
    expect(docsForFlash("Strike in Gaza", docs).map((d) => d.id)).toEqual(["d4", "d3", "d2"]);
  });
});

describe("속보에 붙는 관련 기사", () => {
  const now = Date.parse("2026-11-12T00:00:00Z");
  const row = (title: string, link: string, hoursAgo: number, trustTier: 1 | 2 | 3): NewsStreamItem =>
    ({ title, link, pubDate: new Date(now - hoursAgo * 3_600_000).toISOString(), source: "S", publisher: "Outlet", trustTier }) as NewsStreamItem;

  it("같은 사건·72시간 안만, 일반 매체를 먼저, 자기 주소는 뺀다", () => {
    const pool = [
      row("Iran says it seized a ship in the Strait of Hormuz", "https://a.com/1", 2, 3),
      row("Hormuz ship seizure condemned by allies", "https://b.com/2", 3, 1),
      row("Hormuz tanker story from last month", "https://c.com/3", 24 * 30, 1),
      row("Unrelated football news", "https://d.com/4", 1, 1),
      row("Hormuz own report", "https://own.com/5", 1, 1),
    ];
    const out = articlesForFlash("Tanker seized in Hormuz", now, pool, "https://own.com/5");
    expect(out.map((r) => r.url)).toEqual(["https://b.com/2", "https://a.com/1"]);
    expect(out[1].tier).toBe(3);
  });
});
