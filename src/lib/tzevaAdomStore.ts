import type { TzevaAdomAlert } from "@/lib/tzevaAdom";

const MAX_HISTORY = 120;
let active: TzevaAdomAlert[] = [];
let history: TzevaAdomAlert[] = [];
let lastFetchAt: string | null = null;

export function getTzevaAdomStore() {
  return { active, history, lastFetchAt };
}

export function replaceTzevaAdomData(
  nextActive: TzevaAdomAlert[],
  nextHistory: TzevaAdomAlert[],
  fetchedAt?: string | null,
) {
  active = nextActive;
  history = nextHistory.slice(0, MAX_HISTORY);
  lastFetchAt = fetchedAt ?? new Date().toISOString();
}
