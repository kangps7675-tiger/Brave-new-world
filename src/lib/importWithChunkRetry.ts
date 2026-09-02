const CHUNK_RETRY_MAX = 2;
const CHUNK_RETRY_BASE_MS = 700;
const CHUNK_RELOAD_KEY = "geowatch-chunk-reload-v1";

function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module/i.test(
      String(err),
    );
  }
  return (
    err.name === "ChunkLoadError" ||
    /Loading chunk|Failed to fetch dynamically imported module/i.test(err.message)
  );
}

/**
 * next/dynamic loader용 — dev HMR·OneDrive .next 지연 시 ChunkLoadError 완화.
 */
export function importWithChunkRetry<T>(factory: () => Promise<T>): () => Promise<T> {
  return () => {
    const attempt = (retry: number): Promise<T> =>
      factory().catch((err: unknown) => {
        if (!isChunkLoadError(err)) throw err;

        if (retry < CHUNK_RETRY_MAX) {
          const delay = CHUNK_RETRY_BASE_MS * (retry + 1);
          return new Promise<void>((resolve) => window.setTimeout(resolve, delay)).then(() =>
            attempt(retry + 1),
          );
        }

        if (typeof window !== "undefined") {
          try {
            if (sessionStorage.getItem(CHUNK_RELOAD_KEY) !== "1") {
              sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
              window.location.reload();
              return new Promise(() => {});
            }
          } catch {
            /* ignore */
          }
        }

        throw err;
      });

    return attempt(0);
  };
}
