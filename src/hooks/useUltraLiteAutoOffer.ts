"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  probeFps,
  type PerfProbeResult,
} from "@/lib/perfProbe";
import { canShowNudge, markNudgeShown } from "@/lib/onboardingBudget";
import { loadPerfPrefs, savePerfPrefs } from "@/lib/ultraLiteMode";

/**
 * 세션 1회 제한은 이제 `onboardingBudget`이 담당한다.
 * (저장 키 `geowatch-ultralite-offer-v1`은 그대로 재사용 — 레지스트리 참조)
 *
 * 이 훅은 "떠도 되는가"를 스스로 판단하지 않는다. 예산제에 물어본다.
 * 그래야 코치·투어·힌트와 합쳐 **세션당 총량**이 지켜진다.
 */

export type UltraLiteAutoOffer = {
  /** 제안을 띄울지 */
  visible: boolean;
  /** 측정 결과 — 문구 강도 결정용 */
  probe: PerfProbeResult | null;
  /** 수락 — Ultra-Lite ON + 저장 */
  accept: () => void;
  /** 거절 — 이 세션엔 다시 묻지 않음 */
  dismiss: () => void;
};

/**
 * 지구본이 준비된 뒤 FPS를 조용히 측정하고, 느리면 Ultra-Lite를 **제안**한다.
 *
 * 강제로 켜지 않는다. 진입 전에 사양을 자진 신고시키지도 않는다.
 * 측정 → (느릴 때만) 1회 제안 → 유저가 수락해야 적용.
 *
 * @param enabled 지구본이 실제로 렌더 중일 때만 true (부트/게이트 중에는 false)
 * @param onApply Ultra-Lite를 실제 레이어 prefs에 반영하는 콜백
 */
export function useUltraLiteAutoOffer(
  enabled: boolean,
  onApply: (ultraLite: boolean) => void,
): UltraLiteAutoOffer {
  const [probe, setProbe] = useState<PerfProbeResult | null>(null);
  const [visible, setVisible] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    // 이미 Ultra-Lite를 쓰는 사람에게는 물을 이유가 없다
    if (loadPerfPrefs().ultraLite) return;
    // 예산·쿨다운·중복 노출은 전부 여기서 판정 (측정 자체를 아끼기 위해 선체크)
    if (!canShowNudge("ultraLiteOffer")) return;

    startedRef.current = true;
    const controller = new AbortController();
    let settled = false;

    void probeFps({ signal: controller.signal }).then((result) => {
      settled = true;
      if (controller.signal.aborted || !result) return;
      setProbe(result);
      if (result.tier === "ok") return;
      // 측정에 4.2초가 걸리므로 그 사이 다른 넛지가 예산을 가져갔을 수 있다 → 재확인
      if (!canShowNudge("ultraLiteOffer")) return;
      markNudgeShown("ultraLiteOffer");
      setVisible(true);
    });

    return () => {
      controller.abort();
      /**
       * ⚠️ 측정이 끝나기 전에 중단됐으면 재시도 가능하게 되돌린다.
       *
       * 프로브는 4.2초(워밍업 1.2 + 샘플 3)가 걸리는데, 호출측 `enabled`는
       * globeReady·isLoading·entryGate·showModePicker 등 여러 항의 AND라
       * 그 사이 한 번만 깜빡여도 cleanup이 돈다. startedRef를 true로 남겨두면
       * **제안이 영영 안 뜬다** (측정 자체가 재시작되지 않으므로).
       *
       * 측정을 끝낸 경우(settled)에는 되돌리지 않는다 — 결과가 'ok'였다면
       * 다시 잴 이유가 없고, 재측정 루프를 도는 것도 낭비다.
       */
      if (!settled) startedRef.current = false;
    };
  }, [enabled]);

  const accept = useCallback(() => {
    savePerfPrefs({ ultraLite: true });
    onApply(true);
    setVisible(false);
  }, [onApply]);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return { visible, probe, accept, dismiss };
}
