/**
 * 상업 게이트 **런타임 배선** — LayerPrefs 층에서 실제로 레이어를 끈다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 이 파일이 생겼나
 * ══════════════════════════════════════════════════════════════════════
 *
 * `commercialGate.ts` 는 잘 만들어져 있었지만 **호출하는 곳이 테스트뿐이었다.**
 * 즉 `COMMERCIAL_TIER_ENABLED=true` 로 켜도 화면에서는 아무것도 안 빠지고,
 * 막는 건 빌드 스크립트(`verify-commercial-licensing.js`) 한 겹뿐이었다.
 * 그 빌드 게이트마저 `LICENSE_GATE_SKIP=1` 로 우회 가능하다.
 *
 * 게이트가 "빌드 시점 한 겹"인 것과 "런타임에도 걸리는 것"은 다르다.
 * 이 파일이 두 번째 겹이다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 LayerPrefs 층인가
 * ══════════════════════════════════════════════════════════════════════
 *
 * 레이어 표시 여부는 결국 `LayerPrefs` 의 불리언 하나로 수렴한다.
 * 렌더 컴포넌트마다 게이트를 심으면 새 컴포넌트가 생길 때 빠뜨린다.
 * **prefs 를 만드는 길목에서 한 번 걸러내면 그 아래는 전부 안전하다.**
 *
 * @see src/lib/licensing/commercialGate.ts — 판정 로직
 * @see src/data/sourceCatalog.ts — commercialUse 정본
 * @see docs/copyright-audit-2026-08-01.md — O-1(b)
 */

import type { LayerPrefs } from "@/lib/layerPrefs";
import { canShowInPaidTier, type ProductTier } from "@/lib/licensing/commercialGate";

/**
 * LayerPrefs 의 문자열 키만.
 * `keyof` 는 symbol·number 도 포함할 수 있어 인덱싱에 그대로 못 쓴다.
 */
export type LayerPrefKey = Extract<keyof LayerPrefs, string>;

/**
 * LayerPrefs 키 → `sourceCatalog` 의 layerId.
 *
 * ⚠️ **비어 있으면 게이트가 통과시킨다.** 새 레이어를 추가할 때 여기 매핑을
 *    빠뜨리면 상업 게이트가 그 레이어를 못 본다. `sourceCatalog` 에
 *    `commercialUse` 를 적는 것과 **한 쌍으로** 갱신할 것.
 *
 * 매핑이 없는 pref(도시 라벨·기본 지형 등)는 자체 저작물이거나 퍼블릭 도메인이라
 * 게이트 대상이 아니다.
 */
export const PREF_TO_LAYER_ID: Partial<Record<LayerPrefKey, string>> = {
  // ── 실시간 항적·선박 ──────────────────────────────────────────
  showMilitaryActivity: "military-activity",
  showAirTraffic: "air-traffic",
  showAis: "ais",
  showReefWatch: "reef-watch",

  // ── 경보·사건 피드 ────────────────────────────────────────────
  showTzevaAdom: "tzeva-adom",
  showNeptun: "neptun",
  showUkmtoIncidents: "ukmto-incidents",
  showMilitaryExercises: "military-exercises",
  showGpsInterference: "gps-interference",
  showIntelHotspots: "intel-hotspots",

  // ── 미사일·핵 (출처 재배포 조건 미확인) ──────────────────────
  showNuclearSites: "nuclear-sites",
  showMissileSilos: "missile-silos",
  showStrategicMissileBases: "strategic-missile-bases",
  showMissileTestSites: "missile-launch-tests",

  // ── OSINT ─────────────────────────────────────────────────────
  showTelegramOsint: "telegram-osint",

  /*
   * 매핑 없음 — LayerPrefs 불리언으로 제어되지 않는 레이어들.
   * 이들은 API 라우트/뉴스 파이프라인에서 직접 오므로 이 게이트가 못 잡는다.
   * 유료화 시 각 소비 지점에서 별도로 막아야 한다:
   *
   *   gta-interventions · world-stats · mediazona-casualties ·
   *   living-conflict-taiwan · hapi-conflict-casualties · reference-monitor ·
   *   crink-hub-monitor · basemap-esri-world-imagery ·
   *   news-geopolitics-rss · news-economy-rss · news-video-youtube ·
   *   mof-port-flows · korea-macro-ecos · korea-macro-kosis · kcs-trade
   *
   * `layerPrefGate.test.ts` 가 이 목록을 검사해서, 새 pref 가 생기면
   * 매핑을 추가하도록 강제한다.
   */
};

/**
 * 유료 티어에서 꺼야 하는 pref 키 목록.
 * 무료 티어면 빈 배열 — 라이선스 조건만 지키면 되고 상업성 축은 열리지 않는다.
 */
export function blockedPrefKeys(tier: ProductTier): LayerPrefKey[] {
  if (tier === "free") return [];
  const out: LayerPrefKey[] = [];
  for (const [key, layerId] of Object.entries(PREF_TO_LAYER_ID)) {
    if (!layerId) continue;
    if (!canShowInPaidTier(layerId)) out.push(key as LayerPrefKey);
  }
  return out;
}

/**
 * prefs 에서 상업 이용 불가 레이어를 **강제로 끈다.**
 *
 * 사용자가 켜둔 설정이라도 유료 티어에서는 꺼진다. 이건 UX 문제가 아니라
 * 계약 문제라 사용자 선택보다 우선한다.
 * (왜 사라졌는지는 `PAID_TIER_NOTICE_KO` 로 안내한다.)
 *
 * 무료 티어에서는 원본을 그대로 돌려준다 — 새 객체를 만들지 않으므로
 * React 참조 비교에도 안전하다.
 */
export function enforceCommercialTier(
  prefs: LayerPrefs,
  tier: ProductTier,
): LayerPrefs {
  if (tier === "free") return prefs;

  const blocked = blockedPrefKeys(tier);
  if (blocked.length === 0) return prefs;

  // 실제로 켜져 있는 것만 끄면 되므로, 바뀔 게 없으면 원본 유지
  const needsChange = blocked.some(
    (key) => (prefs as Record<string, unknown>)[key] === true,
  );
  if (!needsChange) return prefs;

  const next = { ...prefs } as Record<string, unknown>;
  for (const key of blocked) next[key] = false;
  return next as LayerPrefs;
}

/**
 * 현재 제품 티어.
 *
 * `COMMERCIAL_TIER_ENABLED` 는 서버 전용이라 클라이언트 번들에서는 보이지 않는다.
 * 그래서 `NEXT_PUBLIC_` 쌍을 함께 본다 — 유료화를 켤 때는 **둘 다** 설정할 것.
 */
export function currentProductTier(): ProductTier {
  const server = process.env.COMMERCIAL_TIER_ENABLED === "true";
  const client = process.env.NEXT_PUBLIC_COMMERCIAL_TIER_ENABLED === "true";
  return server || client ? "paid" : "free";
}

/** 매핑이 빠진 비-allowed 레이어 — 게이트 사각지대 점검용 (테스트에서 사용). */
export function unmappedRestrictedLayerIds(allLayerIds: readonly string[]): string[] {
  const mapped = new Set(Object.values(PREF_TO_LAYER_ID));
  return allLayerIds.filter((id) => !mapped.has(id));
}
