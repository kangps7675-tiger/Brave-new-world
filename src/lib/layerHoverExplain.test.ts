import { describe, expect, it } from "vitest";
import {
  explainLayer,
  layerIdFromPathKind,
  layerIdFromStaticKind,
  withLayerExplain,
} from "@/lib/layerHoverExplain";
import type { HoverCard } from "@/components/globe/types";

describe("layerHoverExplain", () => {
  it("maps pipeline and cable path kinds", () => {
    expect(layerIdFromPathKind("oil-pipeline")).toBe("oil-pipelines");
    expect(layerIdFromPathKind("gas-pipeline")).toBe("gas-pipelines");
    expect(layerIdFromPathKind("subsea-pipeline")).toBe("subsea-pipelines");
    expect(layerIdFromPathKind("submarine-cable")).toBe("submarine-cables");
    expect(layerIdFromPathKind("shipping-lane")).toBe("trade-routes");
    expect(layerIdFromPathKind("axis-link")).toBe("axis-network");
  });

  it("maps static kinds including GEM", () => {
    expect(layerIdFromStaticKind("military-base")).toBe("military-bases");
    expect(layerIdFromStaticKind("gem-coal-plant")).toBe("gem-facilities");
    expect(layerIdFromStaticKind("lng-terminal")).toBe("lng-terminals");
  });

  it("explains carriers in plain Korean with acronyms expanded", () => {
    const text = explainLayer("us-carriers", "ko");
    expect(text).toBeTruthy();
    expect(text!).toContain("USNI");
    expect(text!).toContain("실시간");
  });

  it("fills empty body on hover card", () => {
    const card: HoverCard = {
      kind: "path",
      title: "Test pipe",
      detail: "송유관 (GEM)",
    };
    const next = withLayerExplain(card, "oil-pipelines", "ko");
    expect(next.body).toBeTruthy();
    expect(next.body!).toContain("GEM");
  });

  it("does not overwrite existing body", () => {
    const card: HoverCard = {
      kind: "path",
      title: "Axis",
      detail: "축",
      body: "이미 있는 설명",
    };
    const next = withLayerExplain(card, "axis-network", "ko");
    expect(next.body).toBe("이미 있는 설명");
  });
});
