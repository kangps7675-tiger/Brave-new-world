# SIGINT layer vendor snapshots

GeoJSON files under this directory are downloaded from
[Skytuhua/SIGINT](https://github.com/Skytuhua/SIGINT) (`public/data/news-layers/`).

- License: MIT
- Refresh: `npm run sigint:fetch`
- Convert: `npm run sigint:convert`
- Full pipeline: `npm run sigint:build`

Conflict-view transforms these into compact JSON under `public/data/{lite|full}/`
and does **not** vendor Cesium/MARKET/NEWS UI from SIGINT.
