import { recordInterestSymbol } from "@/lib/interest/recordInterest";

/**
 * 관심종목 localStorage — 서버/로그인 없이 재방문용.
 * @see docs/retention-markets-roadmap.md
 */

export const WATCHLIST_KEY = "geowatch-watch-symbols-v1";
export const WATCHLIST_MAX = 12;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadWatchSymbols(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, WATCHLIST_MAX);
  } catch {
    return [];
  }
}

export function saveWatchSymbols(symbols: string[]): void {
  if (!canUseStorage()) return;
  const unique = [...new Set(symbols.map((s) => s.trim()).filter(Boolean))].slice(
    0,
    WATCHLIST_MAX,
  );
  window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(unique));
}

export function toggleWatchSymbol(symbol: string): string[] {
  const id = symbol.trim();
  if (!id) return loadWatchSymbols();
  const current = loadWatchSymbols();
  const adding = !current.includes(id);
  const next = adding
    ? [...current, id].slice(0, WATCHLIST_MAX)
    : current.filter((s) => s !== id);
  saveWatchSymbols(next);
  if (adding) recordInterestSymbol(id);
  return next;
}

export function isWatchedSymbol(symbol: string, list?: string[]): boolean {
  const symbols = list ?? loadWatchSymbols();
  return symbols.includes(symbol.trim());
}
