"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EMPTY_OVERLAY_POLYGONS } from "@/components/globe/constants";
import { geometryToBorderPaths } from "@/components/globe/geometryToBorderPaths";
import type { PolygonLayerFeature, ConflictClusterPoint } from "@/components/globe/types";
import { isNearChinaMissileBelt, CHINA_MISSILE_BELTS } from "@/data/chinaMissileBeltSeed";
import type { TransportPath, DisputeArea, ConflictZoneFeature } from "@/data/geoTypes";
import { isNearIranMissileBelt, IRAN_MISSILE_BELTS } from "@/data/iranMissileBeltSeed";
import { KOREA_MISSILE_BELTS } from "@/data/koreaMissileBeltSeed";
import { isNearRussiaMissileBelt, RUSSIA_MISSILE_BELTS } from "@/data/russiaMissileBeltSeed";
import { isNearRussiaNavalBastion, RUSSIA_NAVAL_BASTION_BELTS } from "@/data/russiaNavalBastionSeed";
import { resolveDisputeCenter } from "@/lib/disputeCenter";
import { disputeMatchesWarDiplomaticLayers, rankDisputesForDisplay, disputeGeometryBbox, conflictZoneToOutlineAndHatchPaths } from "@/lib/disputeHatch";
import { getCachedDisputeHatchPaths } from "@/lib/disputeHatchCache";
import type { DisputeHatchLod } from "@/lib/disputeHatchPrecompute";
import { readDisputeHatchPathsCache, prefetchDisputeHatchPaths } from "@/lib/disputeHatchPrefetch";
import { resolveCombatTheaterAt } from "@/lib/theaterCombat";
import { filterHatchPathsByView } from "@/lib/ukraineHatchPrecompute";
import { VIEWPORT_RADIUS_BY_TIER, COUNTRY_POLYGON_MAX_BY_TIER, filterByViewportCenter, DISPUTE_MAX_BY_TIER, isBboxNearView, isCenterInView } from "@/lib/viewportCull";

import type { AppData, ArmsEmbargoZone, CountryFeature, MilitaryBaseArea, MissileSiloFieldArea, ResourceDepositArea } from "@/data/geoTypes";
import type { GlobeLod } from "@/lib/globeLod";

import type { CameraViewState } from "@/hooks/useCameraViewport";
import type { GpsJamPolygonFeature } from "@/hooks/useGpsJamLayer";

export type UseDisputeZoneLayersOptions = {
  data: AppData;
  isEconomyViewer: boolean;
  isConflictViewer: boolean;
  isHistoryViewer: boolean;
  globeReady: boolean;
  showWarZones: boolean;
  showDiplomaticTension: boolean;
  showMilitaryBases: boolean;
  showMissileSiloFields: boolean;
  showResources: boolean;
  showGpsInterference: boolean;
  showArmsEmbargo: boolean;
  showConflictZones: boolean;
  showAnyDisputeOverlay: boolean;
  filterCenter: { lat: number; lng: number; };
  layerViewState: CameraViewState;
  globeLod: GlobeLod;
  gpsJamPolygons: GpsJamPolygonFeature[];
  isVectorBaseMap: boolean;
  viewportCountries: CountryFeature[];
  visibleMilitaryBaseAreas: MilitaryBaseArea[];
  visibleMissileSiloFields: MissileSiloFieldArea[];
  visibleResourceDeposits: ResourceDepositArea[];
  visibleConflictZones: ConflictZoneFeature[];
  visibleArmsEmbargoZones: ArmsEmbargoZone[];
};

/**
 * 국가 면·분쟁 구역(해칭)·오버레이 폴리곤·무기금수 프레임 memo 묶음.
 * GlobeDashboard에서 추출 (분리 Phase D).
 */
export function useDisputeZoneLayers(opts: UseDisputeZoneLayersOptions) {
  const {
    data,
    isEconomyViewer,
    isConflictViewer,
    isHistoryViewer,
    globeReady,
    showWarZones,
    showDiplomaticTension,
    showMilitaryBases,
    showMissileSiloFields,
    showResources,
    showGpsInterference,
    showArmsEmbargo,
    showConflictZones,
    showAnyDisputeOverlay,
    filterCenter,
    layerViewState,
    globeLod,
    gpsJamPolygons,
    isVectorBaseMap,
    viewportCountries,
    visibleMilitaryBaseAreas,
    visibleMissileSiloFields,
    visibleResourceDeposits,
    visibleConflictZones,
    visibleArmsEmbargoZones,
  } = opts;

  const countryPolygonData = useMemo<PolygonLayerFeature[]>(() => {
    // 역사 모드 — 현대 국가 면(호버·픽용) 전부 제외. Cliopatria/Korea polity만 사용.
    if (isHistoryViewer) return [];
    const withGeometry = (data.countries ?? []).filter((country) => Boolean(country.geometry));
    if (isVectorBaseMap) {
      return withGeometry.map((country) => ({ ...country, polygonLayer: "country" as const }));
    }
    // 서버 뷰포트 응답이 있으면 그걸 우선 (전체 countries geometry 미보유)
    if (viewportCountries.length > 0) {
      return viewportCountries.map((country) => ({
        ...country,
        polygonLayer: "country" as const,
      }));
    }
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier];
    const maxCount = COUNTRY_POLYGON_MAX_BY_TIER[globeLod.tier];
    const visible = filterByViewportCenter(
      withGeometry,
      layerViewState,
      radiusDeg,
      maxCount,
      (a, b) => (b.population ?? 0) - (a.population ?? 0),
    );
    return visible.map((country) => ({ ...country, polygonLayer: "country" as const }));
  }, [
    data.countries,
    globeLod.tier,
    isHistoryViewer,
    isVectorBaseMap,
    layerViewState,
    viewportCountries,
  ]);

  const disputeHatchLod: DisputeHatchLod =
    globeLod.tier === "global" || globeLod.tier === "continent" ? "overview" : "detail";
  const [disputeHatchCachePaths, setDisputeHatchCachePaths] = useState<TransportPath[]>(
    () => readDisputeHatchPathsCache(disputeHatchLod)?.paths ?? [],
  );

  useEffect(() => {
    if (!showAnyDisputeOverlay || !globeReady) return;
    let cancelled = false;
    const cached = readDisputeHatchPathsCache(disputeHatchLod);
    if (cached?.paths?.length) setDisputeHatchCachePaths(cached.paths);
    void prefetchDisputeHatchPaths(disputeHatchLod).then((payload) => {
      if (cancelled || !payload?.paths?.length) return;
      setDisputeHatchCachePaths(payload.paths);
    });
    return () => {
      cancelled = true;
    };
  }, [disputeHatchLod, globeReady, showAnyDisputeOverlay]);

  const overlayPolygonData = useMemo<PolygonLayerFeature[]>(() => {
    const layers: PolygonLayerFeature[] = [];

    // 우크라이나 점령·주장: MapLibre macro/micro GeoJSON — deck.gl overlay 면 없음

    if (showGpsInterference && gpsJamPolygons.length > 0) {
      layers.push(...gpsJamPolygons);
    }

    if (!showGpsInterference && showMilitaryBases && visibleMilitaryBaseAreas.length > 0) {
      layers.push(
        ...visibleMilitaryBaseAreas.map((area) => ({
          ...area,
          polygonLayer: "military-base" as const,
        })),
      );
    }
    if (
      !showGpsInterference &&
      showResources &&
      visibleResourceDeposits.length > 0
    ) {
      layers.push(
        ...visibleResourceDeposits.map((area) => ({
          ...area,
          polygonLayer: "resource-deposit" as const,
        })),
      );
    }
    if (
      !showGpsInterference &&
      showMissileSiloFields &&
      visibleMissileSiloFields.length > 0
    ) {
      layers.push(
        ...visibleMissileSiloFields.map((area) => ({
          ...area,
          polygonLayer: "missile-silo-field" as const,
        })),
      );
    }

    // 미사일 벨트 — 지정학에서 해당 권역이면 자동 표시 (레이어 토글 불필요)
    if (
      !showGpsInterference &&
      isConflictViewer &&
      (globeLod.tier === "continent" ||
        globeLod.tier === "regional" ||
        globeLod.tier === "near" ||
        globeLod.tier === "village")
    ) {
      const theater = resolveCombatTheaterAt(filterCenter.lat, filterCenter.lng);
      if (theater === "korea") {
        for (const belt of KOREA_MISSILE_BELTS) {
          layers.push({ ...belt, polygonLayer: "missile-belt" as const });
        }
      }
      if (isNearChinaMissileBelt(filterCenter.lat, filterCenter.lng)) {
        for (const belt of CHINA_MISSILE_BELTS) {
          layers.push({ ...belt, polygonLayer: "missile-belt" as const });
        }
      }
      if (isNearRussiaMissileBelt(filterCenter.lat, filterCenter.lng)) {
        for (const belt of RUSSIA_MISSILE_BELTS) {
          layers.push({ ...belt, polygonLayer: "missile-belt" as const });
        }
      }
      if (isNearRussiaNavalBastion(filterCenter.lat, filterCenter.lng)) {
        for (const belt of RUSSIA_NAVAL_BASTION_BELTS) {
          layers.push({ ...belt, polygonLayer: "missile-belt" as const });
        }
      }
      if (isNearIranMissileBelt(filterCenter.lat, filterCenter.lng)) {
        for (const belt of IRAN_MISSILE_BELTS) {
          layers.push({ ...belt, polygonLayer: "missile-belt" as const });
        }
      }
    }

    return layers.length > 0 ? layers : EMPTY_OVERLAY_POLYGONS;
  }, [
    showGpsInterference,
    gpsJamPolygons,
    showMilitaryBases,
    visibleMilitaryBaseAreas,
    showResources,
    visibleResourceDeposits,
    showMissileSiloFields,
    visibleMissileSiloFields,
    isEconomyViewer,
    globeLod.tier,
    filterCenter.lat,
    filterCenter.lng,
  ]);

  const disputeZonePaths = useMemo<TransportPath[]>(() => {
    if (isEconomyViewer) return [];
    if (!showAnyDisputeOverlay && !showConflictZones) return [];
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier] + 6;
    const maxZones = DISPUTE_MAX_BY_TIER[globeLod.tier];
    const maxPaths = Math.max(400, maxZones * 24);
    const paths: TransportPath[] = [];

    if (showAnyDisputeOverlay) {
      const preferDetail = disputeHatchLod === "detail";
      const coveredDisputeIds = new Set<string>();

      if (disputeHatchCachePaths.length > 0) {
        const filtered = filterHatchPathsByView(
          disputeHatchCachePaths,
          layerViewState,
          radiusDeg,
          maxPaths,
        ).filter((path) => {
          // 레이어 체크: war/diplomatic — path id에서 dispute 매칭
          const match = path.id.match(/^dispute-(?:zone|hatch)-(.+)-\d+$/);
          if (!match) return true;
          const disputeId = match[1];
          const dispute = (data.disputes ?? []).find((d) => d.id === disputeId);
          if (!dispute) {
            coveredDisputeIds.add(disputeId);
            return true;
          }
          const keep = disputeMatchesWarDiplomaticLayers(
            dispute,
            showWarZones,
            showDiplomaticTension,
          );
          if (keep) coveredDisputeIds.add(disputeId);
          return keep;
        });
        paths.push(...filtered);
      }

      // 캐시 누락·구버전(이란 등) — 보이는 전쟁/외교 분쟁은 geometry로 보강
      const candidates = rankDisputesForDisplay(data.disputes ?? []).filter((d) => {
        if (coveredDisputeIds.has(d.id)) return false;
        if (
          !d.geometry ||
          !disputeMatchesWarDiplomaticLayers(d, showWarZones, showDiplomaticTension)
        ) {
          return false;
        }
        const box = disputeGeometryBbox(d.geometry);
        if (box) return isBboxNearView(box, layerViewState, radiusDeg);
        return isCenterInView(resolveDisputeCenter(d), layerViewState, radiusDeg);
      });
      for (const dispute of candidates.slice(0, maxZones)) {
        if (paths.length >= maxPaths) break;
        const built = getCachedDisputeHatchPaths(dispute, {
          preferDetailSegments: preferDetail,
        });
        if (!built.length) continue;
        paths.push(...built);
        if (paths.length >= maxPaths) {
          paths.length = maxPaths;
          break;
        }
      }
    }

    if (showConflictZones) {
      for (const zone of visibleConflictZones.slice(0, maxZones)) {
        if (zone.hatchPaths?.length) {
          paths.push(...zone.hatchPaths);
        } else {
          paths.push(...conflictZoneToOutlineAndHatchPaths(zone));
        }
      }
    }

    return paths;
  }, [
    data.disputes,
    disputeHatchCachePaths,
    disputeHatchLod,
    globeLod.tier,
    isEconomyViewer,
    layerViewState,
    showAnyDisputeOverlay,
    showConflictZones,
    showDiplomaticTension,
    showWarZones,
    visibleConflictZones,
  ]);

  const disputeByZonePath = useMemo(() => {
    const map = new Map<string, DisputeArea>();
    for (const dispute of data.disputes ?? []) {
      map.set(dispute.id, dispute);
    }
    return map;
  }, [data.disputes]);

  const conflictZoneByPath = useMemo(() => {
    const map = new Map<string, ConflictZoneFeature>();
    for (const zone of visibleConflictZones) {
      map.set(zone.id, zone);
    }
    return map;
  }, [visibleConflictZones]);

  const disputeFromPath = useCallback((path: TransportPath): DisputeArea | undefined => {
    if (path.kind === "conflict-hatch") return undefined;
    const match = path.id.match(/^dispute-(?:zone|hatch)-(.+)-\d+$/);
    if (!match) return undefined;
    return disputeByZonePath.get(match[1]);
  }, [disputeByZonePath]);

  function conflictZoneFromPath(path: TransportPath): ConflictZoneFeature | undefined {
    const hatchMatch = path.id.match(/^conflict-hatch-(?:combat|gray|high|medium|low)-(.+)-\d+$/);
    if (hatchMatch) return conflictZoneByPath.get(hatchMatch[1]);
    if (path.kind !== "dispute-zone") return undefined;
    const frameMatch = path.id.match(/^dispute-zone-(.+)-\d+$/);
    if (!frameMatch) return undefined;
    return conflictZoneByPath.get(frameMatch[1]);
  }

  /** 뷰포트에 잡힌 분쟁 구역 수(고유 id) — MultiPolygon 외곽 path 개수와 구분 */
  const disputeZoneOutlineCount = useMemo(() => {
    const ids = new Set<string>();
    for (const path of disputeZonePaths) {
      if (path.kind !== "dispute-zone") continue;
      const match = path.id.match(/^dispute-zone-(.+)-\d+$/);
      ids.add(match?.[1] ?? path.id);
    }
    return ids.size;
  }, [disputeZonePaths]);

  const armsEmbargoFramePaths = useMemo<TransportPath[]>(() => {
    if (!showArmsEmbargo) return [];
    const paths: TransportPath[] = [];
    for (const embargo of visibleArmsEmbargoZones) {
      // 실전투·폭격(빨강) 국가와 겹치면 보라 금수 테두리는 표시하지 않음
      // (이란이 보라로 보이는 원인: arms-embargo 레이어)
      const label = `${embargo.id} ${embargo.name} ${embargo.isoA3 || ""}`;
      if (/iran|\bIRN\b|emb-ir\b/i.test(label)) continue;

      const country = embargo.isoA3
        ? data.countries.find((item) => item.isoA3 === embargo.isoA3)
        : undefined;
      const geometry = embargo.geometry ?? country?.geometry ?? null;
      if (!geometry) continue;
      paths.push(...geometryToBorderPaths(embargo.id, embargo.name, geometry));
    }
    return paths;
  }, [data.countries, showArmsEmbargo, visibleArmsEmbargoZones]);

  const conflictClusterPoints = useMemo<ConflictClusterPoint[]>(
    () =>
      showConflictZones
        ? visibleConflictZones.map((zone) => ({
            ...zone,
            lat: zone.center.lat,
            lng: zone.center.lng,
            markerId: `conflict-cluster-${zone.id}`,
            displayKind: "conflict-cluster" as const,
          }))
        : [],
    [showConflictZones, visibleConflictZones],
  );

  return {
    countryPolygonData,
    overlayPolygonData,
    disputeZonePaths,
    disputeFromPath,
    conflictZoneFromPath,
    disputeZoneOutlineCount,
    armsEmbargoFramePaths,
    conflictClusterPoints,
  };
}
