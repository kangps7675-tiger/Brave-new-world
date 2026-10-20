import type { DisputeArea } from "@/data/geoTypes";
import { resolveDisputeCenter } from "@/lib/disputeCenter";
import { findMenuRegionForEvent, type MenuRegionMatch } from "@/lib/regionFilter";

export type DisputeAlert = DisputeArea & {
  menuRegion: MenuRegionMatch;
  alertScore: number;
};

const TENSION_SCORE = {
  high: 3,
  medium: 2,
  low: 1,
} as const;

/**
 * 로컬 분쟁 데이터(app-data disputes) 위주 경보.
 * GDELT 라이브 스트림 대신 MVP에서 쓰는 브리핑용 목록.
 */
export function pickDisputeAlerts(
  disputes: DisputeArea[] | null | undefined,
  options?: { limit?: number },
): DisputeAlert[] {
  const limit = options?.limit ?? 12;

  return (disputes ?? [])
    .map((dispute) => {
      const center = resolveDisputeCenter(dispute);
      const menuRegion =
        findMenuRegionForEvent({
          lat: center.lat,
          lng: center.lng,
          actor1Country: dispute.sovereignty,
          actor2Country: dispute.admin,
        }) || {
          id: dispute.id,
          label: dispute.name,
          groupId: "disputes",
        };

      const conflictBoost = menuRegion.groupId === "conflict-zones" ? 1_000_000 : 0;
      const alertScore =
        conflictBoost +
        TENSION_SCORE[dispute.tension] * 10_000 +
        (dispute.matchedEventCount || 0) * 10 -
        (dispute.scalerank ?? 0);

      return { ...dispute, menuRegion, alertScore };
    })
    .sort((a, b) => b.alertScore - a.alertScore)
    .slice(0, limit);
}
