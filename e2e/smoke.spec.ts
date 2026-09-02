import { test, expect, type Locator, type Page } from "@playwright/test";

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

/** 외부 API·속보 타전이 CI 스모크를 가리지 않도록 stub */
async function stubNoisyApis(page: Page) {
  const emptyNewsStream = {
    fetchedAt: new Date().toISOString(),
    hero: null,
    flashHeroes: [],
    verified: [],
    stateMedia: [],
    stats: { total: 0, tier1: 0, tier2: 0, tier3: 0, theaters: {} },
  };

  await page.route("**/api/news-stream**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(emptyNewsStream),
    });
  });

  await page.route("**/api/briefing-stats**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        stubbed: true,
        featuredNews: [],
        macroTable: [],
      }),
    });
  });

  await page.route("**/api/hapi-conflict-casualties**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data: [], stubbed: true }),
    });
  });
}

/** Playwright CDP click/setChecked는 CI에서 "performing click action"에
 * 멈출 수 있다. DOM HTMLElement.click()은 마우스 프로토콜을 우회한다.
 */
async function tapCheckbox(box: Locator) {
  await box.evaluate((el: HTMLInputElement) => {
    el.click();
  });
}

/** 데이터 출처 양피지(입장 게이트) — 8개 책갈피 열람·확인 후 통과 */
async function completeSourcesGateIfVisible(page: Page) {
  const title = page.locator("#data-source-parchment-title");
  if (!(await title.isVisible({ timeout: 2_000 }).catch(() => false))) return;

  const nav = page.getByRole("navigation", { name: /출처 책갈피|Source bookmarks/i });
  const bookmarks = nav.getByRole("button");
  const count = await bookmarks.count();
  for (let i = 0; i < count; i++) {
    await bookmarks.nth(i).click();
  }

  const dialog = page.locator('[aria-labelledby="data-source-parchment-title"]');
  const checkbox = dialog.locator('input[type="checkbox"]').first();
  await checkbox.check();

  const ack = page.getByRole("button", {
    name: /확인 · 지정학|Acknowledge · choose/i,
  });
  await expect(ack).toBeEnabled({ timeout: 5_000 });
  await ack.click();
  await expect(title).toHaveCount(0, { timeout: 15_000 });
}

/** 입장 게이트·부트 스플래시 통과 — 레이어 패널 등 클릭 가능 상태까지 */
async function enterGlobe(page: Page, domain: "conflict" | "economy" = "conflict") {
  await stubNoisyApis(page);

  // 재방문·언어·도메인 확정 — lang/domain 게이트와 첫 방문 투어를 건너뜀
  await page.addInitScript(
    ([mode]) => {
      try {
        localStorage.setItem("geowatch-first-visit-tour-v1", "1");
        localStorage.setItem("geowatch-lang-choice-v1", "1");
        localStorage.setItem("geowatch-welcome-gate-v1", "1");
        localStorage.setItem("geowatch-sources-gate-v1", "1");
        localStorage.setItem(
          "geowatch-view-config-v1",
          JSON.stringify({
            version: 1,
            packages: mode === "economy" ? ["geo-trader"] : ["frontline-live"],
            theater: "auto",
            economyHub: "auto",
            appliedAt: new Date().toISOString(),
            viewerMode: mode,
          }),
        );
        const pad2 = (n: number) => String(n).padStart(2, "0");
        const now = new Date();
        const day = `daily-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
        const foldedPrefix = "cv-periodic-brief-folded-v2-";
        for (let s = 0; s < 4; s++) {
          for (const viewerMode of ["conflict", "economy"]) {
            localStorage.setItem(foldedPrefix + `${day}-s${s}-${viewerMode}`, "1");
          }
        }
      } catch {
        /* ignore */
      }
    },
    [domain],
  );

  await page.goto("/");

  // WebGL 미지원이면 P0-1 안내 화면이 뜬다.
  // Chromium/WebKit 스모크는 실패. Firefox는 CI·헤드리스에서 WebGL2가 없는
  // 경우가 많아 스모크가 성립하지 않으므로 skip (GPU 있는 로컬 Firefox는 통과).
  const unsupported = page.getByText(/지구본을 표시할 수 없습니다|can't display the globe/i);
  try {
    await expect(
      unsupported,
      "WebGL2 미지원 — 이 브라우저에서는 지도가 렌더되지 않는다 (P0-1 안내 화면 노출)",
    ).toHaveCount(0, { timeout: 15_000 });
  } catch (err) {
    if (test.info().project.name === "firefox") {
      test.skip(true, "Firefox has no WebGL2 in this environment (typical on GitHub Actions)");
    }
    throw err;
  }

  // 게이트가 뜨면 순서대로 닫는다 (localStorage 시드 실패·?entry=1 재생 시 대비)
  const langGate = page.locator("#lang-gate-title");
  if (await langGate.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await page.getByRole("button", { name: "한국어" }).click();
    await expect(langGate).toHaveCount(0, { timeout: 10_000 });
  }

  const skip = page.getByRole("button", { name: /스킵 · 도메인|SKIP · DOMAIN/i });
  if (await skip.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await skip.click();
  }

  if (
    await page
      .locator("#data-source-parchment-title")
      .isVisible({ timeout: 3_000 })
      .catch(() => false)
  ) {
    await completeSourcesGateIfVisible(page);
  }

  const domainGate = page.locator("#domain-gate-title");
  if (await domainGate.isVisible({ timeout: 8_000 }).catch(() => false)) {
    const label = domain === "conflict" ? /전쟁·안보|Conflict/ : /경제·물류|Economy/;
    await page.getByRole("button", { name: label }).click();
    await expect(domainGate).toHaveCount(0, { timeout: 15_000 });
  }
}

/** maplibre가 실제로 캔버스를 붙였는지 */
function mapCanvas(page: Page) {
  return page.locator("canvas.maplibregl-canvas");
}

/** 부트 스플래시·게이트·양피지(z-900)가 pointer-events를 막지 않을 때까지 */
async function waitForInteractiveChrome(page: Page) {
  await expect(mapCanvas(page)).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[aria-label*="로딩 중"]')).toHaveCount(0, { timeout: 60_000 });
  await expect(page.locator("#domain-gate-title")).toHaveCount(0, { timeout: 5_000 });
  await expect(page.locator("#lang-gate-title")).toHaveCount(0, { timeout: 5_000 });
  await expect(page.locator("#entry-caution-title")).toHaveCount(0, { timeout: 5_000 });
  await expect(page.locator("#data-source-parchment-title")).toHaveCount(0, { timeout: 5_000 });

  // news-stream 로드 후 속보·등불이 늦게 뜰 수 있음 — 스크rim이 없어질 때까지 폴링
  await expect
    .poll(async () => {
      await completeSourcesGateIfVisible(page);
      await dismissBlockingParchmentOverlays(page);
      const blocking =
        (await page.locator(".welcome-letter-scrim[role='dialog']").count()) +
        (await page.locator("#data-source-parchment-title").count());
      return blocking;
    }, { timeout: 45_000 })
    .toBe(0);
}

/** 등불·속보·기타 양피지 — CTA(접기/확인 등)로 닫는다 */
async function dismissBlockingParchmentOverlays(page: Page) {
  const scrims = page.locator(".welcome-letter-scrim[role='dialog']");
  const count = await scrims.count();
  for (let i = 0; i < count; i++) {
    const scrim = scrims.nth(i);
    if (!(await scrim.isVisible().catch(() => false))) continue;
    const cta = scrim
      .getByRole("button", { name: /^(접기|Fold|확인|Understood|Continue|계속)$/i })
      .first();
    if (await cta.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cta.dispatchEvent("click");
    }
  }
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
  // 부트 스플래시(최대 ~60s) + 게이트 + 레이어 조작 — CI 90s 기본 타임아웃은 부족
  test.describe.configure({ timeout: 150_000 });

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

    // 투영 진단 훅(있으면) — 부팅 직후 missing 은 허용하되, mercator 고착은 실패
    const proj = await page
      .evaluate(() => {
        const fn = (
          window as unknown as { __GEOWATCH_MAP_PROJECTION?: () => { type?: string } }
        ).__GEOWATCH_MAP_PROJECTION;
        if (typeof fn !== "function") return null;
        const type = fn()?.type;
        return typeof type === "string" ? type : null;
      })
      .catch(() => null);
    if (proj != null) {
      expect(proj).toMatch(/vertical-perspective|globe/);
    }
  });

  test("② 레이어 토글 — 체크가 즉시 반영된다", async ({ page }) => {
    await enterGlobe(page);
    await waitForInteractiveChrome(page);

    await page.locator("#layer-panel-toggle").click();
    await expect(layerPanel(page)).toBeVisible({ timeout: 20_000 });

    const box = visibleLayerCheckbox(page);
    await expect(box).toBeVisible({ timeout: 20_000 });

    const before = await box.isChecked();
    await tapCheckbox(box);

    /**
     * P1-1: leading-edge debounce(120ms)로 첫 토글은 즉시 반영된다.
     * 예전에는 trailing 400ms라 여기서 400ms+를 기다려야 했다 —
     * 도허티 임계와 같은 값이라 안전 마진이 0이었다.
     */
    await expect(box).toBeChecked({ checked: !before, timeout: 1_000 });

    await tapCheckbox(box);
    await expect(box).toBeChecked({ checked: before, timeout: 1_000 });

    // 토글 후에도 지도가 살아 있어야 한다 (레이어 추가로 컨텍스트가 죽는 회귀 방지)
    await expect(mapCanvas(page)).toBeVisible();
  });

  test("③ 레이어 패널 — 열고 닫힌다", async ({ page }) => {
    await enterGlobe(page);
    await waitForInteractiveChrome(page);

    await page.locator("#layer-panel-toggle").click();

    const panel = layerPanel(page);
    await expect(panel).toBeVisible({ timeout: 20_000 });
    await expect(visibleLayerCheckbox(page)).toBeVisible({ timeout: 20_000 });

    /**
     * 백드롭(inset-0) click은 CI에서 CDP "performing click action"에
     * 멈춘다(지도 메인스레드/거대한 hit target). 패널 헤더 ✕는 작고
     * dispatchEvent는 마우스 프로토콜을 거치지 않는다.
     */
    await panel.getByRole("button", { name: "✕" }).dispatchEvent("click");
    await expect(panel).toBeHidden({ timeout: 10_000 });
  });
});
