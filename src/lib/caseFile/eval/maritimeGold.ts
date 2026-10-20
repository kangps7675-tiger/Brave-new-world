import redSea from "./fixtures/maritime-gold-redsea.json";
import hormuz from "./fixtures/maritime-gold-hormuz.json";
import baltic from "./fixtures/maritime-gold-baltic.json";
import blackSea from "./fixtures/maritime-gold-blacksea.json";

export type MaritimeSea = "red_sea" | "hormuz" | "black_sea" | "baltic";

/**
 * One incident used as ground truth for verdict/targeting eval.
 * Red Sea and Hormuz come from IMO lists (confirmed). Black Sea and Baltic
 * come from media (reported) and must not be scored as gold-confirmed.
 */
export interface MaritimeGoldItem {
  id: string;
  sea: MaritimeSea;
  /** ISO date (day precision only; IMO lists carry no time of day). */
  date: string;
  dateEnd?: string;
  ship: string;
  imo: string | null;
  flag?: string;
  shipType?: string;
  /** Free text from IMO; no coordinates are published. */
  locationText: string;
  description: string;
  goldSource: "IMO" | "media";
  /** Absent means IMO-confirmed. */
  confidence?: "confirmed" | "reported";
  /** Absent means a ship attack. */
  incidentType?: "ship_attack" | "infrastructure_damage";
  goldRef: string;
}

interface GoldFile {
  version: number;
  updatedAt: string;
  note: string;
  items: MaritimeGoldItem[];
}

const files: Record<MaritimeSea, GoldFile> = {
  red_sea: redSea as GoldFile,
  hormuz: hormuz as GoldFile,
  black_sea: blackSea as GoldFile,
  baltic: baltic as GoldFile,
};

export function loadMaritimeGold(sea?: MaritimeSea): MaritimeGoldItem[] {
  if (sea) return files[sea].items;
  return Object.values(files).flatMap((f) => f.items);
}
