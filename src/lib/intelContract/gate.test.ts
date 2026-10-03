import { describe, expect, it } from "vitest";
import {
  cesiumAlertToBundle,
  chokepointStressToBundle,
  gateCesiumAlert,
  gateChokepointStress,
} from "@/lib/intelContract/adapters/fromEconomyAlert";
import { evaluateGate } from "@/lib/intelContract/gate";
import { canPublish } from "@/lib/intelContract/publish";
import {
  computeObservationStats,
  withComputedStats,
} from "@/lib/intelContract/bundleStats";
import type { EvidenceBundle } from "@/lib/intelContract/types";

function base(partial: Partial<EvidenceBundle> & Pick<EvidenceBundle, "observations">): EvidenceBundle {
  return withComputedStats({
    bundleId: "t",
    kind: "incident",
    titleKo: "t",
    titleEn: "t",
    geoOk: true,
    method: "test",
    disconfirmLog: { queried: true, hitCount: 0 },
    killCriteria: ["kill"],
    altHypothesis: {
      labelKo: "대안",
      labelEn: "alt",
      supportIds: [],
    },
    claimKo: "주장",
    claimEn: "claim",
    ...partial,
  });
}

describe("evaluateGate", () => {
  it("drops empty observations", () => {
    const r = evaluateGate(
      base({
        observations: [],
        method: "test",
      }),
    );
    expect(r.grade).toBe("drop");
  });

  it("holds tip-only", () => {
    const r = evaluateGate(
      base({
        observations: [
          {
            id: "1",
            modality: "tip",
            sourceKey: "tg:a",
            occurredAt: null,
            payloadRef: "1",
          },
          {
            id: "2",
            modality: "tip",
            sourceKey: "tg:b",
            occurredAt: null,
            payloadRef: "2",
          },
        ],
      }),
    );
    expect(r.grade).toBe("hold");
  });

  it("caps media-only below high", () => {
    const r = evaluateGate(
      base({
        observations: [
          {
            id: "1",
            modality: "media",
            sourceKey: "reuters.com",
            trustTier: 1,
            occurredAt: "2026-10-01T00:00:00Z",
            payloadRef: "1",
          },
          {
            id: "2",
            modality: "media",
            sourceKey: "apnews.com",
            trustTier: 1,
            occurredAt: "2026-10-01T01:00:00Z",
            payloadRef: "2",
          },
        ],
      }),
    );
    expect(r.grade).not.toBe("high");
    expect(["std", "low"]).toContain(r.grade);
  });

  it("allows high with media+sensor", () => {
    const r = evaluateGate(
      base({
        observations: [
          {
            id: "1",
            modality: "media",
            sourceKey: "reuters.com",
            trustTier: 1,
            occurredAt: "2026-10-01T00:00:00Z",
            payloadRef: "1",
          },
          {
            id: "2",
            modality: "sensor",
            sourceKey: "liveuamap",
            occurredAt: "2026-10-01T01:00:00Z",
            payloadRef: "2",
          },
        ],
      }),
    );
    expect(r.grade).toBe("high");
  });

  it("caps when disconfirm not queried", () => {
    const r = evaluateGate(
      base({
        disconfirmLog: { queried: false, hitCount: 0 },
        observations: [
          {
            id: "1",
            modality: "media",
            sourceKey: "reuters.com",
            trustTier: 1,
            occurredAt: null,
            payloadRef: "1",
          },
          {
            id: "2",
            modality: "sensor",
            sourceKey: "firms",
            occurredAt: null,
            payloadRef: "2",
          },
        ],
      }),
    );
    expect(r.grade).toBe("low");
  });

  it("caps when disconfirm hitCount > 0 even if queried", () => {
    const r = evaluateGate(
      base({
        disconfirmLog: { queried: true, hitCount: 2 },
        observations: [
          {
            id: "1",
            modality: "media",
            sourceKey: "reuters.com",
            trustTier: 1,
            occurredAt: null,
            payloadRef: "1",
          },
          {
            id: "2",
            modality: "sensor",
            sourceKey: "firms",
            occurredAt: null,
            payloadRef: "2",
          },
        ],
      }),
    );
    expect(r.grade).toBe("low");
    expect(r.reasons.some((x) => x.code === "G6" && !x.ok)).toBe(true);
  });
});

describe("canPublish", () => {
  it("blocks drop on watchboard", () => {
    expect(canPublish("watchboard", "drop")).toBe(false);
  });
  it("allows hold on watchboard", () => {
    expect(canPublish("watchboard", "hold")).toBe(true);
  });
  it("requires std for breaking_flash", () => {
    expect(canPublish("breaking_flash", "low")).toBe(false);
    expect(canPublish("breaking_flash", "std")).toBe(true);
  });
  it("blocks low on economy_alert and map_hero", () => {
    expect(canPublish("economy_alert", "low")).toBe(false);
    expect(canPublish("map_hero", "low")).toBe(false);
    expect(canPublish("watchboard", "low")).toBe(true);
  });
});

describe("sole official/alert → low", () => {
  it("caps single UKMTO alert at low (not std/high)", () => {
    const gate = gateCesiumAlert(
      {
        id: "ukmto-1",
        kind: "ukmto",
        title: "UKMTO warning",
        detail: "Suspicious approach",
        lat: 12.5,
        lng: 43.3,
      },
      { disconfirmCorpus: [] },
    );
    expect(gate.bundle.observations.some((o) => o.id.endsWith(":geo"))).toBe(
      false,
    );
    expect(gate.bundle.observations).toHaveLength(1);
    expect(gate.grade).toBe("low");
    expect(canPublish("watchboard", gate.grade)).toBe(true);
    expect(canPublish("economy_alert", gate.grade)).toBe(false);
    expect(canPublish("map_hero", gate.grade)).toBe(false);
  });

  it("does not count adapter scaffold observations toward independence", () => {
    const real = {
      id: "ukmto-1",
      modality: "alert" as const,
      sourceKey: "cesium-alert:ukmto",
      occurredAt: null,
      payloadRef: "ukmto-1",
      label: "ukmto",
    };
    const scaffold = {
      id: "ukmto-1:geo",
      modality: "official" as const,
      sourceKey: "cesium-alert-geo:ukmto",
      occurredAt: null,
      payloadRef: "ukmto-1:geo",
      label: "geolocation",
      countsTowardIndependence: false,
    };
    const stats = computeObservationStats([real, scaffold]);
    expect(stats.independenceCount).toBe(1);
    expect(stats.modalityCount).toBe(1);

    const r = evaluateGate(
      base({
        kind: "maritime-alert",
        observations: [real, scaffold],
      }),
    );
    // 스캐폴드를 세면 indep=2·mod=2로 std/high가 가능 — 제외 시 단일 경보 → low
    expect(r.grade).toBe("low");
    expect(r.grade).not.toBe("std");
    expect(r.grade).not.toBe("high");
  });

  it("cesiumAlertToBundle no longer injects :geo scaffold", () => {
    const bundle = cesiumAlertToBundle({
      id: "nav-1",
      kind: "navarea",
      title: "NAVAREA",
      detail: "Naval warning",
      lat: 25,
      lng: 55,
    });
    expect(bundle.observations).toHaveLength(1);
    expect(bundle.independenceCount).toBe(1);
  });
});

describe("chokepointStressToBundle asset proxy", () => {
  it("does not let UKMTO + asset hint reach high without AIS stress", () => {
    const gate = gateChokepointStress({
      nameKo: "호르무즈",
      nameEn: "Hormuz",
      stress: {
        chokepointId: "choke-hormuz",
        grade: "watch",
        ukmtoCount: 2,
        hasAis: false,
        hasAssetHint: true,
        assetHint: "high",
      },
      lat: 26.5,
      lng: 56.25,
      disconfirmCorpus: [],
    });
    // 예전이면 asset-volatility가 독립 stat으로 잡혀 high까지 가능
    expect(gate.grade).not.toBe("high");
    expect(gate.grade).toBe("low");
    expect(canPublish("economy_alert", gate.grade)).toBe(false);
    expect(canPublish("watchboard", gate.grade)).toBe(true);
  });

  it("marks asset observation as non-independence", () => {
    const bundle = chokepointStressToBundle({
      nameKo: "수에즈",
      nameEn: "Suez",
      stress: {
        chokepointId: "choke-suez",
        grade: "watch",
        ukmtoCount: 1,
        hasAis: false,
        hasAssetHint: true,
        assetHint: "elevated",
      },
      lat: 30,
      lng: 32.5,
    });
    const asset = bundle.observations.find((o) =>
      o.id.endsWith(":asset"),
    );
    expect(asset?.countsTowardIndependence).toBe(false);
    expect(bundle.independenceCount).toBe(1);
    expect(bundle.modalityCount).toBe(1);
  });

  it("allows std/high only when AIS transit stress corroborates", () => {
    const gate = gateChokepointStress({
      nameKo: "호르무즈",
      nameEn: "Hormuz",
      stress: {
        chokepointId: "choke-hormuz",
        grade: "elevated",
        ukmtoCount: 2,
        hasAis: true,
        hasAssetHint: true,
        assetHint: "high",
      },
      lat: 26.5,
      lng: 56.25,
      disconfirmCorpus: [],
    });
    expect(["std", "high"]).toContain(gate.grade);
    expect(canPublish("economy_alert", gate.grade)).toBe(true);
  });

  it("returns queried:false when corpus is omitted", () => {
    const gate = gateCesiumAlert({
      id: "ukmto-2",
      kind: "ukmto",
      title: "UKMTO",
      detail: "approach",
      lat: 12,
      lng: 43,
    });
    expect(gate.bundle.disconfirmLog.queried).toBe(false);
    expect(gate.grade).toBe("low");
  });
});
