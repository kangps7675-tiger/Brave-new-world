/**
 * GTA 무역조치 → 지구본 호(arc).
 *
 * GTA 레코드에는 위경도가 없다. 관할권 코드뿐이다.
 * 그래서 `countries.json` 의 국가 중심점을 조회해
 * **implementer → affected** 방향의 대권호를 그린다.
 * (briTradePaths / axisNetworkPaths 와 같은 패턴)
 *
 * 설계 원칙:
 *   - 조치 하나가 EU 27 × 상대 100개국이면 호가 2,700개가 된다.
 *     그대로 그리면 지구본이 죽는다 → **implementer 그룹 단위로 접는다.**
 *   - 색은 GTA 평가(Red/Amber/Green), 굵기는 영향 규모.
 *   - 자기 자신을 향하는 호(implementer == affected)는 버린다.
 */

import type { TransportPath } from "@/data/geoTypes";
import { greatCircleArc } from "@/lib/axisNetworkPaths";
import {
  GTA_EVALUATION_COLOR,
  type GtaEvaluation,
  type GtaIntervention,
  interventionWeight,
} from "@/lib/gta";

export type CountryCentroid = { lat: number; lng: number };
export type CentroidLookup = (iso3: string) => CountryCentroid | undefined;

/** 화면 보호 — 한 조치가 만들 수 있는 호의 상한. */
const MAX_ARCS_PER_INTERVENTION = 24;
/** 전체 상한 — 레이어 캡 정책과 같은 정신. */
const MAX_ARCS_TOTAL = 600;

function alphaForWeight(weight: number): number {
  return Math.min(0.92, Math.max(0.42, 0.38 + weight / 22));
}

function strokeForWeight(weight: number): number {
  return Math.min(3.4, Math.max(1.0, 0.9 + weight / 9));
}

function peakAltForWeight(weight: number): number {
  return Math.min(0.24, Math.max(0.06, 0.05 + weight / 90));
}

function labelFor(
  iv: GtaIntervention,
  fromIso: string,
  toIso: string,
  lang: "ko" | "en",
): string {
  const type = iv.interventionType ?? (lang === "en" ? "measure" : "조치");
  if (lang === "en") {
    return `GTA ${iv.evaluation} · ${fromIso}→${toIso} · ${type}`;
  }
  return `GTA ${iv.evaluation} · ${fromIso}→${toIso} · ${type}`;
}

/**
 * 조치 하나를 호 배열로 변환.
 *
 * implementer 가 여럿이면 (EU 등) **첫 번째만** 쓴다 —
 * 27개국이 같은 조치를 시행할 때 27벌을 그릴 이유가 없다.
 * 대신 `implementation_level: "Supranational"` 을 라벨로 구분한다.
 */
export function interventionToPaths(
  iv: GtaIntervention,
  centroid: CentroidLookup,
  lang: "ko" | "en" = "ko",
): TransportPath[] {
  const source = iv.implementers.find((j) => centroid(j.iso3));
  if (!source) return [];
  const from = centroid(source.iso3);
  if (!from) return [];

  const weight = interventionWeight(iv);
  const alpha = alphaForWeight(weight);
  const stroke = strokeForWeight(weight);
  const peakAlt = peakAltForWeight(weight);
  const baseColor = GTA_EVALUATION_COLOR[iv.evaluation];

  const paths: TransportPath[] = [];
  for (const target of iv.affected) {
    if (paths.length >= MAX_ARCS_PER_INTERVENTION) break;
    if (target.iso3 === source.iso3) continue;
    const to = centroid(target.iso3);
    if (!to) continue;

    const points = greatCircleArc(from.lat, from.lng, to.lat, to.lng, 24, peakAlt);
    paths.push({
      id: `gta-${iv.interventionId}-${source.iso3}-${target.iso3}`,
      kind: "gta-trade-measure",
      name: labelFor(iv, source.iso3, target.iso3, lang),
      scalerank: 1,
      lengthKm: null,
      accentColor: `${baseColor}, ${alpha.toFixed(3)})`,
      bbox: {
        minLat: Math.min(from.lat, to.lat),
        minLng: Math.min(from.lng, to.lng),
        maxLat: Math.max(from.lat, to.lat),
        maxLng: Math.max(from.lng, to.lng),
      },
      points,
    });
  }

  // 굵기는 렌더러가 별도 조회하므로 여기서는 색 alpha 에만 반영한다.
  void stroke;
  return paths;
}

export function gtaInterventionsToTransport(
  interventions: GtaIntervention[],
  centroid: CentroidLookup,
  lang: "ko" | "en" = "ko",
): TransportPath[] {
  // 최근·유효 조치를 먼저 — 잘릴 때 오래된 것이 먼저 잘리도록.
  const sorted = [...interventions].sort((a, b) => {
    if (a.isInForce !== b.isInForce) return a.isInForce ? -1 : 1;
    return String(b.dateAnnounced ?? "").localeCompare(String(a.dateAnnounced ?? ""));
  });

  const out: TransportPath[] = [];
  for (const iv of sorted) {
    if (out.length >= MAX_ARCS_TOTAL) break;
    out.push(...interventionToPaths(iv, centroid, lang));
  }
  return out.slice(0, MAX_ARCS_TOTAL);
}

/** 호 굵기 — 렌더러가 path 단위로 호출한다. */
export function gtaStrokeWidth(path: TransportPath): number {
  const alpha = Number(path.accentColor?.match(/,\s*([\d.]+)\)$/)?.[1] ?? 0.6);
  return Math.min(3.4, Math.max(1.0, alpha * 3.4));
}

/** 평가별 집계 — HUD 스코어보드용. */
export function summarizeByEvaluation(
  interventions: GtaIntervention[],
): Record<GtaEvaluation, number> {
  const out: Record<GtaEvaluation, number> = { Red: 0, Amber: 0, Green: 0 };
  for (const iv of interventions) out[iv.evaluation] += 1;
  return out;
}

/**
 * 특정 국가가 **받고 있는** 조치만 추린다.
 * 국가 클릭 시 "이 나라를 겨눈 무역조치" 패널에 쓴다.
 */
export function interventionsAffecting(
  interventions: GtaIntervention[],
  iso3: string,
): GtaIntervention[] {
  return interventions.filter((iv) => iv.affected.some((j) => j.iso3 === iso3));
}

/** 특정 국가가 **시행한** 조치. */
export function interventionsImplementedBy(
  interventions: GtaIntervention[],
  iso3: string,
): GtaIntervention[] {
  return interventions.filter((iv) => iv.implementers.some((j) => j.iso3 === iso3));
}
