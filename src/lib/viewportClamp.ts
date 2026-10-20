/** 설명창·툴팁이 브라우저 뷰포트 밖으로 나가지 않게 위치를 보정합니다. */

export const VIEWPORT_EDGE_PAD = 10;

export type ViewportBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function getViewportSize(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 1280, height: 720 };
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * 주어진 박스의 좌상단을 뷰포트 안으로 클램프.
 * width/height가 뷰포트보다 크면 padding 쪽에 붙입니다.
 */
export function clampBoxToViewport(
  left: number,
  top: number,
  width: number,
  height: number,
  padding = VIEWPORT_EDGE_PAD,
  viewport = getViewportSize(),
): { left: number; top: number } {
  const maxLeft = Math.max(padding, viewport.width - width - padding);
  const maxTop = Math.max(padding, viewport.height - height - padding);
  return {
    left: Math.min(Math.max(padding, left), maxLeft),
    top: Math.min(Math.max(padding, top), maxTop),
  };
}

export function boxesOverlap(a: ViewportBox, b: ViewportBox, pad = 0): boolean {
  return !(
    a.left + a.width + pad <= b.left ||
    b.left + b.width + pad <= a.left ||
    a.top + a.height + pad <= b.top ||
    b.top + b.height + pad <= a.top
  );
}

/**
 * 우상단 GTI 칩 스택 등 `data-chrome-obstacle` 고정 크롬.
 * HoverHint가 뷰포트만 clamp하고 칩과 겹치던 구멍(2026-08-30 리포트 7번)을 메운다.
 */
export function collectChromeObstacles(exclude?: Element | null): ViewportBox[] {
  if (typeof document === "undefined") return [];
  const nodes = document.querySelectorAll("[data-chrome-obstacle]");
  const boxes: ViewportBox[] = [];
  nodes.forEach((node) => {
    if (exclude && (node === exclude || node.contains(exclude) || exclude.contains(node))) {
      return;
    }
    const r = (node as HTMLElement).getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;
    boxes.push({ left: r.left, top: r.top, width: r.width, height: r.height });
  });
  return boxes;
}

/**
 * 장애물과 겹치면 아래·위·왼쪽으로 밀어 본 뒤 뷰포트 clamp.
 * 완전히 피할 공간이 없으면 마지막으로 clamp된 좌표를 반환한다.
 */
export function shiftBoxFromObstacles(
  box: ViewportBox,
  obstacles: ViewportBox[],
  viewport: { width: number; height: number },
  padding = VIEWPORT_EDGE_PAD,
): { left: number; top: number } {
  if (obstacles.length === 0) {
    return clampBoxToViewport(box.left, box.top, box.width, box.height, padding, viewport);
  }

  const candidates: Array<{ left: number; top: number }> = [
    { left: box.left, top: box.top },
  ];
  for (const obstacle of obstacles) {
    candidates.push({ left: box.left, top: obstacle.top + obstacle.height + padding });
    candidates.push({ left: box.left, top: obstacle.top - box.height - padding });
    candidates.push({ left: obstacle.left - box.width - padding, top: box.top });
  }

  for (const candidate of candidates) {
    const clamped = clampBoxToViewport(
      candidate.left,
      candidate.top,
      box.width,
      box.height,
      padding,
      viewport,
    );
    const placed: ViewportBox = {
      left: clamped.left,
      top: clamped.top,
      width: box.width,
      height: box.height,
    };
    if (!obstacles.some((obstacle) => boxesOverlap(placed, obstacle, 2))) {
      return clamped;
    }
  }

  return clampBoxToViewport(box.left, box.top, box.width, box.height, padding, viewport);
}

/**
 * preferredPlacement 기준으로 앵커 옆/위/아래에 두고,
 * 공간이 부족하면 반대쪽으로 뒤집은 뒤 고정 크롬 장애물을 피해 clamp.
 */
export function placeNearAnchor(options: {
  anchor: DOMRect;
  width: number;
  height: number;
  preferred: "above" | "below";
  gap?: number;
  padding?: number;
  obstacles?: ViewportBox[];
}): { left: number; top: number; placement: "above" | "below" } {
  const gap = options.gap ?? 10;
  const padding = options.padding ?? VIEWPORT_EDGE_PAD;
  const viewport = getViewportSize();
  const cx = options.anchor.left + options.anchor.width / 2;
  let preferred = options.preferred;

  const spaceBelow = viewport.height - options.anchor.bottom - padding;
  const spaceAbove = options.anchor.top - padding;
  if (preferred === "below" && spaceBelow < options.height + gap && spaceAbove > spaceBelow) {
    preferred = "above";
  } else if (preferred === "above" && spaceAbove < options.height + gap && spaceBelow > spaceAbove) {
    preferred = "below";
  }

  const rawLeft = cx - options.width / 2;
  const rawTop =
    preferred === "below"
      ? options.anchor.bottom + gap
      : options.anchor.top - gap - options.height;

  const shifted = shiftBoxFromObstacles(
    { left: rawLeft, top: rawTop, width: options.width, height: options.height },
    options.obstacles ?? [],
    viewport,
    padding,
  );
  return { ...shifted, placement: preferred };
}
