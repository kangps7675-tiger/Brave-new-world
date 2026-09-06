import {
  computeSanctionsEvasionSnapshot,
  type SanctionsEvasionSnapshot,
} from "@/lib/sanctionsEvasionScore";

const STORAGE_KEY = "geowatch-ses-daily-v1";

export type SanctionsEvasionEntry = {
  snapshot: SanctionsEvasionSnapshot | null;
  loadedAt: string | null;
};

type Listener = (entry: SanctionsEvasionEntry) => void;

type StoredDay = {
  date: string;
  score: number;
};

let entry: SanctionsEvasionEntry = { snapshot: null, loadedAt: null };
const listeners = new Set<Listener>();

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStoredDays(): StoredDay[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredDay[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredDays(days: StoredDay[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = days.slice(-14);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota */
  }
}

function prevDayScore(today: string): number | null {
  const days = readStoredDays();
  const prev = days.filter((d) => d.date < today).sort((a, b) => b.date.localeCompare(a.date))[0];
  return prev?.score ?? null;
}

function persistTodayScore(today: string, score: number): void {
  const days = readStoredDays().filter((d) => d.date !== today);
  days.push({ date: today, score });
  writeStoredDays(days);
}

export function getSanctionsEvasionEntry(): SanctionsEvasionEntry {
  return entry;
}

export function subscribeSanctionsEvasion(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** corridor-ranks 기반 SES 재계산 — 네트워크 없음, 단일 소스 */
export function refreshSanctionsEvasion(): SanctionsEvasionEntry {
  const today = utcDayKey();
  const prev = prevDayScore(today);
  const snapshot = computeSanctionsEvasionSnapshot(prev);
  persistTodayScore(today, snapshot.score);
  entry = { snapshot, loadedAt: new Date().toISOString() };
  listeners.forEach((l) => l(entry));
  return entry;
}
