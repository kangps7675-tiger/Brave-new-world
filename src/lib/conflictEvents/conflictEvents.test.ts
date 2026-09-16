import { describe, expect, it } from "vitest";
import { matchGazetteer, LOCATION_I18N } from "@/lib/geo/gazetteer";
import {
  extractRawConflictEvents,
  locatedEventsOnly,
  type ExtractableItem,
} from "@/lib/conflictEvents/extractRawEvents";
import { auditExtraction, type ExtractionGold } from "@/lib/conflictEvents/evaluateExtraction";
import { clusterConflictEvents, duplicatePinRate } from "@/lib/conflictEvents/clusterEvents";
import { geohashEncode, haversineKm } from "@/lib/conflictEvents/geo";
import { confidenceFromSourceCount, uniqueSourceKey } from "@/lib/conflictEvents/confidence";
import { CLUSTER_DEFAULTS } from "@/lib/conflictEvents/clusterConfig";
import {
  filterClustersByTheaters,
  MAX_CONFLICT_EVENT_MARKERS_BY_TIER,
  selectConflictEventMarkers,
} from "@/lib/conflictEvents/buildLayer";
import {
  CONFLICT_THEATER_DEFAULT_ON,
  CONFLICT_THEATER_META,
} from "@/lib/conflictEvents/theaterMeta";
import type { RawConflictEvent } from "@/lib/conflictEvents/types";

function item(
  id: string,
  title: string,
  snippet = "",
  at = "2026-09-16T04:00:00Z",
  source = `src-${id}`,
): ExtractableItem {
  return {
    id,
    title,
    snippet,
    sourceName: source,
    sourceUrl: `https://example.com/${id}`,
    occurredAt: at,
    trustTier: 1,
    channel: "rss",
  };
}

describe("gazetteer", () => {
  it("기존 이란 지명과 우크라이나·한국 핵심 지명을 찾는다", () => {
    expect(matchGazetteer("Explosions over Tehran")?.id).toBe("tehran");
    expect(matchGazetteer("drone strike in Belgorod")?.id).toBe("belgorod");
    expect(matchGazetteer("ballistic missile from Sunan")?.id).toBe("sunan");
    expect(matchGazetteer("IDF strike in Beirut")?.id).toBe("beirut");
    expect(matchGazetteer("ADIZ crossing near Kinmen")?.id).toBe("kinmen");
    expect(LOCATION_I18N.tehran.ko).toBe("테헤란");
    expect(LOCATION_I18N.kharkiv.ko).toBe("하르키우");
  });

  it("도시가 나라보다 우선한다", () => {
    expect(matchGazetteer("missile attack on Kharkiv, Ukraine")?.id).toBe("kharkiv");
  });

  it("대단층선 공백 전장 지명을 잡는다", () => {
    expect(matchGazetteer("missile test near Iturup in the Kurils")?.theater).toBe("kuril");
    expect(matchGazetteer("jamming over Kaliningrad")?.theater).toBe("baltic");
    expect(matchGazetteer("Suwalki Gap alert")?.id).toBe("suwalki");
    expect(matchGazetteer("Black Sea grain corridor drone risk")?.theater).toBe("black-sea");
    expect(matchGazetteer("clash near Lachin corridor")?.theater).toBe("caucasus");
    expect(matchGazetteer("security drill in Tashkent")?.theater).toBe("central-asia");
    expect(matchGazetteer("scramble near Okinawa")?.theater).toBe("japan");
    expect(matchGazetteer("PLA activity near Yonaguni and Nansei Islands")?.theater).toBe("japan");
    expect(matchGazetteer("drone near Miyako-jima")?.id).toBe("miyako");
    expect(matchGazetteer("patrol near Senkaku / Diaoyu")?.theater).toBe("japan");
    expect(matchGazetteer("Takeshima dispute after Dokdo flyover")?.id).toBe("dokdo");
    expect(matchGazetteer("naval drill in the East Sea near Donghae")?.theater).toBe("korea");
    expect(matchGazetteer("clash risk in Yellow Sea / 서해")?.theater).toBe("korea");
    expect(matchGazetteer("incursion alert in Korea Strait 남해")?.theater).toBe("korea");
    expect(matchGazetteer("missile debris over Sea of Japan")?.theater).toBe("japan");
    expect(matchGazetteer("patrol in Japanese territorial waters")?.theater).toBe("japan");
    expect(matchGazetteer("clash near Spratly Islands in South China Sea")?.theater).toBe(
      "south-china-sea",
    );
  });
});

describe("Phase 0 extractRawConflictEvents", () => {
  const samples: ExtractableItem[] = [
    item("u1", "Ukrainian drones strike Belgorod oil depot", "Explosions reported overnight"),
    item("u2", "Missile barrage hits Kharkiv apartments", "Air raid sirens across the city"),
    item("u3", "Russian airstrike on Odesa port", ""),
    item("u4", "Drone attack on Engels airbase", "Tu-95 bombers targeted"),
    item("u5", "Explosion in Kursk after Ukrainian strike", ""),
    item("u6", "Clash near Bakhmut as shelling resumes", ""),
    item("u7", "Sevastopol naval drone attack reported", "Black Sea Fleet"),
    item("u8", "Missile hits Dnipro energy site", ""),
    item("i1", "Israel strikes Tehran after IRGC threat", "Explosions heard in the capital"),
    item("i2", "Missile intercepted over Bandar Abbas", "Air defense over the port"),
    item("i3", "Airstrike on Damascus military site", ""),
    item("i4", "Hezbollah rockets hit northern Israel from South Lebanon", ""),
    item("i5", "Drone attack near Strait of Hormuz", "Shipping alert"),
    item("i6", "Explosion at Natanz reported by state media", ""),
    item("i7", "IDF airstrike in Beirut southern suburbs", ""),
    item("i8", "Missile fire over Isfahan", ""),
    item("k1", "North Korea fires ballistic missile from Sunan", ""),
    item("t1", "PLA aircraft cross Taiwan Strait median line", "ADIZ incursion"),
    item("neg1", "Central bank holds rates unchanged", "Markets wait for guidance"),
    item("neg2", "Football championship final set for Saturday", ""),
    item("amb1", "Missile intercepted overnight, location unclear", "Air defense active"),
  ];

  const gold: ExtractionGold[] = [
    { id: "u1", expectLocated: true, expectPlaceId: "belgorod", theater: "ukraine" },
    { id: "u2", expectLocated: true, expectPlaceId: "kharkiv", theater: "ukraine" },
    { id: "u3", expectLocated: true, expectPlaceId: "odesa", theater: "ukraine" },
    { id: "u4", expectLocated: true, expectPlaceId: "engels", theater: "ukraine" },
    { id: "u5", expectLocated: true, expectPlaceId: "kursk", theater: "ukraine" },
    { id: "u6", expectLocated: true, expectPlaceId: "bakhmut", theater: "ukraine" },
    { id: "u7", expectLocated: true, expectPlaceId: "sevastopol", theater: "ukraine" },
    { id: "u8", expectLocated: true, expectPlaceId: "dnipro", theater: "ukraine" },
    { id: "i1", expectLocated: true, expectPlaceId: "tehran", theater: "iran" },
    { id: "i2", expectLocated: true, expectPlaceId: "bandar abbas", theater: "iran" },
    { id: "i3", expectLocated: true, expectPlaceId: "damascus", theater: "syria" },
    { id: "i4", expectLocated: true, expectPlaceId: "south lebanon", theater: "lebanon" },
    { id: "i5", expectLocated: true, expectPlaceId: "hormuz", theater: "iran" },
    { id: "i6", expectLocated: true, expectPlaceId: "natanz", theater: "iran" },
    { id: "i7", expectLocated: true, expectPlaceId: "beirut", theater: "lebanon" },
    { id: "i8", expectLocated: true, expectPlaceId: "isfahan", theater: "iran" },
    { id: "k1", expectLocated: true, expectPlaceId: "sunan", theater: "korea" },
    { id: "t1", expectLocated: true, expectPlaceId: "taiwan", theater: "taiwan" },
    { id: "neg1", expectLocated: false },
    { id: "neg2", expectLocated: false },
    { id: "amb1", expectLocated: false },
  ];

  it("활성 전장 샘플에서 좌표를 지어내지 않고 매칭한다", () => {
    const extracted = extractRawConflictEvents(samples);
    expect(extracted.find((e) => e.id === "neg1")).toBeUndefined();
    expect(extracted.find((e) => e.id === "amb1")?.lat).toBeNull();
    const audit = auditExtraction(extracted, gold);
    expect(audit.matchRate).toBeGreaterThanOrEqual(0.8);
    expect(audit.falsePositiveRate).toBeLessThanOrEqual(0.1);
    expect(locatedEventsOnly(extracted).length).toBeGreaterThanOrEqual(16);
  });
});

describe("Phase 1 clusterConflictEvents", () => {
  function raw(
    partial: Partial<RawConflictEvent> & Pick<RawConflictEvent, "id" | "lat" | "lng" | "occurredAt">,
  ): RawConflictEvent {
    const id = partial.id;
    return {
      title: partial.title ?? id,
      snippet: "",
      sourceName: partial.sourceName ?? id,
      sourceUrl: partial.sourceUrl ?? `https://${id}.example.com/story`,
      category: partial.category ?? "drone",
      keywords: partial.keywords ?? ["drone"],
      theater: "ukraine",
      matchedPlaceId: "belgorod",
      extraction: "gazetteer",
      channel: "rss",
      trustTier: 1,
      ...partial,
    };
  }

  it("2h·10km·유사 키워드면 하나의 클러스터로 묶는다", () => {
    const clustered = clusterConflictEvents([
      raw({
        id: "a",
        lat: 50.5977,
        lng: 36.5858,
        occurredAt: "2026-09-16T04:00:00Z",
        sourceName: "Reuters",
      }),
      raw({
        id: "b",
        lat: 50.6,
        lng: 36.59,
        occurredAt: "2026-09-16T05:10:00Z",
        sourceName: "AP",
      }),
    ]);
    expect(clustered).toHaveLength(1);
    expect(clustered[0].sources).toHaveLength(2);
    expect(clustered[0].confidence).toBe("corroborated");
  });

  it("같은 지역이어도 6시간 차이면 묶지 않는다", () => {
    const clustered = clusterConflictEvents([
      raw({
        id: "a",
        lat: 50.5977,
        lng: 36.5858,
        occurredAt: "2026-09-16T00:00:00Z",
      }),
      raw({
        id: "b",
        lat: 50.5977,
        lng: 36.5858,
        occurredAt: "2026-09-16T06:00:00Z",
      }),
    ]);
    expect(clustered).toHaveLength(2);
  });

  it("중복 표시율을 줄인다", () => {
    const events = [
      raw({ id: "a", lat: 50.5977, lng: 36.5858, occurredAt: "2026-09-16T04:00:00Z", sourceName: "A" }),
      raw({ id: "b", lat: 50.598, lng: 36.586, occurredAt: "2026-09-16T04:20:00Z", sourceName: "B" }),
      raw({ id: "c", lat: 50.599, lng: 36.587, occurredAt: "2026-09-16T04:40:00Z", sourceName: "C" }),
      raw({
        id: "d",
        lat: 49.9935,
        lng: 36.2304,
        occurredAt: "2026-09-16T04:00:00Z",
        matchedPlaceId: "kharkiv",
        title: "Kharkiv",
      }),
    ];
    const clustered = clusterConflictEvents(events);
    expect(events.length).toBe(4);
    expect(clustered.length).toBe(2);
    expect(duplicatePinRate(events.length, clustered.length)).toBeGreaterThan(0);
  });

  it("geohash precision 기본이 5이다", () => {
    expect(CLUSTER_DEFAULTS.geohashPrecision).toBe(5);
    expect(geohashEncode(50.5977, 36.5858, 5).length).toBe(5);
    expect(haversineKm({ lat: 50.5977, lng: 36.5858 }, { lat: 50.6, lng: 36.59 })).toBeLessThan(10);
  });
});

describe("Phase 2 confidence", () => {
  it("소스 수로 등급을 나눈다", () => {
    expect(confidenceFromSourceCount(1)).toBe("single-source");
    expect(confidenceFromSourceCount(2)).toBe("corroborated");
    expect(confidenceFromSourceCount(4)).toBe("high-confidence");
  });

  it("uniqueSourceKey는 URL 호스트를 이름보다 우선한다", () => {
    expect(uniqueSourceKey("GDELT", "https://www.reuters.com/a")).toBe("reuters.com");
    expect(uniqueSourceKey("GDELT", "https://apnews.com/b")).toBe("apnews.com");
    expect(uniqueSourceKey("Reuters", null)).toBe("reuters");
  });

  it("GDELT도 URL 호스트로 독립 소스를 센다", () => {
    const clustered = clusterConflictEvents([
      {
        id: "g1",
        title: "Drone strike Belgorod",
        snippet: "",
        sourceName: "GDELT",
        sourceUrl: "https://www.reuters.com/world/1",
        occurredAt: "2026-09-16T04:00:00Z",
        category: "drone",
        keywords: ["drone"],
        theater: "ukraine",
        lat: 50.5977,
        lng: 36.5858,
        matchedPlaceId: "belgorod",
        extraction: "gdelt",
        channel: "gdelt",
        trustTier: 2,
      },
      {
        id: "g2",
        title: "UAV hits Belgorod depot",
        snippet: "",
        sourceName: "GDELT",
        sourceUrl: "https://apnews.com/article/2",
        occurredAt: "2026-09-16T04:30:00Z",
        category: "drone",
        keywords: ["drone"],
        theater: "ukraine",
        lat: 50.6,
        lng: 36.59,
        matchedPlaceId: "belgorod",
        extraction: "gdelt",
        channel: "gdelt",
        trustTier: 1,
      },
    ]);
    expect(clustered).toHaveLength(1);
    expect(clustered[0].sources).toHaveLength(2);
    expect(clustered[0].confidence).toBe("corroborated");
  });
});

describe("theater filter + marker cull", () => {
  it("칩 0개면 빈 배열, theater 없는 건은 숨긴다", () => {
    const clusters = [
      {
        clusterId: "a",
        lat: 50,
        lng: 36,
        category: "drone" as const,
        theater: "ukraine" as const,
        keywords: ["drone"],
        title: "a",
        snippet: "",
        sources: [],
        firstSeenAt: "2026-09-16T04:00:00Z",
        lastConfirmedAt: "2026-09-16T04:00:00Z",
        confidence: "single-source" as const,
        trustTier: 1 as const,
        heroStatus: "breaking" as const,
        matchedPlaceId: "belgorod",
      },
      {
        clusterId: "b",
        lat: 10,
        lng: 10,
        category: "clash" as const,
        theater: null,
        keywords: ["clash"],
        title: "b",
        snippet: "",
        sources: [],
        firstSeenAt: "2026-09-16T04:00:00Z",
        lastConfirmedAt: "2026-09-16T04:00:00Z",
        confidence: "single-source" as const,
        trustTier: 3 as const,
        heroStatus: "unverified" as const,
        matchedPlaceId: null,
      },
    ];
    expect(filterClustersByTheaters(clusters, new Set())).toEqual([]);
    expect(filterClustersByTheaters(clusters, new Set(["ukraine"]))).toHaveLength(1);
    expect(
      filterClustersByTheaters(
        clusters,
        new Set([
          "ukraine",
          "iran",
          "lebanon",
          "syria",
          "taiwan",
          "korea",
          "south-china-sea",
          "kuril",
          "baltic",
          "black-sea",
          "japan",
          "caucasus",
          "central-asia",
        ]),
      ),
    ).toHaveLength(1);
  });

  it("LOD 상한으로 마커 수를 자른다", () => {
    const markers = Array.from({ length: 40 }, (_, i) => ({
      markerId: `m-${i}`,
      displayKind: "conflict-event" as const,
      clusterId: `c-${i}`,
      lat: 50 + i * 0.01,
      lng: 36 + i * 0.01,
      category: "drone" as const,
      theater: "ukraine" as const,
      titleKo: `t${i}`,
      titleEn: `t${i}`,
      bodyKo: "",
      bodyEn: "",
      confidence: "single-source" as const,
      sources: [],
      firstSeenAt: "2026-09-16T04:00:00Z",
      lastConfirmedAt: "2026-09-16T04:00:00Z",
      intensity: 0.5,
      trustTier: 1 as const,
      heroStatus: "breaking" as const,
      evidenceTier: "unverified" as const,
      perspectiveCount: 1,
      accent: "cyan" as const,
    }));
    const picked = selectConflictEventMarkers(markers, {
      view: { lat: 50, lng: 36 },
      lodTier: "global",
    });
    expect(picked.length).toBeLessThanOrEqual(MAX_CONFLICT_EVENT_MARKERS_BY_TIER.global);
    expect(picked.length).toBeGreaterThan(0);
  });
});

describe("theater defaults (1–3)", () => {
  it("기본 ON은 시급·공백·일본·캅카스·남중국해 열두 전장이다", () => {
    expect(CONFLICT_THEATER_DEFAULT_ON).toEqual([
      "iran",
      "ukraine",
      "taiwan",
      "korea",
      "south-china-sea",
      "kuril",
      "baltic",
      "black-sea",
      "lebanon",
      "syria",
      "japan",
      "caucasus",
    ]);
    expect(CONFLICT_THEATER_DEFAULT_ON).toHaveLength(12);
    expect(CONFLICT_THEATER_META.japan.ko).toBe("일본");
    expect(CONFLICT_THEATER_META["central-asia"].defaultOn).toBe(false);
  });

  it("칩 0개·null 전장은 마커를 비운다", () => {
    const clusters = [
      {
        clusterId: "a",
        lat: 1,
        lng: 2,
        category: "drone" as const,
        theater: "ukraine" as const,
        keywords: ["drone"],
        title: "a",
        snippet: "",
        sources: [],
        firstSeenAt: "2026-09-16T04:00:00Z",
        lastConfirmedAt: "2026-09-16T04:00:00Z",
        confidence: "single-source" as const,
        trustTier: 1 as const,
        heroStatus: "confirmed" as const,
        matchedPlaceId: "belgorod",
      },
      {
        clusterId: "b",
        lat: 3,
        lng: 4,
        category: "missile" as const,
        theater: null,
        keywords: ["missile"],
        title: "b",
        snippet: "",
        sources: [],
        firstSeenAt: "2026-09-16T04:00:00Z",
        lastConfirmedAt: "2026-09-16T04:00:00Z",
        confidence: "single-source" as const,
        trustTier: 3 as const,
        heroStatus: "unverified" as const,
        matchedPlaceId: null,
      },
    ];
    expect(filterClustersByTheaters(clusters, new Set())).toEqual([]);
    expect(filterClustersByTheaters(clusters, null)).toEqual([]);
    expect(filterClustersByTheaters(clusters, new Set(["ukraine"]))).toHaveLength(1);
  });
});

describe("saved gold fixture (full fault line)", () => {
  it("전 전장 골든 JSON 매칭률이 충분하다", async () => {
    const goldMod = await import("@/lib/conflictEvents/fixtures/conflict-extract-gold.json");
    const goldFile = goldMod.default ?? goldMod;
    const items = goldFile.items as Array<{
      id: string;
      title: string;
      snippet?: string;
      sourceName: string;
      sourceUrl?: string;
      occurredAt?: string;
      expectLocated: boolean;
      expectPlaceId?: string;
      expectTheater?: import("@/lib/conflictEvents/types").ConflictTheater;
    }>;
    expect(items.length).toBeGreaterThanOrEqual(100);

    const extractables = items.map((row) => ({
      id: row.id,
      title: row.title,
      snippet: row.snippet,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
      occurredAt: row.occurredAt,
    }));
    const labels: ExtractionGold[] = items.map((row) => ({
      id: row.id,
      expectLocated: row.expectLocated,
      expectPlaceId: row.expectPlaceId,
      expectTheater: row.expectTheater,
    }));
    const extracted = extractRawConflictEvents(extractables);
    const audit = auditExtraction(extracted, labels);
    expect(audit.matchRate).toBeGreaterThanOrEqual(0.9);
    expect(audit.falsePositiveRate).toBeLessThanOrEqual(0.1);

    const theaters = new Set(
      extracted.filter((e) => e.lat != null).map((e) => e.theater).filter(Boolean),
    );
    for (const need of [
      "iran",
      "ukraine",
      "taiwan",
      "korea",
      "south-china-sea",
      "kuril",
      "baltic",
      "black-sea",
      "lebanon",
      "syria",
      "japan",
      "caucasus",
      "central-asia",
    ] as const) {
      expect(theaters.has(need)).toBe(true);
    }
  });
});
