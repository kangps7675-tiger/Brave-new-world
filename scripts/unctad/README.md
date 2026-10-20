/**
 * UNCTADstat → corridor ranks
 *
 * ## Why bulk CSV (not API)
 *
 * UNCTADstat Data Centre is JS-rendered and often requires email verification.
 * There is no stable public bulk API suitable for CI. Cadence: **1–2× / year**.
 * Drop Export/Bulk CSV under `scripts/data/unctad/incoming/`, then:
 *
 * ```bash
 * npm run corridors:unctad
 * npm run corridors:ranks
 * ```
 *
 * Without a real file, the parser uses `scripts/unctad/fixtures/US.ContPortThroughput.sample.csv`.
 *
 * ## Phase 1 — ingest
 *
 * **US.ContPortThroughput** — container port throughput (TEU) by economy (country).
 *
 * 1. Open [US.ContPortThroughput](https://unctadstat.unctad.org/datacentre/dataviewer/US.ContPortThroughput)
 * 2. Export CSV or Download Bulk → `scripts/data/unctad/incoming/*.csv`
 * 3. `npm run corridors:unctad` → `unctad-port-throughput.json` (+ optional hard-bind)
 *
 * ## Phase 2 — corridor matching
 *
 * Country TEU ≠ bilateral corridor volume. Matching lives in
 * `scripts/unctad/match-corridor-teu.js` and is used by `build-corridor-ranks.js`:
 *
 * | Priority | Unit | Match |
 * |----------|------|--------|
 * | 1 Hard-bind CSV | corridor TEU | `scripts/data/unctad-corridor-teu.csv` by `corridorId` (INSTC / Middle Corridor / RMT) |
 * | 2 ContPort geoMean | country TEU proxy | geometric mean of ContPort on `comtradePair`, else `endpointCountries` |
 * | 3 ContPort single | country TEU | only one endpoint has data |
 * | 4 PortWatch | AIS score | max among endpoint countries (fallback) |
 *
 * Geometric mean avoids mega-hub economies (e.g. CHN) dominating every corridor that merely lists them as an endpoint. Hard-bind is required when TITR/INSTC/RMT publish a true corridor figure.
 *
 * ## Outputs
 *
 * - `scripts/data/unctad-port-throughput.json`
 * - `public/data/crink/unctad-port-throughput.json`
 *
 * Ranks prefer: **hard-bind → ContPort geoMean → PortWatch**.
 *
 * ```bash
 * node --test scripts/unctad/match-corridor-teu.test.js
 * ```
 */
