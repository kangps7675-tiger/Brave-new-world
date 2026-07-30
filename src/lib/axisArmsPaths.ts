import { AXIS_NODES } from "@/data/axisNetwork";
import type { AxisHubId } from "@/data/axisNetwork";
import { greatCircleArc } from "@/lib/axisNetworkPaths";
import type { TransportPath } from "@/data/geoTypes";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { armsCategoryLabel, armsCountryName } from "@/lib/axisArmsI18n";

export type AxisArmsPair = {
  supplier: string;
  recipient: string;
  tiv: number;
  count: number;
  topCategory: string;
  color: string;
  years: number[];
};

export type AxisArmsDeal = {
  supplier: string;
  recipient: string;
  designation: string;
  description: string;
  category: string;
  year: number | null;
  tiv: number;
};

export type AxisArmsPayload = {
  source: string;
  citation: string;
  yearRange: [number, number];
  pairs: AxisArmsPair[];
  deals: AxisArmsDeal[];
};

export function filterArmsForHub(payload: AxisArmsPayload | null, hub: AxisHubId) {
  if (!payload) return { pairs: [] as AxisArmsPair[], deals: [] as AxisArmsDeal[] };
  const pairs = payload.pairs.filter((p) => p.supplier === hub || p.recipient === hub);
  const deals = payload.deals.filter((d) => d.supplier === hub || d.recipient === hub);
  return { pairs, deals };
}

export function armsPairsToPaths(
  pairs: AxisArmsPair[],
  lang: LabelLanguage = "ko",
): TransportPath[] {
  const out: TransportPath[] = [];
  for (const p of pairs) {
    const na = AXIS_NODES[p.supplier];
    const nb = AXIS_NODES[p.recipient];
    if (!na || !nb) continue;
    const peakAlt = Math.min(0.18, 0.06 + Math.log10(Math.max(1, p.tiv)) * 0.04);
    const from = armsCountryName(p.supplier, lang);
    const to = armsCountryName(p.recipient, lang);
    const category = armsCategoryLabel(p.topCategory, lang);
    out.push({
      id: `arms-${p.supplier}-${p.recipient}`,
      kind: "axis-link",
      name: `${from} → ${to} · ${category} (TIV ${p.tiv})`,
      scalerank: 1,
      lengthKm: null,
      accentColor: p.color,
      bbox: {
        minLat: Math.min(na.lat, nb.lat),
        minLng: Math.min(na.lng, nb.lng),
        maxLat: Math.max(na.lat, nb.lat),
        maxLng: Math.max(na.lng, nb.lng),
      },
      points: greatCircleArc(na.lat, na.lng, nb.lat, nb.lng, 28, peakAlt),
      meta: {
        mode: "arms",
        relationKind: "arms",
        from: p.supplier,
        to: p.recipient,
        fromName: from,
        toName: to,
        category,
        tiv: p.tiv,
        count: p.count,
        years:
          p.years.length > 0
            ? `${Math.min(...p.years)}–${Math.max(...p.years)}`
            : null,
      },
    });
  }
  return out;
}
