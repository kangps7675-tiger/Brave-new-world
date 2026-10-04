import { describe, expect, it } from "vitest";
import { allStraitReplayI18nStrings } from "@/lib/straitReplay/i18n";

const FORBIDDEN = /때문에|원인|예측|전망|추천|매수|매도/;

describe("strait replay i18n forbidden phrases", () => {
  it("contains none of the banned causal/investment words", () => {
    for (const s of allStraitReplayI18nStrings()) {
      expect(s, s).not.toMatch(FORBIDDEN);
    }
  });
});
