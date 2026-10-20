/**
 * Phase 3 scaffold — 무거운 JSON 파싱을 Worker로 넘긴다.
 * Worker 생성/통신 실패 시 메인 스레드 JSON.parse로 폴백.
 */

export type JsonParseWorkerResult<T> =
  | { ok: true; data: T; viaWorker: boolean }
  | { ok: false; error: string; viaWorker: boolean };

let workerProbe: boolean | null = null;

export function canUseJsonParseWorker(): boolean {
  if (typeof window === "undefined") return false;
  if (workerProbe != null) return workerProbe;
  try {
    workerProbe = typeof Worker !== "undefined";
  } catch {
    workerProbe = false;
  }
  return workerProbe;
}

/**
 * 큰 JSON 텍스트 파싱. Worker 사용 가능하면 백그라운드, 아니면 동기 parse.
 * Live 스위치 전: canUseJsonParseWorker() === true 를 게이트로 쓸 수 있다.
 */
export async function parseJsonOffMainThread<T>(text: string): Promise<JsonParseWorkerResult<T>> {
  if (!canUseJsonParseWorker() || text.length < 48_000) {
    try {
      return { ok: true, data: JSON.parse(text) as T, viaWorker: false };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "JSON parse failed",
        viaWorker: false,
      };
    }
  }

  return new Promise((resolve) => {
    let worker: Worker | null = null;
    const timeout = window.setTimeout(() => {
      worker?.terminate();
      try {
        resolve({ ok: true, data: JSON.parse(text) as T, viaWorker: false });
      } catch (error) {
        resolve({
          ok: false,
          error: error instanceof Error ? error.message : "JSON parse failed",
          viaWorker: false,
        });
      }
    }, 8_000);

    try {
      worker = new Worker(new URL("../workers/jsonParse.worker.ts", import.meta.url));
      worker.onmessage = (event: MessageEvent<{ ok: boolean; data?: T; error?: string }>) => {
        window.clearTimeout(timeout);
        worker?.terminate();
        if (event.data?.ok) {
          resolve({ ok: true, data: event.data.data as T, viaWorker: true });
        } else {
          try {
            resolve({ ok: true, data: JSON.parse(text) as T, viaWorker: false });
          } catch (error) {
            resolve({
              ok: false,
              error: event.data?.error || (error instanceof Error ? error.message : "parse failed"),
              viaWorker: true,
            });
          }
        }
      };
      worker.onerror = () => {
        window.clearTimeout(timeout);
        worker?.terminate();
        try {
          resolve({ ok: true, data: JSON.parse(text) as T, viaWorker: false });
        } catch (error) {
          resolve({
            ok: false,
            error: error instanceof Error ? error.message : "Worker parse failed",
            viaWorker: true,
          });
        }
      };
      worker.postMessage({ text });
    } catch {
      window.clearTimeout(timeout);
      try {
        resolve({ ok: true, data: JSON.parse(text) as T, viaWorker: false });
      } catch (error) {
        resolve({
          ok: false,
          error: error instanceof Error ? error.message : "JSON parse failed",
          viaWorker: false,
        });
      }
    }
  });
}
