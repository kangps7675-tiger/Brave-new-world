# 릴리스 체크리스트

배포 직전에 한 번씩 통과한다.

## 빌드 게이트 (`NEXT_RELAX_BUILD_GATES`)

로컬 기본값은 개발 속도용으로 게이트가 완화되어 있다 (`next.config.mjs`의 `relaxNextBuildGates`).

**배포(또는 main 머지) 전:**

```bash
NEXT_RELAX_BUILD_GATES=0 npm run build
```

이 한 번이 실패하면 배포하지 않는다. CI에서도 동일 환경변수를 쓰는 것이 정본이다.

## 스모크

- Playwright e2e (`npm run test:e2e`) — chromium 최소, main이면 3종
- WebGL 비활성 / 컨텍스트 유실 시 안내·재시도 UI 확인

## 캐시·성능

- `npm run verify:api-cache` (있다면) — GET route Cache-Control 가드
