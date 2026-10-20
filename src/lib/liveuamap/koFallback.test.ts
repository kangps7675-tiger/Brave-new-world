import { describe, expect, it } from "vitest";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import { applyKoPatches, bodyNeedsKo, titleNeedsKo } from "./koFallback";

function ev(over: Partial<LiveuamapEvent>): LiveuamapEvent {
  return {
    id: "a",
    regionId: "iran",
    resid: 1,
    theater: "middle-east",
    lat: 26.5,
    lng: 56.3,
    title: "Tanker hit near Hormuz",
    body: "Reports of an explosion on a tanker",
    sourceUrl: "https://liveuamap.com/",
    publishedAt: "2026-10-16T10:00:00Z",
    tags: [],
    ...over,
  } as LiveuamapEvent;
}

describe("liveuamap 한글 보강", () => {
  it("한글 제목이 없거나 영어 그대로(번역 실패)면 보강 대상", () => {
    expect(titleNeedsKo(ev({}))).toBe(true);
    expect(titleNeedsKo(ev({ titleKo: "Tanker hit near Hormuz" }))).toBe(true); // 번역 실패 = 원문 반환
    expect(titleNeedsKo(ev({ titleKo: "호르무즈 인근 유조선 피격" }))).toBe(false);
  });

  it("본문이 비어 있으면 대상이 아니다", () => {
    expect(bodyNeedsKo(ev({ body: "" }))).toBe(false);
    expect(bodyNeedsKo(ev({ bodyKo: "유조선에서 폭발이 보고됨" }))).toBe(false);
    expect(bodyNeedsKo(ev({}))).toBe(true);
  });

  it("번역 결과를 채우고, 이미 한글인 건 덮어쓰지 않는다", () => {
    const events = [
      ev({ id: "a" }),
      ev({ id: "b", titleKo: "이미 한글 제목", bodyKo: "이미 한글 본문" }),
    ];
    const out = applyKoPatches(
      events,
      new Map([
        ["a", { titleKo: "호르무즈 인근 유조선 피격", bodyKo: "유조선에서 폭발 보고" }],
        ["b", { titleKo: "덮어쓰면 안 됨", bodyKo: "덮어쓰면 안 됨" }],
      ]),
    );
    expect(out[0]!.titleKo).toBe("호르무즈 인근 유조선 피격");
    expect(out[0]!.bodyKo).toBe("유조선에서 폭발 보고");
    expect(out[1]!.titleKo).toBe("이미 한글 제목");
  });

  it("번역이 또 영어면 반영하지 않고, 바뀐 게 없으면 같은 배열을 돌려준다", () => {
    const events = [ev({ id: "a" })];
    const out = applyKoPatches(events, new Map([["a", { titleKo: "Tanker hit near Hormuz" }]]));
    expect(out).toBe(events);
    expect(applyKoPatches(events, new Map())).toBe(events);
  });
});
