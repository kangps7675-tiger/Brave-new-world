"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * 모달 접근성 표준 (P1-7).
 *
 * ── 현황 ──────────────────────────────────────────────────────────
 *   role="dialog" 선언        32개 파일
 *   Escape 처리                7개 (그마저 게이트가 아니라 드롭다운 위주)
 *   포커스 트랩                0
 *   오픈 시 포커스 이동         1 (AskLayersOverlay만)
 *
 * 키보드만 쓰는 사용자는 모달이 떠도 포커스가 뒤 화면에 남아, 보이지 않는
 * 요소들을 Tab으로 훑게 된다. 스크린리더 사용자는 모달 밖 내용을 계속 읽는다.
 *
 * 이 훅 하나로 네 가지를 한꺼번에 처리한다:
 *   ① Escape로 닫기
 *   ② 열릴 때 첫 포커스 이동 (없으면 컨테이너)
 *   ③ Tab 순환 가둠 (포커스 트랩)
 *   ④ 닫힐 때 이전 포커스 복원
 *
 * ```tsx
 * const ref = useDialog<HTMLDivElement>({ open, onClose });
 * return <div ref={ref} role="dialog" aria-modal="true">…</div>;
 * ```
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

export type UseDialogOptions = {
  open: boolean;
  onClose?: () => void;
  /** Escape로 닫히지 않아야 하는 경우 (필수 선택 게이트 등) */
  closeOnEscape?: boolean;
  /** 열릴 때 포커스할 요소 선택자 — 없으면 첫 포커스 가능 요소 */
  initialFocus?: string;
  /** 포커스 트랩 비활성 (비모달 팝오버 등) */
  trapFocus?: boolean;
};

export function useDialog<T extends HTMLElement = HTMLDivElement>({
  open,
  onClose,
  closeOnEscape = true,
  initialFocus,
  trapFocus = true,
}: UseDialogOptions) {
  const ref = useRef<T | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const node = ref.current;
      if (!node) return;

      if (event.key === "Escape" && closeOnEscape && onClose) {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !trapFocus) return;

      const items = focusableWithin(node);
      if (items.length === 0) {
        // 포커스할 게 없으면 컨테이너 밖으로 새지 않게 막는다
        event.preventDefault();
        node.focus();
        return;
      }

      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !node.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [closeOnEscape, onClose, trapFocus],
  );

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;

    // 닫을 때 돌아갈 곳을 기억
    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // 열릴 때 포커스 이동 — 렌더 직후로 미뤄 애니메이션 중 실패를 피한다
    const focusTimer = window.setTimeout(() => {
      const target = initialFocus
        ? node.querySelector<HTMLElement>(initialFocus)
        : focusableWithin(node)[0];
      (target ?? node).focus?.();
    }, 30);

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      // 이전 포커스 복원 — 키보드 사용자가 맥락을 잃지 않게
      const restore = restoreRef.current;
      if (restore && document.contains(restore)) restore.focus();
      restoreRef.current = null;
    };
  }, [handleKeyDown, initialFocus, open]);

  return ref;
}
