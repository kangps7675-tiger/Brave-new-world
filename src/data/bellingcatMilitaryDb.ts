/**
 * Bellingcat / Turnstone ADS-B history — military ICAO hex lookup.
 * @see https://github.com/bellingcat/adsb-history.git (MIT)
 *
 * Built from `backend-data-loading/modes.csv` (`military=t`).
 * Regenerate: `node scripts/build-bellingcat-mil-hex.js [modes.csv]`
 */
import hexPayload from "@/data/generated/bellingcat-mil-hexes.json";

export const BELLINGCAT_ADSB_HISTORY_URL =
  "https://github.com/bellingcat/adsb-history.git" as const;

export const BELLINGCAT_ADSB_ATTRIBUTION =
  `Military ICAO hex DB: Bellingcat Turnstone (adsb-history) · ${BELLINGCAT_ADSB_HISTORY_URL}` as const;

const HEX_SET: ReadonlySet<string> = new Set(
  (hexPayload.hexes as string[]).map((h) => h.toLowerCase()),
);

export function isBellingcatMilitaryHex(hex: string | null | undefined): boolean {
  if (!hex) return false;
  return HEX_SET.has(hex.toLowerCase().trim());
}

export function bellingcatMilitaryHexCount(): number {
  return HEX_SET.size;
}
