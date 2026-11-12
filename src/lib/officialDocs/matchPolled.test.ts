import { describe, expect, it } from "vitest";
import { polledDocsForFlash, type PolledDoc } from "./matchPolled";

const AT = Date.parse("2026-11-12T00:00:00Z");

function doc(over: Partial<PolledDoc>): PolledDoc {
  return {
    id: "x", issuerId: "us", kind: "statement", weight: "unilateral", title: "Doc", url: "https://example.gov/x",
    publishedAt: "2026-11-11", summary: "", tags: "", feed: "f", agency: "", ...over,
  };
}

describe("polledDocsForFlash", () => {
  it("같은 희귀 지명이면 그 하나로 붙는다", () => {
    const rows = polledDocsForFlash("Tanker attacked near the Strait of Hormuz", AT, [doc({ tags: "hormuz", title: "Statement on maritime security" })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].reasons.places).toContain("hormuz");
  });

  it("주제 하나만 같으면 안 붙고, 당사자까지 같으면(주제+당사자+단어) 붙는다", () => {
    const only = doc({ issuerId: "cn", tags: "topic:export-control", title: "Entity List additions" });
    expect(polledDocsForFlash("New export control rules announced", AT, [only])).toEqual([]);
    const strong = doc({ issuerId: "us", tags: "topic:sanctions", title: "Sanctions on Rosneft shipping network", url: "https://example.gov/y" });
    const rows = polledDocsForFlash("US imposes sanctions on Rosneft shipping network, Russia says", AT, [strong]);
    expect(rows).toHaveLength(1);
    expect(rows[0].reasons.actor).toBe(true);
    expect(rows[0].reasons.terms).toContain("rosneft");
  });

  it("나라 이름만 나온 글에는 그 나라 문서를 붙이지 않는다", () => {
    const rows = polledDocsForFlash("US president speaks in Ohio", AT, [doc({ issuerId: "us", title: "Statement by the President" })]);
    expect(rows).toEqual([]);
  });

  it("발행일이 범위 밖이거나 없으면 뺀다", () => {
    const old = doc({ tags: "hormuz", publishedAt: "2026-10-01" });
    const future = doc({ tags: "hormuz", publishedAt: "2026-11-20", url: "https://example.gov/f" });
    const none = doc({ tags: "hormuz", publishedAt: null, url: "https://example.gov/n" });
    expect(polledDocsForFlash("Attack near Hormuz", AT, [old, future, none])).toEqual([]);
  });

  it("이미 승인 문서로 보이는 주소는 제외하고, 최대 3건만 점수순으로", () => {
    const rows = [1, 2, 3, 4].map((i) => doc({ id: String(i), url: `https://example.gov/${i}`, tags: "hormuz", publishedAt: `2026-11-0${i + 4}` }));
    const out = polledDocsForFlash("Attack near Hormuz", AT, rows, { excludeUrls: new Set(["https://example.gov/4"]) });
    expect(out.map((r) => r.doc.id)).toEqual(["3", "2", "1"]);
  });
});
