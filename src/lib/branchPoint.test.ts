import { describe, expect, it } from "vitest";
import { COUNTRY_INITIATIVES } from "@/data/countryInitiatives";
import {
  aftermathFor,
  allBranchPoints,
  branchPhase,
  branchesInPhase,
  daysUntil,
  linksForTitle,
  nextBranch,
} from "@/lib/branchPoint";
import { usElectionTuesday } from "@/lib/majorSchedule";

const NOW = Date.parse("2026-11-11T01:33:00+09:00");

describe("branch points", () => {
  it("2026-11-11에는 대만 선거가 예고이고 미국 중간선거는 사후다", () => {
    const preview = branchesInPhase("preview", NOW).map((row) => row.id);
    expect(preview[0]).toBe("tw-local-2026");
    expect(preview).not.toContain("us-midterm-2026");
    expect(preview).not.toContain("ua-president-2024");
    expect(branchesInPhase("day", NOW)).toHaveLength(0);
    expect(branchesInPhase("aftermath", NOW).map((row) => row.id)).toEqual(["us-midterm-2026", "ua-president-2024"]);
    expect(daysUntil(allBranchPoints().find((row) => row.id === "tw-local-2026")!, NOW)).toBe(17);
  });

  it("투표일 당일은 당일 칸이다", () => {
    const day = Date.parse("2026-11-28T12:00:00+09:00");
    expect(branchPhase(allBranchPoints().find((row) => row.id === "tw-local-2026")!, day)).toBe("day");
  });

  it("국가 카드의 다음 분기점은 예고만 고르고 사후는 따로 남긴다", () => {
    expect(nextBranch("tw", NOW)?.id).toBe("tw-local-2026");
    expect(nextBranch("us", NOW)?.id).toBe("us-general-2028");
    expect(aftermathFor("us", NOW).map((row) => row.id)).toEqual(["us-midterm-2026"]);
    expect(nextBranch("ua", NOW)).toBeNull();
  });

  it("사후 의석 칸은 인증 숫자가 없을 때 비워 두고 보도 문장만 출처와 함께 둔다", () => {
    const midterm = allBranchPoints().find((row) => row.id === "us-midterm-2026")!;
    expect(midterm.start).toBe(usElectionTuesday(2026));
    const control = midterm.checks.find((row) => row.id === "us-midterm-2026-control")!;
    const seats = midterm.checks.find((row) => row.id === "us-midterm-2026-seats")!;
    expect(control.status).toBe("cited");
    expect(control.claimKo).toContain("AP");
    expect(control.claimKo).not.toMatch(/254|250|165|54석/);
    expect(control.sourceUrl.startsWith("https://")).toBe(true);
    expect(seats.status).toBe("open");
    expect(seats.claimKo).toBeUndefined();
    expect(seats.sourceUrl).toBe("https://clerk.house.gov/");
    const ukraine = allBranchPoints().find((row) => row.id === "ua-president-2024")!;
    expect(ukraine.checks.map((row) => row.kind)).toEqual(["law", "constitution"]);
    expect(ukraine.checks.find((row) => row.kind === "constitution")?.status).toBe("open");
  });

  it("선거 기사와 길목 기사를 카드와 분기점에 연결한다", () => {
    const taiwan = linksForTitle("Taiwan local elections are set for November", NOW);
    expect(taiwan.map((row) => row.branchId)).toEqual(["tw-local-2026"]);
    expect(taiwan[0]?.phase).toBe("preview");
    const midterm = linksForTitle("Democrats win the US midterm", NOW);
    expect(midterm[0]?.branchId).toBe("us-midterm-2026");
    expect(midterm[0]?.goalId).toBe("us-chokepoint");
    expect(midterm[0]?.phase).toBe("aftermath");
    const hormuz = linksForTitle("A tanker was hit in the Strait of Hormuz", NOW);
    expect(hormuz[0]?.countryId).toBe("us");
    expect(hormuz[0]?.goalId).toBe("us-chokepoint");
    expect(linksForTitle("Seoul weather turns cold", NOW)).toEqual([]);
  });

  it("목표 문장을 옮긴 카드는 공식 주소가 있다", () => {
    for (const card of COUNTRY_INITIATIVES) {
      for (const goal of card.goals) {
        expect(goal.url.startsWith("http")).toBe(true);
        expect(goal.saidKo.length).toBeGreaterThan(0);
      }
      if (card.goals.length === 0) expect(card.docUrl?.startsWith("http")).toBe(true);
    }
  });
});
