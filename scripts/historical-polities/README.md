# Historical polities pipeline (worldwide, Korea excluded)

## Stack (역사 토글 only)

| Layer | Role | Source | License |
|-------|------|--------|---------|
| **Cliopatria** | Polity fills (primary, KR excluded) | [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) | CC BY 4.0 |
| **Korea** | Peninsula overlay | `korean_history_geo.geojson` | mixed per-feature — `korea/CREDITS.md` |
| **historical-basemaps** | Cultural/colonial basemap + border precision | [historical-basemaps](https://github.com/aourednik/historical-basemaps) | GPL-3.0 |
| **OHM** | Historic OSM detail (live vtiles) | [OpenHistoricalMap](https://www.openhistoricalmap.org/) | ODbL-style; attribute OHM |
| **Wikidata** | IDs on Cliopatria / KR features | [Wikidata](https://www.wikidata.org/) | CC0 |

## Prepare sources

```bash
# parent of Next app
git clone --depth 1 https://github.com/Seshat-Global-History-Databank/cliopatria.git cliopatria-ref
# unzip cliopatria zip → cliopatria-ref/unzipped/...

git clone --depth 1 https://github.com/aourednik/historical-basemaps.git historical-basemaps-ref
```

OHM needs **no clone** — hosted tiles at `vtiles.openhistoricalmap.org`.

## Build

```bash
npm run historical:build
# or:
npm run historical:cliopatria:build
npm run historical:basemaps:build
npm run historical:ohm:build
npm run historical:korea:build
# optional: --source=path/to/korean_history_geo.geojson
```

Writes:

- `public/data/historical/cliopatria/`
- `public/data/historical/basemaps/` (+ `crosscheck-vs-cliopatria.json`)
- `public/data/historical/ohm/manifest.json` + CREDITS
- `public/data/historical/korea/` (source + year snapshots + CREDITS)
- `public/data/historical/history-layers.json`

## OHM client wiring

```ts
import { OHM_STYLE_URL, applyOhmDateFilter, yearToOhmFilterDate } from "@/lib/historical/ohmConfig";

// On 역사 toggle: setStyle(OHM_STYLE_URL) or add OHM vector source under fills
// On year scrub:
await applyOhmDateFilter(map, year); // uses @openhistoricalmap/maplibre-gl-dates
```

Planet PBFs on [S3](https://s3.amazonaws.com/planet.openhistoricalmap.org/) are often Glacier — **do not download into the repo**.

## Cross-check (basemaps vs Cliopatria)

See `basemaps/crosscheck-vs-cliopatria.json`. Turkey 1930/1938 verified fixed upstream ([#52](https://github.com/aourednik/historical-basemaps/issues/52)).

## Client rules

1. **역사** toggle only  
2. Cliopatria fill → **Korea overlay** → optional basemaps → OHM detail + `filterByDate`  
3. Credits for every painted source (KR mixed licenses)  
4. Never paint on 지정학/지경학  
5. **Playback pacing:** calendar-even antiquity→present, modern (≥1900) ~22% of background playtime — `src/lib/historical/historyPlayback.ts`. Issue clips = separate track.
6. Korea fills: `selectKoreaTerritoryFeatures` — Balhae peak = `bh-ext-830-textbook` (요동·연해주 중부 해안). Context (당 등) when `uiDefault`.
