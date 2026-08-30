#!/usr/bin/env python3
"""
Extract CRINK-relevant OSM infra from .osm.pbf → GeoJSONL (one feature per line).
Uses pyosmium (no osmium-tool CLI required).

Categories: aeroway, harbour, border, dam, power, checkpoint, rail, road

Partial extract:
  py extract.py --pbf=... --region=belarus --categories=rail,road

Memory strategy for large PBFs (russia ~4GB, asia ~15GB):
  Default `locations=True` builds a location index for *every* node → MemoryError
  on ~8GB machines. We use a 2-pass scan instead:
    pass1: match tags, collect node/way refs (no location index)
    pass2: store lon/lat only for referenced nodes
    emit: build Point / LineString in Python
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import osmium

ROOT = Path(__file__).resolve().parents[2]
CONFIG = json.loads((Path(__file__).parent / "config.json").read_text(encoding="utf-8"))

from categories import (  # noqa: E402
    ALL_CATEGORIES,
    RAIL_SKIP_SERVICE,
    RAIL_TYPES,
    ROAD_TYPES,
    TRANSPORT_CATEGORIES,
    TRANSPORT_SKIP_REGIONS,
    parse_categories,
)

# Regions where flex_mem / locations=True historically OOM'd
LARGE_REGIONS = frozenset({"russia", "asia"})


def power_allowed(tags: osmium.TagList) -> bool:
    """변전소·발전소만 — 송전선(power=line)·철탑(power=tower)은 용량 폭탄이라 제외."""
    kind = tags.get("power")
    return kind in ("substation", "plant")


def rail_allowed(tags: osmium.TagList) -> bool:
    kind = tags.get("railway")
    if kind not in RAIL_TYPES:
        return False
    svc = tags.get("service")
    return svc not in RAIL_SKIP_SERVICE


def road_allowed(tags: osmium.TagList) -> bool:
    return tags.get("highway") in ROAD_TYPES


def categorize(tags: osmium.TagList, active: frozenset[str]) -> str | None:
    if "rail" in active and rail_allowed(tags):
        return "rail"
    if "road" in active and road_allowed(tags):
        return "road"
    aeroway = tags.get("aeroway")
    if "aeroway" in active and aeroway in ("aerodrome", "runway", "helipad"):
        return "aeroway"
    if "harbour" in active and (
        tags.get("harbour") == "yes" or tags.get("seamark:type") == "harbour"
    ):
        return "harbour"
    if "border" in active and (
        tags.get("barrier") == "border_control" or tags.get("amenity") == "customs"
    ):
        return "border"
    if "dam" in active and tags.get("waterway") == "dam":
        return "dam"
    if "power" in active and tags.get("power") in ("substation", "plant"):
        return "power" if power_allowed(tags) else None
    if "checkpoint" in active and tags.get("military") == "checkpoint":
        return "checkpoint"
    return None


def tags_dict(tags: osmium.TagList) -> dict[str, str]:
    return {k: tags[k] for k, _ in tags}


def feature_name(tags: dict[str, str]) -> str | None:
    return tags.get("name:en") or tags.get("name") or tags.get("ref") or tags.get("operator")


def write_feature(
    writers: dict[str, object],
    counts: dict[str, int],
    cat: str,
    region_id: str,
    osm_type: str,
    osm_id: int,
    geometry: dict,
    tags: dict[str, str],
) -> None:
    feature = {
        "type": "Feature",
        "geometry": geometry,
        "properties": {
            "crinkCategory": cat,
            "region": region_id,
            "osmType": osm_type,
            "osmId": osm_id,
            "name": feature_name(tags),
            "tags": tags,
        },
    }
    writers[cat].write(json.dumps(feature, ensure_ascii=False) + "\n")
    counts[cat] += 1


# ── pass 1: collect matches (no location index) ─────────────────────────────


class CollectHandler(osmium.SimpleHandler):
    def __init__(self, active: frozenset[str]):
        super().__init__()
        self.active = active
        # node features: id → (cat, tags)
        self.nodes: dict[int, tuple[str, dict[str, str]]] = {}
        # way features: (cat, way_id, node_ids, tags)
        self.ways: list[tuple[str, int, list[int], dict[str, str]]] = []
        self.needed_node_ids: set[int] = set()
        self._seen = 0

    def _tick(self) -> None:
        self._seen += 1
        if self._seen % 5_000_000 == 0:
            print(
                f"[extract] pass1 ... scanned~{self._seen // 1_000_000}M objects "
                f"(hit nodes={len(self.nodes)} ways={len(self.ways)})",
                flush=True,
            )

    def node(self, n: osmium.Node):
        self._tick()
        cat = categorize(n.tags, self.active)
        if not cat or cat in ("rail", "road"):
            return
        self.nodes[n.id] = (cat, tags_dict(n.tags))
        self.needed_node_ids.add(n.id)

    def way(self, w: osmium.Way):
        self._tick()
        cat = categorize(w.tags, self.active)
        if not cat:
            return
        try:
            nids = [n.ref for n in w.nodes]
        except Exception:
            return
        if not nids:
            return
        self.ways.append((cat, w.id, nids, tags_dict(w.tags)))
        self.needed_node_ids.update(nids)

    def relation(self, _r: osmium.Relation):
        self._tick()


class LocationHandler(osmium.SimpleHandler):
    def __init__(self, needed: set[int]):
        super().__init__()
        self.needed = needed
        self.locs: dict[int, tuple[float, float]] = {}
        self._seen = 0

    def node(self, n: osmium.Node):
        self._seen += 1
        if self._seen % 5_000_000 == 0:
            print(
                f"[extract] pass2 ... scanned~{self._seen // 1_000_000}M nodes "
                f"(resolved={len(self.locs)})",
                flush=True,
            )
        if n.id not in self.needed:
            return
        if not n.location.valid():
            return
        self.locs[n.id] = (n.location.lon, n.location.lat)


def emit_from_passes(
    region_id: str,
    collectors: CollectHandler,
    locs: dict[int, tuple[float, float]],
    writers: dict[str, object],
    counts: dict[str, int],
) -> None:
    for nid, (cat, tags) in collectors.nodes.items():
        xy = locs.get(nid)
        if not xy:
            continue
        write_feature(
            writers,
            counts,
            cat,
            region_id,
            "node",
            nid,
            {"type": "Point", "coordinates": [xy[0], xy[1]]},
            tags,
        )

    for cat, wid, nids, tags in collectors.ways:
        coords = [locs[i] for i in nids if i in locs]
        if cat in ("rail", "road"):
            if len(coords) < 2:
                continue
            write_feature(
                writers,
                counts,
                cat,
                region_id,
                "way",
                wid,
                {"type": "LineString", "coordinates": [[c[0], c[1]] for c in coords]},
                tags,
            )
            continue
        if len(coords) < 1:
            continue
        # 변전소·발전소·활주로 등은 면/선 → 지도에는 Point(centroid) 또는 LineString
        if cat == "power" and tags.get("power") in ("substation", "plant"):
            lon = sum(c[0] for c in coords) / len(coords)
            lat = sum(c[1] for c in coords) / len(coords)
            write_feature(
                writers,
                counts,
                cat,
                region_id,
                "way",
                wid,
                {"type": "Point", "coordinates": [lon, lat]},
                tags,
            )
            continue
        if cat == "aeroway" and tags.get("aeroway") == "aerodrome" and len(coords) >= 3:
            lon = sum(c[0] for c in coords) / len(coords)
            lat = sum(c[1] for c in coords) / len(coords)
            write_feature(
                writers,
                counts,
                cat,
                region_id,
                "way",
                wid,
                {"type": "Point", "coordinates": [lon, lat]},
                tags,
            )
            continue
        if len(coords) < 2:
            # single-node way → point
            write_feature(
                writers,
                counts,
                cat,
                region_id,
                "way",
                wid,
                {"type": "Point", "coordinates": [coords[0][0], coords[0][1]]},
                tags,
            )
            continue
        write_feature(
            writers,
            counts,
            cat,
            region_id,
            "way",
            wid,
            {"type": "LineString", "coordinates": [[c[0], c[1]] for c in coords]},
            tags,
        )


class CorridorFilteredTransportExtractor(osmium.SimpleHandler):
    """Stream corridor-buffered transport ways using preloaded node coords (no PBF index)."""

    def __init__(
        self,
        region_id: str,
        writers: dict[str, object],
        counts: dict[str, int],
        active: frozenset[str],
        grids: dict[str, tuple],
        node_locs: dict[int, tuple[float, float]],
        seen: set[tuple[str, int]],
    ):
        super().__init__()
        self.region_id = region_id
        self.writers = writers
        self.counts = counts
        self.active = active
        self.grids = grids
        self.node_locs = node_locs
        self.seen = seen
        self._ways = 0

    def way(self, w: osmium.Way):
        self._ways += 1
        cat = categorize(w.tags, self.active)
        if cat not in ("rail", "road"):
            return
        key = (cat, w.id)
        if key in self.seen:
            return
        try:
            nids = [n.ref for n in w.nodes]
        except Exception:
            return
        coords = [self.node_locs[i] for i in nids if i in self.node_locs]
        if len(coords) < 2:
            return
        geom_coords = [[c[0], c[1]] for c in coords]
        from corridor_geo import coords_near_corridor  # noqa: WPS433

        grid, by_id = self.grids[cat]
        if not coords_near_corridor(geom_coords, cat, grid, by_id):
            return
        self.seen.add(key)
        write_feature(
            self.writers,
            self.counts,
            cat,
            self.region_id,
            "way",
            w.id,
            {"type": "LineString", "coordinates": geom_coords},
            tags_dict(w.tags),
        )


class BboxNodeCollector(osmium.SimpleHandler):
    def __init__(self, bbox: tuple[float, float, float, float]):
        super().__init__()
        self.bbox = bbox
        self.locs: dict[int, tuple[float, float]] = {}
        self._seen = 0

    def node(self, n: osmium.Node):
        self._seen += 1
        if self._seen % 20_000_000 == 0:
            print(f"[extract] tile nodes ... ~{self._seen // 1_000_000}M", flush=True)
        if not n.location.valid():
            return
        lat, lon = n.location.lat, n.location.lon
        min_lat, min_lon, max_lat, max_lon = self.bbox
        if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
            self.locs[n.id] = (lon, lat)


def extract_region_corridor_tiled(
    pbf_path: Path,
    region_id: str,
    out_dir: Path,
    categories: tuple[str, ...],
) -> dict[str, int]:
    """Tile by corridor bbox; 2-pass/tile without building a full-PBF location index."""
    from corridor_geo import build_corridor_index, corridor_bboxes, load_land_corridors  # noqa: WPS433

    active = frozenset(categories)
    land = load_land_corridors()
    grids: dict[str, tuple] = {}
    for cat in categories:
        want_key = "want_rail" if cat == "rail" else "want_road"
        _rel, by_id, grid = build_corridor_index(land, want_key)
        grids[cat] = (grid, by_id)

    boxes = corridor_bboxes()
    print(f"[extract] {region_id} corridor tiles: {len(boxes)}", flush=True)

    writers: dict[str, object] = {}
    counts = {c: 0 for c in categories}
    for cat in categories:
        writers[cat] = (out_dir / f"{region_id}-{cat}.geojsonl").open("w", encoding="utf-8")

    seen: set[tuple[str, int]] = set()
    try:
        for ti, bbox in enumerate(boxes, 1):
            print(
                f"[extract] tile {ti}/{len(boxes)} bbox="
                f"[{bbox[0]:.2f},{bbox[1]:.2f}]-[{bbox[2]:.2f},{bbox[3]:.2f}]",
                flush=True,
            )
            nodes = BboxNodeCollector(bbox)
            nodes.apply_file(str(pbf_path), locations=False)
            print(f"[extract] tile {ti} nodes in bbox: {len(nodes.locs)}", flush=True)
            if not nodes.locs:
                continue
            ways = CorridorFilteredTransportExtractor(
                region_id, writers, counts, active, grids, nodes.locs, seen
            )
            ways.apply_file(str(pbf_path), locations=False)
            print(
                f"[extract] tile {ti} totals: rail={counts.get('rail', 0)} road={counts.get('road', 0)}",
                flush=True,
            )
            del nodes
    finally:
        for w in writers.values():
            w.close()

    for cat in categories:
        src = out_dir / f"{region_id}-{cat}.geojsonl"
        dst = out_dir / f"{region_id}-clipped-{cat}.geojsonl"
        if src.is_file():
            shutil.copy2(src, dst)

    print(f"[extract] {region_id} counts:", counts, flush=True)
    return counts


def extract_region_corridor_filtered(
    pbf_path: Path,
    region_id: str,
    out_dir: Path,
    categories: tuple[str, ...],
) -> dict[str, int]:
    """Delegate to tiled extract — sparse_file_array index OOMs on 15GB asia PBF."""
    return extract_region_corridor_tiled(pbf_path, region_id, out_dir, categories)


def extract_region_twopass(
    pbf_path: Path,
    region_id: str,
    out_dir: Path,
    categories: tuple[str, ...],
) -> dict[str, int]:
    """Memory-safe path for russia/asia — never builds a full location index."""
    active = frozenset(categories)
    writers: dict[str, object] = {}
    counts = {c: 0 for c in categories}
    for cat in categories:
        writers[cat] = (out_dir / f"{region_id}-{cat}.geojsonl").open("w", encoding="utf-8")

    try:
        print(
            f"[extract] {region_id} <- {pbf_path} (2-pass, categories={','.join(categories)})",
            flush=True,
        )
        print(f"[extract] pass1: collect tagged nodes/ways...", flush=True)
        collect = CollectHandler(active)
        collect.apply_file(str(pbf_path), locations=False)
        print(
            f"[extract] pass1 done: nodes={len(collect.nodes)} ways={len(collect.ways)} "
            f"needed_node_ids={len(collect.needed_node_ids)}",
            flush=True,
        )

        print(f"[extract] pass2: resolve coordinates...", flush=True)
        loc_h = LocationHandler(collect.needed_node_ids)
        loc_h.apply_file(str(pbf_path), locations=False)
        print(f"[extract] pass2 done: resolved={len(loc_h.locs)}", flush=True)

        emit_from_passes(region_id, collect, loc_h.locs, writers, counts)
    finally:
        for w in writers.values():
            w.close()

    print(f"[extract] {region_id} counts:", counts, flush=True)
    return counts


# ── small-file path (flex index OK) ─────────────────────────────────────────


class InfraExtractor(osmium.SimpleHandler):
    def __init__(self, region_id: str, writers: dict[str, object], active: frozenset[str]):
        super().__init__()
        self.region_id = region_id
        self.writers = writers
        self.active = active
        self.factory = osmium.geom.GeoJSONFactory()
        self.counts = {c: 0 for c in writers}

    def node(self, n: osmium.Node):
        cat = categorize(n.tags, self.active)
        if not cat or cat in ("rail", "road"):
            return
        write_feature(
            self.writers,
            self.counts,
            cat,
            self.region_id,
            "node",
            n.id,
            {"type": "Point", "coordinates": [n.location.lon, n.location.lat]},
            tags_dict(n.tags),
        )

    def way(self, w: osmium.Way):
        cat = categorize(w.tags, self.active)
        if not cat:
            return
        if cat in ("rail", "road"):
            try:
                geom = self.factory.create_linestring(w)
            except osmium.InvalidLocationError:
                return
            except RuntimeError:
                return
            try:
                geometry = json.loads(geom)
            except json.JSONDecodeError:
                return
            if geometry.get("type") != "LineString":
                return
            coords = geometry.get("coordinates") or []
            if len(coords) < 2:
                return
            write_feature(
                self.writers,
                self.counts,
                cat,
                self.region_id,
                "way",
                w.id,
                geometry,
                tags_dict(w.tags),
            )
            return
        if cat == "power" and w.tags.get("power") in ("substation", "plant"):
            try:
                coords = [(n.location.lon, n.location.lat) for n in w.nodes if n.location.valid()]
            except Exception:
                return
            if not coords:
                return
            lon = sum(c[0] for c in coords) / len(coords)
            lat = sum(c[1] for c in coords) / len(coords)
            write_feature(
                self.writers,
                self.counts,
                cat,
                self.region_id,
                "way",
                w.id,
                {"type": "Point", "coordinates": [lon, lat]},
                tags_dict(w.tags),
            )
            return
        try:
            geom = self.factory.create_linestring(w)
        except osmium.InvalidLocationError:
            return
        except RuntimeError:
            return
        try:
            geometry = json.loads(geom)
        except json.JSONDecodeError:
            return
        write_feature(
            self.writers,
            self.counts,
            cat,
            self.region_id,
            "way",
            w.id,
            geometry,
            tags_dict(w.tags),
        )


def _categories_need_twopass(categories: tuple[str, ...]) -> bool:
    """Rail/road single-pass (locations=True) OOMs on dense networks."""
    return any(str(c).lower() in ("rail", "road") for c in categories)

def extract_region_small(
    pbf_path: Path,
    region_id: str,
    out_dir: Path,
    categories: tuple[str, ...],
) -> dict[str, int]:
    writers: dict[str, object] = {}
    for cat in categories:
        writers[cat] = (out_dir / f"{region_id}-{cat}.geojsonl").open("w", encoding="utf-8")

    active = frozenset(categories)
    handler = InfraExtractor(region_id, writers, active)
    print(
        f"[extract] {region_id} <- {pbf_path} (single-pass, categories={','.join(categories)})",
        flush=True,
    )
    try:
        handler.apply_file(str(pbf_path), locations=True, idx="flex_mem")
    finally:
        for w in writers.values():
            w.close()

    print(f"[extract] {region_id} counts:", handler.counts, flush=True)
    return handler.counts


def extract_region(
    pbf_path: Path,
    region_id: str,
    out_dir: Path,
    categories: tuple[str, ...],
    *,
    twopass: bool = False,
) -> dict[str, int]:
    out_dir.mkdir(parents=True, exist_ok=True)
    # rail/road only: skip CUB/VEN — not CRINK Eurasian corridor mesh
    if region_id in TRANSPORT_SKIP_REGIONS and frozenset(categories) <= frozenset(
        TRANSPORT_CATEGORIES
    ):
        print(
            f"[extract] skip {region_id}: outside CRINK Eurasian transport mesh "
            f"(categories={','.join(categories)})",
            flush=True,
        )
        for cat in categories:
            (out_dir / f"{region_id}-{cat}.geojsonl").write_text("", encoding="utf-8")
        return {c: 0 for c in categories}
    # Asia transport: full 2-pass OOMs on ~8GB RAM — extract corridor buffer only.
    if (
        region_id == "asia"
        and frozenset(categories) <= frozenset(TRANSPORT_CATEGORIES)
    ):
        return extract_region_corridor_filtered(pbf_path, region_id, out_dir, categories)
    if twopass or region_id in LARGE_REGIONS or _categories_need_twopass(categories):
        return extract_region_twopass(pbf_path, region_id, out_dir, categories)
    return extract_region_small(pbf_path, region_id, out_dir, categories)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pbf", required=True)
    parser.add_argument("--region", required=True)
    parser.add_argument("--out", default=str(Path(CONFIG["workDir"])))
    parser.add_argument(
        "--twopass",
        action="store_true",
        help="Force 2-pass extract (needed for russia/asia on low-RAM hosts)",
    )
    parser.add_argument(
        "--categories",
        default=None,
        help="Comma list: rail,road or all (default: aeroway,harbour,border,dam,power,checkpoint)",
    )
    args = parser.parse_args()

    try:
        categories = parse_categories(args.categories)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        sys.exit(2)

    pbf = Path(args.pbf)
    if not pbf.is_file():
        print(f"Missing PBF: {pbf}", file=sys.stderr)
        sys.exit(1)

    extract_region(pbf, args.region, Path(args.out), categories, twopass=args.twopass)


if __name__ == "__main__":
    main()
