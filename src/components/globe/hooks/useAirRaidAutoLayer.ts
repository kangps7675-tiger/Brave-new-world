"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import { AIR_RAID_FLY_MS, type AirRaidSirenKind } from "@/lib/airRaidFocus";
import {
  markAirRaidFlyBriefDone,
  shouldOfferAirRaidFlyBrief,
  type AirRaidOffer,
} from "@/components/AirRaidOfferBanner";
import type { AirRaidBriefingContent } from "@/components/AirRaidBriefingParchment";
import type { AirRaidFocusTarget } from "@/components/TzevaAdomPanel";
import type { TzevaAdomAlert } from "@/lib/tzevaAdom";
import type { NewfeedsAttackPoint } from "@/lib/newfeeds";
import { translateOrefRegion, translateOrefTitle } from "@/lib/tzevaAdomI18n";
import {
  inferIsraelApproachHint,
  tzevaCategoryThreatLabel,
} from "@/lib/airRaidBriefHints";
import {
  isFreshIranAirRaidAttack,
  isIranAirRaidActive,
} from "@/lib/airRaidAuto";

type UseAirRaidAutoLayerOptions = {
  /** 자동 점화 정지 (지경학·게이트·모드픽커·등불) */
  paused: boolean;
  labelLanguage: LabelLanguage;
  tzevaAdomActive: TzevaAdomAlert[];
  newfeedsAttacks: NewfeedsAttackPoint[];
  airRaidBriefing: AirRaidBriefingContent | null;
  setAirRaidBriefing: (content: AirRaidBriefingContent | null) => void;
  /** 등불 양피지 등 다른 대형 UI가 떠 있으면 점화 보류 */
  briefingBlocked: boolean;
  handleAirRaidFocus: (
    target: AirRaidFocusTarget,
    kind: AirRaidSirenKind,
    options?: { deferSirenUntilArrive?: boolean; skipSiren?: boolean },
  ) => void;
  patchLayerPrefsSoft: (patch: Partial<LayerPrefs>) => void;
  layerPrefsLiveRef: MutableRefObject<LayerPrefs>;
  /** 경보 전부 해제 시 포커스 빗금·박스 정리 (타이머 포함) */
  clearAirRaidFocus: () => void;
};

/**
 * 이스라엘·이란 신규 공습 — 레이어 자동 ON + fly + 상단 배너 (우크라 NEPTUN 제외).
 * GlobeDashboard에서 추출 (분리 3단계).
 *
 * 첫 스냅샷은 seen만 채우고 점화하지 않는다. 자동으로 켠 레이어는
 * 경보 해제 시에만 끈다(유저가 직접 켠 레이어는 유지).
 */
export function useAirRaidAutoLayer({
  paused,
  labelLanguage,
  tzevaAdomActive,
  newfeedsAttacks,
  airRaidBriefing,
  setAirRaidBriefing,
  briefingBlocked,
  handleAirRaidFocus,
  patchLayerPrefsSoft,
  layerPrefsLiveRef,
  clearAirRaidFocus,
}: UseAirRaidAutoLayerOptions) {
  const [airRaidOffer, setAirRaidOffer] = useState<AirRaidOffer | null>(null);
  const seenAirRaidKeysRef = useRef<Set<string> | null>(null);
  const airRaidAutoBusyRef = useRef(false);
  const airRaidAutoSeqRef = useRef(0);
  const airRaidAutoEnabledRef = useRef({ tzeva: false, newfeeds: false });
  const airRaidBannerDismissedKeyRef = useRef<string | null>(null);

  const engageAirRaidAlert = useCallback(
    (offer: AirRaidOffer) => {
      if (airRaidAutoBusyRef.current) return;
      airRaidAutoBusyRef.current = true;
      const seq = ++airRaidAutoSeqRef.current;
      const lang = labelLanguage === "en" ? "en" : "ko";
      const regionLabel = offer.target.label || (lang === "en" ? "Alert zone" : "경보 구역");

      if (offer.kind === "tzeva") {
        if (!layerPrefsLiveRef.current.showTzevaAdom) {
          airRaidAutoEnabledRef.current.tzeva = true;
          patchLayerPrefsSoft({ showTzevaAdom: true });
        }
      } else if (offer.kind === "newfeeds") {
        if (!layerPrefsLiveRef.current.showNewfeedsIranAttacks) {
          airRaidAutoEnabledRef.current.newfeeds = true;
          patchLayerPrefsSoft({ showNewfeedsIranAttacks: true });
        }
      }

      if (airRaidBannerDismissedKeyRef.current !== offer.key) {
        setAirRaidOffer(offer);
      }

      handleAirRaidFocus(offer.target, offer.kind, { deferSirenUntilArrive: true });

      const wantBrief = shouldOfferAirRaidFlyBrief();
      if (wantBrief) markAirRaidFlyBriefDone();

      if (!wantBrief) {
        window.setTimeout(() => {
          if (seq !== airRaidAutoSeqRef.current) return;
          airRaidAutoBusyRef.current = false;
        }, AIR_RAID_FLY_MS + 250);
        return;
      }

      void (async () => {
        try {
          const res = await fetch("/api/air-raid-brief", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: offer.kind,
              lang,
              region: regionLabel,
              title: offer.title,
              lat: offer.target.lat,
              lng: offer.target.lng,
              since: offer.since,
              activeCount: offer.activeCount,
              threatLabel: offer.threatLabel,
              approachFrom: offer.approachFrom,
              locationDetail: offer.locationDetail,
            }),
          });
          const data = (await res.json().catch(() => null)) as {
            title?: string;
            paragraphs?: string[];
          } | null;
          if (seq !== airRaidAutoSeqRef.current) return;
          const title =
            data?.title?.trim() ||
            (lang === "en" ? `Air-raid alert · ${regionLabel}` : `공습경보 · ${regionLabel}`);
          const paragraphs =
            Array.isArray(data?.paragraphs) && data.paragraphs.length > 0
              ? data.paragraphs
              : lang === "en"
                ? [
                    `An air-raid alert was received for ${regionLabel}${offer.since ? ` from ${offer.since}` : ""}.`,
                    offer.approachFrom ||
                      "Which direction the threat came from is not confirmed by this alert feed alone.",
                    "Shelter guidance for that locality comes first; attacker and munition type stay unverified unless stated.",
                  ]
                : [
                    `${regionLabel} 일대에 공습경보가 수신되었습니다${offer.since ? ` · 발령 시각 ${offer.since}` : ""}.`,
                    offer.approachFrom ||
                      "어느 쪽에서 날아왔는지는 이 경보 피드만으로 확정할 수 없습니다.",
                    "해당 위치의 대피·엄폐가 우선이며, 발사 주체·무기 유형은 미확인으로 둡니다.",
                  ];

          window.setTimeout(() => {
            if (seq !== airRaidAutoSeqRef.current) return;
            setAirRaidBriefing({ kind: offer.kind, title, paragraphs });
            airRaidAutoBusyRef.current = false;
          }, AIR_RAID_FLY_MS);
        } catch {
          if (seq !== airRaidAutoSeqRef.current) return;
          window.setTimeout(() => {
            if (seq !== airRaidAutoSeqRef.current) return;
            setAirRaidBriefing({
              kind: offer.kind,
              title: lang === "en" ? `Air-raid alert · ${regionLabel}` : `공습경보 · ${regionLabel}`,
              paragraphs:
                lang === "en"
                  ? [
                      `An air-raid alert was received for ${regionLabel}.`,
                      "Further details are unverified.",
                    ]
                  : [
                      `${regionLabel} 일대에 공습경보가 수신되었습니다.`,
                      "추가 전언은 미확인으로 취급합니다.",
                    ],
            });
            airRaidAutoBusyRef.current = false;
          }, AIR_RAID_FLY_MS);
        }
      })();
    },
    [handleAirRaidFocus, labelLanguage, layerPrefsLiveRef, patchLayerPrefsSoft, setAirRaidBriefing],
  );

  /** 신규 경보 후보 스캔 → 점화 */
  useEffect(() => {
    if (paused) return;

    const keys: string[] = [];
    const candidates: AirRaidOffer[] = [];
    const langKey = labelLanguage === "en" ? "en" : "ko";

    for (const alert of tzevaAdomActive) {
      const key = `tzeva:${alert.id}`;
      keys.push(key);
      candidates.push({
        key,
        kind: "tzeva",
        target: {
          lat: alert.lat,
          lng: alert.lng,
          label: translateOrefRegion(alert.region || "", labelLanguage) || alert.region,
        },
        title: translateOrefTitle(alert.title || "", labelLanguage, alert.category) || alert.title,
        since: alert.alertDate,
        activeCount: tzevaAdomActive.length,
        threatLabel: tzevaCategoryThreatLabel(alert.category, langKey),
        approachFrom: inferIsraelApproachHint(alert.lat, alert.lng, langKey),
      });
    }

    const freshIran = newfeedsAttacks.filter((a) => isFreshIranAirRaidAttack(a));
    for (const attack of freshIran) {
      const key = `newfeeds:${attack.id}`;
      keys.push(key);
      candidates.push({
        key,
        kind: "newfeeds",
        target: {
          lat: attack.lat,
          lng: attack.lng,
          label: attack.location || attack.title || "Iran",
        },
        title: attack.title,
        since: attack.publishedAt ?? undefined,
        activeCount: freshIran.length,
        threatLabel: attack.severity ? String(attack.severity) : undefined,
        locationDetail: attack.location || undefined,
      });
    }

    if (seenAirRaidKeysRef.current === null) {
      seenAirRaidKeysRef.current = new Set(keys);
      return;
    }

    const seen = seenAirRaidKeysRef.current;
    const fresh = candidates.find((c) => !seen.has(c.key));
    for (const k of keys) seen.add(k);
    if (!fresh || airRaidAutoBusyRef.current || airRaidBriefing || briefingBlocked) {
      return;
    }

    engageAirRaidAlert(fresh);
  }, [
    airRaidBriefing,
    briefingBlocked,
    engageAirRaidAlert,
    labelLanguage,
    newfeedsAttacks,
    paused,
    tzevaAdomActive,
  ]);

  /** 해제 시 상단 배너·포커스·자동 ON 레이어 함께 끔 (IL/IR만) */
  useEffect(() => {
    const tzevaOn = tzevaAdomActive.length > 0;
    const iranOn = isIranAirRaidActive(newfeedsAttacks);

    if (airRaidOffer) {
      if (airRaidOffer.kind === "tzeva" && !tzevaOn) setAirRaidOffer(null);
      else if (airRaidOffer.kind === "newfeeds" && !iranOn) setAirRaidOffer(null);
    }

    if (!tzevaOn && airRaidAutoEnabledRef.current.tzeva) {
      airRaidAutoEnabledRef.current.tzeva = false;
      if (layerPrefsLiveRef.current.showTzevaAdom) {
        patchLayerPrefsSoft({ showTzevaAdom: false });
      }
    }
    if (!iranOn && airRaidAutoEnabledRef.current.newfeeds) {
      airRaidAutoEnabledRef.current.newfeeds = false;
      if (layerPrefsLiveRef.current.showNewfeedsIranAttacks) {
        patchLayerPrefsSoft({ showNewfeedsIranAttacks: false });
      }
    }

    if (!tzevaOn && !iranOn) {
      airRaidBannerDismissedKeyRef.current = null;
      clearAirRaidFocus();
    }
  }, [
    airRaidOffer,
    clearAirRaidFocus,
    layerPrefsLiveRef,
    newfeedsAttacks,
    patchLayerPrefsSoft,
    tzevaAdomActive,
  ]);

  const dismissAirRaidOffer = useCallback(() => {
    if (airRaidOffer) {
      airRaidBannerDismissedKeyRef.current = airRaidOffer.key;
    }
    setAirRaidOffer(null);
  }, [airRaidOffer]);

  /** 등불 등 외부 사유로 배너 강제 종료 (dismissed 키는 남기지 않음) */
  const clearAirRaidOffer = useCallback(() => setAirRaidOffer(null), []);

  /** 브리핑 양피지 닫힘 등에서 auto busy 해제 */
  const releaseAirRaidAutoBusy = useCallback(() => {
    airRaidAutoBusyRef.current = false;
  }, []);

  return {
    airRaidOffer,
    engageAirRaidAlert,
    dismissAirRaidOffer,
    clearAirRaidOffer,
    releaseAirRaidAutoBusy,
  };
}
