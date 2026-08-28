/**
 * UNCTAD ContPortThroughput (country TEU) → corridor proxy (phase 2 matching).
 *
 * ContPort is official but country-aggregated. It is NOT bilateral corridor volume.
 * Use this matcher instead of raw max(endpointCountries) so CHN/etc. do not drown
 * every corridor that merely touches a mega-port economy.
 *
 * Priority:
 *   1) hard-bind corridor TEU (`unctad-corridor-teu.csv` → corridorHardBind)
 *   2) geometric mean of ContPort TEU on the bilateral pair (comtradePair), else endpoints
 *   3) single endpoint TEU if only one country has data
 *
 * Returns null when UNCTAD cannot contribute — caller may fall back to PortWatch.
 *
 * @typedef {{ teu: number, year?: number|null, note?: string|null }} HardBindRow
 * @typedef {{ teu: number, latestYear?: number, latestTeu?: number }} CountryRow
 * @typedef {{
 *   countries?: Record<string, CountryRow>,
 *   corridorHardBind?: Record<string, HardBindRow>,
 * }} UnctadCache
 * @typedef {{
 *   value: number,
 *   source: string,
 *   unit: "teu",
 *   method: "hard-bind" | "geoMean-pair" | "geoMean-endpoints" | "single-endpoint",
 *   countriesUsed: string[],
 * }} MatchResult
 */

/**
 * @param {number[]} values
 * @returns {number|null}
 */
function geometricMean(values) {
  const xs = values.filter((v) => typeof v === "number" && v > 0);
  if (xs.length === 0) return null;
  if (xs.length === 1) return xs[0];
  const logSum = xs.reduce((s, v) => s + Math.log(v), 0);
  return Math.exp(logSum / xs.length);
}

/**
 * @param {UnctadCache|null|undefined} unctad
 * @param {string[]|null|undefined} isos
 * @returns {{ iso: string, teu: number }[]}
 */
function collectCountryTeus(unctad, isos) {
  if (!unctad?.countries || !isos?.length) return [];
  const out = [];
  const seen = new Set();
  for (const raw of isos) {
    const iso = String(raw || "").toUpperCase();
    if (!iso || seen.has(iso)) continue;
    seen.add(iso);
    const row = unctad.countries[iso];
    if (row && typeof row.teu === "number" && row.teu > 0) {
      out.push({ iso, teu: row.teu });
    }
  }
  return out;
}

/**
 * @param {UnctadCache|null|undefined} unctad
 * @param {{
 *   corridorId: string,
 *   endpointCountries?: string[],
 *   comtradePair?: string[],
 * }} opts
 * @returns {MatchResult|null}
 */
function matchUnctadCorridorTeu(unctad, opts) {
  const corridorId = opts?.corridorId;
  if (!corridorId) return null;

  const hard = unctad?.corridorHardBind?.[corridorId];
  if (hard && typeof hard.teu === "number" && hard.teu > 0) {
    return {
      value: hard.teu,
      source: "unctad-hard-bind",
      unit: "teu",
      method: "hard-bind",
      countriesUsed: [],
    };
  }

  const pair = Array.isArray(opts.comtradePair) ? opts.comtradePair : [];
  const endpoints = Array.isArray(opts.endpointCountries) ? opts.endpointCountries : [];

  if (pair.length >= 2) {
    const pairRows = collectCountryTeus(unctad, pair);
    if (pairRows.length >= 2) {
      const value = geometricMean(pairRows.map((r) => r.teu));
      if (value != null) {
        return {
          value,
          source: "unctad-cont-port-geomean",
          unit: "teu",
          method: "geoMean-pair",
          countriesUsed: pairRows.map((r) => r.iso),
        };
      }
    }
    if (pairRows.length === 1) {
      return {
        value: pairRows[0].teu,
        source: "unctad-cont-port-single",
        unit: "teu",
        method: "single-endpoint",
        countriesUsed: [pairRows[0].iso],
      };
    }
  }

  const endRows = collectCountryTeus(unctad, endpoints);
  if (endRows.length >= 2) {
    const value = geometricMean(endRows.map((r) => r.teu));
    if (value != null) {
      return {
        value,
        source: "unctad-cont-port-geomean",
        unit: "teu",
        method: "geoMean-endpoints",
        countriesUsed: endRows.map((r) => r.iso),
      };
    }
  }
  if (endRows.length === 1) {
    return {
      value: endRows[0].teu,
      source: "unctad-cont-port-single",
      unit: "teu",
      method: "single-endpoint",
      countriesUsed: [endRows[0].iso],
    };
  }

  return null;
}

module.exports = {
  geometricMean,
  collectCountryTeus,
  matchUnctadCorridorTeu,
};
