import { describe, expect, it } from "vitest";
import {
  detectCrossFromPositions,
  findProtectedCountryAt,
  isClearPerimeterConfidence,
  parsePerimeterCountriesGeoJson,
  pointInRing,
  type PerimeterCountryPoly,
} from "./natoEasternPerimeter";
import {
  matchPerimeterDroneStory,
  pickBestPerimeterDroneStory,
} from "./natoPerimeterEventNews";
import type { NatoPerimeterCrossEvent } from "./natoEasternPerimeter";
import type { NewsStreamItem } from "@/lib/news/types";

/** 대략적 폴란드 박스 (테스트용 단순 사각형 링) */
const PL_RING = [
  [14.0, 49.0],
  [24.2, 49.0],
  [24.2, 54.9],
  [14.0, 54.9],
  [14.0, 49.0],
];

const LT_RING = [
  [20.9, 53.9],
  [26.9, 53.9],
  [26.9, 56.5],
  [20.9, 56.5],
  [20.9, 53.9],
];

const countries: PerimeterCountryPoly[] = [
  { isoA3: "POL", name: "Poland", rings: [PL_RING] },
  { isoA3: "LTU", name: "Lithuania", rings: [LT_RING] },
];

describe("pointInRing / findProtectedCountryAt", () => {
  it("폴란드 내부 좌표를 POL로 잡는다", () => {
    expect(pointInRing(21.0, 52.2, PL_RING)).toBe(true);
    expect(findProtectedCountryAt(21.0, 52.2, countries)).toBe("POL");
  });

  it("우크라 쪽(보호국 밖)은 null", () => {
    expect(findProtectedCountryAt(30.5, 50.4, countries)).toBeNull();
  });
});

describe("detectCrossFromPositions", () => {
  it("UKR→PL 명확 월경을 발화한다", () => {
    const cross = detectCrossFromPositions(
      { lat: 50.4, lon: 30.5 },
      { lat: 52.2, lon: 21.0 },
      countries,
      { type: "uav", confidenceLevel: "high", sourceCount: 1, threatId: "t1" },
    );
    expect(cross?.isoA3).toBe("POL");
    expect(cross?.threatType).toBe("uav");
  });

  it("칼리닌그라드(RUS)→LT 월경을 발화한다", () => {
    // 단순 테스트 링에서 칼리닌그라드≈(20.2, 54.95)는 PL 박스와 겹칠 수 있어
    // 보호국 밖(발트/러시아 축) → LT 내부로 검증
    const cross = detectCrossFromPositions(
      { lat: 55.05, lon: 20.2 },
      { lat: 55.2, lon: 23.8 },
      countries,
      { type: "recon", confidenceLevel: "medium", sourceCount: 2, threatId: "t2" },
    );
    expect(cross?.isoA3).toBe("LTU");
  });

  it("UA 내부 이동은 발화하지 않는다", () => {
    const cross = detectCrossFromPositions(
      { lat: 50.4, lon: 30.5 },
      { lat: 50.5, lon: 30.6 },
      countries,
      { type: "uav", confidenceLevel: "high", sourceCount: 3 },
    );
    expect(cross).toBeNull();
  });

  it("이미 보호국 안이면 발화하지 않는다", () => {
    const cross = detectCrossFromPositions(
      { lat: 52.2, lon: 21.0 },
      { lat: 52.3, lon: 21.1 },
      countries,
      { type: "uav", confidenceLevel: "high", sourceCount: 3 },
    );
    expect(cross).toBeNull();
  });

  it("저신뢰·단일소스는 발화하지 않는다", () => {
    expect(isClearPerimeterConfidence("low", 1)).toBe(false);
    const cross = detectCrossFromPositions(
      { lat: 50.4, lon: 30.5 },
      { lat: 52.2, lon: 21.0 },
      countries,
      { type: "uav", confidenceLevel: "low", sourceCount: 1 },
    );
    expect(cross).toBeNull();
  });

  it("미사일 타입은 무시한다", () => {
    const cross = detectCrossFromPositions(
      { lat: 50.4, lon: 30.5 },
      { lat: 52.2, lon: 21.0 },
      countries,
      { type: "missile", confidenceLevel: "high", sourceCount: 3 },
    );
    expect(cross).toBeNull();
  });
});

describe("parsePerimeterCountriesGeoJson", () => {
  it("보호국만 파싱한다", () => {
    const parsed = parsePerimeterCountriesGeoJson({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { isoA3: "POL", name: "Poland" },
          geometry: { type: "Polygon", coordinates: [PL_RING] },
        },
        {
          type: "Feature",
          properties: { isoA3: "UKR", name: "Ukraine" },
          geometry: { type: "Polygon", coordinates: [PL_RING] },
        },
      ],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.isoA3).toBe("POL");
  });
});

const crossPl: NatoPerimeterCrossEvent = {
  threatId: "t1",
  threatType: "uav",
  isoA3: "POL",
  iso2: "PL",
  countryNameKo: "폴란드",
  countryNameEn: "Poland",
  lat: 52.2,
  lon: 21.0,
  crossedAt: new Date().toISOString(),
  confidenceLevel: "high",
  sourceCount: 2,
};

function news(partial: Partial<NewsStreamItem> & Pick<NewsStreamItem, "id" | "title">): NewsStreamItem {
  return {
    link: "https://www.reuters.com/world/europe/example/",
    source: "Reuters",
    publisher: "Reuters",
    pubDate: new Date().toISOString(),
    theater: "russia-ukraine",
    trustTier: 1,
    imageUrl: "https://cdn.example.com/photo.jpg",
    summary: "",
    ...partial,
  };
}

describe("matchPerimeterDroneStory", () => {
  it("보호국+UAV+official+photo 합격", () => {
    const item = news({
      id: "ok",
      title: "Polish airspace breached by Russian drone",
      summary: "A UAV crossed into Poland near the border.",
    });
    expect(matchPerimeterDroneStory(item, crossPl)?.item.id).toBe("ok");
  });

  it("전선 일반기사는 탈락", () => {
    const item = news({
      id: "front",
      title: "Fighting intensifies near Pokrovsk on the front line",
      summary: "Donetsk sector artillery exchanges continue.",
    });
    expect(matchPerimeterDroneStory(item, crossPl)).toBeNull();
  });

  it("무사진은 탈락", () => {
    const item = news({
      id: "nophoto",
      title: "Drone enters Polish airspace",
      imageUrl: "",
    });
    expect(matchPerimeterDroneStory(item, crossPl)).toBeNull();
  });

  it("tier3 단독은 속보 아님", () => {
    const item = news({
      id: "t3",
      title: "Drone enters Polish airspace",
      trustTier: 3,
    });
    expect(matchPerimeterDroneStory(item, crossPl)).toBeNull();
  });

  it("다른 국가 드론은 탈락", () => {
    const item = news({
      id: "ro",
      title: "Drone debris falls in Romania near Tulcea",
      summary: "Romanian airspace monitoring continues.",
    });
    expect(matchPerimeterDroneStory(item, crossPl)).toBeNull();
  });

  it("후보 중 최적합을 고른다", () => {
    const best = pickBestPerimeterDroneStory(
      [
        news({
          id: "weak",
          title: "Poland monitors situation",
          summary: "Airspace note with drone mention.",
          trustTier: 2,
        }),
        news({
          id: "strong",
          title: "Russian drone violates Polish airspace",
          summary: "UAV intercepted after border cross.",
          trustTier: 1,
        }),
      ],
      crossPl,
    );
    expect(best?.id).toBe("strong");
  });
});
