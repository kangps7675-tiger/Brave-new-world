import type { NavSelection } from "@/data/navRegions";
import { CONFLICT_ZONE_GROUP, INTERCONTINENTAL_GROUP, toNavSelection } from "@/data/navRegions";
import {
  HUB_DEFINITIONS,
  hubByNavId,
  parseHubNavId,
  selectionForHubNetwork,
} from "@/data/hubNav";
import type { NewsTheater } from "@/lib/news/types";
import { newsTheaterFromNavId } from "@/lib/news/theaterMap";
import type { TelegramAlertRegion } from "@/lib/telegramAlerts";

export type TheaterSidebarTab = "insight" | "news" | "telegram";

export type TheaterFocusConfig = {
  newsTheater: NewsTheater;
  telegramRegion: TelegramAlertRegion | "all";
  detailSelection: NavSelection;
  ctaLabel: string;
  enableUkraineLayers: boolean;
};

const CTA_BY_THEATER: Partial<Record<NewsTheater, string>> = {
  "russia-ukraine": "전선을 자세히 보고 싶다면 이 버튼을 누르세요",
  "middle-east": "중동 전선을 자세히 보려면 이 버튼을 누르세요",
  "china-taiwan": "대만해협·남중국해를 자세히 보려면 이 버튼을 누르세요",
  korea: "DMZ·한반도 전선을 자세히 보려면 이 버튼을 누르세요",
  japan: "센카쿠·오키나와·인도태평양 전장을 자세히 보려면 이 버튼을 누르세요",
  "southeast-asia": "동남아·남중국해 전선을 자세히 보려면 이 버튼을 누르세요",
  "south-america": "남미 긴장·전선을 자세히 보려면 이 버튼을 누르세요",
  africa: "아프리카 전선을 자세히 보려면 이 버튼을 누르세요",
};

/** nav id → NavSelection (허브·주장·기존 전장 모두) */
export function navSelectionFromId(id: string, parentLabel?: string): NavSelection | null {
  const hubParsed = parseHubNavId(id);
  if (hubParsed.hubId) {
    const hub = HUB_DEFINITIONS.find((h) => h.hubId === hubParsed.hubId);
    if (hub) {
      if (hubParsed.focusMode === "claim" && hubParsed.claimId) {
        const claim = hub.claims.find((c) => c.id === hubParsed.claimId);
        if (claim) {
          return {
            ...selectionForHubNetwork(hub),
            id: claim.id,
            label: claim.label,
            lat: claim.lat,
            lng: claim.lng,
            altitude: claim.altitude,
            description: claim.description,
            bbox: claim.bbox,
            focusMode: "claim",
            claimId: claim.id,
            parentLabel: hub.label,
          };
        }
      }
      return selectionForHubNetwork(hub);
    }
  }
  const hubDirect = hubByNavId(id);
  if (hubDirect) return selectionForHubNetwork(hubDirect);

  for (const group of [CONFLICT_ZONE_GROUP, INTERCONTINENTAL_GROUP]) {
    for (const item of group.items) {
      if (item.id === id) return toNavSelection(item, group.id);
      const sub = item.subItems.find((s) => s.id === id);
      if (sub) return toNavSelection(sub, group.id, parentLabel ?? item.label);
    }
  }
  return null;
}

function detailSubIdForSelection(selection: NavSelection): string | null {
  const key = selection.id.toLowerCase();
  if (key === "ukraine" || key.startsWith("ukraine-")) return "ukraine-east";
  if (key === "iran" || key === "persian-gulf" || key === "levant" || key === "hormuz") {
    return key === "iran" ? "persian-gulf" : key;
  }
  if (key === "middle-east" || key.includes("gulf") || key.includes("israel") || key.includes("yemen")) {
    return "gulf";
  }
  if (key === "taiwan" || key.includes("taiwan") || key.includes("china") || key.includes("spratly")) {
    return "taiwan-strait";
  }
  if (key === "korea" || key.includes("dmz") || key.includes("west-sea")) return "dmz";
  return null;
}

function resolveDetailSelection(selection: NavSelection): NavSelection {
  if (selection.parentLabel) return selection;
  const subId = detailSubIdForSelection(selection);
  if (!subId) return selection;
  const sub = navSelectionFromId(subId, selection.label);
  return sub ?? selection;
}

function telegramRegionForTheater(theater: NewsTheater): TelegramAlertRegion | "all" {
  if (theater === "russia-ukraine") return "ukraine";
  if (theater === "middle-east") return "middle-east";
  return "all";
}

export function theaterFocusFromNav(selection: NavSelection): TheaterFocusConfig {
  const filter = newsTheaterFromNavId(selection.id);
  const newsTheater: NewsTheater = filter === "all" ? "global" : filter;
  const detailSelection = resolveDetailSelection(selection);

  return {
    newsTheater,
    telegramRegion: telegramRegionForTheater(newsTheater),
    detailSelection,
    ctaLabel:
      CTA_BY_THEATER[newsTheater] ??
      `${selection.label} 지역을 자세히 보려면 이 버튼을 누르세요`,
    enableUkraineLayers: newsTheater === "russia-ukraine",
  };
}

export function defaultTheaterNavSelection(id: string): NavSelection | null {
  return navSelectionFromId(id);
}

export function isUkraineNavId(id: string): boolean {
  const key = id.toLowerCase();
  return key === "ukraine" || key.startsWith("ukraine-");
}
