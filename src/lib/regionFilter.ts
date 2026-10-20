import type { ScoredEvent } from "@/data/eventTiers";
import { eventRecencyMs } from "@/data/eventTiers";
import {
  CONFLICT_ZONE_GROUP,
  INTERCONTINENTAL_GROUP,
  type NavSelection,
  type RegionBBox,
} from "@/data/navRegions";
import { HUB_DEFINITIONS } from "@/data/hubNav";
import { gdeltImportanceRankWeight } from "@/lib/gdeltImportance";

export type MenuRegionMatch = {
  id: string;
  label: string;
  groupId: string;
  parentLabel?: string;
};

type FlatMenuRegion = MenuRegionMatch & {
  bbox: RegionBBox;
  actorCountries: string[];
  strictGeo: boolean;
};

const STRICT_GEO_REGION_IDS = new Set(["taiwan", "taiwan-strait"]);

function inBBox(lat: number, lng: number, bbox: RegionBBox) {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;
}

type RegionLocateInput = {
  lat: number;
  lng: number;
  country?: string | null;
  actor1Country?: string | null;
  actor2Country?: string | null;
};

function matchesActors(event: RegionLocateInput, actors: string[] | undefined) {
  if (!actors?.length) return true;

  const codes = [event.actor1Country, event.actor2Country, event.country].filter(Boolean);
  if (codes.length === 0) return true;

  const set = new Set(actors);
  return codes.some((code) => set.has(code as string));
}

function flattenMenuRegions(): FlatMenuRegion[] {
  const regions: FlatMenuRegion[] = [];

  for (const hub of HUB_DEFINITIONS) {
    regions.push({
      id: hub.id,
      label: hub.label,
      groupId: "axis-hubs",
      bbox: hub.bbox,
      actorCountries: [hub.iso, ...hub.allies.map((a) => a.code)],
      strictGeo: false,
    });
    for (const claim of hub.claims) {
      regions.push({
        id: claim.id,
        label: claim.label,
        groupId: "axis-hubs",
        parentLabel: hub.label,
        bbox: claim.bbox,
        actorCountries: [hub.iso],
        strictGeo: false,
      });
    }
  }

  for (const group of [CONFLICT_ZONE_GROUP, INTERCONTINENTAL_GROUP]) {
    for (const item of group.items) {
      regions.push({
        id: item.id,
        label: item.label,
        groupId: group.id,
        bbox: item.bbox,
        actorCountries: item.actorCountries || [],
        strictGeo: STRICT_GEO_REGION_IDS.has(item.id),
      });

      for (const sub of item.subItems) {
        regions.push({
          id: sub.id,
          label: sub.label,
          groupId: group.id,
          parentLabel: item.label,
          bbox: sub.bbox,
          actorCountries: sub.actorCountries || [],
          strictGeo: STRICT_GEO_REGION_IDS.has(sub.id),
        });
      }
    }
  }

  return regions;
}

const MENU_REGIONS = flattenMenuRegions();
const CONFLICT_MENU_REGIONS = MENU_REGIONS.filter((region) => region.groupId === "conflict-zones");

function eventCountryCodes(event: RegionLocateInput) {
  return new Set(
    [event.country, event.actor1Country, event.actor2Country].filter(Boolean) as string[],
  );
}

function regionMatchesEvent(region: FlatMenuRegion, event: RegionLocateInput) {
  if (inBBox(event.lat, event.lng, region.bbox)) return true;
  if (region.strictGeo) return false;
  if (!region.actorCountries.length) return false;

  const codes = eventCountryCodes(event);
  if (codes.size === 0) return false;
  return region.actorCountries.some((code) => codes.has(code));
}

export function findMenuRegionForEvent(event: RegionLocateInput): MenuRegionMatch | null {
  const conflictHit = CONFLICT_MENU_REGIONS.find((region) => regionMatchesEvent(region, event));
  if (conflictHit) {
    return {
      id: conflictHit.id,
      label: conflictHit.label,
      groupId: conflictHit.groupId,
      parentLabel: conflictHit.parentLabel,
    };
  }

  const otherHit = MENU_REGIONS.find(
    (region) => region.groupId !== "conflict-zones" && regionMatchesEvent(region, event),
  );
  if (!otherHit) return null;

  return {
    id: otherHit.id,
    label: otherHit.label,
    groupId: otherHit.groupId,
    parentLabel: otherHit.parentLabel,
  };
}

export function filterEventsByNavSelection(
  events: ScoredEvent[],
  selection: NavSelection | null,
): ScoredEvent[] {
  if (!selection) return [];

  const { bbox, actorCountries } = selection;

  return events
    .filter((event) => inBBox(event.lat, event.lng, bbox))
    .filter((event) => matchesActors(event, actorCountries || []))
    .sort((a, b) => eventRecencyMs(b) - eventRecencyMs(a));
}

export type MenuCoreAlert = ScoredEvent & {
  menuRegion: MenuRegionMatch;
};

/**
 * 상단 메뉴와 연관된 지정학 핵심 속보만 추립니다.
 * war / diplomatic / alliance / protest — 최신순
 */
export function pickMenuCoreAlerts(
  events: ScoredEvent[],
  options?: {
    selection?: NavSelection | null;
    limit?: number;
  },
): MenuCoreAlert[] {
  const limit = options?.limit ?? 12;
  const selection = options?.selection ?? null;

  const scoped = selection ? filterEventsByNavSelection(events, selection) : events;

  return scoped
    .map((event) => {
      const menuRegion = findMenuRegionForEvent(event);
      if (!menuRegion) return null;

      // 지정학 4종만 (메뉴 매칭 필수)
      if (
        event.eventTier !== "war" &&
        event.eventTier !== "diplomatic" &&
        event.eventTier !== "alliance" &&
        event.eventTier !== "protest"
      ) {
        return null;
      }

      const conflictBoost = menuRegion.groupId === "conflict-zones" ? 1e12 : 0;
      const tierBoost =
        event.eventTier === "war"
          ? 4e11
          : event.eventTier === "diplomatic"
            ? 3e11
            : event.eventTier === "alliance"
              ? 2e11
              : 1e11;
      const importanceBoost = gdeltImportanceRankWeight(event.importanceGrade);

      return {
        ...event,
        menuRegion,
        alertScore: conflictBoost + importanceBoost + tierBoost + eventRecencyMs(event),
      };
    })
    .filter((event): event is MenuCoreAlert & { alertScore: number } => Boolean(event))
    .sort((a, b) => b.alertScore - a.alertScore)
    .slice(0, limit)
    .map(({ alertScore, ...event }) => {
      void alertScore;
      return event;
    });
}
