/**
 * Globe map keyboard navigation helpers.
 * WASD / arrows pan; +/- (and numpad) zoom.
 */

export type GlobeNavPanDir = "up" | "down" | "left" | "right";

export type GlobeNavAction =
  | { type: "pan"; dir: GlobeNavPanDir }
  | { type: "zoom"; dir: 1 | -1 };

/** Screen-space pan speed while a direction key is held (px / sec). */
export const GLOBE_KEYBOARD_PAN_PX_PER_SEC = 340;

/** Continuous zoom while +/- held (MapLibre zoom levels per second). */
export const GLOBE_KEYBOARD_ZOOM_PER_SEC = 0.55;

/** Shift held → faster continuous zoom. */
export const GLOBE_KEYBOARD_ZOOM_PER_SEC_SHIFT = 0.95;

export function shouldIgnoreGlobeKeyboardNav(
  target: EventTarget | null,
  activeElement: Element | null = typeof document !== "undefined" ? document.activeElement : null,
): boolean {
  const asElement = (node: EventTarget | Element | null): Element | null => {
    if (!node || typeof (node as Element).closest !== "function") return null;
    return node as Element;
  };

  const blocks = (node: Element | null): boolean => {
    if (!node) return false;
    return Boolean(
      node.closest(
        'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="dialog"], [data-globe-keys="off"]',
      ),
    );
  };

  if (blocks(asElement(target))) return true;
  if (blocks(asElement(activeElement))) return true;
  return false;
}

export function globeNavActionFromCode(
  code: string,
  key: string = "",
): GlobeNavAction | null {
  switch (code) {
    case "KeyW":
    case "ArrowUp":
      return { type: "pan", dir: "up" };
    case "KeyS":
    case "ArrowDown":
      return { type: "pan", dir: "down" };
    case "KeyA":
    case "ArrowLeft":
      return { type: "pan", dir: "left" };
    case "KeyD":
    case "ArrowRight":
      return { type: "pan", dir: "right" };
    case "Equal":
    case "NumpadAdd":
      return { type: "zoom", dir: 1 };
    case "Minus":
    case "NumpadSubtract":
      return { type: "zoom", dir: -1 };
    default:
      break;
  }

  // Layout fallbacks (e.g. some keyboards report key without a stable code for +)
  if (key === "+" || key === "=") return { type: "zoom", dir: 1 };
  if (key === "-" || key === "_") return { type: "zoom", dir: -1 };
  return null;
}

export function panDeltaForDirs(
  dirs: ReadonlySet<GlobeNavPanDir>,
  dtSec: number,
  pxPerSec: number = GLOBE_KEYBOARD_PAN_PX_PER_SEC,
): { dx: number; dy: number } | null {
  let x = 0;
  let y = 0;
  if (dirs.has("left")) x -= 1;
  if (dirs.has("right")) x += 1;
  if (dirs.has("up")) y -= 1;
  if (dirs.has("down")) y += 1;
  if (x === 0 && y === 0) return null;
  const len = Math.hypot(x, y) || 1;
  const step = pxPerSec * Math.min(0.05, Math.max(0, dtSec));
  return { dx: (x / len) * step, dy: (y / len) * step };
}
