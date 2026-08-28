/**
 * 지도 위 호버 — “이게 뭔지” 평문 설명.
 *
 * CursorHoverCard 는 이미 마우스 옆에 뜨지만, 파이프·케이블·항모 등은
 * 레이어 ID 매핑이 비어 짧은 이름만 보였다. 여기서 종류 → 레이어 ID → 설명.
 */

import type { TransportPath } from "@/data/geoTypes";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { HoverCard } from "@/components/globe/types";

type Bi = { ko: string; en: string };

function pick(bi: Bi, lang: LabelLanguage): string {
  return lang === "en" ? bi.en : bi.ko;
}

/** path.kind → sourceCatalog / 설명 키 */
export function layerIdFromPathKind(kind: TransportPath["kind"]): string | null {
  switch (kind) {
    case "oil-pipeline":
      return "oil-pipelines";
    case "gas-pipeline":
      return "gas-pipelines";
    case "subsea-pipeline":
      return "subsea-pipelines";
    case "shipping-lane":
      return "trade-routes";
    case "submarine-cable":
      return "submarine-cables";
    case "bri-trade":
      return "bri-trade";
    case "strategic-corridor":
      return "strategic-corridors";
    case "us-dfc-supply":
      return "us-dfc-supply";
    case "axis-link":
      return "axis-network";
    case "arms-embargo":
      return "arms-embargo-zones";
    case "dispute-zone":
    case "dispute-hatch":
    case "dispute-boundary":
      return "dispute-zones-me";
    case "conflict-hatch":
      return "conflict-zones";
    case "ship-movement-trail":
      return "weekly-ship-moves";
    case "neptun-trail":
    case "neptun-projection":
    case "neptun-trail-archived":
      return "neptun";
    case "ukraine-ru-front":
    case "ukraine-ua-front":
    case "ukraine-contested-front":
    case "ukraine-combat-zone":
    case "ukraine-ru-claim":
    case "ukraine-ua-claim":
    case "ukraine-ua-gain":
    case "ukraine-ru-occupied":
    case "ukraine-ua-occupied":
    case "ukraine-ru-occupied-hatch":
    case "ukraine-ua-occupied-hatch":
    case "ukraine-ru-claim-hatch":
    case "ukraine-ua-claim-hatch":
    case "ua-axis":
    case "ru-axis":
    case "ua-advance":
    case "ru-advance":
    case "msr":
      return "viina-ukraine-control";
    case "lsib-boundary":
    case "country-border":
    case "coastline":
    case "rail":
    case "road":
    case "recon-orbit":
    case "gta-trade-measure":
      return null;
    default:
      return null;
  }
}

/** static point.kind → 설명 키 */
export function layerIdFromStaticKind(kind: string): string | null {
  switch (kind) {
    case "airport":
      return "airports";
    case "port":
      return "ports";
    case "military-base":
      return "military-bases";
    case "nuclear-site":
      return "nuclear-sites";
    case "resource":
      return "critical-minerals";
    case "lng-terminal":
      return "lng-terminals";
    case "cable-landing":
      return "submarine-cables";
    case "internet-exchange":
      return "internet-exchanges";
    case "refugee-camp":
      return "refugee-camps";
    case "ucdp-event":
      return "ucdp-events";
    case "ai-data-center":
      return "ai-data-centers";
    case "economic-center":
      return "economic-centers";
    case "sanctions-entity":
      return "sanctions-entities";
    case "chokepoint":
    case "logistics-hub":
    case "critical-node":
      return "critical-nodes";
    case "submarine-tunnel":
      return "tunnels";
    case "space-launch":
      return "space-launches";
    case "gem-coal-plant":
    case "gem-coal-mine":
    case "gem-coal-terminal":
    case "gem-nuclear":
    case "gem-solar":
    case "gem-wind":
    case "gem-hydro":
    case "gem-geothermal":
    case "gem-bioenergy":
    case "gem-oil-gas-plant":
    case "gem-oil-gas-extraction":
    case "gem-iron-ore":
    case "gem-cement":
    case "gem-steel":
    case "gem-chemical":
      return "gem-facilities";
    default:
      return null;
  }
}

/**
 * 모르는 사람도 읽히는 한두 문장.
 * 약어는 괄호로 풀어 씀.
 */
const LAYER_EXPLAIN: Record<string, Bi> = {
  "oil-pipelines": {
    ko: "원유·NGL(천연가스액)을 나르는 송유관입니다. GEM(Global Energy Monitor, 글로벌 에너지 모니터) 공개 목록을 지도에 올린 것이며, 실시간 유량이 아닙니다.",
    en: "Oil/NGL pipelines from GEM (Global Energy Monitor). Static infrastructure map — not live flow.",
  },
  "gas-pipelines": {
    ko: "천연가스를 나르는 전송관입니다. GEM(Global Energy Monitor) 공개 목록 기반이며, 실시간 공급량이 아닙니다.",
    en: "Gas transmission pipelines from GEM (Global Energy Monitor). Not live throughput.",
  },
  "subsea-pipelines": {
    ko: "바다 밑 석유·가스관입니다. GEM과 EMODnet(유럽 해양 관측·데이터망) 공개 자료를 합친 스냅샷입니다.",
    en: "Offshore oil/gas pipelines from GEM and EMODnet. A curated snapshot, not live sensors.",
  },
  "lng-terminals": {
    ko: "LNG(액화천연가스)를 싣고 내리는 터미널 위치입니다. GEM 공개 목록 기반입니다.",
    en: "LNG (liquefied natural gas) terminals from GEM.",
  },
  "gem-facilities": {
    ko: "발전·채굴·산업 시설 위치입니다. GEM(Global Energy Monitor)이 공개한 인프라 목록을 올립니다.",
    en: "Power, mining, and industrial sites from GEM (Global Energy Monitor).",
  },
  "trade-routes": {
    ko: "오래 쓰인 주요 해상 항로 패턴입니다. 지금 그 배를 따라가는 AIS(선박자동식별) 항적이 아닙니다.",
    en: "Schematic major shipping lanes — not live AIS vessel tracks.",
  },
  "submarine-cables": {
    ko: "바다 밑 통신 케이블·착륙점입니다. 인터넷·통신이 지나가는 공개 케이블 지도입니다.",
    en: "Undersea telecom cables and landings from public cable datasets.",
  },
  "critical-nodes": {
    ko: "끊기면 아픈 물류·에너지·통신 급소(초크포인트·핵심 거점)입니다. 공개 전략 거점을 모아 둔 레이어입니다.",
    en: "Strategic chokepoints and critical hubs — curated public geography, not secret intel.",
  },
  tunnels: {
    ko: "해저터널·관심 통로입니다. 우리가 큐레이션한 위치 목록입니다.",
    en: "Subsea tunnel / passage points from our curated seed list.",
  },
  "military-bases": {
    ko: "공개 지도의 군사기지입니다. 기본은 미군이며, 한국·일본·필리핀·동유럽 NATO는 레이어에서 따로 켭니다.",
    en: "Military installations from public geodata. US bases are on by default; ROK, Japan, Philippines, and eastern NATO are separate checkboxes.",
  },
  "us-carriers": {
    ko: "미 항모의 대략 위치입니다. USNI(미국해군협회) News·CENTCOM(미 중부사령부)·공개 보도를 종합한 스냅샷이며, 군 실시간 추적이 아닙니다.",
    en: "Approx. U.S. carrier positions from USNI News, CENTCOM, and open reporting — not live military tracking.",
  },
  "nuclear-sites": {
    ko: "원자력·핵 관련 공개 시설 위치입니다. IAEA(국제원자력기구)·NTI(핵위협방지구상) 등 공개 목록 기반입니다.",
    en: "Nuclear-related sites from public lists (IAEA, NTI, and similar).",
  },
  "critical-minerals": {
    ko: "주요 광물·자원 관련 지점입니다. USGS(미국지질조사소) 등 공개 자료를 참고합니다.",
    en: "Mineral / resource points informed by USGS and public datasets.",
  },
  "resource-deposits": {
    ko: "자원 매장 범위의 개략 윤곽입니다. 우리가 정리한 외곽선이며 정확한 매장량이 아닙니다.",
    en: "Approximate deposit outlines we curated — not reserve estimates.",
  },
  airports: {
    ko: "주요 공항 위치입니다. 공개 지도 데이터 기반입니다.",
    en: "Major airports from public map data.",
  },
  ports: {
    ko: "주요 항구 위치입니다. 공개 지도 데이터 기반입니다.",
    en: "Major ports from public map data.",
  },
  "internet-exchanges": {
    ko: "인터넷 교환점(IXP) 등 네트워크 거점입니다.",
    en: "Internet exchange / network hubs.",
  },
  "ai-data-centers": {
    ko: "대형 AI·클라우드 데이터센터로 알려진 거점입니다. 공개 자료 기반입니다.",
    en: "Known large AI/cloud data-center hubs from public sources.",
  },
  "economic-centers": {
    ko: "금융·무역·도시 규모로 본 경제 중심지입니다.",
    en: "Economic hubs scored by finance, trade, and urban scale.",
  },
  "sanctions-entities": {
    ko: "제재 목록에 오른 대상의 공개 위치 힌트입니다. OFAC(미국 해외자산통제국)·UN(유엔)·EU(유럽연합) 등 공개 목록 기반입니다.",
    en: "Sanctions-list entities from OFAC, UN, EU, and similar public lists.",
  },
  "arms-embargo-zones": {
    ko: "무기 금수가 걸린 국가·구역입니다. 공개 제재·금수 목록 기반입니다.",
    en: "Arms-embargo countries/zones from public embargo lists.",
  },
  "refugee-camps": {
    ko: "난민 캠프 등 인도적 거점입니다. UNHCR(유엔난민기구) 계열 공개 자료 기반입니다.",
    en: "Refugee camps / humanitarian sites from UNHCR-linked public data.",
  },
  "ucdp-events": {
    ko: "UCDP(웁살라 분쟁데이터프로그램)가 기록한 과거 분쟁 사건입니다. 실시간 속보가 아닙니다.",
    en: "Historical conflict events from UCDP (Uppsala Conflict Data Program) — not live breaking news.",
  },
  "firms-fires": {
    ko: "NASA FIRMS(미항공우주국 화재정보시스템) 위성 열점입니다. 산불·산업·폭격이 섞일 수 있어 전투 확정이 아닙니다.",
    en: "NASA FIRMS satellite heat detections — wildfire, industry, and strikes can mix; not confirmed combat.",
  },
  ais: {
    ko: "AIS(선박자동식별장치)로 송신 중인 선박 위치입니다. 끈 배·위장 송신은 빠지거나 틀릴 수 있습니다.",
    en: "Vessels broadcasting AIS (Automatic Identification System). Dark or spoofed ships may be missing or wrong.",
  },
  "disguised-vessels": {
    ko: "위장·다크플리트로 관심 있는 선박 시드입니다. 법적 확정이 아닙니다.",
    en: "Watchlist matches for disguised / dark-fleet vessels — not a legal finding.",
  },
  "air-traffic": {
    ko: "ADS-B(자동종속감시방송) 공개 항적입니다. 수신 범위 밖은 안 보입니다.",
    en: "Public ADS-B aircraft tracks — outside coverage may be missing.",
  },
  "military-activity": {
    ko: "군사 항공기 공개 항적(ADS-B 계열)입니다.",
    en: "Military aircraft on public ADS-B-style tracks.",
  },
  neptun: {
    ko: "우크라이나 공중위협(드론·미사일 등) 공개 추적입니다. NEPTUN 지도 기반이며 비공식입니다.",
    en: "Ukraine air threats (drones/missiles) from the NEPTUN public map — unofficial.",
  },
  "viina-ukraine-control": {
    ko: "우크라이나 전선·점령 구역입니다. VIINA 등 공개 전선 자료를 그립니다.",
    en: "Ukraine front / control polygons from public front-line sources (e.g. VIINA).",
  },
  "tzeva-adom": {
    ko: "이스라엘 민간 로켓·공습 경보 구역입니다. 공식 경보 피드 기반입니다.",
    en: "Israeli public rocket / air-raid alert areas.",
  },
  "ukmto-incidents": {
    ko: "UKMTO(영국해상통상부) 상선 보안 경보입니다.",
    en: "UKMTO merchant-vessel security warnings.",
  },
  "navarea-warnings": {
    ko: "NAVAREA 항행경보 — 선박이 피해야 할 해역 공지입니다.",
    en: "NAVAREA navigational warnings for mariners.",
  },
  "military-exercises": {
    ko: "공개 보도·항행 공지 기반 군사 훈련 구역입니다.",
    en: "Military exercise zones from open reporting / notices.",
  },
  "escalation-signals": {
    ko: "기사에 ‘임계선을 넘는’ 표현이 있는지 규칙으로 표시한 확전 신호입니다. 의도·확률 판정이 아닙니다.",
    en: "Rule-based escalation cues in news text — not intent or probability.",
  },
  "newfeeds-iran": {
    ko: "이란·중동 공격 관련 공개 소식 핀입니다.",
    en: "Iran / Middle East attack-related public news pins.",
  },
  "telegram-osint": {
    ko: "텔레그램 공개 채널 속보입니다. 미확인 전언이며 절반 미리보기만 보입니다.",
    en: "Telegram public-channel OSINT — unverified; half preview only.",
  },
  "conflict-zones": {
    ko: "뉴스·사건으로 추정한 긴장·충돌 구역입니다. 확정 전선이 아닐 수 있습니다.",
    en: "Tension / clash zones inferred from events — may not be a confirmed front.",
  },
  "dispute-zones-me": {
    ko: "영토·외교 분쟁·긴장 구역 표시입니다.",
    en: "Territorial / diplomatic dispute and tension outlines.",
  },
  "gps-interference": {
    ko: "항공기 GNSS(위성항법) 이상 비율로 추정한 GPS 간섭 구역입니다. 재머 위치가 아닙니다.",
    en: "Estimated GPS interference from aircraft GNSS anomalies — not jammer locations.",
  },
  "recon-satellites": {
    ko: "정찰 계열로 분류된 위성의 이론상 가시권입니다. 실제 촬영 활동이 아닙니다.",
    en: "Theoretical horizon of recon-family satellites — not proof of imaging.",
  },
  "space-launches": {
    ko: "우주 발사 관련 공개 일정·위치입니다.",
    en: "Public space-launch related points.",
  },
  "missile-silos": {
    ko: "미사일 사일로·후보지 공개 연구 자료입니다. 전부 확인된 실전부대가 아닐 수 있습니다.",
    en: "Missile silo / candidate sites from open research — not all confirmed active.",
  },
  "strategic-missile-bases": {
    ko: "전략미사일 기지로 알려진 공개 OOB(전투서열) 지점입니다.",
    en: "Strategic missile basing points from open-source order of battle.",
  },
  "missile-launch-tests": {
    ko: "미사일 시험·발사 관련 공개 지점입니다.",
    en: "Missile test / launch related public sites.",
  },
  "axis-network": {
    ko: "CRINK 축(중·러·이·북) 허브와 파트너를 잇는 관계선입니다. 공개 지정학 스케치이며 비밀 동맹도가 아닙니다.",
    en: "CRINK axis (China, Russia, Iran, DPRK) hub links to partners — a public geopolitics sketch, not a secret alliance meter.",
  },
  "bri-trade": {
    ko: "BRI(Belt and Road Initiative, 일대일로) 무역·운송 연결을 그린 선입니다.",
    en: "BRI (Belt and Road Initiative) trade/transport connectivity arcs.",
  },
  "strategic-corridors": {
    ko: "전략 물류·군수 회랑입니다. LOD는 BRI·초크·길이 등 정량 합성 점수(corridor-ranks)로 나뉩니다.",
    en: "Strategic logistics / military corridors. LOD uses composite quantitative ranks (BRI, choke, length).",
  },
  "us-dfc-supply": {
    ko: "DFC(미국 국제개발금융공사) 개발금융 공급망을 그린 선입니다.",
    en: "U.S. DFC (Development Finance Corporation) project connectivity arcs.",
  },
  "weekly-ship-moves": {
    ko: "주간 함선 이동 — USNI 등 공개 관측을 이은 연결선입니다. 연속 AIS 항적이 아닙니다.",
    en: "Weekly ship moves from open reports (e.g. USNI) — linked fixes, not continuous AIS tracks.",
  },
  "china-theater-incidents": {
    ko: "동아시아(대만·일본·필리핀·미·중) 대치·마찰 지점입니다. 공개 사건 앵커입니다.",
    en: "East Asia standoff / friction dens from open incident anchors.",
  },
  "korea-missile-incidents": {
    ko: "북한 미사일·무기 시험 관련 발생지 앵커입니다. 탄착 확정이 아닙니다.",
    en: "DPRK missile / weapons-test dens — not confirmed splash points.",
  },
  "ukraine-strikes-russia": {
    ko: "우크라→러 타격으로 보도된 핫스팟입니다. 궤적 미확정·미확인일 수 있습니다.",
    en: "Reported Ukraine→Russia strike hotspots — trajectory often unverified.",
  },
  "hapi-conflict-casualties": {
    ko: "ACLED(분쟁사건데이터) 기반 사상·폭력 집계 힌트입니다. 전선 ‘확정’이 아닙니다.",
    en: "Fatality / violence hints via ACLED (through HAPI) — not a confirmed front line.",
  },
  "reef-watch": {
    ko: "남중국해 암초·시설 관심 지점입니다. ReefWatch 공개 피처 기반입니다.",
    en: "South China Sea reef / feature watch points from ReefWatch.",
  },
  "nuclear-warheads": {
    ko: "각국 핵탄두 보유 수 공개 통계(OWID·FAS 등)를 아이콘으로 보여 줍니다.",
    en: "National nuclear warhead stockpile figures (e.g. OWID / FAS) as icons.",
  },
};

export function explainLayer(layerId: string | null | undefined, lang: LabelLanguage): string | null {
  if (!layerId) return null;
  const bi = LAYER_EXPLAIN[layerId];
  return bi ? pick(bi, lang) : null;
}

/** body가 비었을 때 평문 설명을 채운다. 있으면 유지. */
export function withLayerExplain(
  card: HoverCard,
  layerId: string | null,
  lang: LabelLanguage,
): HoverCard {
  if (!layerId || card.kind === "ocean") return card;
  const explain = explainLayer(layerId, lang);
  if (!explain) return card;
  if (card.body && card.body.trim()) return card;
  return { ...card, body: explain };
}
