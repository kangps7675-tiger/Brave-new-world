"use client";

import { useMemo } from "react";
import { buildScreenState, type ScreenState, type ScreenStateInput } from "@/lib/screenState";

/**
 * 화면 상태 파생 훅 (P2-1 8단계).
 *
 * 판정 로직은 `lib/screenState.ts`(순수 함수)에 있고 여기서는 memo만 한다 —
 * 테스트는 React 없이 순수 함수로 돌린다.
 *
 * ```tsx
 * const screen = useScreenState({ entryGate, showModePicker, ... });
 *
 * // before: entryGate === null && !showModePicker && !intelSheetOpen
 * // after:
 * {screen.canShowChrome ? <DashboardTopChrome … /> : null}
 * ```
 *
 * **상태를 옮기지 않는다.** 기존 값을 이름 붙은 판정으로 바꿔줄 뿐이라
 * 한 곳씩 점진적으로 옮겨도 안전하다 (구식 조건과 공존 가능).
 */
export function useScreenState(input: ScreenStateInput): ScreenState {
  return useMemo(
    () => buildScreenState(input),
    // 원시값만 의존성으로 — input 객체는 매 렌더 새로 만들어진다
    [
      input.entryGate,
      input.showModePicker,
      input.showLeftPanel,
      input.intelSheetOpen,
      input.globeReady,
      input.isLoading,
      input.loadError,
      input.isPhoneUi,
      input.isCompactUi,
      input.briefingBusy,
    ],
  );
}
