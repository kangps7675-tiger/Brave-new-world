import type { ReconSatelliteMarker } from "@/lib/reconSatellitePropagate";
import { reconCountryAccent } from "@/lib/reconSatellitePropagate";
import { reconCountryLabel, reconSensorLabel } from "@/lib/reconSatellites";

export const RECON_SAT_MARKER_ROOT_CLASS = "recon-sat-marker-root";

let stylesReady = false;

function ensureStyles() {
  if (stylesReady || typeof document === "undefined") return;
  stylesReady = true;
  const style = document.createElement("style");
  style.setAttribute("data-recon-sat-markers", "1");
  style.textContent = `
    .${RECON_SAT_MARKER_ROOT_CLASS} button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      background: transparent;
      border: 0;
      padding: 0;
      cursor: pointer;
      color: inherit;
    }
    .${RECON_SAT_MARKER_ROOT_CLASS} .recon-sat-icon {
      width: 22px;
      height: 22px;
      transform-origin: 50% 50%;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.85));
    }
    .${RECON_SAT_MARKER_ROOT_CLASS} .recon-sat-dir {
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-bottom: 7px solid currentColor;
      margin-bottom: -2px;
      opacity: 0.95;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));
    }
    .${RECON_SAT_MARKER_ROOT_CLASS} button:hover .recon-sat-icon {
      filter: drop-shadow(0 0 8px rgba(148,163,184,0.55)) drop-shadow(0 1px 3px rgba(0,0,0,0.85));
    }
    .${RECON_SAT_MARKER_ROOT_CLASS} .recon-sat-label {
      max-width: 7.5rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-shadow: 0 1px 2px rgba(0,0,0,0.9);
      opacity: 0.88;
    }
  `;
  document.head.appendChild(style);
}

function satIconSvg(color: string): string {
  return `<svg class="recon-sat-icon" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="6" height="6" rx="1" fill="${color}" fill-opacity="0.35"/>
      <path d="M5 8l4 4M15 12l4 4M5 16l4-4M15 12l4-4"/>
      <circle cx="12" cy="5" r="1.2" fill="${color}"/>
      <path d="M12 6.2v2.6"/>
    </g>
  </svg>`;
}

export function createReconSatelliteBadge(
  sat: ReconSatelliteMarker,
  handlers: {
    onHover?: (sat: ReconSatelliteMarker | null) => void;
    onClick?: (sat: ReconSatelliteMarker) => void;
  },
  opts?: { lang?: "ko" | "en"; showLabel?: boolean; orbitHalo?: boolean },
): HTMLElement {
  ensureStyles();
  const lang = opts?.lang ?? "ko";
  const color = reconCountryAccent(sat.country);
  const root = document.createElement("div");
  root.className = RECON_SAT_MARKER_ROOT_CLASS;
  root.dataset.markerId = sat.markerId;
  if (opts?.orbitHalo) root.dataset.orbitHalo = "1";

  const btn = document.createElement("button");
  btn.type = "button";
  const country = reconCountryLabel(sat.country, lang);
  const sensor = reconSensorLabel(sat.sensor, lang);
  btn.title = `${sat.name}\n${country} · ${sensor}`;
  btn.setAttribute(
    "aria-label",
    lang === "en"
      ? `Recon satellite ${sat.name}, ${country}`
      : `정찰위성 ${sat.name}, ${country}`,
  );
  const heading = Number.isFinite(sat.headingDeg) ? sat.headingDeg : 0;
  // 전역 궤도 헤일로: 화살표 없이 점·아이콘만. 지도 줌: 진행 방향 표시.
  if (opts?.orbitHalo) {
    btn.innerHTML = satIconSvg(color);
  } else {
    btn.innerHTML = `<span class="recon-sat-dir" style="color:${color};transform:rotate(${heading}deg)"></span>${satIconSvg(color)}`;
  }
  const icon = btn.querySelector<SVGElement>(".recon-sat-icon");
  if (icon) {
    icon.style.transform = `rotate(${heading}deg)`;
    if (opts?.orbitHalo) {
      // 전역 궤도: 조금 작게 + 외곽 글로우로 "공간에 떠 있는" 느낌
      icon.style.width = "16px";
      icon.style.height = "16px";
      icon.style.filter = `drop-shadow(0 0 5px ${color}99) drop-shadow(0 1px 2px rgba(0,0,0,0.85))`;
    }
  }
  if (opts?.showLabel) {
    const label = document.createElement("span");
    label.className = "recon-sat-label";
    label.style.color = color;
    label.textContent = sat.name.replace(/\s+/g, " ").trim().slice(0, 18);
    btn.appendChild(label);
  }

  btn.addEventListener("pointerenter", () => handlers.onHover?.(sat));
  btn.addEventListener("pointerleave", () => handlers.onHover?.(null));
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    handlers.onClick?.(sat);
  });

  root.appendChild(btn);
  return root;
}
