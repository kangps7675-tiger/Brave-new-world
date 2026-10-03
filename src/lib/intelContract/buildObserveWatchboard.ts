import type { CesiumAlertItem } from "@/lib/cesiumAlerts";
import { gateCesiumAlert } from "@/lib/intelContract/adapters/fromEconomyAlert";
import { gateTheaterSitrep } from "@/lib/intelContract/adapters/fromTheaterSitrep";
import { canPublish } from "@/lib/intelContract/publish";
import {
  matchPirsForOrigin,
  pirFulfillment,
  type PirId,
} from "@/lib/intelContract/pirRegistry";
import type { DisplayGrade, GateResult } from "@/lib/intelContract/types";
import { buildTheaterSitrep } from "@/lib/theaterReport/buildTheaterSitrep";
import type { TheaterSitrepRegionId } from "@/lib/theaterReport/types";
import { THEATER_SITREP_REGIONS } from "@/lib/theaterReport/types";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import type { NewsStreamItem } from "@/lib/news/types";

export type WatchboardItemKind = "theater-sitrep" | "maritime-alert" | "hold";

export type WatchboardItem = {
  id: string;
  kind: WatchboardItemKind;
  grade: DisplayGrade;
  titleKo: string;
  titleEn: string;
  subtitleKo: string;
  subtitleEn: string;
  gate: GateResult;
  pirIds: PirId[];
  pirScore: number;
  /** open theater book */
  sitrepRegion?: TheaterSitrepRegionId;
  /** open cesium alert */
  cesiumAlertId?: string;
};

const GRADE_ORDER: Record<DisplayGrade, number> = {
  high: 5,
  std: 4,
  low: 3,
  hold: 2,
  drop: 0,
};

export function buildObserveWatchboard(input: {
  liveuaEvents: LiveuamapEvent[];
  rssItems: NewsStreamItem[];
  cesiumAlerts: CesiumAlertItem[];
  lang?: "ko" | "en";
}): WatchboardItem[] {
  const lang = input.lang ?? "ko";
  const items: WatchboardItem[] = [];

  for (const regionId of THEATER_SITREP_REGIONS) {
    const doc = buildTheaterSitrep({
      regionId,
      events: input.liveuaEvents,
      rssItems: input.rssItems,
      windowHours: 72,
      lang,
    });
    const gate = gateTheaterSitrep(doc);
    if (!canPublish("watchboard", gate.grade)) continue;

    const pirs = matchPirsForOrigin({ sitrepRegion: regionId });
    const mods = new Set(gate.bundle.observations.map((o) => o.modality));
    const pirScore =
      pirs.length === 0
        ? 0
        : Math.max(...pirs.map((p) => pirFulfillment(p, mods)));

    items.push({
      id: `sitrep:${regionId}`,
      kind: gate.grade === "hold" ? "hold" : "theater-sitrep",
      grade: gate.grade,
      titleKo: doc.titleKo,
      titleEn: doc.titleEn,
      subtitleKo: doc.coverageNoteKo,
      subtitleEn: doc.coverageNoteEn,
      gate,
      pirIds: pirs.map((p) => p.id),
      pirScore,
      sitrepRegion: regionId,
    });
  }

  for (const alert of input.cesiumAlerts.slice(0, 24)) {
    const gate = gateCesiumAlert(alert);
    if (!canPublish("watchboard", gate.grade)) continue;
    if (gate.grade === "drop") continue;

    const theme =
      alert.kind === "portwatch" || alert.kind === "ukmto" || alert.kind === "navarea"
        ? ("chokepoint" as const)
        : null;
    const pirs = matchPirsForOrigin({ theme });
    const mods = new Set(gate.bundle.observations.map((o) => o.modality));
    const pirScore =
      pirs.length === 0
        ? 0.2
        : Math.max(...pirs.map((p) => pirFulfillment(p, mods)));

    items.push({
      id: `alert:${alert.id}`,
      kind: gate.grade === "hold" ? "hold" : "maritime-alert",
      grade: gate.grade,
      titleKo: alert.title,
      titleEn: alert.title,
      subtitleKo: alert.detail,
      subtitleEn: alert.detail,
      gate,
      pirIds: pirs.map((p) => p.id),
      pirScore,
      cesiumAlertId: alert.id,
    });
  }

  items.sort((a, b) => {
    const pir = b.pirScore - a.pirScore;
    if (Math.abs(pir) > 0.05) return pir;
    return GRADE_ORDER[b.grade] - GRADE_ORDER[a.grade];
  });

  return items;
}
