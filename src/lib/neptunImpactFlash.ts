import { getNeptunTypeMeta, type NeptunThreat } from "@/lib/neptun";

export type NeptunImpactFlash = {
  id: string;
  lat: number;
  lng: number;
  type: string;
  color: string;
  createdAt: number;
  expiresAt: number;
};

export const NEPTUN_IMPACT_FLASH_MS = 2800;

export function neptunImpactCoords(threat: NeptunThreat): { lat: number; lng: number } | null {
  const trail = threat.trail ?? [];
  if (trail.length > 0) {
    const last = trail[trail.length - 1];
    if (Number.isFinite(last.lat) && Number.isFinite(last.lon)) {
      return { lat: last.lat, lng: last.lon };
    }
  }
  if (Number.isFinite(threat.lat) && Number.isFinite(threat.lon)) {
    return { lat: threat.lat, lng: threat.lon };
  }
  return null;
}

export function createNeptunImpactFlash(
  threat: NeptunThreat,
  nowMs = Date.now(),
): NeptunImpactFlash | null {
  const coords = neptunImpactCoords(threat);
  if (!coords) return null;
  const meta = getNeptunTypeMeta(threat.type);
  return {
    id: `impact-${threat.id}-${nowMs}`,
    lat: coords.lat,
    lng: coords.lng,
    type: threat.type,
    color: meta.color,
    createdAt: nowMs,
    expiresAt: nowMs + NEPTUN_IMPACT_FLASH_MS,
  };
}

const IMPACT_ROOT_CLASS = "neptun-impact-flash-root";

export function createNeptunImpactFlashElement(flash: NeptunImpactFlash): HTMLElement {
  const root = document.createElement("div");
  root.className = IMPACT_ROOT_CLASS;
  root.dataset.impactId = flash.id;
  root.style.cssText =
    "position:relative;width:56px;height:56px;pointer-events:none;transform:translate(-50%,-50%);";

  root.innerHTML = `
    <span class="neptun-impact-flash__core" style="--impact-color:${flash.color}"></span>
    <span class="neptun-impact-flash__ring" style="--impact-color:${flash.color}"></span>
    <span class="neptun-impact-flash__burst" style="--impact-color:${flash.color}"></span>
  `;

  return root;
}

export function pruneNeptunImpactFlashes(
  flashes: NeptunImpactFlash[],
  nowMs = Date.now(),
): NeptunImpactFlash[] {
  return flashes.filter((flash) => flash.expiresAt > nowMs);
}
