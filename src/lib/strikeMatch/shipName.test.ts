import { describe, expect, it } from "vitest";
import { extractShipName } from "./shipName";

describe("extractShipName", () => {
  it("MV·M/V·MT 접두어", () => {
    expect(extractShipName("Houthis claim attack on MV Tutor in the Red Sea")).toBe("Tutor");
    expect(extractShipName("The Liberian-flagged M/V ETERNITY C was struck")).toBe("ETERNITY C");
    expect(extractShipName("MT Sounion ablaze after attack")).toBe("Sounion");
  });
  it("따옴표 표기", () => {
    expect(extractShipName("the tanker 'Delta Sounion' reported a fire")).toBe("Delta Sounion");
  });
  it("이름이 없으면 null", () => {
    expect(
      extractShipName("UKMTO has received a report of an incident 85NM east of Aden. The Master of a merchant vessel reports an explosion."),
    ).toBeNull();
    expect(extractShipName(null)).toBeNull();
  });
});
