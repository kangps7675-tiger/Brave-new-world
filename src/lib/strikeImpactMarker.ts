/**
 * 타격 지점 — 작은 폭발 플래시 + 화염 깜빡임 + 확산 충격파 링.
 * 우크라이나 → 러시아 타격(보도·미확인)용. 순수 시각 효과(라이선스 무관).
 *
 * 궤적은 표현하지 않는다 — 러시아 방향 궤적 데이터는 공개 소스가 없어
 * 지어내지 않는다는 원칙. "어디를 때렸다"(지점)만 불꽃으로 표시한다.
 */

export const STRIKE_IMPACT_MARKER_ROOT = "strike-impact-marker";

const STYLE_VERSION = "strike-impact-v1";

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`style[data-strike-impact-markers="${STYLE_VERSION}"]`)) return;
  document
    .querySelectorAll("style[data-strike-impact-markers]")
    .forEach((el) => el.remove());
  const style = document.createElement("style");
  style.setAttribute("data-strike-impact-markers", STYLE_VERSION);
  style.textContent = `
    @keyframes strike-shock {
      0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0.9; }
      70%  { opacity: 0.2; }
      100% { transform: translate(-50%, -50%) scale(1.7); opacity: 0; }
    }
    @keyframes strike-flame {
      0%, 100% {
        transform: translate(-50%, -50%) scale(0.9);
        opacity: 0.85;
        filter: blur(0.4px);
      }
      50% {
        transform: translate(-50%, -55%) scale(1.15);
        opacity: 1;
        filter: blur(0.2px);
      }
    }
    @keyframes strike-core {
      0%, 100% {
        box-shadow: 0 0 5px 1px rgba(255,180,80,0.95), 0 0 12px 4px rgba(255,90,30,0.6);
      }
      50% {
        box-shadow: 0 0 8px 2px rgba(255,230,150,1), 0 0 18px 7px rgba(255,110,40,0.85);
      }
    }
    .${STRIKE_IMPACT_MARKER_ROOT} {
      position: relative;
      width: 26px;
      height: 26px;
      pointer-events: auto;
      transform: translate(-50%, -50%);
      cursor: pointer;
      transition: transform 0.12s ease-out, filter 0.12s ease-out;
    }
    .${STRIKE_IMPACT_MARKER_ROOT}:hover {
      transform: translate(-50%, -50%) scale(1.35);
      filter: brightness(1.5) drop-shadow(0 0 6px rgba(255,180,90,0.6));
      z-index: 5;
    }
    .${STRIKE_IMPACT_MARKER_ROOT}:focus-visible {
      outline: 2px solid rgba(255,220,150,0.85);
      outline-offset: 2px;
      border-radius: 9999px;
    }
    /* 확산 충격파 링 */
    .${STRIKE_IMPACT_MARKER_ROOT} .strike-shock {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 20px;
      height: 20px;
      border-radius: 9999px;
      border: 1.5px solid rgba(255,150,60,0.8);
      box-shadow: 0 0 8px 1px rgba(255,110,40,0.5);
      animation: strike-shock 2s ease-out infinite;
      pointer-events: none;
    }
    .${STRIKE_IMPACT_MARKER_ROOT} .strike-shock:nth-child(2) { animation-delay: 0.9s; }
    /* 화염 (물방울 모양) */
    .${STRIKE_IMPACT_MARKER_ROOT} .strike-flame {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 8px;
      height: 11px;
      margin: 0;
      border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
      background: radial-gradient(circle at 50% 70%, #fff3c4 0%, #ffb733 38%, #ff5a1e 72%, #b91c1c 100%);
      animation: strike-flame 0.55s ease-in-out infinite;
      pointer-events: none;
    }
    /* 밝은 중심핵 */
    .${STRIKE_IMPACT_MARKER_ROOT} .strike-core {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 6px;
      height: 6px;
      margin: -3px 0 0 -3px;
      border-radius: 9999px;
      background: radial-gradient(circle at 40% 35%, #fffbe6 0%, #ffcf6b 45%, #ff7a2e 100%);
      animation: strike-core 1.4s ease-in-out infinite;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

export function createStrikeImpactBadge(
  opts: {
    markerId: string;
    intensity: number;
    title: string;
    ariaLabel: string;
  },
  handlers?: {
    onHover?: (active: boolean) => void;
    onClick?: () => void;
  },
): HTMLElement {
  ensureStyles();
  const intensity = Math.min(1, Math.max(0.35, opts.intensity));
  const root = document.createElement("div");
  root.className = STRIKE_IMPACT_MARKER_ROOT;
  root.dataset.markerId = opts.markerId;
  root.title = opts.title;
  root.setAttribute("role", "button");
  root.setAttribute("tabindex", "0");
  root.setAttribute("aria-label", opts.ariaLabel);
  root.style.opacity = String(0.72 + intensity * 0.28);

  for (let i = 0; i < 2; i += 1) {
    const shock = document.createElement("span");
    shock.className = "strike-shock";
    const size = 16 + intensity * 8;
    shock.style.width = `${size}px`;
    shock.style.height = `${size}px`;
    root.appendChild(shock);
  }

  const flame = document.createElement("span");
  flame.className = "strike-flame";
  root.appendChild(flame);

  const core = document.createElement("span");
  core.className = "strike-core";
  root.appendChild(core);

  root.addEventListener("mouseenter", () => handlers?.onHover?.(true));
  root.addEventListener("mouseleave", () => handlers?.onHover?.(false));
  root.addEventListener("click", (ev) => {
    ev.stopPropagation();
    handlers?.onClick?.();
  });
  root.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      ev.stopPropagation();
      handlers?.onClick?.();
    }
  });

  return root;
}
