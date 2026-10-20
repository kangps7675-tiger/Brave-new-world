import { describe, expect, it } from "vitest";
import {
  candidatesFromNewsLike,
  resolveDisconfirmLog,
  runDisconfirmPass,
} from "@/lib/intelContract/disconfirmPass";
import { conflictClusterToBundle } from "@/lib/intelContract/adapters/fromConflictCluster";
import type { ConflictEventCluster } from "@/lib/conflictEvents/types";

describe("runDisconfirmPass", () => {
  it("returns queried:false when corpus is omitted", () => {
    expect(runDisconfirmPass({ claimText: "Strike on Kharkiv" })).toEqual({
      queried: false,
      hitCount: 0,
    });
    expect(
      runDisconfirmPass({ claimText: "Strike", corpus: null }),
    ).toEqual({ queried: false, hitCount: 0 });
  });

  it("returns queried:true with zero hits on empty corpus", () => {
    expect(
      runDisconfirmPass({ claimText: "Strike on Kharkiv", corpus: [] }),
    ).toEqual({ queried: true, hitCount: 0 });
  });

  it("counts opposing / retract language", () => {
    const log = runDisconfirmPass({
      claimText: "Missile strike hit port",
      corpus: [
        {
          id: "a",
          text: "Officials denied the strike — false alarm, no attack",
          occurredAt: "2026-10-03T10:00:00Z",
        },
        {
          id: "b",
          text: "Port activity continues as normal",
          occurredAt: "2026-10-03T11:00:00Z",
        },
        {
          id: "c",
          text: "군 당국이 오보·정정 발표",
          occurredAt: "2026-10-03T12:00:00Z",
        },
      ],
      nowMs: Date.parse("2026-10-03T14:00:00Z"),
    });
    expect(log.queried).toBe(true);
    expect(log.hitCount).toBe(2);
    expect(log.hitIds).toEqual(expect.arrayContaining(["a", "c"]));
  });

  it("excludes claim source ids", () => {
    const log = runDisconfirmPass({
      claimText: "Attack",
      corpus: [
        { id: "src-1", text: "Officials denied the attack" },
        { id: "other", text: "Retracted earlier report of strike" },
      ],
      excludeIds: ["src-1"],
    });
    expect(log.hitCount).toBe(1);
    expect(log.hitIds).toEqual(["other"]);
  });
});

describe("resolveDisconfirmLog + adapters", () => {
  it("prefers explicit disconfirmLog over corpus", () => {
    const log = resolveDisconfirmLog({
      claimText: "x",
      disconfirmLog: { queried: true, hitCount: 9 },
      disconfirmCorpus: [],
    });
    expect(log.hitCount).toBe(9);
  });

  it("wires corpus into conflict cluster adapter", () => {
    const cluster: ConflictEventCluster = {
      clusterId: "c1",
      title: "Strike near Bakhmut",
      snippet: "Artillery strike",
      lat: 48.5,
      lng: 37.5,
      category: "airstrike",
      theater: "ukraine",
      keywords: ["strike"],
      firstSeenAt: "2026-10-03T10:00:00Z",
      lastConfirmedAt: "2026-10-03T11:00:00Z",
      confidence: "corroborated",
      trustTier: 1,
      heroStatus: "confirmed",
      matchedPlaceId: null,
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
    };
    const unset = conflictClusterToBundle(cluster);
    expect(unset.disconfirmLog.queried).toBe(false);

    const withHits = conflictClusterToBundle(cluster, {
      disconfirmCorpus: candidatesFromNewsLike([
        {
          id: "n1",
          title: "Kyiv denied the strike — report retracted",
          pubDate: "2026-10-03T12:00:00Z",
        },
      ]),
      nowMs: Date.parse("2026-10-03T14:00:00Z"),
    });
    expect(withHits.disconfirmLog.queried).toBe(true);
    expect(withHits.disconfirmLog.hitCount).toBeGreaterThan(0);
  });
});
