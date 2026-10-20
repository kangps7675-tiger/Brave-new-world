/**
 * 로컬 대시보드 오버레이 — 동시에 하나만 표시.
 *
 * 원칙:
 * 1. 사용 중인 소스에 맞는 패널만 연다 (GDELT ON → GDELT 패널, OFF + 분쟁 레이어 → 로컬).
 * 2. 한쪽이 실패해도 다른 쪽으로 자동 fallback 하지 않는다 (실패한 패널은 닫음).
 * 3. 우측 하단 경보 슬롯은 GDELT / 로컬 중 최대 1개.
 */

export type BottomAlertPanel = "none" | "gdelt" | "local";

export type BottomAlertInputs = {
  showGdeltLayers: boolean;
  showDisputes: boolean;
  gdeltError: string | null;
  gdeltLoading: boolean;
  gdeltAlertCount: number;
  loadError: string | null;
  isLoading: boolean;
  localAlertCount: number;
  wantLocalPanel: boolean;
  wantGdeltPanel: boolean;
};

/** 우측 하단 경보 패널 — 슬롯 1개 */
export function resolveBottomAlertPanel(input: BottomAlertInputs): BottomAlertPanel {
  if (input.showGdeltLayers) {
    if (input.gdeltError) return "none";
    if (
      input.wantGdeltPanel &&
      (input.gdeltLoading || input.gdeltAlertCount > 0)
    ) {
      return "gdelt";
    }
    return "none";
  }

  if (input.loadError || input.isLoading) return "none";
  if (!input.showDisputes) return "none";
  if (input.wantLocalPanel && input.localAlertCount > 0) return "local";
  return "none";
}

export function shouldCloseLocalForGdelt(showGdeltLayers: boolean): boolean {
  return showGdeltLayers;
}

export function shouldClosePanelOnDataError(input: {
  loadError: string | null;
  gdeltError: string | null;
  showGdeltLayers: boolean;
}): { local: boolean; gdelt: boolean } {
  return {
    local: Boolean(input.loadError),
    gdelt: input.showGdeltLayers && Boolean(input.gdeltError),
  };
}
