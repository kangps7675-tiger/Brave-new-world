/**
 * LiveUA 속보 읽음·도착 기록 — 브라우저 localStorage.
 *
 * - read: 유저가 양피지·포커스 카드로 실제로 연 속보. 목록에서 흐리게 + 체크.
 * - known: 이 브라우저가 처음 받은 시각. `since`(첫 방문) 이후에 받은 것 중
 *   안 읽은 것만 새 속보 배지로 센다 — 첫 방문 때 48시간 이력 전체가 배지로 쌓이지 않고,
 *   자리를 비운 사이 들어온 속보는 새로고침 뒤에도 배지에 남는다.
 * 서버 링버퍼(48h)보다 오래 들고 있을 이유가 없어 같은 기간으로 자른다.
 */

const STORAGE_KEY = "bnw.liveua.readState.v1";
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_IDS = 800;

export type LiveuaReadState = {
  /** 이 브라우저의 첫 방문 시각(ms) */
  since: number;
  /** id → 읽은 시각(ms) */
  read: Record<string, number>;
  /** id → 처음 받은 시각(ms) */
  known: Record<string, number>;
};

export function createLiveuaReadState(nowMs = Date.now()): LiveuaReadState {
  return { since: nowMs, read: {}, known: {} };
}

function pruneMap(map: Record<string, number>, nowMs: number): Record<string, number> {
  const cutoff = nowMs - MAX_AGE_MS;
  const kept = Object.entries(map)
    .filter(([, t]) => typeof t === "number" && Number.isFinite(t) && t >= cutoff)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_IDS);
  return Object.fromEntries(kept);
}

export function pruneLiveuaReadState(
  state: LiveuaReadState,
  nowMs = Date.now(),
): LiveuaReadState {
  return {
    since: state.since,
    read: pruneMap(state.read, nowMs),
    known: pruneMap(state.known, nowMs),
  };
}

/** 저장된 기록이 없으면 null — 첫 방문이면 첫 피드를 받은 시각으로 `since`를 잡아야 한다 */
export function loadLiveuaReadState(nowMs = Date.now()): LiveuaReadState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LiveuaReadState> | null;
    if (!parsed || typeof parsed !== "object" || typeof parsed.since !== "number") {
      return null;
    }
    return pruneLiveuaReadState(
      {
        since: parsed.since,
        read: parsed.read && typeof parsed.read === "object" ? parsed.read : {},
        known: parsed.known && typeof parsed.known === "object" ? parsed.known : {},
      },
      nowMs,
    );
  } catch {
    return null;
  }
}

export function saveLiveuaReadState(state: LiveuaReadState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruneLiveuaReadState(state)));
  } catch {
    /* 사생활 보호 모드·용량 초과 — 이번 세션 메모리로만 동작 */
  }
}

/** 처음 보는 id에 도착 시각을 찍는다. 바뀐 게 없으면 같은 객체를 돌려준다. */
export function registerLiveuaArrivals(
  state: LiveuaReadState,
  ids: string[],
  nowMs = Date.now(),
): LiveuaReadState {
  const fresh = ids.filter((id) => state.known[id] == null);
  if (fresh.length === 0) return state;
  const known = { ...state.known };
  for (const id of fresh) known[id] = nowMs;
  return { ...state, known };
}

export function markLiveuaIdsRead(
  state: LiveuaReadState,
  ids: string[],
  nowMs = Date.now(),
): LiveuaReadState {
  const fresh = ids.filter((id) => state.read[id] == null);
  if (fresh.length === 0) return state;
  const read = { ...state.read };
  const known = { ...state.known };
  for (const id of fresh) {
    read[id] = nowMs;
    if (known[id] == null) known[id] = nowMs;
  }
  return { since: state.since, read, known };
}

export function isLiveuaUnreadArrival(state: LiveuaReadState, id: string): boolean {
  if (state.read[id] != null) return false;
  const arrivedAt = state.known[id];
  return arrivedAt != null && arrivedAt > state.since;
}
