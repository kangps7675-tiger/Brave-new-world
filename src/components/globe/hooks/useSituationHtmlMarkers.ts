"use client";

import { useMemo } from "react";
import type {
  CasualtySkullHtmlMarker,
  NuclearStockpileHtmlMarker,
  PolygonLayerFeature,
  SafecastGaugeHtmlMarker,
  SituationCalloutMarker,
  StaticGlobePoint,
  TelegramNeonMarker,
  UkraineSettlementHtmlMarker,
  ViewState,
} from "@/components/globe/types";
import type { GdeltTagHtmlMarker } from "@/lib/gdeltLocationTagMarker";
import type {
  TransportPath,
  UkraineControlZone,
  UkraineSettlement,
} from "@/data/geoTypes";
import type { HapiConflictCasualtiesPayload } from "@/lib/hapiConflictCasualties";
import type { MediazonaCasualtySnapshot } from "@/lib/mediazonaCasualties";
import type { ScoredEvent } from "@/data/eventTiers";
import type { GlobeLodTier } from "@/lib/globeLod";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { SituationCallout } from "@/data/situationCalloutTypes";
import type { TelegramAlert } from "@/lib/telegramAlerts";
import type { ViinaPolygonLayers } from "@/lib/viinaLod";
import { isUkraineTheaterGdeltWar } from "@/lib/ukraineGdeltNeonMarker";
import { buildTelegramMapDots } from "@/lib/telegramMapMarkers";
import { resolveCombatTheaterAt } from "@/lib/theaterCombat";
import { isUkraineViinaPolygonLayer } from "@/components/globe/overlayPolygons";
import { useSafecastNearNuclear } from "@/hooks/useSafecastNearNuclear";
import { NUCLEAR_STOCKPILE_SEEDS } from "@/lib/nuclearStockpiles";
import { SETTLEMENT_DETAIL_MIN_MAP_ZOOM } from "@/lib/globePerformance";
import { filterUkraineSettlementsForView } from "@/lib/ukraineSettlements";
import { getUkraineSettlementTier } from "@/lib/ukraineSettlementLabels";
import { UKRAINE_SITUATION_CALLOUTS_SHARED } from "@/data/ukraineSituationSeed";
import { MIDDLE_EAST_SITUATION_CALLOUTS } from "@/data/middleEastSituationSeed";
import { KOREA_SITUATION_CALLOUTS, TAIWAN_SITUATION_CALLOUTS } from "@/data/asiaSituationSeed";
import { KOREA_MISSILE_FACILITY_CALLOUTS } from "@/data/koreaMissileBeltSeed";
import { CHINA_MISSILE_FACILITY_CALLOUTS, isNearChinaMissileBelt } from "@/data/chinaMissileBeltSeed";
import { RUSSIA_MISSILE_FACILITY_CALLOUTS, isNearRussiaMissileBelt } from "@/data/russiaMissileBeltSeed";
import { IRAN_MISSILE_FACILITY_CALLOUTS, isNearIranMissileBelt } from "@/data/iranMissileBeltSeed";

export interface SituationHtmlMarkersParams {
  isEconomyViewer: boolean;
  isCompactUi: boolean;
  labelLanguage: LabelLanguage;

  gdeltTensionTags: ScoredEvent[];

  showTelegramOsint: boolean;
  telegramAlerts: TelegramAlert[];

  globeLodTier: GlobeLodTier;
  filterCenter: { lat: number; lng: number };
  showUkraineControl: boolean;
  showWarZones: boolean;
  showDiplomaticTension: boolean;
  showTzevaAdom: boolean;
  showNewfeedsIranAttacks: boolean;

  hapiCasualties: HapiConflictCasualtiesPayload;
  mediazonaCasualties: MediazonaCasualtySnapshot | null;
  showUcdpEvents: boolean;
  staticGlobePoints: StaticGlobePoint[];

  hoveredPolygon: PolygonLayerFeature | null;
  hoveredPath: TransportPath | null;

  showNuclearSites: boolean;

  mapZoom: number;
  ukraineSettlements: UkraineSettlement[];
  viinaDisplay: Pick<ViinaPolygonLayers, "zones" | "ruFillZones">;
  layerViewState: ViewState;
}

export interface SituationHtmlMarkers {
  gdeltTagHtmlMarkers: GdeltTagHtmlMarker[];
  telegramNeonMarkers: TelegramNeonMarker[];
  situationCalloutMarkers: SituationCalloutMarker[];
  casualtySkullMarkers: CasualtySkullHtmlMarker[];
  visibleCasualtySkullMarkers: CasualtySkullHtmlMarker[];
  nuclearStockpileMarkers: NuclearStockpileHtmlMarker[];
  safecastGaugeMarkers: SafecastGaugeHtmlMarker[];
  ukraineSettlementHtmlMarkers: UkraineSettlementHtmlMarker[];
}

/** 오버레이 조립 전 상황 HTML 마커 8종 — GlobeDashboard에서 분리 (동작 동일) */
export function useSituationHtmlMarkers(
  params: SituationHtmlMarkersParams,
): SituationHtmlMarkers {
  const {
    isEconomyViewer,
    isCompactUi,
    labelLanguage,
    gdeltTensionTags,
    showTelegramOsint,
    telegramAlerts,
    globeLodTier,
    filterCenter,
    showUkraineControl,
    showWarZones,
    showDiplomaticTension,
    showTzevaAdom,
    showNewfeedsIranAttacks,
    hapiCasualties,
    mediazonaCasualties,
    showUcdpEvents,
    staticGlobePoints,
    hoveredPolygon,
    hoveredPath,
    showNuclearSites,
    mapZoom,
    ukraineSettlements,
    viinaDisplay,
    layerViewState,
  } = params;
  // 전선 사상자·UCDP 레이어 제거 — 호출부 시그니처 호환용
  void hapiCasualties;
  void mediazonaCasualties;
  void showUcdpEvents;
  void staticGlobePoints;
  void hoveredPolygon;
  void hoveredPath;

  const gdeltTagHtmlMarkers = useMemo<GdeltTagHtmlMarker[]>(
    () =>
      gdeltTensionTags
        .filter((event) => !isUkraineTheaterGdeltWar(event))
        .map((event) => ({
          ...event,
          markerId: `gdelt-tag-${event.id}`,
          displayKind: "gdelt-tag-html" as const,
        })),
    [gdeltTensionTags],
  );

  /** 텔레그램 속보 → 지명 hit 흰 네온 */
  const telegramNeonMarkers = useMemo<TelegramNeonMarker[]>(() => {
    if (isEconomyViewer || isCompactUi || !showTelegramOsint) return [];
    return buildTelegramMapDots(telegramAlerts);
  }, [isCompactUi, isEconomyViewer, showTelegramOsint, telegramAlerts]);

  const situationCalloutMarkers = useMemo<SituationCalloutMarker[]>(() => {
    if (isEconomyViewer) return [];
    const nearEnough =
      globeLodTier === "continent" ||
      globeLodTier === "regional" ||
      globeLodTier === "near" ||
      globeLodTier === "village";
    if (!nearEnough) return [];

    const theater = resolveCombatTheaterAt(filterCenter.lat, filterCenter.lng);
    const seeds: SituationCallout[] = [];

    // 우크라: 전선 레이어 ON 또는 전장 박스 안
    if (showUkraineControl || theater === "russia-ukraine") {
      seeds.push(...UKRAINE_SITUATION_CALLOUTS_SHARED);
    }
    // 중동·이란: 전쟁구역/긴장/공습경보 또는 중동 박스
    if (
      theater === "middle-east" ||
      showWarZones ||
      showDiplomaticTension ||
      showTzevaAdom ||
      showNewfeedsIranAttacks
    ) {
      if (theater === "middle-east" || showWarZones || showTzevaAdom || showNewfeedsIranAttacks) {
        seeds.push(...MIDDLE_EAST_SITUATION_CALLOUTS);
      }
    }
    // 대만·한반도: 해당 전장 위 + 전쟁구역/긴장
    if (theater === "china-taiwan" && (showWarZones || showDiplomaticTension)) {
      seeds.push(...TAIWAN_SITUATION_CALLOUTS);
    }
    // 한반도 상황·미사일 시설 — 지정학에서 한국 전장이면 자동
    if (theater === "korea") {
      seeds.push(...KOREA_SITUATION_CALLOUTS);
      seeds.push(...KOREA_MISSILE_FACILITY_CALLOUTS);
    }

    // 카메라가 해당 전장에 있을 때만 그 전장 콜아웃 표시 (혼선 방지)
    let visible =
      theater == null
        ? seeds.filter((c) => c.theater === "russia-ukraine" && showUkraineControl)
        : seeds.filter((c) => c.theater === theater);

    // 중국 PLARF — 대만 박스 밖이므로 서북부 벨트권이면 자동
    if (isNearChinaMissileBelt(filterCenter.lat, filterCenter.lng)) {
      visible = [...visible, ...CHINA_MISSILE_FACILITY_CALLOUTS];
    }
    // 러시아 RVSN — 우크라 전장 박스 밖이므로 벨트권이면 자동
    if (isNearRussiaMissileBelt(filterCenter.lat, filterCenter.lng)) {
      visible = [...visible, ...RUSSIA_MISSILE_FACILITY_CALLOUTS];
    }
    // 이란 — 중동 박스 안이어도 본토 벨트권일 때만 미사일 시설 콜아웃
    if (isNearIranMissileBelt(filterCenter.lat, filterCenter.lng)) {
      visible = [...visible, ...IRAN_MISSILE_FACILITY_CALLOUTS];
    }

    return visible.map((callout) => ({
      ...callout,
      markerId: `sit-callout-${callout.theater}-${callout.id}`,
      displayKind: "situation-callout" as const,
    }));
  }, [
    filterCenter.lat,
    filterCenter.lng,
    globeLodTier,
    isEconomyViewer,
    showDiplomaticTension,
    showNewfeedsIranAttacks,
    showTzevaAdom,
    showUkraineControl,
    showWarZones,
  ]);

  /** 전선 사상자·UCDP 사망 라벨 — 제품에서 제거 */
  const casualtySkullMarkers = useMemo<CasualtySkullHtmlMarker[]>(() => [], []);
  const visibleCasualtySkullMarkers = useMemo<CasualtySkullHtmlMarker[]>(() => [], []);

  /**
   * OWID 핵탄두 보유량 — 각국 좌표 위 ICBM 아이콘 + 탄두 수 (지정학 뷰 자동 표시).
   */
  const safecastReadings = useSafecastNearNuclear(showNuclearSites && !isEconomyViewer);

  const nuclearStockpileMarkers = useMemo<NuclearStockpileHtmlMarker[]>(() => {
    if (isEconomyViewer) return [];
    const casualtyPts = casualtySkullMarkers.map((m) => ({ lat: m.lat, lng: m.lng }));
    const MIN_SEP_DEG = 2.1; // 마커 간 최소 간격(°)
    const MAX_SHIFT_DEG = 4.0; // 국가에서 벗어나는 최대 이동량 상한

    return NUCLEAR_STOCKPILE_SEEDS.map((seed) => {
      let lat = seed.lat;
      let lng = seed.lng;

      if (casualtyPts.length > 0) {
        for (let iter = 0; iter < 8; iter += 1) {
          let ax = 0;
          let ay = 0;
          let hits = 0;
          for (const p of casualtyPts) {
            const dLat = lat - p.lat;
            const dLng = lng - p.lng;
            const dist = Math.hypot(dLat, dLng);
            if (dist < MIN_SEP_DEG) {
              const need = MIN_SEP_DEG - dist + 0.15;
              if (dist < 1e-3) {
                ay -= need; // 완전히 겹치면 남쪽으로 기본 회피
              } else {
                ax += (dLng / dist) * need;
                ay += (dLat / dist) * need;
              }
              hits += 1;
            }
          }
          if (hits === 0) break;
          lat += ay / hits;
          lng += ax / hits;
        }

        // 국가에서 너무 멀어지지 않게 총 이동량 제한
        const totLat = lat - seed.lat;
        const totLng = lng - seed.lng;
        const tot = Math.hypot(totLat, totLng);
        if (tot > MAX_SHIFT_DEG) {
          const k = MAX_SHIFT_DEG / tot;
          lat = seed.lat + totLat * k;
          lng = seed.lng + totLng * k;
        }
        lat = Math.max(-85, Math.min(85, lat));
      }

      return {
        markerId: `nuclear-icbm-${seed.code}`,
        displayKind: "nuclear-icbm" as const,
        code: seed.code,
        nameKo: seed.nameKo,
        nameEn: seed.nameEn,
        lat,
        lng,
        warheads: seed.warheads,
        year: seed.year,
      };
    });
  }, [casualtySkullMarkers, isEconomyViewer]);

  const safecastGaugeMarkers = useMemo<SafecastGaugeHtmlMarker[]>(() => {
    if (!showNuclearSites || isEconomyViewer) return [];
    return safecastReadings.map((r) => ({
      markerId: `safecast-${r.siteId}`,
      displayKind: "safecast-gauge" as const,
      siteId: r.siteId,
      siteName: r.siteName,
      lat: r.lat,
      lng: r.lng,
      usvPerH: r.usvPerH,
      level: r.level,
      capturedAt: r.capturedAt,
    }));
  }, [isEconomyViewer, safecastReadings, showNuclearSites]);

  const ukraineSettlementHtmlMarkers = useMemo<UkraineSettlementHtmlMarker[]>(() => {
    if (!showUkraineControl) return [];
    if (mapZoom <= SETTLEMENT_DETAIL_MIN_MAP_ZOOM) return [];
    if (ukraineSettlements.length === 0 && viinaDisplay.zones.length === 0) return [];
    return filterUkraineSettlementsForView(
      ukraineSettlements,
      viinaDisplay.ruFillZones.length > 0 ? viinaDisplay.ruFillZones : viinaDisplay.zones,
      layerViewState,
      layerViewState.altitude,
    ).map((settlement) => ({
      ...settlement,
      markerId: `ua-settle-${settlement.geonameId}`,
      displayKind: "ua-settlement-html" as const,
      tier: getUkraineSettlementTier(settlement.population),
    }));
  }, [layerViewState, mapZoom, showUkraineControl, ukraineSettlements, viinaDisplay.ruFillZones, viinaDisplay.zones]);

  return {
    gdeltTagHtmlMarkers,
    telegramNeonMarkers,
    situationCalloutMarkers,
    casualtySkullMarkers,
    visibleCasualtySkullMarkers,
    nuclearStockpileMarkers,
    safecastGaugeMarkers,
    ukraineSettlementHtmlMarkers,
  };
}
