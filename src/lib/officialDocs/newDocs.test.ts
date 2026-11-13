import { describe, expect, it } from "vitest";
import { pickNewDocs } from "@/lib/officialDocs/newDocs";
import type { PolledDoc } from "@/lib/officialDocs/matchPolled";

const NOW = Date.parse("2026-11-14T00:00:00Z");
const doc = (id: string, kind: string, publishedAt: string): PolledDoc => ({
  id, issuerId: "us", kind, weight: "unilateral", title: id, url: "https://x/" + id, publishedAt, summary: "", tags: "", feed: "f", agency: "",
});

describe("pickNewDocs", () => {
  it("주요 종류만, 최근 7일 안에서, 최신순으로 고른다", () => {
    const out = pickNewDocs(
      [
        doc("old-joint", "joint-statement", "2026-11-01"),
        doc("press", "press-release", "2026-11-13"),
        doc("fact", "factsheet", "2026-11-12"),
        doc("treaty", "treaty", "2026-11-13"),
        doc("nodate", "statement", ""),
      ],
      NOW,
    );
    expect(out.map((d) => d.id)).toEqual(["treaty", "fact"]);
  });
  it("12건까지만 담는다", () => {
    const many = Array.from({ length: 20 }, (_, i) => doc("d" + i, "statement", `2026-11-${String(13 - (i % 5)).padStart(2, "0")}`));
    expect(pickNewDocs(many, NOW)).toHaveLength(12);
  });
});
