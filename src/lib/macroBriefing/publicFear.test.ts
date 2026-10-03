import { describe, expect, it } from "vitest";
import { buildMacroBriefing } from "./rollup";
import {
  publicFearHeatMultiplier,
  scorePublicFearText,
  scoreRssPublicFear,
} from "./publicFear";
import type { MacroRssInputItem } from "./types";

function rss(
  partial: Partial<MacroRssInputItem> & Pick<MacroRssInputItem, "id" | "title" | "link">,
): MacroRssInputItem {
  return {
    source: "Reuters",
    pubDate: new Date().toISOString(),
    theater: "middle-east",
    trustTier: 1,
    urgencyScore: 70,
    ageMinutes: 20,
    feedTopic: "defense",
    ...partial,
  };
}

describe("publicFear", () => {
  it("ranks existential threats and summits above soft exercises", () => {
    expect(scorePublicFearText("Tactical nuke threat raises red line")).toBe(4);
    expect(scorePublicFearText("전술핵 위협으로 확전 우려")).toBe(4);
    expect(scorePublicFearText("Missile strike hits apartment block")).toBe(3);
    expect(scorePublicFearText("US-China bilateral summit in Geneva")).toBe(3);
    expect(scorePublicFearText("Foreign ministers hold bilateral summit")).toBe(3);
    expect(scorePublicFearText("Joint military exercise begins offshore")).toBe(0);
  });

  it("multiplies heat harder for high fear", () => {
    expect(publicFearHeatMultiplier(4, 3)).toBeGreaterThan(
      publicFearHeatMultiplier(1, 1),
    );
    expect(publicFearHeatMultiplier(0, 0)).toBeLessThan(1);
  });

  it("puts nuclear-fear theme above routine multi-source shelling", () => {
    const nuclear = [
      rss({
        id: "n1",
        title: "Nuclear warhead rhetoric escalates after strike",
        link: "https://www.reuters.com/nuke-1",
        theater: "russia-ukraine",
        urgencyScore: 60,
      }),
    ];
    const routine = [
      rss({
        id: "r1",
        title: "Artillery duel continues along front line",
        link: "https://www.reuters.com/front-1",
        theater: "middle-east",
        urgencyScore: 80,
      }),
      rss({
        id: "r2",
        title: "Front line clashes reported overnight",
        link: "https://apnews.com/front-2",
        source: "AP",
        theater: "middle-east",
        urgencyScore: 75,
      }),
      rss({
        id: "r3",
        title: "Troops exchange fire near border",
        link: "https://www.bbc.com/front-3",
        source: "BBC",
        theater: "middle-east",
        urgencyScore: 70,
      }),
    ];

    const payload = buildMacroBriefing({
      domain: "geo",
      lang: "en",
      rssItems: [...nuclear, ...routine],
      gdeltEvents: [],
    });

    expect(payload.topics[0]?.id).toBe("theater:russia-ukraine");
    expect(scoreRssPublicFear(nuclear[0])).toBeGreaterThanOrEqual(3);
  });

  it("keeps summit themes competitive with kinetic fear", () => {
    const summit = [
      rss({
        id: "s1",
        title: "US and China bilateral summit opens in Geneva",
        link: "https://www.reuters.com/summit-1",
        theater: "china-taiwan",
        urgencyScore: 55,
      }),
    ];
    const routine = [
      rss({
        id: "r1",
        title: "Artillery duel continues along front line",
        link: "https://www.reuters.com/front-1",
        theater: "middle-east",
        urgencyScore: 80,
      }),
      rss({
        id: "r2",
        title: "Front line clashes reported overnight",
        link: "https://apnews.com/front-2",
        source: "AP",
        theater: "middle-east",
        urgencyScore: 75,
      }),
    ];
    const payload = buildMacroBriefing({
      domain: "geo",
      lang: "en",
      rssItems: [...summit, ...routine],
      gdeltEvents: [],
    });
    expect(payload.topics[0]?.id).toBe("theater:china-taiwan");
  });

  it("picks fear headline as catalyst inside a mixed theme", () => {
    const payload = buildMacroBriefing({
      domain: "geo",
      lang: "ko",
      rssItems: [
        rss({
          id: "soft",
          title: "Joint military exercise begins near border",
          titleKo: "국경 인근 연합훈련 개시",
          link: "https://www.reuters.com/drill",
          theater: "russia-ukraine",
          urgencyScore: 90,
          ageMinutes: 5,
        }),
        rss({
          id: "hard",
          title: "Missile attack on city kills civilians",
          titleKo: "도시에 미사일 공격, 민간인 사상",
          link: "https://apnews.com/missile",
          source: "AP",
          theater: "russia-ukraine",
          urgencyScore: 50,
          ageMinutes: 40,
        }),
      ],
      gdeltEvents: [],
    });
    const ua = payload.topics.find((t) => t.id === "theater:russia-ukraine");
    expect(ua).toBeTruthy();
    const catalyst = ua!.steps.find((s) => s.kind === "rss-catalyst");
    expect(catalyst?.headline).toMatch(/미사일|민간인|Missile|civilian/i);
  });
});
