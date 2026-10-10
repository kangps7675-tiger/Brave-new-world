import { describe, expect, it } from "vitest";
import {
  deriveInvestigationStep,
  investigationStepProgress,
} from "@/lib/caseFile/investigationSteps";
import type { CaseFile } from "@/lib/caseFile/types";
import { emptyIncident } from "@/lib/caseFile/types";

function baseCase(partial: Partial<CaseFile> = {}): CaseFile {
  return {
    id: "case_test",
    rev: 1,
    title: "t",
    eventType: "strike",
    article: { text: "" },
    incident: emptyIncident(),
    claims: [],
    verdict: "unconfirmed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe("deriveInvestigationStep", () => {
  it("starts at paste without a case", () => {
    expect(deriveInvestigationStep(null)).toBe("paste");
  });

  it("asks for extract when anchor missing", () => {
    expect(deriveInvestigationStep(baseCase())).toBe("extract");
  });

  it("asks for find when anchor set but no support", () => {
    const cf = baseCase({
      incident: {
        place: {
          label: "X",
          lat: 1,
          lng: 2,
          precision: "city",
          source: "editor",
        },
        occurredAt: "2026-01-01T00:00:00.000Z",
        occurredAtSource: "editor",
      },
    });
    expect(deriveInvestigationStep(cf)).toBe("find");
  });
});

describe("investigationStepProgress", () => {
  it("marks paste done when a case exists", () => {
    const p = investigationStepProgress(baseCase());
    expect(p.paste).toBe("done");
    expect(p.extract).toBe("active");
  });
});
