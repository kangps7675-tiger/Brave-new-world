# Audio assets (`public/audio`)

사운드 지휘소: [`src/data/audioManifest.ts`](../../src/data/audioManifest.ts)  
저작물 명시(CC-BY/NC만): [`src/lib/audioAttribution.ts`](../../src/lib/audioAttribution.ts) · Sources 패널  
스트림 API: `GET /api/sound-stream?eventId=…`  
클라우드: `npm run cf:r2:upload:audio` → R2 `audio/*` · `NEXT_PUBLIC_DATA_CDN` 우선

## 로컬 파일 (전투 · 공습)

`localSrc`가 있으면 Freesound를 **완전히 우회**합니다. (텍스트 검색 오매칭·개 짖는 소리 등 방지)

### 공습
| 파일 | 이벤트 | 용도 |
|------|--------|------|
| `air-attack-siren.mp3` | `tzeva-red-alert` · `tzeva-all-clear` · `neptun-air-alert` | 이스라엘 / 우크라 공습 사이렌 (칩·버튼 fly 전용) |

### 전장
| 파일 | 이벤트 | 용도 |
|------|--------|------|
| `combat-firefight-distant.mp3` | `frontline-gunfire` · `gdelt-war-sting` | [FS#404334](https://freesound.org/s/404334/) Firefight · 원거리 MG/박격포 · CC0 |
| `combat-mg-distant-smg.mp3` | `frontline-gunfire-distant-auto` | [FS#417690](https://freesound.org/s/417690/) distant SMG · CC0 |
| `combat-mlrs.wav` | `frontline-mlrs` | 다련장 |
| `combat-frontline-bed.wav` | `frontline-artillery-ambient` | 전선 rumble 루프 |

---

## 인프라 · 이동체 클릭 (Freesound)

| Event ID | FS ID | 트리거 | 라이선스 |
|----------|-------|--------|----------|
| `aircraft-civil-pass` + `aircraft-civil-pa` | [424831](https://freesound.org/s/424831/) · [177560](https://freesound.org/s/177560/) | 민간기 클릭(겹침) | CC0 |
| `aircraft-military` | [789950](https://freesound.org/s/789950/) | 군용기 클릭 | **CC-BY** |
| `ais-merchant` | [843948](https://freesound.org/s/843948/) | AIS 상선 클릭 | **CC-BY** |
| `carrier-deck-ambient` + `carrier-radio-bed` | [162449](https://freesound.org/s/162449/) · [806273](https://freesound.org/s/806273/) | 미 항모 **클릭** (라디오 저음 깔개) | CC0 |
| `mil-submarine` | [713525](https://freesound.org/s/713525/) | 군 잠수함 클릭 (Sonar) | CC0 |
| `disguised-vessel` | [510902](https://freesound.org/s/510902/) | 위장선박 클릭 | CC0 |
| `recon-satellite` | [189860](https://freesound.org/s/189860/) | 정찰위성 클릭 | **CC-BY** |
| `airport-walla` | [113606](https://freesound.org/s/113606/) | 공항 클릭 | **CC-BY** |
| `oil-spike` | [234782](https://freesound.org/s/234782/) | LNG 클릭 · CL=F/BZ=F SPIKE | CC0 |
| `chokepoint-drone` | [44823](https://freesound.org/s/44823/) | 초크포인트 클릭 | **CC-BY** |
| `logistics-hub-crane` | [130017](https://freesound.org/s/130017/) | 물류 허브 클릭 | **CC-BY** |
| `shipping-lane-sea` | [693576](https://freesound.org/s/693576/) | 항로 클릭 | **CC-BY-NC** |
| `rail-freight` | [455775](https://freesound.org/s/455775/) | 철도 클릭 | CC0 |
| `submarine-tunnel-ambience` | [474404](https://freesound.org/s/474404/) | 해저터널 클릭 | **CC-BY** |
| `subsea-pipeline` | [554314](https://freesound.org/s/554314/) | 해저 파이프 클릭 | CC0 |
| `nuclear-plant` | [530974](https://freesound.org/s/530974/) | 원전 클릭 | **CC-BY** |
| `oil-gas-plant` | [58823](https://freesound.org/s/58823/) | 석유·가스 플랜트 | **CC-BY-NC** |
| `coal-mining` | [410422](https://freesound.org/s/410422/) | 석탄 광산·터미널 | **CC-BY-NC** |
| `heavy-industry` | [157714](https://freesound.org/s/157714/) | 철광/철강/시멘트/화학 | CC0 |
| `submarine-cable` | [829569](https://freesound.org/s/829569/) | 해저케이블 클릭 | CC0 |
| `mil-base-heli` + `mil-base-crowd` + `mil-base-armor` | [741812](https://freesound.org/s/741812/) · [768932](https://freesound.org/s/768932/) · [329800](https://freesound.org/s/329800/) | 군사기지 클릭(3중 겹침) | CC0 / **CC-BY** / CC0 |
| `missile-silo` | [135836](https://freesound.org/s/135836/) | 미사일 사일로 클릭 | **CC-BY** |
| `ballistic-travel` | [501328](https://freesound.org/s/501328/) | 탄도미사일 클릭 | CC0 |

**ReefWatch 근접 항적:** 화면 보일 때 `aircraft-civil-pass`를 아주 작게 자동 재생 (클릭 불필요).

---

## 기존 큐레이션 (일부)

| Event ID | FS ID | 라이선스 |
|----------|-------|----------|
| `frontline-bombing` | [161806](https://freesound.org/s/161806/) | **CC-BY-NC** |
| `frontline-fpv-detonation` | [840902](https://freesound.org/s/840902/) | **CC-BY** |
| `hero-breaking` | [553739](https://freesound.org/s/553739/) christislord Morse · CC0 |
| `breaking-dark-bed` | [587014](https://freesound.org/s/587014/) Victor_Natas Something dark · 모스와 겹침 · 초반 쾅 | **CC-BY** |
| `firms-exercise` | [612277](https://freesound.org/s/612277/) | **CC-BY-NC** |
| `firms-wildfire-crackle` | [620324](https://freesound.org/s/620324/) | **CC-BY** |
| `construction-ambient` | [159470](https://freesound.org/s/159470/) | **CC-BY** |
| `datacenter-hum` | [610761](https://freesound.org/s/610761/) | **CC-BY** |
| `parchment-fold` | [140891](https://freesound.org/s/140891/) | **CC-BY** |
| `flyto-arrive` / `parchment-flyaway` | [833599](https://freesound.org/s/833599/) | **CC-BY** |
| `mode-switch` / `ui-click` | [458586](https://freesound.org/s/458586/) | **CC-BY** |
| `boot-ready` | [413749](https://freesound.org/s/413749/) | **CC-BY** |

CC0 항목은 저작물 명시 의무 없음 → Sources 패널·`audioAttribution.ts`에서 제외.

---

## 재생 규칙

- **지정학 앰비언트:** 전선 → 대만해협 틱 → 긴장 rumble (항모는 **클릭만**)
- **지경학 앰비언트:** 파이프라인 → 데이터센터 → 항구 → LNG(미세) → 경제중심
- **인프라·이동체:** 해당 피처/경로를 **누를 때** 원샷 (겹침 허용)
- 공습 사이렌: 칩/버튼 fly 전용
