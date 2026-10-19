/**
 * LiveUAMap 속보 → 러시아·우크라이나 에너지·항만 시설 피격 판정.
 *
 * 판정 순서:
 *   1. 드론·미사일·유도폭탄이 "실제로 떨어진" 속보인가 (liveuaConfirmedStrike)
 *   2. 좌표가 감시 시설 반경 안이거나, 본문에 시설 별칭이 나오는가
 *   3. 그도 아니면 "정유·유류저장·터미널" 단어가 있는 경우만 '시설 미상'으로 남긴다
 * 근거 등급:
 *   - "위성 열점 확인": 사건 뒤 48시간 안에 FIRMS 열점이 시설 반경 안에 잡힘
 *   - "보도": 속보만 있음
 */

import { ENERGY_FACILITIES, distanceKm, nearestEnergyFacility, type EnergyFacility } from "@/data/energyFacilities";
import { liveuaConfirmedStrike, type LiveuaStrikeKind } from "@/lib/liveuamap/confirmedStrike";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";

export type EnergyStrikeEvidence = "firms" | "report";

export type EnergyStrike = {
  id: string;
  event: LiveuamapEvent;
  kind: LiveuaStrikeKind;
  facility: EnergyFacility | null;
  evidence: EnergyStrikeEvidence;
  /** 시설 반경 안 FIRMS 열점 수 */
  firmsHits: number;
};

export type FirmsPoint = { lat: number; lng: number; acqDate?: string | null; acqTime?: string | null };

const ENERGY_WORD_RE =
  /refiner|oil depot|fuel depot|oil terminal|tank farm|pumping station|oil facilit|gas facilit|gas storage|port infrastructure|grain terminal|정유|유류\s*저장|석유\s*저장|연료\s*저장|석유\s*터미널|펌프장|가스\s*시설|항만\s*시설|곡물\s*터미널/i;

function textOf(e: LiveuamapEvent): string {
  return [e.title, e.body, e.titleKo, e.bodyKo].filter(Boolean).join(" ").toLowerCase();
}

function facilityByAlias(text: string): EnergyFacility | null {
  for (const f of ENERGY_FACILITIES) {
    if (f.aliases.some((a) => text.includes(a.toLowerCase()))) return f;
  }
  return null;
}

function firmsTimeMs(p: FirmsPoint): number | null {
  if (!p.acqDate) return null;
  const t = (p.acqTime ?? "0000").padStart(4, "0");
  const ms = Date.parse(`${p.acqDate}T${t.slice(0, 2)}:${t.slice(2, 4)}:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

export function countFirmsNear(
  facility: EnergyFacility,
  fires: readonly FirmsPoint[],
  sinceMs?: number,
  windowMs = 48 * 3_600_000,
): number {
  let n = 0;
  for (const p of fires) {
    if (distanceKm(p.lat, p.lng, facility.lat, facility.lng) > facility.radiusKm) continue;
    if (sinceMs != null) {
      const t = firmsTimeMs(p);
      // 시각을 모르는 열점은 창 안으로 친다 (FIRMS 최근 1~2일분만 들어오므로)
      if (t != null && (t < sinceMs - 6 * 3_600_000 || t > sinceMs + windowMs)) continue;
    }
    n += 1;
  }
  return n;
}

export function classifyEnergyStrike(
  event: LiveuamapEvent,
  fires: readonly FirmsPoint[] = [],
): EnergyStrike | null {
  const hit = liveuaConfirmedStrike(event);
  if (!hit) return null;
  const text = textOf(event);
  const near = nearestEnergyFacility(event.lat, event.lng, 3)?.facility ?? null;
  const facility = near ?? facilityByAlias(text);
  if (!facility && !ENERGY_WORD_RE.test(text)) return null;
  // 시설 별칭만 맞고 좌표가 수백 km 떨어진 경우(다른 도시 속보)는 버린다
  if (!near && facility && distanceKm(event.lat, event.lng, facility.lat, facility.lng) > 80) return null;

  const t = Date.parse(event.publishedAt);
  const firmsHits = facility ? countFirmsNear(facility, fires, Number.isFinite(t) ? t : undefined) : 0;
  return {
    id: event.id,
    event,
    kind: hit.kind,
    facility,
    evidence: firmsHits > 0 ? "firms" : "report",
    firmsHits,
  };
}

export function energyStrikesFrom(
  events: readonly LiveuamapEvent[],
  fires: readonly FirmsPoint[] = [],
): EnergyStrike[] {
  const out: EnergyStrike[] = [];
  for (const e of events) {
    if (e.regionId !== "ukraine") continue;
    const s = classifyEnergyStrike(e, fires);
    if (s) out.push(s);
  }
  return out.sort((a, b) => b.event.publishedAt.localeCompare(a.event.publishedAt));
}

/** 우크라이나 전쟁 동향 탭 — 에너지 시설로 분류되지 않은 교전·공습 속보 */
export function ukraineWarEvents(events: readonly LiveuamapEvent[]): LiveuamapEvent[] {
  return events
    .filter((e) => e.regionId === "ukraine" && Number.isFinite(e.lat) && Number.isFinite(e.lng))
    .filter((e) => !classifyEnergyStrike(e))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
