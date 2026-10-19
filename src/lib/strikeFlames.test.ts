import { describe, expect, it } from "vitest";
import type { NewfeedsAttackPoint } from "@/lib/newfeeds";
import { flamesFromNewfeeds, mergeStrikeFlames, type StrikeFlame } from "./strikeFlames";

const NOW = Date.parse("2026-10-19T00:00:00Z");

function nf(over: Partial<NewfeedsAttackPoint>): NewfeedsAttackPoint {
  return {
    id: "a1",
    lat: 26.2,
    lng: 50.6,
    title: "Iranian drones struck a refinery in Bahrain, causing a fire",
    summary: "Several drones hit the facility.",
    severity: "high",
    category: "drone strike",
    location: "Bahrain",
    sourceName: "Reuters",
    sourceUrl: "https://example.com/a1",
    publishedAt: "2026-10-18T20:00:00Z",
    region: "gulf",
    iranRelated: true,
    ...over,
  };
}

function flame(over: Partial<StrikeFlame>): StrikeFlame {
  return {
    id: "l1",
    lat: 26.25,
    lng: 50.6,
    title: "x",
    body: "",
    kind: "drone",
    region: "iran",
    publishedAt: "2026-10-18T19:00:00Z",
    origin: "liveuamap",
    source: "Liveuamap",
    ...over,
  };
}

describe("공습 불꽃", () => {
  it("NewFeeds 공격 소식 중 드론·미사일이 실제로 맞은 건만 불꽃으로 바꾼다", () => {
    const flames = flamesFromNewfeeds(
      [
        nf({}),
        nf({ id: "a2", title: "Air defense intercepted a missile over Riyadh", summary: "No damage reported." }),
        nf({ id: "a3", title: "Talks continue in Muscat", summary: "Diplomatic meeting." }),
      ],
      NOW,
    );
    expect(flames.map((f) => f.id)).toEqual(["nf:a1"]);
    expect(flames[0]).toMatchObject({
      kind: "drone",
      origin: "newfeeds",
      source: "NewFeeds · Reuters",
      body: "Several drones hit the facility.",
      url: "https://example.com/a1",
    });
  });

  it("좌표가 없거나 이틀이 지났거나 시각을 모르면 뺀다", () => {
    expect(flamesFromNewfeeds([nf({ lat: Number.NaN })], NOW)).toHaveLength(0);
    expect(flamesFromNewfeeds([nf({ publishedAt: "2026-10-15T00:00:00Z" })], NOW)).toHaveLength(0);
    expect(flamesFromNewfeeds([nf({ publishedAt: null })], NOW)).toHaveLength(0);
  });

  it("같은 사건은 앞 그룹만 남기고, 결과는 최신순·상한을 지킨다", () => {
    const dup = flamesFromNewfeeds([nf({})], NOW);
    const far = flamesFromNewfeeds([nf({ id: "a9", lat: 31.9, lng: 35.9, publishedAt: "2026-10-18T23:00:00Z" })], NOW);
    const merged = mergeStrikeFlames([[flame({})], [...dup, ...far]], 10);
    expect(merged.map((f) => f.id)).toEqual(["nf:a9", "l1"]); // 최신순, 중복(nf:a1) 제거
    expect(mergeStrikeFlames([[flame({})], far], 1)).toHaveLength(1);
  });
});
