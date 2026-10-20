/**
 * 클라이언트 stale-while-revalidate 캐시 (P1-6).
 *
 * IndexedDB 우선, 실패 시 sessionStorage.
 * 레이어 fetch가 캐시본을 0ms에 그리고, 백그라운드에서 갱신한다.
 */

export type ClientCacheEntry<T> = {
  key: string;
  data: T;
  fetchedAt: number;
};

const DB_NAME = "geowatch-client-cache";
const STORE = "entries";
const DB_VERSION = 1;
const MEMORY = new Map<string, ClientCacheEntry<unknown>>();
const SS_PREFIX = "gw-cc:";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => resolve(null);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
    } catch {
      resolve(null);
    }
  });
}

function readSession<T>(key: string): ClientCacheEntry<T> | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientCacheEntry<T>;
    if (!parsed || typeof parsed.fetchedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession<T>(entry: ClientCacheEntry<T>): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SS_PREFIX + entry.key, JSON.stringify(entry));
  } catch {
    /* quota */
  }
}

export async function readClientCache<T>(key: string): Promise<ClientCacheEntry<T> | null> {
  const mem = MEMORY.get(key) as ClientCacheEntry<T> | undefined;
  if (mem) return mem;

  const db = await openDb();
  if (db) {
    try {
      const entry = await new Promise<ClientCacheEntry<T> | null>((resolve) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => {
          const v = req.result as ClientCacheEntry<T> | undefined;
          resolve(v ?? null);
        };
        req.onerror = () => resolve(null);
      });
      db.close();
      if (entry) {
        MEMORY.set(key, entry as ClientCacheEntry<unknown>);
        return entry;
      }
    } catch {
      try {
        db.close();
      } catch {
        /* ignore */
      }
    }
  }

  return readSession<T>(key);
}

export async function writeClientCache<T>(key: string, data: T, fetchedAt = Date.now()): Promise<void> {
  const entry: ClientCacheEntry<T> = { key, data, fetchedAt };
  MEMORY.set(key, entry as ClientCacheEntry<unknown>);
  writeSession(entry);

  const db = await openDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    try {
      db.close();
    } catch {
      /* ignore */
    }
  }
}

export function ageLabel(fetchedAt: number, lang: "ko" | "en" = "ko"): string {
  const ageMs = Math.max(0, Date.now() - fetchedAt);
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 1) return lang === "en" ? "just now" : "방금";
  if (mins < 60) return lang === "en" ? `${mins}m ago` : `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  return lang === "en" ? `${hours}h ago` : `${hours}시간 전`;
}

export type SwrFetchResult<T> = {
  data: T;
  fromCache: boolean;
  fetchedAt: number;
  /** 캐시본을 먼저 썼고 네트워크가 나중에 도착할 때 */
  refresh?: Promise<T>;
};

export type SwrFetchOptions = {
  /** soft 안내 타임아웃 (기본 2500ms) */
  softTimeoutMs?: number;
  /** hard 실패 타임아웃 (기본 8000ms) */
  hardTimeoutMs?: number;
  onSoftTimeout?: () => void;
};

/**
 * 캐시가 있으면 즉시 반환 + 백그라운드 갱신.
 * 없으면 soft/hard 타임아웃으로 fetch.
 */
export async function fetchWithClientCache<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: SwrFetchOptions = {},
): Promise<SwrFetchResult<T>> {
  const softTimeoutMs = options.softTimeoutMs ?? 2_500;
  const hardTimeoutMs = options.hardTimeoutMs ?? 8_000;
  const cached = await readClientCache<T>(key);

  const runFetch = async (): Promise<T> => {
    const controller = new AbortController();
    let softTimer: number | undefined;
    let hardTimer: number | undefined;
    try {
      softTimer = window.setTimeout(() => {
        options.onSoftTimeout?.();
      }, softTimeoutMs);
      hardTimer = window.setTimeout(() => {
        controller.abort();
      }, hardTimeoutMs);
      const data = await fetcher(controller.signal);
      await writeClientCache(key, data);
      return data;
    } finally {
      if (softTimer != null) window.clearTimeout(softTimer);
      if (hardTimer != null) window.clearTimeout(hardTimer);
    }
  };

  if (cached) {
    const refresh = runFetch().catch(() => cached.data);
    return {
      data: cached.data,
      fromCache: true,
      fetchedAt: cached.fetchedAt,
      refresh,
    };
  }

  const data = await runFetch();
  return { data, fromCache: false, fetchedAt: Date.now() };
}
