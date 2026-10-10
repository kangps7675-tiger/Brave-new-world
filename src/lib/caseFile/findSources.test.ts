import { beforeAll, describe, expect, it } from "vitest";
import { sanitizeCaseFile } from "@/lib/caseFile/sanitizeEvidence";
import {
  sealServerFrozenPayload,
  type ServerFrozenPayload,
  type ServerFrozenPayloadUnsigned,
} from "@/lib/caseFile/serverFreeze";
import { evidenceSourceKind } from "@/lib/caseFile/sourceKind";
import { commercialUseForSourceKey } from "@/lib/caseFile/commercialUse";
import { strengthCapFor } from "@/lib/caseFile/strengthCaps";
import { findTrackGaps } from "@/lib/caseFile/trackFreeze";
import { classifyFacility, toNearbyFacilities } from "@/lib/caseFile/nearbyFacilities";
import { pickSnapshotFor, pointInPolygonGeometry } from "@/lib/caseFile/controlZone";
import { evidence, refreshCaseVerdicts } from "@/lib/caseFile/verdict";
import type { CaseFile, CaseIncident, Claim, ClaimKind } from "@/lib/caseFile/types";

beforeAll(() => {
  process.env.CASE_EVIDENCE_HMAC_SECRET = "vitest-case-evidence-hmac";
});

const INCIDENT_AT = "2026-10-01T12:00:00.000Z";

function incident(overrides?: Partial<CaseIncident>): CaseIncident {
  return {
    place: { label: "기준점", lat: 0, lng: 0, precision: "point", source: "editor" },
    occurredAt: INCIDENT_AT,
    occurredAtSource: "editor",
    ...overrides,
  };
}

function caseWith(kind: ClaimKind, ev: ReturnType<typeof evidence>, inc = incident()): CaseFile {
  const claim: Claim = {
    id: "c",
    kind,
    statement: "s",
    mapCheckable: true,
    verdict: "unconfirmed",
    evidence: [ev],
  };
  return refreshCaseVerdicts({
    id: "case",
    article: { text: "t" },
    eventType: "strike",
    incident: inc,
    claims: [claim],
    verdict: "unconfirmed",
    rev: 1,
  });
}

function sealed(
  sourceKind: ServerFrozenPayload["sourceKind"],
  partial: Partial<ServerFrozenPayloadUnsigned>,
): ServerFrozenPayload {
  return sealServerFrozenPayload({
    serverProven: true,
    sourceKind,
    queriedAt: "2026-10-20T00:00:00.000Z",
    query: { lat: 0, lng: 0, radiusKm: 15 },
    resultHash: "",
    resultCount: 1,
    results: {},
    ...partial,
  });
}

function satellitePayload(overrides?: Record<string, unknown>, count = 2): ServerFrozenPayload {
  return sealed("satellite", {
    query: { lat: 0, lng: 0, radiusKm: 2.5 },
    resultCount: count,
    results: {
      mode: "optical",
      chipRadiusKm: 2.5,
      cloudBlocked: false,
      before: { sceneId: "b", datetime: "2026-09-25T10:00:00.000Z", imageKey: "k/b.png" },
      after: { sceneId: "a", datetime: "2026-10-03T10:00:00.000Z", imageKey: "k/a.png" },
      ...overrides,
    },
  });
}

function sat(payload: ServerFrozenPayload) {
  return evidence({
    id: "s",
    sourceKey: "sentinel-2:a",
    role: "supports",
    strength: "strong",
    shows: "전후",
    limits: "",
    imageKey: "k/a.png",
    frozenPayload: payload,
  });
}

describe("새 근거 종류 판별·사용권", () => {
  it("maps source keys to kinds", () => {
    expect(evidenceSourceKind("adsb:ae1234")).toBe("adsb");
    expect(evidenceSourceKind("control-zone:812")).toBe("control-zone");
    expect(evidenceSourceKind("facility:way/123")).toBe("facility");
    expect(evidenceSourceKind("sentinel-1:S1A_x")).toBe("satellite");
  });

  it("assigns commercial use", () => {
    expect(commercialUseForSourceKey("sentinel-2:abc")).toBe("allowed");
    expect(commercialUseForSourceKey("facility:node/1")).toBe("allowed");
    expect(commercialUseForSourceKey("adsb:ae1234")).toBe("license-required");
    expect(commercialUseForSourceKey("control-zone:1")).toBe("license-required");
  });

  it("rejects unsigned new sensor payloads", () => {
    const { caseFile } = sanitizeCaseFile(
      caseWith(
        "means",
        evidence({
          id: "x",
          sourceKey: "adsb:ae1",
          role: "supports",
          strength: "medium",
          shows: "",
          limits: "",
          frozenPayload: { serverProven: true, sourceKind: "adsb", resultCount: 1 },
        }),
      ),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
  });
});

describe("위성 전후 (서버 서명)", () => {
  it("keeps strong when the pair brackets the incident at the anchor", () => {
    const { caseFile } = sanitizeCaseFile(caseWith("damage", sat(satellitePayload())));
    const ev = caseFile.claims[0]!.evidence[0]!;
    expect(ev.role).toBe("supports");
    expect(ev.strength).toBe(strengthCapFor("satellite", "damage"));
  });

  it("demotes when the anchor moves outside the image", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      caseWith(
        "damage",
        sat(satellitePayload()),
        incident({ place: { label: "x", lat: 0.1, lng: 0, precision: "point", source: "editor" } }),
      ),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
    expect(notes.some((n) => n.detail.includes("영상 영역"))).toBe(true);
  });

  it("demotes when the incident is not between before and after", () => {
    const { caseFile } = sanitizeCaseFile(
      caseWith("damage", sat(satellitePayload()), incident({ occurredAt: "2026-10-05T00:00:00.000Z" })),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
  });

  it("demotes cloud-blocked results", () => {
    const { caseFile } = sanitizeCaseFile(
      caseWith("damage", sat(satellitePayload({ mode: "none", before: null, after: null, cloudBlocked: true }, 0))),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
  });
});

describe("선박 신호 끊김", () => {
  it("finds a gap covering the incident", () => {
    const gaps = findTrackGaps(
      [
        { sampledAt: "2026-10-01T09:00:00.000Z" },
        { sampledAt: "2026-10-01T15:00:00.000Z" },
      ] as Parameters<typeof findTrackGaps>[0],
      INCIDENT_AT,
    );
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.coversIncident).toBe(true);
  });

  it("clamps AIS to weak when a gap covers the incident", () => {
    const payload = sealed("ais", {
      results: {
        pick: { id: "1", lat: 0.01, lng: 0.01, timestamp: "2026-10-01T13:00:00.000Z" },
        gaps: [{ fromIso: "2026-10-01T10:00:00.000Z", toIso: "2026-10-01T13:00:00.000Z", minutes: 180, coversIncident: true }],
      },
    });
    const { caseFile } = sanitizeCaseFile(
      caseWith(
        "place",
        evidence({
          id: "a",
          sourceKey: "ais:1",
          role: "supports",
          strength: "medium",
          shows: "",
          limits: "",
          frozenPayload: payload,
        }),
      ),
    );
    const ev = caseFile.claims[0]!.evidence[0]!;
    expect(ev.strength).toBe("weak");
    expect(ev.limits).toContain("신호 끊김");
  });
});

describe("통제 구역·시설", () => {
  const zoneEvidence = () =>
    evidence({
      id: "z",
      sourceKey: "control-zone:1",
      role: "supports",
      strength: "weak",
      shows: "",
      limits: "",
      frozenPayload: sealed("control-zone", {
        query: { lat: 0, lng: 0, radiusKm: 0 },
        results: {
          status: "occupied",
          snapshot: { id: 1, datetime: "2026-09-29T00:00:00.000Z" },
          lat: 0,
          lng: 0,
        },
      }),
    });

  it("accepts a recent snapshot at the anchor for actor claims", () => {
    const { caseFile } = sanitizeCaseFile(caseWith("actor", zoneEvidence()));
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("supports");
  });

  it("demotes when the anchor moved", () => {
    const { caseFile } = sanitizeCaseFile(
      caseWith("actor", zoneEvidence(), incident({ place: { label: "x", lat: 0.05, lng: 0, precision: "point", source: "editor" } })),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
  });

  it("does not require a time for facilities", () => {
    const payload = sealed("facility", {
      query: { lat: 0, lng: 0, radiusKm: 5 },
      results: { pick: { osmId: "way/1", lat: 0.01, lng: 0, distanceKm: 1.1 } },
    });
    const { caseFile } = sanitizeCaseFile(
      caseWith(
        "place",
        evidence({
          id: "f",
          sourceKey: "facility:way/1",
          role: "supports",
          strength: "medium",
          shows: "",
          limits: "",
          frozenPayload: payload,
        }),
      ),
    );
    const ev = caseFile.claims[0]!.evidence[0]!;
    expect(ev.role).toBe("supports");
    expect(ev.strength).toBe("weak");
  });

  it("classifies OSM tags and sorts by distance", () => {
    expect(classifyFacility({ industrial: "refinery" })).toBe("fuel");
    expect(classifyFacility({ landuse: "military" })).toBe("military");
    expect(classifyFacility({ amenity: "cafe" })).toBeNull();
    const out = toNearbyFacilities(
      [
        { type: "way", id: 1, center: { lat: 0.02, lon: 0 }, tags: { power: "substation" } },
        { type: "node", id: 2, lat: 0.005, lon: 0, tags: { aeroway: "aerodrome", name: "AB" } },
        { type: "node", id: 3, lat: 1, lon: 0, tags: { military: "base" } },
      ],
      { lat: 0, lng: 0 },
      5,
    );
    expect(out.map((f) => f.osmId)).toEqual(["node/2", "way/1"]);
  });

  it("picks the latest snapshot at or before the incident", () => {
    const pick = pickSnapshotFor(
      [
        { id: 1, datetime: "2026-09-20T00:00:00.000Z" },
        { id: 2, datetime: "2026-09-30T00:00:00.000Z" },
        { id: 3, datetime: "2026-10-02T00:00:00.000Z" },
      ] as Parameters<typeof pickSnapshotFor>[0],
      INCIDENT_AT,
    );
    expect(pick?.id).toBe(2);
  });

  it("tests point in polygon", () => {
    const square = {
      type: "Polygon" as const,
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    };
    expect(pointInPolygonGeometry(0.5, 0.5, square)).toBe(true);
    expect(pointInPolygonGeometry(1.5, 0.5, square)).toBe(false);
  });
});
