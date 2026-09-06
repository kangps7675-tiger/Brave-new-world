#!/usr/bin/env python3
"""
Fetch UN Comtrade bilateral TOTAL trade (USD) for unique corridor comtradePair keys.

Uses official `comtradeapicall` package.
- With COMTRADE_SUBSCRIPTION_KEY (or UN_COMTRADE_KEY): getFinalData (up to 250k rows)
- Without key: previewFinalData (public, 500-row cap — enough for TOTAL × few years)

Output:
  scripts/data/comtrade-bilateral.json
  public/data/crink/comtrade-bilateral.json

Usage:
  python scripts/comtrade/fetch_bilateral.py
  COMTRADE_SUBSCRIPTION_KEY=xxx python scripts/comtrade/fetch_bilateral.py
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
META_PATH = ROOT / "src" / "data" / "corridor-rank-meta.json"
OUT_SCRIPTS = ROOT / "scripts" / "data" / "comtrade-bilateral.json"
OUT_PUBLIC = ROOT / "public" / "data" / "crink" / "comtrade-bilateral.json"

# Years averaged for the score (keep short — public API is slow/rate-limited)
PERIODS = ("2022", "2023")
# Sleep between pair calls (public API is rate-limited)
SLEEP_SEC = 0.8

# ISO3 → UN M49 (Comtrade reporter/partner codes) for corridor endpoints
ISO3_TO_M49: dict[str, str] = {
    "ARE": "784",
    "ARM": "51",
    "AZE": "31",
    "BLR": "112",
    "CHN": "156",
    "CUB": "192",
    "EGY": "818",
    "GEO": "268",
    "IND": "356",
    "IRN": "364",
    "IRQ": "368",
    "KAZ": "398",
    "KGZ": "417",
    "KOR": "410",
    "LBN": "422",
    "MMR": "104",
    "MNG": "496",
    "NLD": "528",
    "PAK": "586",
    "POL": "616",
    "PRK": "408",
    "RUS": "643",
    "SAU": "682",
    "SYR": "760",
    "TJK": "762",
    "TKM": "795",
    "TUR": "792",
    "UZB": "860",
    "YEM": "887",
}


def load_dotenv() -> None:
    env_path = ROOT / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


def pair_key(a: str, b: str) -> str:
    x, y = sorted([a.upper(), b.upper()])
    return f"{x}|{y}"


def unique_pairs(meta: dict) -> list[tuple[str, str]]:
    seen: set[str] = set()
    out: list[tuple[str, str]] = []
    for c in meta.get("corridors", []):
        pair = c.get("comtradePair") or []
        if len(pair) < 2:
            continue
        a, b = str(pair[0]).upper(), str(pair[1]).upper()
        key = pair_key(a, b)
        if key in seen:
            continue
        seen.add(key)
        out.append((a, b))
    return out


def sum_primary(df) -> float:
    if df is None or getattr(df, "empty", True):
        return 0.0
    col = None
    for name in ("primaryValue", "PrimaryValue", "cifvalue", "fobvalue"):
        if name in df.columns:
            col = name
            break
    if col is None:
        return 0.0
    return float(df[col].fillna(0).sum())


def fetch_directed(subscription_key: str | None, reporter: str, partner: str, period: str):
    import comtradeapicall as cc

    kwargs = dict(
        typeCode="C",
        freqCode="A",
        clCode="HS",
        period=period,
        reporterCode=reporter,
        cmdCode="TOTAL",
        flowCode="X,M",
        partnerCode=partner,
        partner2Code=None,
        customsCode=None,
        motCode=None,
        maxRecords=100,
        format_output="JSON",
        aggregateBy=None,
        breakdownMode="classic",
        countOnly=None,
        includeDesc=False,
    )
    if subscription_key:
        return cc.getFinalData(subscription_key, **kwargs)
    return cc.previewFinalData(**kwargs)


def bilateral_usd(subscription_key: str | None, iso_a: str, iso_b: str) -> dict:
    code_a = ISO3_TO_M49.get(iso_a)
    code_b = ISO3_TO_M49.get(iso_b)
    if not code_a or not code_b:
        return {
            "isoA": iso_a,
            "isoB": iso_b,
            "usd": None,
            "error": f"missing M49 for {[x for x in (iso_a, iso_b) if x not in ISO3_TO_M49]}",
            "years": {},
        }

    year_sums: dict[str, float] = {}
    errors: list[str] = []
    for period in PERIODS:
        total = 0.0
        try:
            # A reports vs B + B reports vs A (mirror fill)
            df_ab = fetch_directed(subscription_key, code_a, code_b, period)
            total += sum_primary(df_ab)
            time.sleep(SLEEP_SEC)
            df_ba = fetch_directed(subscription_key, code_b, code_a, period)
            total += sum_primary(df_ba)
            # Mirror double-counts when both report — take max of directed halves
            # Better: average of (A→B reported + B→A reported) / 2 when both present
            ab = sum_primary(df_ab)
            ba = sum_primary(df_ba)
            if ab > 0 and ba > 0:
                total = (ab + ba) / 2.0
            else:
                total = ab + ba
            year_sums[period] = total
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{period}: {exc}")
            year_sums[period] = 0.0
        time.sleep(SLEEP_SEC)

    positive = [v for v in year_sums.values() if v > 0]
    usd = (sum(positive) / len(positive)) if positive else None
    return {
        "isoA": iso_a,
        "isoB": iso_b,
        "m49A": code_a,
        "m49B": code_b,
        "usd": usd,
        "years": year_sums,
        "errors": errors or None,
    }


def main() -> int:
    load_dotenv()
    try:
        import comtradeapicall  # noqa: F401
    except ImportError:
        print(
            "comtradeapicall not installed. Run:\n"
            '  python -m pip install comtradeapicall pandas urllib3\n'
            "or install the local wheel/folder under Downloads.",
            file=sys.stderr,
        )
        return 1

    key = (
        os.environ.get("COMTRADE_SUBSCRIPTION_KEY")
        or os.environ.get("UN_COMTRADE_KEY")
        or os.environ.get("COMTRADE_API_KEY")
    )
    mode = "subscription" if key else "preview (public, no key)"
    print(f"[comtrade] mode={mode} periods={','.join(PERIODS)}", flush=True)

    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    pairs = unique_pairs(meta)
    print(f"[comtrade] unique pairs={len(pairs)}", flush=True)

    rows = []
    for i, (a, b) in enumerate(pairs, 1):
        print(f"  [{i}/{len(pairs)}] {a}|{b} …", flush=True)
        row = bilateral_usd(key, a, b)
        rows.append(row)
        usd = row.get("usd")
        if usd is None:
            print(f"      → null ({row.get('error') or row.get('errors')})", flush=True)
        else:
            print(f"      → ${usd:,.0f}", flush=True)

    by_pair = {pair_key(r["isoA"], r["isoB"]): r for r in rows}
    payload = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "UN Comtrade API (comtradeapicall)",
        "mode": mode,
        "periods": list(PERIODS),
        "method": "Annual TOTAL goods; avg of years with data; directed A↔B averaged when both report",
        "pairCount": len(rows),
        "withData": sum(1 for r in rows if r.get("usd")),
        "pairs": by_pair,
    }

    for out in (OUT_SCRIPTS, OUT_PUBLIC):
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"[comtrade] wrote {out.relative_to(ROOT)}", flush=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
