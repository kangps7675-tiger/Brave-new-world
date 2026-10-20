/**
 * NEPTUN Cesium 빌보드 실루엣 — 코(nose)=위(+Y), 침로 rotation과 맞춤.
 * uav: Shahed/Geran 식 삼각익 · kab: 활공폭탄 윙킷 · ballistic: 이스칸데르 식 탄도탄.
 */

export type NeptunMarkerKind =
  | "uav"
  | "recon"
  | "missile"
  | "ballistic"
  | "kab"
  | "mig31k"
  | "unknown";

function esc(color: string): string {
  return color.replace(/[<>"'&]/g, "");
}

/** Shahed-136 / Geran-2 식 — 긴 동체 + 후방 삼각익 + 수직미익 */
export function neptunShahedSvg(color: string, px = 36): string {
  const c = esc(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 40 40">
  <g fill="${c}" stroke="#0b1220" stroke-width="0.9" stroke-linejoin="round">
    <path d="M20 2.2 L22.2 11.5 L20 10.2 L17.8 11.5 Z"/>
    <path d="M18.4 10.5 L21.6 10.5 L22.4 27.5 L17.6 27.5 Z"/>
    <path d="M8 24.2 L20 19.5 L32 24.2 L20 22.2 Z"/>
    <path d="M17.2 27.2 L22.8 27.2 L20 37.2 Z"/>
    <path d="M19.2 27.5 L20.8 27.5 L20.8 34.5 L19.2 34.5 Z"/>
  </g>
  <circle cx="20" cy="14.5" r="1.15" fill="#fff" opacity="0.85"/>
</svg>`;
}

/** 정찰 UAV — 조금 더 슬림한 동일 계열 */
export function neptunReconUavSvg(color: string, px = 32): string {
  const c = esc(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 40 40">
  <g fill="${c}" stroke="#0b1220" stroke-width="0.85" stroke-linejoin="round">
    <ellipse cx="20" cy="18" rx="2.1" ry="12.5"/>
    <path d="M20 4.5 L22 10 L20 9 L18 10 Z"/>
    <path d="M9 22 L20 17.5 L31 22 L20 19.8 Z"/>
    <path d="M18.5 28.5 L21.5 28.5 L20 35.5 Z"/>
  </g>
</svg>`;
}

/** KAB/UMPK 식 활공폭탄 — 탄체 + 접이식 활공 날개 */
export function neptunGlideBombSvg(color: string, px = 34): string {
  const c = esc(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 40 40">
  <g fill="${c}" stroke="#0b1220" stroke-width="0.9" stroke-linejoin="round">
    <path d="M20 3.5 C22.6 3.5 24.2 7 24.2 11.5 L24.2 28.5 C24.2 32.8 22.4 36.2 20 36.2 C17.6 36.2 15.8 32.8 15.8 28.5 L15.8 11.5 C15.8 7 17.4 3.5 20 3.5 Z"/>
    <path d="M6.5 18.5 L15.8 15.2 L15.8 21.8 Z"/>
    <path d="M33.5 18.5 L24.2 15.2 L24.2 21.8 Z"/>
    <path d="M16.5 30.5 L23.5 30.5 L20 37 Z"/>
    <path d="M14.5 31.8 L16.8 29.5 L16.8 33.8 Z"/>
    <path d="M25.5 31.8 L23.2 29.5 L23.2 33.8 Z"/>
  </g>
  <ellipse cx="20" cy="12" rx="1.3" ry="2.2" fill="#fff" opacity="0.55"/>
</svg>`;
}

/** 9K720 이스칸데르 식 탄도탄 — 원뿔 노즈 + 원통 동체 + 후방 X핀 */
export function neptunIskanderSvg(color: string, px = 38): string {
  const c = esc(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 40 40">
  <g fill="${c}" stroke="#0b1220" stroke-width="0.9" stroke-linejoin="round">
    <path d="M20 2.5 L24.2 12.5 L15.8 12.5 Z"/>
    <path d="M16.6 12.2 L23.4 12.2 L23.8 30.5 L16.2 30.5 Z"/>
    <path d="M16.2 28.5 L8.5 36.2 L12.8 30.8 L16.2 31.5 Z"/>
    <path d="M23.8 28.5 L31.5 36.2 L27.2 30.8 L23.8 31.5 Z"/>
    <path d="M16.5 30.2 L14.2 37.2 L18.2 32.5 Z"/>
    <path d="M23.5 30.2 L25.8 37.2 L21.8 32.5 Z"/>
  </g>
  <rect x="18.6" y="14" width="2.8" height="8" rx="0.6" fill="#fff" opacity="0.35"/>
</svg>`;
}

/** 순항 미사일 — 날개 달린 세장형 */
export function neptunCruiseMissileSvg(color: string, px = 34): string {
  const c = esc(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 40 40">
  <g fill="${c}" stroke="#0b1220" stroke-width="0.85" stroke-linejoin="round">
    <path d="M20 3 L22.4 9.5 L17.6 9.5 Z"/>
    <path d="M18.2 9.2 L21.8 9.2 L22.4 30 L17.6 30 Z"/>
    <path d="M7 20 L18.2 17.2 L18.2 22.5 Z"/>
    <path d="M33 20 L21.8 17.2 L21.8 22.5 Z"/>
    <path d="M17.4 29.5 L22.6 29.5 L20 37 Z"/>
  </g>
</svg>`;
}

function neptunJetSvg(color: string, px = 32): string {
  const c = esc(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 40 40">
  <g fill="${c}" stroke="#0b1220" stroke-width="0.85" stroke-linejoin="round">
    <path d="M20 4 L22 12 L18 12 Z"/>
    <path d="M18.5 11.5 L21.5 11.5 L22 26 L18 26 Z"/>
    <path d="M5 18 L18.5 15 L18.5 20.5 Z"/>
    <path d="M35 18 L21.5 15 L21.5 20.5 Z"/>
    <path d="M17.5 25.5 L22.5 25.5 L20 34 Z"/>
  </g>
</svg>`;
}

function neptunUnknownSvg(color: string, px = 28): string {
  const c = esc(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 28 28">
  <circle cx="14" cy="14" r="5.5" fill="${c}" stroke="#fff" stroke-width="1.4"/>
  <circle cx="14" cy="14" r="10" fill="none" stroke="${c}" stroke-width="1.2" opacity="0.45"/>
</svg>`;
}

export function neptunMarkerSvg(kind: string, color: string, px?: number): string {
  switch (kind as NeptunMarkerKind) {
    case "uav":
      return neptunShahedSvg(color, px ?? 36);
    case "recon":
      return neptunReconUavSvg(color, px ?? 32);
    case "kab":
      return neptunGlideBombSvg(color, px ?? 34);
    case "ballistic":
      return neptunIskanderSvg(color, px ?? 38);
    case "missile":
      return neptunCruiseMissileSvg(color, px ?? 34);
    case "mig31k":
      return neptunJetSvg(color, px ?? 32);
    default:
      return neptunUnknownSvg(color, px ?? 28);
  }
}

export function neptunMarkerSizePx(kind: string): number {
  switch (kind as NeptunMarkerKind) {
    case "uav":
      return 36;
    case "recon":
      return 32;
    case "kab":
      return 34;
    case "ballistic":
      return 40;
    case "missile":
      return 34;
    case "mig31k":
      return 32;
    default:
      return 28;
  }
}
