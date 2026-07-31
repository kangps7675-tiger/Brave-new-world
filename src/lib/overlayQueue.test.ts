import { describe, expect, it } from "vitest";
import {
  buildOverlayBannerCandidates,
  canShowOverlayBanner,
  resolveTopOverlayBanner,
} from "@/lib/overlayQueue";
import { GEOWATCH_CONFIG } from "@/config/geowatch.config";
import {
  ACTIVE_LAYER_CAP_DEFAULT,
  ACTIVE_LAYER_CAP_ULTRA,
} from "@/lib/layerExclusiveCap";

describe("overlayQueue", () => {
  it("picks airRaid over maritime and coach", () => {
    expect(
      resolveTopOverlayBanner({
        airRaid: true,
        maritime: true,
        tensionCut: true,
        coach: true,
      }),
    ).toBe("airRaid");
  });

  it("picks maritime over tensionCut", () => {
    expect(
      resolveTopOverlayBanner({
        maritime: true,
        tensionCut: true,
        coach: true,
      }),
    ).toBe("maritime");
  });

  it("picks tensionCut over hotTheater and coach", () => {
    expect(
      resolveTopOverlayBanner({
        tensionCut: true,
        hotTheater: true,
        coach: true,
      }),
    ).toBe("tensionCut");
  });

  it("picks hotTheater over coach", () => {
    expect(
      resolveTopOverlayBanner({
        hotTheater: true,
        coach: true,
      }),
    ).toBe("hotTheater");
  });

  it("canShowOverlayBanner only for top", () => {
    const c = { airRaid: true, maritime: true, coach: true };
    expect(canShowOverlayBanner("airRaid", c)).toBe(true);
    expect(canShowOverlayBanner("maritime", c)).toBe(false);
    expect(canShowOverlayBanner("coach", c)).toBe(false);
  });

  it("returns null when empty", () => {
    expect(resolveTopOverlayBanner({})).toBeNull();
  });

  it("buildOverlayBannerCandidates suppresses banners when briefing busy", () => {
    const c = buildOverlayBannerCandidates({
      briefingBusy: true,
      airRaidOffer: true,
      adsbEmergencyOffer: true,
      escalationOffer: true,
      exerciseOffer: true,
      maritimeOffer: true,
      tensionSpike: true,
      hotTheaterOffer: true,
      coachActive: true,
      ultraLiteOffer: true,
      isEconomyViewer: false,
      entryGateOpen: false,
      modePickerOpen: false,
    });
    expect(c.airRaid).toBe(false);
    expect(c.maritime).toBe(false);
    expect(c.tensionCut).toBe(false);
    expect(c.hotTheater).toBe(false);
    expect(c.ultraLite).toBe(false);
    expect(c.coach).toBe(true);
  });

  it("buildOverlayBannerCandidates gates tension on economy viewer", () => {
    const c = buildOverlayBannerCandidates({
      briefingBusy: false,
      airRaidOffer: false,
      adsbEmergencyOffer: false,
      escalationOffer: false,
      exerciseOffer: false,
      maritimeOffer: false,
      tensionSpike: true,
      hotTheaterOffer: true,
      coachActive: false,
      ultraLiteOffer: true,
      isEconomyViewer: true,
      entryGateOpen: false,
      modePickerOpen: false,
    });
    expect(c.tensionCut).toBe(false);
    expect(c.hotTheater).toBe(true);
    expect(c.ultraLite).toBe(true);
  });

  it("picks coach over ultraLite", () => {
    expect(
      resolveTopOverlayBanner({
        coach: true,
        ultraLite: true,
      }),
    ).toBe("coach");
  });
});

describe("geowatch.config SSOT", () => {
  it("layer caps match config", () => {
    expect(ACTIVE_LAYER_CAP_DEFAULT).toBe(GEOWATCH_CONFIG.caps.fullModeMaxLayers);
    expect(ACTIVE_LAYER_CAP_ULTRA).toBe(GEOWATCH_CONFIG.caps.ultraLiteMaxLayers);
  });

  it("overlay priorities match config", () => {
    expect(GEOWATCH_CONFIG.overlay.bannerPriority.airRaid).toBe(10);
    expect(GEOWATCH_CONFIG.overlay.bannerPriority.hotTheater).toBe(55);
    expect(GEOWATCH_CONFIG.overlay.bannerPriority.ultraLite).toBe(65);
  });
});
