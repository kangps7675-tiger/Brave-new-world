# 전략 미사일 레퍼런스 — 원본 보존 디렉터리

여기 있는 파일은 **원본 그대로**다. 편집·삭제하지 말 것. 파서가 필요하면
정규화 JSON을 옆에 새로 만들고, 빌드 파이프라인은 그 JSON만 읽는다.

## 구성

```
plarf-silo-study/
  PLARF-Silo-Study-Clean.kmz          원본 (Roads / All_Missile_Silos / Candidate Sites)
  shapefiles/                          같은 데이터의 shapefile 판 — 폴더 구분이 없어 KMZ가 정본
  plarf-silo-study.normalized.json     ← extract 스크립트 산출물 (커밋)

nti-missile-tracker/
  India-Pakistan-Missile-Launch-Tracker_v2026.1.twbx   원본 Tableau 패키지
  launches-by-year_export.csv                          워크북 크로스탭 내보내기
  total-launches_export.csv                            워크북 크로스탭 내보내기
  nti-missile-tests.normalized.json                    ← extract 스크립트 산출물 (커밋)

reports/
  VTN-Chinas-Missile-Silo-Construction-2019-2021.pdf   서술 리포트 (콘텐츠 집필용)
```

러시아 RVSN 편제 시드는 크기가 작아 `scripts/data/russia-srf-divisions-seed.json`에 둔다.

## 파이프라인

```bash
# 1) 원본(KMZ · twbx) → 정규화 vendor JSON. 자료를 새로 받았을 때만 돌리면 된다.
#    Tableau 추출을 읽으려면: pip install tableauhyperapi
python scripts/extract-strategic-missile-sources.py

# 2) 정규화 JSON → public/data/{lite,full}/*.json
npm run missile:build
```

2단계 산출물:

| 파일 | 내용 |
| --- | --- |
| `missile-silos.json` | PLARF 사일로 312 (StaticPoint, kind `missile-silo`) |
| `strategic-missile-bases.json` | RVSN 주둔지 12 (kind `strategic-missile-base`) |
| `missile-test-sites.json` | 인도·파키스탄 시험장 10 (kind `missile-test-site`) |
| `missile-silo-fields.json` | 조사 격자 560 + 도로 619 + 사일로군 3 |
| `missile-launch-tests.json` | 발사 시험 326건 |

`lite` 프로파일에서는 도로 세그먼트를 빼고 좌표 정밀도를 낮춘다.

서빙은 `/api/layers/strategic-missile`, 인용 정보는 `src/data/referenceLibrary.ts`.

## 출처와 한계

한계는 `src/data/referenceLibrary.ts`의 `caveatKo`에 항목별로 적어 뒀다. 요약하면:

- PLARF 사일로 312개는 **위성영상 판독 결과**지 공식 확인이 아니다.
- 후보 격자 560개는 연구가 새 후보지를 찾으려 훑은 범위다. 사일로 존재를 뜻하지 않고,
  확인된 3개 사일로군과 지리적으로 겹치지도 않는다(가장 가까운 셀도 120km 이상 떨어짐).
  그래서 셀에 사일로군을 귀속시키지 않고 원본 `GRID_ID`만 들고 온다.
- NTI 트래커는 Tableau 추출 시점(v2026.1) 기준이라 최신 발사가 빠질 수 있다.
  좌표는 발사 시설이지 탄착점이 아니다.
- RVSN 좌표는 주둔 도시다. 이동식 체계는 실제 전개 위치가 상시 달라진다.
