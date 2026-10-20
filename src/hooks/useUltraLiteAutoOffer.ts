"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  probeFps,
  type PerfProbeResult,
} from "@/lib/perfProbe";
import { canShowNudge, markNudgeShown } from "@/lib/onboardingBudget";
import { loadPerfPrefs, savePerfPrefs } from "@/lib/ultraLiteMode";

/**
 * 세션 1회 제한은 `onboardingBudget`이 담당한다.
 *
 * P2-2: 제안형이 아니라 결과 통보형.
 * FPS가 낮으면 Ultra-Lite를 **자동 적용**한 뒤 배너로 알리고,
 * [되돌리기]로 해제할 수 있다.
 */

export type UltraLiteAutoOffer = {
  /** 적용 결과 배너를 띄울지 */
  visible: boolean;
  /** 측정 결과 — 문구 강도 결정용 */
  probe: PerfProbeResult | null;
  /** 확인 — 배너만 닫음 (이미 적용됨) */
  accept: () => void;
  /** 되돌리기 — Ultra-Lite OFF */
  dismiss: () => void;
};

/**
 * 지구본이 준비된 뒤 FPS를 조용히 측정하고, 느리면 Ultra-Lite를 자동 적용한다.
 */
export function useUltraLiteAutoOffer(
  enabled: boolean,
  onApply: (ultraLite: boolean) => void,
): UltraLiteAutoOffer {
  const [probe, setProbe] = useState<PerfProbeResult | null>(null);
  const [visible, setVisible] = useState(false);
  const startedRef = useRef(false);
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    if (loadPerfPrefs().ultraLite) return;
    if (!canShowNudge("ultraLiteOffer")) return;

    startedRef.current = true;
    const controller = new AbortController();
    let settled = false;

    void probeFps({ signal: controller.signal }).then((result) => {
      settled = true;
      if (controller.signal.aborted || !result) return;
      setProbe(result);
      if (result.tier === "ok") return;
      if (!canShowNudge("ultraLiteOffer")) return;
      markNudgeShown("ultraLiteOffer");
      savePerfPrefs({ ultraLite: true });
      onApply(true);
      appliedRef.current = true;
      setVisible(true);
    });

    return () => {
      controller.abort();
      if (!settled) startedRef.current = false;
    };
  }, [enabled, onApply]);

  const accept = useCallback(() => {
    setVisible(false);
  }, []);

  const dismiss = useCallback(() => {
    if (appliedRef.current) {
      savePerfPrefs({ ultraLite: false });
      onApply(false);
      appliedRef.current = false;
    }
    setVisible(false);
  }, [onApply]);

  return { visible, probe, accept, dismiss };
}
