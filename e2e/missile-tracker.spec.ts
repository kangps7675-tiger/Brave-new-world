import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/missile-reports", route => route.fulfill({
    json: { candidates: [], failedFeeds: 0, fetchedAt: new Date().toISOString() },
  }));
});

test("source comparison, illustrative playback, and source visibility", async ({ page }) => {
  await page.goto("/missile-tracker");
  await expect(page.getByRole("heading", { name: "북한 미사일 발표 추적" })).toBeVisible();
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  await expect(page.getByRole("cell", { name: "07:10", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "07:11", exact: true })).toBeVisible();

  const slider = page.getByRole("slider", { name: "개략 경로 재생 위치" });
  await page.getByRole("button", { name: "경로 재생", exact: true }).click();
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(0);
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  await slider.focus();
  await slider.press("End");
  await expect(slider).toHaveValue("1000");
  await page.getByRole("button", { name: "처음으로", exact: true }).click();
  await expect(slider).toHaveValue("0");

  await page.getByRole("checkbox", { name: "일본 방위성", exact: true }).uncheck();
  await expect(page.getByRole("button", { name: "경로 재생", exact: true })).toBeDisabled();
  await expect(page.getByRole("columnheader", { name: "일본 방위성", exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "일본 방위성", exact: true }).check();

  await page.getByRole("button", { name: /미 펜타곤.*10.31/ }).click();
  await expect(page.getByText("연결한 발표에 위치 정보가 없어 이 기관의 지도 표시는 없습니다.")).toBeVisible();
  await expect(page.getByRole("link", { name: "출처 열기" })).toHaveAttribute("href", /investing.com/);
});

test("mobile view remains usable when news collection fails", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/missile-reports", route => route.abort());
  await page.goto("/missile-tracker");
  await expect(page.getByRole("status").filter({ hasText: "최신" })).toContainText("최신 기사 수집 실패");
  await expect(page.getByRole("heading", { name: "발표 비교" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "경로 재생", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "경로 재생", exact: true })).toBeEnabled();
});
