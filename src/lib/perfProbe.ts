/**
 * 첫 프레임 FPS 프로브 — Ultra-Lite 자동 제안용.
 *
 * 배경: 기존에는 도메인 게이트에서 유저가 "내 PC는 저사양"을 **자진 신고**했다.
 * 첫 90초 재설계(2026-07)에서 이 질문은 제거됐다 — 지도를 보기도 전에
 * "당신 사양은?"을 묻는 건 첫 인상의 보상이 아니라 숙제다.
 *
 * 대신 실제 렌더 성능을 짧게 측정해서, **느릴 때만 1회 제안**한다.
 *
 * 설계 원칙:
 *  - 측정은 조용히 (UI 없음, 로그 없음)
 *  - 제안은 1회 (거절하면 그 세션에 다시 묻지 않음)
 *  - 강제 적용 없음 — 항상 유저가 수락해야 켜진다
 */

/** 측정 구간 (ms) — 부트 직후 스파이크를 피하려고 워밍업 후 측정 */
export const PERF_PROBE_WARMUP_MS = 1_200;
export const PERF_PROBE_SAMPLE_MS = 3_000;

/** 이 FPS 미만이면 "무겁다"로 판정 */
export const PERF_PROBE_LOW_FPS = 24;

/** 이 FPS 미만이면 "매우 무겁다" — 문구를 더 직접적으로 */
export const PERF_PROBE_CRITICAL_FPS = 15;

export type PerfProbeResult = {
  /** 샘플 구간 평균 FPS */
  fps: number;
  /** 측정에 쓰인 프레임 수 — 너무 적으면 신뢰할 수 없다 */
  frames: number;
  /** 실제 측정 길이 (ms) */
  durationMs: number;
  tier: "ok" | "low" | "critical";
};

export function tierForFps(fps: number): PerfProbeResult["tier"] {
  if (fps < PERF_PROBE_CRITICAL_FPS) return "critical";
  if (fps < PERF_PROBE_LOW_FPS) return "low";
  return "ok";
}

/**
 * requestAnimationFrame으로 FPS를 측정한다.
 * 탭이 백그라운드로 가면 rAF가 멈추므로 그 경우 측정을 폐기한다(null 반환).
 *
 * @returns 측정 결과. 신뢰할 수 없으면 null.
 */
export function probeFps(options?: {
  warmupMs?: number;
  sampleMs?: number;
  signal?: AbortSignal;
}): Promise<PerfProbeResult | null> {
  const warmupMs = options?.warmupMs ?? PERF_PROBE_WARMUP_MS;
  const sampleMs = options?.sampleMs ?? PERF_PROBE_SAMPLE_MS;
  const signal = options?.signal;

  if (typeof window === "undefined" || typeof requestAnimationFrame !== "function") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let rafId = 0;
    let frames = 0;
    let sampleStart = 0;
    let done = false;
    /** 측정 중 탭이 숨겨졌으면 결과를 버린다 */
    let sawHidden = document.visibilityState === "hidden";

    const onVisibility = () => {
      if (document.visibilityState === "hidden") sawHidden = true;
    };

    const finish = (result: PerfProbeResult | null) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", onVisibility);
      signal?.removeEventListener("abort", onAbort);
      resolve(result);
    };

    function onAbort() {
      finish(null);
    }

    document.addEventListener("visibilitychange", onVisibility);
    signal?.addEventListener("abort", onAbort);
    if (signal?.aborted) {
      onAbort();
      return;
    }

    const started = performance.now();

    const tick = (now: number) => {
      if (done) return;
      const elapsed = now - started;

      if (elapsed < warmupMs) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (sampleStart === 0) {
        sampleStart = now;
        frames = 0;
        rafId = requestAnimationFrame(tick);
        return;
      }

      frames += 1;
      const sampled = now - sampleStart;

      if (sampled < sampleMs) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (sawHidden || frames < 10 || sampled <= 0) {
        finish(null);
        return;
      }

      const fps = (frames * 1000) / sampled;
      finish({
        fps: Math.round(fps * 10) / 10,
        frames,
        durationMs: Math.round(sampled),
        tier: tierForFps(fps),
      });
    };

    rafId = requestAnimationFrame(tick);
  });
}
