import { describe, expect, it } from "vitest";
import { activateRussiaStrikeIncidents } from "@/lib/neonIncidentActivation";
import type { ScoredEvent } from "@/data/eventTiers";

const NOW = Date.parse("2026-07-29T12:00:00Z");

function ev(partial: Partial<ScoredEvent> & { lat: number; lng: number }): ScoredEvent {
  return {
    id: partial.id ?? `e-${partial.lat}-${partial.lng}`,
    globalEventId: partial.id ?? "e",
    eventDate: null,
    country: partial.country ?? null,
    lat: partial.lat,
    lng: partial.lng,
    category: partial.category ?? "Strategic developments",
    severity: 2,
    goldsteinScale: -2,
    sourceUrl: null,
    title: partial.title ?? "",
    createdAt: partial.createdAt ?? new Date(NOW - 60 * 60 * 1000).toISOString(),
    eventTier: partial.eventTier ?? "war",
    importanceGrade: partial.importanceGrade ?? "B",
  } as ScoredEvent;
}

describe("activateRussiaStrikeIncidents", () => {
  it("우크라 드론이 벨고로드 타격 → 점등 (live)", () => {
    const out = activateRussiaStrikeIncidents(
      [
        ev({
          id: "hit-belgorod",
          lat: 50.6,
          lng: 36.6,
          title: "Ukrainian drones strike Belgorod oil depot overnight",
        }),
      ],
      NOW,
    );
    const live = out.filter((o) => o.id.startsWith("live-ru-"));
    expect(live).toHaveLength(1);
    expect(live[0]?.lat).toBeCloseTo(50.6, 1);
  });

  it("러시아가 하르키우(우크라) 타격 → 배제 (live 없음)", () => {
    const out = activateRussiaStrikeIncidents(
      [
        ev({
          id: "ru-hits-kharkiv",
          lat: 49.99, // 벨고로드 앵커에서 <1° — 좌표만으론 오탐 위험
          lng: 36.23,
          title: "Russian missile strike hits Kharkiv, several wounded",
        }),
      ],
      NOW,
    );
    // 텍스트에 러시아 표적 지명이 없어 disambiguation에서 걸러짐 → 폴백(seed)만
    expect(out.every((o) => o.id.startsWith("seed-ru-"))).toBe(true);
  });

  it("타격 어휘 없는 사건은 배제", () => {
    const out = activateRussiaStrikeIncidents(
      [
        ev({
          id: "diplo",
          lat: 51.66,
          lng: 39.2,
          title: "Governor of Voronezh meets local officials",
        }),
      ],
      NOW,
    );
    expect(out.every((o) => o.id.startsWith("seed-ru-"))).toBe(true);
  });

  it("사건 없으면 시드 폴백 (빈 화면 방지)", () => {
    const out = activateRussiaStrikeIncidents([], NOW);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((o) => o.id.startsWith("seed-ru-"))).toBe(true);
  });

  it("오래된(비신선) 타격 사건은 배제", () => {
    const out = activateRussiaStrikeIncidents(
      [
        ev({
          id: "old-hit",
          lat: 50.6,
          lng: 36.6,
          title: "Drones struck Belgorod refinery",
          createdAt: new Date(NOW - 72 * 60 * 60 * 1000).toISOString(),
        }),
      ],
      NOW,
    );
    expect(out.every((o) => o.id.startsWith("seed-ru-"))).toBe(true);
  });

  it("표적 지명은 맞지만 앵커 밖이면 live-only", () => {
    const out = activateRussiaStrikeIncidents(
      [
        ev({
          id: "far-moscow",
          lat: 62,
          lng: 50,
          title: "Ukrainian drones strike Moscow region oil depot",
          sourceUrl: "https://example.com/gdelt-moscow",
        }),
      ],
      NOW,
    );
    const liveOnly = out.find((o) => o.id === "live-ru-far-moscow");
    expect(liveOnly?.provenance).toBe("live-only");
  });
});
