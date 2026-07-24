"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TENSION_CUT_DESTINATIONS,
  type TensionCutDestination,
  type TensionSpikeSnapshot,
} from "@/lib/tensionSpikeCut";

type Phase = "offer" | "cutting";

type TensionSpikeCutOverlayProps = {
  spike: TensionSpikeSnapshot;
  lang: "ko" | "en";
  onJump: (destination: TensionCutDestination) => void;
  onDismiss: () => void;
};

export function TensionSpikeCutOverlay({
  spike,
  lang,
  onJump,
  onDismiss,
}: TensionSpikeCutOverlayProps) {
  const [phase, setPhase] = useState<Phase>("offer");
  const en = lang === "en";

  useEffect(() => {
    setPhase("offer");
  }, [spike.telegraphKo]);

  const handlePick = useCallback(
    (id: TensionCutDestination) => {
      if (phase !== "offer") return;
      setPhase("cutting");
      window.setTimeout(() => {
        onJump(id);
      }, 420);
    },
    [onJump, phase],
  );

  const telegraph = en ? spike.telegraphEn : spike.telegraphKo;

  return (
    <div
      className={`tension-spike-cut ${phase === "cutting" ? "tension-spike-cut--cutting" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={en ? "Taiwan tension cut" : "대만 해협 긴장 컷"}
    >
      <div className="tension-spike-cut__veil" aria-hidden />
      {phase === "offer" ? (
        <div className="tension-spike-cut__panel">
          <p className="tension-spike-cut__kicker">
            {en ? "CHANNEL CUT" : "채널 컷"}
            {spike.proxy ? (en ? " · PREVIEW" : " · 체험") : ""}
          </p>
          <p className="tension-spike-cut__telegraph font-data-mono">{telegraph}</p>
          <p className="tension-spike-cut__ask">
            {en ? "Where do you cut to?" : "어디로 잘라 넘길까요?"}
          </p>
          <div className="tension-spike-cut__destinations">
            {TENSION_CUT_DESTINATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                className="tension-spike-cut__dest tap-target"
                onClick={() => handlePick(d.id)}
              >
                <span className="tension-spike-cut__dest-label">
                  {en ? d.labelEn : d.labelKo}
                </span>
                <span className="tension-spike-cut__dest-hint">
                  {en ? d.hintEn : d.hintKo}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="tension-spike-cut__dismiss"
            onClick={onDismiss}
          >
            {en ? "Not now" : "지금은 아님"}
          </button>
        </div>
      ) : (
        <p className="tension-spike-cut__cutting-label font-data-mono">
          {en ? "CUT…" : "컷…"}
        </p>
      )}
    </div>
  );
}
