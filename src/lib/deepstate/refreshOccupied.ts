/**
 * DeepState 점령 좌표 — 3일 스냅샷.
 * news_project occupiedUkraine.json 과 같이 좌표만 주기 갱신.
 * LIVEUAMAP 영토 폴링 전 임시.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { BRAND_USER_AGENT } from "@/lib/brand";
import {
  loadDeepstateOccupiedFromD1,
  saveDeepstateOccupiedToD1,
} from "@/lib/deepstate/snapshotStore";
import {
  DEEPSTATE_LAST_URL,
  DEEPSTATE_PUBLIC_SNAPSHOT,
  attachOccupiedMeta,
  deepstateToOccupiedGeoJson,
  emptyOccupiedGeoJson,
  isOccupiedSnapshotFresh,
  occupiedSnapshotFetchedAt,
  type OccupiedGeoJson,
} from "@/lib/deepstate/toOccupiedGeoJson";

export type OccupiedSnapshotSource =
  | "deepstate-d1"
  | "deepstate-snapshot"
  | "deepstate-live"
  | "deepstate-memory"
  | "empty";

export type OccupiedSnapshotResult = {
  occupied: OccupiedGeoJson;
  source: OccupiedSnapshotSource;
  persisted: boolean;
  skipped: boolean;
  error?: string;
};

const PUBLIC_REL = path.join("public", "data", DEEPSTATE_PUBLIC_SNAPSHOT);

let memoryCache: OccupiedGeoJson | null = null;
let inflight: Promise<OccupiedSnapshotResult> | null = null;

export async function loadPublicOccupiedSnapshot(): Promise<OccupiedGeoJson | null> {
  try {
    const filePath = path.join(process.cwd(), PUBLIC_REL);
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as OccupiedGeoJson;
    if (!Array.isArray(parsed?.features) || parsed.features.length === 0) return null;
    return attachOccupiedMeta(parsed, {
      source: parsed.meta?.source || "deepstate-snapshot",
      deepstateId: parsed.meta?.deepstateId ?? null,
      fetchedAt: parsed.meta?.fetchedAt || new Date(0).toISOString(),
      count: parsed.features.length,
    });
  } catch {
    return null;
  }
}

function fresher(a: OccupiedGeoJson | null, b: OccupiedGeoJson | null): OccupiedGeoJson | null {
  const aAt = Date.parse(occupiedSnapshotFetchedAt(a) ?? "") || 0;
  const bAt = Date.parse(occupiedSnapshotFetchedAt(b) ?? "") || 0;
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  return aAt >= bAt ? a : b;
}

export async function loadBestOccupiedSnapshot(): Promise<{
  occupied: OccupiedGeoJson;
  source: OccupiedSnapshotSource;
} | null> {
  const d1 = await loadDeepstateOccupiedFromD1();
  const file = await loadPublicOccupiedSnapshot();
  const mem = memoryCache;
  const best = fresher(fresher(d1, file), mem);
  if (!best?.features.length) return null;
  const source: OccupiedSnapshotSource =
    best === d1
      ? "deepstate-d1"
      : best === mem
        ? "deepstate-memory"
        : "deepstate-snapshot";
  return { occupied: best, source };
}

async function fetchLiveOccupied(): Promise<OccupiedGeoJson> {
  const res = await fetch(DEEPSTATE_LAST_URL, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      Accept: "application/json",
      "User-Agent": `${BRAND_USER_AGENT} (+deepstate-occupied-snapshot/3d)`,
    },
  });
  if (!res.ok) {
    throw new Error(`DeepState HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  const occupied = deepstateToOccupiedGeoJson(data, "macro");
  if (!occupied.features.length) {
    throw new Error("DeepState occupied features empty");
  }
  return attachOccupiedMeta(occupied, {
    source: "deepstate-live",
    deepstateId: occupied.meta?.deepstateId ?? null,
    fetchedAt: new Date().toISOString(),
    count: occupied.features.length,
  });
}

async function persist(occupied: OccupiedGeoJson): Promise<boolean> {
  memoryCache = occupied;
  return saveDeepstateOccupiedToD1(occupied);
}

async function refreshNow(): Promise<OccupiedSnapshotResult> {
  const occupied = await fetchLiveOccupied();
  const persisted = await persist(occupied);
  return {
    occupied,
    source: "deepstate-live",
    persisted,
    skipped: false,
  };
}

/**
 * 3일이 안 지났으면 캐시를 그대로 쓰고, 지났거나 force 면 DeepState에서 좌표만 가져온다.
 */
export async function refreshOccupiedSnapshot(options?: {
  force?: boolean;
}): Promise<OccupiedSnapshotResult> {
  const force = options?.force === true;
  const cached = await loadBestOccupiedSnapshot();
  if (!force && cached && isOccupiedSnapshotFresh(occupiedSnapshotFetchedAt(cached.occupied))) {
    return {
      occupied: cached.occupied,
      source: cached.source,
      persisted: cached.source === "deepstate-d1",
      skipped: true,
    };
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      return await refreshNow();
    } catch (error) {
      const message = error instanceof Error ? error.message : "DeepState fetch failed";
      if (cached?.occupied.features.length) {
        return {
          occupied: cached.occupied,
          source: cached.source,
          persisted: cached.source === "deepstate-d1",
          skipped: false,
          error: message,
        };
      }
      return {
        occupied: emptyOccupiedGeoJson(),
        source: "empty",
        persisted: false,
        skipped: false,
        error: message,
      };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** GET — 유저 요청은 스냅샷만. 3일 지난 뒤에만 한 번 좌표를 갱신한다. */
export async function readOccupiedSnapshotForClient(): Promise<OccupiedSnapshotResult> {
  return refreshOccupiedSnapshot({ force: false });
}
