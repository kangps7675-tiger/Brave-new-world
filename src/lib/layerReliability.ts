/**
 * 레이어 신뢰도 — 증거 종류·신선도·주의 한 줄 (제품 SSOT).
 *
 * 매체 Tier(T1–3, mediaTiers)와 **다른 축**:
 *   - MediaTier = 기사·피드의 편집독립
 *   - EvidenceTier = 이 지도 레이어가 애초에 어떤 종류의 증거인가
 *
 * shipped sourceCatalog 항목은 전부 레지스트리에 있어야 한다 (테스트로 강제).
 */

import type { EvidenceTier } from "@/lib/evidenceTier";
import {
  evidenceTierHint,
  evidenceTierLabel,
  isEvidenceTierShippable,
} from "@/lib/evidenceTier";
import {
  NEWS_LAYER_SOURCE_CATALOG,
  type NewsLayerSourceNote,
  getSourceNote,
} from "@/data/sourceCatalog";
import type { LabelLanguage } from "@/lib/layerPrefs";

export type { EvidenceTier };

export type FreshnessClass =
  | "live"
  | "near-real-time"
  | "daily"
  | "static"
  | "curated";

export type LayerReliability = {
  sourceLayerId: string;
  evidenceTier: EvidenceTier;
  freshnessClass: FreshnessClass;
  caveatKo: string;
  caveatEn: string;
  /** layerPrefs boolean 키 — 호버·패널 역참조용 */
  prefsKey?: string;
};

const FRESHNESS_LABEL: Record<FreshnessClass, { ko: string; en: string }> = {
  live: { ko: "실시간", en: "Live" },
  "near-real-time": { ko: "준실시간", en: "Near real-time" },
  daily: { ko: "일별", en: "Daily" },
  static: { ko: "정적", en: "Static" },
  curated: { ko: "큐레이션", en: "Curated" },
};

/** catalog layerId → LayerPrefs 키 (있는 것만) */
const PREFS_BY_LAYER: Record<string, string> = {
  "intel-hotspots": "showIntelHotspots",
  "conflict-zones": "showWarZones",
  "military-activity": "showMilitaryActivity",
  "reef-watch": "showReefWatch",
  "air-traffic": "showAirTraffic",
  ais: "showAis",
  "disguised-vessels": "showDisguisedVessels",
  tunnels: "showSubmarineTunnels",
  "firms-fires": "showFirmsFires",
  "tzeva-adom": "showTzevaAdom",
  "ukmto-incidents": "showUkmtoIncidents",
  "escalation-signals": "showEscalationSignals",
  "navarea-warnings": "showNavareaWarnings",
  "military-exercises": "showMilitaryExercises",
  "newfeeds-iran": "showNewfeedsAttacks",
  neptun: "showNeptun",
  "ucdp-events": "showUcdpEvents",
  "space-launches": "showSpaceLaunches",
  "recon-satellites": "showReconSatellites",
  "gps-interference": "showGpsInterference",
  "cyber-incidents": "showCyberIncidents",
  "election-events": "showElectionEvents",
  "military-bases": "showMilitaryBases",
  "nuclear-sites": "showNuclearSites",
  "safecast-radiation": "showSafecast",
  "noaa-swpc": "showSwpc",
  "adsb-emergency": "showAdsbEmergency",
  "missile-silos": "showMissileSilos",
  "strategic-missile-bases": "showStrategicMissileBases",
  "missile-launch-tests": "showMissileTestSites",
  "ai-data-centers": "showAiDataCenters",
  "trade-routes": "showShippingLanes",
  "logistics-risk": "showLogisticsRisk",
  "critical-nodes": "showCriticalNodes",
  "oil-pipelines": "showOilPipelines",
  "gas-pipelines": "showGasPipelines",
  "lng-terminals": "showLngTerminals",
  "subsea-pipelines": "showSubseaPipelines",
  "pipelines-osm": "showPipelinesOsm",
  "economic-centers": "showEconomicCenters",
  "critical-minerals": "showCriticalMinerals",
  "resource-deposits": "showResourceDeposits",
  "internet-exchanges": "showInternetExchanges",
  "sanctions-entities": "showSanctionsEntities",
  "refugee-camps": "showRefugeeCamps",
  "arms-embargo-zones": "showArmsEmbargo",
  "telegram-osint": "showTelegramOsint",
  "dispute-zones-me": "showWarZones",
  "viina-ukraine-control": "showUkraineControl",
  "korea-missile-incidents": "showKoreaMissileIncidents",
  "ukraine-strikes-russia": "showRussiaStrikes",
  "china-theater-incidents": "showChinaTheaterIncidents",
  "hapi-conflict-casualties": "showHapiCasualties",
  "nuclear-warheads": "showNuclearWarheads",
  "mediazona-casualties": "showMediazonaCasualties",
  "living-conflict-taiwan": "showLivingConflictTaiwan",
};

type Override = Partial<
  Pick<LayerReliability, "evidenceTier" | "freshnessClass" | "caveatKo" | "caveatEn" | "prefsKey">
>;

/** 레이어별 증거·주의 보정 — 비어 있으면 ingest 기본값 사용 */
const OVERRIDES: Record<string, Override> = {
  "firms-fires": {
    evidenceTier: "observed",
    freshnessClass: "near-real-time",
    caveatKo: "열원 탐지 ≠ 전투 확정. 산업·산불·폭격이 섞일 수 있습니다.",
    caveatEn: "Thermal detections ≠ confirmed combat. Industry, wildfire, and strikes mix.",
  },
  ais: {
    evidenceTier: "observed",
    freshnessClass: "live",
    caveatKo: "AIS는 송신한 선박만 보입니다. 암전·스푸핑 가능.",
    caveatEn: "Only transmitting vessels appear. Dark / spoofed tracks possible.",
  },
  "disguised-vessels": {
    evidenceTier: "reported",
    freshnessClass: "near-real-time",
    caveatKo: "위장·다크플리트 시드 매칭 — 확정 판결이 아닙니다.",
    caveatEn: "Shadow-fleet seed match — not a legal determination.",
  },
  "air-traffic": {
    evidenceTier: "observed",
    freshnessClass: "live",
    caveatKo: "ADS-B 수신 범위 밖·지상 표적은 빠질 수 있습니다.",
    caveatEn: "Outside ADS-B coverage or ground targets may be missing.",
  },
  "adsb-emergency": {
    evidenceTier: "observed",
    freshnessClass: "live",
    caveatKo: "비상 스쿼크는 기계 신호입니다. 원인 해석은 별개.",
    caveatEn: "Emergency squawk is a machine signal — cause is separate.",
  },
  "gps-interference": {
    evidenceTier: "observed",
    freshnessClass: "daily",
    caveatKo: "ADS-B 기반 GNSS 이상 추정. 최소 항공기 수 미만 셀은 제외.",
    caveatEn: "GNSS anomaly estimate from ADS-B; low-traffic cells excluded.",
  },
  "telegram-osint": {
    evidenceTier: "unverified",
    freshnessClass: "live",
    caveatKo: "절반 미리보기 · 전문은 t.me. 단일·미확인 전언 — 교차검증 전 단정 금지.",
    caveatEn: "Half preview · full post on t.me. Unverified single-path claims.",
  },
  "tzeva-adom": {
    evidenceTier: "reported",
    freshnessClass: "live",
    caveatKo: "이스라엘 민간 경보 피드 기반. 지연·누락 가능.",
    caveatEn: "Based on Israeli public alert feeds — lag/gaps possible.",
  },
  "ukmto-incidents": {
    evidenceTier: "reported",
    freshnessClass: "near-real-time",
    caveatKo: "UKMTO 공지 기반. 등급·좌표는 원문 우선.",
    caveatEn: "UKMTO notices — grade and coordinates follow the source.",
  },
  "navarea-warnings": {
    evidenceTier: "reported",
    freshnessClass: "near-real-time",
    caveatKo: "항행 경보 전문. 만료·갱신을 원문에서 확인하세요.",
    caveatEn: "Navigational warnings — check source for expiry/updates.",
  },
  neptun: {
    evidenceTier: "reported",
    freshnessClass: "near-real-time",
    caveatKo: "공개 OSINT 궤적 집계. 분류·신뢰도는 항목마다 다릅니다.",
    caveatEn: "Public OSINT track aggregate — confidence varies per item.",
  },
  "newfeeds-iran": {
    evidenceTier: "reported",
    freshnessClass: "near-real-time",
    caveatKo: "이란 관련 공개 피드. 위치는 근사일 수 있습니다.",
    caveatEn: "Iran-related public feeds — locations may be approximate.",
  },
  "conflict-zones": {
    evidenceTier: "model",
    freshnessClass: "daily",
    caveatKo: "전쟁·긴장 구역 휴리스틱/시드. 국경 판결이 아닙니다.",
    caveatEn: "War/tension zone heuristics or seeds — not a border ruling.",
  },
  "military-activity": {
    evidenceTier: "reported",
    freshnessClass: "daily",
    caveatKo: "공개 군사 활동 집계. 누락·지연 있습니다.",
    caveatEn: "Public military-activity aggregate — gaps and lag exist.",
  },
  "logistics-risk": {
    evidenceTier: "model",
    freshnessClass: "daily",
    caveatKo: "초크·사건 가중 추정 점수. 관측 원본이 아닙니다.",
    caveatEn: "Weighted chokepoint/event score — not a raw observation.",
  },
  "escalation-signals": {
    // 우리가 계산한 분류 점수다. 관측이 아니다.
    evidenceTier: "model",
    freshnessClass: "near-real-time",
    caveatKo:
      "공개 뉴스에서 ‘넘으면 반응이 커질 수 있는 선’이 나왔는지만 골라 올린 알림입니다. " +
      "확전인지, 얼마나 확률 있는지, 고의인지는 판단하거나 예측하지 않습니다. 점수 근거는 전부 공개합니다.",
    caveatEn:
      "A highlight of which ‘lines that often raise the response’ public reporting mentions. " +
      "It makes no judgement or forecast of escalation, probability, or intent; every scoring factor is disclosed.",
  },
  "gta-interventions": {
    evidenceTier: "reported",
    freshnessClass: "daily",
    caveatKo:
      "GTA 연구진이 관보·공식문서를 코딩한 2차 자료. Red/Amber/Green 은 GTA 의 평가이지 " +
      "객관적 사실이 아니며, 발표–등재 시차와 커버리지 한계가 있습니다.",
    caveatEn:
      "Secondary coding of official policy documents by GTA researchers. Red/Amber/Green is " +
      "GTA's assessment, not an objective fact. Expect announcement-to-entry lag and coverage gaps.",
  },
  "viina-ukraine-control": {
    evidenceTier: "reported",
    freshnessClass: "daily",
    caveatKo: "VIINA 기반 전선 표현(Produced Work). 원본 export 없음.",
    caveatEn: "VIINA-derived front rendering (Produced Work) — no raw export.",
  },
  "hapi-conflict-casualties": {
    evidenceTier: "reported",
    freshnessClass: "daily",
    caveatKo: "HDX HAPI·ACLED. 전면전은 개전 이후 누적 사망, 부상 없음.",
    caveatEn: "HDX HAPI·ACLED — cumulative fatalities from theater start; no wounded.",
  },
  "mediazona-casualties": {
    evidenceTier: "reported",
    freshnessClass: "daily",
    caveatKo: "Mediazona 명의 전사(하한)+CSIS 부상 추정. HAPI 전선 사망과 정의가 다릅니다.",
    caveatEn: "Mediazona named KIA (lower bound) + CSIS WIA est. — not HAPI front fatalities.",
  },
  "ucdp-events": {
    evidenceTier: "reported",
    freshnessClass: "static",
    caveatKo: "UCDP 사건 스냅샷. 최신 교전과 시차가 있습니다.",
    caveatEn: "UCDP event snapshot — may lag the latest fighting.",
  },
  "sanctions-entities": {
    evidenceTier: "reported",
    freshnessClass: "curated",
    caveatKo: "공개 제재 목록 스냅샷 매칭. asOf 기준일을 확인하세요.",
    caveatEn: "Public sanctions-list snapshot match — check the as-of date.",
  },
  "living-conflict-taiwan": {
    evidenceTier: "reported",
    freshnessClass: "daily",
    caveatKo: "큐레이션 타임라인 + 일별 헤드라인. 전수 사료가 아닙니다.",
    caveatEn: "Curated timeline + daily headlines — not a full archive.",
  },
  "news-economy-rss": {
    evidenceTier: "reported",
    freshnessClass: "near-real-time",
    caveatKo: "경제 RSS. 매체 Tier(T1–3)는 별도 축입니다.",
    caveatEn: "Economy RSS — media Tier (T1–3) is a separate axis.",
  },
  "world-stats": {
    evidenceTier: "reported",
    freshnessClass: "static",
    caveatKo: "외부 거시 지표 API. 연도·방법론은 원문 기준.",
    caveatEn: "External macro stats API — year/method follow the source.",
  },
  "basemap-openfreemap-liberty": {
    evidenceTier: "model",
    freshnessClass: "static",
    caveatKo: "배경 지도 타일. 사건 증거가 아닙니다.",
    caveatEn: "Basemap tiles — not event evidence.",
  },
  "basemap-aws-terrarium": {
    evidenceTier: "model",
    freshnessClass: "static",
    caveatKo: "지형 DEM. 사건 증거가 아닙니다.",
    caveatEn: "Terrain DEM — not event evidence.",
  },
  "basemap-openfreemap-buildings": {
    evidenceTier: "model",
    freshnessClass: "static",
    caveatKo: "OSM 3D 건물(Ion) 또는 extrusion 폴백. 사건 증거가 아닙니다.",
    caveatEn: "OSM 3D buildings (Ion) or extrusion fallback — not event evidence.",
  },
  "reference-monitor": {
    evidenceTier: "model",
    freshnessClass: "near-real-time",
    caveatKo: "내부 레퍼런스 모니터 집계. 공개 원본과 다를 수 있습니다.",
    caveatEn: "Internal reference-monitor aggregate — may differ from raw feeds.",
  },
  "crink-hub-monitor": {
    evidenceTier: "reported",
    freshnessClass: "near-real-time",
    caveatKo: "CRINK 전문 소스 제목·요약·링크만. 기관 위성·맵 원본 미포함.",
    caveatEn: "CRINK specialist title/summary/link only — no source imagery republished.",
  },
  "crink-thumb-sentinel-nasa": {
    evidenceTier: "observed",
    freshnessClass: "curated",
    caveatKo: "좌표 기반 위성 썸네일(Sentinel/NASA). 기사 기관 사진이 아닙니다.",
    caveatEn: "Coordinate-based satellite thumbs (Sentinel/NASA) — not outlet imagery.",
  },
  "crink-thumb-globe-bake": {
    evidenceTier: "model",
    freshnessClass: "static",
    caveatKo: "자체 지구본 프리베이크. 실시간 캡처가 아닙니다.",
    caveatEn: "Pre-baked globe thumbs — not live capture.",
  },
  "app-data": {
    evidenceTier: "model",
    freshnessClass: "static",
    caveatKo: "앱 번들 정적 지리 데이터.",
    caveatEn: "App-bundled static geo data.",
  },
};

function deriveFromIngest(note: NewsLayerSourceNote): {
  evidenceTier: EvidenceTier;
  freshnessClass: FreshnessClass;
  caveatKo: string;
  caveatEn: string;
} {
  switch (note.ingest) {
    case "live-poll":
    case "live-api":
      return {
        evidenceTier: "observed",
        freshnessClass: "live",
        caveatKo: "라이브 수집. 지연·누락·범위 제한이 있습니다.",
        caveatEn: "Live ingest — expect lag, gaps, and coverage limits.",
      };
    case "cached-api":
      return {
        evidenceTier: "reported",
        freshnessClass: "near-real-time",
        caveatKo: "캐시된 API 응답. 원문·시각을 확인하세요.",
        caveatEn: "Cached API response — check source and timestamp.",
      };
    case "mapped-existing":
      return {
        evidenceTier: "reported",
        freshnessClass: "daily",
        caveatKo: "기존 공개 자료를 지도에 매핑한 레이어입니다.",
        caveatEn: "Mapped from existing public datasets onto the globe.",
      };
    case "synthetic-demo":
      return {
        evidenceTier: "synthetic",
        freshnessClass: "static",
        caveatKo:
          "데모·플레이스홀더 데이터입니다. 실제 관측이 아니며 프로덕션에 노출되지 않습니다.",
        caveatEn:
          "Demo / placeholder data — not a real observation, and not shipped to production.",
      };
    case "static-build":
    default:
      return {
        evidenceTier: "model",
        freshnessClass: "static",
        caveatKo: "빌드 시점 정적 자산. 실시간 현황이 아닙니다.",
        caveatEn: "Static build asset — not a live situation picture.",
      };
  }
}

function buildEntry(note: NewsLayerSourceNote): LayerReliability {
  const derived = deriveFromIngest(note);
  const o = OVERRIDES[note.layerId] ?? {};
  return {
    sourceLayerId: note.layerId,
    evidenceTier: o.evidenceTier ?? derived.evidenceTier,
    freshnessClass: o.freshnessClass ?? derived.freshnessClass,
    caveatKo: o.caveatKo ?? derived.caveatKo,
    caveatEn: o.caveatEn ?? derived.caveatEn,
    prefsKey: o.prefsKey ?? PREFS_BY_LAYER[note.layerId],
  };
}

/** shipped(+planned 중 오버라이드 있는 것) 전체 맵 — 조회 O(1) */
const REGISTRY: Map<string, LayerReliability> = (() => {
  const map = new Map<string, LayerReliability>();
  for (const note of NEWS_LAYER_SOURCE_CATALOG) {
    map.set(note.layerId, buildEntry(note));
  }
  return map;
})();

export function getLayerReliability(layerId: string): LayerReliability | undefined {
  return REGISTRY.get(layerId);
}

export function getLayerReliabilityByPrefsKey(
  prefsKey: string,
): LayerReliability | undefined {
  for (const entry of REGISTRY.values()) {
    if (entry.prefsKey === prefsKey) return entry;
  }
  return undefined;
}

export function freshnessClassLabel(
  freshness: FreshnessClass,
  lang: LabelLanguage,
): string {
  return FRESHNESS_LABEL[freshness][lang];
}

export function formatReliabilityForHover(
  layerId: string,
  lang: LabelLanguage,
): { badge: string; meta: string; hint: string } | null {
  const rel = getLayerReliability(layerId);
  if (!rel) return null;
  const caveat = lang === "en" ? rel.caveatEn : rel.caveatKo;
  return {
    badge: evidenceTierLabel(rel.evidenceTier, lang),
    meta: `${evidenceTierLabel(rel.evidenceTier, lang)} · ${freshnessClassLabel(rel.freshnessClass, lang)}`,
    hint: `${evidenceTierHint(rel.evidenceTier, lang)} — ${caveat}`,
  };
}

export function formatReliabilityForSources(
  layerId: string,
  lang: LabelLanguage,
): string | null {
  const rel = getLayerReliability(layerId);
  if (!rel) return null;
  const caveat = lang === "en" ? rel.caveatEn : rel.caveatKo;
  return `${evidenceTierLabel(rel.evidenceTier, lang)} · ${freshnessClassLabel(rel.freshnessClass, lang)} — ${caveat}`;
}

/** catalogCaption + 신뢰 한 줄 */
export function catalogCaptionWithReliability(
  layerId: string,
  lang: LabelLanguage = "ko",
): string {
  const note = getSourceNote(layerId);
  const base = note ? `${note.attribution} · ${note.cadence}` : "";
  const relLine = formatReliabilityForSources(layerId, lang);
  if (base && relLine) return `${base} · ${relLine}`;
  return base || relLine || "";
}

/** 테스트·감사: shipped layerId 목록 */
export function shippedLayerIds(): string[] {
  return NEWS_LAYER_SOURCE_CATALOG.filter((n) => n.status === "shipped").map(
    (n) => n.layerId,
  );
}

/**
 * 품질 문제로 노출을 막은 레이어 목록.
 *
 * `viewPackages` · 레이어 패널 · API 라우트가 이 목록을 참조해 걸러낸다.
 * 사용자에게 "데이터 없음"을 보여주는 것이, 잘못된 출처로 표기된
 * 합성 데이터를 보여주는 것보다 낫다.
 */
export function blockedLayerIds(): string[] {
  return NEWS_LAYER_SOURCE_CATALOG.filter((n) => n.status === "blocked").map(
    (n) => n.layerId,
  );
}

const BLOCKED = new Set(blockedLayerIds());

/** 이 레이어를 프로덕션에서 렌더해도 되는가. */
export function isLayerShippable(layerId: string): boolean {
  if (BLOCKED.has(layerId)) return false;
  const rel = REGISTRY.get(layerId);
  if (!rel) return true;
  return isEvidenceTierShippable(rel.evidenceTier);
}

/** 차단 사유 (관리자·개발자용) */
export function layerBlockedReason(layerId: string): string | undefined {
  const note = NEWS_LAYER_SOURCE_CATALOG.find((n) => n.layerId === layerId);
  if (!note || note.status !== "blocked") return undefined;
  return note.blockedReason ?? "사유 미기재";
}

export function allReliabilityEntries(): LayerReliability[] {
  return [...REGISTRY.values()];
}
