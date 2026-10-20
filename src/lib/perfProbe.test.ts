import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  PERF_PROBE_CRITICAL_FPS,
  PERF_PROBE_LOW_FPS,
  probeFps,
  tierForFps,
} from "@/lib/perfProbe";

describe("tierForFps", () => {
  it("60fps는 ok", () => {
    expect(tierForFps(60)).toBe("ok");
  });

  it("경계값 — 캡과 정확히 같으면 ok (미만일 때만 강등)", () => {
    expect(tierForFps(PERF_PROBE_LOW_FPS)).toBe("ok");
    expect(tierForFps(PERF_PROBE_LOW_FPS - 0.1)).toBe("low");
    expect(tierForFps(PERF_PROBE_CRITICAL_FPS)).toBe("low");
    expect(tierForFps(PERF_PROBE_CRITICAL_FPS - 0.1)).toBe("critical");
  });
});

/**
 * probeFps는 rAF·visibilitychange에 의존한다.
 * 가짜 rAF로 프레임을 원하는 속도로 흘려보내며 판정을 검증한다.
 */
describe("probeFps", () => {
  let now = 0;
  let callbacks: Array<(t: number) => void> = [];
  let visibility: DocumentVisibilityState = "visible";
  const visibilityListeners: Array<() => void> = [];

  /** 지정한 fps로 ms만큼 프레임을 흘린다 */
  function runFrames(ms: number, fps: number) {
    const step = 1000 / fps;
    const end = now + ms;
    while (now < end) {
      now += step;
      const due = callbacks;
      callbacks = [];
      for (const cb of due) cb(now);
    }
  }

  beforeEach(() => {
    now = 0;
    callbacks = [];
    visibility = "visible";
    visibilityListeners.length = 0;

    /**
     * ⚠️ window 스텁 필수 — probeFps가 `typeof window === "undefined"`로 조기 반환한다.
     * 이걸 빼면 모든 케이스가 즉시 null이 되어, "null을 기대하는" 테스트들이
     * **거짓 통과**한다 (탭 숨김·abort 안전장치가 검증되지 않은 채 초록불).
     */
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.stubGlobal("document", {
      get visibilityState() {
        return visibility;
      },
      addEventListener: (type: string, fn: () => void) => {
        if (type === "visibilitychange") visibilityListeners.push(fn);
      },
      removeEventListener: () => {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * 가드 테스트 — 아래 "폐기" 테스트들이 window 스텁 누락으로 거짓 통과하는 걸 막는다.
   * 이 테스트가 실패하면 하니스가 망가진 것이지 로직 문제가 아니다.
   */
  it("하니스 검증 — 정상 조건에서는 실제 측정값이 나온다", async () => {
    const p = probeFps({ warmupMs: 100, sampleMs: 500 });
    runFrames(1200, 60);
    const result = await p;
    expect(result).not.toBeNull();
    expect(result!.frames).toBeGreaterThan(10);
  });

  it("60fps면 ok로 판정한다", async () => {
    const p = probeFps({ warmupMs: 100, sampleMs: 500 });
    runFrames(1200, 60);
    const result = await p;
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("ok");
    expect(result!.fps).toBeGreaterThan(50);
  });

  it("10fps면 critical로 판정한다", async () => {
    const p = probeFps({ warmupMs: 100, sampleMs: 1000 });
    runFrames(3000, 10);
    const result = await p;
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("critical");
  });

  it("20fps면 low로 판정한다", async () => {
    const p = probeFps({ warmupMs: 100, sampleMs: 1000 });
    runFrames(3000, 20);
    const result = await p;
    expect(result!.tier).toBe("low");
  });

  /**
   * 핵심 안전장치 — 탭이 숨겨지면 rAF가 멈춰 FPS가 0에 수렴한다.
   * 그걸 "저사양"으로 읽으면 멀쩡한 기기에 저품질 모드를 권하게 된다.
   */
  it("측정 중 탭이 숨겨졌으면 결과를 폐기한다 (오탐 방지)", async () => {
    const p = probeFps({ warmupMs: 100, sampleMs: 500 });
    runFrames(300, 60);
    visibility = "hidden";
    for (const fn of visibilityListeners) fn();
    visibility = "visible";
    runFrames(1500, 60);
    await expect(p).resolves.toBeNull();
  });

  it("프레임 수가 너무 적으면 결과를 폐기한다", async () => {
    const p = probeFps({ warmupMs: 100, sampleMs: 500 });
    runFrames(2000, 3); // 샘플 구간에 프레임 10개 미만
    await expect(p).resolves.toBeNull();
  });

  it("abort되면 null을 반환한다", async () => {
    const controller = new AbortController();
    const p = probeFps({ warmupMs: 100, sampleMs: 500, signal: controller.signal });
    runFrames(200, 60);
    controller.abort();
    await expect(p).resolves.toBeNull();
  });

  it("이미 abort된 signal이면 즉시 null", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      probeFps({ warmupMs: 10, sampleMs: 10, signal: controller.signal }),
    ).resolves.toBeNull();
  });
});
