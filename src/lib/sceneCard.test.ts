import { describe, expect, it } from "vitest";
import {
  buildSceneCard,
  nearestScenePlace,
  roughDistanceKm,
  sceneTopics,
} from "@/lib/sceneCard";
import type { SceneLinkState } from "@/lib/sceneLink";

function scene(partial: Partial<SceneLinkState> = {}): SceneLinkState {
  return {
    mode: "conflict",
    lat: 12.61,
    lng: 43.35,
    altitude: 0.8,
    layers: null,
    ...partial,
  };
}

describe("좌표 → 지명 역참조", () => {
  it("초크포인트 좌표를 정확히 집는다", () => {
    expect(nearestScenePlace(12.61, 43.35)?.id).toBe("choke-bab-el-mandeb");
    expect(nearestScenePlace(24.48, 119.5)?.id).toBe("china-taiwan");
  });

  it("근처 좌표도 해당 전장으로 묶는다", () => {
    expect(nearestScenePlace(37.5, 127.0)?.id).toBe("korea"); // 서울
    expect(nearestScenePlace(50.45, 30.52)?.id).toBe("russia-ukraine"); // 키이우
  });

  /**
   * 가장 중요한 케이스 — 지명을 **지어내지 않는다.**
   * 남태평양 한복판을 「아프리카」라고 부르면 카드 전체의 신뢰가 무너진다.
   */
  it("앵커에서 너무 멀면 null을 반환한다", () => {
    expect(nearestScenePlace(-40, -140)).toBeNull();
    expect(nearestScenePlace(-78, 0)).toBeNull();
  });
});

describe("거리 계산", () => {
  it("서울–부산이 대략 325km", () => {
    const km = roughDistanceKm({ lat: 37.5, lng: 127 }, { lat: 35.1, lng: 129 });
    expect(km).toBeGreaterThan(260);
    expect(km).toBeLessThan(390);
  });
});

describe("레이어 → 주제", () => {
  it("최대 3개까지만 뽑는다 (목록이 아니라 카드다)", () => {
    const topics = sceneTopics(
      [
        "showWarZones",
        "showAis",
        "showUkmtoIncidents",
        "showOilPipelines",
        "showSubmarineCables",
      ],
      "ko",
    );
    expect(topics).toHaveLength(3);
  });

  it("레이어가 없으면 빈 배열", () => {
    expect(sceneTopics(null, "ko")).toEqual([]);
    expect(sceneTopics([], "ko")).toEqual([]);
  });
});

describe("카드 조립", () => {
  it("해석된 지명과 모드를 담는다", () => {
    const card = buildSceneCard(scene({ layers: ["showWarZones"] }), "ko");
    expect(card.placeResolved).toBe(true);
    expect(card.placeLabel).toBe("바브엘만데브 해협");
    expect(card.modeLabel).toBe("지정학");
  });

  it("영어 라벨을 쓴다", () => {
    const card = buildSceneCard(scene({ mode: "economy", lat: 24.48, lng: 119.5 }), "en");
    expect(card.placeLabel).toBe("Taiwan Strait");
    expect(card.modeLabel).toBe("Geoeconomics");
  });

  it("지명을 못 찾으면 좌표로 폴백한다", () => {
    const card = buildSceneCard(scene({ lat: -40, lng: -140 }), "ko");
    expect(card.placeResolved).toBe(false);
    expect(card.placeLabel).toContain("°");
  });
});
