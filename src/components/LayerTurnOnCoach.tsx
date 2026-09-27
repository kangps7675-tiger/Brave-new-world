"use client";

import { useEffect, useRef, useState } from "react";
import { UiSpotlightCoachmark } from "@/components/UiSpotlightCoachmark";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import {
  buildLayerOnCoachCopy,
  detectSingleLayerTurnOn,
  hasSeenLayerOnCoach,
  markLayerOnCoachSeen,
  resolveLayerCoachTarget,
  type LayerOnCoachPayload,
} from "@/lib/layerOnboarding";

type LayerTurnOnCoachProps = {
  layerPrefs: LayerPrefs;
  lang?: LabelLanguage;
  /** 다른 투어·양피지가 떠 있으면 막음 */
  blocked?: boolean;
  /** 패널이 닫혀 있으면 토글 타깃을 위해 연다 */
  onEnsureLayerPanelOpen?: () => void;
};

/**
 * 사용자가 레이어를 하나만 새로 켰을 때 — 그 스위치를 가리키며 ELI5 설명.
 * 패키지/모드 일괄 ON은 무시 (여러 키가 동시에 바뀌면 코치하지 않음).
 */
export function LayerTurnOnCoach({
  layerPrefs,
  lang = "ko",
  blocked = false,
  onEnsureLayerPanelOpen,
}: LayerTurnOnCoachProps) {
  const prevRef = useRef<LayerPrefs | null>(null);
  const bootstrapped = useRef(false);
  const [payload, setPayload] = useState<LayerOnCoachPayload | null>(null);
  const [targetSelector, setTargetSelector] = useState("#layer-panel-toggle");

  useEffect(() => {
    if (!bootstrapped.current) {
      prevRef.current = layerPrefs;
      bootstrapped.current = true;
      return;
    }
    const prev = prevRef.current;
    prevRef.current = layerPrefs;
    if (!prev || blocked || payload) return;
    if (hasSeenLayerOnCoach("__skip_all__")) return;

    const raw = detectSingleLayerTurnOn(prev, layerPrefs);
    if (!raw) return;
    if (hasSeenLayerOnCoach(raw.layerId)) return;

    const copy = buildLayerOnCoachCopy(raw, lang);
    onEnsureLayerPanelOpen?.();
    setPayload(copy);

    let cancelled = false;
    let tries = 0;
    const resolveTarget = () => {
      if (cancelled) return;
      const preferred = resolveLayerCoachTarget(copy.layerId);
      const isFallback = preferred === "#layer-panel-toggle";
      if (!isFallback || tries > 20) {
        setTargetSelector(preferred);
        return;
      }
      tries += 1;
      window.setTimeout(resolveTarget, 100);
    };
    window.setTimeout(resolveTarget, 280);
    return () => {
      cancelled = true;
    };
  }, [layerPrefs, blocked, lang, payload, onEnsureLayerPanelOpen]);

  if (blocked || !payload) return null;

  const en = lang === "en";

  return (
    <UiSpotlightCoachmark
      open
      targetSelector={targetSelector}
      title={payload.title}
      body={payload.body}
      placement="below"
      accent="violet"
      ctaLabel={en ? "Got it" : "알겠어요"}
      skipLabel={en ? "Don’t explain layers" : "레이어 설명 끄기"}
      onDismiss={() => {
        markLayerOnCoachSeen(payload.layerId);
        setPayload(null);
      }}
      onSkip={() => {
        // 세션에서 더 이상 레이어 ON 코치를 보지 않음
        markLayerOnCoachSeen(payload.layerId);
        markLayerOnCoachSeen("__skip_all__");
        setPayload(null);
      }}
    />
  );
}

export function shouldOfferLayerTurnOnCoach(): boolean {
  return !hasSeenLayerOnCoach("__skip_all__");
}
