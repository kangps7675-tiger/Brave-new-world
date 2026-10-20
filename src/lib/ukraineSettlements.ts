import type { UkraineControlZone, UkraineSettlement } from "@/data/geoTypes";
import { filterCombatSettlementsForView } from "@/lib/ukraineCombatSettlements";

type ViewState = { lat: number; lng: number; altitude: number };

/**
 * 전투 주변·요충지·점령/경합 지역 거주지만 표시.
 * zones: VIINA 폴리곤 (lite에서 거주지 대체 라벨 소스)
 */
export function filterUkraineSettlementsForView(
  settlements: UkraineSettlement[],
  zones: UkraineControlZone[],
  view: ViewState,
  altitude: number,
): UkraineSettlement[] {
  return filterCombatSettlementsForView(settlements, zones, view, altitude);
}
