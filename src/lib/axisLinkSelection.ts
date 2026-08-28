/**
 * CRINK 축 점선 클릭 → 칩 상태.
 */

import {
  AXIS_HUB_CODES,
  AXIS_EDGES,
  type AxisHubId,
  type AxisRelationKind,
} from "@/data/axisNetwork";
import type { TransportPath } from "@/data/geoTypes";

export type SelectedAxisLink = {
  pathId: string;
  mode: "network" | "arms";
  relationKind: AxisRelationKind | null;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  label: string;
  hubs: AxisHubId[];
  midLat: number;
  midLng: number;
  category?: string;
  tiv?: number | null;
  count?: number | null;
  years?: string | null;
  /** 실측 회랑 건설·제안 상태 — under-construction 등 */
  corridorStatus?: string | null;
};

const RELATION_KINDS = new Set<AxisRelationKind>([
  "patronage",
  "arms",
  "energy",
  "hybrid",
  "diplomatic",
]);

export function axisEdgeById(id: string) {
  return AXIS_EDGES.find((e) => e.id === id);
}

export function preferredAxisHub(
  from: string,
  to: string,
  hubs: AxisHubId[],
  activeHubId: AxisHubId | null,
): AxisHubId | null {
  if (activeHubId && hubs.includes(activeHubId)) return activeHubId;
  if (AXIS_HUB_CODES.has(from as AxisHubId)) return from as AxisHubId;
  if (AXIS_HUB_CODES.has(to as AxisHubId)) return to as AxisHubId;
  return hubs[0] ?? null;
}

export function selectedAxisLinkFromPath(
  path: TransportPath,
): SelectedAxisLink | null {
  if (path.kind !== "axis-link") return null;
  const meta = path.meta ?? {};
  const mode = meta.mode === "arms" ? "arms" : "network";
  const relationRaw = typeof meta.relationKind === "string" ? meta.relationKind : "";
  const relationKind = RELATION_KINDS.has(relationRaw as AxisRelationKind)
    ? (relationRaw as AxisRelationKind)
    : mode === "arms"
      ? "arms"
      : null;
  const from = typeof meta.from === "string" ? meta.from : "";
  const to = typeof meta.to === "string" ? meta.to : "";
  if (!from || !to) return null;

  // 다구간(육로↔해상) 회랑은 leg마다 path.id가 `edgeId--legN`으로 갈라진다 —
  // meta.groupId(항상 원래 edge.id)로 조회해야 어느 leg를 클릭했든 같은
  // edge/같은 회랑으로 인식되고, 아래 pathId도 그룹 전체를 가리키게 된다.
  const groupId = typeof meta.groupId === "string" && meta.groupId ? meta.groupId : path.id;
  const edge = axisEdgeById(groupId);
  const hubs = edge?.hubs?.length
    ? [...edge.hubs]
    : ([from, to].filter((c) => AXIS_HUB_CODES.has(c as AxisHubId)) as AxisHubId[]);

  const midLat =
    path.bbox != null
      ? (path.bbox.minLat + path.bbox.maxLat) / 2
      : ((path.points[0]?.lat ?? 0) + (path.points[path.points.length - 1]?.lat ?? 0)) / 2;
  const midLng =
    path.bbox != null
      ? (path.bbox.minLng + path.bbox.maxLng) / 2
      : ((path.points[0]?.lng ?? 0) + (path.points[path.points.length - 1]?.lng ?? 0)) / 2;

  return {
    // 그룹(회랑) 전체를 가리키는 id — 이걸 selectedAxisPathId로 저장해야
    // useGlobeMapGlobeProps.ts의 하이라이트/디밍이 leg 전부에 동일하게 적용된다.
    pathId: groupId,
    mode,
    relationKind,
    from,
    to,
    fromName:
      typeof meta.fromName === "string" && meta.fromName ? meta.fromName : from,
    toName: typeof meta.toName === "string" && meta.toName ? meta.toName : to,
    label: path.name || `${from}–${to}`,
    hubs,
    midLat,
    midLng,
    category: typeof meta.category === "string" ? meta.category : undefined,
    tiv: typeof meta.tiv === "number" ? meta.tiv : null,
    count: typeof meta.count === "number" ? meta.count : null,
    years: typeof meta.years === "string" ? meta.years : null,
    corridorStatus: typeof meta.status === "string" ? meta.status : null,
  };
}

/** 선택되지 않은 축 호를 흐리게 */
export function dimAxisLinkColor(
  accent: string | undefined,
  selected: boolean,
): string {
  if (selected) return accent || "rgba(167, 139, 250, 0.95)";
  const m = accent?.match(/rgba?\(([^)]+)\)/i);
  if (!m) return "rgba(148, 163, 184, 0.16)";
  const parts = m[1].split(",").map((s) => s.trim());
  if (parts.length < 3) return "rgba(148, 163, 184, 0.16)";
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, 0.16)`;
}
