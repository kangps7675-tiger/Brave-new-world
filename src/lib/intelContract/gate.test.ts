import { describe, expect, it } from "vitest";
import { evaluateGate } from "@/lib/intelContract/gate";
import { canPublish } from "@/lib/intelContract/publish";
import { withComputedStats } from "@/lib/intelContract/bundleStats";
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
});
