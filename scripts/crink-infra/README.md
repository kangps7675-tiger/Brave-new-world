# CRINK OSM infrastructure extract

Geofabrik `.osm.pbf` → tagged features → GeoJSON for MapLibre layers + corridor waypoint matching.

**No osmium-tool CLI required** — uses `pyosmium` + `geopandas`.

## Prerequisites

```bash
py -3.12 -m pip install osmium geopandas shapely pyogrio
```

PBF files — R2 `sources/osm-pbf/` (see `scripts/osm-pbf/README.md`). Local lookup: `data/sources/osm-pbf` then Downloads.

```bash
npm run osm:pbf:sync          # upload Geofabrik dumps to R2
```

| Region | File | Size |
|--------|------|------|
| asia | asia-260825.osm.pbf | ~15 GB → clip to CRINK spokes |
| russia | russia-260825.osm.pbf | ~3.9 GB |
| belarus | belarus-260824.osm.pbf | ~0.3 GB |
| ukraine | ukraine-260824.osm.pbf | ~0.8 GB |
| cuba | cuba-260825.osm.pbf | ~60 MB |
| venezuela | venezuela-260825.osm.pbf | ~120 MB |

## Tags extracted

| Category | OSM tags |
|----------|----------|
| aeroway | `aeroway=aerodrome,runway,helipad` |
| harbour | `harbour=yes`, `seamark:type=harbour` |
| border | `barrier=border_control`, `amenity=customs` |
| dam | `waterway=dam` |
| power | `power=substation`, `power=plant` only (nodes + area→centroid points) |
| checkpoint | `military=checkpoint` |
| rail | `railway=rail,light_rail,subway,narrow_gauge` (excludes `service=yard,siding,spur`) |
| road | `highway=motorway,trunk,primary` (+ `*_link` variants) |

**철도·도로만 추출 (R2 PBF) → 주요 교역로(~40) 버퍼로 필터:**

```bash
npm run osm:pbf:pull
npm run crink:infra:extract:transport
# smoke — Belarus + Ukraine only (Eurasian mesh; CUB/VEN skipped)
npm run crink:infra:extract:transport:small
# Eurasia only (excl. Western Hemisphere spokes)
npm run crink:infra:extract:transport:eurasia
```

**CUB/VEN skip (rail/road):** 쿠바·베네수엘라는 CRINK 유라시아 교역로 mesh와 무관
(`TRANSPORT_SKIP_REGIONS`). 기본 6카테고리 인프라는 그대로 두고, 철도·도로만 제외합니다.
머지 후 `snap_corridors_osm.py`가 `strategicCorridors.ts` 육로 회랑(~18km 버퍼)에
가까운 OSM 구간만 남깁니다. 전체 mesh는 `work/*-rail.geojsonl`에만 남고,
앱용 `crink-rail.geojson` / `crink-road.geojson`은 **주요 노선만** 담습니다.

**송전선·철탑 제외:** `power=line` / `power=tower` 는 추출하지 않습니다.
중국·러시아 송전망이 GeoJSON을 수십 MB로 불립니다. 공개 `crink-power.geojson`도
LineString을 후처리로 걷어낸 상태입니다.

### 메모리 (russia / asia)

`locations=True` 전체 노드 인덱스는 ~8GB RAM PC에서 `MemoryError: bad allocation`을 냅니다.
`extract.py`는 **russia·asia에 2-pass**를 씁니다 (태그 매칭 → 필요 노드 좌표만).
동시에 두 extract를 돌리지 마세요 — 여유 RAM이 말라 OOM이 재발합니다.

### osmium tags-filter (선택 CLI 전처리)

pyosmium `extract.py`가 기본 경로이지만, PBF를 미리 줄일 때:

```bash
osmium tags-filter <나라>.osm.pbf \
  n/power=substation w/power=substation \
  n/power=plant w/power=plant \
  n/barrier=border_control w/barrier=border_control \
  n/amenity=customs w/amenity=customs \
  w/waterway=dam n/waterway=dam \
  w/aeroway=aerodrome w/aeroway=runway \
  w/harbour=yes n/harbour=yes \
  n/seamark:type=harbour \
  n/military=checkpoint w/military=checkpoint \
  -o <나라>-crink-filtered.osm.pbf
```

(`w/power=line`, `w/power=tower`, `n/power=tower` 는 넣지 말 것.)

## Commands

```bash
# all regions (hours for asia+russia)
npm run crink:infra:extract

# smoke test — small countries only
npm run crink:infra:extract:small

# merge only (after partial extract)
node scripts/crink-infra/run.mjs --merge-only
```

Outputs:

- `public/data/crink/crink-{category}.geojson`
- `public/data/crink/crink-all.geojson`
- `public/data/crink/corridor-matches.json` — waypoint ↔ OSM match

Preview: layer panel → **분쟁·긴장** → **CRINK OSM 인프라** (변전소·발전소 / 국경 / 댐 / 활주로 / 항만 / 군사검문소).

## Europe drone incursions

Already in app: `showEuropeDroneIncidents` + `src/data/europeDroneIncursionSeed.ts` (UKMTO-style markers).
