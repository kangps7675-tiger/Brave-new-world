import { describe, expect, it } from "vitest";
import { buildSoftEvidenceLink } from "@/lib/caseFile/softEvidence";

describe("buildSoftEvidenceLink", () => {
  it("requires http URL for media", () => {
    expect(
      buildSoftEvidenceLink({
        kind: "media",
        claimKind: "time",
        role: "supports",
        outlet: "Reuters",
      }),
    ).toEqual(expect.objectContaining({ error: expect.stringContaining("URL") }));
  });

  it("tiers Reuters by URL host", () => {
    const link = buildSoftEvidenceLink({
      kind: "media",
      claimKind: "time",
      role: "supports",
      url: "https://www.reuters.com/world/example",
      outlet: "Anything",
      requestedStrength: "strong",
    });
    expect("error" in link).toBe(false);
    if ("error" in link) return;
    expect(link.sourceKey).toContain("reuters");
    expect(link.strength).toBe("medium");
    expect((link.frozenPayload as { tier: number }).tier).toBe(1);
  });

  it("requires image for photo supports", () => {
    expect(
      buildSoftEvidenceLink({
        kind: "photo",
        claimKind: "place",
        role: "supports",
      }),
    ).toEqual(expect.objectContaining({ error: expect.stringContaining("이미지") }));
  });

  it("builds satellite with before/after", () => {
    const link = buildSoftEvidenceLink({
      kind: "satellite",
      claimKind: "place",
      role: "supports",
      beforeUrl: "https://example.com/before.jpg",
      afterUrl: "https://example.com/after.jpg",
      beforeDate: "2026-10-07",
      afterDate: "2026-10-09",
      requestedStrength: "strong",
    });
    expect("error" in link).toBe(false);
    if ("error" in link) return;
    expect(link.strength).toBe("strong");
  });
});
