# stub OFF 최종 체크리스트 (방패 3개)

> stub를 끄기 전 이 세 방패가 채워져 있어야 렉·API 키 폭발을 막습니다.  
> 아키텍처: [data-architecture-2tier.md](./data-architecture-2tier.md)

---

## [x] 방패 1 — Cron → D1 (유저가 외부 API를 직접 못 찌르게)

| 항목 | 상태 |
|------|------|
| Cron `*/10 * * * *` | `wrangler.ingest.toml` |
| FIRMS/GDELT → D1 | ingest Worker |
| D1 비면 빈 응답 (`waiting`) | FIRMS · GDELT · AIS · ADS-B mil/civ — **`?live=1` 만** 외부 호출 |
| Warm URL (뉴스/AIS/ADS-B/터널) | wrangler secret 설정 권장 — 미설정 시 해당 테이블은 비어 있을 수 있음 |

확인:

```bash
curl https://conflict-view-ingest.<subdomain>.workers.dev/latest
# firmsRows / gdeltRows > 0 이면 1층 창고 OK
```

---

## [x] 방패 2 — `liveRenderGuard` 브레이크

| 피드 | stub OFF 간격 |
|------|----------------|
| Tzeva | 15s |
| Telegram | 30s |
| News RSS | **150s** (`liveNewsPollMs`) |
| FIRMS | 5min |
| AIS | 90s · max 120 |
| ADS-B mil | 75s · max 150 |
| Ticker | 15min |

파일: `src/lib/liveRenderGuard.ts` — **삭제·완화 금지**.

---

## [x] 방패 3 — 레이어 기본 OFF · 개수 제한

> **정본:** `src/lib/layerExclusiveCap.ts` · `src/lib/viewPackages.ts` (문서 숫자와 다르면 코드를 따름)

| 항목 | 값 |
|------|-----|
| UI 동시 ON | 일반 **30** / Ultra-Lite **16** (`ACTIVE_LAYER_CAP_*`) |
| 패키지 hard cap | 지정학·지경학 각 **64** (`MAX_ON_LAYERS` / `MAX_ON_LAYERS_ECONOMY`) |
| 크롬 force-on | 전쟁구역·우크라·NEPTUN·GDELT·Telegram — **AIS/ADS-B/항모는 토글 시만** |

---

## stub OFF 절차

1. 위 `/latest`로 D1 행 확인  
2. (권장) R2 CDN · warm secrets  
3. `.env`: `API_STUB_MODE=false` · `NEXT_PUBLIC_API_STUB_MODE=false`  
4. 서버 재시작 후 Ultra-Lite·레이어 소수만 ON으로 스모크

아직 끄지 말 것: 가드 코드 자체. 끄기만 하는 것은 **env 스위치**입니다.

---

## 배포 게이트 (고정)

| 명령 | 언제 |
|------|------|
| `npm run verify:product-spec` | CI 항상 (README·체크리스트·캡·폴링 숫자 SSOT) |
| `npm run verify:stub-off-gate` | `API_STUB_MODE=false` 또는 `FORCE_STUB_OFF_GATE=1` · `cf:ci-deploy`에 포함 |

`scripts/ci-deploy.js`는 stub OFF env일 때 스펙 검증 실패 시 배포를 중단합니다.  
D1 `/latest` 행 확인·warm secrets는 여전히 **운영 수동** 전제입니다.
