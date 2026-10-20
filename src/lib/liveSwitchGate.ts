/**
 * Phase 3 — live 스위치 게이트.
 * stub → 정적 gzip → 5초 버스트 → (캐시+Worker OK) 후에만 실시간 API를 “의도적으로” 켠다.
 *
 * 실제 API_STUB_MODE 전환은 환경변수/런타임 설정. 이 모듈은 클라이언트 측 readiness 판정만 담당.
 */

import { canUseJsonParseWorker } from "@/lib/jsonParseWorkerClient";
import { isClientApiStubMode } from "@/lib/runtimeConfig.client";

export type LiveSwitchReadiness = {
  stubMode: boolean;
  workerReady: boolean;
  /** Worker·캐시 방어선이 준비되어 live로 올려도 되는지 */
  readyForLive: boolean;
  reason: string;
};

export function evaluateLiveSwitchReadiness(): LiveSwitchReadiness {
  const stubMode = isClientApiStubMode();
  const workerReady = canUseJsonParseWorker();

  if (stubMode) {
    return {
      stubMode: true,
      workerReady,
      readyForLive: false,
      reason: "API_STUB_MODE — 정적·stub 경로 유지",
    };
  }

  if (!workerReady) {
    return {
      stubMode: false,
      workerReady: false,
      readyForLive: false,
      reason: "Web Worker 미가용 — live ingest는 메인 스레드 폴백·보수 간격 유지",
    };
  }

  return {
    stubMode: false,
    workerReady: true,
    readyForLive: true,
    reason: "Worker OK — live 폴링·버스트 ingest 허용",
  };
}
