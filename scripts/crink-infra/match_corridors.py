#!/usr/bin/env python3
"""
Match strategicCorridor waypoints to nearest CRINK infra features (border/aeroway/harbour).
Outputs public/data/crink/corridor-matches.json for app enrichment.
"""
from __future__ import annotations

import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = json.loads((Path(__file__).parent / "config.json").read_text(encoding="utf-8"))
CORRIDORS_TS = ROOT / "src/data/strategicCorridors.ts"
OUT = ROOT / CONFIG["outputDir"] / "corridor-matches.json"

# Simple regex extract waypoint names from strategicCorridors.ts
WP_RE = re.compile(
    r'\{\s*lat:\s*([-0-9.]+),\s*lng:\s*([-0-9.]+),\s*name:\s*"([^"]+)"\s*\}'
)


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p = math.pi / 180
    a = (
        0.5
        - math.cos((lat2 - lat1) * p) / 2
        + math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2
    )
    return 2 * r * math.asin(math.sqrt(a))


def load_features():
    data_dir = ROOT / CONFIG["outputDir"]
    feats = []
    for cat in ("border", "aeroway", "harbour"):
        p = data_dir / f"crink-{cat}.geojson"
        if not p.is_file():
            continue
        for f in json.loads(p.read_text(encoding="utf-8")).get("features", []):
            geom = f["geometry"]
            props = f.get("properties", {})
            if geom["type"] == "Point":
                lat, lng = geom["coordinates"][1], geom["coordinates"][0]
            elif geom["type"] == "LineString":
                coords = geom["coordinates"]
                mid = coords[len(coords) // 2]
                lng, lat = mid[0], mid[1]
            elif geom["type"] == "Polygon":
                ring = geom["coordinates"][0]
                lng = sum(c[0] for c in ring) / len(ring)
                lat = sum(c[1] for c in ring) / len(ring)
            else:
                continue
            feats.append(
                {
                    "category": props.get("crinkCategory", cat),
                    "name": props.get("name"),
                    "osmId": props.get("osmId"),
                    "lat": lat,
                    "lng": lng,
                }
            )
    return feats


def load_waypoints():
    text = CORRIDORS_TS.read_text(encoding="utf-8")
    return [
        {"lat": float(m.group(1)), "lng": float(m.group(2)), "name": m.group(3)}
        for m in WP_RE.finditer(text)
    ]


def main():
    feats = load_features()
    wps = load_waypoints()
    matches = []
    for wp in wps:
        best = None
        best_d = 9999.0
        for f in feats:
            d = haversine_km(wp["lat"], wp["lng"], f["lat"], f["lng"])
            if d < best_d:
                best_d = d
                best = f
        if best and best_d <= 25.0:
            matches.append(
                {
                    "waypoint": wp,
                    "match": best,
                    "distanceKm": round(best_d, 2),
                }
            )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"matches": matches}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[match] {len(matches)} corridor waypoints matched → {OUT.relative_to(ROOT)}", flush=True)


if __name__ == "__main__":
    main()
