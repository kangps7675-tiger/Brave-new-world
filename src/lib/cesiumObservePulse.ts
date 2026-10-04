/**
 * Observe 펄스 루프 — preUpdate 상시 hold 대신 interval + requestRender.
 * 엔티티가 없을 때는 mutate=false로 idle 프레임을 깨우지 않는다.
 */
import { observeRequestRender } from "@/lib/cesiumObserveRenderGovernor";

export type ObservePulseLoopOpts = {
  intervalMs?: number;
  requestRender?: () => void;
};

/**
 * @param tick mutate 했으면 true — 그때만 requestRender
 */
export function startObservePulseLoop(
  tick: () => boolean,
  opts?: ObservePulseLoopOpts,
): () => void {
  const intervalMs = opts?.intervalMs ?? 48;
  const requestRender = opts?.requestRender ?? observeRequestRender;
  const id = window.setInterval(() => {
    try {
      if (tick()) requestRender();
    } catch {
      /* pulse must not break the app */
    }
  }, intervalMs);
  return () => window.clearInterval(id);
}
