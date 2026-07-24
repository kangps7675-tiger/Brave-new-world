# GlobeDashboard.tsx 분리 로드맵 + 작업 로그

## 2단계 완료 (2026-07-24)

- `useAmbientSoundSelectors` (`globe/hooks/`) — 앰비언트 사운드 셀렉터 5종 memo 이관 (~140줄 감소)
- `TourSequencer` (`globe/`) + `lib/dailyTour.ts` — 오늘의 투어 v1 (분쟁 상위 5장면 순차 fly + 카드). 후속: 사운드·양피지 연출, 지경학 장면, 리플레이 모드에서 과거 궤적 표시
- `DiscordLinkButton` — `NEXT_PUBLIC_DISCORD_INVITE` 설정 시 상단 크롬에 표시
- 레이어 굶김 수정 — `pickFairByKind` (staticGlobe.ts): 정적 포인트 상한을 kind별 라운드로빈 배분. `src/lib/staticGlobe.test.ts` 추가 (로컬에서 `npm run test`)
- 영어 패리티 — frictionEpisodes 11종 titleEn/locationNameEn/briefingEn/noteEn + 리졸버, AxisRegimePanel EN 크롬, frictionEpisodeDeep EN 브랜치 KO 누수 2곳 수정

### 남은 영어 패리티 (다음 작업)

- GlobeDashboard 내 레이어 패널 아이템 label/detail (~75개, 최대 물량)
- Compact 칩, 각종 배너·코치 문구
- hubBriefs·uiStrings는 이미 ko/en 병기 — 확인만 필요


현재 11,800여 줄 · 훅 422개. 2026-07-24 1단계 분리 완료.

## 완료 (1단계)

| 추출물 | 위치 | 내용 |
|--------|------|------|
| `EntryGateHost` | `src/components/globe/EntryGateHost.tsx` | 입장 게이트 오버레이 3종(주의·환영 편지·도메인 선택) 통합. 기본 플로우는 domain 직행, 주의·편지는 게이트 하단 링크로 선택 진입 |
| `useSceneDeeplink` | `src/components/globe/hooks/useSceneDeeplink.ts` | `?scene=1` 딥링크 파싱·적용 (게이트 생략 → 모드 → 레이어 → 카메라) |
| `sceneLink` | `src/lib/sceneLink.ts` | 장면 URL 직렬화/파싱 (순수 함수) |
| `SceneLinkButton` | `src/components/SceneLinkButton.tsx` | 「장면 링크」 복사 버튼 |
| `analyticsEvents` | `src/lib/analyticsEvents.ts` | Vercel Analytics 퍼널 이벤트 (entry_domain_select · mode_switch · layer_toggle · share_scene · deeplink_open) |

패턴: 컴포넌트 → `src/components/globe/`, 훅 → `src/components/globe/hooks/`, 순수 로직 → `src/lib/`.

## 다음 후보 (권장 순서)

1. **앰비언트 사운드 셀렉터** (`soundFrontlineAmbient`~`soundEconomyAmbient` memo 블록, ~3,400행 부근 약 250줄)
   → `useAmbientSoundSelectors(inputs)` 훅. 입력: globeLod.tier, filterCenter, layerViewState, disputes, visibleUsCarriers, show* 플래그. 출력: `{ conflictAmbient, economyAmbient }`.
2. **UKMTO / NAVAREA 클릭 → 양피지** 핸들러 (7,100행 부근) → `useMaritimeAlertBriefs`.
3. **공습경보(IL/IR) 자동 ON + 배너** effect 군 (8,800행 부근) → `useAirRaidAutoLayer`.
4. **하단 JSX 반환부**를 지정학/지경학 크롬 단위 서브컴포넌트로 (마지막 단계 — prop 정리 후).

## 검증 규칙

- 이 파일을 건드린 뒤에는 반드시 `npx tsc --noEmit` + `npm run build` 로컬 실행.
- 입장 플로우 회귀 체크: 최초 방문(localStorage 비움) → 도메인 게이트 직행 → 하단 링크로 편지/주의 진입 가능 → 모드 선택 후 히어로 레이어 정상.
- 딥링크 체크: `/?scene=1&mode=conflict&lat=12.61&lng=43.35&alt=1.2&layers=showWarZones.showAis` → 게이트 없이 해당 장면 진입.
