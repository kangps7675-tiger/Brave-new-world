import { describe, expect, it } from "vitest";
import {
  CARTO_LABELS_ONLY_URL,
  GOOGLE_2D_ION_ASSET_ID,
} from "@/lib/cesiumGooglePlaceOverlay";

describe("cesiumGooglePlaceOverlay", () => {
  it("uses the documented Google 2D ion asset and CARTO labels fallback URL", () => {
    expect(GOOGLE_2D_ION_ASSET_ID).toBe("3830184");
    expect(CARTO_LABELS_ONLY_URL).toContain("light_only_labels");
    expect(CARTO_LABELS_ONLY_URL).toContain("{z}/{x}/{y}");
  });
});
