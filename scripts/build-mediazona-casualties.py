#!/usr/bin/env python3
"""Build public/data/live/mediazona-casualties.json from the Kaggle Mediazona panel.

  pip install "kagglehub[pandas-datasets]"
  python scripts/build-mediazona-casualties.py

Cite Mediazona / BBC / gogov.ru / Rosstat / GADM — not the Kaggle compilation.
"""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import kagglehub
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "live" / "mediazona-casualties.json"
SLUG = "matthewdegtyar/russia-mediazona-casualties-bonuses-panel-0526"
CSV_NAME = "russia_regional_casualties_may_2026.csv"
HOME_URL = "https://en.zona.media/"


def scrape_live_count() -> tuple[int | None, str | None]:
    try:
        with urllib.request.urlopen(HOME_URL, timeout=25) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except Exception as exc:  # noqa: BLE001
        print("live scrape failed:", exc)
        return None, None
    m = re.search(r"(\d{1,3}(?:,\d{3})+)\s*deaths?\s+confirmed", html, re.I)
    if not m:
        return None, None
    return int(m.group(1).replace(",", "")), datetime.now(timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )


def main() -> None:
    path = Path(kagglehub.dataset_download(SLUG))
    csv_path = path / CSV_NAME
    if not csv_path.exists():
        raise SystemExit(f"missing {CSV_NAME} in {path}")

    df = pd.read_csv(csv_path)
    panel_total = int(df["casualties_total"].sum())
    panel_as_of = str(df["as_of_date"].iloc[0])
    top = (
        df.nlargest(8, "casualties_total")[
            ["federal_subject", "iso_3166_2", "casualties_total"]
        ]
        .assign(casualties_total=lambda x: x["casualties_total"].astype(int))
        .to_dict(orient="records")
    )

    live, live_at = scrape_live_count()
    display = live if live is not None else panel_total
    display_as_of = (
        datetime.now(timezone.utc).strftime("%Y-%m-%d") if live is not None else panel_as_of
    )

    out = {
        "confirmedNamedDeaths": display,
        "confirmedNamedDeathsAsOf": display_as_of,
        "confirmedNamedDeathsSource": (
            "Mediazona x BBC Russian Service (en.zona.media homepage scrape)"
            if live is not None
            else f"Kaggle panel regional sum ({CSV_NAME})"
        ),
        "estimatedWounded": 900_000,
        "estimatedWoundedAsOf": "2025-12",
        "estimatedWoundedSource": (
            "CSIS end-2025 combat-casualty estimate (≈1.2M total; ~¼ killed) "
            "via Meduza analysis — wounded not named-confirmed"
        ),
        "panelConfirmedDeaths": panel_total,
        "panelAsOf": panel_as_of,
        "panelSource": f"{SLUG} ({CSV_NAME})",
        "panelKaggleSlug": SLUG,
        "caveat": (
            "Named deaths are a lower bound. Wounded figures are estimates only "
            "(no public named WIA list)."
        ),
        "cite": [
            "Mediazona",
            "BBC Russian Service",
            "CSIS",
            "Meduza",
            "gogov.ru",
            "Rosstat",
            "GADM",
        ],
        "urls": {
            "mediazona": "https://en.zona.media/article/2026/07/03/casualties_eng-trl",
            "russia200": "https://200.zona.media/",
            "kaggle": f"https://www.kaggle.com/datasets/{SLUG}",
            "csisNote": (
                "https://meduza.io/en/feature/2026/01/29/"
                "russia-s-military-losses-in-ukraine-surpass-any-major-power-since-wwii"
                "-yet-re-deployed-wounded-obscure-the-true-toll"
            ),
        },
        "marker": {
            "lat": 48.52,
            "lng": 37.85,
            "killedLabelKo": "사망",
            "killedLabelEn": "KIA",
            "woundedLabelKo": "부상",
            "woundedLabelEn": "WIA",
        },
        "topRegions": top,
        "builtAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "liveScrapedAt": live_at,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} display={display} panel={panel_total} live={live}")


if __name__ == "__main__":
    main()
