import type { AisVessel } from "@/data/geoTypes";
import type { UsCarrier } from "@/data/usCarriers";

/** AIS 선명이 항모처럼 보이는지 (매칭 후보만) */
export function looksLikeAircraftCarrier(shipName: string | null | undefined): boolean {
  if (!shipName) return false;
  return /CARRIER|CVN\s*\d+|NIMITZ|EISENHOWER|VINSON|ROOSEVELT|LINCOLN|WASHINGTON|STENNIS|TRUMAN|REAGAN|BUSH|FORD|ENTERPRISE|KENNEDY/i.test(
    shipName,
  );
}

function hullNumber(hull: string): string | null {
  const m = hull.match(/(\d+)/);
  return m?.[1] ?? null;
}

/**
 * AIS 군함 이름 → 기존 US 항모 시드 매칭.
 * 매칭 실패 시 null (없으면 말고).
 */
export function matchAisVesselToCarrier(
  vessel: AisVessel,
  carriers: UsCarrier[],
): UsCarrier | null {
  const name = (vessel.shipName || "").trim();
  if (!name || !looksLikeAircraftCarrier(name)) return null;

  const upper = name.toUpperCase();

  for (const carrier of carriers) {
    const hullNo = hullNumber(carrier.hull);
    if (hullNo && new RegExp(`\\bCVN\\s*0*${hullNo}\\b`, "i").test(name)) {
      return carrier;
    }

    const short = carrier.name.replace(/^USS\s+/i, "").trim();
    if (short.length >= 4 && upper.includes(short.toUpperCase())) {
      return carrier;
    }

    if (upper.includes(carrier.name.toUpperCase())) {
      return carrier;
    }
  }

  return null;
}

export type CarrierAisMergeResult = {
  /** AIS 위치로 갱신된 항모 목록 (매칭 없으면 원본과 동일) */
  carriers: UsCarrier[];
  /** 항모로 흡수된 AIS MMSI — 일반 군함 점에서 제외 */
  matchedMmsi: Set<string>;
  /** 실제로 위치가 바뀐 항모 id */
  updatedIds: string[];
};

/**
 * AIS 군함 중 알려진 US 항모가 있으면 lat/lng·상태를 기존 항모 데이터에 반영.
 * 매칭되는 항모가 없으면 carriers 원본 유지.
 */
export function mergeCarriersWithAisPositions(
  carriers: UsCarrier[],
  aisVessels: AisVessel[],
): CarrierAisMergeResult {
  if (carriers.length === 0 || aisVessels.length === 0) {
    return { carriers, matchedMmsi: new Set(), updatedIds: [] };
  }

  const matchedMmsi = new Set<string>();
  const updatedIds: string[] = [];
  const next = new Map(carriers.map((c) => [c.id, { ...c }]));

  for (const vessel of aisVessels) {
    if (vessel.category === "commercial") continue;
    const matched = matchAisVesselToCarrier(vessel, carriers);
    if (!matched) continue;

    matchedMmsi.add(vessel.mmsi);
    const current = next.get(matched.id);
    if (!current) continue;

    const moved =
      Math.abs(current.lat - vessel.lat) > 0.02 || Math.abs(current.lng - vessel.lng) > 0.02;

    next.set(matched.id, {
      ...current,
      lat: vessel.lat,
      lng: vessel.lng,
      status: "deployed",
      location: `AIS 실시간 · ${vessel.shipName || vessel.mmsi}`,
      notes: [
        current.notes,
        `AIS 연동 MMSI ${vessel.mmsi}${vessel.timestamp ? ` · ${vessel.timestamp}` : ""}`,
      ]
        .filter(Boolean)
        .join(" · "),
    });

    if (moved || !updatedIds.includes(matched.id)) {
      updatedIds.push(matched.id);
    }
  }

  if (matchedMmsi.size === 0) {
    return { carriers, matchedMmsi, updatedIds: [] };
  }

  return {
    carriers: carriers.map((c) => next.get(c.id) ?? c),
    matchedMmsi,
    updatedIds,
  };
}
