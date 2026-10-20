import { describe, expect, it } from "vitest";
import {
  buildBreakingFlashBriefingForLang,
  classifyConflictFlash,
  shouldOpenBreakingFlash,
} from "@/lib/news/breakingFlash";
import { computeBreakingGrade } from "@/lib/news/breakingGrade";
import { isConflictTensionNews } from "@/lib/news/regionalConflictNews";
import type { HeroBreakingItem, NewsStreamItem } from "@/lib/news/types";

function hero(
  partial: Partial<HeroBreakingItem> & Pick<HeroBreakingItem, "title">,
): HeroBreakingItem {
  return {
    id: partial.id ?? "u1",
    title: partial.title,
    link: "https://example.com/a",
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

describe("political flash classification", () => {
  it("classifies mass protests and government collapse as civil unrest", () => {
    expect(classifyConflictFlash("Tens of thousands protest in Tbilisi as curfew declared").eventClass).toBe(
      "civil_unrest",
    );
    expect(classifyConflictFlash("대규모 시위 확산, 정국 혼란").eventClass).toBe("civil_unrest");
  });

  it("classifies fraud and disputed results as election integrity", () => {
    expect(classifyConflictFlash("Opposition rejects results, alleges ballot stuffing").eventClass).toBe(
      "election_integrity",
    );
    expect(classifyConflictFlash("부정선거 의혹 속 개표 중단").eventClass).toBe("election_integrity");
  });

  it("classifies leadership rise signals as political emergence", () => {
    expect(classifyConflictFlash("Former mayor announces presidential bid, leads polls").eventClass).toBe(
      "political_emergence",
    );
    expect(classifyConflictFlash("여론조사 1위 차기 대선 주자로 부상").eventClass).toBe(
      "political_emergence",
    );
  });

  it("keeps military classes ahead of political ones", () => {
    expect(classifyConflictFlash("Missile strike hits capital as protests grow").eventClass).toBe(
      "kinetic",
    );
  });

  it("lets a fresh A-grade unrest flash open, but not unrelated news", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({ title: "Mass protests erupt across Kenya, tear gas fired in Nairobi" }),
        false,
      ),
    ).toBe(true);
    expect(
      shouldOpenBreakingFlash(hero({ title: "Local bakery wins regional award" }), false),
    ).toBe(false);
  });
});

describe("grade for unrest and elections", () => {
  it("scores a fresh nationwide-protest report as an A-grade candidate", () => {
    const it1 = item("Nationwide protests and curfew after disputed election");
    const r = computeBreakingGrade(it1, [it1], 10);
    expect(r.rank === "A" || r.rank === "S").toBe(true);
  });

  it("does not inflate a plain sports headline", () => {
    const it1 = item("Local team wins championship");
    expect(computeBreakingGrade(it1, [it1], 10).rank).toBe("B");
  });
});

describe("regional conflict filter", () => {
  it("rescues escalated unrest from the social-news soft exclusion", () => {
    expect(isConflictTensionNews("Protests turn violent as army deployed, curfew imposed")).toBe(true);
    expect(isConflictTensionNews("Election fraud alleged, results annulled in Malawi")).toBe(true);
  });

  it("still drops an ordinary election story", () => {
    expect(isConflictTensionNews("Voters head to the polls in regional election")).toBe(false);
  });
});

describe("world place for the go-to-location button", () => {
  it("fills coords from the photo caption and says where it came from", async () => {
    const b = await buildBreakingFlashBriefingForLang(
      hero({
        title: "Protesters clash with police over fuel prices",
        imageCaption: "Demonstrators march through the streets of Nairobi on Tuesday",
      }),
      "en",
      false,
    );
    expect(b.coords).toBeDefined();
    expect(b.coords!.lat).toBeCloseTo(-1.28, 1);
    expect(b.place).toMatchObject({ label: "Nairobi", precision: "city", from: "caption" });
    expect(b.paragraphs.join(" ")).toContain("photo caption");
  });

  it("marks a country-only mention as an estimate", async () => {
    const b = await buildBreakingFlashBriefingForLang(
      hero({ title: "Nationwide protests erupt in Kenya over tax bill" }),
      "en",
      false,
    );
    expect(b.place?.precision).toBe("country-rep");
    expect(b.paragraphs.join(" ")).toContain("estimate");
  });

  it("leaves coords empty when no place is named", async () => {
    const b = await buildBreakingFlashBriefingForLang(
      hero({ title: "Officials say talks will continue" }),
      "en",
      false,
    );
    expect(b.coords).toBeUndefined();
    expect(b.place).toBeUndefined();
  });
});

describe("eastern flank hybrid reports are graded up", () => {
  it("lifts a Baltic airspace report above an unrelated global headline", () => {
    const baltic = item("Russian drone violates Lithuanian airspace");
    const plain = item("Officials announce new committee");
    const a = computeBreakingGrade(baltic, [baltic], 10);
    const b = computeBreakingGrade(plain, [plain], 10);
    expect(a.axes.impact).toBeGreaterThanOrEqual(3);
    expect(a.grade).toBeGreaterThan(b.grade);
  });

  it("does not boost a flank-country story with no hybrid signal", () => {
    const calm = item("Poland hosts tourism fair in Warsaw");
    expect(computeBreakingGrade(calm, [calm], 10).axes.impact).toBeLessThan(3);
  });
});
