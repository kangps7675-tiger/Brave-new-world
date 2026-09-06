import { describe, expect, it } from "vitest";
import { US_CARRIERS_SEED } from "@/data/usCarriers";
import {
  applyCarrierPatches,
  extractCarrierPatchesFromText,
} from "@/lib/usCarriers/fromUsniNews";

describe("extractCarrierPatchesFromText", () => {
  it("moves Abraham Lincoln toward Thailand when Fleet Tracker says so", () => {
    const text = `
USNI News Fleet and Marine Tracker: Aug. 31, 2026
The Abraham Lincoln Carrier Strike Group transited the Singapore Strait eastbound.
The carrier is expected to make a port visit to Laem Chabang, Thailand, this week.
Aircraft carrier USS Abraham Lincoln (CVN-72), homeported at Naval Air Station North Island.
`;
    const patches = extractCarrierPatchesFromText(text, {
      evidenceUrl: "https://news.usni.org/example",
      asOfLabel: "Aug 31 tracker",
    });
    const lincoln = patches.find((p) => p.id === "cvn-72");
    expect(lincoln).toBeTruthy();
    expect(lincoln!.location.toLowerCase()).toMatch(/thailand|laem|singapore|malacca/);
    expect(lincoln!.status).toBe("deployed");
    expect(lincoln!.lat).toBeGreaterThan(0);
    expect(lincoln!.lng).toBeGreaterThan(90);
  });

  it("marks Vinson as underway near California", () => {
    const text = `
Aircraft carrier USS Carl Vinson (CVN-70) is underway conducting routine operations near California in the Eastern Pacific.
`;
    const patches = extractCarrierPatchesFromText(text);
    const vinson = patches.find((p) => p.id === "cvn-70");
    expect(vinson).toBeTruthy();
    expect(vinson!.status).toBe("deployed");
    expect(vinson!.lng).toBeLessThan(-100);
  });

  it("applies patches onto seed without dropping other hulls", () => {
    const patches = extractCarrierPatchesFromText(
      "USS Theodore Roosevelt remains in San Diego preparing for deployment. CVN-71 at North Island.",
    );
    const { carriers, updatedIds } = applyCarrierPatches(US_CARRIERS_SEED, patches);
    expect(carriers).toHaveLength(US_CARRIERS_SEED.length);
    expect(updatedIds).toContain("cvn-71");
    const tr = carriers.find((c) => c.id === "cvn-71")!;
    expect(tr.location.toLowerCase()).toContain("san diego");
  });
});
