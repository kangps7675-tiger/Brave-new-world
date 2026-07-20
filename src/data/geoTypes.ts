export type EventCategory =
  | "Battles"
  | "Violence against civilians"
  | "Protests"
  | "Riots"
  | "Strategic developments";

export type EventTier = "war" | "diplomatic" | "alliance" | "protest";

export type GreatPowerScope = "rivalry" | "intervention";

export type GeoJsonPolygonCoords = number[][][];
export type GeoJsonMultiPolygonCoords = number[][][][];
export type GeoJsonLineCoords = number[][];
export type GeoJsonMultiLineCoords = number[][][];

export type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: GeoJsonPolygonCoords }
  | { type: "MultiPolygon"; coordinates: GeoJsonMultiPolygonCoords }
  | { type: "LineString"; coordinates: GeoJsonLineCoords }
  | { type: "MultiLineString"; coordinates: GeoJsonMultiLineCoords };

export type ConflictEvent = {
  id: string;
  globalEventId: string;
  eventDate: string | null;
  country: string | null;
  lat: number;
  lng: number;
  category: EventCategory;
  severity: number;
  goldsteinScale: number | null;
  sourceUrl: string | null;
  title: string | null;
  createdAt: string | null;
  actor1Country?: string | null;
  actor2Country?: string | null;
  eventTier?: EventTier;
  tensionScore?: number;
  greatPowerScope?: GreatPowerScope | null;
};

export type DisputeCategory = "①" | "②" | "③" | "④";

export type DisputeArea = {
  id: string;
  kind: "dispute";
  name: string;
  nameLong: string;
  admin: string | null;
  sovereignty: string | null;
  type: string | null;
  note: string | null;
  source?: "main" | "minor";
  scalerank?: number;
  /**
   * combat/bombardment = 실제 교전·폭격·피해가중 → 빨간 테두리/빗금
   * gray-zone = 회색지대 압박
   * territorial = 영토·경계 분쟁
   * tension = 일반 긴장
   */
  hazardClass?: "combat" | "bombardment" | "gray-zone" | "territorial" | "tension";
  center: {
    lat: number;
    lng: number;
  };
  categories: DisputeCategory[];
  tension: "low" | "medium" | "high";
  matchedEventCount: number;
  geometry: GeoJsonGeometry;
};

export type CountryFeature = {
  id: string;
  kind: "country";
  name: string;
  nameLong: string;
  isoA3: string | null;
  continent: string | null;
  population: number | null;
  center: {
    lat: number;
    lng: number;
  };
  geometry: GeoJsonGeometry;
};

export type PlaceKind = "city" | "town" | "village" | "country" | "dispute";

export type SearchPlace = {
  id: string;
  name: string;
  nameKo?: string | null;
  country: string;
  lat: number;
  lng: number;
  type: PlaceKind;
  population?: number | null;
  scalerank?: number;
  minZoom?: number | null;
  adm1?: string | null;
  featureClass?: string | null;
};

export type TransportPath = {
  id: string;
  kind:
    | "road"
    | "rail"
    | "coastline"
    | "dispute-boundary"
    | "country-border"
    | "shipping-lane"
    | "submarine-cable"
    | "oil-pipeline"
    | "gas-pipeline"
    | "arms-embargo"
    | "dispute-zone"
    | "dispute-hatch"
    | "conflict-hatch"
    | "ua-axis"
    | "ru-axis"
    | "msr"
    | "ua-advance"
    | "ru-advance"
    | "ukraine-ru-front"
    | "ukraine-ua-front"
    | "ukraine-contested-front"
    | "ukraine-combat-zone"
    | "ukraine-ru-claim"
    | "ukraine-ua-claim"
    | "ukraine-ua-gain"
    | "ukraine-ru-occupied"
    | "ukraine-ua-occupied"
    | "ukraine-ru-occupied-hatch"
    | "ukraine-ua-occupied-hatch"
    | "ukraine-ru-claim-hatch"
    | "ukraine-ua-claim-hatch"
    | "neptun-trail"
    | "neptun-projection"
    | "neptun-trail-archived"
    /** IRN–CHN–RUS–PRK 축·스포크 관계망 호 */
    | "axis-link"
    /** World Bank BRI 무역·운송 연결성 (chn→국가·도시) */
    | "bri-trade"
    /** 미국 DFC 활성 프로젝트 기반 개발금융 공급망 */
    | "us-dfc-supply";
  name: string | null;
  scalerank: number;
  lengthKm: number | null;
  /** NEPTUN 궤적 색상 오버라이드 · axis-link 관계색 */
  accentColor?: string;
  bbox: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  };
  points: TransportPathPoint[];
};

export type TransportPathPoint = {
  lat: number;
  lng: number;
  /** globe.gl pathPointAlt — 지구 반경 배수 (0=지표) */
  alt?: number;
};

export type StaticPointKind =
  | "airport"
  | "port"
  | "resource"
  | "military-base"
  | "cable-landing"
  | "nuclear-site"
  | "internet-exchange"
  | "refugee-camp"
  | "ucdp-event"
  | "ai-data-center"
  | "economic-center"
  | "sanctions-entity"
  | "space-launch"
  | "lng-terminal"
  | "chokepoint"
  | "logistics-hub"
  | "submarine-tunnel"
  /** Critical Node Atlas (MIT) — maritime/cables/energy/financial/tech */
  | "critical-node"
  | "gem-coal-plant"
  | "gem-coal-mine"
  | "gem-coal-terminal"
  | "gem-nuclear"
  | "gem-solar"
  | "gem-wind"
  | "gem-hydro"
  | "gem-geothermal"
  | "gem-bioenergy"
  | "gem-oil-gas-plant"
  | "gem-oil-gas-extraction"
  | "gem-iron-ore"
  | "gem-cement"
  | "gem-steel"
  | "gem-chemical";

export type StaticPoint = {
  id: string;
  kind: StaticPointKind;
  name: string;
  lat: number;
  lng: number;
  tier?: number;
  meta?: Record<string, string | number | null>;
};

/** NASA FIRMS 위성 화재 탐지 */
export type FirmsFire = {
  id: string;
  lat: number;
  lng: number;
  frp: number | null;
  brightness: number | null;
  confidence: string | null;
  acqDate: string | null;
  acqTime: string | null;
  satellite: string | null;
  daynight: string | null;
};

/** 미군기지 부지 폴리곤 (파란 면 채색용) */
export type MilitaryBaseArea = {
  id: string;
  kind: "military-base-area";
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  geometry: GeoJsonGeometry;
  component?: string | null;
  jointBase?: string | null;
  state?: string | null;
  country?: string | null;
  area?: number;
  footprint?: number;
  tier?: number;
};

export type DisputeOverview = {
  id: string;
  overviewKo: string;
  parties: string[];
  updatedAt: string;
};

export type AisVessel = {
  id: string;
  mmsi: string;
  shipName: string | null;
  lat: number;
  lng: number;
  speedOverGround: number | null;
  courseOverGround: number | null;
  trueHeading: number | null;
  timestamp: string | null;
  /** ITU AIS ship & cargo type (e.g. 70 cargo, 35 military) */
  shipType: number | null;
  shipTypeLabel: string | null;
  /** 지정학=military · 지경학=commercial */
  category: "military" | "commercial" | "other";
  /** 군함 함종 (비군함 null). 선명·헐넘버 휴리스틱 */
  militaryKind?: import("@/lib/aisVesselClass").AisMilitaryKind | null;
  /**
   * AIS_Tracker 위장·다크플리트·무기고 개조 선박 매칭.
   * @see https://github.com/arandomguyhere/AIS_Tracker.git
   */
  disguised?: boolean;
  disguisedKind?: "arsenal-ship" | "dark-fleet" | null;
  /**
   * OFAC/UN/EU/UK 제재 리스트(sanctions-entities.json) 실매칭 결과.
   * DisguisedVessel.classification의 서술형 "sanctioned" 표기와 달리
   * 실제 제재 엔티티명 대조로 확인된 경우만 채워진다.
   */
  sanctionsMatch?: { entityName: string; list: string; asOf: string } | null;
};

export type MilitaryAircraft = {
  id: string;
  hex: string;
  callsign: string | null;
  /** 등록번호 (registration) */
  registration: string | null;
  lat: number;
  lng: number;
  /** 기압 고도 ft */
  altitude: number | null;
  /** 기하 고도 ft */
  altitudeGeom: number | null;
  /** 지상속도 kn */
  groundSpeed: number | null;
  /** IAS kn */
  indicatedAirspeed: number | null;
  /** TAS kn */
  trueAirspeed: number | null;
  mach: number | null;
  /** true track deg */
  track: number | null;
  trackRate: number | null;
  roll: number | null;
  magHeading: number | null;
  trueHeading: number | null;
  /** ft/min */
  baroRate: number | null;
  geomRate: number | null;
  squawk: string | null;
  emergency: string | null;
  /** ICAO type designator (t) */
  type: string | null;
  /** emitter category */
  category: string | null;
  /** ADS-B dbFlags raw */
  dbFlags: number | null;
  windDirection: number | null;
  windSpeed: number | null;
  navAltitudeMcp: number | null;
  navHeading: number | null;
  navModes: string[] | null;
  /** 초 — 마지막 메시지 */
  seen: number | null;
  /** 초 — 마지막 위치 */
  seenPos: number | null;
  rssi: number | null;
  /** ACAS RA advisory text if present */
  acasAdvisory: string | null;
  timestamp: string | null;
  /**
   * Bellingcat Turnstone modes.csv military hex match.
   * @see https://github.com/bellingcat/adsb-history.git
   */
  bellingcatMilitary?: boolean;
};

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

export type ConflictZoneFeature = {
  id: string;
  kind: "conflict-zone";
  name: string;
  center: { lat: number; lng: number };
  geometry: GeoJsonGeometry;
  eventCount: number;
  tension: "low" | "medium" | "high";
  /** AI 데모 탐지 메타 */
  aiScore?: number;
  aiSummary?: string;
  detectedBy?: "ai-demo";
  sources?: string[];
  /** 서버 사전계산 빗금·테두리 (있으면 클라 geometry hatch 생략) */
  hatchPaths?: TransportPath[];
};

export type ArmsEmbargoZone = {
  id: string;
  kind: "arms-embargo";
  name: string;
  isoA3: string | null;
  center: { lat: number; lng: number };
  geometry: GeoJsonGeometry | null;
  sources: string[];
};

export type UkraineControlZone = {
  id: string;
  kind: "ukraine-control";
  controlStatus: "RU" | "CONTESTED" | "UA";
  geonameId?: string;
  name: string;
  nameLong: string;
  adm1?: string | null;
  adm2?: string | null;
  population?: number | null;
  center: { lat: number; lng: number };
  geometry: GeoJsonGeometry;
};

export type UkraineSettlement = {
  geonameId: string;
  name: string;
  nameLong?: string;
  lat: number;
  lng: number;
  adm1?: string | null;
  adm2?: string | null;
  population?: number | null;
  controlStatus: "RU" | "UA" | "CONTESTED";
};

export type UkraineControlData = {
  generatedAt: string;
  source: string;
  controlDate: string;
  vcontrolVersion: string | null;
  ruCellCount: number;
  settlements?: UkraineSettlement[];
  overviewFeatures?: UkraineControlZone[];
  features: UkraineControlZone[];
};

/** RSC·클라이언트 공유 — VIINA 렌더 캐시 존재 여부만 전달 (geometry 제외) */
export type ViinaRenderMeta = {
  available: boolean;
  controlDate: string | null;
  ruCellCount: number;
  featureCount: number;
};

export type AppData = {
  generatedAt: string;
  profile?: string;
  sources: {
    naturalEarth: string;
    gdelt: string;
  };
  countries: CountryFeature[];
  disputes: DisputeArea[];
  places: SearchPlace[];
  events: ConflictEvent[];
  roads: TransportPath[];
  railroads: TransportPath[];
};
