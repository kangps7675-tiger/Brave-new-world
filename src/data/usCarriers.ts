export type UsCarrierStatus = "deployed" | "home" | "maintenance";

export type UsCarrier = {
  id: string;
  name: string;
  hull: string;
  lat: number;
  lng: number;
  status: UsCarrierStatus;
  location: string;
  airwing: string;
  notes: string;
};

export const US_CARRIER_STATUS_COLORS: Record<UsCarrierStatus, string> = {
  deployed: "#dc2626",
  home: "#f59e0b",
  maintenance: "#6b7280",
};

export const US_CARRIER_STATUS_LABELS: Record<UsCarrierStatus, string> = {
  deployed: "배치·작전",
  home: "항구·주둔",
  maintenance: "정비·대기",
};

export const US_CARRIER_STATUS_LABELS_EN: Record<UsCarrierStatus, string> = {
  deployed: "Deployed/Active",
  home: "In Port/Home",
  maintenance: "Maintenance",
};

/**
 * Sep 6, 2026 공개 보도 스냅샷 (USNI Fleet Tracker Aug 31 · TWZ/관련 보도).
 * 런타임은 `/api/us-carriers/warm`이 USNI Fleet Tracker로 D1 스냅샷을 덮어쓴다.
 * 좌표는 대략 위치(항구·해역 대표점) — GPS가 아님.
 */
export const US_CARRIERS_SEED: UsCarrier[] = [
  {
    id: "cvn-68",
    name: "USS Nimitz",
    hull: "CVN 68",
    lat: 47.6,
    lng: -122.6,
    status: "maintenance",
    location: "Kitsap-Bremerton, WA (Home Port)",
    airwing: "CVW-17 (None)",
    notes: "Decommissioning / inactivation process (Bremerton)",
  },
  {
    id: "cvn-69",
    name: "USS Dwight D. Eisenhower",
    hull: "CVN 69",
    lat: 28.5,
    lng: -79.5,
    status: "deployed",
    location: "Western Atlantic · off Florida (CQ/training)",
    airwing: "CVW-3",
    notes: "Underway for East Coast CQ/TRACOM after Aug 21 Norfolk departure (USNI Aug 31)",
  },
  {
    id: "cvn-70",
    name: "USS Carl Vinson",
    hull: "CVN 70",
    lat: 32.5,
    lng: -119.5,
    status: "deployed",
    location: "Eastern Pacific · near California (TSTA/FEP)",
    airwing: "CVW-2",
    notes: "Underway routine ops / training near California (USNI Aug 31)",
  },
  {
    id: "cvn-71",
    name: "USS Theodore Roosevelt",
    hull: "CVN 71",
    lat: 32.71,
    lng: -117.18,
    status: "home",
    location: "San Diego, CA (Home Port) — pre-deployment",
    airwing: "CVW-11",
    notes: "Preparing September deployment; reported relief for GW / Middle East (open press)",
  },
  {
    id: "cvn-72",
    name: "USS Abraham Lincoln",
    hull: "CVN 72",
    lat: 13.08,
    lng: 100.88,
    status: "deployed",
    location: "Laem Chabang, Thailand · homeward transit",
    airwing: "CVW-9",
    notes: "Singapore Strait transit then Thailand liberty; returning West Coast (USNI/TWZ ~Sep 1)",
  },
  {
    id: "cvn-73",
    name: "USS George Washington",
    hull: "CVN 73",
    lat: 17.2,
    lng: 63.8,
    status: "deployed",
    location: "Arabian Sea · CENTCOM",
    airwing: "CVW-5",
    notes: "Middle East deployment — reported relief for Abraham Lincoln (open press Aug–Sep 2026)",
  },
  {
    id: "cvn-74",
    name: "USS John C. Stennis",
    hull: "CVN 74",
    lat: 37.0,
    lng: -76.4,
    status: "maintenance",
    location: "Newport News Shipyard, VA",
    airwing: "None",
    notes: "RCOH — multi-year yard period",
  },
  {
    id: "cvn-75",
    name: "USS Harry S. Truman",
    hull: "CVN 75",
    lat: 36.91,
    lng: -76.31,
    status: "home",
    location: "Norfolk, VA (Home Port)",
    airwing: "CVW-1",
    notes: "East Coast homeport (no open transit reported in late-Aug tracker)",
  },
  {
    id: "cvn-76",
    name: "USS Ronald Reagan",
    hull: "CVN 76",
    lat: 47.61,
    lng: -122.58,
    status: "maintenance",
    location: "PSNS & IMF, Bremerton, WA",
    airwing: "None",
    notes: "DPIA nearing completion — ops expected later (open press Aug 2026)",
  },
  {
    id: "cvn-77",
    name: "USS George H.W. Bush",
    hull: "CVN 77",
    lat: 19.0,
    lng: 61.0,
    status: "deployed",
    location: "Arabian Sea · CENTCOM",
    airwing: "CVW-7",
    notes: "Middle East deployed CSG (USNI/open press Aug–Sep 2026)",
  },
  {
    id: "cvn-78",
    name: "USS Gerald R. Ford",
    hull: "CVN 78",
    lat: 36.91,
    lng: -76.31,
    status: "home",
    location: "Norfolk, VA (Home Port)",
    airwing: "CVW-8",
    notes: "Post long deployment — East Coast homeport (Sep 2026 open reporting)",
  },
];

export const US_CARRIER_BASE_PORTS = [
  { id: "san-diego", name: "San Diego", lat: 32.7, lng: -117.2 },
  { id: "norfolk", name: "Norfolk", lat: 36.9, lng: -76.3 },
  { id: "yokosuka", name: "Yokosuka", lat: 35.3, lng: 139.7 },
  { id: "bremerton", name: "Bremerton", lat: 47.6, lng: -122.6 },
] as const;
