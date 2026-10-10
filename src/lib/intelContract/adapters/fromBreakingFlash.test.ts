import { describe, expect, it } from "vitest";
import {
  breakingHeroToBundle,
  gateBreakingHero,
} from "@/lib/intelContract/adapters/fromBreakingFlash";
import { liveuamapEventToFlashHero } from "@/lib/liveuamap/toFlashHero";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";

const noHits = { disconfirmLog: { queried: true, hitCount: 0 } };

function ev(over: Partial<LiveuamapEvent> = {}): LiveuamapEvent {
  return {
    id: "e1",
    regionId: "ukraine",
    resid: 0,
    theater: "russia-ukraine",
    lat: 47.8,
    lng: 35.2,
    title: "Missile strike near Zaporizhzhia, invasion escalation feared",
    body: "Explosions reported",
    sourceUrl: "https://www.reuters.com/world/europe/x",
    viaSource: "Reuters",
    publishedAt: new Date().toISOString(),
    tags: [],
    ...over,
  };
}

describe("breakingHeroToBundle — LiveUA pin", () => {
  it("counts a single pin as one independent source, not two", () => {
    const bundle = breakingHeroToBundle(liveuamapEventToFlashHero(ev()), noHits);
    expect(bundle.independenceCount).toBe(1);
    expect(bundle.observations.some((o) => o.id.endsWith(":flash"))).toBe(false);
  });

  it("keeps the pin coordinate as non-independent location evidence", () => {
    const bundle = breakingHeroToBundle(liveuamapEventToFlashHero(ev()), noHits);
    const pin = bundle.observations.find((o) => o.id.endsWith(":pin"));
    expect(pin?.countsTowardIndependence).toBe(false);
    expect(pin?.geo?.precision).toBe("point");
  });

  it("uses media modality and the article tier for a Reuters-cited pin", () => {
    const bundle = breakingHeroToBundle(liveuamapEventToFlashHero(ev()), noHits);
    expect(bundle.observations[0]).toMatchObject({ modality: "media", trustTier: 1 });
  });

  it("uses tip modality for telegram or missing origin", () => {
    for (const sourceUrl of ["https://t.me/chan/1", "https://liveuamap.com/"]) {
      const bundle = breakingHeroToBundle(
        liveuamapEventToFlashHero(ev({ sourceUrl, viaSource: undefined })),
        noHits,
      );
      expect(bundle.observations[0]?.modality).toBe("tip");
    }
  });
});

describe("gateBreakingHero — LiveUA pin", () => {
  it("caps a T1-cited pin at low even when urgency is S", () => {
    const hero = liveuamapEventToFlashHero(ev());
    expect(hero.breakingRank).toBe("S");
    expect(gateBreakingHero(hero, noHits).grade).toBe("low");
  });

  it("holds a telegram-only pin", () => {
    const hero = liveuamapEventToFlashHero(ev({ sourceUrl: "https://t.me/chan/1", viaSource: undefined }));
    expect(gateBreakingHero(hero, noHits).grade).toBe("hold");
  });
});
