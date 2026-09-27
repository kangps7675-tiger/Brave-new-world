/**
 * 세슘 해상 신속속보 claim — 새로고침·재폴링 폭주 방지.
 * breakingFlash claim 과 동일 패턴 (세션 단위).
 */

const claimed = new Set<string>();

export function claimMaritimeFlash(id: string): boolean {
  if (!id || claimed.has(id)) return false;
  claimed.add(id);
  return true;
}

export function wasMaritimeFlashClaimed(id: string): boolean {
  return claimed.has(id);
}

/** 테스트용 */
export function resetMaritimeFlashClaimsForTests(): void {
  claimed.clear();
}

export function maritimeFlashTitlePrefix(lang: "ko" | "en"): string {
  return lang === "en" ? "Maritime flash" : "해상 신속 속보";
}

export function withMaritimeFlashTitle(title: string, lang: "ko" | "en"): string {
  const prefix = maritimeFlashTitlePrefix(lang);
  if (title.startsWith(prefix)) return title;
  return `${prefix} · ${title}`;
}
