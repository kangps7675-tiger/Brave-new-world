/**
 * 우크라이나·서러시아 활성 전쟁구역 — disputes 에 항상 병합.
 * CDN/로컬 disputes.json 이 오래돼도 지구본에 빨간 빗금이 뜨도록 한다.
 */

import type { DisputeArea } from "@/data/geoTypes";
import seed from "@/data/ukraineCombatZonesSeed.json";

export const UKRAINE_COMBAT_ZONE_DISPUTES = seed as DisputeArea[];

/** 기존 목록에 우크라 전쟁구역을 upsert (같은 id 덮어씀) */
export function mergeUkraineCombatDisputes(
  disputes: DisputeArea[] | null | undefined,
): DisputeArea[] {
  const base = Array.isArray(disputes) ? disputes : [];
  const byId = new Map(base.map((d) => [d.id, d]));
  for (const zone of UKRAINE_COMBAT_ZONE_DISPUTES) {
    const prev = byId.get(zone.id);
    byId.set(zone.id, prev ? { ...prev, ...zone } : zone);
  }
  return [...byId.values()];
}
