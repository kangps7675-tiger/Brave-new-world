"""Shared corridor geometry helpers (used by extract + snap)."""
from __future__ import annotations

import math
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORRIDORS_TS = ROOT / "src/data/strategicCorridors.ts"

BUFFER_KM = 18.0
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


def build_corridor_index(corridors: list[dict], want_key: str):
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


def coords_near_corridor(
    coords: list[list[float]],
    cat: str,
    grid: dict[tuple[int, int], list[tuple[str, int]]],
    by_id: dict[str, dict],
) -> bool:
    want_key = "want_rail" if cat == "rail" else "want_road"
    if len(coords) < 2:
        return False
    indices = list(range(0, len(coords), SAMPLE_EVERY))
    if indices[-1] != len(coords) - 1:
        indices.append(len(coords) - 1)
    for idx in indices:
        lng, lat = coords[idx][0], coords[idx][1]
        ci, cj = cell_key(lat, lng)
        for di in range(-1, 2):
            for dj in range(-1, 2):
                for cid, li in grid.get((ci + di, cj + dj), []):
                    c = by_id.get(cid)
                    if not c or not c.get(want_key):
                        continue
                    if dist_to_polyline_km(lat, lng, c["lines"][li]) <= BUFFER_KM:
                        return True
    return False


def _bbox_union(
    a: tuple[float, float, float, float], b: tuple[float, float, float, float]
) -> tuple[float, float, float, float]:
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))


def _bbox_overlaps(
    a: tuple[float, float, float, float], b: tuple[float, float, float, float]
) -> bool:
    return not (a[2] < b[0] or b[2] < a[0] or a[3] < b[1] or b[3] < a[1])


def merge_bboxes(boxes: list[tuple[float, float, float, float]]) -> list[tuple[float, float, float, float]]:
    merged = list(boxes)
    changed = True
    while changed:
        changed = False
        out: list[tuple[float, float, float, float]] = []
        used = [False] * len(merged)
        for i, a in enumerate(merged):
            if used[i]:
                continue
            cur = a
            used[i] = True
            for j, b in enumerate(merged):
                if i == j or used[j]:
                    continue
                if _bbox_overlaps(cur, b):
                    cur = _bbox_union(cur, b)
                    used[j] = True
                    changed = True
            out.append(cur)
        merged = out
    return merged


def corridor_bboxes(pad_deg: float = 0.4) -> list[tuple[float, float, float, float]]:
    """BBox tiles (min_lat, min_lon, max_lat, max_lon) covering land corridors."""
    raw: list[tuple[float, float, float, float]] = []
    for c in load_land_corridors():
        for line in c["lines"]:
            lats = [p[0] for p in line]
            lngs = [p[1] for p in line]
            raw.append(
                (
                    min(lats) - pad_deg,
                    min(lngs) - pad_deg,
                    max(lats) + pad_deg,
                    max(lngs) + pad_deg,
                )
            )
    return merge_bboxes(raw)
