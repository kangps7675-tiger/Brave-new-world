/**
 * 분쟁 개전 지점 — 빨간 빈 원 테두리 세 겹이 물결처럼 퍼지다 사라지는 펄스.
 * 레이어 체크박스와 무관 (단독 모드 전용).
 */

export const CONFLICT_ONSET_PULSE_ROOT = "conflict-onset-pulse-marker";
const STYLE_ID = "conflict-onset-pulse-v1";

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`style[data-${STYLE_ID}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(`data-${STYLE_ID}`, "1");
  style.textContent = `
    @keyframes conflict-onset-ring {
      0% {
        transform: translate(-50%, -50%) scale(0.22);
        opacity: 0.95;
      }
      70% {
        opacity: 0.35;
      }
      100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 0;
      }
    }
    .${CONFLICT_ONSET_PULSE_ROOT} {
      position: relative;
      width: 12px;
      height: 12px;
      pointer-events: none;
    }
    .${CONFLICT_ONSET_PULSE_ROOT} .onset-core-dot {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 6px;
      height: 6px;
      margin: -3px 0 0 -3px;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.95);
      box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.65);
    }
    .${CONFLICT_ONSET_PULSE_ROOT} .onset-ring {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 118px;
      height: 118px;
      border-radius: 9999px;
      border: 2px solid rgba(239, 68, 68, 0.9);
      background: transparent;
      box-sizing: border-box;
      animation: conflict-onset-ring 2.4s cubic-bezier(0.15, 0.65, 0.25, 1) infinite;
    }
    .${CONFLICT_ONSET_PULSE_ROOT} .onset-ring:nth-child(2) {
      animation-delay: 0s;
      border-color: rgba(248, 113, 113, 0.95);
    }
    .${CONFLICT_ONSET_PULSE_ROOT} .onset-ring:nth-child(3) {
      animation-delay: 0.8s;
      border-color: rgba(239, 68, 68, 0.75);
    }
    .${CONFLICT_ONSET_PULSE_ROOT} .onset-ring:nth-child(4) {
      animation-delay: 1.6s;
      border-color: rgba(220, 38, 38, 0.65);
    }
  `;
  document.head.appendChild(style);
}

export function createConflictOnsetPulseElement(label: string): HTMLElement {
  ensureStyles();
  const root = document.createElement("div");
  root.className = CONFLICT_ONSET_PULSE_ROOT;
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", label);

  const r1 = document.createElement("span");
  r1.className = "onset-ring";
  const r2 = document.createElement("span");
  r2.className = "onset-ring";
  const r3 = document.createElement("span");
  r3.className = "onset-ring";
  const core = document.createElement("span");
  core.className = "onset-core-dot";

  root.append(r1, r2, r3, core);
  return root;
}
