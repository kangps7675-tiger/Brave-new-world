/**
 * NOAA SWPC — planetary K-index + NOAA space weather scales (R/S/G).
 * Upstream: services.swpc.noaa.gov JSON feeds (no API key).
 */

export const SWPC_ATTRIBUTION = "Space weather: NOAA SWPC";

export type SwpcScaleLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type SwpcScales = {
  /** Radio blackouts */
  R: SwpcScaleLevel;
  /** Solar radiation storms */
  S: SwpcScaleLevel;
  /** Geomagnetic storms */
  G: SwpcScaleLevel;
};

export type SwpcSnapshot = {
  fetchedAt: string;
  /** Latest planetary Kp (0–9) */
  kp: number | null;
  kpObservedAt: string | null;
  scales: SwpcScales;
  /** Derived UI band from max(G, mapped Kp) */
  band: "quiet" | "unsettled" | "active" | "storm" | "severe";
  summaryKo: string;
  summaryEn: string;
  attribution: string;
};

type KpRow = {
  time_tag?: string;
  kp_index?: number | string;
  estimated_kp?: number | string;
};

type ScaleCell = {
  Scale?: string | null;
  Text?: string | null;
};

function clampScale(n: number): SwpcScaleLevel {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n >= 5) return 5;
  return Math.floor(n) as SwpcScaleLevel;
}

function parseScaleText(raw: string | null | undefined): SwpcScaleLevel {
  if (!raw) return 0;
  const m = String(raw).match(/[RSG]?(\d)/i);
  if (!m) return 0;
  return clampScale(Number(m[1]));
}

export function kpToBand(kp: number | null, g: SwpcScaleLevel): SwpcSnapshot["band"] {
  const gBand =
    g >= 4 ? "severe" : g >= 3 ? "storm" : g >= 2 ? "active" : g >= 1 ? "unsettled" : "quiet";
  if (kp == null) return gBand;
  const kpBand =
    kp >= 8 ? "severe" : kp >= 6 ? "storm" : kp >= 5 ? "active" : kp >= 4 ? "unsettled" : "quiet";
  const rank = { quiet: 0, unsettled: 1, active: 2, storm: 3, severe: 4 } as const;
  return rank[kpBand] >= rank[gBand] ? kpBand : gBand;
}

export function swpcBandColor(band: SwpcSnapshot["band"]): string {
  switch (band) {
    case "severe":
      return "#f43f5e";
    case "storm":
      return "#fb923c";
    case "active":
      return "#facc15";
    case "unsettled":
      return "#38bdf8";
    default:
      return "#34d399";
  }
}

export function swpcBandLabel(band: SwpcSnapshot["band"], ko: boolean): string {
  if (ko) {
    switch (band) {
      case "severe":
        return "심각";
      case "storm":
        return "폭풍";
      case "active":
        return "활성";
      case "unsettled":
        return "불안";
      default:
        return "평온";
    }
  }
  switch (band) {
    case "severe":
      return "Severe";
    case "storm":
      return "Storm";
    case "active":
      return "Active";
    case "unsettled":
      return "Unsettled";
    default:
      return "Quiet";
  }
}

function buildSummary(scales: SwpcScales, kp: number | null, band: SwpcSnapshot["band"]): {
  ko: string;
  en: string;
} {
  const g = `G${scales.G}`;
  const r = `R${scales.R}`;
  const s = `S${scales.S}`;
  const kpText = kp == null ? "—" : kp.toFixed(1);
  return {
    ko: `우주기상 ${swpcBandLabel(band, true)} · ${g}/${r}/${s} · Kp ${kpText}`,
    en: `Space weather ${swpcBandLabel(band, false)} · ${g}/${r}/${s} · Kp ${kpText}`,
  };
}

export function parseKpFeed(json: unknown): { kp: number | null; at: string | null } {
  if (!Array.isArray(json) || json.length === 0) return { kp: null, at: null };
  const last = json[json.length - 1] as KpRow;
  const raw = last.kp_index ?? last.estimated_kp;
  const kp = typeof raw === "number" ? raw : Number(raw);
  return {
    kp: Number.isFinite(kp) ? kp : null,
    at: typeof last.time_tag === "string" ? last.time_tag : null,
  };
}

export function parseNoaaScales(json: unknown): SwpcScales {
  const empty: SwpcScales = { R: 0, S: 0, G: 0 };
  if (!json || typeof json !== "object") return empty;
  const root = json as Record<string, unknown>;
  // Shape: { "0": { R: { Scale: "R0" }, S:..., G:... }, "-1": ... } — use "0" (current)
  const current = (root["0"] ?? root[0 as unknown as string] ?? Object.values(root)[0]) as
    | Record<string, ScaleCell>
    | undefined;
  if (!current || typeof current !== "object") return empty;
  return {
    R: parseScaleText(current.R?.Scale ?? current.R?.Text),
    S: parseScaleText(current.S?.Scale ?? current.S?.Text),
    G: parseScaleText(current.G?.Scale ?? current.G?.Text),
  };
}

export function buildSwpcSnapshot(
  kpFeed: unknown,
  scalesFeed: unknown,
  fetchedAt = new Date().toISOString(),
): SwpcSnapshot {
  const { kp, at } = parseKpFeed(kpFeed);
  const scales = parseNoaaScales(scalesFeed);
  const band = kpToBand(kp, scales.G);
  const summary = buildSummary(scales, kp, band);
  return {
    fetchedAt,
    kp,
    kpObservedAt: at,
    scales,
    band,
    summaryKo: summary.ko,
    summaryEn: summary.en,
    attribution: SWPC_ATTRIBUTION,
  };
}
