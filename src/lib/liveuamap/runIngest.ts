/**
 * LIVEUAMAP sync 한 틱 — cron POST · GET warm 공용.
 * 실제 mpts 호출 간격은 regions.minIntervalMs + daily budget이 게이트한다.
 */

import { syncLiveuamapEvents } from "@/lib/liveuamap/fetchLiveuamap";
import { saveLiveuaControlSnapshot } from "@/lib/liveuamap/controlSnapshotStore";
import { mergeLiveuamapEvents } from "@/lib/liveuamap/store";
import type { LiveuamapControlRegionId } from "@/lib/liveuamap/types";

export type LiveuamapIngestResult = Awaited<ReturnType<typeof syncLiveuamapEvents>> & {
  controlSaved: string[];
  fetchedAt: string;
};

export async function runLiveuamapIngest(): Promise<LiveuamapIngestResult> {
  const result = await syncLiveuamapEvents();
  const fetchedAt = new Date().toISOString();
  mergeLiveuamapEvents(result.events, fetchedAt, result.error ?? null);

  const controlSaved: string[] = [];
  for (const [regionId, fc] of Object.entries(result.controls) as [
    LiveuamapControlRegionId,
    (typeof result.controls)[LiveuamapControlRegionId],
  ][]) {
    if (!fc?.features.length) continue;
    const ok = await saveLiveuaControlSnapshot(regionId, fc);
    if (ok) controlSaved.push(regionId);
  }

  return { ...result, controlSaved, fetchedAt };
}

/**
 * 관측 클라가 GET /api/liveuamap 을 폴링할 때 백그라운드 warm.
 * 시도 쿨다운은 UA 최소 간격(15분)과 맞춤 — 실제 HTTP는 budget/slot interval이 막는다.
 */
const WARM_ATTEMPT_MS = 15 * 60_000;
let lastWarmAttemptAt = 0;
let warmInFlight: Promise<void> | null = null;

export function maybeWarmLiveuamapIngest(): void {
  const now = Date.now();
  if (warmInFlight) return;
  if (lastWarmAttemptAt > 0 && now - lastWarmAttemptAt < WARM_ATTEMPT_MS) return;
  lastWarmAttemptAt = now;
  warmInFlight = runLiveuamapIngest()
    .catch(() => {
      /* GET은 캐시 스냅샷으로 응답 — warm 실패는 다음 쿨다운 후 재시도 */
    })
    .then(() => undefined)
    .finally(() => {
      warmInFlight = null;
    });
}

/** 테스트용 */
export function __resetLiveuamapWarmForTests() {
  lastWarmAttemptAt = 0;
  warmInFlight = null;
}
