import { describe, expect, it } from "vitest";
import { US_CARRIERS_SEED } from "@/data/usCarriers";
import type { ShipMovementReportDraft } from "@/lib/shipMovements/types";
import { buildCarrierSnapshot, carrierBase } from "@/lib/usCarriers/buildSnapshot";

const seed = US_CARRIERS_SEED[0]!;
const other = US_CARRIERS_SEED[1]!;

function report(over: Partial<ShipMovementReportDraft>): ShipMovementReportDraft {
  return {
    id: "r",
    source: "usni-fleet-tracker",
    sourceLabel: "USNI News",
    url: "https://news.usni.org/x",
    title: "USNI News Fleet and Marine Tracker: Oct. 5, 2026",
    titleKo: "",
    titleEn: "",
    summaryKo: null,
    summaryEn: null,
    publishedAt: "2026-10-05T18:00:00.000Z",
    weekStart: null,
    contentHash: "h",
    rawExcerpt: "",
    ...over,
  } as ShipMovementReportDraft;
}

describe("buildCarrierSnapshot", () => {
  it("keeps previous positions for carriers not in this week's report", () => {
    const moved = { ...other, lat: 10, lng: 10, location: "prev", asOf: "2026-09-28T00:00:00.000Z" };
    const snap = buildCarrierSnapshot([moved], [report({ rawExcerpt: "nothing relevant" })], "rss");
    const kept = snap.carriers.find((c) => c.id === other.id)!;
    expect(kept.location).toBe("prev");
    expect(snap.updatedIds).toEqual([]);
  });

  it("applies reports oldest first so the newest wins, and stamps asOf", () => {
    const hull = seed.hull.replace(/\D/g, "");
    const older = report({
      url: "https://news.usni.org/old",
      publishedAt: "2026-09-28T18:00:00.000Z",
      rawExcerpt: `${seed.name} (CVN-${hull}) is operating in the Mediterranean Sea.`,
    });
    const newer = report({
      url: "https://news.usni.org/new",
      publishedAt: "2026-10-05T18:00:00.000Z",
      rawExcerpt: `${seed.name} (CVN-${hull}) is operating in the Red Sea.`,
    });
    const snap = buildCarrierSnapshot(null, [newer, older], "rss");
    const c = snap.carriers.find((x) => x.id === seed.id)!;
    expect(c.location).toBe("Red Sea");
    expect(c.asOf).toBe("2026-10-05T18:00:00.000Z");
    expect(c.evidenceUrl).toBe("https://news.usni.org/new");
    expect(snap.reportUrl).toBe("https://news.usni.org/new");
  });

  it("does not mark an open-sea carrier as home because of a neighbour's port wording", () => {
    const hull = seed.hull.replace(/\D/g, "");
    const r = report({
      rawExcerpt: `${seed.name} (CVN-${hull}) is in the South China Sea. Another carrier returned to homeport in San Diego.`,
    });
    const c = buildCarrierSnapshot(null, [r], "rss").carriers.find((x) => x.id === seed.id)!;
    expect(c.location).toBe("South China Sea");
    expect(c.status).toBe("deployed");
  });

  it("merges with the seed list", () => {
    expect(carrierBase(null)).toHaveLength(US_CARRIERS_SEED.length);
    expect(carrierBase([{ ...seed, id: "gone" }]).some((c) => c.id === "gone")).toBe(false);
  });
});
