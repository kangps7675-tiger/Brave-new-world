# OSM PBF → PMTiles baking

Geofabrik `.osm.pbf` → **Planetiler** (OpenMapTiles) → `.pmtiles` → MapLibre (`pmtiles://`).

## Inputs

Geofabrik `.osm.pbf` — R2 canonical (`npm run osm:pbf:sync`). Local: `data/sources/osm-pbf` then Downloads.

| Region | File | Size |
|--------|------|------|
| antarctica | `antarctica-260825.osm.pbf` | ~32 MB |
| australia-oceania | `australia-oceania-260825.osm.pbf` | ~1.5 GB |

## Commands

```bash
npm run osm:tiles:ensure
npm run osm:tiles:bake:antarctica          # smoke test
npm run osm:tiles:bake:australia           # AU + Oceania (~1.5 GB PBF, long)
npm run osm:tiles:bake                     # antarctica + australia-oceania
```

Outputs under `public/tiles/osm/`. Preview: `/internal/osm-tiles`

No system Java/Docker required — portable Temurin JDK + planetiler.jar land in `vendor/`.
