import { defineConfig, devices } from "@playwright/test";

/**
 * 크로스브라우저 스모크 (P0-3).
 *
 * 이 프로젝트의 유닛 테스트는 `vitest` + `environment: "node"`다. 즉
 * WebGL·오디오 자동재생·`100dvh`처럼 **브라우저마다 갈라지는 것들이
 * 정확히 검증 불가능한 영역**에 있었다. WebKit(Safari)에서 지도가 안 뜨는
 * 회귀가 나도 CI는 초록불이었다.
 *
 * 여기서는 딱 3가지만 본다 — 지도가 뜨는가, 레이어 토글이 먹는가,
 * 양피지가 열고 닫히는가. 이 3개가 깨지면 앱은 사실상 못 쓴다.
 * 커버리지를 늘리려다 느려져서 아무도 안 돌리는 스위트가 되는 게 더 나쁘다.
 *
 * 실행:
 *   npx playwright install --with-deps chromium webkit firefox   (최초 1회)
 *   npm run test:e2e                 # 3 브라우저
 *   npm run test:e2e:chromium        # 빠른 확인
 */

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // 3D 지구본 부팅은 본질적으로 느리다 — 성급한 타임아웃은 flaky의 주원인
  timeout: 90_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // WebGL 컨텍스트를 여러 개 동시에 만들면 CI 러너에서 서로 밀어낸다
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // dev 서버는 첫 요청에서 컴파일하느라 느리다 — 프로덕션 빌드를 쓴다
        command: "npm run build:next && npm run start",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
