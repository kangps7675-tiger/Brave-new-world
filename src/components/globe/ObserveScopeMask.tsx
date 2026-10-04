"use client";

import { zc } from "@/lib/uiStack";

type Props = {
  /** LiveUA「위치로 가기」등 — 망원경 원형 시야 */
  active: boolean;
};

/**
 * GEV scopeMask 참고 — 가운데 원만 밝고 바깥은 거의 불투명 블랙.
 * CSS radial-gradient만 사용 (매 프레임 canvas paint 없음).
 */
export function ObserveScopeMask({ active }: Props) {
  if (!active) return null;
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${zc("mapChrome")}`}
      style={{
        background:
          "radial-gradient(circle at 50% 46%, transparent 0%, transparent 26%, rgba(5,5,8,0.42) 38%, rgba(5,5,8,0.88) 52%, rgba(5,5,8,0.97) 68%, rgba(5,5,8,0.995) 100%)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
      aria-hidden
      data-observe-scope-mask
    />
  );
}
