import { describe, expect, it } from "vitest";
import { yearToOhmFilterDate } from "@/lib/historical/ohmConfig";

describe("yearToOhmFilterDate", () => {
  it("pads CE years", () => {
    expect(yearToOhmFilterDate(1939)).toBe("1939");
    expect(yearToOhmFilterDate(8)).toBe("0008");
  });

  it("maps year 0 to 1 CE", () => {
    expect(yearToOhmFilterDate(0)).toBe("0001");
  });

  it("emits negative BCE years", () => {
    expect(yearToOhmFilterDate(-500)).toBe("-0500");
  });
});
