/** Cyber War Room — 지구본·폴리곤·인텔 레이어 통합 팔레트 */
export const CYBER_WAR_ROOM_THEME = {
  theme: "cyber-war-room",
  globe: {
    backgroundColor: "#0b0c10",
    /** 바다(구 표면) */
    oceanColor: "#0b0c10",
    /** 육지 기본 톤 */
    baseColor: "#1a1a2e",
    atmosphereColor: "#00ffcc",
    atmosphereGlowPower: 4,
  },
  polygon: {
    defaultFill: "#1f2833",
    conflictZoneFill: "#4e0e17",
    strokeColor: "#45f3ff",
    strokeWidth: 0.5,
  },
  intel: {
    missileArc: "#ff007f",
    telegramMarker: "#00ffcc",
    nasaFire: "#ffb703",
  },
} as const;

export type CyberWarRoomTheme = typeof CYBER_WAR_ROOM_THEME;

/** 대기권 후광 — three-globe atmosphereColor용 rgba */
export function cyberAtmosphereRgba(alpha = 0.35): string {
  const hex = CYBER_WAR_ROOM_THEME.globe.atmosphereColor;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** atmosphereGlowPower → three-globe atmosphereAltitude */
export function cyberAtmosphereAltitude(viewAltitude: number): number {
  const power = CYBER_WAR_ROOM_THEME.globe.atmosphereGlowPower;
  const base = 0.04 + (power / 4) * 0.06;
  return Math.min(0.22, base + viewAltitude * 0.22);
}

export function cyberCoastlineColor(): string {
  const hex = CYBER_WAR_ROOM_THEME.polygon.strokeColor;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.42)`;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function cyberConflictZoneFills(): Record<"high" | "medium" | "low", string> {
  const base = CYBER_WAR_ROOM_THEME.polygon.conflictZoneFill;
  return {
    high: hexToRgba(base, 0.92),
    medium: hexToRgba(base, 0.72),
    low: hexToRgba(base, 0.5),
  };
}
