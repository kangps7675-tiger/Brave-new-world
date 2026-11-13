import { describe, expect, it } from "vitest";
import { buildDiplomacyThreads } from "@/lib/officialDocs/threads";
import type { PolledDoc } from "@/lib/officialDocs/matchPolled";

const NOW = Date.parse("2026-11-12T12:00:00Z");

let n = 0;
function doc(issuerId: string, title: string, publishedAt: string, extra: Partial<PolledDoc> = {}): PolledDoc {
  n += 1;
  return { id: `d${n}`, issuerId, kind: "press-release", weight: "unilateral", title, url: `https://example.test/${n}`, publishedAt, summary: "", tags: "", feed: "f", agency: "", ...extra };
}

describe("buildDiplomacyThreads", () => {
  it("같은 당사자가 이어서 낸 협상 문서를 한 가닥으로 묶고 시간순으로 놓는다", () => {
    const threads = buildDiplomacyThreads(
      [
        doc("ir", "Iran says talks with United States must include sanctions relief", "2026-11-10"),
        doc("us", "United States says talks with Iran will continue next week", "2026-11-08"),
        doc("ir", "Iran Foreign Ministry on negotiations with Washington", "2026-11-11"),
      ],
      NOW,
    );
    expect(threads).toHaveLength(1);
    expect(threads[0].docs.map((d) => d.publishedAt)).toEqual(["2026-11-08", "2026-11-10", "2026-11-11"]);
    expect(threads[0].actors).toEqual(expect.arrayContaining(["iran", "us"]));
    expect(threads[0].issuerIds.sort()).toEqual(["ir", "us"]);
    expect(threads[0].silent).toEqual([]);
  });

  it("중재국 같은 제3국이 낀 사안도 같은 가닥에 담는다", () => {
    const threads = buildDiplomacyThreads(
      [
        doc("us", "United States and Iran hold talks mediated by Oman", "2026-11-09", { tags: "hormuz" }),
        doc("ir", "Iran welcomes Oman mediation in talks with United States", "2026-11-10"),
      ],
      NOW,
    );
    expect(threads).toHaveLength(1);
  });

  it("한쪽만 말했으면 말이 없는 당사국을 silent로 알린다", () => {
    const threads = buildDiplomacyThreads(
      [doc("us", "United States proposes ceasefire talks with Russia", "2026-11-10")],
      NOW,
    );
    expect(threads).toHaveLength(1);
    expect(threads[0].silent).toContain("russia");
  });

  it("간격이 5일을 넘으면 다른 가닥이다", () => {
    const threads = buildDiplomacyThreads(
      [
        doc("us", "United States and Iran talks on enrichment", "2026-11-01"),
        doc("ir", "Iran and United States talks resume", "2026-11-10"),
      ],
      NOW,
    );
    expect(threads).toHaveLength(2);
  });

  it("외교 말이 없거나 당사자가 하나뿐인 글, 14일 넘은 글은 가닥에 넣지 않는다", () => {
    const threads = buildDiplomacyThreads(
      [
        doc("us", "United States and Iran new tariff schedule published", "2026-11-10"),
        doc("us", "United States talks on domestic budget", "2026-11-10"),
        doc("us", "United States and Iran talks", "2026-10-01"),
      ],
      NOW,
    );
    expect(threads).toHaveLength(0);
  });

  it("서로 무관한 두 사안은 섞이지 않는다", () => {
    const threads = buildDiplomacyThreads(
      [
        doc("us", "United States and Iran talks on enrichment", "2026-11-10"),
        doc("cn", "China and Taiwan talks on trade corridor", "2026-11-10"),
      ],
      NOW,
    );
    expect(threads).toHaveLength(2);
  });
});

describe("제3자·당사자 단서", () => {
  it("중재 표현 가까이에 나온 나라를 중재 단서로 센다(가닥 당사자 목록에 없는 나라 포함)", () => {
    const threads = buildDiplomacyThreads(
      [
        doc("us", "United States and Iran hold talks mediated by Oman", "2026-11-09"),
        doc("ir", "Iran welcomes Oman mediation in talks with United States", "2026-11-10"),
      ],
      NOW,
    );
    expect(threads).toHaveLength(1);
    expect(threads[0].mediators.map((m) => m.key)).toContain("om");
    // 같은 문장에 함께 나온 협상 당사국은 중재 단서로 세지 않는다
    expect(threads[0].mediators.map((m) => m.key)).not.toContain("iran");
    expect(threads[0].mediators.map((m) => m.key)).not.toContain("us");
    expect(threads[0].roles["iran"].spoke).toBe(1);
    expect(threads[0].roles["us"].named).toBeGreaterThanOrEqual(1);
  });

  it("중재 표현이 없으면 중재 단서를 만들지 않는다", () => {
    const threads = buildDiplomacyThreads([doc("us", "United States and Iran talks on enrichment", "2026-11-10")], NOW);
    expect(threads[0].mediators).toEqual([]);
  });
});
