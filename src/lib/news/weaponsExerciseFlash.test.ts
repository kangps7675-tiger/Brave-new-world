import { describe, expect, it } from "vitest";
import {
  buildBreakingFlashBriefingForLang,
  classifyConflictFlash,
  isWeaponsFlashText,
  shouldOpenBreakingFlash,
  weaponsFlashKind,
} from "@/lib/news/breakingFlash";
import { computeBreakingGrade } from "@/lib/news/breakingGrade";
import { ALL_NEWS_FEEDS } from "@/lib/news/feedCatalog";
import { resolveWorldPlace } from "@/lib/geo/worldPlaceMatch";
import type { HeroBreakingItem, NewsStreamItem } from "@/lib/news/types";

function hero(
  partial: Partial<HeroBreakingItem> & Pick<HeroBreakingItem, "title">,
): HeroBreakingItem {
  return {
    id: partial.id ?? "w1",
    title: partial.title,
    link: "https://example.com/w",
    source: "Reuters",
    pubDate: new Date().toISOString(),
    theater: partial.theater ?? "global",
    trustTier: 1,
    heroStatus: "breaking",
    urgencyScore: 70,
    breakingGrade: partial.breakingGrade ?? 7,
    breakingRank: partial.breakingRank ?? "A",
    ageMinutes: partial.ageMinutes ?? 10,
    summary: partial.summary,
    imageCaption: partial.imageCaption,
    feedTopic: "defense",
  };
}

function item(title: string): NewsStreamItem {
  return {
    id: "n1",
    title,
    link: "https://example.com/n",
    source: "Reuters",
    pubDate: new Date().toISOString(),
    theater: "global",
    trustTier: 1,
  };
}

describe("new weapons classification", () => {
  it("recognises tests, deployments, first combat use and development", () => {
    expect(weaponsFlashKind("North Korea test-fires new hypersonic missile")).toBe("test");
    expect(weaponsFlashKind("Navy commissions its first stealth destroyer")).toBe("deployment");
    expect(weaponsFlashKind("Drone used in combat for the first time on the front")).toBe("combat");
    expect(weaponsFlashKind("Army unveils prototype of next-generation counter-drone laser")).toBe(
      "development",
    );
    expect(weaponsFlashKind("북한 극초음속 미사일 시험 발사")).toBe("test");
  });

  it("classifies a bare test report as weapons, not as a kinetic strike", () => {
    expect(classifyConflictFlash("China successfully test fires new anti-ship ballistic missile").eventClass).toBe(
      "weapons",
    );
  });

  it("leaves strike-outcome reports to the kinetic class", () => {
    expect(isWeaponsFlashText("Ballistic missile launched and struck a residential block, 5 killed")).toBe(
      false,
    );
    expect(classifyConflictFlash("Ballistic missile struck Kharkiv, 5 killed").eventClass).toBe(
      "kinetic",
    );
  });

  it("still treats first combat use as a weapons event even with casualties", () => {
    expect(
      classifyConflictFlash("New glide bomb used in combat for the first time, killed 3").eventClass,
    ).toBe("weapons");
  });

  it("classifies military exercises as posture", () => {
    expect(classifyConflictFlash("NATO begins large live-fire exercise in the Baltic").eventClass).toBe(
      "posture",
    );
    expect(classifyConflictFlash("한미 연합 상륙훈련 시작").eventClass).toBe("posture");
  });
});

describe("grade", () => {
  it("rates a strategic missile test above an unrelated headline", () => {
    const test = item("North Korea test-fires ICBM, hypersonic warhead");
    const plain = item("City council approves new parking rules");
    const a = computeBreakingGrade(test, [test], 10);
    expect(a.axes.impact).toBeGreaterThanOrEqual(3);
    expect(a.grade).toBeGreaterThan(computeBreakingGrade(plain, [plain], 10).grade);
  });

  it("gives exercises a medium impact", () => {
    const drill = item("China begins live-fire military drills near Taiwan");
    expect(computeBreakingGrade(drill, [drill], 10).axes.impact).toBeGreaterThanOrEqual(2);
  });
});

describe("flash gating", () => {
  it("opens a fresh A-grade weapons-test flash", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({ title: "Iran test-fires new ballistic missile in Gulf drill" }),
        false,
      ),
    ).toBe(true);
  });

  it("opens a fresh exercise flash", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({ title: "Russia and Belarus start joint military exercise near Poland border" }),
        false,
      ),
    ).toBe(true);
  });
});

describe("place for the go-to-location button", () => {
  it("resolves a test range or sea area named in the article", () => {
    expect(resolveWorldPlace(["Missile launched from Sohae, lands in Sea of Japan"])).toMatchObject({
      label: "Sohae",
      precision: "landmark",
    });
    expect(resolveWorldPlace(["Naval drills in the South China Sea this week"])).toMatchObject({
      label: "South China Sea",
      precision: "landmark",
    });
  });

  it("prefers a named city that appears first over a later sea", () => {
    expect(resolveWorldPlace(["Drills near Jakarta and the South China Sea"])).toMatchObject({
      label: "Jakarta",
      precision: "city",
    });
  });

  it("fills coords and marks the landmark as approximate in the briefing", async () => {
    const b = await buildBreakingFlashBriefingForLang(
      hero({ title: "North Korea test-fires missile from Sohae launch site" }),
      "en",
      false,
    );
    expect(b.coords?.lat).toBeCloseTo(39.66, 1);
    expect(b.place?.precision).toBe("landmark");
    expect(b.paragraphs.join(" ")).toContain("not the exact");
    expect(b.paragraphs.join(" ")).toContain("new weapons");
    expect(b.title).toContain("New weapons flash");
  });
});

describe("feed catalog", () => {
  it("ships weapons and exercise feeds, with a European, Asian and Middle East exercise feed", () => {
    const names = ALL_NEWS_FEEDS.map((f) => f.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Google News · New Weapon Tests",
        "Google News · New Weapon Deployment",
        "Google News · Weapons First Used in Combat",
        "Google News · War-Driven Weapons Development",
        "Google News · Exercises · Europe",
        "Google News · Exercises · Asia-Pacific",
        "Google News · Exercises · Middle East",
      ]),
    );
  });
});
