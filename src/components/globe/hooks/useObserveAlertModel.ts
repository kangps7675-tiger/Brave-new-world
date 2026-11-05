"use client";

import { useMemo } from "react";
import type { ChokepointStressBriefing } from "@/lib/chokepointStressBriefing";
import type { DisconfirmCandidate } from "@/lib/intelContract/disconfirmPass";
import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import type { AssetVolatilityHint } from "@/lib/assetVolatilityHint";
import { stressForChokepoint, type ChokepointAisObservation } from "@/lib/chokepointStressForUi";
import { canPublish, gateChokepointStress, gateEscalation } from "@/lib/intelContract";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";
import type { EscalationOffer } from "@/components/globe/hooks/useEscalationSignals";

export type UseObserveAlertModelOptions = {
  chokepointStressBriefing: ChokepointStressBriefing | null;
  intelDisconfirmCorpus: DisconfirmCandidate[];
  portWatchByChokeId: Record<string, ChokepointAisObservation>;
  ukmtoIncidents: UkmtoIncidentPoint[];
  escalationOffer: EscalationOffer | null;
  assetByChokeId: Record<string, AssetVolatilityHint | null>;
};

/** 에스컬레이션 배너·해협 스트레스 브리핑의 근거 게이트(판정) 묶음. */
export function useObserveAlertModel(opts: UseObserveAlertModelOptions) {
  const {
    chokepointStressBriefing,
    intelDisconfirmCorpus,
    portWatchByChokeId,
    ukmtoIncidents,
    escalationOffer,
    assetByChokeId,
  } = opts;

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

  return { escalationIntel, chokepointStressGate };
}
