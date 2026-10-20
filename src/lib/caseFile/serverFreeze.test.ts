import { beforeAll, describe, expect, it } from "vitest";
import {
  buildProvenEvidenceLink,
  evidenceHmacSecret,
  hashCanonicalJson,
  isServerProvenPayload,
  requiresServerProof,
  resolveFirmsQueryFromIncident,
  sealServerFrozenPayload,
  verifyServerProvenPayload,
  type ServerFrozenPayload,
  type ServerFrozenPayloadUnsigned,
} from "@/lib/caseFile/serverFreeze";
import { emptyIncident } from "@/lib/caseFile/types";

beforeAll(() => {
  process.env.CASE_EVIDENCE_HMAC_SECRET = "vitest-case-evidence-hmac";
  delete process.env.CASE_EDITOR_SECRET;
});

function unsigned(
  partial?: Partial<ServerFrozenPayloadUnsigned>,
): ServerFrozenPayloadUnsigned {
  return {
    serverProven: true,
    sourceKind: "firms",
    queriedAt: "2026-10-01T12:00:00.000Z",
    query: { lat: 1, lng: 2, radiusKm: 5 },
    resultHash: "abc123",
    resultCount: 1,
    results: { pick: { id: "f1" } },
    pickId: "f1",
    ...partial,
  };
}

function proven(
  partial?: Partial<ServerFrozenPayloadUnsigned>,
): ServerFrozenPayload {
  return sealServerFrozenPayload(unsigned(partial));
}

describe("serverFreeze helpers", () => {
  it("requiresServerProof for sensor kinds only", () => {
    expect(requiresServerProof("firms")).toBe(true);
    expect(requiresServerProof("neptun")).toBe(true);
    expect(requiresServerProof("tzeva-adom")).toBe(true);
    expect(requiresServerProof("ais")).toBe(true);
    expect(requiresServerProof("media")).toBe(false);
    expect(requiresServerProof("manual")).toBe(false);
  });

  it("isServerProvenPayload needs flag + hash + proofSig shape", () => {
    expect(isServerProvenPayload(proven())).toBe(true);
    expect(isServerProvenPayload({ serverProven: true })).toBe(false);
    expect(isServerProvenPayload({ resultHash: "x" })).toBe(false);
    expect(isServerProvenPayload({})).toBe(false);
  });

  it("rejects forged serverProven without valid HMAC", () => {
    const forged = {
      ...unsigned(),
      proofSig: "0".repeat(64),
    };
    expect(isServerProvenPayload(forged)).toBe(true);
    expect(verifyServerProvenPayload(forged)).toBe(false);
    expect(verifyServerProvenPayload(proven())).toBe(true);
  });

  it("rejects tampered results while keeping proofSig", () => {
    const sealed = proven({
      results: { pick: { id: "f1", lat: 1, lng: 2 } },
    });
    const tampered = {
      ...sealed,
      results: { pick: { id: "f1", lat: 99, lng: 99 } },
    };
    expect(verifyServerProvenPayload(tampered)).toBe(false);
  });

  it("evidenceHmacSecret ignores CASE_EDITOR_SECRET fallback", () => {
    const prev = process.env.CASE_EVIDENCE_HMAC_SECRET;
    delete process.env.CASE_EVIDENCE_HMAC_SECRET;
    process.env.CASE_EDITOR_SECRET = "editor-only";
    expect(evidenceHmacSecret()).toBeNull();
    process.env.CASE_EVIDENCE_HMAC_SECRET = prev;
    delete process.env.CASE_EDITOR_SECRET;
  });

  it("resolveFirmsQueryFromIncident uses case place/time not now", () => {
    const q = resolveFirmsQueryFromIncident(
      {
        place: {
          label: "Odessa",
          lat: 46.48,
          lng: 30.73,
          precision: "city",
          source: "gazetteer",
        },
        occurredAt: "2026-10-08T02:00:00.000Z",
        occurredAtSource: "body",
      },
      { radiusKm: 15 },
    );
    expect("error" in q).toBe(false);
    if ("error" in q) return;
    expect(q.lat).toBe(46.48);
    expect(q.lng).toBe(30.73);
    expect(q.fromDate).toBe("2026-10-07");
    expect(q.toDate).toBe("2026-10-08");
    expect(resolveFirmsQueryFromIncident(emptyIncident(), { radiusKm: 15 })).toEqual(
      expect.objectContaining({ error: expect.stringContaining("위치") }),
    );
  });

  it("hashCanonicalJson is stable for same object", () => {
    const a = hashCanonicalJson({ b: 1, a: 2 });
    const b = hashCanonicalJson({ b: 1, a: 2 });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("buildProvenEvidenceLink clamps FIRMS place to medium and sets commercialUse", () => {
    const link = buildProvenEvidenceLink({
      claimKind: "place",
      role: "supports",
      sourceKey: "firms:f1",
      payload: proven(),
      shows: "열점",
      limits: "주체 미확인",
      requestedStrength: "strong",
    });
    expect(link.strength).toBe("medium");
    expect(link.role).toBe("supports");
    expect(link.commercialUse).toBe("allowed");
    expect(verifyServerProvenPayload(link.frozenPayload)).toBe(true);
  });

  it("buildProvenEvidenceLink demotes FIRMS on actor to context", () => {
    const link = buildProvenEvidenceLink({
      claimKind: "actor",
      role: "supports",
      sourceKey: "firms",
      payload: proven(),
      shows: "열점",
      limits: "",
      requestedStrength: "strong",
    });
    expect(link.role).toBe("context");
    expect(link.strength).toBe("weak");
  });

  it("buildProvenEvidenceLink forces context when resultCount is 0", () => {
    const link = buildProvenEvidenceLink({
      claimKind: "place",
      role: "supports",
      sourceKey: "firms",
      payload: proven({ resultCount: 0, results: { hits: [] }, pickId: undefined }),
      shows: "",
      limits: "FIRMS 한계",
      requestedStrength: "medium",
    });
    expect(link.role).toBe("context");
    expect(link.strength).toBe("weak");
    expect(link.shows).toBe("해당 범위에 탐지 없음");
    expect(link.limits).toContain("탐지 없음");
  });

  it("buildProvenEvidenceLink clamps AIS place to medium and seals", () => {
    const link = buildProvenEvidenceLink({
      claimKind: "place",
      role: "supports",
      sourceKey: "ais:123456789",
      payload: proven({
        sourceKind: "ais",
        resultCount: 2,
        results: { pick: { mmsi: "123456789" } },
      }),
      shows: "AIS vessel",
      limits: "위치만",
      requestedStrength: "strong",
    });
    expect(link.strength).toBe("medium");
    expect(link.role).toBe("supports");
    expect(verifyServerProvenPayload(link.frozenPayload)).toBe(true);
  });
});
