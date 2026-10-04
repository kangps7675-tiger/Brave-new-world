"use client";

import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction, type MutableRefObject } from "react";
import { buildExerciseBriefingContent, type ExerciseBriefingContent } from "@/components/ExerciseBriefingParchment";
import type { Selection } from "@/components/globe/types";
import type { ScoredEvent } from "@/data/eventTiers";
import type { AisVessel } from "@/data/geoTypes";
import { LOGISTICS_RISK_POINTS, chokeGlowRingSeed } from "@/data/logisticsRiskPoints";
import { useObserveStraitStaticDensity } from "@/hooks/useObserveStraitStaticDensity";
import { useObserveStraitTour } from "@/hooks/useObserveStraitTour";
import type { AssetVolatilityHint } from "@/lib/assetVolatilityHint";
import { buildCesiumAlerts, type CesiumAlertItem } from "@/lib/cesiumAlerts";
import { buildTransitBadgeLabels, buildBundleCalloutLabels, buildPortLabels } from "@/lib/cesiumStraitCallouts";
import { buildStraitGateSegments } from "@/lib/cesiumStraitOverlays";
import { chokeStressHex } from "@/lib/chokeStressColor";
import { buildChokepointStressBriefing, type ChokepointStressBriefing } from "@/lib/chokepointStressBriefing";
import { stressForChokepoint, type ChokepointAisObservation } from "@/lib/chokepointStressForUi";
import { buildConflictEventClusters } from "@/lib/conflictEvents/buildLayer";
import { CINEMATIC_FLY, resolveCinematicCamera } from "@/lib/globeCamera";
import { buildObserveWatchboard, type WatchboardItem, watchboardItemToDeskFocus, gradeLabelFriendly, gateEscalation, canPublish, gateChokepointStress, type DeskFocus, type DisplayGrade } from "@/lib/intelContract";
import { isPromotion } from "@/lib/intelContract/deskDynamics";
import type { DisconfirmCandidate } from "@/lib/intelContract/disconfirmPass";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import { withMaritimeFlashTitle } from "@/lib/maritimeFlash";
import type { MilitaryExercise } from "@/lib/militaryExercises";
import type { NavareaFeaturePoint } from "@/lib/navareaHatch";
import type { NewfeedsAttackPoint } from "@/lib/newfeeds";
import type { NewsStreamPayload } from "@/lib/news/types";
import type { ChokeTransitStress } from "@/lib/portWatch";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";

import type { EscalationOffer } from "@/components/globe/hooks/useEscalationSignals";

export type UseObserveAlertModelOptions = {
  isSatelliteViewer: boolean;
  isPhoneUi: boolean;
  setSelected: Dispatch<SetStateAction<Selection | null>>;
  newsStreamPayload: NewsStreamPayload | null;
  deskFocus: DeskFocus | null;
  setDeskFocus: Dispatch<SetStateAction<DeskFocus | null>>;
  setPromotingItemId: Dispatch<SetStateAction<string | null>>;
  watchGradePrevRef: MutableRefObject<Map<string, DisplayGrade>>;
  newfeedsAttacks: NewfeedsAttackPoint[];
  ukmtoIncidents: UkmtoIncidentPoint[];
  navareaFeatures: NavareaFeaturePoint[];
  setExerciseBriefing: Dispatch<SetStateAction<ExerciseBriefingContent | null>>;
  chokepointStressBriefing: ChokepointStressBriefing | null;
  setChokepointStressBriefing: Dispatch<SetStateAction<ChokepointStressBriefing | null>>;
  disguisedVessels: AisVessel[];
  liveuaEvents: LiveuamapEvent[];
  observeEntryHadTarget: boolean;
  labelLanguage: LabelLanguage;
  intelDisconfirmCorpus: DisconfirmCandidate[];
  flyTo: (lat: number, lng: number, altitude?: number | undefined, durationMs?: number | undefined, camera?: { pitch?: number | undefined; bearing?: number | undefined; } | undefined) => void;
  INCIDENT_ENTRY_ALT: 0.85;
  cesiumReady: boolean;
  unifiedFlyTo: (lat: number, lng: number, altitude?: number | undefined, durationMs?: number | undefined, camera?: { pitch?: number | undefined; bearing?: number | undefined; } | undefined) => void;
  switchToObserveAndFly: (lat: number, lng: number, opts: { altitude?: number | undefined; durationMs?: number | undefined; camera?: { pitch?: number | undefined; bearing?: number | undefined; } | undefined; subtitle: string; title: string; kicker?: string | undefined; selection?: Selection | undefined; }) => void;
  displayMilitaryExercises: MilitaryExercise[];
  scoredEvents: ScoredEvent[];
  portWatchByChokeId: Record<string, ChokepointAisObservation>;
  portWatchTransits: Record<string, ChokeTransitStress>;
  escalationOffer: EscalationOffer | null;
  assetByChokeId: Record<string, AssetVolatilityHint | null>;
  openUkmtoBrief: (incident: UkmtoIncidentPoint) => void;
  openNavareaBrief: (feature: NavareaFeaturePoint) => void;
};

/**
 * Observe 경보·워치보드·초크 스트레스·해협 오버레이 파생 데이터 묶음.
 * GlobeDashboard에서 추출 (분리 Phase D).
 */
export function useObserveAlertModel(opts: UseObserveAlertModelOptions) {
  const {
    isSatelliteViewer,
    isPhoneUi,
    setSelected,
    newsStreamPayload,
    deskFocus,
    setDeskFocus,
    setPromotingItemId,
    watchGradePrevRef,
    newfeedsAttacks,
    ukmtoIncidents,
    navareaFeatures,
    setExerciseBriefing,
    chokepointStressBriefing,
    setChokepointStressBriefing,
    disguisedVessels,
    liveuaEvents,
    observeEntryHadTarget,
    labelLanguage,
    intelDisconfirmCorpus,
    flyTo,
    INCIDENT_ENTRY_ALT,
    cesiumReady,
    unifiedFlyTo,
    switchToObserveAndFly,
    displayMilitaryExercises,
    scoredEvents,
    portWatchByChokeId,
    portWatchTransits,
    escalationOffer,
    assetByChokeId,
    openUkmtoBrief,
    openNavareaBrief,
  } = opts;

  const cesiumAlerts = useMemo(
    () =>
      isSatelliteViewer
        ? buildCesiumAlerts({
            lang: labelLanguage === "en" ? "en" : "ko",
            ukmtoIncidents,
            navareaFeatures,
            exercises: displayMilitaryExercises,
            disguisedVessels,
            portWatchByChokeId,
            assetByChokeId,
          })
        : [],
    [
      assetByChokeId,
      disguisedVessels,
      displayMilitaryExercises,
      isSatelliteViewer,
      labelLanguage,
      navareaFeatures,
      portWatchByChokeId,
      ukmtoIncidents,
    ],
  );

  const observeConflictClusters = useMemo(() => {
    if (!isSatelliteViewer) return [];
    const newsItems = [
      ...(newsStreamPayload?.hero ? [newsStreamPayload.hero] : []),
      ...(newsStreamPayload?.verified ?? []),
      ...(newsStreamPayload?.stateMedia ?? []),
    ];
    return buildConflictEventClusters({
      newsItems,
      gdeltEvents: scoredEvents,
      newfeedsAttacks,
    });
  }, [
    isSatelliteViewer,
    newsStreamPayload?.hero,
    newsStreamPayload?.stateMedia,
    newsStreamPayload?.verified,
    newfeedsAttacks,
    scoredEvents,
  ]);

  const observeWatchboardItems = useMemo(() => {
    if (!isSatelliteViewer) return [];
    const rssItems = [
      ...(newsStreamPayload?.hero ? [newsStreamPayload.hero] : []),
      ...(newsStreamPayload?.flashHeroes ?? []),
      ...(newsStreamPayload?.verified ?? []),
    ];
    return buildObserveWatchboard({
      liveuaEvents,
      rssItems,
      cesiumAlerts,
      conflictClusters: observeConflictClusters,
      lang: labelLanguage === "en" ? "en" : "ko",
      windowHours: 72,
    });
  }, [
    cesiumAlerts,
    isSatelliteViewer,
    labelLanguage,
    liveuaEvents,
    newsStreamPayload?.flashHeroes,
    newsStreamPayload?.hero,
    newsStreamPayload?.verified,
    observeConflictClusters,
  ]);

  /** Hold→Active 승격 감지 — 지도 승격 모션이 메인 이벤트 */
  useEffect(() => {
    if (!isSatelliteViewer || observeWatchboardItems.length === 0) return;
    const prevMap = watchGradePrevRef.current;
    let promoted: WatchboardItem | null = null;
    for (const item of observeWatchboardItems) {
      const prev = prevMap.get(item.id);
      if (isPromotion(prev, item.grade)) {
        promoted = item;
      }
      prevMap.set(item.id, item.grade);
    }
    if (!promoted) return;
    const lang = labelLanguage === "en" ? "en" : "ko";
    const focus = watchboardItemToDeskFocus(promoted, lang, {
      promoteFromHold: true,
    });
    if (!focus) return;
    setPromotingItemId(promoted.id);
    setDeskFocus(focus);
    const t = window.setTimeout(() => setPromotingItemId(null), 1400);
    switchToObserveAndFly(focus.lat, focus.lng, {
      altitude: focus.altitude || INCIDENT_ENTRY_ALT,
      durationMs: CINEMATIC_FLY.durationMs,
      camera: resolveCinematicCamera(),
      subtitle: gradeLabelFriendly(focus.grade, labelLanguage),
      title: focus.title,
      kicker: lang === "en" ? "Promoted" : "승격",
    });
    return () => window.clearTimeout(t);
  }, [
    observeWatchboardItems,
    isSatelliteViewer,
    labelLanguage,
    switchToObserveAndFly,
  ]);

  const escalationIntel = useMemo(() => {
    if (!escalationOffer) return null;
    const top = escalationOffer.top;
    const gate = gateEscalation({
      signal: top.signal,
      itemId: top.id,
      sourceRefs: [
        {
          id: top.id,
          name: top.publisher || top.title.slice(0, 40),
          url: top.link ?? null,
          occurredAt: top.pubDate ?? null,
        },
      ],
      disconfirmCorpus: intelDisconfirmCorpus,
      windowHours: 72,
    });
    if (!canPublish("escalation_banner", gate.grade)) return null;
    return { offer: escalationOffer, gate };
  }, [escalationOffer, intelDisconfirmCorpus]);

  const chokepointStressGate = useMemo(() => {
    if (!chokepointStressBriefing) return null;
    const point = LOGISTICS_RISK_POINTS.find(
      (p) => p.id === chokepointStressBriefing.chokepointId,
    );
    if (!point) return null;
    const ais = portWatchByChokeId[point.id] ?? null;
    const asset = assetByChokeId[point.id] ?? null;
    const stress = stressForChokepoint(point, ukmtoIncidents, ais, asset);
    const ukmtoCount = stress.signals.filter((s) =>
      /ukmto/i.test(`${s.sourceKo} ${s.sourceEn} ${s.labelKo} ${s.labelEn}`),
    ).length;
    // B급: PortWatch 데이터가 있다고 신호가 아님 — 통항 급감(-12% 이하)만
    const aisStress =
      ais != null &&
      Number.isFinite(ais.changePct) &&
      ais.changePct <= -12;
    // C급: normal 힌트·존재만으로 독립 채널을 만들지 않음
    const assetStress =
      asset != null && asset.hint !== "normal" ? asset.hint : null;
    const gate = gateChokepointStress({
      nameKo: point.name,
      nameEn:
        typeof point.meta?.nameEn === "string" ? point.meta.nameEn : point.name,
      stress: {
        chokepointId: point.id,
        grade: stress.level,
        ukmtoCount: Math.max(ukmtoCount, stress.graded ? 1 : 0),
        hasAis: aisStress,
        hasAssetHint: assetStress != null,
        assetHint: assetStress,
      },
      lat: point.lat,
      lng: point.lng,
      disconfirmCorpus: intelDisconfirmCorpus,
      windowHours: 72,
    });
    if (!canPublish("economy_alert", gate.grade)) return null;
    return gate;
  }, [
    assetByChokeId,
    chokepointStressBriefing,
    intelDisconfirmCorpus,
    portWatchByChokeId,
    ukmtoIncidents,
  ]);

  /** 관측 모드 — 지정학과 같은 초크 글로우 링 (PortWatch·UKMTO 스트레스 색) */
  const cesiumChokeRings = useMemo(() => {
    if (!isSatelliteViewer) return [];
    const colorForId = (id: string): string | undefined => {
      const point = LOGISTICS_RISK_POINTS.find((p) => p.id === id);
      if (!point || point.kind !== "chokepoint") return undefined;
      const stress = stressForChokepoint(
        point,
        ukmtoIncidents,
        portWatchByChokeId[id] ?? null,
        assetByChokeId[id] ?? null,
      );
      return chokeStressHex(stress.level);
    };
    return chokeGlowRingSeed(undefined, colorForId).map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      radiusScale: p.radiusScale,
      ...(p.color ? { color: p.color } : {}),
    }));
  }, [
    assetByChokeId,
    isSatelliteViewer,
    portWatchByChokeId,
    ukmtoIncidents,
  ]);

  const chokeStressColorById = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    for (const ring of cesiumChokeRings) {
      out[ring.id] = ring.color;
    }
    return out;
  }, [cesiumChokeRings]);

  const straitTour = useObserveStraitTour({
    enabled: isSatelliteViewer && !isPhoneUi,
    ready: cesiumReady,
    flyTo: unifiedFlyTo,
    hasPendingFly: observeEntryHadTarget || Boolean(deskFocus),
  });

  const { pathSegments: straitStaticPathSegments, ports: straitPorts } =
    useObserveStraitStaticDensity({
      enabled: isSatelliteViewer && !isPhoneUi,
      preset: isSatelliteViewer ? straitTour.activePreset : null,
    });

  const straitOverlaySegments = useMemo(() => {
    if (!isSatelliteViewer) return [];
    return [
      ...buildStraitGateSegments(straitTour.activePreset, chokeStressColorById),
      ...straitStaticPathSegments,
    ];
  }, [
    chokeStressColorById,
    isSatelliteViewer,
    straitStaticPathSegments,
    straitTour.activePreset,
  ]);

  const straitLabels = useMemo(() => {
    if (!isSatelliteViewer) return [];
    const lang = labelLanguage === "en" ? "en" : "ko";
    return [
      ...buildTransitBadgeLabels({
        preset: straitTour.activePreset,
        transits: portWatchTransits,
        lang,
      }),
      ...buildBundleCalloutLabels({
        preset: straitTour.activePreset,
        items: observeWatchboardItems,
        lang,
      }),
      ...buildPortLabels(straitPorts, lang),
    ];
  }, [
    isSatelliteViewer,
    labelLanguage,
    observeWatchboardItems,
    portWatchTransits,
    straitPorts,
    straitTour.activePreset,
  ]);

  // 안건 포커스 시 자동 순회 일시정지 (해협 이력은 useObserveStraitTour 내부에서 처리)
  useEffect(() => {
    if (!isSatelliteViewer) return;
    if (deskFocus) straitTour.pauseTour();
  }, [deskFocus, isSatelliteViewer, straitTour.pauseTour]);

  const openCesiumAlert = useCallback(
    (item: CesiumAlertItem) => {
      straitTour.pauseTour();
      const sourceId = item.id.slice(item.id.indexOf(":") + 1);
      if (item.kind === "ukmto") {
        const incident = ukmtoIncidents.find((row) => row.id === sourceId);
        if (incident) openUkmtoBrief(incident);
        return;
      }
      if (item.kind === "navarea") {
        const feature = navareaFeatures.find((row) => row.id === sourceId);
        if (feature) openNavareaBrief(feature);
        return;
      }
      if (item.kind === "portwatch") {
        const point = LOGISTICS_RISK_POINTS.find((row) => row.id === sourceId);
        if (!point) return;
        const briefing = buildChokepointStressBriefing({
          point,
          lang: labelLanguage,
          stress: stressForChokepoint(
            point,
            ukmtoIncidents,
            portWatchByChokeId[point.id] ?? null,
            assetByChokeId[point.id] ?? null,
          ),
          aisObservation: portWatchByChokeId[point.id] ?? null,
          assetVolatility: assetByChokeId[point.id] ?? null,
        });
        if (briefing) {
          const lang = labelLanguage === "en" ? "en" : "ko";
          setChokepointStressBriefing({
            ...briefing,
            title: withMaritimeFlashTitle(briefing.title, lang),
          });
        }
        flyTo(item.lat, item.lng, 0.72, 900);
        return;
      }
      if (item.kind === "exercise") {
        const exercise = displayMilitaryExercises.find((row) => row.id === sourceId);
        if (!exercise) return;
        const brief = buildExerciseBriefingContent(
          exercise,
          labelLanguage === "en" ? "en" : "ko",
        );
        if (brief) setExerciseBriefing(brief);
        flyTo(item.lat, item.lng, 0.85, 900);
        return;
      }
      if (item.kind === "dark-fleet") {
        const vessel = disguisedVessels.find((row) => row.id === sourceId);
        if (vessel) setSelected({ kind: "ais", item: vessel });
        flyTo(item.lat, item.lng, 0.45, 900);
        return;
      }
      flyTo(item.lat, item.lng, item.kind === "route" ? 1.15 : 0.62, 900);
    },
    [
      assetByChokeId,
      disguisedVessels,
      displayMilitaryExercises,
      flyTo,
      labelLanguage,
      navareaFeatures,
      openNavareaBrief,
      openUkmtoBrief,
      portWatchByChokeId,
      straitTour.pauseTour,
      ukmtoIncidents,
    ],
  );

  return {
    cesiumAlerts,
    observeWatchboardItems,
    escalationIntel,
    chokepointStressGate,
    cesiumChokeRings,
    straitTour,
    straitPorts,
    straitOverlaySegments,
    straitLabels,
    openCesiumAlert,
  };
}
