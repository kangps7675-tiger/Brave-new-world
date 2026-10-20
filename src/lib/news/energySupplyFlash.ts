/**
 * 관측대 속보 양피지 — 유가·가스·에너지 인프라·공급망 초크만.
 * LiveUA·RSS 공통. 「몇 개든」열어 주되, 전장 일상 교전은 제외.
 */

import { nearestLogisticsChokepoint } from "@/lib/liveuamap/flashMarketContext";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import {
  CHOKEPOINT_PLACE_RE,
  isChokepointNews,
} from "@/lib/news/chokepointNews";

/** 원유·가스·정유·유조선·LNG */
export const OIL_GAS_FLASH_RE =
  /\b(oil|crude|brent|wti|lng|nat(?:ural)?\s?gas|refiner(?:y|ies)?|pipeline|tanker|opec|fuel\s?(?:depot|storage)|petro(?:leum)?|gasoline|diesel|kerosene|oilfield|oil\s?field|oil\s?terminal|gas\s?(?:plant|field|processing)|송유|원유|유가|정유|가스관|파이프라인|유조선|LNG|천연가스|OPEC|유류|연료\s?저장|유전|가스전)\b/i;

/** 공급망·해운·봉쇄가 에너지/초크와 겹칠 때 */
const SUPPLY_CHAIN_FLASH_RE =
  /\b(supply\s?chain|shipping|freight|blockade|reroute|war\s?risk|insurance\s?premium|container|logistics|공급망|해운|운임|봉쇄|우회|물류|전쟁위험)\b/i;

const ENERGY_INFRA_THEATER_RE =
  /\b(ukraine|ukrainian|russia|russian|black\s?sea|donbas|ryazan|tuapse|novorossiysk|odesa|odessa|kremenchuk|lisichansk|lysychansk|shebelinka|우크라이나|우크라|러시아|흑해|랴잔|투압세|노보로시스크|오데사|크레멘추크)\b/i;

const ENERGY_KINETIC_RE =
  /\b(strike|struck|hit|attack|bomb(?:ed|ing)?|missile|drone|shahed|explosion|destroyed|damaged|타격|폭격|피격|공습|미사일|드론|폭발|파괴)\b/i;

export function flashTextBlob(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function isEnergyInfraKinetic(text: string): boolean {
  return (
    OIL_GAS_FLASH_RE.test(text) &&
    ENERGY_INFRA_THEATER_RE.test(text) &&
    ENERGY_KINETIC_RE.test(text)
  );
}

/**
 * 유가·가스·초크(호르무즈·바브·수에즈 등)·정유 타격·공급망 해협 이슈.
 */
export function isEnergySupplyChainFlash(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (OIL_GAS_FLASH_RE.test(t)) return true;
  if (isEnergyInfraKinetic(t)) return true;
  // 기름이 오가는 해협·공급망 초크에서 터진 사건 (군사 각도 포함)
  if (isChokepointNews(t)) return true;
  if (SUPPLY_CHAIN_FLASH_RE.test(t) && CHOKEPOINT_PLACE_RE.test(t)) return true;
  return false;
}

/** LiveUA 핀 — 텍스트 + 인근 물류 초크(좌표) */
export function isLiveuaEnergySupplyFlash(
  event: Pick<
    LiveuamapEvent,
    "title" | "titleKo" | "body" | "bodyKo" | "tags" | "lat" | "lng" | "theater"
  >,
): boolean {
  const text = flashTextBlob([
    event.title,
    event.titleKo,
    event.body,
    event.bodyKo,
    ...(event.tags ?? []),
    event.theater,
  ]);
  if (isEnergySupplyChainFlash(text)) return true;
  if (
    Number.isFinite(event.lat) &&
    Number.isFinite(event.lng) &&
    nearestLogisticsChokepoint(event.lat, event.lng) != null
  ) {
    return true;
  }
  return false;
}

export function filterLiveuaEnergySupplyFlashes(
  events: LiveuamapEvent[],
): LiveuamapEvent[] {
  return events.filter(isLiveuaEnergySupplyFlash);
}
