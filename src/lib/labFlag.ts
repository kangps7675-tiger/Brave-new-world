/**
 * 실험실(lab) UI 노출 플래그. 코드는 지우지 않고 화면에서만 숨긴다.
 * NEXT_PUBLIC_LAB=1 일 때만 켜진다. 분류: docs/right-rail-triage-2026-10-17.md, docs/layer-triage-2026-10-14.md
 */
export const LAB_UI = process.env.NEXT_PUBLIC_LAB === "1";
