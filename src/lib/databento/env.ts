/** 서버 전용 — 브라우저에 노출 금지 */

export function getDatabentoApiKey(): string | null {
  const key = process.env.DATABENTO_API_KEY?.trim();
  return key || null;
}

export function hasDatabentoApiKey(): boolean {
  return Boolean(getDatabentoApiKey());
}
