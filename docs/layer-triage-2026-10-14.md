# 레이어 정비 분류 초안 (2026-10-14)

기준 하나: **케이스 파일(기사 확인) 판정에 증거로 들어가는가.**
코드는 지우지 않는다. 화면 노출만 등급으로 나눈다.

| 등급 | 개수 | 노출 |
|---|---|---|
| 증거 | 14 | 항상 노출 · 케이스 파일 "증거 보기"에서 자동 ON |
| 맥락 | 19 | 기본 OFF · 레이어 패널에서 켤 수 있음 |
| 실험실 | 96 | 플래그로 숨김 (`lab` 등급) · 코드 유지 |
| 합계 | 129 | `LayerPrefs` boolean 키 전부 |

---

## 1. 증거 (14)

caseFile 센서 소스(`firms` · `air-raid` · `ais` · `adsb` · `satellite` · `control-zone` · `facility`)와 직접 연결되거나, 사건 자체를 찍는 레이어.

| 키 | 내용 | 케이스 파일 연결 |
|---|---|---|
| showAis | 선박 AIS | ais |
| showAisMilitary | AIS 군함 필터 | ais |
| showAisCommercial | AIS 상선 필터 | ais |
| showDisguisedVessels | 위장·그림자 함대 | ais (신호 끔·위장 판정) |
| showAirTraffic | 민항 ADS-B | adsb |
| showMilitaryActivity | 군용 ADS-B | adsb |
| showGpsInterference | GPS 교란(GPSJam) | adsb 보조 (항적 끊김 설명) |
| showFirmsFires | 위성 화재 감지 | firms |
| showUkraineControl | 우크라이나 전선·점령 | control-zone |
| showNeptun | 우크라이나 공중 위협 | air-raid |
| showTzevaAdom | 이스라엘 공습 경보 | air-raid |
| showUkmtoIncidents | 상선 피습·나포 경보 | 해상 사건 1차 출처 |
| showNavareaWarnings | 해상 항행경보 | 해상 사건 보조 |
| showConflictEvents | 사건 핀 | 사건 자체 |

## 2. 맥락 (19)

"거기에 뭐가 있었나"를 설명하는 레이어(장소 주장, `facility` 근처 시설) + 보도 소스.

| 키 | 내용 | 비고 |
|---|---|---|
| showCityLabels | 도시 이름 | 기본 지도 |
| showWarZones | 전쟁·교전 구역 | |
| showShippingLanes | 해상 항로 | |
| showLogisticsRisk | 해상 요충지·협로 | |
| showPorts | 항구 | facility |
| showAirports | 공항 | facility |
| showMilitaryBases | 군사기지(통합) | facility · 국가별 6개는 실험실로 |
| showNuclearSites | 핵 시설 | facility |
| showOilPipelines | 송유관 | facility |
| showGasPipelines | 가스관 | facility |
| showLngTerminals | LNG 터미널 | facility |
| showCriticalNodes | 핵심 인프라 노드 | facility |
| showMilitaryExercises | 군사훈련 공지 | 훈련 vs 실제 공격 구분용 |
| showEastAsiaAdiz | 방공식별구역 | |
| showNeptunPreviousTrails | 지나간 미사일 궤적 | 과거 사건 확인용 |
| showUkraineStrikesOnRussia | 우→러 타격 | 보도 소스 |
| showNewfeedsIranAttacks | 이란·중동 공격 소식 | 보도 소스 |
| showTelegramOsint | 텔레그램 전장 소식 | 보도 소스 (soft evidence) |
| showGdeltWar | 뉴스 · 전투·충돌 | 보도 소스 |

## 3. 실험실 (96)

| 묶음 | 개수 | 키 |
|---|---|---|
| GEM 에너지·산업 시설 | 15 | showGemCoalPlants · showGemCoalMines · showGemCoalTerminals · showGemNuclear · showGemSolar · showGemWind · showGemHydro · showGemGeothermal · showGemBioenergy · showGemOilGasPlants · showGemOilGasExtraction · showGemIronOre · showGemCement · showGemSteel · showGemChemicals |
| CRINK 인프라 | 10 | showCrinkInfraPower · showCrinkInfraBorder · showCrinkInfraDams · showCrinkInfraAeroway · showCrinkInfraHarbour · showCrinkInfraCheckpoint · showCrinkInfraRail · showCrinkInfraRoad · showCrinkInfraPipeline · showCrinkInfraPowerLine |
| 국가별 군사기지 | 6 | showRokMilitaryBases · showJapanMilitaryBases · showTaiwanMilitaryBases · showPhilippinesMilitaryBases · showAustraliaMilitaryBases · showEasternNatoMilitaryBases |
| 미사일 시설 | 4 | showMissileSilos · showStrategicMissileBases · showMissileTestSites · showMissileSiloFields |
| 분쟁 전장 토글 | 13 | showConflictTheaterUkraine · Iran · Lebanon · Syria · Taiwan · Korea · SouthChinaSea · Kuril · Baltic · BlackSea · Japan · Caucasus · CentralAsia |
| 지역 대치 사건 | 6 | showChinaTaiwanIncidents · showChinaJapanIncidents · showChinaPhilippinesIncidents · showUsChinaIncidents · showNorthKoreaMissileTests · showEuropeDroneIncidents |
| 블록·회랑·지경학 | 13 | showAlliedBlocs · showCstoBloc · showGeoEconBlocs · showAxisNetwork · showBriTradeConnectivity · showStrategicCorridors · showAlliedLogisticsCorridors · showSanctionsEvasionCorridors · showSesChip · showUsDfcSupplyChain · showGtaInterventions · showIslandChains · showDiplomaticTension |
| GDELT 기타 | 4 | showGdeltDiplomatic · showGdeltAlliance · showGdeltProtests · showGdeltOceanCompetition |
| 해저·통신·데이터 | 5 | showSubmarineCables · showSubmarineTunnels · showSubseaPipelines · showInternetExchanges · showAiDataCenters |
| 기타 | 20 | showRailGlow · showLsibBoundary · showLogisticsStress · showGscpiGauge · showResources · showRefugeeCamps · showUcdpEvents · showUsCarriers · showSpaceLaunches · showReconSatellites · showIntelHotspots · showEconomicCenters · showSanctionsEntities · showArmsEmbargo · showConflictZones · showCyberIncidents · showElectionEvents · showEscalationSignals · showWeeklyShipMoves · showReefWatch |

---

## 확인 필요 (필성 판단)

1. **showUsCarriers** — 최근 커밋이 많이 들어간 기능. 항모는 AIS를 끄고 다녀서 증거로 쓰기 어렵다고 보고 실험실에 넣음. 해상 사건 맥락으로 쓰고 싶으면 맥락으로 올리기.
2. **showUcdpEvents · showEscalationSignals** — 과거 사건 DB·확전 신호. 과거 사건 확인에 쓸 거면 맥락으로.
3. **showConflictTheater\* 13개** — 전장 네비게이션(`autoEnterTheaterNavId`)과 엮여 있을 수 있음. 숨기기 전에 전장 이동이 안 깨지는지 확인.
4. **showDiplomaticTension · showIslandChains · showAlliedBlocs** — 현재 첫 화면(`FIRST_SCREEN_CONFLICT_ON`) 기본 ON. 실험실로 보내면 첫 화면 구성도 같이 바꿔야 함.
5. **showSanctionsEntities** — 제재 선박 판별에 쓸 거면 증거(ais 보조)로.

## 적용 방법 (확정 후)

- `src/lib/licensing/layerPrefGate.ts`의 `enforceCommercialTier` 옆에 `enforceLabTier` 추가 → `LAB_LAYER_KEYS`에 든 키는 `NEXT_PUBLIC_LAB=1`이 아니면 강제 OFF + 패널에서 숨김.
- `FIRST_SCREEN_*`를 증거 레이어 기준으로 재작성.
- 뷰어 모드 5개 → 일반 맵 + 위성 확인 보기 2개 (역사·지경학·라이브는 lab).
