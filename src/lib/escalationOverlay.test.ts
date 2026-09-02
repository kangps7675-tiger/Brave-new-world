/**
 * 확전 신호 오버레이 배선 테스트.
 *
 * 판정 로직(escalationSignals)과 노출량 조절(escalationFeed)은 별도 테스트가 있다.
 * 여기는 **화면에 실제로 뜨는 조건**을 잠근다.
 */
import { describe, expect, it } from "vitest";
import {
  buildOverlayBannerCandidates,
  OVERLAY_BANNER_PRIORITY,
  resolveTopOverlayBanner,
  type BuildOverlayBannerCandidatesInput,
} from "@/lib/overlayQueue";
import { DEFAULT_LAYER_PREFS } from "@/lib/layerPrefs";
import { getLayerReliability, shippedLayerIds } from "@/lib/layerReliability";

const BASE: BuildOverlayBannerCandidatesInput = {
  briefingBusy: false,
  airRaidOffer: false,
  adsbEmergencyOffer: false,
  escalationOffer: false,
  exerciseOffer: false,
  maritimeOffer: false,
  tickerSpikeOffer: false,
  tensionSpike: false,
  hotTheaterOffer: false,
  coachActive: false,
  ultraLiteOffer: false,
  isEconomyViewer: false,
  entryGateOpen: false,
  modePickerOpen: false,
};

describe("확전 신호 배너 우선순위", () => {
  it("공습경보·항공비상보다 뒤에 온다", () => {
    // 확전 신호는 "지금 대피하라"가 아니다
    expect(OVERLAY_BANNER_PRIORITY.escalation).toBeGreaterThan(
      OVERLAY_BANNER_PRIORITY.airRaid,
    );
    expect(OVERLAY_BANNER_PRIORITY.escalation).toBeGreaterThan(
      OVERLAY_BANNER_PRIORITY.adsbEmergency,
    );
  });

  it("훈련·해상공지보다는 앞에 온다 (파급이 크다)", () => {
    expect(OVERLAY_BANNER_PRIORITY.escalation).toBeLessThan(
      OVERLAY_BANNER_PRIORITY.exercise,
    );
    expect(OVERLAY_BANNER_PRIORITY.escalation).toBeLessThan(
      OVERLAY_BANNER_PRIORITY.maritime,
    );
  });

  it("공습경보와 동시면 공습경보가 이긴다", () => {
    const c = buildOverlayBannerCandidates({
      ...BASE,
      airRaidOffer: true,
      escalationOffer: true,
    });
    expect(resolveTopOverlayBanner(c)).toBe("airRaid");
  });

  it("훈련 배너와 동시면 확전 신호가 이긴다", () => {
    const c = buildOverlayBannerCandidates({
      ...BASE,
      escalationOffer: true,
      exerciseOffer: true,
    });
    expect(resolveTopOverlayBanner(c)).toBe("escalation");
  });
});

describe("확전 신호 억제 조건", () => {
  it("브리핑 중에는 뜨지 않는다", () => {
    const c = buildOverlayBannerCandidates({
      ...BASE,
      escalationOffer: true,
      briefingBusy: true,
    });
    expect(c.escalation).toBe(false);
  });

  it("진입 게이트가 열려 있으면 뜨지 않는다 (첫 화면 방해 금지)", () => {
    expect(
      buildOverlayBannerCandidates({
        ...BASE,
        escalationOffer: true,
        entryGateOpen: true,
      }).escalation,
    ).toBe(false);

    expect(
      buildOverlayBannerCandidates({
        ...BASE,
        escalationOffer: true,
        modePickerOpen: true,
      }).escalation,
    ).toBe(false);
  });

  it("신호가 없으면 아무것도 안 뜬다 — 조용한 게 기본값", () => {
    const c = buildOverlayBannerCandidates(BASE);
    expect(resolveTopOverlayBanner(c)).toBeNull();
  });
});

describe("레이어 등록", () => {
  it("layerPrefs 기본값이 존재한다", () => {
    expect(DEFAULT_LAYER_PREFS.showEscalationSignals).toBe(true);
  });

  it("shipped 카탈로그에 등록돼 있다", () => {
    expect(shippedLayerIds()).toContain("escalation-signals");
  });

  it("신뢰도 레지스트리가 model tier 로 잡는다 — 관측이 아니다", () => {
    const rel = getLayerReliability("escalation-signals");
    expect(rel).toBeTruthy();
    // 우리가 계산한 분류 점수다
    expect(rel!.evidenceTier).toBe("model");
    expect(rel!.prefsKey).toBe("showEscalationSignals");
  });

  it("주의 문구가 확전을 단정하지 않는다고 명시한다", () => {
    const rel = getLayerReliability("escalation-signals")!;
    expect(rel.caveatKo).toMatch(/판단하거나 예측하지 않/);
    expect(rel.caveatKo).toMatch(/근거는 전부 공개/);
  });
});
