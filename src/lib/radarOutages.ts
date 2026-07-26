/**
 * Cloudflare Radar Outage Center — response normalization.
 * Upstream: GET /radar/annotations/outages → result.annotations[]
 * @see https://developers.cloudflare.com/radar/investigate/outages/
 */

export type RadarOutage = {
  id: string;
  description: string | null;
  scope: string | null;
  startDate: string;
  endDate: string | null;
  locations: string[];
  locationsDetails: Array<{ code: string; name: string }>;
  asns: number[];
  eventType: string;
  linkedUrl: string | null;
  outageCause: string | null;
  outageType: string | null;
  dataSource: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && !!item.trim());
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
}

/**
 * Cloudflare Radar `/radar/annotations/outages` returns `result.annotations`
 * (not `result.outages`). Fall back to either key for forward/backward compat.
 */
export function extractAnnotationRows(json: unknown): unknown[] {
  const root = asRecord(json);
  const result = asRecord(root?.result);
  if (!result) return [];
  const annotations = result.annotations;
  if (Array.isArray(annotations) && annotations.length > 0) return annotations;
  const outages = result.outages;
  if (Array.isArray(outages) && outages.length > 0) return outages;
  if (Array.isArray(annotations)) return annotations;
  if (Array.isArray(outages)) return outages;
  return [];
}

export function normalizeRadarOutages(json: unknown): RadarOutage[] {
  const rows = extractAnnotationRows(json);
  const out: RadarOutage[] = [];

  for (const row of rows) {
    const item = asRecord(row);
    if (!item) continue;
    const outage = asRecord(item.outage);
    const startDate = asString(item.startDate);
    if (!startDate) continue;

    const locationsDetailsRaw = Array.isArray(item.locationsDetails)
      ? item.locationsDetails
      : [];
    const locationsDetails = locationsDetailsRaw.flatMap((detail) => {
      const d = asRecord(detail);
      if (!d) return [];
      const code = asString(d.code);
      const name = asString(d.name);
      if (!code || !name) return [];
      return [{ code, name }];
    });

    const id =
      asString(item.id) ??
      `${startDate}:${asStringArray(item.locations).join(",") || "unknown"}`;

    out.push({
      id,
      description: asString(item.description),
      scope: asString(item.scope),
      startDate,
      endDate: asString(item.endDate),
      locations: asStringArray(item.locations),
      locationsDetails,
      asns: asNumberArray(item.asns),
      eventType: asString(item.eventType) ?? "OUTAGE",
      linkedUrl: asString(item.linkedUrl),
      outageCause: asString(outage?.outageCause),
      outageType: asString(outage?.outageType),
      dataSource: asString(item.dataSource),
    });
  }

  return out;
}
