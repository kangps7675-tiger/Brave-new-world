import { AXIS_HUB_META, AXIS_NODES, AXIS_RELATION_COLORS } from "@/data/axisNetwork";
import type { AxisHubId } from "@/data/axisNetwork";
import { greatCircleArc } from "@/lib/axisNetworkPaths";
import {
  colorForGroupId,
  corridorLegPointsForPair,
  legModeLabelKo,
} from "@/lib/strategicCorridorPaths";
import type { TransportPath, TransportPathPoint } from "@/data/geoTypes";
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

function bboxFromPoints(
  points: TransportPathPoint[],
  fallbackLat: number,
  fallbackLng: number,
) {
  return points.reduce(
    (acc, p) => ({
      minLat: Math.min(acc.minLat, p.lat),
      minLng: Math.min(acc.minLng, p.lng),
      maxLat: Math.max(acc.maxLat, p.lat),
      maxLng: Math.max(acc.maxLng, p.lng),
    }),
    { minLat: fallbackLat, minLng: fallbackLng, maxLat: fallbackLat, maxLng: fallbackLng },
  );
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
    // 기본색은 공급국(없으면 수령국) 허브 고유색 — 축 관계망(axisNetworkPaths)과
    // 동일한 국가색 팔레트를 써서 "그 나라 웹"으로 자연스럽게 이어져 보인다.
    const groupId = `arms-${p.supplier}-${p.recipient}`;
    const baseColor =
      AXIS_HUB_META[p.supplier as AxisHubId]?.color ??
      AXIS_HUB_META[p.recipient as AxisHubId]?.color ??
      colorForGroupId(groupId);
    // 호버 시 드러날 색 — 군수 관계는 항상 "빨강 = 군수"로 통일.
    const hoverColor = AXIS_RELATION_COLORS.arms;
    const baseMeta = {
      mode: "arms" as const,
      relationKind: "arms" as const,
      from: p.supplier,
      to: p.recipient,
      fromName: from,
      toName: to,
      category,
      tiv: p.tiv,
      count: p.count,
      years:
        p.years.length > 0 ? `${Math.min(...p.years)}–${Math.max(...p.years)}` : null,
      hoverColor,
    };

    // groupId 기준 색 — 여러 leg로 쪼개져도 전부 같은 색이라 한 회랑처럼 보인다.
    const accentColor = baseColor;

    // 카스피해 드론·군수 이송로 등 실측 회랑이 등록된 공급자-수령자 쌍이면
    // 수도 간 단일 대권 호 대신 그 실제 경로(육로↔해상 다구간)를 각각 별도 feature로
    // 쓴다 — 해상 구간(카스피해 도하 등)은 meta.legMode === "sea"로 표기해 호출부에서
    // 점선("페리로 갈아탄다")으로 그리게 한다.
    const legs = corridorLegPointsForPair(p.supplier, p.recipient, peakAlt);
    if (!legs) {
      out.push({
        id: groupId,
        kind: "axis-link",
        name: `${from} → ${to} · ${category} (TIV ${p.tiv})`,
        scalerank: 1,
        lengthKm: null,
        accentColor,
        bbox: {
          minLat: Math.min(na.lat, nb.lat),
          minLng: Math.min(na.lng, nb.lng),
          maxLat: Math.max(na.lat, nb.lat),
          maxLng: Math.max(na.lng, nb.lng),
        },
        points: greatCircleArc(na.lat, na.lng, nb.lat, nb.lng, 28, peakAlt),
        meta: { ...baseMeta, geometrySource: "great-circle", groupId, legIndex: 0 },
      });
      continue;
    }

    legs.forEach((leg, i) => {
      out.push({
        id: legs.length > 1 ? `${groupId}--leg${i}` : groupId,
        kind: "axis-link",
        name:
          legs.length > 1
            ? `${from} → ${to} · ${category} (${legModeLabelKo(leg.mode)} 구간)`
            : `${from} → ${to} · ${category} (TIV ${p.tiv})`,
        scalerank: 1,
        lengthKm: leg.lengthKm,
        accentColor,
        bbox: bboxFromPoints(leg.points, na.lat, na.lng),
        points: leg.points,
        meta: {
          ...baseMeta,
          geometrySource: "real-corridor",
          // path.id는 leg가 여러 개면 갈라지므로, 선택·글린트 그룹핑은 항상 groupId로.
          groupId,
          legIndex: i,
          legMode: leg.mode,
          totalLegs: legs.length,
          // 건설중인 실측 회랑이면 호출부가 글린트를 막는다.
          status: leg.status,
        },
      });
    });
  }
  return out;
}
