import type { NeptunThreatType } from "@/lib/neptun";

/**
 * NEPTUN 지도 모듈(chunk 2100) ThreatPin SVG 경로 — neptun.in.ua 지도와 동일.
 * @see https://neptun.in.ua/_next/static/chunks/2100.ece53e55bb16fc38.js (object T)
 */
const ICONS: Record<NeptunThreatType | "fpv", string> = {
  /** Shahed / БпЛА — 델타윙 실루엣 (지도 핀) */
  uav: `<path d="M12 2.5 21 20.5 12 16 3 20.5z" fill="currentColor"/>`,
  /** FPV 드론 — NEPTUN에서 uav와 별도 타입 */
  fpv: `<g fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 7 17 17M17 7 7 17"/><circle cx="5.4" cy="5.4" r="2.9"/><circle cx="18.6" cy="5.4" r="2.9"/><circle cx="5.4" cy="18.6" r="2.9"/><circle cx="18.6" cy="18.6" r="2.9"/></g><rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1.3" fill="currentColor"/>`,
  /** 순항 미사일 */
  missile: `<path d="M12 2c2.5 2.3 3.5 5.3 3.5 9.2v4.3l2 2.2v2.3l-3-1.3h-5l-3 1.3v-2.3l2-2.2v-4.3C8.5 7.3 9.5 4.3 12 2z" fill="currentColor"/><circle cx="12" cy="8.6" r="1.2" fill="#fff" opacity=".85"/>`,
  /** 탄도 미사일 — 궤적 호 + 낙하점 */
  ballistic: `<path d="M4 4.5c8 0 14.5 5 15.5 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M19.7 19 19.5 12.4 13.4 18.6z" fill="currentColor"/>`,
  /** 유도 폭탄 (KAB) */
  kab: `<path d="M12 21.2c2.8-2 4.3-4.8 4.3-8.4S14.6 5.9 12 3C9.4 5.9 7.7 9.2 7.7 12.8s1.5 6.4 4.3 8.4z" fill="currentColor"/><path d="M12 3 9.4 1M12 3l2.6-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  /** MiG-31K / 항공 발사 */
  mig31k: `<path d="M12 2c.8 0 1.4 1.2 1.6 3.2l5.9 4.3v2.1l-5.7-2 .2 4.7 2.2 1.6v1.8L12 21l-4.4-3.3v-1.8l2.2-1.6.2-4.7-5.7 2v-2.1l5.9-4.3C10.6 3.2 11.2 2 12 2z" fill="currentColor"/>`,
  /** 정찰 — 눈 실루엣 */
  recon: `<path d="M12 5C6.5 5 2.5 12 2.5 12S6.5 19 12 19s9.5-7 9.5-7S17.5 5 12 5z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`,
  unknown: `<path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="18" r="1.4" fill="currentColor"/>`,
};

export function neptunThreatIconSvg(type: string): string {
  if (type === "fpv") return ICONS.fpv;
  return ICONS[type as NeptunThreatType] ?? ICONS.unknown;
}
