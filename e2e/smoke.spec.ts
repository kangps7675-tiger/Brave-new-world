import { test, expect, type Page } from "@playwright/test";

/**
 * 크로스브라우저 스모크 3종 (P0-3).
 *
 * 이 3개가 초록이면 "앱이 이 브라우저에서 최소한 쓸 수는 있다"가 보장된다.
 * 반대로 하나라도 빨간색이면 그 브라우저 사용자는 사실상 못 쓴다.
 *
 * 특히 **WebKit**을 반드시 포함한다. maplibre-gl v5는 WebGL2를 요구하고,
 * Safari의 WebGL 구현은 Chromium과 다르게 실패한다. 지금까지 이 프로젝트의
 * 테스트는 `environment: "node"`뿐이라 이 영역이 통째로 사각지대였다.
 */

/** 입장 게이트 통과 — 주의창 스킵 → 도메인 선택 */
async function enterGlobe(page: Page, domain: "conflict" | "economy" = "conflict") {
  // 첫 방문 투어·초대 배너가 레이어 토글을 가리지 않도록 선행 시드
  await page.addInitScript(() => {
    try {
      localStorage.setItem("geowatch-first-visit-tour-v1", "1");
    } catch {
      /* ignore */
    }
  });

  await page.goto("/");

  // WebGL 미지원이면 P0-1 안내 화면이 뜬다 — 스모크 자체가 성립하지 않으므로 즉시 실패시킨다
  const unsupported = page.getByText(/지구본을 표시할 수 없습니다|can't display the globe/i);
  await expect(
    unsupported,
    "WebGL2 미지원 — 이 브라우저에서는 지도가 렌더되지 않는다 (P0-1 안내 화면 노출)",
  ).toHaveCount(0, { timeout: 15_000 });

  // 주의창: 있으면 스킵. 재방문 상태(localStorage)면 아예 안 뜬다.
  const skip = page.getByRole("button", { name: /스킵 · 도메인|SKIP · DOMAIN/i });
  if (await skip.isVisible({ timeout: 20_000 }).catch(() => false)) {
    await skip.click();
  }

  const label = domain === "conflict" ? /전쟁·안보|Conflict/ : /경제·물류|Economy/;
  const domainButton = page.getByRole("button", { name: label });
  if (await domainButton.isVisible({ timeout: 20_000 }).catch(() => false)) {
    await domainButton.click();
  }
}

/** maplibre가 실제로 캔버스를 붙였는지 */
function mapCanvas(page: Page) {
  return page.locator("canvas.maplibregl-canvas");
}

/**
 * 좌측 레이어 서랍 (LayerPanelHost).
 * GPS Jam·항모 등 고정 토글(h-4)과 구분 — 그쪽은 패널이 닫혀도 남는다.
 */
function layerPanel(page: Page) {
  return page.locator("aside.intel-panel.intel-scroll-y");
}

/** 레이어 패널 안의 보이는 체크박스만 */
function visibleLayerCheckbox(page: Page) {
  return layerPanel(page).locator('input[type="checkbox"]:visible:not([disabled])').first();
}

test.describe("스모크", () => {
  test("① 부팅 — 지도 캔버스가 렌더된다", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await enterGlobe(page);

    const canvas = mapCanvas(page);
    await expect(canvas).toBeVisible({ timeout: 60_000 });

    // 0×0 캔버스는 "붙긴 했지만 안 그려진" 상태 — 검은 화면과 구분이 안 된다
    const box = await canvas.boundingBox();
    expect(box, "지도 캔버스에 크기가 없다").not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    // WebGL 컨텍스트 생성 실패는 콘솔에만 남고 화면에는 티가 안 난다
    const webglErrors = consoleErrors.filter((e) =>
      /webgl|context lost|failed to create/i.test(e),
    );
    expect(webglErrors, `WebGL 관련 콘솔 에러: ${webglErrors.join(" | ")}`).toHaveLength(0);
  });

  test("② 레이어 토글 — 체크가 즉시 반영된다", async ({ page }) => {
    await enterGlobe(page);
    await expect(mapCanvas(page)).toBeVisible({ timeout: 60_000 });

    await page.locator("#layer-panel-toggle").click();
    await expect(layerPanel(page)).toBeVisible({ timeout: 20_000 });

    const box = visibleLayerCheckbox(page);
    await expect(box).toBeVisible({ timeout: 20_000 });

    const before = await box.isChecked();
    /**
     * CI에서 native click 이 "performing click action"에 멈춘 적이 있다
     * (지도 interaction pause·대량 리렌더와 겹침). setChecked(force)는
     * 액션 가능성을 우회하고 input 상태를 직접 바꾼다.
     */
    await box.setChecked(!before, { force: true });

    /**
     * P1-1: leading-edge debounce(120ms)로 첫 토글은 즉시 반영된다.
     * 예전에는 trailing 400ms라 여기서 400ms+를 기다려야 했다 —
     * 도허티 임계와 같은 값이라 안전 마진이 0이었다.
     */
    await expect(box).toBeChecked({ checked: !before, timeout: 1_000 });

    await box.setChecked(before, { force: true });
    await expect(box).toBeChecked({ checked: before, timeout: 1_000 });

    // 토글 후에도 지도가 살아 있어야 한다 (레이어 추가로 컨텍스트가 죽는 회귀 방지)
    await expect(mapCanvas(page)).toBeVisible();
  });

  test("③ 레이어 패널 — 열고 닫힌다", async ({ page }) => {
    await enterGlobe(page);
    await expect(mapCanvas(page)).toBeVisible({ timeout: 60_000 });

    await page.locator("#layer-panel-toggle").click();

    const panel = layerPanel(page);
    await expect(panel).toBeVisible({ timeout: 20_000 });
    await expect(visibleLayerCheckbox(page)).toBeVisible({ timeout: 20_000 });

    /**
     * 패널이 열리면 inset 백드롭(z-500)이 토글(z-200)을 가린다.
     * force: 지도/마커 오버레이가 백드롭 클릭을 가로채도 닫힘을 검증한다.
     * 닫힘 판정은 GPS 등 장외 체크박스가 아니라 패널 자체다.
     */
    await page.getByRole("button", { name: /패널 닫기|Close panel/i }).click({ force: true });
    await expect(panel).toBeHidden({ timeout: 10_000 });
  });
});
