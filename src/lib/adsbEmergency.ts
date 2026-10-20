/**
 * ADS-B emergency squawk helpers — 7700 (general), 7600 (radio fail), 7500 (hijack).
 */

export const EMERGENCY_SQUAWKS = ["7700", "7600", "7500"] as const;
export type EmergencySquawk = (typeof EMERGENCY_SQUAWKS)[number];

export function normalizeSquawk(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length === 4 ? digits : null;
}

export function isEmergencySquawk(raw: string | null | undefined): raw is EmergencySquawk {
  const sq = normalizeSquawk(raw);
  return sq === "7700" || sq === "7600" || sq === "7500";
}

export function emergencySquawkLabel(squawk: string, ko: boolean): string {
  switch (normalizeSquawk(squawk)) {
    case "7700":
      return ko ? "비상 (7700)" : "Emergency (7700)";
    case "7600":
      return ko ? "교신 두절 (7600)" : "Radio failure (7600)";
    case "7500":
      return ko ? "납치 (7500)" : "Hijack (7500)";
    default:
      return ko ? `스쿼크 ${squawk}` : `Squawk ${squawk}`;
  }
}

export const ADSB_EMERGENCY_ATTRIBUTION = "ADS-B emergency squawk: adsb.lol";
