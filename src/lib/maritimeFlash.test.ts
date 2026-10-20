import { describe, expect, it, beforeEach } from "vitest";
import {
  claimMaritimeFlash,
  resetMaritimeFlashClaimsForTests,
  wasMaritimeFlashClaimed,
  withMaritimeFlashTitle,
} from "./maritimeFlash";

describe("maritimeFlash", () => {
  beforeEach(() => {
    resetMaritimeFlashClaimsForTests();
  });

  it("claims once then rejects duplicates", () => {
    expect(claimMaritimeFlash("ukmto:1")).toBe(true);
    expect(wasMaritimeFlashClaimed("ukmto:1")).toBe(true);
    expect(claimMaritimeFlash("ukmto:1")).toBe(false);
    expect(claimMaritimeFlash("navarea:2")).toBe(true);
  });

  it("rejects empty id", () => {
    expect(claimMaritimeFlash("")).toBe(false);
  });

  it("prefixes flash titles", () => {
    expect(withMaritimeFlashTitle("UKMTO · Attack", "ko")).toBe(
      "해상 신속 속보 · UKMTO · Attack",
    );
    expect(withMaritimeFlashTitle("해상 신속 속보 · already", "ko")).toBe(
      "해상 신속 속보 · already",
    );
    expect(withMaritimeFlashTitle("Chokepoint", "en")).toBe("Maritime flash · Chokepoint");
  });
});
