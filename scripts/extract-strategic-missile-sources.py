"""
전략 미사일 레퍼런스 원본 → 정규화 vendor JSON.

원본(KMZ / Tableau .twbx / shapefile)은 바이너리라 빌드 파이프라인이 직접 읽기 부담스럽다.
이 스크립트를 한 번 돌려 커밋 가능한 JSON을 만들고, 이후 Node 빌드
(scripts/build-strategic-missile-data.js)는 그 JSON만 읽는다. 원본은 그대로 보존.

  python scripts/extract-strategic-missile-sources.py

Tableau hyper 추출에는 tableauhyperapi가 필요하다(선택):
  pip install tableauhyperapi
없으면 NTI 단계만 건너뛰고 PLARF 단계는 계속 진행한다.
"""

from __future__ import annotations

import html
import json
import os
import re
import sys
import tempfile
import zipfile
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENDOR = os.path.join(ROOT, "scripts", "vendor", "strategic-missile")
PLARF_DIR = os.path.join(VENDOR, "plarf-silo-study")
NTI_DIR = os.path.join(VENDOR, "nti-missile-tracker")

KMZ = os.path.join(PLARF_DIR, "PLARF-Silo-Study-Clean.kmz")
TWBX = os.path.join(NTI_DIR, "India-Pakistan-Missile-Launch-Tracker_v2026.1.twbx")

PLARF_OUT = os.path.join(PLARF_DIR, "plarf-silo-study.normalized.json")
NTI_OUT = os.path.join(NTI_DIR, "nti-missile-tests.normalized.json")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


# ---------------------------------------------------------------- KMZ (PLARF)

PLACEMARK_RE = re.compile(r"<Placemark\b.*?</Placemark>", re.S)
DOC_SPLIT_RE = re.compile(r"<Document\b")
NAME_RE = re.compile(r"<name>(.*?)</name>", re.S)
CDATA_RE = re.compile(r"<description><!\[CDATA\[(.*?)\]\]></description>", re.S)
ROW_SPLIT_RE = re.compile(r"<tr\b[^>]*>", re.I)
CELL_RE = re.compile(r"<td\b[^>]*>(.*?)</td>", re.S | re.I)
COORDS_RE = re.compile(r"<coordinates>\s*(.*?)\s*</coordinates>", re.S)


def strip_tags(raw: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", raw)).strip()


def popup_info(placemark: str) -> tuple[str, dict[str, str]]:
    """
    ArcGIS KML 내보내기 PopupInfo → (헤더, {label: value}).

    구조가 표 안에 표를 넣은 형태라 한 정규식으로 쌍을 뽑으면 바깥 행이
    안쪽 첫 셀까지 먹어버린다. `<tr>` 기준으로 쪼갠 뒤 중첩 표를 담은
    조각만 걸러내면 라벨/값 행이 그대로 남는다.
    """
    m = CDATA_RE.search(placemark)
    if not m:
        return "", {}
    header = ""
    pairs: dict[str, str] = {}
    for fragment in ROW_SPLIT_RE.split(m.group(1))[1:]:
        if "<table" in fragment:
            continue
        cells = [strip_tags(c) for c in CELL_RE.findall(fragment)]
        if len(cells) == 1:
            if not header:
                header = cells[0]
        elif len(cells) >= 2:
            key = cells[0]
            if key and len(key) <= 60:
                pairs[key] = cells[1]
    return header, pairs


def parse_coord_list(raw: str) -> list[list[float]]:
    """KML `lng,lat[,alt]` 공백 구분 → [[lng, lat], ...] (소수 6자리)."""
    pts: list[list[float]] = []
    for token in raw.split():
        parts = token.split(",")
        if len(parts) < 2:
            continue
        try:
            lng = round(float(parts[0]), 6)
            lat = round(float(parts[1]), 6)
        except ValueError:
            continue
        pts.append([lng, lat])
    return pts


def extract_plarf() -> dict:
    if not os.path.exists(KMZ):
        raise SystemExit(f"KMZ not found: {KMZ}")
    with zipfile.ZipFile(KMZ) as z:
        kml = z.read("doc.kml").decode("utf-8", "replace")

    silos: list[dict] = []
    candidates: list[dict] = []
    roads: list[dict] = []

    for block in DOC_SPLIT_RE.split(kml)[1:]:
        doc_name_m = NAME_RE.search(block)
        doc_name = doc_name_m.group(1).strip() if doc_name_m else ""
        placemarks = PLACEMARK_RE.findall(block)

        for idx, pm in enumerate(placemarks):
            header, pairs = popup_info(pm)
            site = pairs.get("Site") or pairs.get("Complex") or ""
            label = pairs.get("Name") or pairs.get("ID") or header or ""

            if doc_name == "All_Missile_Silos":
                coords = COORDS_RE.search(pm)
                if not coords:
                    continue
                pts = parse_coord_list(coords.group(1))
                if not pts:
                    continue
                lng, lat = pts[0]
                silos.append(
                    {
                        "id": f"plarf-silo-{len(silos) + 1:03d}",
                        "lat": lat,
                        "lng": lng,
                        "site": site,
                        "label": label,
                        "attrs": pairs,
                    }
                )
            elif doc_name == "Candidate Sites":
                # Polygon 은 outerBoundaryIs 하나만 사용 (연구 격자 사각형)
                ring_raw = COORDS_RE.search(pm)
                if not ring_raw:
                    continue
                ring = parse_coord_list(ring_raw.group(1))
                if len(ring) < 4:
                    continue
                candidates.append(
                    {
                        "id": f"plarf-candidate-{len(candidates) + 1:03d}",
                        "name": label or site or f"candidate-{idx}",
                        "site": site,
                        "ring": ring,
                        "attrs": pairs,
                    }
                )
            elif doc_name == "Roads":
                # MultiGeometry — LineString 여러 개
                for seg in COORDS_RE.findall(pm):
                    pts = parse_coord_list(seg)
                    if len(pts) < 2:
                        continue
                    roads.append(
                        {
                            "id": f"plarf-road-{len(roads) + 1:04d}",
                            "site": site,
                            "coords": pts,
                        }
                    )

    return {
        "generatedAt": now_iso(),
        "source": {
            "name": "PLARF Silo Study (China missile silo fields)",
            "file": "PLARF-Silo-Study-Clean.kmz",
            "report": "VTN-Chinas-Missile-Silo-Construction-2019-2021.pdf",
            "crs": "WGS84 (EPSG:4326)",
        },
        "counts": {
            "silos": len(silos),
            "candidateSites": len(candidates),
            "roadSegments": len(roads),
        },
        "silos": silos,
        "candidateSites": candidates,
        "roads": roads,
    }


# ------------------------------------------------------- Tableau hyper (NTI)


def iso_or_none(value) -> str | None:
    if value is None:
        return None
    text = str(value)
    if not text or text.lower() in {"none", "nat"}:
        return None
    # tableauhyperapi Timestamp → "YYYY-MM-DD HH:MM:SS[.ffffff]"
    return text.replace(" ", "T").split(".")[0]


def extract_nti() -> dict | None:
    try:
        from tableauhyperapi import Connection, HyperProcess, Telemetry
    except ImportError:
        print("   tableauhyperapi 미설치 — NTI 단계 skip (pip install tableauhyperapi)")
        return None
    if not os.path.exists(TWBX):
        print(f"   twbx not found: {TWBX} — skip")
        return None

    with zipfile.ZipFile(TWBX) as z:
        hyper_names = [n for n in z.namelist() if n.endswith(".hyper")]
        if not hyper_names:
            print("   .hyper extract 없음 — skip")
            return None
        tmp = os.path.join(tempfile.gettempdir(), "nti-missile-extract.hyper")
        with open(tmp, "wb") as fh:
            fh.write(z.read(hyper_names[0]))

    tests: list[dict] = []
    facilities: dict[int, dict] = {}

    # log_config 를 비우지 않으면 hyperd.log 를 cwd(=저장소 루트)에 떨군다
    with HyperProcess(
        telemetry=Telemetry.DO_NOT_SEND_USAGE_DATA_TO_TABLEAU,
        parameters={"log_config": ""},
    ) as hp:
        with Connection(endpoint=hp.endpoint, database=tmp) as conn:
            table = None
            for schema in conn.catalog.get_schema_names():
                names = conn.catalog.get_table_names(schema)
                if names:
                    table = names[0]
                    break
            if table is None:
                print("   hyper 테이블 없음 — skip")
                return None
            definition = conn.catalog.get_table_definition(table)
            columns = [str(c.name).strip('"') for c in definition.columns]
            for row in conn.execute_list_query(f"SELECT * FROM {table}"):
                rec = dict(zip(columns, row))

                lat = rec.get("FacilityLatitude")
                lng = rec.get("FacilityLongitude")
                facility_id = rec.get("FacilityID")
                if (
                    isinstance(facility_id, int)
                    and isinstance(lat, float)
                    and isinstance(lng, float)
                    and facility_id not in facilities
                ):
                    facilities[facility_id] = {
                        "facilityId": facility_id,
                        "name": rec.get("FacilityName") or "",
                        "altNames": rec.get("FacilityAltNames") or "",
                        "location": rec.get("FacilityLocation") or "",
                        "country": rec.get("Country2") or rec.get("Country") or "",
                        "lat": round(lat, 6),
                        "lng": round(lng, 6),
                    }

                tests.append(
                    {
                        "eventId": rec.get("EventID"),
                        "dateOccurred": iso_or_none(rec.get("DateOccurred")),
                        "country": rec.get("Country2") or rec.get("Country") or "",
                        "missileName": rec.get("MissileName1") or rec.get("MissileName") or "",
                        "missileFamily": rec.get("MissileFamily") or "",
                        "launchAgency": rec.get("LaunchAgency/Authority") or "",
                        "facilityId": facility_id,
                        "facilityName": rec.get("FacilityName1") or rec.get("FacilityName") or "",
                        "landingLocation": rec.get("LandingLocation") or "",
                        "apogeeKm": rec.get("Apogee"),
                        "distanceKm": rec.get("DistanceTravelled"),
                        "estimatedRangeKm": rec.get("EstimatedRange") or "",
                        "approxRangeKm": rec.get("ApproxRange") or "",
                        "propellant": rec.get("Propellant") or "",
                        "stages": rec.get("Stages"),
                        "outcome": rec.get("TestOutcome") or "",
                        "confirmed": bool(rec.get("Confirmation")),
                        "note": rec.get("AdditionalInformation1") or "",
                        "sources": rec.get("Source") or "",
                    }
                )

    tests.sort(key=lambda t: (t["dateOccurred"] or "", t["eventId"] or 0))

    return {
        "generatedAt": now_iso(),
        "source": {
            "name": "NTI / CNS India and Pakistan Missile Launch Tracker",
            "file": "India-Pakistan-Missile-Launch-Tracker_v2026.1.twbx",
            "publisher": "Nuclear Threat Initiative (NTI) · CNS",
            "url": "https://www.nti.org/analysis/articles/india-and-pakistan-missile-launch-tracker/",
        },
        "counts": {"tests": len(tests), "facilities": len(facilities)},
        "facilities": sorted(facilities.values(), key=lambda f: f["facilityId"]),
        "tests": tests,
    }


def write_json(path: str, payload: dict) -> None:
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print(f"   wrote {os.path.relpath(path, ROOT)} ({os.path.getsize(path):,} bytes)")


def main() -> int:
    print("extract-strategic-missile-sources")

    plarf = extract_plarf()
    print(f"   PLARF: {plarf['counts']}")
    write_json(PLARF_OUT, plarf)

    nti = extract_nti()
    if nti:
        print(f"   NTI: {nti['counts']}")
        write_json(NTI_OUT, nti)

    return 0


if __name__ == "__main__":
    sys.exit(main())
