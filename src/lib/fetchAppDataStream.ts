import { JSONParser } from "@streamparser/json";
import type { AppData, SearchPlace } from "@/data/geoTypes";
import { dataPath, getDataProfile } from "@/lib/dataProfile";

export type AppDataLoadProgress = {
  bytesReceived: number;
  contentLength: number | null;
  phase: "downloading" | "parsing" | "ready";
};

export type FetchAppDataOptions = {
  onProgress?: (progress: AppDataLoadProgress) => void;
  onPartial?: (patch: Partial<AppData>) => void;
  signal?: AbortSignal;
};

export type FetchAppDataResult = {
  data: AppData;
  /** Defer expandPlaces — load via fetchAppDataPlaces when idle. */
  placesRaw: SearchPlace[];
};

export type AppDataManifest = {
  generatedAt: string;
  profile?: string;
  sources: AppData["sources"];
  chunks?: {
    countries: string;
    disputes: string;
    places: string;
  };
};

const TOP_LEVEL_PATHS = [
  "$.generatedAt",
  "$.profile",
  "$.sources",
  "$.countries",
  "$.disputes",
  "$.places",
  "$.roads",
  "$.railroads",
] as const;

/** 클라우드 CDN(dataPath) 우선 → 로컬 API 스트림 폴백 */
function chunkUrl(profile: string, fileName: string): string {
  return `/api/data-stream?file=${encodeURIComponent(fileName)}&profile=${encodeURIComponent(profile)}`;
}

function staticUrl(_profile: string, fileName: string): string {
  return dataPath(fileName);
}

async function fetchJsonFile<T>(
  profile: string,
  fileName: string,
  signal?: AbortSignal,
  onBytes?: (bytes: number, total: number | null) => void,
): Promise<T> {
  // CDN(static) first — cloud foundation; API stream as local/dev fallback
  const urls = [staticUrl(profile, fileName), chunkUrl(profile, fileName)];
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, { signal, cache: "default" });
      if (!response.ok) {
        lastError = new Error(`${fileName}: HTTP ${response.status}`);
        continue;
      }
      const totalHeader = response.headers.get("content-length");
      const total = totalHeader ? Number(totalHeader) : null;

      if (!response.body) {
        return (await response.json()) as T;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let text = "";
      let bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        text += decoder.decode(value, { stream: true });
        onBytes?.(bytes, total);
      }
      text += decoder.decode();
      return JSON.parse(text) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error(`${fileName} load failed`);
}

async function fetchManifest(
  profile: string,
  signal?: AbortSignal,
): Promise<AppDataManifest | null> {
  const urls = [staticUrl(profile, "app-data.json"), chunkUrl(profile, "app-data.json")];
  for (const url of urls) {
    const response = await fetch(url, { signal, cache: "default" });
    if (!response.ok) continue;
    const lengthHeader = response.headers.get("content-length");
    const length = lengthHeader ? Number(lengthHeader) : null;
    if (length != null && length > 512_000) {
      return null;
    }
    const text = await response.text();
    if (text.length > 512_000) return null;
    const parsed = JSON.parse(text) as AppDataManifest;
    if (parsed.chunks?.countries && parsed.chunks?.disputes) return parsed;
    if (Array.isArray((parsed as unknown as AppData).countries)) {
      return null;
    }
    return parsed;
  }
  return null;
}

function emptyAppDataFromManifest(manifest: AppDataManifest): AppData {
  return {
    generatedAt: manifest.generatedAt,
    profile: manifest.profile,
    sources: manifest.sources ?? { naturalEarth: "", gdelt: "" },
    countries: [],
    disputes: [],
    places: [],
    events: [],
    roads: [],
    railroads: [],
  };
}

async function fetchChunkedAppData(
  manifest: AppDataManifest,
  options: FetchAppDataOptions,
): Promise<FetchAppDataResult> {
  const profile = getDataProfile();
  const chunks = manifest.chunks!;
  let bytesReceived = 0;

  const report = (extra = 0) => {
    options.onProgress?.({
      bytesReceived: bytesReceived + extra,
      contentLength: null,
      phase: "downloading",
    });
  };

  report();
  const [countries, disputes] = await Promise.all([
    fetchJsonFile<AppData["countries"]>(profile, chunks.countries, options.signal, (b) => {
      bytesReceived = b;
      report();
    }),
    fetchJsonFile<AppData["disputes"]>(profile, chunks.disputes, options.signal, (b) => {
      bytesReceived += b;
      report();
    }),
  ]);

  options.onPartial?.({
    ...emptyAppDataFromManifest(manifest),
    countries,
    disputes,
  });

  options.onProgress?.({
    bytesReceived,
    contentLength: null,
    phase: "ready",
  });

  return {
    data: {
      ...emptyAppDataFromManifest(manifest),
      countries,
      disputes,
    },
    placesRaw: [],
  };
}

async function openMonolithicResponse(profile: string, signal?: AbortSignal): Promise<Response> {
  const streamRes = await fetch(chunkUrl(profile, "app-data.json"), { signal, cache: "default" });
  if (streamRes.ok) return streamRes;
  const staticRes = await fetch(staticUrl(profile, "app-data.json"), { signal, cache: "default" });
  if (staticRes.ok) return staticRes;
  throw new Error(
    `app-data.json 로드 실패: stream ${streamRes.status}, static ${staticRes.status}`,
  );
}

async function fetchMonolithicAppData(
  options: FetchAppDataOptions = {},
): Promise<FetchAppDataResult> {
  const profile = getDataProfile();
  const response = await openMonolithicResponse(profile, options.signal);

  if (!response.body) {
    throw new Error("app-data.json: response body missing");
  }

  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;

  const acc: Partial<AppData> = {
    countries: [],
    disputes: [],
    events: [],
    places: [],
    roads: [],
    railroads: [],
  };
  let placesRaw: SearchPlace[] = [];

  const parser = new JSONParser({ paths: [...TOP_LEVEL_PATHS] });
  parser.onValue = ({ value, key }) => {
    if (typeof key !== "string") return;
    if (key === "places") {
      placesRaw = Array.isArray(value) ? (value as SearchPlace[]) : [];
      return;
    }
    if (key === "generatedAt" || key === "profile") {
      (acc as Record<string, unknown>)[key] = value;
    } else if (key === "sources") {
      acc.sources = value as AppData["sources"];
    } else if (key === "countries") {
      acc.countries = Array.isArray(value) ? (value as AppData["countries"]) : [];
    } else if (key === "disputes") {
      acc.disputes = Array.isArray(value) ? (value as AppData["disputes"]) : [];
    } else if (key === "roads") {
      acc.roads = value as AppData["roads"];
    } else if (key === "railroads") {
      acc.railroads = value as AppData["railroads"];
    }

    options.onPartial?.({
      ...(acc.generatedAt != null ? { generatedAt: acc.generatedAt } : {}),
      ...(acc.profile != null ? { profile: acc.profile } : {}),
      ...(acc.sources != null ? { sources: acc.sources } : {}),
      ...(acc.countries != null ? { countries: acc.countries } : {}),
      ...(acc.disputes != null ? { disputes: acc.disputes } : {}),
      places: [],
      events: [],
      ...(acc.roads != null ? { roads: acc.roads } : {}),
      ...(acc.railroads != null ? { railroads: acc.railroads } : {}),
    });
  };

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let bytesReceived = 0;

  options.onProgress?.({
    bytesReceived: 0,
    contentLength: Number.isFinite(contentLength) ? contentLength : null,
    phase: "downloading",
  });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesReceived += value.byteLength;
    parser.write(decoder.decode(value, { stream: true }));
    options.onProgress?.({
      bytesReceived,
      contentLength: Number.isFinite(contentLength) ? contentLength : null,
      phase: "downloading",
    });
  }
  parser.end();

  options.onProgress?.({
    bytesReceived,
    contentLength: Number.isFinite(contentLength) ? contentLength : null,
    phase: "ready",
  });

  const data: AppData = {
    generatedAt: acc.generatedAt ?? "",
    profile: acc.profile,
    sources: acc.sources ?? { naturalEarth: "", gdelt: "" },
    countries: acc.countries ?? [],
    disputes: acc.disputes ?? [],
    places: [],
    events: [],
    roads: acc.roads ?? [],
    railroads: acc.railroads ?? [],
  };

  return { data, placesRaw };
}

/** Load places chunk separately (idle / after first paint). */
export async function fetchAppDataPlaces(signal?: AbortSignal): Promise<SearchPlace[]> {
  const profile = getDataProfile();
  try {
    const manifest = await fetchManifest(profile, signal);
    if (manifest?.chunks?.places) {
      return fetchJsonFile<SearchPlace[]>(profile, manifest.chunks.places, signal);
    }
  } catch {
    // fall through
  }
  const monolithic = await fetchMonolithicAppData({ signal });
  return monolithic.placesRaw;
}

/**
 * Load app-data: manifest + parallel country/dispute chunks, or legacy monolithic stream.
 */
export async function fetchAppDataStream(
  options: FetchAppDataOptions = {},
): Promise<FetchAppDataResult> {
  const profile = getDataProfile();
  const manifest = await fetchManifest(profile, options.signal);
  if (manifest?.chunks?.countries && manifest?.chunks?.disputes) {
    return fetchChunkedAppData(manifest, options);
  }
  return fetchMonolithicAppData(options);
}
