import { describe, expect, it } from "vitest";
import {
  FEATURE_ATTR_KM,
  buildFeatureStatus,
  findNearestFeature,
  haversineKm,
  normalizeReefWatchFeatures,
  parseOpenSkyStates,
} from "@/lib/reefWatch";

describe("reefWatch feature registry", () => {
  it("normalizes ReefWatch target features with Tier-1 priority", () => {
    const features = normalizeReefWatchFeatures();
    expect(features.length).toBeGreaterThanOrEqual(70);
    const fiery = features.find((f) => f.key === "fiery_cross_reef");
    expect(fiery?.priority).toBe(1);
    expect(fiery?.id).toBe("feature:fiery_cross_reef");
    expect(fiery?.hasAirport).toBe(true);
  });
});

describe("reefWatch OpenSky attribution", () => {
  it("attributes aircraft only within ±0.15° radius", () => {
    const features = normalizeReefWatchFeatures();
    const woody = features.find((f) => f.key === "woody_island")!;
    const near = [
      "aabbcc",
      "NEAR01  ",
      "China",
      null,
      null,
      woody.lng + 0.02,
      woody.lat + 0.01,
      3000,
      false,
      100,
      180,
      null,
      null,
      3100,
      null,
    ];
    // Far outside attribution radius (still inside SCS bbox conceptually)
    const far = [
      "ddeeff",
      "FAR001  ",
      "China",
      null,
      null,
      112.0,
      12.0,
      9000,
      false,
      200,
      90,
      null,
      null,
      9100,
      null,
    ];
    const traffic = parseOpenSkyStates([near, far], features);
    expect(traffic).toHaveLength(1);
    expect(traffic[0]?.featureKey).toBe("woody_island");
    expect(traffic[0]?.distanceKm).toBeLessThanOrEqual(FEATURE_ATTR_KM);
  });

  it("finds nearest feature via haversine", () => {
    const features = normalizeReefWatchFeatures();
    const nearest = findNearestFeature(9.53, 112.88, features);
    expect(nearest?.feature.key).toBe("fiery_cross_reef");
    expect(haversineKm(9.53, 112.88, nearest!.feature.lat, nearest!.feature.lng)).toBeLessThan(
      1,
    );
  });

  it("builds feature status traffic counts", () => {
    const features = normalizeReefWatchFeatures().slice(0, 3);
    const traffic = parseOpenSkyStates(
      [
        [
          "abc",
          "T1",
          "China",
          null,
          null,
          features[0]!.lng,
          features[0]!.lat,
          1000,
          false,
          50,
          10,
          null,
          null,
          1000,
          null,
        ],
      ],
      features,
    );
    const status = buildFeatureStatus(features, traffic);
    expect(status[0]?.recentTraffic24h).toBe(1);
  });
});
