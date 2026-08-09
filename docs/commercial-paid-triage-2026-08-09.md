# 유료 티어 상업 라이선스 차단 목록 분류

**실행:** `COMMERCIAL_TIER_ENABLED=true node scripts/verify-commercial-licensing.js`  
**일시:** 2026-08-09  
**요약:** 레이어 70 · 상업 가능 44 · **문제 21** (라이선스 필요 14 · 금지 1 · 미확인 일부 포함)

90일 계획: ACLED(HAPI)·adsb는 유료에서 빼고, AIS만 고객 10곳 전 결제 금지, unknown은 메일.

| 레이어 ID | commercialUse | 분류 | 메모 |
|---|---|---|---|
| `hapi-conflict-casualties` | prohibited | **포기** | ACLED/HAPI — 유료 상품 제외 (계획 확정) |
| `ais` | license-required | **협상(보류)** | 해운 B2B면 필수. **유료 고객 10곳 전 결제 금지** · 지금은 AISStream 무료 티어 |
| `reef-watch` | license-required | **포기** | 유료 패키지 제외 또는 대체 소스 |
| `tzeva-adom` | license-required | **포기** | 공습 알림 — 무료 지도 체험용으로만, 유료 SKU 제외 |
| `ukmto-incidents` | license-required | **협상** | UKMTO 정식 피드 요청 (commercial-licensing.md) |
| `military-exercises` | license-required | **포기** | 유료 SKU 제외 |
| `neptun` | license-required | **포기** | 유료 SKU 제외 (무료 진입용 가능) |
| `gps-interference` | license-required | **포기** | 유료 SKU 제외 |
| `world-stats` | license-required | **협상/대체** | 지표 출처 계약 또는 공개 통계로 교체 |
| `news-geopolitics-rss` | license-required | **협상** | RSS ToS·재배포 — 브리핑은 링크아웃 위주 |
| `news-economy-rss` | license-required | **협상** | 동일 |
| `telegram-osint` | license-required | **포기(유료)** | 정책상 사실 단정·재판매 금지 취지 — 유료 핵심에서 제외 |
| `mediazona-casualties` | license-required | **포기** | 사상자 — 유료 제외 |
| `living-conflict-taiwan` | license-required | **포기/협상** | 대만 연속 전황 — 소스 계약 전 유료 제외 |
| `intel-hotspots` | unknown | **확인메일** | 원저작자 재배포 조건 문의 |
| `nuclear-sites` | unknown | **확인메일** | 동상 |
| `missile-silos` | unknown | **확인메일** | 동상 |
| `strategic-missile-bases` | unknown | **확인메일** | 동상 |
| `missile-launch-tests` | unknown | **확인메일** | 동상 |
| `reference-monitor` | unknown | **확인메일** | 동상 |
| `news-video-youtube` | unknown | **확인메일** | YouTube ToS·임베드 조건 확인 |

## 권장 다음 액션

1. **확인메일 7건** 발송 (intel-hotspots · nuclear/missile 계열 · reference-monitor · youtube).
2. 유료 SKU 빌드에서 `prohibited` + 위 **포기** 행을 기본 OFF / 게이트 제외.
3. AIS는 파일럿 후 ROI 보고 결제.

> 법률 자문 아님. `docs/commercial-licensing.md` 와 함께 볼 것.
