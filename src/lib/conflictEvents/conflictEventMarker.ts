import { createNeonRippleIncidentBadge } from "@/lib/neonRippleIncidentMarker";
import type { ConflictEventHtmlMarker } from "@/lib/conflictEvents/buildLayer";
import { CONFLICT_CATEGORY_LABEL } from "@/lib/conflictEvents/categoryKeywords";

export function createConflictEventBadge(
  incident: ConflictEventHtmlMarker,
  lang: "ko" | "en",
  handlers?: {
    onHover?: (item: ConflictEventHtmlMarker | null) => void;
    onClick?: (item: ConflictEventHtmlMarker) => void;
  },
): HTMLElement {
  const cat = CONFLICT_CATEGORY_LABEL[incident.category][lang];
  const title = lang === "en" ? incident.titleEn : incident.titleKo;
  const body = lang === "en" ? incident.bodyEn : incident.bodyKo;
  return createNeonRippleIncidentBadge(
    {
      markerId: incident.markerId,
      accent: incident.accent,
      intensity: incident.intensity,
      title: `${cat} · ${title}\n${body}`,
      ariaLabel: `${cat} ${title}`,
      perspectiveCount: incident.perspectiveCount,
      evidenceTier: incident.evidenceTier,
      lang,
    },
    {
      onHover: (active) => handlers?.onHover?.(active ? incident : null),
      onClick: () => handlers?.onClick?.(incident),
    },
  );
}
