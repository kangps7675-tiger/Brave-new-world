"use client";

import { useCallback, useState } from "react";
import { clearSceneParamsFromUrl, parseSceneFromSearch, type SceneLinkState } from "@/lib/sceneLink";

/**
 * 폰에서 열린 공유 장면 링크를 잡아 카드 랜딩으로 넘긴다 (P2-3-A).
 *
 * 데스크톱 경로(`useSceneDeeplink`)는 지구본이 준비된 뒤 카메라를 옮긴다.
 * 폰은 지구본이 없으므로 그 훅이 아무 일도 하지 않고, 결과적으로 링크가
 * **조용히 버려졌다.** 여기서 같은 파라미터를 읽어 카드로 넘긴다.
 *
 * URL 정리는 카드를 닫을 때 한다 — 즉시 지우면 사용자가 새로고침했을 때
 * 장면이 사라져, "링크가 깨졌다"는 인상을 준다.
 */
export type PhoneSceneLanding = {
  /** 표시할 장면 (없으면 일반 진입) */
  scene: SceneLinkState | null;
  /** 원본 공유 URL — 복사·재공유용 */
  shareUrl: string | null;
  dismiss: () => void;
};

export function usePhoneSceneLanding(enabled: boolean): PhoneSceneLanding {
  const [scene, setScene] = useState<SceneLinkState | null>(() => {
    if (!enabled || typeof window === "undefined") return null;
    return parseSceneFromSearch(window.location.search);
  });
  const [shareUrl] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.location.href,
  );

  const dismiss = useCallback(() => {
    setScene(null);
    clearSceneParamsFromUrl();
  }, []);

  return { scene: enabled ? scene : null, shareUrl, dismiss };
}
