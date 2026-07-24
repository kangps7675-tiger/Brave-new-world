import type {
  AisVessel,
  ConflictEvent,
  ConflictZoneFeature,
  CountryFeature,
  DisputeArea,
  FirmsFire,
  MilitaryAircraft,
  MilitaryBaseArea,
  SearchPlace,
  StaticPoint,
  UkraineControlZone,
  UkraineSettlement,
  UsCarrier,
  ViinaRenderMeta,
} from "@/data/geoTypes";
import type { ScoredEvent } from "@/data/eventTiers";
import type { ChinaTheaterIncident } from "@/data/chinaTheaterIncidentsSeed";
import type { KoreaMissileIncident } from "@/data/koreaMissileIncidentsSeed";
import type { SituationCallout } from "@/data/situationCalloutTypes";
import type { FirmsSoundKind } from "@/lib/firmsSoundClassify";
import type { GdeltTagHtmlMarker } from "@/lib/gdeltLocationTagMarker";
import type { UkraineGdeltNeonMarker } from "@/lib/ukraineGdeltNeonMarker";
import type { NewfeedsAttackPoint } from "@/lib/newfeeds";
import type { NeptunLiveThreat } from "@/lib/neptun";
import type { NeptunImpactFlash } from "@/lib/neptunImpactFlash";
import type { TzevaAdomAlert } from "@/lib/tzevaAdom";
import type { MergedViewConfig } from "@/lib/viewPackages";
import type { PlaceLabelTier } from "@/lib/placeLabelColors";
import type { NewsTheater } from "@/lib/news/types";

export type Selection =
  | { kind: "event"; item: ConflictEvent }
  | { kind: "dispute"; item: DisputeArea }
  | { kind: "conflict-zone"; item: ConflictZoneFeature }
  | { kind: "country"; item: CountryFeature }
  | { kind: "ais"; item: AisVessel }
  | {
      kind: "mil";
      item: MilitaryAircraft;
      /** 지경학 민간 운항 vs 지정학 군용 */
      traffic?: "military" | "civil";
    }
  | { kind: "ukraine-control"; item: UkraineControlZone }
  | { kind: "us-carrier"; item: UsCarrier }
  | { kind: "neptun-threat"; item: NeptunLiveThreat };

export type AnalysisSelection = Exclude<Selection, { kind: "neptun-threat" }>;

export type PolygonLayerFeature =
  | (CountryFeature & { polygonLayer: "country" })
  | (MilitaryBaseArea & { polygonLayer: "military-base" })
  | (ConflictZoneFeature & { polygonLayer: "conflict-zone" })
  | (UkraineControlZone & {
      polygonLayer: "ukraine-ru" | "ukraine-ua" | "ukraine-contested";
    });

export type GlobePoint = ScoredEvent & { markerId: string; displayKind: "event" };

export type StaticGlobePoint = StaticPoint & { markerId: string; displayKind: "static" };

export type MilGlobePoint = MilitaryAircraft & { markerId: string; displayKind: "mil" };

export type MilHtmlMarker = MilitaryAircraft & {
  markerId: string;
  displayKind: "mil-html" | "civ-html";
};

export type AisGlobePoint = AisVessel & { markerId: string; displayKind: "ais" };
export type AisHtmlMarker = AisVessel & { markerId: string; displayKind: "ais-html" };

export type FirmsFireGlobePoint = FirmsFire & {
  markerId: string;
  displayKind: "firms-fire";
  soundKind: FirmsSoundKind;
};

export type ConflictClusterPoint = ConflictZoneFeature & {
  markerId: string;
  displayKind: "conflict-cluster";
  lat: number;
  lng: number;
};

/** 지도 펄스 링 — AI 클러스터 · FIRMS · 축 주장 지역 */
export type PulseRingPoint =
  | (ConflictClusterPoint & { pulseKind: "ai-zone" })
  | {
      pulseKind: "firms-bomb";
      id: string;
      lat: number;
      lng: number;
      frp: number | null;
      markerId: string;
    }
  | {
      pulseKind: "claim";
      id: string;
      lat: number;
      lng: number;
      radiusScale: number;
      color: string;
      markerId: string;
      label: string;
    }
  | {
      pulseKind: "friction";
      id: string;
      lat: number;
      lng: number;
      radiusScale: number;
      color: string;
      markerId: string;
      label: string;
    }
  | {
      pulseKind: "choke-glow";
      id: string;
      lat: number;
      lng: number;
      glow: number;
      /** 해역 폭에 맞춘 링 반경(deg) */
      radiusScale: number;
      markerId: string;
    };

export type TzevaAdomGlobePoint = TzevaAdomAlert & {
  markerId: string;
  displayKind: "tzeva-adom";
};

export type NewfeedsAttackGlobePoint = NewfeedsAttackPoint & {
  markerId: string;
  displayKind: "newfeeds-attack";
  hapiTag?: string | null;
};

export type ChinaTheaterIncidentHtmlMarker = ChinaTheaterIncident & {
  markerId: string;
  displayKind: "china-theater-incident";
};

export type KoreaMissileIncidentHtmlMarker = KoreaMissileIncident & {
  markerId: string;
  displayKind: "korea-missile-incident";
};

export type NeptunImpactHtmlMarker = NeptunImpactFlash & {
  markerId: string;
  displayKind: "neptun-impact";
  lat: number;
  lng: number;
};

export type NeptunHtmlMarker = NeptunLiveThreat & {
  markerId: string;
  displayKind: "neptun-html";
  lat: number;
  lng: number;
};

export type UsCarrierHtmlMarker = UsCarrier & {
  markerId: string;
  displayKind: "us-carrier-html";
  lat: number;
  lng: number;
};

export type CasualtySkullHtmlMarker = {
  markerId: string;
  displayKind: "casualty-skull";
  id: string;
  theaterId: string;
  locationCode?: string;
  lat: number;
  lng: number;
      killed: number;
  wounded: number;
  /** 부상 숫자 대신 표시 (UCDP 미집계 등) */
  woundedDisplay?: string;
  killedLabel: string;
  woundedLabel: string;
  asOf: string;
  sourceHint: string;
  elegyLines: readonly [string, string];
  woundedNote?: string;
  hideWounded?: boolean;
  territorySpanDeg: number;
  /** 마커에 항상 보이는 출처 한 줄 (ACLED 표기 정책) */
  sourceAttribution?: string;
  admin1Name?: string;
};

export type NuclearStockpileHtmlMarker = {
  markerId: string;
  displayKind: "nuclear-icbm";
  code: string;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
  warheads: number;
  year: number;
};

export type SituationCalloutMarker = SituationCallout & {
  markerId: string;
  displayKind: "situation-callout";
};

export type UkraineSettlementHtmlMarker = UkraineSettlement & {
  markerId: string;
  displayKind: "ua-settlement-html";
  tier: PlaceLabelTier;
};

export type FrictionPinHtmlMarker = {
  markerId: string;
  displayKind: "friction-pin";
  id: string;
  lat: number;
  lng: number;
  label: string;
  color: string;
};

export type FrictionStageHtmlMarker = {
  markerId: string;
  displayKind: "friction-stage";
  id: string;
  lat: number;
  lng: number;
  label: string;
  order: number;
  active: boolean;
};

export type NewsStreamNeonMarker = {
  markerId: string;
  displayKind: "news-stream-neon";
  id: string;
  lat: number;
  lng: number;
  title: string;
  link: string;
  kind: "war" | "tension" | "diplomatic";
  accent: "red" | "orange" | "blue" | "cyan" | "white";
  intensity: number;
  /** 전장 — 관점 패널 시장 반응 카드용 */
  theater?: NewsTheater;
  placeLabel?: string;
  /** 같은 사건을 보도한 여러 매체 관점 (한 사건, 여러 시각) */
  perspectives?: {
    title: string;
    link: string;
    source: string;
    trustTier: number;
  }[];
};

export type TelegramNeonMarker = {
  markerId: string;
  displayKind: "telegram-neon";
  id: string;
  lat: number;
  lng: number;
  label: string;
  title: string;
  accent: "white";
  intensity: number;
};

export type GlobeDisplayPoint =
  | GlobePoint
  | GdeltTagHtmlMarker
  | UkraineGdeltNeonMarker
  | StaticGlobePoint
  | MilGlobePoint
  | AisGlobePoint
  | FirmsFireGlobePoint
  | ConflictClusterPoint
  | TzevaAdomGlobePoint
  | NewfeedsAttackGlobePoint
  | CasualtySkullHtmlMarker
  | ChinaTheaterIncidentHtmlMarker
  | KoreaMissileIncidentHtmlMarker;

export type GlobeLabel = SearchPlace & { labelKind: "place" };

export type HtmlOverlayMarker =
  | StaticGlobePoint
  | GlobePoint
  | UsCarrierHtmlMarker
  | MilHtmlMarker
  | AisHtmlMarker
  | GdeltTagHtmlMarker
  | UkraineGdeltNeonMarker
  | SituationCalloutMarker
  | UkraineSettlementHtmlMarker
  | NeptunHtmlMarker
  | NeptunImpactHtmlMarker
  | FrictionPinHtmlMarker
  | FrictionStageHtmlMarker
  | CasualtySkullHtmlMarker
  | NuclearStockpileHtmlMarker
  | ChinaTheaterIncidentHtmlMarker
  | KoreaMissileIncidentHtmlMarker
  | NewfeedsAttackGlobePoint
  | NewsStreamNeonMarker
  | TelegramNeonMarker;

export type HoverCard =
  | {
      kind: "event";
      title: string;
      detail: string;
      badge?: string;
      meta?: string;
      body?: string;
      hint?: string;
    }
  | { kind: "static"; title: string; detail: string; meta?: string; body?: string; hint?: string }
  | { kind: "polygon"; title: string; detail: string; meta?: string; body?: string; hint?: string }
  | { kind: "path"; title: string; detail: string; meta?: string; body?: string; hint?: string }
  | { kind: "ocean"; title: string; detail: string; meta?: string; body?: string; hint?: string };

export type GlobeSize = {
  width: number;
  height: number;
};

export type ViewState = {
  lat: number;
  lng: number;
  altitude: number;
};

/** 로딩→환영→도메인→확 줌아웃→세부. 입·출구(1회), 로테이션 아님. */
export type EntryGate = "caution" | "welcome" | "domain" | "overview" | "mode" | null;

export type GlobeDashboardProps = {
  viinaMeta?: ViinaRenderMeta | null;
  initialViewConfig?: MergedViewConfig | null;
  onBootProgress?: (progress: number) => void;
  onBootReady?: () => void;
};
