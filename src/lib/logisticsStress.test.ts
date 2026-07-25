import { describe, expect, it } from "vitest";
import {
  computeChokepointStress,
  demoStressSignals,
  shouldSoundLogisticsSiren,
} from "@/lib/logisticsStress";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";

function inc(
  type: string,
  lat: number,
  lng: number,
  daysAgo = 1,
): UkmtoIncidentPoint {
  return {
    id: `${type}-${lat}-${lng}`,
    incidentNumber: 1,
    incidentTypeName: type,
    pinColour: "Red",
    lat,
    lng,
    region: null,
    place: null,
    vesselName: null,
    vesselType: null,
    detail: null,
    utcDateOfIncident: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  };
}

// 홍해/바브엘만데브 근처 좌표
const CHOKE = { id: "choke-bab-el-mandeb", lat: 12.6, lng: 43.35 };

describe("logisticsStress — 정확도 보증", () => {
  it("A급(UKMTO) 신호가 없으면 등급을 확정하지 않는다 (unknown)", () => {
    const s = computeChokepointStress({
      chokepointId: CHOKE.id,
      chokeLat: CHOKE.lat,
      chokeLng: CHOKE.lng,
      ukmtoIncidents: [],
    });
    expect(s.level).toBe("unknown");
    expect(s.graded).toBe(false);
    expect(shouldSoundLogisticsSiren(s)).toBe(false);
  });

  it("목업 B·C 신호만으로는 등급을 올리지 않는다", () => {
    const demo = demoStressSignals(CHOKE.id);
    const s = computeChokepointStress({
      chokepointId: CHOKE.id,
      chokeLat: CHOKE.lat,
      chokeLng: CHOKE.lng,
      ukmtoIncidents: [],
      aisObservation: demo.aisObservation,
      oilVolatility: demo.oilVolatility,
    });
    // 목업 신호는 들어가지만 등급은 여전히 미확정
    expect(s.graded).toBe(false);
    expect(s.level).toBe("unknown");
    expect(shouldSoundLogisticsSiren(s)).toBe(false);
    // 목업 신호는 isDemo로 표시된다
    expect(s.signals.some((sig) => sig.isDemo)).toBe(true);
  });

  it("심각 사건 2건 이상이면 elevated + 사이렌 발동", () => {
    const s = computeChokepointStress({
      chokepointId: CHOKE.id,
      chokeLat: CHOKE.lat,
      chokeLng: CHOKE.lng,
      ukmtoIncidents: [
        inc("Attack", 12.7, 43.3),
        inc("Hijack", 12.5, 43.4),
      ],
    });
    expect(s.level).toBe("elevated");
    expect(s.graded).toBe(true);
    expect(shouldSoundLogisticsSiren(s)).toBe(true);
  });

  it("멀리 있는 사건은 이 초크포인트에 잡히지 않는다", () => {
    const s = computeChokepointStress({
      chokepointId: CHOKE.id,
      chokeLat: CHOKE.lat,
      chokeLng: CHOKE.lng,
      ukmtoIncidents: [inc("Attack", -40, 120)], // 반대편
    });
    expect(s.level).toBe("unknown");
  });

  it("오래된 사건(윈도 밖)은 제외된다", () => {
    const s = computeChokepointStress({
      chokepointId: CHOKE.id,
      chokeLat: CHOKE.lat,
      chokeLng: CHOKE.lng,
      ukmtoIncidents: [inc("Attack", 12.6, 43.35, 30)], // 30일 전
      windowDays: 7,
    });
    expect(s.level).toBe("unknown");
  });

  it("데모 신호는 결정론적 — 같은 초크포인트면 항상 같은 값", () => {
    const a = demoStressSignals("choke-hormuz");
    const b = demoStressSignals("choke-hormuz");
    expect(a.aisObservation?.changePct).toBe(b.aisObservation?.changePct);
    expect(a.oilVolatility?.hint).toBe(b.oilVolatility?.hint);
  });

  it("PortWatch 실측 B급은 DEMO 배지 없이 출처가 IMF PortWatch", () => {
    const s = computeChokepointStress({
      chokepointId: "choke-hormuz",
      chokeLat: 26.58,
      chokeLng: 56.25,
      ukmtoIncidents: [],
      aisObservation: {
        changePct: -45,
        observedAt: "2026-07-19",
        isDemo: false,
      },
    });
    const b = s.signals.find((sig) => sig.tier === "B");
    expect(b).toBeDefined();
    expect(b?.isDemo).toBe(false);
    expect(b?.sourceEn).toContain("IMF PortWatch");
    expect(s.graded).toBe(false); // A급 없음 → 등급 보류
  });
});
