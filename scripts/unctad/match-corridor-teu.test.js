const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  geometricMean,
  matchUnctadCorridorTeu,
} = require("./match-corridor-teu");

describe("geometricMean", () => {
  it("returns null for empty", () => {
    assert.equal(geometricMean([]), null);
  });
  it("returns single value", () => {
    assert.equal(geometricMean([100]), 100);
  });
  it("is below arithmetic max (CHN does not drown)", () => {
    const g = geometricMean([2e8, 2e6]); // CHN-scale vs IRN-scale
    assert.ok(g != null);
    assert.ok(g < 2e8);
    assert.ok(g > 2e6);
    assert.ok(Math.abs(g - Math.sqrt(2e8 * 2e6)) < 1);
  });
});

describe("matchUnctadCorridorTeu phase 2", () => {
  const unctad = {
    countries: {
      CHN: { teu: 200_000_000 },
      IRN: { teu: 2_000_000 },
      RUS: { teu: 5_000_000 },
      KAZ: { teu: 1_000_000 },
    },
    corridorHardBind: {
      "instc-trans-caspian": { teu: 42_000, year: 2023, note: "test" },
    },
  };

  it("prefers hard-bind over country TEU", () => {
    const m = matchUnctadCorridorTeu(unctad, {
      corridorId: "instc-trans-caspian",
      endpointCountries: ["IRN", "RUS"],
      comtradePair: ["RUS", "IRN"],
    });
    assert.equal(m?.source, "unctad-hard-bind");
    assert.equal(m?.value, 42_000);
    assert.equal(m?.method, "hard-bind");
  });

  it("geoMeans comtradePair (not max CHN)", () => {
    const m = matchUnctadCorridorTeu(unctad, {
      corridorId: "china-iran-rail",
      endpointCountries: ["CHN", "KAZ", "IRN"],
      comtradePair: ["CHN", "IRN"],
    });
    assert.equal(m?.source, "unctad-cont-port-geomean");
    assert.equal(m?.method, "geoMean-pair");
    assert.deepEqual(m?.countriesUsed, ["CHN", "IRN"]);
    assert.ok(m.value < 200_000_000);
    assert.ok(Math.abs(m.value - Math.sqrt(200_000_000 * 2_000_000)) < 1);
  });

  it("falls back to endpoint geoMean when pair missing data", () => {
    const m = matchUnctadCorridorTeu(unctad, {
      corridorId: "kaz-rus",
      endpointCountries: ["KAZ", "RUS"],
      comtradePair: ["XXX", "YYY"],
    });
    assert.equal(m?.method, "geoMean-endpoints");
    assert.deepEqual(m?.countriesUsed, ["KAZ", "RUS"]);
  });

  it("single endpoint when only one has ContPort", () => {
    const m = matchUnctadCorridorTeu(unctad, {
      corridorId: "only-chn",
      endpointCountries: ["CHN", "XXX"],
      comtradePair: ["CHN", "XXX"],
    });
    assert.equal(m?.source, "unctad-cont-port-single");
    assert.equal(m?.value, 200_000_000);
  });

  it("returns null when no UNCTAD signal", () => {
    assert.equal(
      matchUnctadCorridorTeu(unctad, {
        corridorId: "none",
        endpointCountries: ["XXX"],
        comtradePair: ["YYY", "ZZZ"],
      }),
      null,
    );
  });
});
