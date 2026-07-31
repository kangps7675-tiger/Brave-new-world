/**
 * 초크포인트 정합성 — 2026-07-31 감사 P0-5 회귀 방지.
 *
 * 감사 당시 `chokepoints.ts` 와 `criticalNodes`(vendor) 에 같은 장소가
 * **다른 좌표로** 들어 있었다:
 *   수에즈  31.25/32.34  vs  30.593/32.437  → 약 73km 차이
 * 두 레이어를 동시에 켜면 "Suez Canal" 핀이 73km 떨어져 두 개 떴다.
 *
 * 레이어가 40개가 넘는데 엔티티 해소 계층이 없다는 게 근본 문제다.
 * 완전한 registry 를 도입하기 전까지, 최소한 **우리가 직접 쓰는 두 소스**의
 * 좌표는 어긋나지 않게 여기서 잠근다.
 */
import { describe, expect, it } from "vitest";
import { CHOKEPOINTS } from "@/data/chokepoints";
import { SCENE_PLACES } from "@/lib/sceneCard";
import { CRITICAL_NODES } from "@/data/criticalNodes";

/**
 * 같은 실체로 보는 최대 거리(km).
 *
 * 초크포인트는 점이 아니라 **긴 선형 지형**이다 — 믈라카는 800km, 수에즈는 193km.
 * 그래서 20~30km 편차는 의미 있는 불일치가 아니다. 반면 70km 이상 벌어지면
 * 지구본에서 두 개의 별도 핀으로 보인다. 그 사이에서 임계를 잡는다.
 */
const SAME_ENTITY_KM = 50;

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const meanLat = ((a.lat + b.lat) / 2) * toRad;
  const dLng = (b.lng - a.lng) * toRad * Math.cos(meanLat);
  return Math.sqrt(dLat * dLat + dLng * dLng) * 6371;
}

describe("chokepoints", () => {
  it("slug 이 중복되지 않는다", () => {
    const slugs = CHOKEPOINTS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("좌표가 유효 범위 안이다", () => {
    for (const c of CHOKEPOINTS) {
      expect(c.lat, c.slug).toBeGreaterThanOrEqual(-90);
      expect(c.lat, c.slug).toBeLessThanOrEqual(90);
      expect(c.lng, c.slug).toBeGreaterThanOrEqual(-180);
      expect(c.lng, c.slug).toBeLessThanOrEqual(180);
      expect(c.lat === 0 && c.lng === 0, `${c.slug} 널섬`).toBe(false);
    }
  });

  it("scenePlaceId 가 SCENE_PLACES 에 존재한다", () => {
    const ids = new Set(SCENE_PLACES.map((p) => p.id));
    for (const c of CHOKEPOINTS) {
      expect(ids.has(c.scenePlaceId), `${c.slug} → ${c.scenePlaceId} 없음`).toBe(true);
    }
  });

  it("SCENE_PLACES 와 좌표가 일치한다 (P0-5)", () => {
    for (const c of CHOKEPOINTS) {
      const place = SCENE_PLACES.find((p) => p.id === c.scenePlaceId);
      if (!place) continue;
      const km = distanceKm(c, place);
      expect(
        km,
        `${c.slug}: chokepoints(${c.lat},${c.lng}) vs SCENE_PLACES(${place.lat},${place.lng}) ` +
          `= ${km.toFixed(1)}km 어긋남. 같은 지명 핀이 두 개 뜬다.`,
      ).toBeLessThan(1);
    }
  });

  it("criticalNodes 와 같은 실체면 좌표가 크게 어긋나지 않는다 (P0-5)", () => {
    const drift: string[] = [];
    for (const c of CHOKEPOINTS) {
      const nameEn = c.name.en.toLowerCase();
      const node = CRITICAL_NODES.find((n) => {
        // "Taiwan Strait (Energy)" 처럼 괄호로 갈래를 나눈 항목은 별개 실체로 본다.
        if (/\(.+\)/.test(n.name)) return false;
        const nn = n.name.toLowerCase();
        return nn === nameEn || nameEn.includes(nn) || nn.includes(nameEn);
      });
      if (!node) continue;
      const km = distanceKm(c, node);
      if (km > SAME_ENTITY_KM) {
        drift.push(
          `${c.slug}: chokepoints(${c.lat},${c.lng}) vs criticalNodes "${node.name}"` +
            `(${node.lat},${node.lng}) = ${km.toFixed(1)}km`,
        );
      }
    }
    expect(drift, `동일 실체 좌표 불일치:\n${drift.join("\n")}`).toEqual([]);
  });

  it("flow 가 있으면 기준 기간을 반드시 밝힌다", () => {
    // 숫자만 있고 기준 시점이 없으면 오래된 값을 오늘 값처럼 읽게 된다.
    for (const c of CHOKEPOINTS) {
      if (!c.flow) continue;
      expect(c.flow.period?.trim().length, `${c.slug} flow.period 없음`).toBeGreaterThan(0);
      expect(c.flow.oilMbd, `${c.slug} oilMbd`).toBeGreaterThan(0);
    }
  });

  it("EIA 정본 8대 초크포인트를 모두 담는다", () => {
    const slugs = new Set(CHOKEPOINTS.map((c) => c.slug));
    for (const required of [
      "strait-of-hormuz",
      "strait-of-malacca",
      "bab-el-mandeb",
      "suez-canal",
      "turkish-straits",
      "panama-canal",
      "danish-straits",
    ]) {
      expect(slugs.has(required), `${required} 누락`).toBe(true);
    }
  });
});
