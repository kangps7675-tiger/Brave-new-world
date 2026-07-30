"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target.closest("input, textarea, select, [contenteditable='true']");
  return Boolean(el);
}

/**
 * 이 가드를 **적용하지 않을** 경로들.
 *
 * 왜 예외가 필요한가: 가드는 원래 지구본 셸을 게임처럼 다루기 위한 것이었고
 * 레이아웃에 달려 있어서 사이트 전체에 걸린다. 그런데 `/chokepoints/*`는
 * 검색·LLM·기자에게 **읽히고 인용되라고** 만든 텍스트 페이지다.
 *
 * 그 페이지에서 복사를 막으면:
 *   - 기자가 인용문을 못 가져간다 → 백링크가 안 생긴다
 *   - 텍스트 선택이 안 되는 페이지는 사람이 즉시 불신한다
 *   - 정작 크롤러·LLM은 HTML을 직접 읽으므로 아무것도 못 막는다
 *
 * 즉 얻는 것 없이 유통만 잃는다. 지구본에서만 켠다.
 */
const GUARD_EXEMPT_PREFIXES = ["/chokepoints"];

function isExempt(pathname: string | null): boolean {
  if (!pathname) return false;
  return GUARD_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * 게임형 셸 — 우클릭 메뉴·드래그 복사·클립보드 복사를 막는다.
 * 검색창 등 편집 필드는 입력만 허용(우클릭 메뉴는 동일하게 차단).
 *
 * 단, `GUARD_EXEMPT_PREFIXES`의 공개 문서 경로에서는 비활성.
 */
export function GameShellGuard() {
  const pathname = usePathname();
  const exempt = isExempt(pathname);

  useEffect(() => {
    if (exempt) return;
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
  }, [exempt]);

  return null;
}
