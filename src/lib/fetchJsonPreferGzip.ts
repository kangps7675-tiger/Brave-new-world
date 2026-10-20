/**
 * Phase 1 — 정적 .json.gz 우선 로드.
 * hourly 빌드(`npm run data:compress`) 산출물을 런타임에서 먼저 시도하고,
 * 없거나 DecompressionStream 미지원이면 평문 .json으로 폴백.
 */

export type FetchJsonGzOptions = RequestInit & {
  /** false면 .gz를 시도하지 않음 */
  preferGzip?: boolean;
};

function looksLikeGzipUrl(url: string) {
  return /\.gz(\?|$)/i.test(url);
}

async function decodeGzipResponse(response: Response): Promise<string> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream unavailable");
  }
  if (!response.body) {
    throw new Error("Empty gzip body");
  }
  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

async function parseJsonResponse<T>(response: Response, asGzip: boolean): Promise<T> {
  if (asGzip) {
    const text = await decodeGzipResponse(response);
    return JSON.parse(text) as T;
  }
  return (await response.json()) as T;
}

/**
 * `url`이 `.json`이면 `.json.gz`를 먼저 fetch.
 * CDN/정적 호스팅에 sidecar가 있을 때만 이득; 404면 평문.
 */
export async function fetchJsonPreferGzip<T>(
  url: string,
  init?: FetchJsonGzOptions,
): Promise<{ data: T; fromGzip: boolean; response: Response }> {
  const preferGzip = init?.preferGzip !== false;
  const fetchInit: RequestInit = { ...(init ?? {}) };
  delete (fetchInit as { preferGzip?: boolean }).preferGzip;

  if (preferGzip && !looksLikeGzipUrl(url)) {
    const gzUrl = `${url}.gz`;
    try {
      const gzRes = await fetch(gzUrl, {
        ...fetchInit,
        headers: {
          Accept: "application/gzip, application/json",
          ...(fetchInit.headers as HeadersInit | undefined),
        },
      });
      if (gzRes.ok) {
        const data = await parseJsonResponse<T>(gzRes, true);
        return { data, fromGzip: true, response: gzRes };
      }
    } catch {
      /* fall through to plain JSON */
    }
  }

  const response = await fetch(url, fetchInit);
  if (!response.ok) {
    throw new Error(`JSON fetch failed: ${response.status} ${url}`);
  }
  const asGzip = looksLikeGzipUrl(url);
  const data = await parseJsonResponse<T>(response, asGzip);
  return { data, fromGzip: asGzip, response };
}
