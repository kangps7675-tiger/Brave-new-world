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
};

async function stubApis(page: Page) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = STUBS[path] ?? {};
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

test.describe("해역 대시보드", () => {
  test.beforeEach(async ({ page }) => {
    await stubApis(page);
  });

  test("첫 화면이 뜨고 해역 패널이 보인다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "이 바다는 지금 다닐 만한가" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "피격 선박" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "전쟁위험 보험료" })).toBeVisible();
    await expect(page.getByText("Bab el-Mandeb")).toBeVisible();
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
