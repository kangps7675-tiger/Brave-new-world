import { describe, expect, it } from "vitest";
import { NEWS_LAYER_SOURCE_CATALOG } from "@/data/sourceCatalog";
import { DEFAULT_LAYER_PREFS, type LayerPrefs } from "@/lib/layerPrefs";
import { canShowInPaidTier } from "@/lib/licensing/commercialGate";
import {
  PREF_TO_LAYER_ID,
  blockedPrefKeys,
  enforceCommercialTier,
} from "@/lib/licensing/layerPrefGate";

describe("layerPrefGate — 매핑 무결성", () => {
  it("매핑된 layerId 는 전부 카탈로그에 존재한다", () => {
    const known = new Set(NEWS_LAYER_SOURCE_CATALOG.map((n) => n.layerId));
    for (const [prefKey, layerId] of Object.entries(PREF_TO_LAYER_ID)) {
      expect(known.has(layerId!), `${prefKey} → ${layerId} 가 카탈로그에 없다`).toBe(
        true,
      );
    }
  });

  it("매핑된 pref 키는 전부 LayerPrefs 에 존재한다", () => {
    for (const prefKey of Object.keys(PREF_TO_LAYER_ID)) {
      expect(
        prefKey in DEFAULT_LAYER_PREFS,
        `${prefKey} 가 LayerPrefs 에 없다 — 이름이 바뀌었는지 확인할 것`,
      ).toBe(true);
    }
  });

  it("같은 layerId 에 두 pref 가 매핑되지 않는다", () => {
    const ids = Object.values(PREF_TO_LAYER_ID);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("layerPrefGate — 티어별 동작", () => {
  it("무료 티어는 prefs 를 그대로 둔다 (참조까지 동일)", () => {
    const prefs = { ...DEFAULT_LAYER_PREFS, showAis: true } as LayerPrefs;
    expect(enforceCommercialTier(prefs, "free")).toBe(prefs);
    expect(blockedPrefKeys("free")).toEqual([]);
  });

  it("유료 티어는 상업 불가 레이어를 강제로 끈다", () => {
    // ais 는 MarineTraffic — license-required
    const prefs = { ...DEFAULT_LAYER_PREFS, showAis: true } as LayerPrefs;
    expect(canShowInPaidTier("ais")).toBe(false);

    const gated = enforceCommercialTier(prefs, "paid");
    expect(gated.showAis).toBe(false);
  });

  it("유료 티어에서도 게이트 밖·허용 레이어는 유지된다", () => {
    // military-activity 는 2026-08-01 재판정으로 allowed. shipping lanes 도 매핑 밖.
    // 강제 OFF 는 ais(license-required) 케이스가 이미 위에서 검증한다.
    const prefs = {
      ...DEFAULT_LAYER_PREFS,
      showMilitaryActivity: true,
      showShippingLanes: true,
    } as LayerPrefs;
    expect(canShowInPaidTier("military-activity")).toBe(true);

    const gated = enforceCommercialTier(prefs, "paid");
    expect(gated.showMilitaryActivity).toBe(true);
    expect(gated.showShippingLanes).toBe(true);
  });

  it("끌 게 없으면 새 객체를 만들지 않는다", () => {
    const prefs = { ...DEFAULT_LAYER_PREFS } as LayerPrefs;
    for (const key of blockedPrefKeys("paid")) {
      (prefs as Record<string, unknown>)[key] = false;
    }
    expect(enforceCommercialTier(prefs, "paid")).toBe(prefs);
  });

  it("사용자가 켜둔 설정보다 게이트가 우선한다", () => {
    // 차단 대상을 전부 켠 상태에서 시작
    const prefs = { ...DEFAULT_LAYER_PREFS } as Record<string, unknown>;
    for (const key of blockedPrefKeys("paid")) prefs[key] = true;

    const gated = enforceCommercialTier(prefs as LayerPrefs, "paid") as Record<
      string,
      unknown
    >;
    for (const key of blockedPrefKeys("paid")) {
      expect(gated[key], `${key} 가 꺼지지 않았다`).toBe(false);
    }
  });
});

describe("layerPrefGate — 사각지대 감시", () => {
  /*
   * 이 테스트가 이 파일의 존재 이유다.
   *
   * 게이트는 매핑이 있어야 작동한다. 새 레이어를 추가하면서 `sourceCatalog` 에
   * commercialUse 만 적고 PREF_TO_LAYER_ID 를 빠뜨리면, 게이트는 그 레이어를
   * **조용히 통과시킨다.** 조용한 실패가 가장 위험하다.
   *
   * pref 불리언으로 제어되지 않는 레이어(API 라우트 직결)는 애초에 이 게이트의
   * 대상이 아니므로 아래 목록에 명시해 예외로 둔다. 목록에 없는 새 항목이
   * 나타나면 테스트가 깨지고, 그때 매핑을 추가할지 예외에 넣을지 판단하면 된다.
   */
  const NOT_PREF_CONTROLLED = new Set([
    "gta-interventions",
    "world-stats",
    "mediazona-casualties",
    "living-conflict-taiwan",
    "hapi-conflict-casualties",
    "reference-monitor",
    "news-geopolitics-rss",
    "news-economy-rss",
    "news-video-youtube",
    "mof-port-flows",
    "korea-macro-ecos",
    "korea-macro-kosis",
    "kcs-trade",
  ]);

  it("상업 불가 레이어는 매핑되거나 예외 목록에 있어야 한다", () => {
    const mapped = new Set(Object.values(PREF_TO_LAYER_ID));
    const missing = NEWS_LAYER_SOURCE_CATALOG.filter(
      (n) =>
        n.status !== "blocked" &&
        n.commercialUse !== "allowed" &&
        !mapped.has(n.layerId) &&
        !NOT_PREF_CONTROLLED.has(n.layerId),
    ).map((n) => `${n.layerId} [${n.commercialUse}]`);

    expect(
      missing,
      "게이트 사각지대 — PREF_TO_LAYER_ID 에 매핑을 추가하거나 NOT_PREF_CONTROLLED 에 넣을 것",
    ).toEqual([]);
  });

  it("유료 티어에서 실제로 뭔가는 차단된다", () => {
    // 게이트가 아무것도 안 막으면 배선이 끊긴 것이다
    expect(blockedPrefKeys("paid").length).toBeGreaterThan(0);
  });
});
