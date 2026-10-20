/**
 * 북한 미사일·무기실험 — 주황 네온 리플.
 */

import type { KoreaMissileIncident } from "@/data/koreaMissileIncidentsSeed";
import {
  KOREA_MISSILE_ANCHOR_LABEL,
  KOREA_MISSILE_KIND_LABEL,
} from "@/data/koreaMissileIncidentsSeed";
import { createNeonRippleIncidentBadge } from "@/lib/neonRippleIncidentMarker";

export function createKoreaMissileIncidentBadge(
  incident: KoreaMissileIncident & { markerId: string },
  lang: "ko" | "en",
  handlers?: {
    onHover?: (item: (KoreaMissileIncident & { markerId: string }) | null) => void;
    onClick?: (item: KoreaMissileIncident & { markerId: string }) => void;
  },
): HTMLElement {
  const kind = KOREA_MISSILE_KIND_LABEL[incident.kind][lang];
  const anchor = KOREA_MISSILE_ANCHOR_LABEL[incident.anchor][lang];
  const title = lang === "en" ? incident.titleEn : incident.titleKo;
  const body = lang === "en" ? incident.bodyEn : incident.bodyKo;

  return createNeonRippleIncidentBadge(
    {
      markerId: incident.markerId,
      accent: "orange",
      intensity: incident.intensity,
      title: `${kind} · ${anchor} · ${title}\n${body}`,
      ariaLabel: `${kind} ${title}`,
    },
    {
      onHover: (active) => handlers?.onHover?.(active ? incident : null),
      onClick: () => handlers?.onClick?.(incident),
    },
  );
}
