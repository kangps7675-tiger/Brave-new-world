import { describe, expect, it } from "vitest";
import {
  buildSummitDiplomacyParagraphs,
  extractAgreementSnippet,
  extractSummitDiplomacyMeta,
  isSummitDiplomacyText,
} from "./summitDiplomacyFlash";

describe("summitDiplomacyFlash", () => {
  it("detects summit headlines", () => {
    expect(isSummitDiplomacyText("US-China summit opens in Geneva")).toBe(true);
    expect(isSummitDiplomacyText("한미 정상회담이 워싱턴에서 열렸다")).toBe(true);
    expect(isSummitDiplomacyText("Missile strike hits apartment block")).toBe(false);
  });

  it("extracts agreement sentence only when present", () => {
    const withDeal =
      "Leaders met in Geneva. They agreed to resume grain corridor talks next month. Markets rose.";
    expect(extractAgreementSnippet(withDeal)).toMatch(/agreed to resume grain/i);
    expect(extractAgreementSnippet("Leaders met in Geneva for talks.")).toBeNull();
  });

  it("builds bilateral + agreement paragraphs without inventing deals", () => {
    const meta = extractSummitDiplomacyMeta(
      "US and China bilateral summit. They signed a joint statement on fentanyl controls.",
      {
        active: null,
        passive: null,
        mentioned: ["United States", "China"],
      },
    );
    expect(meta.isSummit).toBe(true);
    expect(meta.format).toBe("bilateral");
    expect(meta.agreementSnippet).toMatch(/joint statement|signed/i);

    const paras = buildSummitDiplomacyParagraphs(meta, "en");
    expect(paras[0]).toMatch(/bilateral/i);
    expect(paras.some((p) => /Agreement-related wording/i.test(p))).toBe(true);
  });

  it("marks G7 as multilateral", () => {
    const meta = extractSummitDiplomacyMeta("G7 summit opens in Italy with Ukraine on agenda", {
      active: null,
      passive: null,
      mentioned: ["United States", "Japan", "NATO"],
    });
    expect(meta.format).toBe("multilateral");
    expect(meta.agreementSnippet).toBeNull();
    const paras = buildSummitDiplomacyParagraphs(meta, "ko");
    expect(paras[0]).toMatch(/다자/);
    expect(paras.length).toBe(1);
  });
});
