"use client";

import { useCallback, useEffect, useState } from "react";
import { useDialog } from "@/hooks/useDialog";
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
  /** 긴장 컷 — 전체화면을 덮으므로 Escape 탈출구가 반드시 필요하다 (P1-7) */
  const dialogRef = useDialog<HTMLDivElement>({ open: true, onClose: onDismiss });
  const [phase, setPhase] = useState<Phase>("offer");
  const en = lang === "en";
  const place = en ? spike.labelEn : spike.labelKo;

  useEffect(() => {
    setPhase("offer");
  }, [spike.entityId, spike.telegraphKo]);

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
      ref={dialogRef}
      tabIndex={-1}
      className={`tension-spike-cut ${phase === "cutting" ? "tension-spike-cut--cutting" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={en ? `${place} — choose a view` : `${place} — 보기 선택`}
    >
      <div className="tension-spike-cut__veil" aria-hidden />
      {phase === "offer" ? (
        <div className="tension-spike-cut__panel">
          <p className="tension-spike-cut__kicker">
            {en ? "HOTTEST RIGHT NOW" : "지금 가장 핫한 곳"}
            {spike.proxy ? (en ? " · PREVIEW" : " · 미리보기") : ""}
          </p>
          <p className="tension-spike-cut__place">{place}</p>
          <p className="tension-spike-cut__telegraph font-data-mono">{telegraph}</p>
          {(en ? spike.driverEn : spike.driverKo) ? (
            <p className="tension-spike-cut__driver">
              {en ? spike.driverEn : spike.driverKo}
            </p>
          ) : null}
          <p className="tension-spike-cut__ask">
            {en ? "Where should we look first?" : "어디부터 볼까요?"}
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
            {en ? "Stay on the globe" : "지구본에 머무르기"}
          </button>
        </div>
      ) : (
        <p className="tension-spike-cut__cutting-label font-data-mono">
          {en ? "Moving…" : "이동 중…"}
        </p>
      )}
    </div>
  );
}
