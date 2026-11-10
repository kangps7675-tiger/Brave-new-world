import { describe, expect, it } from "vitest";
import { MAJOR_SCHEDULES } from "@/data/majorSchedules";
import { NATIONAL_CONSTITUTIONS } from "@/data/nationalConstitutions";
import { nextSchedule, orderedSchedules, schedulePhase, usElectionTuesday } from "@/lib/majorSchedule";

const NOW = Date.parse("2026-11-11T01:33:00+09:00");

describe("major schedules", () => {
  it("미국 선거일은 11월 첫 월요일 다음 화요일이다", () => {
    expect(usElectionTuesday(2026)).toBe("2026-11-03");
    expect(usElectionTuesday(2028)).toBe("2028-11-07");
    expect(MAJOR_SCHEDULES.find((row) => row.id === "us-general-2028")?.start).toBe("2028-11-07");
  });

  it("일정마다 공식 주소와 확인일이 있다", () => {
    for (const row of MAJOR_SCHEDULES) {
      expect(row.sourceUrl.startsWith("https://")).toBe(true);
      expect(row.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row.whenKo.length).toBeGreaterThan(0);
      if (row.precision === "half") expect(row.end).toBeTruthy();
      if (row.outcomeKo || row.outcomeEn) expect(row.outcomeUrl?.startsWith("https://")).toBe(true);
    }
  });

  it("2026-11-11 목록은 예정만 두고 가장 가까운 일정은 대만 지방선거다", () => {
    expect(orderedSchedules(NOW).map((row) => row.id)).toEqual([
      "tw-local-2026",
      "cn-ccp-21",
      "au-federal",
      "ir-national-2028",
      "kr-assembly-2028",
      "tr-general-2028",
      "jp-councillors-2028",
      "us-general-2028",
      "in-loksabha",
      "jp-representatives",
      "ru-president",
      "ua-president-2024",
    ]);
    expect(nextSchedule(NOW)?.id).toBe("tw-local-2026");
    expect(schedulePhase(MAJOR_SCHEDULES.find((row) => row.id === "ua-president-2024")!, NOW)).toBe(
      "awaiting-result",
    );
    const past = {
      ...MAJOR_SCHEDULES[0],
      id: "past-election",
      start: "2026-06-03",
      end: undefined,
      precision: "day" as const,
    };
    expect(schedulePhase(past, NOW)).toBe("awaiting-result");
    expect(orderedSchedules(NOW, [past, ...MAJOR_SCHEDULES]).some((row) => row.id === "past-election")).toBe(false);
  });

  it("일정에 있는 나라마다 헌법 공식 주소가 있다", () => {
    const scheduleCountries = [...new Set(MAJOR_SCHEDULES.map((row) => row.countryKo))];
    const constitutionCountries = NATIONAL_CONSTITUTIONS.map((row) => row.countryKo);
    for (const country of scheduleCountries) expect(constitutionCountries).toContain(country);
    for (const country of ["북한", "사우디", "영국", "독일", "프랑스", "이란", "이스라엘", "파키스탄", "이탈리아", "캐나다"]) {
      expect(constitutionCountries).toContain(country);
    }
    for (const row of NATIONAL_CONSTITUTIONS) {
      expect(row.links.length).toBeGreaterThan(0);
      for (const link of row.links) {
        expect(link.url.startsWith("https://")).toBe(true);
      }
    }
    expect(NATIONAL_CONSTITUTIONS.find((row) => row.id === "tw")?.links).toHaveLength(2);
  });
});
