"use client";

import { useMemo } from "react";
import type { ChinaTheaterDyad } from "@/data/chinaTheaterIncidentsSeed";
import type { ScoredEvent } from "@/data/eventTiers";
import type {
  ChinaTheaterIncidentHtmlMarker,
  EuropeDroneIncidentHtmlMarker,
  KoreaMissileIncidentHtmlMarker,
  RussiaStrikeIncidentHtmlMarker,
  ViewState,
} from "@/components/globe/types";
import { pickCesiumMissileLaunches } from "@/lib/cesiumMissileLaunches";
import {
  buildConflictEventClusters,
  clusterToMarker,
  filterClustersByTheaters,
  selectConflictEventMarkers,
  type ConflictEventHtmlMarker,
} from "@/lib/conflictEvents/buildLayer";
import { conflictEventsReplaceLegacy } from "@/lib/conflictEvents/flags";
import { CONFLICT_THEATER_ORDER, CONFLICT_THEATER_PREF_KEY } from "@/lib/conflictEvents/theaterMeta";
import type { ConflictTheater } from "@/lib/conflictEvents/types";
import type { CrossStraitSignalPayload } from "@/lib/crossStraitSignal";
import { provenanceFromActivation } from "@/lib/eventProvenance";
import type { GlobeLodTier } from "@/lib/globeLod";
import { candidatesFromNewsLike, gateConflictCluster } from "@/lib/intelContract";
import type { LayerPrefs } from "@/lib/layerPrefs";
import type { NewfeedsAttackPoint } from "@/lib/newfeeds";
import type { NewsStreamPayload } from "@/lib/news/types";
import {
  activateChinaTheaterIncidents,
  activateEuropeDroneIncidents,
  activateKoreaMissileIncidents,
  activateRussiaStrikeIncidents,
} from "@/lib/neonIncidentActivation";

export type UseIncidentMarkersOptions = {
  scoredEvents: ScoredEvent[];
  crossStraitSignal: CrossStraitSignalPayload | null;
  newsStreamPayload: NewsStreamPayload | null;
  newfeedsAttacks: NewfeedsAttackPoint[];
  intelDisconfirmCorpus: ReturnType<typeof candidatesFromNewsLike>;
  layerViewState: ViewState;
  globeLodTier: GlobeLodTier;
  isSatelliteViewer: boolean;
  layerPrefs: LayerPrefs;

  showChinaTaiwanIncidents: boolean;
  showChinaJapanIncidents: boolean;
  showChinaPhilippinesIncidents: boolean;
  showUsChinaIncidents: boolean;
  showNorthKoreaMissileTests: boolean;
  showUkraineStrikesOnRussia: boolean;
  showEuropeDroneIncidents: boolean;
  showConflictEvents: boolean;
  showConflictTheaterIran: boolean;
  showConflictTheaterKorea: boolean;
  showConflictTheaterLebanon: boolean;
  showConflictTheaterSyria: boolean;
  showConflictTheaterTaiwan: boolean;
  showConflictTheaterUkraine: boolean;
  showConflictTheaterKuril: boolean;
  showConflictTheaterBaltic: boolean;
  showConflictTheaterBlackSea: boolean;
  showConflictTheaterJapan: boolean;
  showConflictTheaterCaucasus: boolean;
  showConflictTheaterCentralAsia: boolean;
};

/**
 * 사건 마커 memo 묶음 (중국 theater · 북한 미사일 · 러시아 타격 · 유럽 드론 · conflict events) —
 * GlobeDashboard에서 추출 (분리 Phase D). useGlobeOverlayModel 상류 입력을 만든다.
 */
export function useIncidentMarkers(opts: UseIncidentMarkersOptions) {
  const {
    scoredEvents,
    crossStraitSignal,
    newsStreamPayload,
    newfeedsAttacks,
    intelDisconfirmCorpus,
    layerViewState,
    globeLodTier,
    isSatelliteViewer,
    layerPrefs,
    showChinaTaiwanIncidents,
    showChinaJapanIncidents,
    showChinaPhilippinesIncidents,
    showUsChinaIncidents,
    showNorthKoreaMissileTests,
    showUkraineStrikesOnRussia,
    showEuropeDroneIncidents,
    showConflictEvents,
    showConflictTheaterIran,
    showConflictTheaterKorea,
    showConflictTheaterLebanon,
    showConflictTheaterSyria,
    showConflictTheaterTaiwan,
    showConflictTheaterUkraine,
    showConflictTheaterKuril,
    showConflictTheaterBaltic,
    showConflictTheaterBlackSea,
    showConflictTheaterJapan,
    showConflictTheaterCaucasus,
    showConflictTheaterCentralAsia,
  } = opts;
  const globeLod = { tier: globeLodTier };

  const chinaTheaterIncidentMarkers = useMemo<ChinaTheaterIncidentHtmlMarker[]>(() => {
    if (conflictEventsReplaceLegacy()) return [];
    const enabled = new Set<ChinaTheaterDyad>();
    if (showChinaTaiwanIncidents) enabled.add("china-taiwan");
    if (showChinaJapanIncidents) enabled.add("china-japan");
    if (showChinaPhilippinesIncidents) enabled.add("china-philippines");
    if (showUsChinaIncidents) enabled.add("us-china");
    if (enabled.size === 0) return [];
    const staticItems = activateChinaTheaterIncidents(enabled, scoredEvents);
    const crossStraitItems = showChinaTaiwanIncidents
      ? (crossStraitSignal?.escalationIncidents ?? []).map((item) => ({
          ...item,
          provenance: provenanceFromActivation({
            id: item.id,
            hadSeedMatch: Boolean(item.sourceUrl),
            seedSourceUrl: item.sourceUrl ?? null,
            gdeltSourceUrl: null,
          }),
          gdeltSourceUrl: null,
        }))
      : [];
    return [...staticItems, ...crossStraitItems].map((item) => ({
        ...item,
        markerId: `china-incident-${item.id}`,
        displayKind: "china-theater-incident" as const,
      }));
  }, [
    crossStraitSignal?.escalationIncidents,
    scoredEvents,
    showChinaJapanIncidents,
    showChinaPhilippinesIncidents,
    showChinaTaiwanIncidents,
    showUsChinaIncidents,
  ]);

  const koreaMissileIncidentMarkers = useMemo<KoreaMissileIncidentHtmlMarker[]>(() => {
    if (!showNorthKoreaMissileTests) return [];
    // 역대 발사(hist) + 라이브 GDELT는 유지. legacy 교체 시 시설 앵커(seed-nk) 폴백만 제외.
    const items = activateKoreaMissileIncidents(scoredEvents).filter((item) =>
      conflictEventsReplaceLegacy() ? !item.id.startsWith("seed-nk-") : true,
    );
    return items.map((item) => ({
      ...item,
      markerId: `nk-missile-${item.id}`,
      displayKind: "korea-missile-incident" as const,
    }));
  }, [scoredEvents, showNorthKoreaMissileTests]);

  const cesiumMissileLaunches = useMemo(
    () =>
      isSatelliteViewer && showNorthKoreaMissileTests
        ? pickCesiumMissileLaunches(koreaMissileIncidentMarkers).map((m) => ({
            id: m.id,
            lat: m.lat,
            lng: m.lng,
            kind: m.kind,
            intensity: m.intensity,
            titleKo: m.titleKo,
            titleEn: m.titleEn,
          }))
        : [],
    [isSatelliteViewer, koreaMissileIncidentMarkers, showNorthKoreaMissileTests],
  );

  const russiaStrikeIncidentMarkers = useMemo<RussiaStrikeIncidentHtmlMarker[]>(() => {
    if (conflictEventsReplaceLegacy() || !showUkraineStrikesOnRussia) return [];
    return activateRussiaStrikeIncidents(scoredEvents).map((item) => ({
      ...item,
      markerId: `ua-strike-ru-${item.id}`,
      displayKind: "russia-strike-incident" as const,
    }));
  }, [scoredEvents, showUkraineStrikesOnRussia]);

  const europeDroneIncidentMarkers = useMemo<EuropeDroneIncidentHtmlMarker[]>(() => {
    if (!showEuropeDroneIncidents) return [];
    return activateEuropeDroneIncidents(scoredEvents).map((item) => ({
      ...item,
      markerId: `europe-drone-${item.id}`,
      displayKind: "europe-drone-incident" as const,
    }));
  }, [scoredEvents, showEuropeDroneIncidents]);

  const conflictEventTheaters = useMemo(() => {
    const enabled = new Set<ConflictTheater>();
    for (const theater of CONFLICT_THEATER_ORDER) {
      if (layerPrefs[CONFLICT_THEATER_PREF_KEY[theater]]) enabled.add(theater);
    }
    return enabled;
  }, [
    showConflictTheaterIran,
    showConflictTheaterKorea,
    showConflictTheaterLebanon,
    showConflictTheaterSyria,
    showConflictTheaterTaiwan,
    showConflictTheaterUkraine,
    showConflictTheaterKuril,
    showConflictTheaterBaltic,
    showConflictTheaterBlackSea,
    showConflictTheaterJapan,
    showConflictTheaterCaucasus,
    showConflictTheaterCentralAsia,
  ]);

  const conflictEventMarkers = useMemo<ConflictEventHtmlMarker[]>(() => {
    if (!showConflictEvents) return [];
    const newsItems = [
      ...(newsStreamPayload?.hero ? [newsStreamPayload.hero] : []),
      ...(newsStreamPayload?.verified ?? []),
      ...(newsStreamPayload?.stateMedia ?? []),
    ];
    const clusters = filterClustersByTheaters(
      buildConflictEventClusters({
        newsItems,
        gdeltEvents: scoredEvents,
        newfeedsAttacks,
      }),
      conflictEventTheaters,
    );
    const markers: ConflictEventHtmlMarker[] = [];
    for (const cluster of clusters) {
      const gate = gateConflictCluster(cluster, {
        disconfirmCorpus: intelDisconfirmCorpus,
        windowHours: 72,
      });
      if (gate.grade === "drop" || gate.grade === "hold") continue;
      markers.push({ ...clusterToMarker(cluster), displayGrade: gate.grade });
    }
    return selectConflictEventMarkers(markers, {
      view: layerViewState,
      lodTier: globeLod.tier,
    });
  }, [
    conflictEventTheaters,
    globeLod.tier,
    intelDisconfirmCorpus,
    layerViewState,
    newsStreamPayload?.hero,
    newsStreamPayload?.stateMedia,
    newsStreamPayload?.verified,
    newfeedsAttacks,
    scoredEvents,
    showConflictEvents,
  ]);

  return {
    chinaTheaterIncidentMarkers,
    koreaMissileIncidentMarkers,
    cesiumMissileLaunches,
    russiaStrikeIncidentMarkers,
    europeDroneIncidentMarkers,
    conflictEventMarkers,
  };
}
