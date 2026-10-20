/**
 * 중국 주변 해역 대치 — 빨간 네온 리플.
 */

import type { ChinaTheaterIncident } from "@/data/chinaTheaterIncidentsSeed";
import {
  CHINA_THEATER_DYAD_LABEL,
  CHINA_THEATER_SEA_LABEL,
} from "@/data/chinaTheaterIncidentsSeed";
import { createNeonRippleIncidentBadge } from "@/lib/neonRippleIncidentMarker";

/** @deprecated use NEON_RIPPLE_MARKER_ROOT — kept for DOM query compatibility */
export const CHINA_INCIDENT_MARKER_ROOT = "neon-ripple-incident-marker";

export function createChinaTheaterIncidentBadge(
  incident: ChinaTheaterIncident & { markerId: string },
  lang: "ko" | "en",
  handlers?: {
    onHover?: (item: (ChinaTheaterIncident & { markerId: string }) | null) => void;
    onClick?: (item: ChinaTheaterIncident & { markerId: string }) => void;
  },
): HTMLElement {
  const dyad = CHINA_THEATER_DYAD_LABEL[incident.dyad][lang];
  const sea = CHINA_THEATER_SEA_LABEL[incident.sea][lang];
  const title = lang === "en" ? incident.titleEn : incident.titleKo;
  const body = lang === "en" ? incident.bodyEn : incident.bodyKo;

  return createNeonRippleIncidentBadge(
    {
      markerId: incident.markerId,
      accent: "red",
      intensity: incident.intensity,
      title: `${dyad} · ${sea} · ${title}\n${body}`,
      ariaLabel: `${dyad} ${title}`,
    },
    {
      onHover: (active) => handlers?.onHover?.(active ? incident : null),
      onClick: () => handlers?.onClick?.(incident),
    },
  );
}
