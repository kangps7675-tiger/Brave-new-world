/** 우측 이벤트 도크 — 새로 뜰 사건 고르기 (순수 함수) */

export type DockCandidate = { id: string; at: number };

/** 열었을 때 이 시간보다 오래된 사건은 팝업으로 띄우지 않는다 */
export const DOCK_FRESH_MS = 3 * 60 * 60 * 1000;
export const DOCK_MAX_OPEN = 10;

/** 아직 안 본(닫지 않은) 최근 사건을 최신순으로 */
export function pickDockEntries<T extends DockCandidate>(
  candidates: readonly T[],
  dismissed: ReadonlySet<string>,
  now: number,
  max = DOCK_MAX_OPEN,
): T[] {
  return candidates
    .filter((c) => !dismissed.has(c.id) && Number.isFinite(c.at) && now - c.at <= DOCK_FRESH_MS)
    .sort((a, b) => b.at - a.at)
    .slice(0, max);
}
