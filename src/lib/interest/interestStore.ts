import {
  INTEREST_EVENTS_MAX,
  INTEREST_STORAGE_KEY,
  type InterestSignal,
  type InterestState,
} from "@/lib/interest/interestTypes";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emptyState(): InterestState {
  return { v: 1, events: [], updatedAt: Date.now() };
}

function normalizeState(raw: unknown): InterestState {
  if (!raw || typeof raw !== "object") return emptyState();
  const obj = raw as Partial<InterestState>;
  if (obj.v !== 1 || !Array.isArray(obj.events)) return emptyState();
  const events = obj.events
    .filter(
      (e): e is InterestSignal =>
        Boolean(e) &&
        typeof e === "object" &&
        typeof (e as InterestSignal).kind === "string" &&
        typeof (e as InterestSignal).id === "string" &&
        typeof (e as InterestSignal).at === "number",
    )
    .slice(-INTEREST_EVENTS_MAX);
  return {
    v: 1,
    events,
    updatedAt: typeof obj.updatedAt === "number" ? obj.updatedAt : Date.now(),
  };
}

/**
 * 관심 프로필 저장소 어댑터.
 * 지금은 localStorage. 로그인 붙이면 AccountInterestStore로 교체.
 */
export type InterestStore = {
  load: () => InterestState;
  save: (state: InterestState) => void;
  /**
   * 로그인 직후 로컬 → 계정 병합용.
   * 계정 구현체가 로컬 이벤트를 받아 서버 문서와 합친다.
   */
  mergeFromLocal: (local: InterestState) => InterestState;
};

export const localInterestStore: InterestStore = {
  load() {
    if (!canUseStorage()) return emptyState();
    try {
      const raw = window.localStorage.getItem(INTEREST_STORAGE_KEY);
      if (!raw) return emptyState();
      return normalizeState(JSON.parse(raw) as unknown);
    } catch {
      return emptyState();
    }
  },
  save(state) {
    if (!canUseStorage()) return;
    const next: InterestState = {
      v: 1,
      events: state.events.slice(-INTEREST_EVENTS_MAX),
      updatedAt: Date.now(),
    };
    try {
      window.localStorage.setItem(INTEREST_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota */
    }
  },
  mergeFromLocal(local) {
    // 로컬 전용 스토어: merge = 로컬 유지 (계정 스토어가 오버라이드)
    return normalizeState(local);
  },
};

/** 현재 활성 스토어 — 로그인 연결 시 교체 */
let activeStore: InterestStore = localInterestStore;

export function getInterestStore(): InterestStore {
  return activeStore;
}

/** 테스트·계정 스토어 주입용 */
export function setInterestStore(store: InterestStore): void {
  activeStore = store;
}

export function appendInterestSignal(
  partial: Omit<InterestSignal, "at"> & { at?: number },
  store: InterestStore = getInterestStore(),
): InterestState {
  const state = store.load();
  const signal: InterestSignal = {
    kind: partial.kind,
    id: partial.id.trim(),
    label: partial.label?.trim() || undefined,
    weight: partial.weight ?? 1,
    at: partial.at ?? Date.now(),
    meta: partial.meta,
  };
  if (!signal.id) return state;
  const events = [...state.events, signal].slice(-INTEREST_EVENTS_MAX);
  const next: InterestState = { v: 1, events, updatedAt: Date.now() };
  store.save(next);
  return next;
}
