import { describe, expect, it } from "vitest";
import { hasBatchim, josa } from "@/lib/koreanJosa";

describe("koreanJosa", () => {
  it("detects batchim", () => {
    expect(hasBatchim("대만")).toBe(true);
    expect(hasBatchim("중국")).toBe(true);
    expect(hasBatchim("미국")).toBe(true);
    expect(hasBatchim("러시아")).toBe(false);
  });

  it("picks 이/가 and 을/를", () => {
    expect(josa("대만", "이/가")).toBe("대만이");
    expect(josa("러시아", "이/가")).toBe("러시아가");
    expect(josa("호르무즈", "을/를")).toBe("호르무즈를");
    expect(josa("대만", "을/를")).toBe("대만을");
  });

  it("handles 으로/로", () => {
    expect(josa("서울", "으로/로")).toBe("서울로");
    expect(josa("부산", "으로/로")).toBe("부산으로");
  });
});
