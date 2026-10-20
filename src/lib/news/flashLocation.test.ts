import { describe, expect, it, vi } from "vitest";
import type { BreakingFlashBriefing } from "@/lib/news/breakingFlash";
import { runBreakingFlashGoToLocation } from "@/lib/news/breakingFlashNavigate";
import { resolveWorldPlace } from "@/lib/geo/worldPlaceMatch";

function briefing(over: Partial<BreakingFlashBriefing> = {}): BreakingFlashBriefing {
  return {
    id: "b1",
    title: "신무기 신속 속보\nNorth Korea test-fires missile",
    paragraphs: ["분류: 신무기 — 시험·발사.", "본문"],
    link: "https://example.com/a",
    mode: "conflict",
    theater: "korea",
    sourceAttribution: "Reuters · 12분 전\n속보 데스크",
    dispatchBed: "morse",
    flashSource: "rss",
    ...over,
  };
}

describe("Korean place names in article text", () => {
  it("finds a sea named with a particle attached", () => {
    expect(resolveWorldPlace(["북한이 동해에서 탄도미사일을 발사했다"])).toMatchObject({
      label: "Sea of Japan",
      precision: "landmark",
    });
    expect(resolveWorldPlace(["중국군이 남중국해에서 실사격 훈련"])).toMatchObject({
      label: "South China Sea",
    });
  });
});

describe("runBreakingFlashGoToLocation", () => {
  function deps(b: BreakingFlashBriefing) {
    const switchToObserveAndFly = vi.fn();
    return {
      switchToObserveAndFly,
      args: {
        breakingFlash: b,
        labelLanguage: "ko" as const,
        incidentEntryAltitude: 0.3,
        revealIncidentEnergyPipelines: vi.fn(),
        dismissBreakingFlash: vi.fn(),
        switchToObserveAndFly,
      },
    };
  }

  it("flies to the coordinates resolved from the whole article, not just the headline", () => {
    const d = deps(
      briefing({
        title: "신무기 신속 속보\nMissile test reported",
        coords: { lat: 39.66, lng: 124.71 },
        place: { label: "Sohae", precision: "landmark", from: "summary" },
      }),
    );
    runBreakingFlashGoToLocation(d.args);
    expect(d.switchToObserveAndFly).toHaveBeenCalledTimes(1);
    const [lat, lng, opts] = d.switchToObserveAndFly.mock.calls[0]!;
    expect(lat).toBeCloseTo(39.66, 2);
    expect(lng).toBeCloseTo(124.71, 2);
    // 이름 있는 지점은 도시보다 넓게
    expect(opts.altitude).toBeGreaterThanOrEqual(0.7);
  });

  it("flies wider still for an estimated representative city", () => {
    const d = deps(
      briefing({
        coords: { lat: 1.28, lng: 36.8 },
        place: { label: "Nairobi", precision: "country-rep", from: "title" },
      }),
    );
    runBreakingFlashGoToLocation(d.args);
    expect(d.switchToObserveAndFly.mock.calls[0]![2].altitude).toBeGreaterThanOrEqual(1.1);
  });

  it("keeps the close-in altitude for a named city", () => {
    const d = deps(
      briefing({
        coords: { lat: 1, lng: 2 },
        place: { label: "Lima", precision: "city", from: "title" },
      }),
    );
    runBreakingFlashGoToLocation(d.args);
    expect(d.switchToObserveAndFly.mock.calls[0]![2].altitude).toBe(0.3);
  });
});
