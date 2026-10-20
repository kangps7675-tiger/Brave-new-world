/** WebGL 첫 프레임 이후 무거운 작업을 메인 스레드에 양보 */
export function runWhenIdle(task: () => void, timeoutMs = 2500): () => void {
  if (typeof window === "undefined") {
    task();
    return () => undefined;
  }

  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(() => task(), { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(task, 120);
  return () => window.clearTimeout(id);
}
