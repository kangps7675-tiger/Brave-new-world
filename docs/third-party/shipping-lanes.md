# Shipping Lanes (third-party)

## Dataset

- **Name:** Global Shipping Lanes
- **Author:** Benden, P. (georeferenced from CIA Map of the World's Oceans, Oct 2012, with edits)
- **Upstream:** https://github.com/newzealandpaul/Shipping-Lanes
- **Citation:** Benden, P. (2022). Global Shipping Lanes [Data set]. Zenodo. https://doi.org/10.5281/zenodo.6361763
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0), with upstream LICENSE note that **excludes Statista** reuse

## How we use it

- Build: `scripts/build-static-extras.js` → `public/data/{lite,full}/shipping-lanes.json`
- Map layer pref: `showShippingLanes` (UI: 해상 항로)
- Coordinates: **upstream GeoJSON vertices preserved** (no ocean A* reroute / no intentional reshape)
- Style only: Major / Middle / Minor stroke weight + chokepoint tint — not a modification of geometry for license purposes beyond technical format conversion (GeoJSON → compact JSON)

## Attribution (in-app)

- Map attribution bar when layer is on: `Shipping Lanes (Benden 2022, CC BY 4.0)`
- `src/data/sourceCatalog.ts` → `trade-routes`
- `src/lib/layerAttribution.ts` → `showShippingLanes`
