# Reference assets

## `us-carrier-deck-aerial.png`

US Navy 항공모함 **공중俯視** 참조 사진입니다.

- 지도 마커 실루엣: `src/data/usCarrierDeckSilhouette.ts`
- SVG: `src/lib/usCarrierDeckIcon.ts`

## 수상전투함 (호위함과 동일 세트 — 구축·초계·순양·상륙·미분류 공용, 항모·잠수함 제외)

| 파일 | 내용 |
|------|------|
| `ddg-aerial-bow-aft.png` | 주 俯視 참조 (스텔스·노란 갑판선·레이돔) |
| `ddg-arleigh-burke-profile.png` | 측면 참조 (USS Ralph Johnson DDG-114) |
| `rok-ddg-surface-combatant-aerial.png` | 세종대왕급 보조 |
| `rok-ddg-sejong-aerial.png` | 세종대왕급 보조 |
| `us-ddg-arleigh-burke-aerial.png` | 알레이버크급 보조 |

- geometry: `src/data/surfaceCombatantSilhouette.ts`
- SVG: `src/lib/surfaceCombatantDeckIcon.ts`
- 마커: `src/lib/aisVesselMarkers.ts` (`usesSurfaceCombatantDeckIcon` — 잠수함·항모만 제외)

## 위장·다크플리트 (불법 그림자 함대 · 컨테이너/화물선형)

| 파일 | 내용 |
|------|------|
| `shadow-fleet-tanker-stern.png` | 풍화·녹슨 선미 3/4 (그림자함대 톤) |
| `shadow-fleet-liberty-bow.png` | 화물선 선수·마스트·적색 흘수선 |

- geometry: `src/data/shadowFleetSilhouette.ts`
- SVG: `src/lib/shadowFleetDeckIcon.ts`
- 마커: `aisVesselMarkers` — `vessel.disguised` 시 군함 실루엣 대신 사용

## 잠수함

| 파일 | 내용 |
|------|------|
| `submarine-underwater-aerial.png` | 수중 시가형 헐 주 참조 |
| `submarine-torpedo-quarter.png` | 3/4·어뢰 발사 보조 |

- geometry: `src/data/submarineSilhouette.ts`
- SVG: `src/lib/submarineDeckIcon.ts`
- 마커: `isAisAspectHullMarker` (submarine)
