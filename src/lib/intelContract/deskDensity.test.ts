import { describe, expect, it } from "vitest";
import type { ConflictEventCluster } from "@/lib/conflictEvents/types";
import { buildObserveWatchboard } from "@/lib/intelContract/buildObserveWatchboard";
import { pirModalityStatus } from "@/lib/intelContract/pirRegistry";
import { PIR_REGISTRY } from "@/lib/intelContract/pirRegistry";
import {
  canonForTheater,
  canonGaps,
  formatCanonGapNote,
} from "@/lib/intelContract/theaterCanonSources";
import { whyPublishLines } from "@/lib/intelContract/whyPublish";
import { evaluateGate } from "@/lib/intelContract/gate";
import { withComputedStats } from "@/lib/intelContract/bundleStats";

describe("pirModalityStatus", () => {
  it("splits need / have / missing", () => {
    const pir = PIR_REGISTRY.find((p) => p.id === "pir-ukraine-72h");
    expect(pir).toBeTruthy();
    const status = pirModalityStatus(pir!, ["media"]);
    expect(status.present).toEqual(["media"]);
    expect(status.missing).toContain("sensor");
    expect(status.score).toBeLessThan(1);
  });
});

describe("theaterCanonSources", () => {
  it("lists curated channels for ukraine", () => {
    const canon = canonForTheater("ukraine");
    expect(canon?.channels.length).toBeGreaterThanOrEqual(3);
    const gaps = canonGaps(canon!, ["media"]);
    expect(gaps.some((g) => g.modality === "sensor")).toBe(true);
    expect(formatCanonGapNote(gaps, "ko")).toMatch(/비어/);
  });
});

describe("buildObserveWatchboard clusters", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");

  function cluster(
    partial: Partial<ConflictEventCluster> &
      Pick<ConflictEventCluster, "clusterId" | "title" | "sources">,
  ): ConflictEventCluster {
    return {
      lat: 48.5,
      lng: 37.5,
      category: "airstrike",
      theater: "ukraine",
      keywords: ["strike"],
      snippet: "test",
      firstSeenAt: "2026-10-03T10:00:00Z",
      lastConfirmedAt: "2026-10-03T11:00:00Z",
      confidence: "corroborated",
      trustTier: 1,
      heroStatus: "confirmed",
      matchedPlaceId: null,
      ...partial,
    };
  }

  it("admits corroborated clusters into the board", () => {
    const items = buildObserveWatchboard({
      liveuaEvents: [],
      rssItems: [],
      cesiumAlerts: [],
      conflictClusters: [
        cluster({
          clusterId: "c1",
          title: "Strike near Bakhmut",
          confidence: "corroborated",
          sources: [
            {
              id: "s1",
              name: "Reuters",
              url: "https://www.reuters.com/a",
              title: "Strike",
              occurredAt: "2026-10-03T10:00:00Z",
              trustTier: 1,
              channel: "rss",
            },
            {
              id: "s2",
              name: "AP",
              url: "https://apnews.com/b",
              title: "Strike",
              occurredAt: "2026-10-03T10:30:00Z",
              trustTier: 1,
              channel: "rss",
            },
          ],
        }),
      ],
      lang: "ko",
      windowHours: 72,
      nowMs: now,
    });
    const row = items.find((i) => i.clusterId === "c1");
    expect(row).toBeTruthy();
    expect(row!.kind === "conflict-cluster" || row!.kind === "hold").toBe(true);
    expect(row!.pirStatuses.length).toBeGreaterThan(0);
  });

  it("drops clusters outside the 72h window", () => {
    const items = buildObserveWatchboard({
      liveuaEvents: [],
      rssItems: [],
      cesiumAlerts: [],
      conflictClusters: [
        cluster({
          clusterId: "old",
          title: "Old event",
          lastConfirmedAt: "2026-09-01T00:00:00Z",
          firstSeenAt: "2026-09-01T00:00:00Z",
          sources: [
            {
              id: "s1",
              name: "Reuters",
              url: null,
              title: "Old",
              occurredAt: "2026-09-01T00:00:00Z",
              trustTier: 1,
              channel: "rss",
            },
            {
              id: "s2",
              name: "AP",
              url: null,
              title: "Old",
              occurredAt: "2026-09-01T01:00:00Z",
              trustTier: 1,
              channel: "rss",
            },
          ],
        }),
      ],
      windowHours: 72,
      nowMs: now,
    });
    expect(items.some((i) => i.clusterId === "old")).toBe(false);
  });
});

describe("whyPublishLines", () => {
  it("returns three desk lines", () => {
    const gate = evaluateGate(
      withComputedStats({
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
        observations: [
          {
            id: "1",
            modality: "media",
            sourceKey: "reuters.com",
            trustTier: 1,
            occurredAt: "2026-10-03T00:00:00Z",
            payloadRef: "1",
          },
          {
            id: "2",
            modality: "sensor",
            sourceKey: "firms",
            occurredAt: "2026-10-03T01:00:00Z",
            payloadRef: "2",
          },
        ],
      }),
    );
    const lines = whyPublishLines(gate, [], "ko");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("주장");
    expect(lines[1]).toMatch(/출처|맞춰|얇|모으/);
  });
});
