import { describe, expect, it } from "vitest";
import { resolveStrikePlace } from "./strikePlaceMatch";
import { resolveStrikeCoords } from "./strikeFlames";
import type { NewsStreamItem } from "@/lib/news/types";

function news(title: string, summary = ""): NewsStreamItem {
  return { id: title, title, summary, theater: "russia-ukraine", pubDate: new Date().toISOString(), link: "" } as unknown as NewsStreamItem;
}

describe("공습 불꽃 지명 — 깊숙한 지역", () => {
  it.each([
    ["Ukrainian drones struck the oil refinery in Ryazan overnight", "Ryazan", "russia"],
    ["Drone attack sets fire to Novorossiysk oil terminal", "Novorossiysk", "black-sea"],
    ["Ukraine hits Caspian Flotilla ship in Kaspiysk", "Kaspiysk", "caspian"],
    ["Israeli strike hits nuclear site near Isfahan", "Isfahan", "iran"],
    ["Houthi missile hit Abqaiq processing plant", "Abqaiq", "gulf"],
    ["Drone strike on Ain al-Asad air base", "Ain al-Asad", "levant-iraq"],
    ["우크라이나 드론이 사라토프 정유공장을 타격", "Saratov", "russia"],
  ])("%s → %s", (text, label, area) => {
    expect(resolveStrikePlace(text)).toMatchObject({ label, area });
  });

  it("발사지만 나오면 좌표를 주지 않는다", () => {
    expect(resolveStrikePlace("Missiles launched from Kursk region")).toBeNull();
  });

  it("발사지와 타격지가 같이 나오면 타격지", () => {
    expect(resolveStrikePlace("Drones launched from Bryansk struck a depot in Oryol")?.label).toBe("Oryol");
  });

  it("긴 이름이 짧은 이름보다 먼저 — 케르치 해협", () => {
    expect(resolveStrikePlace("Missile attack on the Kerch Strait ferry")?.label).toBe("Kerch Strait");
  });

  it("엥겔스는 비행장 표기일 때만, 일반 단어와 겹치는 한글은 무시", () => {
    expect(resolveStrikePlace("Friedrich Engels biography")).toBeNull();
    expect(resolveStrikePlace("Drones hit Engels air base")?.label).toBe("Engels air base");
    expect(resolveStrikePlace("우파 정당이 하마스를 비판")).toBeNull();
  });

  it("기본 사전이 나라 이름(Iran)만 잡으면 더 좁은 지점(Natanz)을 쓴다", () => {
    expect(resolveStrikeCoords(news("Iran: explosions reported at Natanz after drone attack"))?.label).toBe("Natanz");
  });
});
