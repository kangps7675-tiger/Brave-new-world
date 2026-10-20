import { describe, expect, it } from "vitest";
import { coerceBootViewerMode, coerceViewerMode } from "./viewerModePolicy";

describe("viewerModePolicy", () => {
  it("지정학 외 모드는 지정학으로, 위성은 명시 진입이라 유지", () => {
    expect(coerceViewerMode("economy", false)).toBe("conflict");
    expect(coerceViewerMode("history", false)).toBe("conflict");
    expect(coerceViewerMode("live", false)).toBe("conflict");
    expect(coerceViewerMode("satellite", false)).toBe("satellite");
    expect(coerceViewerMode("conflict", false)).toBe("conflict");
  });
  it("부팅은 항상 지정학", () => {
    expect(coerceBootViewerMode("satellite", false)).toBe("conflict");
    expect(coerceBootViewerMode("economy", false)).toBe("conflict");
  });
  it("lab에서는 그대로", () => {
    expect(coerceViewerMode("economy", true)).toBe("economy");
    expect(coerceBootViewerMode("satellite", true)).toBe("satellite");
  });
});
