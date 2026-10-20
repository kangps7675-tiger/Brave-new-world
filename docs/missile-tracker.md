# 북한 미사일 발표 추적

경로: `/missile-tracker`. 지정학 레이어 패널의 **북한 미사일 발표 비교 · 경로 재생** 링크에서도 연다.

첫 버전은 2024-10-31 사건의 한국 합참 인용 보도, 일본 방위성 공식 발표, 펜타곤 인용 보도를 비교한다. 공개된 발사·낙하 지명을 지도로 읽고, 두 지역 사이를 설명용으로 재생한다. 기관별 시각과 수치는 합치지 않는다.

## 데이터 기준

- `src/data/missileReports.ts`: 원문을 확인한 사건과 기관별 보고. `publishedAt`은 연결한 보도·발표의 시각이며 발사 시각과 다르다. 날짜만 아는 보도는 `publicationTimeKnown: false`로 둔다.
- 좌표를 원문이 명시한 경우에만 `published-coordinate`. 지명을 지오코딩한 점은 `place-reference`이며 근거를 `basis`에 적는다.
- `bounds`는 지명을 읽기 위한 편집 범위다. 통계적 오차, 실제 발생 구역 또는 공식 낙하 예상구역을 뜻하지 않는다.
- `illustration`은 발사·낙하 근거 보고의 ID를 각각 참조한다. 해당 기관을 끄면 연결 경로도 사라진다.
- 지도는 지표면의 설명용 연결선이며 실제 비행·고도·시간을 복원하지 않는다. 1× 재생은 12초이고 자동 재생하지 않는다. 탭을 떠나면 일시정지한다.
- 원문에 없는 수치나 좌표는 만들지 않는다. 미언급은 연결한 출처 기준이다.

## 관련 기사 수집

`GET /api/missile-reports`는 세 기관 관련 Google News RSS 검색을 병렬 수집한다. 링크를 검증하고 중복을 제거하며, 일부 피드가 실패해도 검토된 사건은 반환한다. 제목·요약의 기관 언급은 후보 분류에만 쓰며, 자동으로 사건을 확정하거나 지도 좌표를 추출하지 않는다.

새 사건을 추가하려면 원문을 확인하고 사건 날짜, 발언 주체, 측정값의 소속을 구분한 뒤 데이터 파일에 보고를 추가한다. 후속 발표는 기존 보고를 덮어쓰지 말고 고유 ID로 추가한다. 현재 수집 후보를 검토·승인하는 관리 UI와 영속 저장소는 없다.

## 지도 배경과 검증

배경은 기존 `public/data/lite/countries.json`의 Natural Earth 자료에서 추출했다. 재생성: `node scripts/build-missile-context.mjs`.

회귀 검사: `npx vitest run src/lib/missileTrack.test.ts src/app/api/missile-reports/route.test.ts`.
