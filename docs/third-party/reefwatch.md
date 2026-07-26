# Third-party: ReefWatch

| | |
|---|---|
| Upstream | https://github.com/NinhGhoster/ReefWatch |
| Author | NinhGhoster |
| Licence | **MIT** (README) |
| Local seed | `src/data/reefWatchTargetFeatures.raw.json` |

## Integration policy

ReefWatch is treated as a **feature-centric monitoring workflow**, not a generic live battlefield feed:

1. Prefer strategic features over map-wide bulk noise
2. Keep observations tied to monitored features (Spratly / Paracel)
3. Poll OpenSky with the **combined SCS bbox** (`quick_check.py` style) — one request, not 77 per-feature scans
4. Attribute aircraft only within **±0.15° (~16.7 km)** of a feature
5. Do not require Planet or paid AIS for the map layer

Runtime path:

- `GET /api/reefwatch` — normalizes features + OpenSky traffic
- Globe layer toggle `showReefWatch` — polls every 3 minutes while ON
- Markers: feature pins (claimant-colored) + nearby aircraft

No upstream Python scripts are copied into `src/`. Only the public feature registry seed and the documented poll policy are reimplemented in TypeScript.

## Local update

```bash
curl -L -o src/data/reefWatchTargetFeatures.raw.json \
  https://raw.githubusercontent.com/NinhGhoster/ReefWatch/main/data/target_features.json
```

## Attribution

Feature list © ReefWatch contributors (MIT). Live positions © OpenSky Network contributors under their terms of use.
