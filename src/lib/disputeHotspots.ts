import type { DisputeArea, DisputeOverview } from "@/data/geoTypes";

/**
 * 국경·영토 분쟁 핫스팟 — disputes.json(실제 분쟁 폴리곤 432건) 중
 * dispute-overviews.json(한국어 큐레이션 개요 56건)과 매칭되는 것만 골라 만든 실데이터 리스트.
 * 좌표·설명 전부 앱에 이미 있는 실데이터이며, 새로 지어낸 값은 없음.
 */
export type DisputeHotspotEntry = {
  id: string;
  name: string;
  nameLong: string;
  center: { lat: number; lng: number };
  tension: "low" | "medium" | "high";
  type: string | null;
  note: string | null;
  overviewKo: string;
  parties: string[];
  updatedAt: string;
};

const TENSION_RANK: Record<DisputeArea["tension"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function buildDisputeHotspots(
  disputes: DisputeArea[],
  overviews: Map<string, DisputeOverview>,
): DisputeHotspotEntry[] {
  if (!Array.isArray(disputes) || disputes.length === 0 || overviews.size === 0) return [];

  const out: DisputeHotspotEntry[] = [];
  for (const d of disputes) {
    const overview = overviews.get(d.id);
    if (!overview) continue;
    out.push({
      id: d.id,
      name: d.name,
      nameLong: d.nameLong,
      center: d.center,
      tension: d.tension,
      type: d.type,
      note: d.note,
      overviewKo: overview.overviewKo,
      parties: overview.parties,
      updatedAt: overview.updatedAt,
    });
  }

  out.sort((a, b) => {
    const t = TENSION_RANK[a.tension] - TENSION_RANK[b.tension];
    if (t !== 0) return t;
    return a.name.localeCompare(b.name, "ko");
  });

  return out;
}

export function disputeHotspotById(
  hotspots: DisputeHotspotEntry[],
  id: string | null,
): DisputeHotspotEntry | null {
  if (!id) return null;
  return hotspots.find((h) => h.id === id) ?? null;
}
