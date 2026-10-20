import { getNeptunTypeMeta, type NeptunLiveThreat } from "@/lib/neptun";
import { neptunThreatIconSvg } from "@/lib/neptunThreatIcons";

const ROOT_CLASS = "neptun-threat-marker-root";

export function createNeptunThreatBadge(
  threat: NeptunLiveThreat,
  handlers: {
    onHover?: (threat: NeptunLiveThreat | null) => void;
    onClick?: (threat: NeptunLiveThreat) => void;
  },
): HTMLElement {
  const meta = getNeptunTypeMeta(threat.type);
  const heading = threat.predictedHeading ?? threat.heading ?? 0;
  const pulse = threat.flying ? "neptun-threat-marker--flying" : "";
  const countBadge =
    threat.count && threat.count > 1
      ? `<span class="neptun-threat-marker__count">×${threat.count}</span>`
      : "";

  const root = document.createElement("div");
  root.className = `${ROOT_CLASS} ${pulse}`.trim();
  root.dataset.threatId = threat.id;
  root.dataset.threatType = threat.type;
  root.style.cssText =
    "position:relative;width:30px;height:30px;cursor:pointer;pointer-events:auto;transform:translate(-50%,-50%);";

  const iconSize =
    threat.type === "missile" || threat.type === "ballistic" || threat.type === "mig31k"
      ? 24
      : threat.type === "kab"
        ? 22
        : 22;

  root.innerHTML = `
    <div class="neptun-threat-marker__ring" style="border-color:${meta.color}"></div>
    <div class="neptun-threat-marker__body" data-threat-shape="${threat.type}" style="color:${meta.color};transform:rotate(${heading}deg)">
      <svg class="neptun-threat-marker__svg" viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}" aria-hidden="true" focusable="false">
        ${neptunThreatIconSvg(threat.type)}
      </svg>
    </div>
    ${countBadge}
  `;

  root.addEventListener("mouseenter", () => handlers.onHover?.(threat));
  root.addEventListener("mouseleave", () => handlers.onHover?.(null));
  root.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onClick?.(threat);
  });

  return root;
}

export function isNeptunThreatMarkerElement(el: HTMLElement): boolean {
  return el.classList.contains(ROOT_CLASS);
}
