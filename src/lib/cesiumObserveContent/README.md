# Killer Content Contract

Pretty Stage 위에 **고정 3축만** 얹는다. P3는 **인터페이스만** — sync 구현·폴리시 완료는 이후.

## Stage 공개면

`camera` / `settle` / `governor` / `cinemaPref` 만.  
조립: `createObserveStagePublicApi`. Content는 Stage look·intro·idle spin·Cinema 배율을 직접 건드리지 않는다.

## Content 3축 (폴리시 순서)

| 순서 | id | 역할 | surface |
|------|-----|------|---------|
| 1 | `google-liveua` | 실사 공간 + LiveUA 사건 | cesium-sync+html |
| 2 | `ais-tagging` | 해상 식별·추적 | cesium-sync+html |
| 3 | `markets-window` | 증시창 (WebGL 밖) | html-panel |

레이어 타입: `ObserveContentLayer` — `mount?` / `sync` / `dispose?` 만.

## 보조 레이어

FIRMS·속보·conflict-events·공습·미사일 등은 `AUXILIARY_CONTENT_LAYERS`.  
킬러 3축을 가리지 않게 `ObserveClutterBudget` 뒤에서만 유지.

## 하지 않을 것 (계약)

- Stage 파일에 LiveUA·AIS·증시 로직 섞기
- 킬러 축을 새 레이어로 교체·늘리기 (별도 합의 없이)
