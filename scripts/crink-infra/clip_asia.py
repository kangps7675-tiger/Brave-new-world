#!/usr/bin/env python3
"""Clip asia-* geojsonl features to CRINK spoke ISO_A3 countries."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import geopandas as gpd
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[2]
CONFIG = json.loads((Path(__file__).parent / "config.json").read_text(encoding="utf-8"))
ISO3 = set(CONFIG["asiaClipIso3"])
NE_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
    "geojson/ne_10m_admin_0_countries.geojson"
)


def load_mask():
    world = gpd.read_file(NE_URL)
    col = "ISO_A3" if "ISO_A3" in world.columns else "ADM0_A3"
    mask = world[world[col].isin(ISO3)].union_all()
    return mask


def clip_file(src: Path, dst: Path, mask) -> int:
    kept = 0
    with src.open(encoding="utf-8") as fin, dst.open("w", encoding="utf-8") as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue
            feat = json.loads(line)
            geom = shape(feat["geometry"])
            if not geom.intersects(mask):
                continue
            fout.write(json.dumps(feat, ensure_ascii=False) + "\n")
            kept += 1
    return kept


def main():
    import argparse

    from categories import parse_categories

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--categories",
        default=None,
        help="Clip only these categories (default: aeroway,harbour,...)",
    )
    args = parser.parse_args()
    try:
        categories = parse_categories(args.categories)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        sys.exit(2)

    work = Path(CONFIG["workDir"])
    region = "asia"
    print("[clip_asia] loading country mask…", flush=True)
    mask = load_mask()
    total = 0
    for cat in categories:
        src = work / f"{region}-{cat}.geojsonl"
        dst = work / f"{region}-clipped-{cat}.geojsonl"
        if not src.is_file():
            print(f"[clip_asia] skip missing {src}", flush=True)
            continue
        n = clip_file(src, dst, mask)
        print(f"[clip_asia] {cat}: {n} features", flush=True)
        total += n
    print(f"[clip_asia] total kept: {total}", flush=True)


if __name__ == "__main__":
    main()
