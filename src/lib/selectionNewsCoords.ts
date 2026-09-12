import type { AnalysisSelection } from "@/components/globe/types";
import type { AxisHubId } from "@/data/axisNetwork";
import { newsTheaterFromCoords } from "@/lib/news/theaterMap";
import type { NewsTheater } from "@/lib/news/types";
import { navIdForNewsTheater } from "@/lib/theaterFocus";

/** 우측 지리/분석 패널 → 관련 뉴스 전장 nav id */
export function navIdForAxisHubNews(hubId: AxisHubId): string {
  switch (hubId) {
    case "CHN":
      return "taiwan";
    case "RUS":
      return "ukraine";
    case "PRK":
      return "korea";
    case "IRN":
      return "iran";
    default:
      return "middle-east";
  }
}

export function coordsFromAnalysisSelection(
  selection: AnalysisSelection,
): { lat: number; lng: number } | null {
  const item = selection.item as {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    center?: { lat?: number; lng?: number };
  };
  if (typeof item.lat === "number" && typeof item.lng === "number") {
    return { lat: item.lat, lng: item.lng };
  }
  if (typeof item.latitude === "number" && typeof item.longitude === "number") {
    return { lat: item.latitude, lng: item.longitude };
  }
  if (
    item.center &&
    typeof item.center.lat === "number" &&
    typeof item.center.lng === "number"
  ) {
    return { lat: item.center.lat, lng: item.center.lng };
  }
  return null;
}

export function newsNavIdFromCoords(lat: number, lng: number): string | null {
  const theater: NewsTheater = newsTheaterFromCoords(lat, lng);
  return navIdForNewsTheater(theater);
}
