import { describe, expect, it } from "vitest";
import { severityColor } from "@/lib/newfeeds";
import {
  theaterIntensityFromGdeltGrade,
  ukraineTheaterIntensityColor,
} from "@/lib/theaterIntensityRadius";

describe("ukraineTheaterIntensityColor — 전쟁소식 빨간 채널", () => {
  it("이란 NewFeeds severityColor와 동일 팔레트", () => {
    for (const sev of ["major", "high", "medium", "low"] as const) {
      expect(ukraineTheaterIntensityColor(sev)).toBe(severityColor(sev));
    }
  });

  it("시안 계열을 쓰지 않는다", () => {
    expect(ukraineTheaterIntensityColor("major")).not.toMatch(/14,\s*165,\s*233/);
    expect(ukraineTheaterIntensityColor("high")).not.toMatch(/56,\s*189,\s*248/);
  });

  it("GDELT S/A → major/high", () => {
    expect(theaterIntensityFromGdeltGrade("S", true)).toBe("major");
    expect(theaterIntensityFromGdeltGrade("A", false)).toBe("high");
  });
});
