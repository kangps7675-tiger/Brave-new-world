/**
 * 네온 점 + 물방울 리플 — 중국 대치(빨강) / 북한 미사일(주황) / 우크라 GDELT(시안) 공용.
 */

export type NeonRippleAccent = "red" | "orange" | "cyan" | "blue" | "white";

export const NEON_RIPPLE_MARKER_ROOT = "neon-ripple-incident-marker";

const ACCENT_CSS: Record<
  NeonRippleAccent,
  { border: string; glow: string; core: string; keyGlow: string }
> = {
  red: {
    border: "rgba(255, 70, 85, 0.85)",
    glow: "rgba(239, 68, 68, 0.45)",
    core: "radial-gradient(circle at 35% 30%, #fff5f5 0%, #ff4d5a 42%, #b91c1c 100%)",
    keyGlow: `
      0%, 100% {
        box-shadow:
          0 0 4px 1px rgba(255, 80, 90, 0.95),
          0 0 10px 3px rgba(239, 68, 68, 0.55);
      }
      50% {
        box-shadow:
          0 0 6px 2px rgba(255, 120, 130, 1),
          0 0 16px 5px rgba(239, 68, 68, 0.75);
      }`,
  },
  orange: {
    border: "rgba(255, 160, 60, 0.9)",
    glow: "rgba(251, 146, 60, 0.5)",
    core: "radial-gradient(circle at 35% 30%, #fff7ed 0%, #fb923c 42%, #c2410c 100%)",
    keyGlow: `
      0%, 100% {
        box-shadow:
          0 0 4px 1px rgba(255, 180, 80, 0.95),
          0 0 10px 3px rgba(251, 146, 60, 0.55);
      }
      50% {
        box-shadow:
          0 0 6px 2px rgba(255, 200, 120, 1),
          0 0 16px 5px rgba(249, 115, 22, 0.8);
      }`,
  },
  /** UA 전선 언어 · sky `#38bdf8` / electric cyan `#45f3ff` */
  cyan: {
    border: "rgba(69, 243, 255, 0.92)",
    glow: "rgba(56, 189, 248, 0.55)",
    core: "radial-gradient(circle at 35% 30%, #e0f7ff 0%, #38bdf8 42%, #0284c7 100%)",
    keyGlow: `
      0%, 100% {
        box-shadow:
          0 0 5px 1px rgba(69, 243, 255, 0.95),
          0 0 12px 4px rgba(56, 189, 248, 0.5),
          0 0 22px 8px rgba(14, 165, 233, 0.28);
      }
      50% {
        box-shadow:
          0 0 7px 2px rgba(125, 211, 252, 1),
          0 0 18px 6px rgba(56, 189, 248, 0.7),
          0 0 28px 10px rgba(69, 243, 255, 0.4);
      }`,
  },
  blue: {
    border: "rgba(96, 165, 250, 0.92)",
    glow: "rgba(59, 130, 246, 0.5)",
    core: "radial-gradient(circle at 35% 30%, #eff6ff 0%, #60a5fa 42%, #1d4ed8 100%)",
    keyGlow: `
      0%, 100% {
        box-shadow:
          0 0 4px 1px rgba(147, 197, 253, 0.95),
          0 0 10px 3px rgba(59, 130, 246, 0.55);
      }
      50% {
        box-shadow:
          0 0 6px 2px rgba(191, 219, 254, 1),
          0 0 16px 5px rgba(37, 99, 235, 0.75);
      }`,
  },
  white: {
    border: "rgba(255, 255, 255, 0.9)",
    glow: "rgba(248, 250, 252, 0.55)",
    core: "radial-gradient(circle at 35% 30%, #ffffff 0%, #e2e8f0 45%, #94a3b8 100%)",
    keyGlow: `
      0%, 100% {
        box-shadow:
          0 0 4px 1px rgba(255, 255, 255, 0.95),
          0 0 10px 3px rgba(226, 232, 240, 0.55);
      }
      50% {
        box-shadow:
          0 0 6px 2px rgba(255, 255, 255, 1),
          0 0 16px 5px rgba(248, 250, 252, 0.8);
      }`,
  },
};

const STYLE_VERSION = "blue-white-v1";

function ensureStyles() {
  if (typeof document === "undefined") return;
  const existing = document.querySelector(`style[data-neon-ripple-incident-markers="${STYLE_VERSION}"]`);
  if (existing) return;
  document.querySelectorAll("style[data-neon-ripple-incident-markers]").forEach((el) => el.remove());
  const style = document.createElement("style");
  style.setAttribute("data-neon-ripple-incident-markers", STYLE_VERSION);
  style.textContent = `
    @keyframes neon-ripple-wave {
      0% {
        transform: translate(-50%, -50%) scale(0.35);
        opacity: 0.85;
      }
      70% {
        opacity: 0.25;
      }
      100% {
        transform: translate(-50%, -50%) scale(1.55);
        opacity: 0;
      }
    }
    @keyframes neon-ripple-core-red { ${ACCENT_CSS.red.keyGlow} }
    @keyframes neon-ripple-core-orange { ${ACCENT_CSS.orange.keyGlow} }
    @keyframes neon-ripple-core-cyan { ${ACCENT_CSS.cyan.keyGlow} }
    @keyframes neon-ripple-core-blue { ${ACCENT_CSS.blue.keyGlow} }
    @keyframes neon-ripple-core-white { ${ACCENT_CSS.white.keyGlow} }
    .${NEON_RIPPLE_MARKER_ROOT} {
      position: relative;
      width: 28px;
      height: 28px;
      pointer-events: auto;
      transform: translate(-50%, -50%);
      cursor: pointer;
    }
    .${NEON_RIPPLE_MARKER_ROOT} .neon-ripple-wave {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 22px;
      height: 22px;
      border-radius: 9999px;
      animation: neon-ripple-wave 2.4s ease-out infinite;
      pointer-events: none;
    }
    .${NEON_RIPPLE_MARKER_ROOT} .neon-ripple-wave:nth-child(2) {
      animation-delay: 0.8s;
    }
    .${NEON_RIPPLE_MARKER_ROOT} .neon-ripple-wave:nth-child(3) {
      animation-delay: 1.6s;
    }
    .${NEON_RIPPLE_MARKER_ROOT} .neon-ripple-core {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 7px;
      height: 7px;
      margin: -3.5px 0 0 -3.5px;
      border-radius: 9999px;
      pointer-events: none;
    }
    .${NEON_RIPPLE_MARKER_ROOT}[data-accent="red"] .neon-ripple-wave {
      border: 1.5px solid ${ACCENT_CSS.red.border};
      box-shadow: 0 0 8px 1px ${ACCENT_CSS.red.glow};
    }
    .${NEON_RIPPLE_MARKER_ROOT}[data-accent="red"] .neon-ripple-core {
      background: ${ACCENT_CSS.red.core};
      animation: neon-ripple-core-red 1.8s ease-in-out infinite;
    }
    .${NEON_RIPPLE_MARKER_ROOT}[data-accent="orange"] .neon-ripple-wave {
      border: 1.5px solid ${ACCENT_CSS.orange.border};
      box-shadow: 0 0 8px 1px ${ACCENT_CSS.orange.glow};
    }
    .${NEON_RIPPLE_MARKER_ROOT}[data-accent="orange"] .neon-ripple-core {
      background: ${ACCENT_CSS.orange.core};
      animation: neon-ripple-core-orange 1.8s ease-in-out infinite;
    }
    .${NEON_RIPPLE_MARKER_ROOT}[data-accent="cyan"] .neon-ripple-wave {
      border: 1.5px solid ${ACCENT_CSS.cyan.border};
      box-shadow: 0 0 10px 1px ${ACCENT_CSS.cyan.glow};
    }
    .${NEON_RIPPLE_MARKER_ROOT}[data-accent="cyan"] .neon-ripple-core {
      background: ${ACCENT_CSS.cyan.core};
      animation: neon-ripple-core-cyan 1.8s ease-in-out infinite;
    }
    .${NEON_RIPPLE_MARKER_ROOT}[data-accent="blue"] .neon-ripple-wave {
      border: 1.5px solid ${ACCENT_CSS.blue.border};
      box-shadow: 0 0 8px 1px ${ACCENT_CSS.blue.glow};
    }
    .${NEON_RIPPLE_MARKER_ROOT}[data-accent="blue"] .neon-ripple-core {
      background: ${ACCENT_CSS.blue.core};
      animation: neon-ripple-core-blue 1.8s ease-in-out infinite;
    }
    .${NEON_RIPPLE_MARKER_ROOT}[data-accent="white"] .neon-ripple-wave {
      border: 1.5px solid ${ACCENT_CSS.white.border};
      box-shadow: 0 0 8px 1px ${ACCENT_CSS.white.glow};
    }
    .${NEON_RIPPLE_MARKER_ROOT}[data-accent="white"] .neon-ripple-core {
      background: ${ACCENT_CSS.white.core};
      animation: neon-ripple-core-white 1.8s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

export function createNeonRippleIncidentBadge(
  opts: {
    markerId: string;
    accent: NeonRippleAccent;
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
  root.className = NEON_RIPPLE_MARKER_ROOT;
  root.dataset.markerId = opts.markerId;
  root.dataset.accent = opts.accent;
  root.title = opts.title;
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", opts.ariaLabel);
  root.style.opacity = String(0.72 + intensity * 0.28);

  for (let i = 0; i < 3; i += 1) {
    const wave = document.createElement("span");
    wave.className = "neon-ripple-wave";
    const size = 18 + intensity * 8;
    wave.style.width = `${size}px`;
    wave.style.height = `${size}px`;
    root.appendChild(wave);
  }

  const core = document.createElement("span");
  core.className = "neon-ripple-core";
  root.appendChild(core);

  root.addEventListener("mouseenter", () => handlers?.onHover?.(true));
  root.addEventListener("mouseleave", () => handlers?.onHover?.(false));
  root.addEventListener("click", (ev) => {
    ev.stopPropagation();
    handlers?.onClick?.();
  });

  return root;
}
