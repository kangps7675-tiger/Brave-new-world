/**
 * 위장·다크플리트·무기고 개조 선박 시드.
 * @see https://github.com/arandomguyhere/AIS_Tracker.git
 *
 * Sources inside that repo:
 * - data/vessels.json + docs/demo_data.json (arsenal ship ZHONG DA 79)
 * - dark_fleet.py KNOWN_DARK_FLEET_VESSELS
 * - schema.sql vessels / events (ais_dark, weapons_observed)
 */

export const AIS_TRACKER_URL = "https://github.com/arandomguyhere/AIS_Tracker.git" as const;

export const AIS_TRACKER_ATTRIBUTION =
  `위장선박 OSINT: AIS_Tracker · ${AIS_TRACKER_URL}` as const;

export type DisguisedVesselKind = "arsenal-ship" | "dark-fleet";

export type DisguisedVesselClassification =
  | "confirmed"
  | "suspected"
  | "monitoring"
  | "cleared"
  | "flagged"
  | "sanctioned"
  | "seized"
  | "pursued"
  | "active";

export type DisguisedVessel = {
  id: string;
  shipName: string;
  aliases: string[];
  mmsi: string | null;
  imo: string | null;
  flagState: string | null;
  vesselType: string | null;
  kind: DisguisedVesselKind;
  classification: DisguisedVesselClassification;
  threatLevel: "critical" | "high" | "medium" | "low" | null;
  region: "china" | "russia" | "iran" | "venezuela" | "other";
  lat: number;
  lng: number;
  heading: number | null;
  intelNotes: string;
  keywords: string[];
  source: typeof AIS_TRACKER_URL;
};

/** Last-known / seed positions from AIS_Tracker demo + dark_fleet notes */
export const DISGUISED_VESSELS: DisguisedVessel[] = [
  {
    id: "ais-tracker-zhong-da-79",
    shipName: "ZHONG DA 79",
    aliases: ["ZHONGDA 79", "ZHONGDA79", "ZHONG DA79"],
    mmsi: "413000000",
    imo: null,
    flagState: "China",
    vesselType: "Container Feeder",
    kind: "arsenal-ship",
    classification: "confirmed",
    threatLevel: "critical",
    region: "china",
    lat: 31.2456,
    lng: 121.489,
    heading: 0,
    intelNotes:
      "Commercial container feeder converted to arsenal ship (containerized VLS/CIWS). Retains civilian designation. Seed from AIS_Tracker vessels DB.",
    keywords: ["arsenal ship", "containerized missile", "VLS", "CIWS", "Type 1130"],
    source: AIS_TRACKER_URL,
  },
  {
    id: "ais-tracker-skipper",
    shipName: "Skipper",
    aliases: ["Adisa"],
    mmsi: null,
    imo: "9179834",
    flagState: "Cameroon",
    vesselType: "Tanker",
    kind: "dark-fleet",
    classification: "seized",
    threatLevel: "critical",
    region: "venezuela",
    lat: 10.65,
    lng: -66.95,
    heading: null,
    intelNotes:
      "Seized Dec 2025. 80+ days AIS spoofing. Iran–Venezuela–China route. From AIS_Tracker dark_fleet.py KNOWN_DARK_FLEET_VESSELS.",
    keywords: ["dark fleet", "ais spoof", "sanctions"],
    source: AIS_TRACKER_URL,
  },
  {
    id: "ais-tracker-centuries",
    shipName: "Centuries",
    aliases: [],
    mmsi: null,
    imo: null,
    flagState: null,
    vesselType: "Tanker",
    kind: "dark-fleet",
    classification: "seized",
    threatLevel: "high",
    region: "venezuela",
    lat: 10.5,
    lng: -66.8,
    heading: null,
    intelNotes: "Seized December 2025 alongside Skipper. AIS_Tracker dark_fleet seed.",
    keywords: ["dark fleet", "sanctions"],
    source: AIS_TRACKER_URL,
  },
  {
    id: "ais-tracker-bella-1",
    shipName: "Bella 1",
    aliases: [],
    mmsi: null,
    imo: null,
    flagState: null,
    vesselType: "Tanker",
    kind: "dark-fleet",
    classification: "pursued",
    threatLevel: "high",
    region: "venezuela",
    lat: 12.0,
    lng: -68.5,
    heading: null,
    intelNotes: "Pursued by U.S. Navy December 2025. AIS_Tracker dark_fleet seed.",
    keywords: ["dark fleet", "pursuit"],
    source: AIS_TRACKER_URL,
  },
  {
    id: "ais-tracker-virat",
    shipName: "Virat",
    aliases: [],
    mmsi: null,
    imo: null,
    flagState: null,
    vesselType: "Tanker",
    kind: "dark-fleet",
    classification: "flagged",
    threatLevel: "high",
    region: "russia",
    lat: 44.5,
    lng: 33.5,
    heading: null,
    intelNotes: "Struck by Ukraine SBU drone Nov 2025, Black Sea. AIS_Tracker dark_fleet seed.",
    keywords: ["dark fleet", "black sea"],
    source: AIS_TRACKER_URL,
  },
  {
    id: "ais-tracker-kairos",
    shipName: "Kairos",
    aliases: [],
    mmsi: null,
    imo: null,
    flagState: null,
    vesselType: "Tanker",
    kind: "dark-fleet",
    classification: "flagged",
    threatLevel: "high",
    region: "russia",
    lat: 41.0,
    lng: 29.0,
    heading: null,
    intelNotes: "Struck by Ukraine SBU drone Nov 2025, Turkish waters. AIS_Tracker dark_fleet seed.",
    keywords: ["dark fleet", "black sea"],
    source: AIS_TRACKER_URL,
  },
  {
    id: "ais-tracker-dashan",
    shipName: "Dashan",
    aliases: [],
    mmsi: null,
    imo: null,
    flagState: null,
    vesselType: "Tanker",
    kind: "dark-fleet",
    classification: "sanctioned",
    threatLevel: "high",
    region: "russia",
    lat: 44.2,
    lng: 34.0,
    heading: null,
    intelNotes: "EU-sanctioned tanker struck by Ukraine drone, Black Sea. AIS_Tracker dark_fleet seed.",
    keywords: ["dark fleet", "eu sanctioned"],
    source: AIS_TRACKER_URL,
  },
  {
    id: "ais-tracker-vani",
    shipName: "Vani",
    aliases: [],
    mmsi: null,
    imo: null,
    flagState: null,
    vesselType: "Tanker",
    kind: "dark-fleet",
    classification: "active",
    threatLevel: "high",
    region: "iran",
    lat: 36.0,
    lng: 120.3,
    heading: null,
    intelNotes:
      "Disappeared May 2025 off Malaysia, reappeared with full load; delivered to Qingdao. AIS_Tracker dark_fleet seed.",
    keywords: ["dark fleet", "sts", "malaysia"],
    source: AIS_TRACKER_URL,
  },
  {
    id: "ais-tracker-nora",
    shipName: "Nora",
    aliases: [],
    mmsi: null,
    imo: null,
    flagState: null,
    vesselType: "Tanker",
    kind: "dark-fleet",
    classification: "sanctioned",
    threatLevel: "high",
    region: "iran",
    lat: 29.0,
    lng: 50.3,
    heading: null,
    intelNotes: "Loaded crude at Kharg Island; STS transfer to Vani. AIS_Tracker dark_fleet seed.",
    keywords: ["dark fleet", "kharg", "sts"],
    source: AIS_TRACKER_URL,
  },
  {
    id: "ais-tracker-reston",
    shipName: "Reston",
    aliases: [],
    mmsi: null,
    imo: null,
    flagState: null,
    vesselType: "Tanker",
    kind: "dark-fleet",
    classification: "sanctioned",
    threatLevel: "medium",
    region: "iran",
    lat: 2.5,
    lng: 104.5,
    heading: null,
    intelNotes: "Received 1M+ barrels Iranian oil via STS early 2025. AIS_Tracker dark_fleet seed.",
    keywords: ["dark fleet", "sts"],
    source: AIS_TRACKER_URL,
  },
];

function normName(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const NAME_INDEX = (() => {
  const map = new Map<string, DisguisedVessel>();
  for (const v of DISGUISED_VESSELS) {
    map.set(normName(v.shipName), v);
    for (const alias of v.aliases) map.set(normName(alias), v);
  }
  return map;
})();

const MMSI_INDEX = (() => {
  const map = new Map<string, DisguisedVessel>();
  for (const v of DISGUISED_VESSELS) {
    if (v.mmsi) map.set(v.mmsi, v);
  }
  return map;
})();

export function lookupDisguisedVessel(input: {
  mmsi?: string | null;
  shipName?: string | null;
}): DisguisedVessel | null {
  if (input.mmsi && MMSI_INDEX.has(input.mmsi)) return MMSI_INDEX.get(input.mmsi) ?? null;
  if (input.shipName) {
    const hit = NAME_INDEX.get(normName(input.shipName));
    if (hit) return hit;
  }
  return null;
}

export function isDisguisedVesselMatch(input: {
  mmsi?: string | null;
  shipName?: string | null;
}): boolean {
  return lookupDisguisedVessel(input) != null;
}
