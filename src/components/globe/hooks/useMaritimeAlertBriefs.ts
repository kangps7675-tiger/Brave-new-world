"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import type { MaritimeAlertOffer } from "@/components/MaritimeAlertOfferBanner";
import {
  buildNavareaBriefingContent,
  isSecurityCriticalNavarea,
  isUkmtoOfferWorthy,
  type NavareaBriefingContent,
} from "@/lib/navareaSecurity";
import {
  buildUkmtoBriefingContent,
  type UkmtoBriefingContent,
  type UkmtoIncidentPoint,
} from "@/lib/ukmtoHatch";
import type { NavareaFeaturePoint } from "@/lib/navareaHatch";

type FlyToFn = (
  lat: number,
  lng: number,
  altitude?: number,
  durationMs?: number,
  camera?: { pitch?: number; bearing?: number },
) => void;

type MaritimeOfferPayload = {
  source: "navarea" | "ukmto";
  navarea?: NavareaFeaturePoint;
  ukmto?: UkmtoIncidentPoint;
};

type UseMaritimeAlertBriefsOptions = {
  /** 오퍼 자동 점화 정지 (지경학·게이트·등불·공습 UI 등 외부 조건) */
  paused: boolean;
  labelLanguage: LabelLanguage;
  showNavareaWarnings: boolean;
  showUkmtoIncidents: boolean;
  navareaFeatures: NavareaFeaturePoint[];
  ukmtoIncidents: UkmtoIncidentPoint[];
  flyTo: FlyToFn;
  patchLayerPrefsSoft: (patch: Partial<LayerPrefs>) => void;
  layerPrefsLiveRef: MutableRefObject<LayerPrefs>;
  skipNextGlobeClickRef: MutableRefObject<boolean>;
};

/**
 * 해상 경보(UKMTO 피습 · NAVAREA 훈련·미사일) — GlobeDashboard에서 추출 (분리 3단계).
 *
 * - 클릭/수락 → fly → 전보음 양피지 (공습·허브 브리프와 동일 리듬)
 * - 신규 안보 직결 경보 등장 시 동의 창(offer). 첫 스냅샷은 seen만 채우고 팝업 안 띄움.
 */
export function useMaritimeAlertBriefs({
  paused,
  labelLanguage,
  showNavareaWarnings,
  showUkmtoIncidents,
  navareaFeatures,
  ukmtoIncidents,
  flyTo,
  patchLayerPrefsSoft,
  layerPrefsLiveRef,
  skipNextGlobeClickRef,
}: UseMaritimeAlertBriefsOptions) {
  const [ukmtoBriefing, setUkmtoBriefing] = useState<UkmtoBriefingContent | null>(null);
  const ukmtoBriefTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [navareaBriefing, setNavareaBriefing] = useState<NavareaBriefingContent | null>(null);
  const navareaBriefTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [maritimeOffer, setMaritimeOffer] = useState<MaritimeAlertOffer | null>(null);
  const maritimeOfferPayloadRef = useRef<MaritimeOfferPayload | null>(null);
  const maritimeOfferBusyRef = useRef(false);
  const seenMaritimeAlertKeysRef = useRef<Set<string> | null>(null);

  /** UKMTO 빗금 클릭 — fly → 전보음 양피지 */
  const openUkmtoBrief = useCallback(
    (incident: UkmtoIncidentPoint) => {
      skipNextGlobeClickRef.current = true;
      if (ukmtoBriefTimerRef.current != null) {
        clearTimeout(ukmtoBriefTimerRef.current);
        ukmtoBriefTimerRef.current = null;
      }
      setUkmtoBriefing(null);
      setNavareaBriefing(null);
      setMaritimeOffer(null);
      flyTo(incident.lat, incident.lng, 0.52, 900, { pitch: 48, bearing: -12 });
      ukmtoBriefTimerRef.current = setTimeout(() => {
        ukmtoBriefTimerRef.current = null;
        setUkmtoBriefing(buildUkmtoBriefingContent(incident, labelLanguage));
      }, 780);
    },
    [flyTo, labelLanguage, skipNextGlobeClickRef],
  );

  /** NAVAREA 구역 클릭 또는 동의 수락 — fly → 전보음 양피지 */
  const openNavareaBrief = useCallback(
    (feature: NavareaFeaturePoint) => {
      const brief = buildNavareaBriefingContent(feature, labelLanguage);
      if (!brief) return;
      skipNextGlobeClickRef.current = true;
      if (navareaBriefTimerRef.current != null) {
        clearTimeout(navareaBriefTimerRef.current);
        navareaBriefTimerRef.current = null;
      }
      setNavareaBriefing(null);
      setUkmtoBriefing(null);
      setMaritimeOffer(null);
      flyTo(brief.lat, brief.lng, 0.55, 900, { pitch: 48, bearing: -10 });
      navareaBriefTimerRef.current = setTimeout(() => {
        navareaBriefTimerRef.current = null;
        setNavareaBriefing(brief);
      }, 780);
    },
    [flyTo, labelLanguage, skipNextGlobeClickRef],
  );

  const dismissMaritimeOffer = useCallback(() => {
    maritimeOfferBusyRef.current = false;
    maritimeOfferPayloadRef.current = null;
    setMaritimeOffer(null);
  }, []);

  const acceptMaritimeOffer = useCallback(() => {
    const payload = maritimeOfferPayloadRef.current;
    setMaritimeOffer(null);
    maritimeOfferBusyRef.current = false;
    if (!payload) return;
    if (payload.source === "navarea" && payload.navarea) {
      if (!layerPrefsLiveRef.current.showNavareaWarnings) {
        patchLayerPrefsSoft({ showNavareaWarnings: true });
      }
      openNavareaBrief(payload.navarea);
      return;
    }
    if (payload.source === "ukmto" && payload.ukmto) {
      if (!layerPrefsLiveRef.current.showUkmtoIncidents) {
        patchLayerPrefsSoft({ showUkmtoIncidents: true });
      }
      openUkmtoBrief(payload.ukmto);
    }
  }, [layerPrefsLiveRef, openNavareaBrief, openUkmtoBrief, patchLayerPrefsSoft]);

  const closeUkmtoBriefing = useCallback(() => setUkmtoBriefing(null), []);
  const closeNavareaBriefing = useCallback(() => setNavareaBriefing(null), []);

  /** 레이어 OFF 시 해당 양피지·타이머 정리 */
  useEffect(() => {
    if (showUkmtoIncidents) return;
    setUkmtoBriefing(null);
    if (ukmtoBriefTimerRef.current != null) {
      clearTimeout(ukmtoBriefTimerRef.current);
      ukmtoBriefTimerRef.current = null;
    }
  }, [showUkmtoIncidents]);

  useEffect(() => {
    if (showNavareaWarnings) return;
    setNavareaBriefing(null);
    if (navareaBriefTimerRef.current != null) {
      clearTimeout(navareaBriefTimerRef.current);
      navareaBriefTimerRef.current = null;
    }
  }, [showNavareaWarnings]);

  /** 언마운트 시 타이머 정리 */
  useEffect(() => {
    return () => {
      if (ukmtoBriefTimerRef.current != null) clearTimeout(ukmtoBriefTimerRef.current);
      if (navareaBriefTimerRef.current != null) clearTimeout(navareaBriefTimerRef.current);
    };
  }, []);

  /** 신규 안보 직결 경보 → 동의 창. 첫 스냅샷은 seen만 채움 */
  useEffect(() => {
    if (paused) return;
    if (ukmtoBriefing || navareaBriefing || maritimeOffer) return;
    if (maritimeOfferBusyRef.current) return;

    const lang = labelLanguage === "en" ? "en" : "ko";
    type Candidate = {
      key: string;
      offer: MaritimeAlertOffer;
      payload: MaritimeOfferPayload;
    };
    const candidates: Candidate[] = [];

    if (showNavareaWarnings) {
      for (const f of navareaFeatures) {
        if (!isSecurityCriticalNavarea(f)) continue;
        const brief = buildNavareaBriefingContent(f, labelLanguage);
        if (!brief) continue;
        const kindKo = brief.kind === "missile" ? "미사일·발사 위험" : "군사 훈련·사격";
        const kindEn = brief.kind === "missile" ? "Missile / launch hazard" : "Military exercise";
        candidates.push({
          key: `navarea:${f.id}`,
          offer: {
            key: `navarea:${f.id}`,
            source: "navarea",
            title:
              lang === "en"
                ? `${kindEn} · NAVAREA ${f.region}`
                : `${kindKo} · NAVAREA ${f.region}`,
            subtitle: lang === "en" ? "Maritime security · NAVAREA" : "해상 안보 · NAVAREA",
            body:
              f.areaHint ||
              (lang === "en"
                ? "A new in-force navigational warning may affect nearby waters."
                : "새로 유효해진 항행경보가 인근 해역에 영향을 줄 수 있습니다."),
            lat: brief.lat,
            lng: brief.lng,
            navareaKind: brief.kind,
          },
          payload: { source: "navarea", navarea: f },
        });
      }
    }

    if (showUkmtoIncidents) {
      for (const inc of ukmtoIncidents) {
        if (!isUkmtoOfferWorthy(inc.incidentTypeName)) continue;
        if (!Number.isFinite(inc.lat) || !Number.isFinite(inc.lng)) continue;
        candidates.push({
          key: `ukmto:${inc.id}`,
          offer: {
            key: `ukmto:${inc.id}`,
            source: "ukmto",
            title: `UKMTO · ${inc.incidentTypeName}`,
            subtitle: lang === "en" ? "Merchant vessel threat" : "상선 피습·나포 경보",
            body:
              inc.place ||
              inc.detail ||
              (lang === "en"
                ? "A new high-severity UKMTO maritime alert was reported."
                : "고위협 UKMTO 해상 경보가 새로 보고되었습니다."),
            lat: inc.lat,
            lng: inc.lng,
          },
          payload: { source: "ukmto", ukmto: inc },
        });
      }
    }

    const keys = candidates.map((c) => c.key);
    if (seenMaritimeAlertKeysRef.current === null) {
      seenMaritimeAlertKeysRef.current = new Set(keys);
      return;
    }
    const seen = seenMaritimeAlertKeysRef.current;
    const fresh = candidates.find((c) => !seen.has(c.key));
    for (const k of keys) seen.add(k);
    if (!fresh) return;

    maritimeOfferBusyRef.current = true;
    maritimeOfferPayloadRef.current = fresh.payload;
    setMaritimeOffer(fresh.offer);
  }, [
    labelLanguage,
    maritimeOffer,
    navareaBriefing,
    navareaFeatures,
    paused,
    showNavareaWarnings,
    showUkmtoIncidents,
    ukmtoBriefing,
    ukmtoIncidents,
  ]);

  return {
    ukmtoBriefing,
    navareaBriefing,
    maritimeOffer,
    openUkmtoBrief,
    openNavareaBrief,
    acceptMaritimeOffer,
    dismissMaritimeOffer,
    closeUkmtoBriefing,
    closeNavareaBriefing,
  };
}
