import { describe, expect, it } from "vitest";
import { rareTagsOf } from "@/lib/news/eventScenarios";
import { groupBySide, polledDocsForFlash, splitRivalSides, type PolledDoc } from "./matchPolled";

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

  it("이미 승인 문서로 보이는 주소는 제외하고, 한 나라에서는 2건만 점수순으로", () => {
    const rows = [1, 2, 3, 4].map((i) => doc({ id: String(i), url: `https://example.gov/${i}`, tags: "hormuz", publishedAt: `2026-11-0${i + 4}` }));
    const out = polledDocsForFlash("Attack near Hormuz", AT, rows, { excludeUrls: new Set(["https://example.gov/4"]) });
    expect(out.map((r) => r.doc.id)).toEqual(["3", "2"]);
  });

  it("일본어·중국어·러시아어·우크라이나어 제목에서도 희귀 지명이 읽혀 영어 속보에 붙는다", () => {
    expect(rareTagsOf("ホルムズ海峡での船舶への攻撃について")).toContain("hormuz");
    expect(rareTagsOf("外交部发言人就红海局势答记者问")).toContain("red-sea");
    expect(rareTagsOf("Удар по Харкову та Херсону")).toEqual(expect.arrayContaining(["kharkiv", "kherson"]));
    expect(rareTagsOf("Сектор Газа: заявление МИД")).toContain("gaza");
    // 러시아어 "газа"(가스의)는 가자로 읽지 않는다
    expect(rareTagsOf("Экспорт природного газа вырос")).toEqual([]);
    const ja = doc({ title: "ホルムズ海峡における商船への攻撃に関する外務大臣談話", tags: rareTagsOf("ホルムズ海峡における商船への攻撃に関する外務大臣談話").join(",") });
    expect(polledDocsForFlash("Tanker attacked near the Strait of Hormuz", AT, [ja])).toHaveLength(1);
  });

  it("영어가 아닌 제목은 영어 번역의 단어로도 속보와 맞춰 본다", () => {
    const ua = doc({ issuerId: "ua", title: "Андрій Сибіга обговорив санкції проти Rosneft", titleEn: "Andrii Sybiha discussed sanctions on Rosneft shipping network", tags: "topic:sanctions" });
    const rows = polledDocsForFlash("US imposes sanctions on Rosneft shipping network, Ukraine says", AT, [ua]);
    expect(rows).toHaveLength(1);
    expect(rows[0].reasons.terms).toEqual(expect.arrayContaining(["rosneft"]));
  });

  it("한 나라가 자리를 독차지하지 않아 당사국 양쪽이 같이 붙고, 나라별로 묶인다", () => {
    const us = [1, 2, 3].map((i) => doc({ id: `us${i}`, issuerId: "us", url: `https://us.gov/${i}`, tags: "hormuz", publishedAt: `2026-11-0${i + 5}` }));
    const cn = doc({ id: "cn1", issuerId: "cn", url: "https://cn.gov/1", tags: "hormuz", publishedAt: "2026-11-05" });
    const out = polledDocsForFlash("Attack near Hormuz", AT, [...us, cn]);
    expect(out.map((r) => r.doc.id)).toEqual(["us3", "us2", "cn1"]);
    const groups = groupBySide(out);
    expect(groups.map((g) => g.issuerId)).toEqual(["us", "cn"]);
    expect(groups[0].matches).toHaveLength(2);
  });

  describe("맞서는 당사국 쌍", () => {
    const flash = "US adds Chinese firms to export control entity list, China vows countermeasures";
    // 당사자(1) + 겹치는 단어 하나(1) = 2점. 평소엔 안 붙지만 두 맞수가 함께 나온 속보에서는 붙는다.
    const cnReply = (over: Partial<PolledDoc> = {}) => doc({ id: "cn1", issuerId: "cn", url: "https://cn.gov/1", title: "Spokesperson on countermeasures against unilateral bullying", ...over });
    const usList = (i: number) => doc({ id: `us${i}`, issuerId: "us", url: `https://us.gov/${i}`, tags: "topic:export-control", title: `Entity list additions ${i} export control`, publishedAt: `2026-11-1${i}` });

    it("두 맞수가 함께 나온 속보에서는 상대 쪽 반응 문서가 낮은 기준으로도 붙고 표시가 남는다", () => {
      const rows = polledDocsForFlash(flash, AT, [cnReply()]);
      expect(rows).toHaveLength(1);
      expect(rows[0].reasons.rival).toBe(true);
    });

    it("한쪽만 나온 속보에서는 느슨하게 받지 않는다", () => {
      expect(polledDocsForFlash("China vows countermeasures", AT, [cnReply()])).toEqual([]);
    });

    it("맞수가 아닌 나라 문서는 느슨하게 받지 않는다", () => {
      const de = doc({ id: "de1", issuerId: "de", url: "https://de.gov/1", title: "Spokesperson on countermeasures against unilateral bullying" });
      expect(polledDocsForFlash(flash, AT, [de])).toEqual([]);
    });

    it("한쪽 점수가 훨씬 높아도 상대 쪽이 한 건 이상 같이 뽑힌다", () => {
      const out = polledDocsForFlash(flash, AT, [usList(1), usList(2), cnReply()]);
      expect(out.map((r) => r.doc.issuerId).sort()).toEqual(["cn", "us", "us"]);
    });

    it("splitRivalSides는 맞서는 쌍을 쌍에 적힌 순서(미국→중국)대로 왼쪽·오른쪽에 놓고 나머지를 따로 둔다", () => {
      const eu = doc({ id: "eu1", issuerId: "eu", url: "https://eu.gov/1", tags: "hormuz" });
      const groups = groupBySide([
        { doc: cnReply(), score: 5, reasons: { places: [], topics: [], terms: [], actor: true } },
        { doc: eu, score: 4, reasons: { places: [], topics: [], terms: [], actor: false } },
        { doc: usList(1), score: 4, reasons: { places: [], topics: [], terms: [], actor: true } },
      ]);
      const { pair, rest } = splitRivalSides(groups);
      expect(pair?.map((g) => g.issuerId)).toEqual(["us", "cn"]);
      expect(rest.map((g) => g.issuerId)).toEqual(["eu"]);
      expect(splitRivalSides(groups.filter((g) => g.issuerId !== "cn")).pair).toBeNull();
    });
  });
});
