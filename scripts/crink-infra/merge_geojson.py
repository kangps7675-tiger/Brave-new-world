#!/usr/bin/env python3
"""Merge geojsonl shards → category GeoJSON + crink-all.geojson for the app."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = json.loads((Path(__file__).parent / "config.json").read_text(encoding="utf-8"))
CATEGORIES = ("aeroway", "harbour", "border", "dam", "power", "checkpoint")
REGIONS = [r["id"] for r in CONFIG["regions"]]


def collect_lines(work: Path, region: str, cat: str) -> list[str]:
    if region == "asia":
        candidates = [
            work / f"asia-clipped-{cat}.geojsonl",
            work / f"asia-{cat}.geojsonl",
        ]
    else:
        candidates = [work / f"{region}-{cat}.geojsonl"]
    for p in candidates:
        if p.is_file():
            out = []
            for i, ln in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
                ln = ln.strip()
                if not ln:
                    continue
                try:
                    json.loads(ln)
                except json.JSONDecodeError as e:
                    print(f"[merge] skip bad line {p.name}:{i}: {e}", flush=True)
                    continue
                out.append(ln)
            return out
    return []


def merge_category(work: Path, out_dir: Path, cat: str) -> int:
    features = []
    for region in REGIONS:
        for line in collect_lines(work, region, cat):
            features.append(json.loads(line))
    out = {
        "type": "FeatureCollection",
        "name": f"crink-{cat}",
        "features": features,
    }
    dest = out_dir / f"crink-{cat}.geojson"
    dest.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"[merge] {cat}: {len(features)} → {dest.relative_to(ROOT)}", flush=True)
    return len(features)


def merge_all(out_dir: Path) -> int:
    all_features = []
    for cat in CATEGORIES:
        p = out_dir / f"crink-{cat}.geojson"
        if not p.is_file():
            continue
        data = json.loads(p.read_text(encoding="utf-8"))
        all_features.extend(data.get("features", []))
    dest = out_dir / "crink-all.geojson"
    dest.write_text(
        json.dumps(
            {"type": "FeatureCollection", "name": "crink-all", "features": all_features},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"[merge] crink-all: {len(all_features)} → {dest.relative_to(ROOT)}", flush=True)
    return len(all_features)


def write_manifest(out_dir: Path):
    manifest = {
        "generatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "schema": "crink-osm-infra",
        "categories": list(CATEGORIES),
        "files": {cat: f"/data/crink/crink-{cat}.geojson" for cat in CATEGORIES},
        "all": "/data/crink/crink-all.geojson",
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def main():
    work = Path(CONFIG["workDir"])
    out_dir = ROOT / CONFIG["outputDir"]
    out_dir.mkdir(parents=True, exist_ok=True)
    for cat in CATEGORIES:
        merge_category(work, out_dir, cat)
    merge_all(out_dir)
    write_manifest(out_dir)


if __name__ == "__main__":
    main()
