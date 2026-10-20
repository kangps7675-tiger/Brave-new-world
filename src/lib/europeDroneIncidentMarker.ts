/**
 * 유럽 드론·영공 침범 — 주황 네온 리플.
 */

import type { EuropeDroneIncident } from "@/data/europeDroneIncursionSeed";
import { DRONE_INCIDENT_KIND_LABEL } from "@/data/europeDroneIncursionSeed";
import { createNeonRippleIncidentBadge } from "@/lib/neonRippleIncidentMarker";

export function createEuropeDroneIncidentBadge(
  incident: EuropeDroneIncident & { markerId: string },
  lang: "ko" | "en",
  handlers?: {
    onHover?: (item: (EuropeDroneIncident & { markerId: string }) | null) => void;
    onClick?: (item: EuropeDroneIncident & { markerId: string }) => void;
  },
): HTMLElement {
  const kind = DRONE_INCIDENT_KIND_LABEL[incident.kind][lang];
  const title = lang === "en" ? incident.titleEn : incident.titleKo;
  const body = lang === "en" ? incident.bodyEn : incident.bodyKo;

  return createNeonRippleIncidentBadge(
    {
      markerId: incident.markerId,
      accent: "orange",
      intensity: incident.intensity,
      title: `${kind} · ${title}\n${body}`,
      ariaLabel: `${kind} ${title}`,
    },
    {
      onHover: (active) => handlers?.onHover?.(active ? incident : null),
      onClick: () => handlers?.onClick?.(incident),
    },
  );
}
