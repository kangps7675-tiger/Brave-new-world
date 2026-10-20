/**
 * 유저 BYOK — Anthropic 키는 이 기기 localStorage에만 저장.
 * 서버 .env ANTHROPIC_API_KEY 와 분리.
 */

const STORAGE_KEY = "bnw-user-anthropic-api-key";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getUserAnthropicApiKey(): string | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

export function setUserAnthropicApiKey(key: string | null): void {
  if (!canUseStorage()) return;
  try {
    const trimmed = key?.trim() ?? "";
    if (!trimmed) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    /* private mode 등 */
  }
}

export function hasUserAnthropicApiKey(): boolean {
  return Boolean(getUserAnthropicApiKey());
}

/** UI 표시용 — 앞 7·뒤 4만 */
export function maskAnthropicApiKey(key: string): string {
  const t = key.trim();
  if (t.length < 12) return "••••";
  return `${t.slice(0, 7)}…${t.slice(-4)}`;
}

export function looksLikeAnthropicApiKey(key: string): boolean {
  const t = key.trim();
  return t.startsWith("sk-ant-") && t.length >= 20;
}
