import {
  FINANCIAL_MARKET_HUBS,
  type FinancialMarketHub,
  type FinancialMarketHubId,
} from "@/data/financialMarketHubs";

export type HubSessionStatus = {
  hub: FinancialMarketHub;
  open: boolean;
  /** 현지 시각 HH:MM */
  localClock: string;
};

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function partsForZone(timeZone: string, at: Date) {
  let dtf = dtfCache.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    dtfCache.set(timeZone, dtf);
  }
  const parts = dtf.formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return {
    weekday,
    minutes: hour * 60 + minute,
    localClock: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function isWeekday(weekdayShort: string): boolean {
  // Sat / Sun
  return weekdayShort !== "Sat" && weekdayShort !== "Sun";
}

/** 단일 허브 — 주말 휴장, 공휴일 풀은 1차 생략 */
export function isHubMarketOpen(hub: FinancialMarketHub, at: Date = new Date()): boolean {
  const { weekday, minutes } = partsForZone(hub.timeZone, at);
  if (!isWeekday(weekday)) return false;
  return minutes >= hub.openMinutes && minutes < hub.closeMinutes;
}

export function hubSessionStatuses(at: Date = new Date()): HubSessionStatus[] {
  return FINANCIAL_MARKET_HUBS.map((hub) => {
    const { localClock } = partsForZone(hub.timeZone, at);
    return {
      hub,
      open: isHubMarketOpen(hub, at),
      localClock,
    };
  });
}

export function openHubCount(at: Date = new Date()): {
  open: number;
  total: number;
} {
  const statuses = hubSessionStatuses(at);
  return {
    open: statuses.filter((s) => s.open).length,
    total: statuses.length,
  };
}

export function hubById(id: FinancialMarketHubId): FinancialMarketHub | undefined {
  return FINANCIAL_MARKET_HUBS.find((h) => h.id === id);
}
