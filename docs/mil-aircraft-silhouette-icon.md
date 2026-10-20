# 군용기 탑다운 실루엣 아이콘

항모 갑판 아이콘(`usCarrierDeckSilhouette`)과 같은 방식의 **창작 SVG**.

## 레퍼런스

- 공개 orthographic / aerial top-view 군용기 실루엣 관례
  (전투기 삼각익, 폭격기 장폭 후퇴익, 헬기 로터디스크, AWACS 로토돔 등)
- 특정 핀터레스트·스톡 이미지를 **복제하지 않음**. 비율·특징만 참고해 path를 새로 그림.

## 파일

| 파일 | 역할 |
|------|------|
| `src/data/milAircraftSilhouettes.ts` | 역할별 path · 색 |
| `src/lib/milAircraftIcon.ts` | SVG 렌더 |
| `src/lib/milAircraftMarkers.ts` | 지도 마커 (침로 회전 + 부유) |
| `src/lib/milAircraftKind.ts` | ICAO type → 역할 분류 |

## 역할

전투기 · 폭격기 · 헬기 · 급유기 · 수송기 · 조기경보기 · 정찰 · 초계 · 건쉽 · 훈련 · UAV · 기타
