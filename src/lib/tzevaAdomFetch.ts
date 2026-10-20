import { geocodeOrefRegion } from "@/lib/israelAlertZones";
import {
  OREF_ACTIVE_URL,
  OREF_HISTORY_URL,
  OREF_REQUEST_HEADERS,
  type TzevaAdomAlert,
} from "@/lib/tzevaAdom";

type RawHistoryItem = {
  data?: string;
  title?: string;
  alertDate?: string;
  cat?: number | string;
};

type RawActiveItem = {
  id?: string;
  cat?: number | string;
  title?: string;
  data?: string | string[];
  desc?: string;
};

function alertId(region: string, alertDate: string, title: string): string {
  return `${alertDate}|${region}|${title}`.replace(/\s+/g, " ").trim();
}

function toAlert(
  region: string,
  title: string,
  alertDate: string,
  active: boolean,
  category?: number,
): TzevaAdomAlert {
  const coords = geocodeOrefRegion(region);
  return {
    id: alertId(region, alertDate, title),
    region,
    title: title || "צבע אדום",
    alertDate,
    category,
    active,
    lat: coords.lat,
    lng: coords.lng,
    geocodeMatch: coords.match,
  };
}

function parseHistoryText(text: string): TzevaAdomAlert[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const alerts: TzevaAdomAlert[] = [];
  for (const item of parsed as RawHistoryItem[]) {
    const region = typeof item.data === "string" ? item.data.trim() : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const alertDate = typeof item.alertDate === "string" ? item.alertDate.trim() : "";
    if (!region || !alertDate) continue;
    const cat =
      typeof item.cat === "number"
        ? item.cat
        : typeof item.cat === "string"
          ? Number.parseInt(item.cat, 10)
          : undefined;
    alerts.push(toAlert(region, title, alertDate, false, Number.isFinite(cat) ? cat : undefined));
  }
  return alerts;
}

function parseActiveText(text: string): TzevaAdomAlert[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const alerts: TzevaAdomAlert[] = [];
  for (const item of parsed as RawActiveItem[]) {
    const title = typeof item.title === "string" ? item.title.trim() : "ירי רקטות וטילים";
    const cat =
      typeof item.cat === "number"
        ? item.cat
        : typeof item.cat === "string"
          ? Number.parseInt(item.cat, 10)
          : undefined;
    const regions = Array.isArray(item.data)
      ? item.data.filter((r): r is string => typeof r === "string")
      : typeof item.data === "string"
        ? [item.data]
        : [];
    for (const region of regions) {
      const trimmedRegion = region.trim();
      if (!trimmedRegion) continue;
      alerts.push(
        toAlert(
          trimmedRegion,
          title,
          now,
          true,
          Number.isFinite(cat) ? cat : undefined,
        ),
      );
    }
  }
  return alerts;
}

export type OrefFetchResult = {
  active: TzevaAdomAlert[];
  history: TzevaAdomAlert[];
  geoRestricted: boolean;
  error?: string;
};

export async function fetchOrefAlerts(options?: {
  historyUrl?: string;
  activeUrl?: string;
}): Promise<OrefFetchResult> {
  const historyUrl = options?.historyUrl?.trim() || OREF_HISTORY_URL;
  const activeUrl = options?.activeUrl?.trim() || OREF_ACTIVE_URL;

  try {
    const [historyRes, activeRes] = await Promise.all([
      fetch(historyUrl, { headers: OREF_REQUEST_HEADERS, cache: "no-store" }),
      fetch(activeUrl, { headers: OREF_REQUEST_HEADERS, cache: "no-store" }),
    ]);

    const historyText = historyRes.ok ? await historyRes.text() : "";
    const activeText = activeRes.ok ? await activeRes.text() : "";

    const geoRestricted =
      (!historyRes.ok && historyRes.status === 403) ||
      (!activeRes.ok && activeRes.status === 403) ||
      (historyText.length === 0 && activeText.length === 0 && (!historyRes.ok || !activeRes.ok));

    const history = parseHistoryText(historyText).slice(0, 80);
    const active = parseActiveText(activeText);

    const activeIds = new Set(active.map((a) => a.id));
    const mergedHistory = history.map((h) =>
      activeIds.has(h.id) ? { ...h, active: true } : h,
    );

    return {
      active,
      history: mergedHistory.length > 0 ? mergedHistory : active,
      geoRestricted,
      error:
        history.length === 0 && active.length === 0 && geoRestricted
          ? "Israeli IP or OREF_PROXY_URL required"
          : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Oref fetch failed";
    return { active: [], history: [], geoRestricted: false, error: message };
  }
}
