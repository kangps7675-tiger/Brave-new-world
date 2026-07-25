"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import type {
  ArmsEmbargoZone,
  ConflictZoneFeature,
  DisputeOverview,
  MilitaryBaseArea,
  ResourceDepositArea,
  StaticPoint,
  TransportPath,
} from "@/data/geoTypes";
import { dataPath } from "@/lib/dataProfile";
import { expandStaticPoints } from "@/lib/compactData";
import type { GlobeLodTier } from "@/lib/globeLod";
import {
  bboxNearView as isBboxNearView,
  isCenterInView,
} from "@/lib/viewportCull";
import {
  GAS_PIPELINE_MAX_BY_TIER,
  MILITARY_BASE_AREA_MAX_BY_TIER,
  OIL_PIPELINE_MAX_BY_TIER,
  RESOURCE_DEPOSIT_MAX_BY_TIER,
  SHIPPING_LANE_MAX_BY_TIER,
  SUBMARINE_CABLE_MAX_BY_TIER,
  SUBSEA_PIPELINE_MAX_BY_TIER,
} from "@/lib/staticLayerLod";
import { filterStaticPointsForView } from "@/lib/staticGlobe";
import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import { criticalNodesAsStaticPoints } from "@/data/criticalNodes";
import {
  GEM_RESOURCE_LAYERS,
  type GemResourceLayerId,
  type GemResourcePrefKey,
} from "@/lib/gemResourceCatalog";
import type { ViewportPointLayer } from "@/lib/serverViewportPoints";

const CRITICAL_NODE_STATIC_POINTS = criticalNodesAsStaticPoints();

type GemShowFlags = Partial<Record<GemResourcePrefKey, boolean>>;

type ViewState = { lat: number; lng: number; altitude: number };

type ApiPointsPayload = {
  enabled?: boolean;
  points?: unknown[];
  zones?: unknown[];
};

function pathNearView(path: TransportPath, view: ViewState, radiusDeg: number) {
  // global tier radiusDeg=0 → 전역 허용 (서버 bboxNearView와 동일)
  if (radiusDeg <= 0) return true;
  return isBboxNearView(path.bbox, view, radiusDeg);
}

function centerNearView(
  center: { lat: number; lng: number },
  view: ViewState,
  radiusDeg: number,
) {
  return isCenterInView(center, view, radiusDeg);
}

function filterPaths(
  paths: TransportPath[],
  view: ViewState,
  radiusDeg: number,
  maxCount: number,
) {
  if (maxCount <= 0) return [];
  const visible: TransportPath[] = [];
  for (const path of paths) {
    if (radiusDeg > 0 && !pathNearView(path, view, radiusDeg)) continue;
    visible.push(path);
    if (visible.length >= maxCount) break;
  }
  return visible;
}

function filterMilitaryBaseAreas(
  areas: MilitaryBaseArea[],
  view: ViewState,
  tier: GlobeLodTier,
  radiusDeg: number,
) {
  const maxCount = MILITARY_BASE_AREA_MAX_BY_TIER[tier];
  if (maxCount <= 0) return [];
  // 전역/대륙: 미국 본토·괌이 한 화면에 들어오도록 반경을 넓게
  const effectiveRadius =
    tier === "global" ? 0 : tier === "continent" ? Math.max(radiusDeg, 55) : radiusDeg;
  const visible: MilitaryBaseArea[] = [];
  for (const area of areas) {
    if (effectiveRadius > 0 && !centerNearView(area.center, view, effectiveRadius)) continue;
    visible.push(area);
    if (visible.length >= maxCount) break;
  }
  return visible;
}

function filterResourceDeposits(
  areas: ResourceDepositArea[],
  view: ViewState,
  tier: GlobeLodTier,
  radiusDeg: number,
) {
  const maxCount = RESOURCE_DEPOSIT_MAX_BY_TIER[tier];
  if (maxCount <= 0) return [];
  const effectiveRadius =
    tier === "global" ? 0 : tier === "continent" ? Math.max(radiusDeg, 40) : radiusDeg;
  const ranked = [...areas].sort((a, b) => (a.tier ?? 9) - (b.tier ?? 9));
  const visible: ResourceDepositArea[] = [];
  for (const area of ranked) {
    if (effectiveRadius > 0 && !centerNearView(area.center, view, effectiveRadius + 2)) continue;
    visible.push(area);
    if (visible.length >= maxCount) break;
  }
  return visible;
}

async function fetchApiJson(apiPath: string): Promise<ApiPointsPayload> {
  const response = await fetch(apiPath, { cache: "no-store" });
  if (!response.ok) throw new Error(`${apiPath}: ${response.status}`);
  return response.json();
}

function expandPointsFromJson(raw: unknown[]) {
  return expandStaticPoints(raw as Parameters<typeof expandStaticPoints>[0]);
}

function expandZonesFromJson<T extends { id: string; center: { lat: number; lng: number } }>(
  raw: unknown[],
): T[] {
  return (raw as T[]).filter(
    (item) =>
      item &&
      typeof item.id === "string" &&
      item.center &&
      Number.isFinite(item.center.lat) &&
      Number.isFinite(item.center.lng),
  );
}

export function useGlobeStaticLayers(options: {
  viewState: ViewState;
  globeTier: GlobeLodTier;
  radiusDeg: number;
  showDisputeBoundaries: boolean;
  showShippingLanes: boolean;
  showSubmarineCables: boolean;
  showSubmarineTunnels?: boolean;
  showOilPipelines: boolean;
  showGasPipelines: boolean;
  showLngTerminals: boolean;
  showSubseaPipelines?: boolean;
  gemShow?: GemShowFlags;
  showAirports: boolean;
  showPorts: boolean;
  showLogisticsRisk?: boolean;
  showCriticalNodes?: boolean;
  showMilitaryBases: boolean;
  showResources: boolean;
  showCableLandings: boolean;
  showNuclearSites?: boolean;
  showInternetExchanges?: boolean;
  showRefugeeCamps?: boolean;
  showUcdpEvents?: boolean;
  showAiDataCenters?: boolean;
  showEconomicCenters?: boolean;
  showSanctionsEntities?: boolean;
  showSpaceLaunches?: boolean;
  showIntelHotspots?: boolean;
  showConflictZones?: boolean;
  showArmsEmbargo?: boolean;
  /** Bump after live sync so cached layers re-fetch from disk/API. */
  reloadToken?: number;
}) {
  const [disputeBoundaryPaths, setDisputeBoundaryPaths] = useState<TransportPath[]>([]);
  const [shippingPaths, setShippingPaths] = useState<TransportPath[]>([]);
  const [cablePaths, setCablePaths] = useState<TransportPath[]>([]);
  const [oilPipelinePaths, setOilPipelinePaths] = useState<TransportPath[]>([]);
  const [gasPipelinePaths, setGasPipelinePaths] = useState<TransportPath[]>([]);
  const [subseaPipelinePaths, setSubseaPipelinePaths] = useState<TransportPath[]>([]);
  const [osmPipelinePaths, setOsmPipelinePaths] = useState<TransportPath[]>([]);
  const [lngTerminals, setLngTerminals] = useState<StaticPoint[]>([]);
  const [gemPointsByLayer, setGemPointsByLayer] = useState<
    Partial<Record<GemResourceLayerId, StaticPoint[]>>
  >({});
  const [airports, setAirports] = useState<StaticPoint[]>([]);
  const [ports, setPorts] = useState<StaticPoint[]>([]);
  const [militaryBases, setMilitaryBases] = useState<StaticPoint[]>([]);
  const [militaryBaseAreas, setMilitaryBaseAreas] = useState<MilitaryBaseArea[]>([]);
  const [resourceDeposits, setResourceDeposits] = useState<ResourceDepositArea[]>([]);
  const [resources, setResources] = useState<StaticPoint[]>([]);
  const [cableLandings, setCableLandings] = useState<StaticPoint[]>([]);
  const [nuclearSites, setNuclearSites] = useState<StaticPoint[]>([]);
  const [internetExchanges, setInternetExchanges] = useState<StaticPoint[]>([]);
  const [refugeeCamps, setRefugeeCamps] = useState<StaticPoint[]>([]);
  const [ucdpEvents, setUcdpEvents] = useState<StaticPoint[]>([]);
  const [aiDataCenters, setAiDataCenters] = useState<StaticPoint[]>([]);
  const [economicCenters, setEconomicCenters] = useState<StaticPoint[]>([]);
  const [sanctionsEntities, setSanctionsEntities] = useState<StaticPoint[]>([]);
  const [spaceLaunches, setSpaceLaunches] = useState<StaticPoint[]>([]);
  const [intelHotspots, setIntelHotspots] = useState<StaticPoint[]>([]);
  const [submarineTunnels, setSubmarineTunnels] = useState<StaticPoint[]>([]);
  const [conflictZones, setConflictZones] = useState<ConflictZoneFeature[]>([]);
  const [armsEmbargoZones, setArmsEmbargoZones] = useState<ArmsEmbargoZone[]>([]);
  const [disputeOverviews, setDisputeOverviews] = useState<Map<string, DisputeOverview>>(new Map());

  const loadedRef = useRef<Record<string, boolean>>({});
  const reloadToken = options.reloadToken ?? 0;

  useEffect(() => {
    if (reloadToken <= 0) return;
    loadedRef.current = {};
  }, [reloadToken]);

  const fetchViewportLayer = useCallback(
    async (layer: string, setter: (value: TransportPath[]) => void) => {
      try {
        const params = new URLSearchParams({
          layer,
          lat: String(Math.round(options.viewState.lat * 10) / 10),
          lng: String(Math.round(options.viewState.lng * 10) / 10),
          radius: String(options.radiusDeg),
          tier: options.globeTier,
        });
        const response = await fetch(`/api/layers/viewport-paths?${params}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { paths?: TransportPath[] };
        const paths = Array.isArray(payload.paths) ? payload.paths : [];
        // 체크 직후 대용량 경로 주입이 메인 스레드를 막지 않도록 transition
        startTransition(() => setter(paths));
      } catch {
        // optional
      }
    },
    [options.globeTier, options.radiusDeg, options.viewState.lat, options.viewState.lng],
  );

  const fetchViewportPoints = useCallback(
    async (layer: string, setter: (value: StaticPoint[]) => void) => {
      try {
        const params = new URLSearchParams({
          layer,
          lat: String(Math.round(options.viewState.lat * 10) / 10),
          lng: String(Math.round(options.viewState.lng * 10) / 10),
          radius: String(options.radiusDeg),
          tier: options.globeTier,
        });
        const response = await fetch(`/api/layers/viewport-points?${params}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { points?: StaticPoint[] };
        const points = Array.isArray(payload.points) ? payload.points : [];
        startTransition(() => setter(points));
      } catch {
        // optional
      }
    },
    [options.globeTier, options.radiusDeg, options.viewState.lat, options.viewState.lng],
  );

  const fetchViewportBaseAreas = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        layer: "military-base-areas",
        lat: String(Math.round(options.viewState.lat * 10) / 10),
        lng: String(Math.round(options.viewState.lng * 10) / 10),
        radius: String(options.radiusDeg),
        tier: options.globeTier,
      });
      const response = await fetch(`/api/layers/viewport-points?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { areas?: MilitaryBaseArea[] };
      setMilitaryBaseAreas(Array.isArray(payload.areas) ? payload.areas : []);
    } catch {
      // optional
    }
  }, [options.globeTier, options.radiusDeg, options.viewState.lat, options.viewState.lng]);


  const loadOnceApiPoints = useCallback(
    async (
      key: string,
      apiPath: string,
      setter: (value: StaticPoint[]) => void,
      options?: { requireEnabled?: boolean },
    ) => {
      if (loadedRef.current[key]) return;
      try {
        const payload = await fetchApiJson(apiPath);
        if (options?.requireEnabled && payload.enabled === false) {
          setter([]);
          loadedRef.current[key] = true;
          return;
        }
        const raw = Array.isArray(payload.points) ? payload.points : [];
        if (options?.requireEnabled && raw.length === 0) {
          setter([]);
          loadedRef.current[key] = true;
          return;
        }
        setter(expandPointsFromJson(raw));
        loadedRef.current[key] = true;
      } catch {
        // optional layer
      }
    },
    [],
  );

  const loadOnceApiZones = useCallback(
    async <T extends { id: string; center: { lat: number; lng: number } }>(
      key: string,
      apiPath: string,
      setter: (value: T[]) => void,
    ) => {
      if (loadedRef.current[key]) return;
      try {
        const payload = await fetchApiJson(apiPath);
        const raw = Array.isArray(payload.zones) ? payload.zones : [];
        setter(expandZonesFromJson<T>(raw));
        loadedRef.current[key] = true;
      } catch {
        // optional layer
      }
    },
    [],
  );

  useEffect(() => {
    if (!options.showDisputeBoundaries) {
      setDisputeBoundaryPaths([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportLayer("dispute-boundaries", setDisputeBoundaryPaths);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportLayer,
    options.showDisputeBoundaries,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showShippingLanes) {
      setShippingPaths([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportLayer("shipping-lanes", setShippingPaths);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportLayer,
    options.showShippingLanes,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showSubmarineCables) {
      setCablePaths([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportLayer("submarine-cables", setCablePaths);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportLayer,
    options.showSubmarineCables,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  /** 해저터널 — 토글 ON 시 D1 클라우드 로그 1회 fetch */
  useEffect(() => {
    if (!options.showSubmarineTunnels) {
      setSubmarineTunnels([]);
      loadedRef.current["submarine-tunnels"] = false;
      return;
    }
    if (loadedRef.current["submarine-tunnels"]) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/submarine-tunnels", { cache: "no-store" });
        const payload = (await response.json()) as { tunnels?: StaticPoint[] };
        if (cancelled) return;
        setSubmarineTunnels(Array.isArray(payload.tunnels) ? payload.tunnels : []);
        loadedRef.current["submarine-tunnels"] = true;
      } catch {
        if (!cancelled) setSubmarineTunnels([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [options.showSubmarineTunnels, reloadToken]);

  useEffect(() => {
    if (!options.showOilPipelines) {
      setOilPipelinePaths([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportLayer("oil-pipelines", setOilPipelinePaths);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportLayer,
    options.showOilPipelines,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showGasPipelines) {
      setGasPipelinePaths([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportLayer("gas-pipelines", setGasPipelinePaths);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportLayer,
    options.showGasPipelines,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showSubseaPipelines) {
      setSubseaPipelinePaths([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportLayer("subsea-pipelines", setSubseaPipelinePaths);
    }, 340);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportLayer,
    options.showSubseaPipelines,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  /** OSM Overpass — regional+ 에서 GEM oil/gas/subsea 보강 */
  useEffect(() => {
    const wantDetail =
      (options.showOilPipelines ||
        options.showGasPipelines ||
        options.showSubseaPipelines) &&
      (options.globeTier === "regional" ||
        options.globeTier === "near" ||
        options.globeTier === "village");
    if (!wantDetail) {
      setOsmPipelinePaths([]);
      return;
    }
    const lat = options.viewState.lat;
    const lng = options.viewState.lng;
    const half = Math.min(12, Math.max(3, options.radiusDeg || 6));
    const south = lat - half;
    const north = lat + half;
    const west = lng - half;
    const east = lng + half;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const qs = new URLSearchParams({
            south: String(south),
            west: String(west),
            north: String(north),
            east: String(east),
          });
          const res = await fetch(`/api/pipelines-osm?${qs}`, { cache: "default" });
          if (!res.ok) throw new Error(`pipelines-osm ${res.status}`);
          const payload = (await res.json()) as { paths?: TransportPath[] };
          if (cancelled) return;
          setOsmPipelinePaths(Array.isArray(payload.paths) ? payload.paths : []);
        } catch {
          if (!cancelled) setOsmPipelinePaths([]);
        }
      })();
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    options.globeTier,
    options.radiusDeg,
    options.showGasPipelines,
    options.showOilPipelines,
    options.showSubseaPipelines,
    options.viewState.lat,
    options.viewState.lng,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showLngTerminals) {
      setLngTerminals([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("lng-terminals", setLngTerminals);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showLngTerminals,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    const gemShow = options.gemShow ?? {};
    const timers: number[] = [];

    for (const layer of GEM_RESOURCE_LAYERS) {
      const enabled = Boolean(gemShow[layer.prefKey]);
      if (!enabled) {
        setGemPointsByLayer((prev) => {
          if (!prev[layer.id]?.length) return prev;
          const next = { ...prev };
          delete next[layer.id];
          return next;
        });
        continue;
      }
      const timer = window.setTimeout(() => {
        void fetchViewportPoints(layer.id as ViewportPointLayer, (points) => {
          setGemPointsByLayer((prev) => ({ ...prev, [layer.id]: points }));
        });
      }, 320);
      timers.push(timer);
    }

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [
    fetchViewportPoints,
    options.gemShow,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showAirports) {
      setAirports([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("airports", setAirports);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showAirports,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showPorts) {
      setPorts([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("ports", setPorts);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showPorts,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showMilitaryBases) {
      setMilitaryBases([]);
      setMilitaryBaseAreas([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("military-bases", setMilitaryBases);
      void fetchViewportBaseAreas();
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportBaseAreas,
    fetchViewportPoints,
    options.showMilitaryBases,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showResources) {
      setResources([]);
      setResourceDeposits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("resources", setResources);
      void (async () => {
        try {
          const response = await fetch(dataPath("resource-deposits.json"), { cache: "force-cache" });
          if (!response.ok) return;
          const raw = (await response.json()) as unknown;
          const list = Array.isArray(raw) ? raw : [];
          const deposits = list.filter(
            (item): item is ResourceDepositArea =>
              Boolean(
                item &&
                  typeof item === "object" &&
                  typeof (item as ResourceDepositArea).id === "string" &&
                  (item as ResourceDepositArea).geometry &&
                  (item as ResourceDepositArea).center,
              ),
          );
          setResourceDeposits(deposits);
        } catch {
          setResourceDeposits([]);
        }
      })();
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showResources,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showCableLandings) {
      setCableLandings([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("cable-landings", setCableLandings);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showCableLandings,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showNuclearSites) {
      setNuclearSites([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("nuclear-sites", setNuclearSites);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showNuclearSites,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showInternetExchanges) {
      setInternetExchanges([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("internet-exchanges", setInternetExchanges);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showInternetExchanges,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showRefugeeCamps) {
      setRefugeeCamps([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("refugee-camps", setRefugeeCamps);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showRefugeeCamps,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (!options.showUcdpEvents) {
      setUcdpEvents([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchViewportPoints("ucdp-events", setUcdpEvents);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    fetchViewportPoints,
    options.showUcdpEvents,
    options.viewState.lat,
    options.viewState.lng,
    options.globeTier,
    options.radiusDeg,
    reloadToken,
  ]);

  useEffect(() => {
    if (options.showAiDataCenters) {
      loadOnceApiPoints("aiDataCenters", "/api/layers/ai-data-centers", setAiDataCenters);
    }
  }, [loadOnceApiPoints, options.showAiDataCenters, reloadToken]);

  useEffect(() => {
    if (options.showEconomicCenters) {
      loadOnceApiPoints("economicCenters", "/api/layers/economic-centers", setEconomicCenters);
    }
  }, [loadOnceApiPoints, options.showEconomicCenters, reloadToken]);

  useEffect(() => {
    if (options.showSanctionsEntities) {
      loadOnceApiPoints("sanctionsEntities", "/api/layers/sanctions-entities", setSanctionsEntities);
    }
  }, [loadOnceApiPoints, options.showSanctionsEntities, reloadToken]);

  useEffect(() => {
    if (options.showSpaceLaunches) {
      loadOnceApiPoints("spaceLaunches", "/api/space-launches", setSpaceLaunches);
    }
  }, [loadOnceApiPoints, options.showSpaceLaunches, reloadToken]);

  useEffect(() => {
    if (options.showIntelHotspots) {
      loadOnceApiPoints("intelHotspots", "/api/intel-hotspots", setIntelHotspots, {
        requireEnabled: true,
      });
    }
  }, [loadOnceApiPoints, options.showIntelHotspots, reloadToken]);

  useEffect(() => {
    if (options.showConflictZones) {
      loadOnceApiZones<ConflictZoneFeature>(
        "conflictZones",
        "/api/layers/conflict-zones",
        setConflictZones,
      );
    }
  }, [loadOnceApiZones, options.showConflictZones, reloadToken]);

  useEffect(() => {
    if (options.showArmsEmbargo) {
      loadOnceApiZones<ArmsEmbargoZone>(
        "armsEmbargoZones",
        "/api/layers/arms-embargo-zones",
        setArmsEmbargoZones,
      );
    }
  }, [loadOnceApiZones, options.showArmsEmbargo, reloadToken]);

  useEffect(() => {
    if (!options.showDisputeBoundaries) return;
    let mounted = true;
    fetch(dataPath("dispute-overviews.json"))
      .then(async (res) => (res.ok ? res.json() : null))
      .then((payload: { items?: DisputeOverview[] } | null) => {
        if (!mounted || !payload?.items) return;
        setDisputeOverviews(new Map(payload.items.map((item) => [item.id, item])));
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [options.showDisputeBoundaries, reloadToken]);

  const visibleDisputeBoundariesFiltered = useMemo(() => {
    if (!options.showDisputeBoundaries) return [];
    const maxByTier: Record<GlobeLodTier, number> = {
      global: 40,
      continent: 80,
      regional: 140,
      near: 220,
      village: 320,
    };
    const max = maxByTier[options.globeTier];
    return filterPaths(
      disputeBoundaryPaths,
      options.viewState,
      options.radiusDeg,
      max,
    );
  }, [
    disputeBoundaryPaths,
    options.globeTier,
    options.radiusDeg,
    options.showDisputeBoundaries,
    options.viewState,
  ]);

  const visibleShipping = useMemo(() => {
    if (!options.showShippingLanes) return [];
    const max = SHIPPING_LANE_MAX_BY_TIER[options.globeTier];
    // viewport-paths API가 이미 컷 — 클라 재필터는 이동 중 stale 응답을 전부 버릴 수 있음
    return shippingPaths.slice(0, max);
  }, [
    options.globeTier,
    options.showShippingLanes,
    shippingPaths,
  ]);

  const visibleCables = useMemo(() => {
    if (!options.showSubmarineCables) return [];
    const max = SUBMARINE_CABLE_MAX_BY_TIER[options.globeTier];
    return cablePaths.slice(0, max);
  }, [
    cablePaths,
    options.globeTier,
    options.showSubmarineCables,
  ]);

  const withPipelineAlt = useCallback((paths: TransportPath[], alt = 0.012): TransportPath[] => {
    return paths.map((path) => ({
      ...path,
      points: path.points.map((pt) => (pt.alt != null ? pt : { ...pt, alt })),
    }));
  }, []);

  const visibleOilPipelines = useMemo(() => {
    if (!options.showOilPipelines) return [];
    const max = OIL_PIPELINE_MAX_BY_TIER[options.globeTier];
    const osmOil = osmPipelinePaths.filter((p) => p.kind === "oil-pipeline");
    const gem = oilPipelinePaths.slice(0, max);
    const seen = new Set(gem.map((p) => p.id));
    const extra = osmOil.filter((p) => !seen.has(p.id)).slice(0, 40);
    return withPipelineAlt([...gem, ...extra]);
  }, [
    oilPipelinePaths,
    options.globeTier,
    options.showOilPipelines,
    osmPipelinePaths,
    withPipelineAlt,
  ]);

  const visibleGasPipelines = useMemo(() => {
    if (!options.showGasPipelines) return [];
    const max = GAS_PIPELINE_MAX_BY_TIER[options.globeTier];
    const osmGas = osmPipelinePaths.filter((p) => p.kind === "gas-pipeline");
    const gem = gasPipelinePaths.slice(0, max);
    const seen = new Set(gem.map((p) => p.id));
    const extra = osmGas.filter((p) => !seen.has(p.id)).slice(0, 40);
    return withPipelineAlt([...gem, ...extra]);
  }, [
    gasPipelinePaths,
    options.globeTier,
    options.showGasPipelines,
    osmPipelinePaths,
    withPipelineAlt,
  ]);

  const visibleSubseaPipelines = useMemo(() => {
    if (!options.showSubseaPipelines) return [];
    const max = SUBSEA_PIPELINE_MAX_BY_TIER[options.globeTier];
    const base = subseaPipelinePaths.slice(0, max);
    const seen = new Set(base.map((p) => p.id));
    const osmSubsea = osmPipelinePaths
      .filter((p) => p.kind === "subsea-pipeline" && !seen.has(p.id))
      .slice(0, 40);
    return withPipelineAlt([...base, ...osmSubsea], 0.01);
  }, [
    options.globeTier,
    options.showSubseaPipelines,
    subseaPipelinePaths,
    osmPipelinePaths,
    withPipelineAlt,
  ]);

  const visibleStaticPoints = useMemo(() => {
    const merged: StaticPoint[] = [];
    if (options.showAirports) merged.push(...airports);
    if (options.showPorts) merged.push(...ports);
    if (options.showMilitaryBases) merged.push(...militaryBases);
    if (options.showResources) {
      const covered = new Set(
        resourceDeposits.map((d) => d.linkedPointId).filter((id): id is string => Boolean(id)),
      );
      merged.push(...resources.filter((p) => !covered.has(p.id)));
    }
    if (options.showCableLandings) merged.push(...cableLandings);
    if (options.showNuclearSites) merged.push(...nuclearSites);
    if (options.showInternetExchanges) merged.push(...internetExchanges);
    if (options.showRefugeeCamps) merged.push(...refugeeCamps);
    if (options.showUcdpEvents) merged.push(...ucdpEvents);
    if (options.showAiDataCenters) merged.push(...aiDataCenters);
    if (options.showEconomicCenters) merged.push(...economicCenters);
    if (options.showSanctionsEntities) merged.push(...sanctionsEntities);
    if (options.showSpaceLaunches) merged.push(...spaceLaunches);
    if (options.showIntelHotspots) merged.push(...intelHotspots);
    if (options.showLngTerminals) merged.push(...lngTerminals);
    for (const layer of GEM_RESOURCE_LAYERS) {
      if (options.gemShow?.[layer.prefKey]) {
        const pts = gemPointsByLayer[layer.id];
        if (pts?.length) merged.push(...pts);
      }
    }
    if (options.showLogisticsRisk) merged.push(...LOGISTICS_RISK_POINTS);
    if (options.showCriticalNodes) merged.push(...CRITICAL_NODE_STATIC_POINTS);
    if (options.showSubmarineTunnels) merged.push(...submarineTunnels);
    return filterStaticPointsForView(
      merged,
      options.viewState,
      options.globeTier,
      options.radiusDeg,
    );
  }, [
    airports,
    aiDataCenters,
    cableLandings,
    economicCenters,
    gemPointsByLayer,
    intelHotspots,
    internetExchanges,
    lngTerminals,
    militaryBases,
    nuclearSites,
    options.gemShow,
    options.globeTier,
    options.radiusDeg,
    options.showAiDataCenters,
    options.showAirports,
    options.showCableLandings,
    options.showEconomicCenters,
    options.showIntelHotspots,
    options.showInternetExchanges,
    options.showLngTerminals,
    options.showLogisticsRisk,
    options.showCriticalNodes,
    options.showMilitaryBases,
    options.showNuclearSites,
    options.showPorts,
    options.showRefugeeCamps,
    options.showResources,
    options.showSanctionsEntities,
    options.showSpaceLaunches,
    options.showSubmarineTunnels,
    options.showUcdpEvents,
    options.viewState,
    ports,
    refugeeCamps,
    resourceDeposits,
    resources,
    sanctionsEntities,
    spaceLaunches,
    submarineTunnels,
    ucdpEvents,
  ]);

  const visibleMilitaryBaseAreas = useMemo(() => {
    if (!options.showMilitaryBases) return [];
    return filterMilitaryBaseAreas(
      militaryBaseAreas,
      options.viewState,
      options.globeTier,
      options.radiusDeg,
    );
  }, [
    militaryBaseAreas,
    options.globeTier,
    options.radiusDeg,
    options.showMilitaryBases,
    options.viewState,
  ]);

  const visibleResourceDeposits = useMemo(() => {
    if (!options.showResources) return [];
    return filterResourceDeposits(
      resourceDeposits,
      options.viewState,
      options.globeTier,
      options.radiusDeg,
    );
  }, [
    options.globeTier,
    options.radiusDeg,
    options.showResources,
    options.viewState,
    resourceDeposits,
  ]);

  const visibleConflictZones = useMemo(() => {
    if (!options.showConflictZones) return [];
    // 줌 단계별로 상위 클러스터만 — 전역에서 수십 개 붉은 면이 겹치지 않게
    const maxByTier: Record<GlobeLodTier, number> = {
      global: 8,
      continent: 12,
      regional: 16,
      near: 20,
      village: 24,
    };
    const max = maxByTier[options.globeTier];
    const ranked = [...conflictZones].sort((a, b) => b.eventCount - a.eventCount);
    if (options.radiusDeg <= 0) return ranked.slice(0, max);

    return ranked
      .filter((zone) => {
        const latDist = Math.abs(options.viewState.lat - zone.center.lat);
        const lngRaw = Math.abs(options.viewState.lng - zone.center.lng);
        const lngDist = Math.min(lngRaw, 360 - lngRaw);
        return Math.sqrt(latDist ** 2 + lngDist ** 2) <= options.radiusDeg + 4;
      })
      .slice(0, max);
  }, [conflictZones, options.globeTier, options.radiusDeg, options.showConflictZones, options.viewState]);

  const visibleArmsEmbargoZones = useMemo(() => {
    if (!options.showArmsEmbargo) return [];
    const maxByTier: Record<GlobeLodTier, number> = {
      global: 6,
      continent: 10,
      regional: 16,
      near: 24,
      village: 32,
    };
    const max = maxByTier[options.globeTier];
    if (options.radiusDeg <= 0) return armsEmbargoZones.slice(0, max);
    return armsEmbargoZones
      .filter((zone) => isCenterInView(zone.center, options.viewState, options.radiusDeg + 6))
      .slice(0, max);
  }, [
    armsEmbargoZones,
    options.globeTier,
    options.radiusDeg,
    options.showArmsEmbargo,
    options.viewState,
  ]);

  return {
    visibleDisputeBoundaries: visibleDisputeBoundariesFiltered,
    visibleShipping,
    visibleCables,
    visibleOilPipelines,
    visibleGasPipelines,
    visibleSubseaPipelines,
    visibleStaticPoints,
    visibleMilitaryBaseAreas,
    visibleResourceDeposits,
    visibleConflictZones,
    visibleArmsEmbargoZones,
    disputeOverviews,
    counts: {
      disputeBoundaries: disputeBoundaryPaths.length,
      shipping: shippingPaths.length,
      cables: cablePaths.length,
      oilPipelines: oilPipelinePaths.length,
      gasPipelines: gasPipelinePaths.length,
      subseaPipelines: subseaPipelinePaths.length,
      lngTerminals: lngTerminals.length,
      gemResources: Object.fromEntries(
        GEM_RESOURCE_LAYERS.map((l) => [l.id, gemPointsByLayer[l.id]?.length ?? 0]),
      ) as Record<string, number>,
      airports: airports.length,
      ports: ports.length,
      militaryBases: militaryBases.length,
      militaryBaseAreas: militaryBaseAreas.length,
      resources: resources.length,
      resourceDeposits: resourceDeposits.length,
      cableLandings: cableLandings.length,
      nuclearSites: nuclearSites.length,
      internetExchanges: internetExchanges.length,
      refugeeCamps: refugeeCamps.length,
      ucdpEvents: ucdpEvents.length,
      aiDataCenters: aiDataCenters.length,
      economicCenters: economicCenters.length,
      sanctionsEntities: sanctionsEntities.length,
      spaceLaunches: spaceLaunches.length,
      intelHotspots: intelHotspots.length,
      logisticsRisk: LOGISTICS_RISK_POINTS.length,
      criticalNodes: CRITICAL_NODE_STATIC_POINTS.length,
      conflictZones: conflictZones.length,
      armsEmbargoZones: armsEmbargoZones.length,
    },
  };
}
