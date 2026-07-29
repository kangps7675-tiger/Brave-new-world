/**
 * 레이어 캡 거부 알림 — 조용한 실패 제거 (P0-7).
 *
 * ── 문제 ──────────────────────────────────────────────────────────
 * `useLayerPrefsController.togglePref`는 캡 초과 시 그냥 `return`한다.
 * 주석에는 "패널이 경고"라고 적혀 있고 실제로 레이어 패널
 * (`LayerCategoryDraftHost`)은 경고를 띄운다. 하지만 레이어를 켜는 경로는
 * 패널만이 아니다:
 *
 *   · `LayerQuickDropdown`      상단 빠른 레이어 드롭다운
 *   · `GpsJamFixedToggle` 등    고정 토글 칩
 *   · `AskLayersOverlay`        「묻기」 자동 레이어 ON
 *   · `CompactPresetChips`      모바일 프리셋
 *
 * 이 경로들은 캡에 걸리면 **아무 일도 일어나지 않는다.** 사용자는 토글을
 * 눌렀는데 지도가 그대로인 걸 보고 "고장났나?"라고 생각한다.
 *
 * ── 해법 ──────────────────────────────────────────────────────────
 * 거부가 발생한 지점(컨트롤러)에서 이벤트를 쏘고, 전역 토스트 하나가 듣는다.
 * 호출측 N곳을 전부 고치지 않아도 되고, 새 토글이 추가돼도 자동으로 커버된다.
 */

export const LAYER_CAP_REJECTED_EVENT = "geowatch-layer-cap-rejected";

export type LayerCapRejectedDetail = {
  /** 켜려다 거부된 레이어 prefs 키 */
  key: string;
  /** 현재 상한 */
  cap: number;
  ultraLite: boolean;
};

export function emitLayerCapRejected(detail: LayerCapRejectedDetail): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent<LayerCapRejectedDetail>(LAYER_CAP_REJECTED_EVENT, { detail }),
    );
  } catch {
    /* CustomEvent 미지원 — 알림만 생략, 동작에는 영향 없음 */
  }
}

export function onLayerCapRejected(
  handler: (detail: LayerCapRejectedDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<LayerCapRejectedDetail>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(LAYER_CAP_REJECTED_EVENT, listener);
  return () => window.removeEventListener(LAYER_CAP_REJECTED_EVENT, listener);
}
