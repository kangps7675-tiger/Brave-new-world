import { test, expect, type Page } from "@playwright/test";

/**
 * 크로스브라우저 스모크 — 해역 대시보드 (2026-10-20).
 *
 * 초록이면 "이 브라우저에서 해역을 골라 피격·보험료·기상을 볼 수 있다"가 보장된다.
 * WebKit 포함 — maplibre-gl 은 WebGL2 를 요구하고 Safari 구현이 다르게 실패한다.
 * 외부 데이터는 전부 stub 해 네트워크 상태가 결과를 흔들지 않게 한다.
 */

const now = new Date().toISOString();

const STUBS: Record<string, unknown> = {
  "/api/strikes": {
    strikes: [
      {
        incident: {
          id: "ukmto-1",
          typeName: "Attack",
          occurredAt: now,
          lat: 13.2,
          lng: 43.1,
          place: "Bab el-Mandeb",
          region: "Red Sea",
          reportedVesselName: "TEST VESSEL",
          reportedVesselType: "Bulk carrier",
          detail: "Vessel reported an explosion nearby.",
        },
        status: "likely",
        top: null,
        candidates: [],
        nearbyCount: 0,
        limits: [],
        trackSource: "stub",
        warRiskRegion: "red-sea",
      },
    ],
    fetchedAt: now,
  },
  "/api/ukmto": { incidents: [], fetchedAt: now },
  "/api/war-risk": {
    quotes: [
      { region: "red-sea", ratePct: 0.7, rateHighPct: 1, confidence: "strong", outlet: "Stub", url: "https://example.com/q", publishedAt: now },
    ],
  },
  "/api/navarea": { type: "FeatureCollection", features: [] },
  "/api/liveuamap": { fetchedAt: now, events: [], status: "ok", source: "mock" },
  "/api/firms-fires": { fires: [] },
  "/api/news-stream": { fetchedAt: now, hero: null, verified: [], stateMedia: [], stats: { total: 0, tier1: 0, tier2: 0, tier3: 0, theaters: {} } },
  "/api/portwatch": { transits: {}, byChokeId: {} },
  "/api/marine-weather": { forecast: [], history: [] },
  "/api/control": { type: "FeatureCollection", features: [] },
};

async function stubApis(page: Page) {
  // 외부 호스트(지도 타일·폰트 등)는 끊는다 — 느린 외부 요청이 WebKit 에서 렌더를 붙잡지 않게.
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
  await page.route("**/data/war-countries.json", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ type: "FeatureCollection", features: [] }) }),
  );
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = STUBS[path] ?? {};
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

test.describe("해역 대시보드", () => {
  const pageErrors: string[] = [];
  const pending = new Set<string>();

  test.beforeEach(async ({ page }) => {
    pageErrors.length = 0;
    page.on("pageerror", (e) => pageErrors.push(`pageerror: ${e.message}`));
    // 시작했지만 끝나지 않은 요청 — WebKit 에서 어떤 fetch 가 걸리는지 로그로 보이게
    pending.clear();
    page.on("request", (r) => pending.add(r.url()));
    page.on("requestfinished", (r) => pending.delete(r.url()));
    page.on("requestfailed", (r) => {
      pending.delete(r.url());
      pageErrors.push(`requestfailed: ${r.url().slice(0, 120)} ${r.failure()?.errorText ?? ""}`);
    });
    page.on("console", (m) => m.type() === "error" && pageErrors.push(`console: ${m.text()}`));
    await stubApis(page);
  });

  // 실패하면 화면에 뭐가 떠 있었는지 로그에 남긴다 (WebKit 은 CI 에서만 돌아 재현이 어렵다)
  test.afterEach(async ({ page }, info) => {
    if (info.status === info.expectedStatus) return;
    const text = await page.evaluate(() => document.body.innerText.slice(0, 1500)).catch(() => "(page gone)");
    console.log(`[${info.project.name}] ${info.title}\n--- body ---\n${text}\n--- pending requests ---\n${[...pending].join("\n")}\n--- errors ---\n${pageErrors.map((e) => e.slice(0, 300)).join("\n")}`);
  });

  test("첫 화면이 뜨고 해역 패널이 보인다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "이 바다는 지금 다닐 만한가" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "피격 선박" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "전쟁위험 보험료" })).toBeVisible();
    // 데이터가 다 들어온 뒤 카드가 뜬다 — "불러오는 중…" 이 사라질 때까지 기다린다
    await expect(page.getByText("불러오는 중…").first()).toBeHidden({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Bab el-Mandeb" })).toBeVisible();
  });

  test("지구본 캔버스가 그려진다", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 30_000 });
  });

  test("흑해를 고르면 에너지 시설 섹션이 나온다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "흑해" }).click();
    await expect(page.getByRole("heading", { name: "에너지·항만 시설 피격" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "우크라이나 전쟁 동향" })).toBeVisible();
  });
});
