import { beforeAll, describe, expect, it } from "vitest";
import { sanitizeCaseFile } from "@/lib/caseFile/sanitizeEvidence";
import {
  sealServerFrozenPayload,
  type ServerFrozenPayload,
  type ServerFrozenPayloadUnsigned,
} from "@/lib/caseFile/serverFreeze";
import { strengthCapFor } from "@/lib/caseFile/strengthCaps";
import { evidenceSourceKind, mediaTierFromSourceKey } from "@/lib/caseFile/sourceKind";
import { evidence, refreshCaseVerdicts } from "@/lib/caseFile/verdict";
import type { CaseFile, CaseIncident, Claim } from "@/lib/caseFile/types";
import { emptyIncident } from "@/lib/caseFile/types";

beforeAll(() => {
  process.env.CASE_EVIDENCE_HMAC_SECRET = "vitest-case-evidence-hmac";
});

const INCIDENT_AT = "2026-10-01T12:00:00.000Z";

function anchoredIncident(overrides?: Partial<CaseIncident>): CaseIncident {
  return {
    place: { label: "기준점", lat: 0, lng: 0, precision: "point", source: "editor" },
    occurredAt: INCIDENT_AT,
    occurredAtSource: "editor",
    ...overrides,
  };
}

function baseCase(claims: Claim[], incident: CaseIncident = anchoredIncident()): CaseFile {
  return refreshCaseVerdicts({
    id: "c1",
    article: { text: "t" },
    eventType: "strike",
    incident,
    claims,
    verdict: "unconfirmed",
    rev: 1,
  });
}

/** 기준점(0,0 · INCIDENT_AT) 바로 옆 히트 — FIRMS/AIS는 pick, 공습은 threat */
function proven(
  sourceKind: ServerFrozenPayload["sourceKind"],
  partial?: Partial<ServerFrozenPayloadUnsigned>,
): ServerFrozenPayload {
  return sealServerFrozenPayload({
    serverProven: true,
    sourceKind,
    queriedAt: "2026-10-01T12:30:00.000Z",
    query: { lat: 0, lng: 0, radiusKm: 15 },
    resultHash: "",
    resultCount: 1,
    results: {
      pick: {
        id: "x",
        lat: 0.01,
        lng: 0.01,
        acqDate: "2026-10-01",
        acqTime: "1300",
        timestamp: "2026-10-01T13:00:00.000Z",
      },
      threat: { id: "t", lat: 0.01, lon: 0.01, sampledAt: "2026-10-01T12:20:00.000Z" },
    },
    ...partial,
  });
}

describe("strengthCapFor / media", () => {
  it("maps media sourceKey and tiers", () => {
    expect(evidenceSourceKind("media:1:reuters")).toBe("media");
    expect(mediaTierFromSourceKey("media:tier3:ria")).toBe(3);
    expect(strengthCapFor("neptun", "place")).toBe("weak");
    expect(strengthCapFor("neptun", "means")).toBe("medium");
    expect(strengthCapFor("firms", "actor")).toBeNull();
    expect(strengthCapFor("tzeva-adom", "time")).toBe("strong");
    expect(strengthCapFor("media", "place", 1)).toBe("medium");
    expect(strengthCapFor("media", "place", 3)).toBe("weak");
    expect(strengthCapFor("media", "actor", 1)).toBe("weak");
  });
});

describe("sanitizeCaseFile", () => {
  it("clamps NEPTUN strong→weak on place and overwrites commercialUse", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      baseCase([
        {
          id: "p",
          kind: "place",
          statement: "odesa",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "e1",
              sourceKey: "neptun:threat:1",
              role: "supports",
              strength: "strong",
              shows: "위협 좌표",
              limits: "",
              frozenPayload: proven("neptun"),
              commercialUse: "allowed",
            }),
          ],
        },
      ]),
    );
    const ev = caseFile.claims[0]!.evidence[0]!;
    expect(ev.strength).toBe("weak");
    expect(ev.commercialUse).toBe("license-required");
    expect(notes.some((n) => n.action === "clamped")).toBe(true);
    expect(notes.some((n) => n.action === "commercial_overwritten")).toBe(true);
    expect(caseFile.claims[0]!.verdict).toBe("partial");
  });

  it("demotes client-only sensor payload without serverProven", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      baseCase([
        {
          id: "p",
          kind: "place",
          statement: "p",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "e0",
              sourceKey: "firms",
              role: "supports",
              strength: "strong",
              shows: "열점",
              limits: "",
              frozenPayload: { lat: 1, lng: 2 },
            }),
          ],
        },
      ]),
    );
    const ev = caseFile.claims[0]!.evidence[0]!;
    expect(ev.role).toBe("context");
    expect(ev.strength).toBe("weak");
    expect(notes.some((n) => n.detail.includes("proofSig"))).toBe(true);
    expect(caseFile.claims[0]!.verdict).toBe("unconfirmed");
  });

  it("rejects forged serverProven + fake resultHash without HMAC", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      baseCase([
        {
          id: "p",
          kind: "place",
          statement: "p",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "forge",
              sourceKey: "firms",
              role: "supports",
              strength: "medium",
              shows: "가짜 열점",
              limits: "",
              frozenPayload: {
                serverProven: true,
                sourceKind: "firms",
                queriedAt: "2026-10-01T12:00:00.000Z",
                query: {},
                resultHash: "아무거나",
                resultCount: 1,
                results: { pick: { id: "fake" } },
                proofSig: "deadbeef".repeat(8),
              },
            }),
          ],
        },
      ]),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
    expect(notes.some((n) => n.detail.includes("proofSig"))).toBe(true);
    expect(caseFile.claims[0]!.verdict).toBe("unconfirmed");
  });

  it("demotes when signed sourceKind disagrees with sourceKey", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      baseCase([
        {
          id: "p",
          kind: "time",
          statement: "t",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "swap",
              sourceKey: "tzeva-adom:alert1",
              role: "supports",
              strength: "strong",
              shows: "경보",
              limits: "",
              frozenPayload: proven("firms"),
            }),
          ],
        },
      ]),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
    expect(notes.some((n) => n.detail.includes("sourceKind"))).toBe(true);
  });

  it("demotes forged AIS without valid HMAC", () => {
    const { caseFile } = sanitizeCaseFile(
      baseCase([
        {
          id: "p",
          kind: "place",
          statement: "red sea",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "ais-fake",
              sourceKey: "ais:999",
              role: "supports",
              strength: "medium",
              shows: "가짜 선박",
              limits: "",
              frozenPayload: {
                serverProven: true,
                sourceKind: "ais",
                queriedAt: "2026-10-01T12:00:00.000Z",
                query: {},
                resultHash: "fake",
                resultCount: 1,
                results: {},
                proofSig: "aa".repeat(32),
              },
            }),
          ],
        },
      ]),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
  });

  it("accepts sealed AIS supports on place", () => {
    const { caseFile } = sanitizeCaseFile(
      baseCase([
        {
          id: "p",
          kind: "place",
          statement: "red sea",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "ais-ok",
              sourceKey: "ais:123456789",
              role: "supports",
              strength: "strong",
              shows: "선박",
              limits: "",
              frozenPayload: proven("ais"),
            }),
          ],
        },
      ]),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("supports");
    expect(caseFile.claims[0]!.evidence[0]!.strength).toBe("medium");
  });

  it("demotes zero-hit server proven FIRMS supports to context", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      baseCase([
        {
          id: "p",
          kind: "place",
          statement: "p",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "z",
              sourceKey: "firms",
              role: "supports",
              strength: "medium",
              shows: "히트 0건",
              limits: "",
              frozenPayload: proven("firms", { resultCount: 0 }),
            }),
          ],
        },
      ]),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
    expect(caseFile.claims[0]!.verdict).toBe("unconfirmed");
    expect(notes.some((n) => n.detail.includes("0건"))).toBe(true);
  });

  it("demotes FIRMS on actor to context (forbidden)", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      baseCase([
        {
          id: "a",
          kind: "actor",
          statement: "russia",
          mapCheckable: false,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "e2",
              sourceKey: "firms",
              role: "supports",
              strength: "strong",
              shows: "열점",
              limits: "",
              frozenPayload: proven("firms"),
            }),
          ],
        },
      ]),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
    expect(notes.some((n) => n.action === "demoted_to_context")).toBe(true);
    expect(caseFile.claims[0]!.verdict).toBe("unconfirmed");
  });

  it("ignores media tier in sourceKey — classifies from URL host only", () => {
    // media:1 이어도 tass.com이면 Tier 3 → weak
    const forgedTier1 = sanitizeCaseFile(
      baseCase([
        {
          id: "t",
          kind: "time",
          statement: "t",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "m-fake1",
              sourceKey: "media:1:tass",
              role: "supports",
              strength: "strong",
              shows: "국영 보도",
              limits: "",
              frozenPayload: { outlet: "Reuters", url: "https://tass.com/x" },
            }),
          ],
        },
      ]),
    );
    expect(forgedTier1.caseFile.claims[0]!.evidence[0]!.strength).toBe("weak");

    // media:3 이어도 reuters.com이면 Tier 1 → medium
    const forgedTier3 = sanitizeCaseFile(
      baseCase([
        {
          id: "t",
          kind: "time",
          statement: "t",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "m-fake3",
              sourceKey: "media:3:reuters",
              role: "supports",
              strength: "strong",
              shows: "로이터",
              limits: "",
              frozenPayload: { outlet: "TASS", url: "https://reuters.com/x" },
            }),
          ],
        },
      ]),
    );
    expect(forgedTier3.caseFile.claims[0]!.evidence[0]!.strength).toBe("medium");
  });

  it("demotes media supports without URL even if outlet is Reuters", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      baseCase([
        {
          id: "t",
          kind: "time",
          statement: "t",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "m-name",
              sourceKey: "media:reuters",
              role: "supports",
              strength: "strong",
              shows: "로이터",
              limits: "",
              frozenPayload: { outlet: "Reuters" },
            }),
          ],
        },
      ]),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
    expect(notes.some((n) => n.detail.includes("URL"))).toBe(true);
  });

  it("demotes manual supports without url/image to context", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      baseCase([
        {
          id: "d",
          kind: "damage",
          statement: "d",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "man",
              sourceKey: "manual",
              role: "supports",
              strength: "medium",
              shows: "내가 봤음",
              limits: "",
              frozenPayload: {},
            }),
          ],
        },
      ]),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
    expect(notes.some((n) => n.action === "demoted_to_context")).toBe(true);
  });

  it("demotes satellite/photo without image to context", () => {
    const sat = sanitizeCaseFile(
      baseCase([
        {
          id: "p",
          kind: "place",
          statement: "p",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "sat",
              sourceKey: "satellite",
              role: "supports",
              strength: "strong",
              shows: "위성",
              limits: "",
              frozenPayload: {},
            }),
          ],
        },
      ]),
    );
    expect(sat.caseFile.claims[0]!.evidence[0]!.role).toBe("context");
    expect(sat.caseFile.claims[0]!.verdict).toBe("unconfirmed");
  });

  it("caps satellite strong→medium without before/after pair", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      baseCase([
        {
          id: "p",
          kind: "place",
          statement: "p",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "sat",
              sourceKey: "satellite",
              role: "supports",
              strength: "strong",
              shows: "위성 1장",
              limits: "",
              imageKey: "cases/c1/sat1.jpg",
              frozenPayload: { url: "https://example.com/sat.jpg" },
            }),
          ],
        },
      ]),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("supports");
    expect(caseFile.claims[0]!.evidence[0]!.strength).toBe("medium");
    expect(notes.some((n) => n.action === "clamped")).toBe(true);
  });

  it("allows satellite strong with before/after + dates", () => {
    const { caseFile } = sanitizeCaseFile(
      baseCase([
        {
          id: "p",
          kind: "place",
          statement: "p",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "sat",
              sourceKey: "satellite",
              role: "supports",
              strength: "strong",
              shows: "전후 위성",
              limits: "",
              imageKey: "cases/c1/after.jpg",
              frozenPayload: {
                beforeImageKey: "cases/c1/before.jpg",
                afterImageKey: "cases/c1/after.jpg",
                beforeDate: "2026-09-01",
                afterDate: "2026-09-15",
              },
            }),
          ],
        },
      ]),
    );
    expect(caseFile.claims[0]!.evidence[0]!.strength).toBe("strong");
  });

  it("caps photo strong→medium without geolocationMethod", () => {
    const { caseFile } = sanitizeCaseFile(
      baseCase([
        {
          id: "p",
          kind: "place",
          statement: "p",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              id: "ph",
              sourceKey: "photo",
              role: "supports",
              strength: "strong",
              shows: "현장 사진",
              limits: "",
              imageKey: "cases/c1/photo.jpg",
              frozenPayload: {},
            }),
          ],
        },
      ]),
    );
    expect(caseFile.claims[0]!.evidence[0]!.strength).toBe("medium");
  });

  it("does not let a single clamped NEPTUN confirm a place claim", () => {
    const { caseFile } = sanitizeCaseFile(
      baseCase([
        {
          id: "p",
          kind: "place",
          statement: "p",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [
            evidence({
              sourceKey: "neptun",
              role: "supports",
              strength: "strong",
              shows: "x",
              limits: "",
              frozenPayload: proven("neptun"),
            }),
          ],
        },
        {
          id: "ti",
          kind: "time",
          statement: "t",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [],
        },
        {
          id: "o",
          kind: "occurrence",
          statement: "o",
          mapCheckable: true,
          verdict: "unconfirmed",
          evidence: [],
        },
      ]),
    );
    expect(caseFile.claims.find((c) => c.kind === "place")?.verdict).toBe("partial");
    expect(caseFile.verdict).toBe("partial");
  });
});

function timeClaim(ev: ReturnType<typeof evidence>): Claim {
  return {
    id: "t",
    kind: "time",
    statement: "t",
    mapCheckable: true,
    verdict: "unconfirmed",
    evidence: [ev],
  };
}

describe("sanitizeCaseFile / 관련성 재검사", () => {
  it("re-demotes FIRMS outside ±12h even if the client flips it back to supports", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      baseCase([
        timeClaim(
          evidence({
            id: "late",
            sourceKey: "firms:x",
            role: "supports",
            strength: "medium",
            shows: "열점",
            limits: "",
            frozenPayload: proven("firms", {
              results: { pick: { id: "x", lat: 0.01, lng: 0.01, acqDate: "2026-10-03", acqTime: "0100" } },
            }),
          }),
        ),
      ]),
    );
    const ev = caseFile.claims[0]!.evidence[0]!;
    expect(ev.role).toBe("context");
    expect(ev.relevance?.timeDeltaMinutes).toBeGreaterThan(12 * 60);
    expect(notes.some((n) => n.detail.includes("±12h"))).toBe(true);
  });

  it("demotes existing sensor evidence when the incident anchor moves away", () => {
    const ev = evidence({
      id: "near",
      sourceKey: "firms:x",
      role: "supports",
      strength: "medium",
      shows: "열점",
      limits: "",
      frozenPayload: proven("firms"),
    });
    const before = sanitizeCaseFile(baseCase([timeClaim(ev)]));
    expect(before.caseFile.claims[0]!.evidence[0]!.role).toBe("supports");

    const moved = sanitizeCaseFile(
      baseCase(
        [timeClaim(before.caseFile.claims[0]!.evidence[0]!)],
        anchoredIncident({
          place: { label: "다른 도시", lat: 1, lng: 0, precision: "city", source: "editor" },
        }),
      ),
    );
    const after = moved.caseFile.claims[0]!.evidence[0]!;
    expect(after.role).toBe("context");
    expect(after.relevance?.distanceKm).toBeGreaterThan(100);
    expect(moved.notes.some((n) => n.detail.includes("반경"))).toBe(true);
  });

  it("demotes sensor evidence when the case has no anchor", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      baseCase(
        [
          timeClaim(
            evidence({
              sourceKey: "firms:x",
              role: "supports",
              strength: "medium",
              shows: "열점",
              limits: "",
              frozenPayload: proven("firms"),
            }),
          ),
        ],
        emptyIncident(),
      ),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
    expect(notes.some((n) => n.detail.includes("미설정"))).toBe(true);
  });

  it("demotes when the hit time is unknown", () => {
    const { caseFile, notes } = sanitizeCaseFile(
      baseCase([
        timeClaim(
          evidence({
            sourceKey: "firms:x",
            role: "supports",
            strength: "medium",
            shows: "열점",
            limits: "",
            frozenPayload: proven("firms", {
              results: { pick: { id: "x", lat: 0.01, lng: 0.01, acqDate: null } },
            }),
          }),
        ),
      ]),
    );
    expect(caseFile.claims[0]!.evidence[0]!.role).toBe("context");
    expect(notes.some((n) => n.detail.includes("시각 미상"))).toBe(true);
  });

  it("checks alert intervals against the incident time (Tzeva Adom)", () => {
    const alertPayload = proven("tzeva-adom", {
      results: {
        threat: null,
        alert: {
          id: "a1",
          startedAt: "2026-10-01T11:00:00.000Z",
          endedAt: "2026-10-01T11:30:00.000Z",
          distanceKm: 3,
        },
      },
    });
    const ev = evidence({
      sourceKey: "tzeva-adom:a1",
      role: "supports",
      strength: "strong",
      shows: "경보",
      limits: "",
      frozenPayload: alertPayload,
    });

    const inside = sanitizeCaseFile(baseCase([timeClaim(ev)]));
    expect(inside.caseFile.claims[0]!.evidence[0]!.role).toBe("supports");
    expect(inside.caseFile.claims[0]!.verdict).toBe("confirmed");

    const outside = sanitizeCaseFile(
      baseCase([timeClaim(ev)], anchoredIncident({ occurredAt: "2026-10-01T18:00:00.000Z" })),
    );
    expect(outside.caseFile.claims[0]!.evidence[0]!.role).toBe("context");
  });

  it("replaces a stale relevance summary inside shows", () => {
    const stale = {
      distanceKm: 99,
      timeDeltaMinutes: 0,
      summary: "사건 지점에서 99km",
    };
    const { caseFile } = sanitizeCaseFile(
      baseCase([
        timeClaim({
          ...evidence({
            sourceKey: "firms:x",
            role: "context",
            strength: "weak",
            shows: `열점 (${stale.summary})`,
            limits: "",
            frozenPayload: proven("firms"),
          }),
          relevance: stale,
        }),
      ]),
    );
    const ev = caseFile.claims[0]!.evidence[0]!;
    expect(ev.relevance?.distanceKm).toBeLessThan(5);
    expect(ev.shows).not.toContain("99km");
    expect(ev.shows).toContain(ev.relevance!.summary);
  });

  it("normalizes the incident anchor before checking", () => {
    const { caseFile } = sanitizeCaseFile(
      baseCase([], {
        place: { label: "x", lat: 120, lng: 0, precision: "point", source: "editor" },
        occurredAt: "not a date",
        occurredAtSource: "body",
      }),
    );
    expect(caseFile.incident.place).toBeNull();
    expect(caseFile.incident.occurredAt).toBeNull();
    expect(caseFile.incident.occurredAtSource).toBe("none");
  });
});
