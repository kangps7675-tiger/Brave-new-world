/**
 * 우크라이나 → 러시아 타격 — 작은 폭발·화염 마커.
 */

import type { RussiaStrikeIncident } from "@/data/russiaStrikeIncidentsSeed";
import { RUSSIA_STRIKE_KIND_LABEL } from "@/data/russiaStrikeIncidentsSeed";
import { createStrikeImpactBadge } from "@/lib/strikeImpactMarker";

export function createRussiaStrikeIncidentBadge(
  incident: RussiaStrikeIncident & { markerId: string },
  lang: "ko" | "en",
  handlers?: {
    onHover?: (item: (RussiaStrikeIncident & { markerId: string }) | null) => void;
    onClick?: (item: RussiaStrikeIncident & { markerId: string }) => void;
  },
): HTMLElement {
  const kind = RUSSIA_STRIKE_KIND_LABEL[incident.kind][lang];
  const title = lang === "en" ? incident.titleEn : incident.titleKo;
  const body = lang === "en" ? incident.bodyEn : incident.bodyKo;
  const unverified = lang === "en" ? "reported · unverified" : "보도 · 미확인";

  return createStrikeImpactBadge(
    {
      markerId: incident.markerId,
      intensity: incident.intensity,
      title: `${kind} · ${title} · ${unverified}\n${body}`,
      ariaLabel: `${kind} ${title} (${unverified})`,
    },
    {
      onHover: (active) => handlers?.onHover?.(active ? incident : null),
      onClick: () => handlers?.onClick?.(incident),
    },
  );
}
