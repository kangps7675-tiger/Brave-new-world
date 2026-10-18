import { describe, expect, it } from "vitest";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import {
  filterBySea,
  isShipIncident,
  mergeStackItems,
  seaForPoint,
  splitShipAndFront,
  stackItemFromCase,
  stackItemFromLiveua,
  stackItemFromUkmto,
  type StackItem,
} from "./build";

function ev(over: Partial<LiveuamapEvent>): LiveuamapEvent {
  return {
    id: "a",
    regionId: "yemen",
    resid: 1,
    theater: "middle-east",
    lat: 26.5,
    lng: 56.3,
    title: "Tanker hit",
    body: "",
    sourceUrl: "https://liveuamap.com/",
    publishedAt: "2026-10-16T10:00:00Z",
    tags: [],
    ...over,
  } as LiveuamapEvent;
}

describe("선박 사건 분류", () => {
  it("해역 안 + 선박 키워드면 선박 사건", () => {
    const it = stackItemFromLiveua(ev({ title: "Tanker hit near Hormuz" }), false)!;
    expect(isShipIncident(it)).toBe(true);
  });

  it("해역 안이어도 선박 내용이 아니면 일반 소식", () => {
    const it = stackItemFromLiveua(ev({ title: "Shelling reported in village" }), false)!;
    expect(isShipIncident(it)).toBe(false);
  });

  it("선박 키워드가 있어도 해역 밖이면 일반 소식", () => {
    const it = stackItemFromLiveua(ev({ title: "Tanker hit", lat: 49, lng: 32 }), false)!;
    expect(it.sea).toBeNull();
    expect(isShipIncident(it)).toBe(false);
  });

  it("한국어 제목도 키워드로 잡는다", () => {
    const it = stackItemFromLiveua(ev({ title: "x", titleKo: "호르무즈 인근 유조선 피격" }), true)!;
    expect(isShipIncident(it)).toBe(true);
  });

  it("UKMTO·내 케이스는 항상 선박 사건", () => {
    const u = stackItemFromUkmto({
      id: "1",
      lat: 12.5,
      lng: 43.4,
      place: "Mocha",
      region: null,
      incidentTypeName: "Attack",
      vesselName: "ABC",
      vesselType: "Tanker",
      detail: null,
      utcDateOfIncident: "2026-10-16T08:00:00Z",
    })!;
    expect(u.source).toBe("ukmto");
    expect(u.title).toBe("Attack · Tanker · ABC");
    expect(u.vesselName).toBe("ABC");
    expect(u.vesselType).toBe("Tanker");
    expect(isShipIncident(u)).toBe(true);
  });

  it("UKMTO는 좌표·시각이 깨지면 버린다", () => {
    const base = {
      id: "1",
      place: null,
      region: null,
      incidentTypeName: "Attack",
      vesselName: null,
      vesselType: null,
      detail: null,
    };
    expect(stackItemFromUkmto({ ...base, lat: Number.NaN, lng: 1, utcDateOfIncident: "2026-10-16T08:00:00Z" })).toBeNull();
    expect(stackItemFromUkmto({ ...base, lat: 1, lng: 1, utcDateOfIncident: null })).toBeNull();
  });

  it("UKMTO 자리표시어 선박명(TKR·-·.)은 이름이 아니다", () => {
    const base = {
      id: "7",
      lat: 12.9,
      lng: 47.9,
      place: "Gulf of Aden",
      region: null,
      incidentTypeName: "Attack",
      vesselType: "Tanker ",
      detail: "A Master of an LNG Tanker reported being approached by a skiff",
      utcDateOfIncident: "2026-10-17T10:30:00Z",
    };
    for (const vesselName of ["TKR", "tkr", "-", ".", "MERCHANT"]) {
      const it = stackItemFromUkmto({ ...base, vesselName })!;
      expect(it.vesselName).toBeNull();
      expect(it.title).toBe("Attack · Tanker");
      expect(it.sea).toBe("gulf_of_aden");
    }
  });

  it("한글 모드면 UKMTO 사건 유형·선종·지명을 한글로", () => {
    const it = stackItemFromUkmto(
      {
        id: "k",
        lat: 12.9,
        lng: 47.9,
        place: "Gulf of Aden",
        region: null,
        incidentTypeName: "Attack",
        vesselName: "TKR",
        vesselType: "Tanker ",
        detail: null,
        utcDateOfIncident: "2026-10-17T10:30:00Z",
      },
      true,
    )!;
    expect(it.title).toBe("공격 · 유조선");
    expect(it.place).toBe("아덴만");
  });

  it("UKMTO 경고(Advisory·Suspicious Activity)는 스택에 넣지 않는다", () => {
    const base = {
      id: "9",
      lat: 12.5,
      lng: 43.4,
      place: "Mocha",
      region: null,
      vesselName: null,
      vesselType: null,
      detail: null,
      utcDateOfIncident: "2026-10-16T08:00:00Z",
    };
    expect(stackItemFromUkmto({ ...base, incidentTypeName: "Advisory" })).toBeNull();
    expect(stackItemFromUkmto({ ...base, incidentTypeName: "Suspicious Activity" })).toBeNull();
    expect(stackItemFromUkmto({ ...base, incidentTypeName: "Hijack" })).not.toBeNull();
  });

  it("liveuamap 속보에서 선박명·선종을 읽는다 (확실할 때만)", () => {
    const named = stackItemFromLiveua(ev({ title: "MV Rubymar hit by missile, bulk carrier on fire" }), false)!;
    expect(named.vesselName).toBe("Rubymar");
    expect(named.vesselType).toBe("bulk");
    const anon = stackItemFromLiveua(ev({ title: "A tanker was hit near Hormuz" }), false)!;
    expect(anon.vesselName).toBeNull();
    expect(anon.vesselType).toBe("tanker");
  });

  it("아덴만을 해역으로 분류한다", () => {
    expect(seaForPoint(12.0, 48.5)).toBe("gulf_of_aden");
    expect(seaForPoint(14, 42.5)).toBe("red_sea");
  });

  it("군함·일반 해운 소식은 선박 사건이 아니다", () => {
    const warship = stackItemFromLiveua(ev({ title: "Destroyer attacked by drone near Hormuz" }), false)!;
    const transit = stackItemFromLiveua(ev({ title: "Tanker transits Hormuz" }), false)!;
    expect(isShipIncident(warship)).toBe(false);
    expect(isShipIncident(transit)).toBe(false);
  });

  it("스택과 전선 소식으로 가른다", () => {
    const a = stackItemFromLiveua(ev({ id: "a", title: "Tanker hit" }), false)!;
    const b = stackItemFromLiveua(ev({ id: "b", title: "Shelling", lat: 49, lng: 32 }), false)!;
    const { ship, front } = splitShipAndFront([a, b]);
    expect(ship.map((i) => i.id)).toEqual(["a"]);
    expect(front.map((i) => i.id)).toEqual(["b"]);
  });
});

describe("incidentStack", () => {
  it("해역을 박스로 분류한다", () => {
    expect(seaForPoint(26.5, 56.3)).toBe("hormuz");
    expect(seaForPoint(14, 42.5)).toBe("red_sea");
    expect(seaForPoint(43, 34)).toBe("black_sea");
    expect(seaForPoint(58, 20)).toBe("baltic");
    expect(seaForPoint(0, 0)).toBeNull();
    expect(seaForPoint(Number.NaN, 1)).toBeNull();
  });

  it("발행 시각이 깨진 속보는 버린다", () => {
    expect(stackItemFromLiveua(ev({ publishedAt: "nope" }), true)).toBeNull();
  });

  it("한국어 제목을 우선하고 없으면 원문을 쓴다", () => {
    expect(stackItemFromLiveua(ev({ titleKo: "유조선 피격" }), true)?.title).toBe("유조선 피격");
    expect(stackItemFromLiveua(ev({ titleKo: "유조선 피격" }), false)?.title).toBe("Tanker hit");
  });

  it("병합은 id 중복 제거, 최신순, 상한 적용", () => {
    const mk = (id: string, at: number): StackItem => ({
      id,
      source: "liveua",
      at,
      title: id,
      place: "",
      lat: 0,
      lng: 0,
      sea: null,
    });
    const out = mergeStackItems([[mk("a", 1), mk("b", 3)], [mk("a", 1), mk("c", 2)]], 2);
    expect(out.map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("해역 필터", () => {
    const a = stackItemFromLiveua(ev({ id: "h" }), true)!;
    const b = stackItemFromLiveua(ev({ id: "r", lat: 14, lng: 42.5 }), true)!;
    expect(filterBySea([a, b], "red_sea").map((i) => i.id)).toEqual(["r"]);
    expect(filterBySea([a, b], null)).toHaveLength(2);
  });

  it("케이스는 좌표가 있어야 스택에 들어간다", () => {
    const base = {
      id: "case_1",
      article: { text: "기사 본문" },
      eventType: "maritime",
      claims: [],
      verdict: "partial",
      rev: 1,
    };
    const withPlace = {
      ...base,
      incident: {
        place: { label: "호르무즈", lat: 26.5, lng: 56.3, precision: "point", source: "editor" },
        occurredAt: "2026-10-16T10:00:00Z",
        occurredAtSource: "editor",
      },
    };
    const it = stackItemFromCase(withPlace as never);
    expect(it?.id).toBe("case:case_1");
    expect(it?.sea).toBe("hormuz");
    expect(it?.verdict).toBe("partial");
    expect(
      stackItemFromCase({
        ...base,
        incident: { place: null, occurredAt: null, occurredAtSource: "none" },
      } as never),
    ).toBeNull();
  });
});
