import { describe, expect, it } from "vitest";
import type { AisVessel } from "@/data/geoTypes";
import type { StackItem } from "@/lib/incidentStack/build";
import { checkSlots } from "@/lib/crossCheck/incidentSlots";
import { classifyOriginalUrl } from "@/lib/crossCheck/originalLink";

function item(over: Partial<StackItem>): StackItem {
  return {
    id: "1",
    source: "liveua",
    at: 0,
    title: "정유시설 피격",
    place: "헤르손",
    lat: 46,
    lng: 32,
    sea: null,
    ...over,
  };
}

describe("classifyOriginalUrl", () => {
  it("pdf 경로를 가려낸다", () => {
    expect(classifyOriginalUrl("https://www.example.org/note.pdf")).toEqual({
      href: "https://www.example.org/note.pdf",
      kind: "pdf",
    });
  });

  it("일반 주소와 열 수 없는 값은 가른다", () => {
    expect(classifyOriginalUrl("https://www.reuters.com/world/a")?.kind).toBe("web");
    expect(classifyOriginalUrl("javascript:alert(1)")).toBeNull();
    expect(classifyOriginalUrl("https://liveuamap.com/")).toBeNull();
    expect(classifyOriginalUrl("")).toBeNull();
  });

  it("보고가 모여 있는 목록은 원문이 아니고, 그 사건 PDF 한 장은 원문이다", () => {
    expect(classifyOriginalUrl("https://icc-ccs.org/map/")).toBeNull();
    expect(classifyOriginalUrl("https://www.recaap.org/alerts")).toBeNull();
    expect(classifyOriginalUrl("https://www.ukmto.org/partner-products/jmic-products")).toBeNull();
    expect(classifyOriginalUrl("https://www.ukmto.org/-/media/ukmto/partner-products/indian-ocean/2024/jmic-infonote/jmic-infonote-26apr_04.pdf")?.kind).toBe("pdf");
  });
});

describe("checkSlots", () => {
  it("선박 UKMTO 본문은 원문이고, 선박명이 없으면 위치 칸은 언급 없음", () => {
    const [report, position] = checkSlots(
      item({
        source: "ukmto",
        title: "공격",
        detail: "Attack reported. See https://www.ukmto.org/-/media/note.pdf",
        vesselName: null,
      }),
      "ship",
    );
    expect(report).toMatchObject({ result: "original", sourceName: "UKMTO", kind: "pdf" });
    expect(position).toMatchObject({ result: "silent", sourceName: "ais", href: null });
  });

  it("타격 기사는 얇음이고, 경보·열·항적 칸은 아직 언급 없음", () => {
    const [report, witness] = checkSlots(
      item({ url: "https://www.reuters.com/world/strike.pdf" }),
      "strike",
    );
    expect(report).toMatchObject({ result: "thin", kind: "pdf", sourceName: "reuters.com" });
    expect(witness).toMatchObject({ result: "silent", sourceName: "alert", href: null });
  });

  it("정세는 성명 칸을, 전선은 기록 칸을 연다", () => {
    expect(checkSlots(item({}), "posture")[1]?.sourceName).toBe("statement");
    expect(checkSlots(item({}), "front")[1]?.sourceName).toBe("record");
  });

  it("라이브유에이 홈 주소는 원문으로 치지 않는다", () => {
    const [report] = checkSlots(
      item({ liveua: { sourceUrl: "https://liveuamap.com/" } as StackItem["liveua"] }),
      "front",
    );
    expect(report.href).toBeNull();
    expect(report.result).toBe("thin");
  });

  it("같은 이름의 배가 그때 그 근처면 맞음이고, 멀리 있으면 어긋남이다", () => {
    const at = Date.parse("2026-11-08T10:37:00Z");
    const ship = item({
      source: "nga",
      title: "보안 사건",
      at,
      lat: 26.4,
      lng: 56.43,
      vesselName: "Front Altair",
      detail: "M/V FRONT ALTAIR suffered a security incident.",
    });
    const base: AisVessel = {
      id: "v",
      mmsi: "123456789",
      shipName: "FRONT ALTAIR",
      lat: 26.4,
      lng: 56.43,
      speedOverGround: 10,
      courseOverGround: null,
      trueHeading: null,
      timestamp: "2026-11-08T10:40:00Z",
      shipType: 80,
      shipTypeLabel: "Tanker",
      category: "commercial",
    };
    expect(checkSlots(ship, "ship", { vessels: [base] })[1]).toMatchObject({
      result: "match",
      observedName: "FRONT ALTAIR",
    });
    expect(checkSlots(ship, "ship", { vessels: [{ ...base, lat: 1, lng: 1 }] })[1]?.result).toBe("conflict");
  });

  it("선명이 없으면 근처 배가 보여도 맞음을 찍지 않는다", () => {
    const at = Date.parse("2026-11-08T10:37:00Z");
    const ship = item({
      source: "ukmto",
      at,
      lat: 26.4,
      lng: 56.43,
      vesselName: null,
      detail: "A tanker was struck.",
    });
    const near: AisVessel = {
      id: "v",
      mmsi: "123456789",
      shipName: "SOME TANKER",
      lat: 26.4,
      lng: 56.43,
      speedOverGround: 10,
      courseOverGround: null,
      trueHeading: null,
      timestamp: "2026-11-08T10:40:00Z",
      shipType: 80,
      shipTypeLabel: "Tanker",
      category: "commercial",
    };
    expect(checkSlots(ship, "ship", { vessels: [near] })[1]).toMatchObject({
      result: "silent",
      nearby: true,
    });
  });

  it("근처 열은 맞음이고, 오신트 글은 성명이 아니며, 당사자 글은 원문이다", () => {
    const at = Date.parse("2026-11-08T10:37:00Z");
    const strike = item({ at, lat: 26.4, lng: 56.43, title: "공습" });
    const [, heat] = checkSlots(strike, "strike", {
      fires: [
        {
          id: "f",
          lat: 26.41,
          lng: 56.44,
          frp: 10,
          brightness: 320,
          confidence: "high",
          acqDate: "2026-11-08",
          acqTime: "1040",
          satellite: "VIIRS",
          daynight: "D",
        },
      ],
    });
    expect(heat).toMatchObject({ result: "match", sensor: "heat" });

    const posts = [
      {
        channelUsername: "OSINTdefender",
        channelTitle: "OSINT Defender",
        text: "unconfirmed strike",
        receivedAt: "2026-11-08T10:40:00Z",
        placeLat: 26.4,
        placeLng: 56.43,
      },
      {
        channelUsername: "IDFofficial",
        channelTitle: "IDF Official",
        text: "We struck a target.",
        receivedAt: "2026-11-08T11:00:00Z",
        messageUrl: "https://t.me/IDFofficial/1",
        placeLat: 26.5,
        placeLng: 56.5,
      },
    ];
    expect(checkSlots(strike, "posture", { posts: [posts[0]!] })[1]).toMatchObject({
      result: "silent",
      looked: true,
    });
    expect(checkSlots(strike, "posture", { posts })[1]).toMatchObject({
      result: "original",
      sensor: "statement",
      sourceName: "IDF Official",
      href: "https://t.me/IDFofficial/1",
    });
  });

  it("전선 면 안이면 원문이고, 밖이면 언급 없음이다", () => {
    const map = {
      features: [
        {
          properties: { name: "도네츠크" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [36, 47],
                [39, 47],
                [39, 49],
                [36, 49],
                [36, 47],
              ],
            ],
          },
        },
      ],
    };
    expect(checkSlots(item({ lat: 48, lng: 37, title: "전진" }), "front", { front: map })[1]).toMatchObject({
      result: "original",
      sensor: "record",
      sourceName: "도네츠크",
    });
    expect(checkSlots(item({ lat: 10, lng: 10 }), "front", { front: map })[1]).toMatchObject({
      result: "silent",
      looked: true,
    });
  });
});
