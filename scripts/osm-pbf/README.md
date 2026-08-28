# OSM PBF on Cloudflare R2

Geofabrik `.osm.pbf` files stay **out of git**. Canonical copy is R2:

`conflict-view-data` / `sources/osm-pbf/{filename}`

Local lookup order (first file found wins):

1. `OSM_PBF_DIR`
2. `data/sources/osm-pbf/` (gitignored)
3. `C:/Users/kangp/Downloads`

## Commands

```bash
# upload every local .osm.pbf not yet in R2 (or size-changed)
npm run osm:pbf:sync

npm run osm:pbf:sync -- --dry-run
npm run osm:pbf:sync -- --only=cuba-260825.osm.pbf
npm run osm:pbf:sync -- --force          # re-upload even if size matches

# download from R2 into data/sources/osm-pbf/
npm run osm:pbf:pull
npm run osm:pbf:pull -- --only=belarus-260824.osm.pbf
```

New Geofabrik dumps: drop them in Downloads (or `data/sources/osm-pbf/`) then run `npm run osm:pbf:sync`. No catalog edit.

`scripts/osm-pbf/r2-manifest.json` records what was last uploaded (filename + bytes). Commit that file so other machines know the keys.

C: has little free space — do **not** copy 15GB files into the repo. Upload streams from Downloads.
