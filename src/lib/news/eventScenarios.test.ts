import { describe, expect, it } from "vitest";
import { buildEventScenarioBoard } from "@/lib/news/eventScenarios";
import type { NewsStreamItem } from "@/lib/news/types";

const NOW = Date.parse("2026-11-10T12:00:00Z");

function item(partial: Partial<NewsStreamItem> & Pick<NewsStreamItem, "title" | "link" | "source">): NewsStreamItem {
  return {
    id: partial.link,
    pubDate: "2026-11-10T08:00:00Z",
    theater: "middle-east",
    trustTier: 1,
    ...partial,
  };
}

describe("buildEventScenarioBoard", () => {
  it("한 사건의 출처 문장만 갈래로 두고 제목을 고치지 않는다", () => {
    const board = buildEventScenarioBoard(
      [
        item({
          title: "Missile hits a tanker in the Strait of Hormuz",
          link: "https://www.reuters.com/hormuz-hit",
          source: "Reuters",
        }),
        item({
          title: "Iran says it will retaliate for the Hormuz strike",
          link: "https://www.irna.ir/hormuz",
          source: "IRNA",
          trustTier: 3,
        }),
        item({
          title: "United States proposes talks after the Hormuz attack",
          link: "https://www.reuters.com/hormuz-talks",
          source: "Reuters",
        }),
        item({
          title: "Israel announces a blockade over the Hormuz strike",
          link: "https://apnews.com/hormuz-block",
          source: "Associated Press",
        }),
        item({
          title: "Oman says a Hormuz ceasefire pause is agreed",
          link: "https://www.bbc.com/hormuz-pause",
          source: "BBC",
        }),
        item({
          title: "Analysts warn the Hormuz strike could escalate",
          link: "https://www.reuters.com/hormuz-could",
          source: "Reuters",
        }),
        item({
          title: "Ukraine says it will retaliate for the Kharkiv strike",
          link: "https://www.reuters.com/kharkiv",
          source: "Reuters",
          theater: "russia-ukraine",
        }),
      ],
      NOW,
    );

    expect(board).not.toBeNull();
    expect(board!.eventTitle).toBe("Missile hits a tanker in the Strait of Hormuz");
    expect(board!.scenarios.map((row) => row.title)).toEqual([
      "Iran says it will retaliate for the Hormuz strike",
      "United States proposes talks after the Hormuz attack",
      "Israel announces a blockade over the Hormuz strike",
      "Oman says a Hormuz ceasefire pause is agreed",
    ]);
    expect(board!.scenarios.find((row) => row.actorKo === "이란")?.stance).toBe("initiative");
    expect(board!.scenarios.some((row) => /could escalate/.test(row.title))).toBe(false);
    expect(board!.scenarios.some((row) => /Kharkiv/.test(row.title))).toBe(false);
  });

  it("갈래가 둘이면 둘만 보여 주고 빈칸을 만들지 않는다", () => {
    const board = buildEventScenarioBoard(
      [
        item({
          title: "Drone attack reported in Gaza",
          link: "https://www.reuters.com/gaza",
          source: "Reuters",
        }),
        item({
          title: "Israel says it rejects Gaza talks",
          link: "https://www.reuters.com/gaza-talks",
          source: "Reuters",
        }),
        item({
          title: "Hamas announces a Gaza ceasefire pause",
          link: "https://www.bbc.com/gaza-pause",
          source: "BBC",
        }),
      ],
      NOW,
    );
    expect(board!.scenarios).toHaveLength(2);
  });

  it("같은 나라의 같은 갈래는 한 번만 둔다", () => {
    const board = buildEventScenarioBoard(
      [
        item({
          title: "Strike reported near Rafah",
          link: "https://www.reuters.com/rafah",
          source: "Reuters",
        }),
        item({
          title: "Israel vows retaliation for the Rafah strike",
          link: "https://apnews.com/rafah-1",
          source: "Associated Press",
          pubDate: "2026-11-10T09:00:00Z",
        }),
        item({
          title: "Israel says it will retaliate after Rafah",
          link: "https://www.bbc.com/rafah-2",
          source: "BBC",
          pubDate: "2026-11-10T07:00:00Z",
        }),
      ],
      NOW,
    );
    expect(board!.scenarios).toHaveLength(1);
    expect(board!.scenarios[0]?.title).toBe("Israel vows retaliation for the Rafah strike");
  });
});
