"use client";

import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target.closest("input, textarea, select, [contenteditable='true']");
  return Boolean(el);
}

/**
 * 게임형 셸 — 우클릭 메뉴·드래그 복사·클립보드 복사를 막는다.
 * 검색창 등 편집 필드는 입력만 허용(우클릭 메뉴는 동일하게 차단).
 */
export function GameShellGuard() {
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    const onSelectStart = (event: Event) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };
    const onDragStart = (event: DragEvent) => {
      event.preventDefault();
    };
    const onCopyOrCut = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener("contextmenu", onContextMenu, { capture: true });
    document.addEventListener("selectstart", onSelectStart, { capture: true });
    document.addEventListener("dragstart", onDragStart, { capture: true });
    document.addEventListener("copy", onCopyOrCut, { capture: true });
    document.addEventListener("cut", onCopyOrCut, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", onContextMenu, { capture: true });
      document.removeEventListener("selectstart", onSelectStart, { capture: true });
      document.removeEventListener("dragstart", onDragStart, { capture: true });
      document.removeEventListener("copy", onCopyOrCut, { capture: true });
      document.removeEventListener("cut", onCopyOrCut, { capture: true });
    };
  }, []);

  return null;
}
