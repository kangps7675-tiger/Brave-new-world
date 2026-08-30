#!/usr/bin/env python3
"""
Filter OSM rail/road extracts to segments near the ~40 strategic CRINK corridors.

Full OSM meshes are huge — the map should show major trade routes only.
Writes:
  public/data/crink/crink-rail.geojson   (corridor-buffered major rail)
  public/data/crink/crink-road.geojson   (corridor-buffered major road)
  public/data/crink/corridor-osm-routes.json  (per-corridor hit stats)

Raw unfiltered shards stay in scripts/crink-infra/work/*-{rail,road}.geojsonl
"""
from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = json.loads((Path(__file__).parent / "config.json").read_text(encoding="utf-8"))
CORRIDORS_TS = ROOT / "src/data/strategicCorridors.ts"
WORK = Path(CONFIG["workDir"])
OUT_DIR = ROOT / CONFIG["outputDir"]
REGIONS = [r["id"] for r in CONFIG["regions"]]

BUFFER_KM = 18.0
# ~degrees at mid-latitudes for grid cell (~BUFFER)
CELL_DEG = 0.25
SAMPLE_EVERY = 5

WP_RE = re.compile(
    r'\{\s*lat:\s*([-0-9.]+),\s*lng:\s*([-0-9.]+)(?:,\s*name:\s*"([^"]*)")?\s*\}'
)
BLOCK_RE = re.compile(
    r'\{\s*id:\s*"(?P<id>[^"]+)"(?P<body>.*?)(?=\n  \{\s*id:|\n\];)',
    re.DOTALL,
)
MODE_RE = re.compile(r'\bmode:\s*"(rail|road|sea|mixed)"')
LEGS_RE = re.compile(r"legs:\s*\[(.*?)\]\s*,\s*sources:", re.DOTALL)
LEG_RE = re.compile(
    r'\{\s*mode:\s*"(rail|road|sea|mixed)"\s*,\s*waypoints:\s*\[(.*?)\]\s*\}',
    re.DOTALL,
)
WAYPOINTS_RE = re.compile(r"waypoints:\s*\[(.*?)\]", re.DOTALL)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p = math.pi / 180
    a = (
        0.5
        - math.cos((lat2 - lat1) * p) / 2
        + math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2
    )
    return 2 * r * math.asin(math.sqrt(min(1.0, a)))


def point_to_segment_km(
    lat: float, lng: float, a_lat: float, a_lng: float, b_lat: float, b_lng: float
) -> float:
    mid_lat = (a_lat + b_lat + lat) / 3.0
    cos_lat = max(0.2, math.cos(mid_lat * math.pi / 180))
    ax, ay = a_lng * cos_lat, a_lat
    bx, by = b_lng * cos_lat, b_lat
    px, py = lng * cos_lat, lat
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return haversine_km(lat, lng, a_lat, a_lng)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return haversine_km(lat, lng, ay + t * dy, (ax + t * dx) / cos_lat)


def dist_to_polyline_km(lat: float, lng: float, line: list[tuple[float, float]]) -> float:
    best = 1e9
    for i in range(len(line) - 1):
        d = point_to_segment_km(lat, lng, line[i][0], line[i][1], line[i + 1][0], line[i + 1][1])
        if d < best:
            best = d
            if best <= BUFFER_KM:
                return best
    return best


def parse_waypoints(blob: str) -> list[tuple[float, float]]:
    return [(float(m.group(1)), float(m.group(2))) for m in WP_RE.finditer(blob)]


def densify(line: list[tuple[float, float]], step_deg: float = 0.5) -> list[tuple[float, float]]:
    """Insert points so long legs still hit the grid."""
    out: list[tuple[float, float]] = []
    for i in range(len(line) - 1):
        a_lat, a_lng = line[i]
        b_lat, b_lng = line[i + 1]
        out.append((a_lat, a_lng))
        dist = math.hypot(b_lat - a_lat, b_lng - a_lng)
        n = max(1, int(dist / step_deg))
        for k in range(1, n):
            t = k / n
            out.append((a_lat + t * (b_lat - a_lat), a_lng + t * (b_lng - a_lng)))
    out.append(line[-1])
    return out


def cell_key(lat: float, lng: float) -> tuple[int, int]:
    return (int(math.floor(lat / CELL_DEG)), int(math.floor(lng / CELL_DEG)))


def build_corridor_index(corridors: list[dict], want_key: str):
    """Map grid cell → list of (corridor_id, line_index) near corridor polylines."""
    relevant = [c for c in corridors if c[want_key]]
    grid: dict[tuple[int, int], list[tuple[str, int]]] = defaultdict(list)
    by_id = {c["id"]: c for c in relevant}
    pad = max(1, int(math.ceil(BUFFER_KM / 111.0 / CELL_DEG)) + 1)
    for c in relevant:
        for li, line in enumerate(c["lines"]):
            for lat, lng in densify(line):
                ci, cj = cell_key(lat, lng)
                for di in range(-pad, pad + 1):
                    for dj in range(-pad, pad + 1):
                        key = (ci + di, cj + dj)
                        entry = (c["id"], li)
                        if entry not in grid[key]:
                            grid[key].append(entry)
    return relevant, by_id, grid


def load_land_corridors() -> list[dict]:
    text = CORRIDORS_TS.read_text(encoding="utf-8")
    start = text.find("export const STRATEGIC_CORRIDORS")
    if start < 0:
        raise SystemExit("STRATEGIC_CORRIDORS not found")
    text = text[start:]
    corridors: list[dict] = []
    for m in BLOCK_RE.finditer(text):
        cid = m.group("id")
        body = m.group("body")
        mode_m = MODE_RE.search(body)
        if not mode_m:
            continue
        top_mode = mode_m.group(1)
        land_lines: list[list[tuple[float, float]]] = []
        want_rail = False
        want_road = False

        legs_m = LEGS_RE.search(body)
        if legs_m:
            for leg in LEG_RE.finditer(legs_m.group(1)):
                leg_mode = leg.group(1)
                wps = parse_waypoints(leg.group(2))
                if len(wps) < 2:
                    continue
                if leg_mode in ("rail", "road", "mixed"):
                    land_lines.append(wps)
                    if leg_mode in ("rail", "mixed"):
                        want_rail = True
                    if leg_mode in ("road", "mixed"):
                        want_road = True
        else:
            if top_mode == "sea":
                continue
            wps_m = WAYPOINTS_RE.search(body)
            if not wps_m:
                continue
            wps = parse_waypoints(wps_m.group(1))
            if len(wps) < 2:
                continue
            land_lines.append(wps)
            if top_mode in ("rail", "mixed"):
                want_rail = True
            if top_mode in ("road", "mixed"):
                want_road = True
            if top_mode == "mixed":
                want_rail = want_road = True

        if not land_lines:
            continue
        corridors.append(
            {
                "id": cid,
                "mode": top_mode,
                "lines": land_lines,
                "want_rail": want_rail or top_mode == "rail",
                "want_road": want_road or top_mode == "road",
            }
        )
    return corridors


def collect_raw_features(cat: str) -> list[dict]:
    feats: list[dict] = []
    seen: set[tuple] = set()
    for region in REGIONS:
        candidates = []
        if region == "asia":
            candidates.append(WORK / f"asia-clipped-{cat}.geojsonl")
        candidates.append(WORK / f"{region}-{cat}.geojsonl")
        for p in candidates:
            if not p.is_file() or p.stat().st_size == 0:
                continue
            for ln in p.read_text(encoding="utf-8").splitlines():
                ln = ln.strip()
                if not ln:
                    continue
                try:
                    f = json.loads(ln)
                except json.JSONDecodeError:
                    continue
                props = f.get("properties") or {}
                key = (props.get("osmType"), props.get("osmId"), region)
                if key in seen:
                    continue
                seen.add(key)
                feats.append(f)
            break
    if feats:
        return feats
    merged = OUT_DIR / f"crink-{cat}-full.geojson"
    if not merged.is_file():
        merged = OUT_DIR / f"crink-{cat}.geojson"
    if merged.is_file():
        return list(json.loads(merged.read_text(encoding="utf-8")).get("features") or [])
    return []


def filter_category(cat: str, corridors: list[dict]) -> tuple[list[dict], dict[str, int]]:
    want_key = "want_rail" if cat == "rail" else "want_road"
    relevant, by_id, grid = build_corridor_index(corridors, want_key)
    if not relevant:
        return [], {}

    raw = collect_raw_features(cat)
    print(f"[snap] {cat}: raw={len(raw)} corridors={len(relevant)}", flush=True)
    kept: list[dict] = []
    hit_counts: dict[str, int] = {c["id"]: 0 for c in relevant}

    for f in raw:
        geom = f.get("geometry") or {}
        if geom.get("type") != "LineString":
            continue
        coords = geom.get("coordinates") or []
        if len(coords) < 2:
            continue
        samples = coords[::SAMPLE_EVERY]
        if samples[-1] is not coords[-1]:
            samples.append(coords[-1])

        candidate_ids: set[str] = set()
        for c in samples:
            lng, lat = c[0], c[1]
            for cid, _li in grid.get(cell_key(lat, lng), ()):
                candidate_ids.add(cid)
        if not candidate_ids:
            continue

        matched_ids: list[str] = []
        for cid in candidate_ids:
            c = by_id[cid]
            hit = False
            for sample in samples:
                lng, lat = sample[0], sample[1]
                for line in c["lines"]:
                    if dist_to_polyline_km(lat, lng, line) <= BUFFER_KM:
                        hit = True
                        break
                if hit:
                    break
            if hit:
                matched_ids.append(cid)
                hit_counts[cid] += 1
        if not matched_ids:
            continue
        props = dict(f.get("properties") or {})
        props["corridorIds"] = matched_ids
        props["majorRoute"] = True
        kept.append({"type": "Feature", "geometry": geom, "properties": props})
    return kept, hit_counts


def write_fc(cat: str, features: list[dict]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dest = OUT_DIR / f"crink-{cat}.geojson"
    dest.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "name": f"crink-{cat}-major",
                "features": features,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"[snap] wrote {len(features)} → {dest.relative_to(ROOT)}", flush=True)


def main():
    corridors = load_land_corridors()
    print(f"[snap] land corridors: {len(corridors)}", flush=True)
    stats = {"bufferKm": BUFFER_KM, "corridors": {}, "counts": {}}
    for cat in ("rail", "road"):
        feats, hits = filter_category(cat, corridors)
        write_fc(cat, feats)
        stats["counts"][cat] = len(feats)
        for cid, n in hits.items():
            stats["corridors"].setdefault(cid, {})[cat] = n

    raw_stats = {cat: len(collect_raw_features(cat)) for cat in ("rail", "road")}
    stats["rawCounts"] = raw_stats

    side = OUT_DIR / "corridor-osm-routes.json"
    side.write_text(json.dumps(stats, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[snap] stats → {side.relative_to(ROOT)}", flush=True)

    from categories import ALL_CATEGORIES

    all_features = []
    for c in ALL_CATEGORIES:
        p = OUT_DIR / f"crink-{c}.geojson"
        if not p.is_file():
            continue
        all_features.extend(json.loads(p.read_text(encoding="utf-8")).get("features", []))
    (OUT_DIR / "crink-all.geojson").write_text(
        json.dumps(
            {"type": "FeatureCollection", "name": "crink-all", "features": all_features},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"[snap] crink-all refreshed: {len(all_features)}", flush=True)


if __name__ == "__main__":
    main()
