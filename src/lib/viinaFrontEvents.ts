import type { UkraineControlZone } from "@/data/geoTypes";
import { ukraineControlStatusLabel } from "@/lib/ukraineSettlementLabels";

export function formatViinaControlDate(value: string | null | undefined): string {
  if (!value || !/^\d{8}$/.test(value)) return value || "N/A";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export type ViinaFrontEventKind = "contested" | "ru-occupied" | "ua-held";

export type ViinaFrontEvent = {
  id: string;
  kind: ViinaFrontEventKind;
  name: string;
  nameLong?: string | null;
  adm1?: string | null;
  adm2?: string | null;
  controlStatus: UkraineControlZone["controlStatus"];
  lat: number;
  lng: number;
  population?: number | null;
  priority: number;
};

function eventKind(status: UkraineControlZone["controlStatus"]): ViinaFrontEventKind {
  if (status === "CONTESTED") return "contested";
  if (status === "RU") return "ru-occupied";
  return "ua-held";
}

function eventPriority(status: UkraineControlZone["controlStatus"], population: number): number {
  if (status === "CONTESTED") return 100 + Math.min(40, Math.log10(Math.max(10, population)) * 8);
  if (status === "RU") return 60 + Math.min(30, Math.log10(Math.max(10, population)) * 6);
  return 20;
}

/** VIINA 셀 → Intel 시트용 전선 이벤트 (Produced Work 표시만, export 없음) */
export function buildViinaFrontEvents(zones: UkraineControlZone[]): ViinaFrontEvent[] {
  const events: ViinaFrontEvent[] = [];

  for (const zone of zones) {
    if (zone.controlStatus === "UA") continue;
    const population = zone.population ?? 0;
    events.push({
      id: zone.id,
      kind: eventKind(zone.controlStatus),
      name: zone.name || zone.nameLong || "미상 거주지",
      nameLong: zone.nameLong,
      adm1: zone.adm1,
      adm2: zone.adm2,
      controlStatus: zone.controlStatus,
      lat: zone.center.lat,
      lng: zone.center.lng,
      population: zone.population,
      priority: eventPriority(zone.controlStatus, population),
    });
  }

  return events.sort((a, b) => b.priority - a.priority);
}

export function viinaEventKindLabel(kind: ViinaFrontEventKind): string {
  if (kind === "contested") return "경합·교전";
  if (kind === "ru-occupied") return "RU 점령·주장";
  return "UA 통제";
}

export function viinaEventDetail(event: ViinaFrontEvent): string {
  const status = ukraineControlStatusLabel(event.controlStatus);
  const pop =
    event.population != null && event.population > 0
      ? ` · 인구 ${event.population.toLocaleString()}`
      : "";
  const region = [event.adm2, event.adm1].filter(Boolean).join(", ");
  return `${status}${pop}${region ? ` · ${region}` : ""}`;
}
