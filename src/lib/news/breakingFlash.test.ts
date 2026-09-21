import { describe, expect, it } from "vitest";
import {
  detectSupplyChainLinks,
  extractFlashActors,
  formatActorsLine,
  formatSupplyChainBridge,
  formatWhyImportant,
  isIranRelatedBreakingText,
} from "@/lib/news/breakingFlashNarrative";
import {
  buildBreakingFlashBriefing,
  claimBreakingFlash,
  classifyConflictFlash,
  classifyEconomyFlash,
  pickNextBreakingFlashHero,
  resolveConflictFlashBed,
  resolveEconomyFlashBed,
  shouldOpenBreakingFlash,
  formatFlashSourceAttribution,
} from "@/lib/news/breakingFlash";
import type { HeroBreakingItem } from "@/lib/news/types";

function hero(partial: Partial<HeroBreakingItem> & Pick<HeroBreakingItem, "title">): HeroBreakingItem {
  return {
    id: partial.id ?? "h1",
    title: partial.title,
    link: "https://example.com",
    source: partial.source ?? "Reuters",
    publisher: partial.publisher,
    pubDate: new Date().toISOString(),
    theater: partial.theater ?? "russia-ukraine",
    trustTier: partial.trustTier ?? 1,
    heroStatus: "breaking",
    urgencyScore: (partial.breakingGrade ?? 9) * 10,
    breakingGrade: partial.breakingGrade ?? 9,
    breakingRank: partial.breakingRank ?? "S",
    ageMinutes: partial.ageMinutes ?? 20,
    summary: partial.summary,
    feedTopic: partial.feedTopic,
    flashSource: partial.flashSource,
    verbatim: partial.verbatim,
    imageUrl: partial.imageUrl,
    videoUrl: partial.videoUrl,
    lat: partial.lat,
    lng: partial.lng,
  };
}

describe("breakingFlashNarrative", () => {
  it("extracts active → passive from strike wording", () => {
    const a = extractFlashActors(
      "Russia strikes Ukraine energy grid with missiles",
      "en",
    );
    expect(a.active).toBe("Russia");
    expect(a.passive).toBe("Ukraine");
  });

  it("formats Korean actor line", () => {
    const a = extractFlashActors("러시아가 우크라이나를 공습", "ko");
    expect(a.active).toBe("러시아");
    expect(a.passive).toBe("우크라이나");
    const line = formatActorsLine(a, "ko");
    expect(line).toBeTruthy();
    expect(line!).toMatch(/능동/);
    expect(line!).toMatch(/피동/);
  });

  it("why-important mentions theater stakes", () => {
    expect(formatWhyImportant("middle-east", "airstrike hormuz", "ko")).toMatch(
      /해협|항로|에너지|석유|가스/,
    );
  });

  it("why-important uses Iran axis copy for Iran kinetic", () => {
    expect(
      formatWhyImportant("middle-east", "Iran missile strike near Natanz", "ko"),
    ).toMatch(/이란/);
  });

  it("detects Iran-related flash text", () => {
    expect(isIranRelatedBreakingText("IRGC launches missiles from Tehran")).toBe(true);
    expect(isIranRelatedBreakingText("Kyiv under artillery fire")).toBe(false);
  });

  it("detects event-level supply-chain axes", () => {
    expect(detectSupplyChainLinks("PLA drills near Taiwan Strait; TSMC fabs watch")).toEqual([
      "chokepoint",
      "chips",
    ]);
    expect(detectSupplyChainLinks("Celebrity visits summit")).toEqual([]);
  });

  it("formats supply-chain bridge only when signals exist", () => {
    expect(formatSupplyChainBridge("routine diplomacy talks", "ko")).toBeNull();
    const line = formatSupplyChainBridge(
      "Houthi strike raises Red Sea freight and war-risk insurance",
      "ko",
    );
    expect(line).toMatch(/^공급망과의 연결입니다/);
    expect(line).toMatch(/통항|운임|보험/);
  });
});

describe("buildBreakingFlashBriefing prose essay", () => {
  it("does not pad headline-only reports", () => {
    const briefing = buildBreakingFlashBriefing(
      hero({ title: "미국, 이란 관련 경고 | NEWSNATION", source: "The Hill" }), "ko", false,
    );
    expect(briefing.paragraphs).toHaveLength(1);
    expect(briefing.paragraphs[0]).toContain("The Hill 보도에 따르면");
    expect(briefing.paragraphs[0]).not.toMatch(/NEWSNATION|교차확인|핵·미사일|시장|The Hill」가/);
  });

  it("preserves long summaries without repeating the headline", () => {
    const title = "미국이 이란 관련 경고를 발표했습니다";
    const facts = Array.from({ length: 12 }, (_, i) => `당국은 ${i + 1}번째 브리핑에서 관련 발언의 구체적인 내용과 발표 시점을 설명했습니다.`).join(" ");
    const briefing = buildBreakingFlashBriefing(
      hero({ title, summary: `${title}. ${facts}`, source: "연합뉴스", theater: "middle-east" }), "ko", false,
    );
    const text = briefing.paragraphs.join(" ");
    expect(text.split(title)).toHaveLength(2);
    expect(text).toContain("12번째 브리핑");
    expect(text).not.toMatch(/긴장이 높아진|보험·운임·외교|교차확인/);
    expect(briefing.paragraphs.at(-1)).toBe("이번 보도는 이란과 역내 관련 세력을 둘러싼 중동 안보 상황과 맞닿아 있습니다.");
  });

  it("writes 3 unlabeled inverse-pyramid paragraphs of pure news", () => {
    const briefing = buildBreakingFlashBriefing(
      hero({
        title: "Missile strike near Hormuz disrupts tanker traffic",
        summary: "War-risk premiums jump on crude tankers",
        theater: "middle-east",
        feedTopic: "defense",
      }),
      "ko",
      false,
    );
    expect(briefing.mode).toBe("conflict");
    const body = briefing.paragraphs;
    expect(body).toHaveLength(3);
    expect(body.some((p) => p.includes("【"))).toBe(false);
    expect(body.some((p) => /Tier|투자|대피|육하원칙|작성|면책|관측 메모/.test(p))).toBe(
      false,
    );
    expect(body.join(" ")).toContain("Hormuz");
    const sentenceApprox = body
      .join(" ")
      .split(/(?<=다\.|습니다\.)/)
      .map((s) => s.trim())
      .filter(Boolean).length;
    expect(body.join(" ")).toContain("War-risk premiums jump on crude tankers");
    expect(sentenceApprox).toBeLessThanOrEqual(4);
  });

  it("still yields 3 prose paragraphs when no logistics signal", () => {
    const briefing = buildBreakingFlashBriefing(
      hero({
        title: "Artillery duel reported on eastern front",
        summary: "Front-line positions exchanged fire overnight",
        theater: "russia-ukraine",
      }),
      "ko",
      false,
    );
    const body = briefing.paragraphs;
    expect(body).toHaveLength(3);
    expect(body.some((p) => p.includes("【"))).toBe(false);
    expect(body.some((p) => /Tier|투자|대피|육하원칙|드러나지 않습니다/.test(p))).toBe(
      false,
    );
  });
});

describe("formatFlashSourceAttribution", () => {
  it("puts outlet and age on the attribution line", () => {
    const line = formatFlashSourceAttribution(
      hero({ title: "x", source: "Reuters", ageMinutes: 12 }),
      "ko",
    );
    expect(line).toMatch(/^출처:/);
    expect(line).toContain("Reuters");
    expect(line).toMatch(/12분/);
  });
});

describe("shouldOpenBreakingFlash", () => {
  it("allows S kinetic within rapid window", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({ title: "Missile barrage hits Kyiv", breakingRank: "S", breakingGrade: 9, ageMinutes: 20 }),
        false,
      ),
    ).toBe(true);
  });

  it("allows Iran kinetic S flash", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({
          id: "iran-1",
          title: "Iran launches ballistic missiles toward Israel",
          theater: "middle-east",
          breakingRank: "S",
          breakingGrade: 9,
          ageMinutes: 15,
        }),
        false,
      ),
    ).toBe(true);
  });

  it("rejects soft / stale / low grade", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({ title: "Celebrity visits summit", breakingRank: "S", breakingGrade: 9 }),
        false,
      ),
    ).toBe(false);
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Diplomats meet for talks",
          breakingRank: "A",
          breakingGrade: 7,
        }),
        false,
      ),
    ).toBe(false);
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Missile strike reported",
          breakingRank: "S",
          breakingGrade: 9,
          ageMinutes: 90,
        }),
        false,
      ),
    ).toBe(false);
  });

  it("rejects human-interest micro stories even at S grade", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "전선에서 꼬마를 구출한 병사",
          summary: "감동적인 구조 장면이 공개됐다",
          breakingRank: "S",
          breakingGrade: 9,
          ageMinutes: 10,
        }),
        false,
      ),
    ).toBe(false);
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Soldiers rescue child from rubble on the front line",
          breakingRank: "S",
          breakingGrade: 9,
          ageMinutes: 8,
        }),
        false,
      ),
    ).toBe(false);
  });

  it("rejects high-grade S without kinetic or chokepoint", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Diplomats schedule follow-up talks in Geneva",
          breakingRank: "S",
          breakingGrade: 9,
          ageMinutes: 5,
        }),
        false,
      ),
    ).toBe(false);
  });

  it("allows chokepoint security S flash", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Strait of Hormuz shipping disrupted after naval clash",
          theater: "middle-east",
          breakingRank: "S",
          breakingGrade: 9,
          ageMinutes: 12,
        }),
        false,
      ),
    ).toBe(true);
  });

  it("allows oil-depot / grain kinetic as price-threat S flash", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Drones strike Russian oil depot near Black Sea",
          summary: "Secondary explosions at fuel storage",
          breakingRank: "S",
          breakingGrade: 9,
          ageMinutes: 8,
        }),
        false,
      ),
    ).toBe(true);
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Missile hits Odessa grain export port",
          summary: "Wheat loading terminal damaged",
          breakingRank: "S",
          breakingGrade: 9,
          ageMinutes: 6,
          feedTopic: "economy",
        }),
        true,
      ),
    ).toBe(true);
  });

  it("rejects routine shelling without infrastructure threat", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Routine shelling continues along the front",
          summary: "Daily artillery duel reported",
          breakingRank: "S",
          breakingGrade: 9,
          ageMinutes: 5,
        }),
        false,
      ),
    ).toBe(false);
  });
});

describe("LIVEUA verbatim briefing", () => {
  it("keeps original body without causal essay rewrite", () => {
    const body =
      "Ukrainian drones struck a Russian oil depot near the Black Sea coast.";
    const briefing = buildBreakingFlashBriefing(
      hero({
        id: "liveua:1",
        title: "Strike near oil depot",
        summary: body,
        flashSource: "liveuamap",
        verbatim: true,
        imageUrl: "https://example.com/a.jpg",
        lat: 45,
        lng: 35,
        breakingRank: "S",
        breakingGrade: 9,
      }),
      "ko",
      false,
    );
    expect(briefing.verbatim).toBe(true);
    expect(briefing.paragraphs).toEqual([body]);
    expect(briefing.imageUrl).toBe("https://example.com/a.jpg");
    expect(briefing.coords).toEqual({ lat: 45, lng: 35 });
  });
});

describe("pickNextBreakingFlashHero", () => {
  it("picks any theater flashHero when global hero is soft", () => {
    const me = hero({
      id: "me-flash",
      title: "Missile barrage hits Tel Aviv area",
      theater: "middle-east",
      breakingRank: "S",
      breakingGrade: 9,
      ageMinutes: 10,
    });
    const soft = hero({
      id: "soft-hero",
      title: "Diplomats schedule follow-up talks",
      theater: "russia-ukraine",
      breakingRank: "B",
      breakingGrade: 4,
    });
    const picked = pickNextBreakingFlashHero(
      { hero: soft, flashHeroes: [me] },
      false,
    );
    expect(picked?.id).toBe("me-flash");
  });

  it("falls back to next theater after one flash is claimed", () => {
    const ukraine = hero({
      id: `ua-flash-${Date.now()}`,
      title: "Missile barrage hits Kyiv",
      theater: "russia-ukraine",
      breakingRank: "S",
      breakingGrade: 9,
      ageMinutes: 8,
    });
    const taiwan = hero({
      id: `tw-flash-${Date.now()}`,
      title: "PLA missile drills escalate near Taiwan Strait",
      theater: "china-taiwan",
      breakingRank: "S",
      breakingGrade: 8,
      ageMinutes: 12,
    });
    expect(claimBreakingFlash(ukraine.id)).toBe(true);
    const picked = pickNextBreakingFlashHero(
      { hero: ukraine, flashHeroes: [taiwan] },
      false,
    );
    expect(picked?.id).toBe(taiwan.id);
  });
});

describe("economy geoeconomic flash gate", () => {
  it("opens for Fed / chokepoint / commodity S flash", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Fed signals aggressive rate cut path",
          feedTopic: "economy",
          breakingRank: "S",
          breakingGrade: 9,
        }),
        true,
      ),
    ).toBe(true);
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Hormuz tanker traffic disrupted after strike",
          feedTopic: "economy",
          breakingRank: "S",
          breakingGrade: 9,
        }),
        true,
      ),
    ).toBe(true);
  });

  it("rejects S grade without geoeconomic topic", () => {
    expect(
      shouldOpenBreakingFlash(
        hero({
          title: "Local retailer opens new downtown store",
          summary: "Shopping mall foot traffic rises",
          feedTopic: "economy",
          breakingRank: "S",
          breakingGrade: 9,
        }),
        true,
      ),
    ).toBe(false);
  });

  it("uses geoeconomic kicker and why", () => {
    const briefing = buildBreakingFlashBriefing(
      hero({
        title: "Brent crude spikes after Red Sea freight shock",
        summary: "War-risk premiums jump on tankers",
        feedTopic: "economy",
        theater: "middle-east",
      }),
      "ko",
      true,
    );
    expect(briefing.mode).toBe("economy");
    expect(briefing.title).toMatch(/^지경학 신속 속보/);
    expect(briefing.paragraphs.length).toBeGreaterThanOrEqual(3);
    expect(briefing.paragraphs.length).toBeLessThanOrEqual(4);
    expect(briefing.paragraphs.some((p) => p.includes("【"))).toBe(false);
    expect(
      briefing.paragraphs.some((p) => /금리|원자재|운임|초크|경제|시장|원유|공급/.test(p)),
    ).toBe(true);
  });

  it("maps demand-weighted lens: transit / rates / oil / gold / mixed", () => {
    expect(
      resolveEconomyFlashBed("Hormuz tanker traffic disrupted; war-risk premiums jump"),
    ).toBe("dark");
    expect(classifyEconomyFlash("Hormuz disrupted freight surge").eventClass).toBe(
      "transit",
    );

    expect(resolveEconomyFlashBed("Fed signals aggressive rate cut; markets rally")).toBe(
      "cheer",
    );
    expect(
      buildBreakingFlashBriefing(
        hero({
          title: "Markets soar after rate cut surprise",
          feedTopic: "economy",
        }),
        "en",
        true,
      ).dispatchBed,
    ).toBe("cheer");

    // 유가↑ alone = 수요국 가중 악재 (산유 호재로 cheer 하지 않음)
    expect(resolveEconomyFlashBed("Brent crude spikes to multi-month high")).toBe("dark");
    expect(classifyEconomyFlash("Brent crude spikes to multi-month high").eventClass).toBe(
      "price_only",
    );

    // 항로 재개 = cheer
    expect(resolveEconomyFlashBed("Red Sea shipping corridor reopens after ceasefire")).toBe(
      "cheer",
    );

    // 유가↓ + 통행 충격 없음 = 비용 완화 cheer
    expect(resolveEconomyFlashBed("Oil plunges on demand slowdown")).toBe("cheer");

    // 금 급등 = risk-off dark
    expect(resolveEconomyFlashBed("Gold surges to record high as safe haven bid")).toBe(
      "dark",
    );

    // 제재 + 랠리 혼재 → 애매: 모스만
    expect(
      resolveEconomyFlashBed("New sanctions hit energy exports even as equities rally"),
    ).toBe("morse");
  });
});

describe("conflict security lens", () => {
  it("kinetic / invasion stay dark even if framed as success", () => {
    expect(resolveConflictFlashBed("Missile barrage hits Kyiv")).toBe("dark");
    expect(
      resolveConflictFlashBed("Successful airstrike destroys enemy depot"),
    ).toBe("dark");
    expect(classifyConflictFlash("Missile barrage hits Kyiv").eventClass).toBe("kinetic");
  });

  it("ceasefire and corridor reopen cheer; mixed is morse-only", () => {
    expect(resolveConflictFlashBed("Ceasefire deal struck after marathon talks")).toBe(
      "cheer",
    );
    expect(
      resolveConflictFlashBed("Humanitarian corridor reopens after blockade lifted"),
    ).toBe("cheer");
    expect(
      resolveConflictFlashBed("Ceasefire announced but airstrikes continue overnight"),
    ).toBe("morse");
  });

  it("neutral posture without clear polarity is morse-only", () => {
    expect(resolveConflictFlashBed("Annual joint military exercise scheduled")).toBe(
      "morse",
    );
  });

  it("wires conflict dispatchBed on briefing", () => {
    expect(
      buildBreakingFlashBriefing(
        hero({
          title: "Truce agreed; forces begin withdrawal",
          theater: "middle-east",
        }),
        "en",
        false,
      ).dispatchBed,
    ).toBe("cheer");
    expect(
      buildBreakingFlashBriefing(
        hero({
          title: "Artillery duel intensifies on eastern front",
          theater: "russia-ukraine",
        }),
        "en",
        false,
      ).dispatchBed,
    ).toBe("dark");
  });
});
