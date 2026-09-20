/**
 * 주요 사건 타임테이블 (정본).
 *
 * - conflict: 지정학 — 현재 전장 뉴스·「만약에」와 연결
 * - economy: 시장(금·유가·증시·VIX) — 지경학 모드와 비교
 * - logistics: 초크포인트·물류 스트레스
 * - both: 지정학+시장 동시 (개전 등) — 모드별로 해석이 갈림
 */

import type { TheaterMarketFilter } from "@/lib/theaterAssets";
import type { ViewerMode } from "@/lib/viewPackages";

/** dailyRanks CHOKEPOINTS.id 와 동기 */
export type LogisticsChokepointId =
  | "choke-hormuz"
  | "choke-suez"
  | "choke-bab-el-mandeb"
  | "choke-malacca"
  | "choke-taiwan"
  | "choke-panama"
  | "choke-bosporus"
  | "choke-gibraltar"
  | "choke-good-hope";

export type MajorEventDomain = "conflict" | "logistics" | "economy" | "both";

export type MajorEventKind =
  | "war_start"
  | "escalation"
  | "strike"
  | "crisis"
  | "diplomacy"
  | "market_shock"
  | "occupation"
  | "blockade"
  | "canal_closure"
  | "port_disruption"
  | "drought"
  | "sanction_trade"
  | "rate_decision"
  | "banking_stress";

export type MajorEventTimelineEntry = {
  id: string;
  date: string;
  endDate?: string;
  theater: TheaterMarketFilter;
  domain: MajorEventDomain;
  kind: MajorEventKind;
  labelKo: string;
  labelEn: string;
  summaryKo: string;
  summaryEn: string;
  preferredSymbols: string[];
  chokepointId?: LogisticsChokepointId;
  primaryForTheater?: boolean;
  primaryForChokepoint?: boolean;
  /** 경제 타임테이블 기본 앵커 (전역 1개) */
  primaryForEconomy?: boolean;
  /** supplyChainShiftEpisodes.ts의 해당 구조 변화 에피소드 id — 스파이크 인사이트에서 전체 맥락으로 딥링크할 때 사용 */
  relatedSupplyChainEpisodeId?: string;
};

/**
 * 초크포인트 preferredSymbols — STOCK_TICKER_SYMBOLS에 있는 실심볼만 사용.
 * BDI 자체·멕시코 니어쇼어링 전용 티커는 없으므로 넣지 않는다(BDRY=운임 프록시).
 * 니켈은 LME·COMEX 모두 야후 직접조회 선물(=F) 심볼이 없어 Sprott 니켈 광산주 ETF(NIKL)를
 * 대리지표로 쓴다 — 초크포인트가 아니라 economy 도메인(인도네시아 니켈 에피소드)에서만 사용.
 * logisticsRiskPoints.meta.relatedTickers 라벨과 1:1로 맞춘다.
 */
const ENERGY_GOLD = ["GC=F", "CL=F", "BZ=F", "DX-Y.NYB"] as const;
const OIL_GOLD_VIX = ["CL=F", "BZ=F", "GC=F", "^VIX"] as const;
const ASIA_TECH = ["000001.SS", "^HSI", "^IXIC", "^VIX"] as const;
const KOREA_ASIA = ["^KS11", "^IXIC", "^HSI", "^VIX"] as const;
/** 경제 타임테이블 — 증시·공포·달러·금 */
const ECONOMY_MARKETS = ["^VIX", "^GSPC", "^IXIC", "GC=F", "DX-Y.NYB", "CL=F"] as const;

/** 호르무즈 — 원유·LNG 관문 */
const CHOKE_HORMUZ = ["CL=F", "BZ=F", "NG=F", "^VIX"] as const;
/** 수에즈 — 컨테이너·에너지 우회 → 운임(BDRY)·유가 */
const CHOKE_SUEZ = ["BDRY", "BZ=F", "CL=F", "^VIX"] as const;
/** 바브엘만데브 — 홍해 우회·안전자산 */
const CHOKE_BAB = ["BDRY", "BZ=F", "GC=F", "^VIX"] as const;
/** 말라카 — 동아시아 수출·에너지 병목 */
const CHOKE_MALACCA = ["^HSI", "000001.SS", "BZ=F", "BDRY"] as const;
/** 대만해협 — 반도체·대만·나스닥 (공급망 에피소드 TSM축과 정렬) */
const CHOKE_TAIWAN = ["TSM", "SMH", "^TWII", "^IXIC"] as const;
/** 파나마 — 미–아시아 컨테이너 재배치 */
const CHOKE_PANAMA = ["BDRY", "BZ=F", "^GSPC", "^VIX"] as const;
/** 보스포루스 — 흑해 곡물·에너지 */
const CHOKE_BOSPORUS = ["ZW=F", "ZC=F", "BZ=F", "^VIX"] as const;
/** 지브롤터 — 지중해–대서양 에너지·LNG·달러 */
const CHOKE_GIBRALTAR = ["BZ=F", "NG=F", "DX-Y.NYB", "^VIX"] as const;
/** 희망봉 — 홍해 우회 벤치마크(운임·유가·달러) */
const CHOKE_GOOD_HOPE = ["BDRY", "BZ=F", "CL=F", "DX-Y.NYB"] as const;

/** 초크 ID → 차별 바스켓 (반사실·리액션 API preferred 정본) */
export const CHOKEPOINT_PREFERRED_SYMBOLS: Record<
  LogisticsChokepointId,
  readonly string[]
> = {
  "choke-hormuz": CHOKE_HORMUZ,
  "choke-suez": CHOKE_SUEZ,
  "choke-bab-el-mandeb": CHOKE_BAB,
  "choke-malacca": CHOKE_MALACCA,
  "choke-taiwan": CHOKE_TAIWAN,
  "choke-panama": CHOKE_PANAMA,
  "choke-bosporus": CHOKE_BOSPORUS,
  "choke-gibraltar": CHOKE_GIBRALTAR,
  "choke-good-hope": CHOKE_GOOD_HOPE,
};

/**
 * 시간순 정본 — 지정학 / 경제·시장 / 물류.
 */
export const MAJOR_EVENT_TIMELINE: MajorEventTimelineEntry[] = [
  // —— Economy / markets (지경학 모드와 비교) ——
  {
    id: "covid-who-pandemic",
    date: "2020-03-11",
    theater: "global",
    domain: "economy",
    kind: "market_shock",
    labelKo: "WHO 코로나19 팬데믹 선언",
    labelEn: "WHO declares COVID-19 pandemic",
    summaryKo: "글로벌 봉쇄·공급망 충격. VIX·증시·금이 동시에 격변.",
    summaryEn: "Global lockdowns — VIX, equities, and gold moved together.",
    preferredSymbols: [...ECONOMY_MARKETS],
  },
  {
    id: "covid-oil-crash",
    date: "2020-04-20",
    theater: "global",
    domain: "economy",
    kind: "market_shock",
    labelKo: "WTI 원유 선물 마이너스 결제",
    labelEn: "WTI crude settles negative",
    summaryKo: "에너지 선물 이례적 붕괴. 매크로·물류 수요 쇼크.",
    summaryEn: "Historic energy futures dislocation — macro demand shock.",
    preferredSymbols: ["CL=F", "BZ=F", "^VIX", "GC=F", "^GSPC"],
  },
  {
    id: "fed-lift-off-2022",
    date: "2022-03-16",
    theater: "global",
    domain: "economy",
    kind: "rate_decision",
    labelKo: "연준 금리 인상 사이클 개시",
    labelEn: "Fed hiking cycle begins",
    summaryKo: "긴축 국면 개막. 달러·증시·금 재가격.",
    summaryEn: "Tightening cycle starts — dollar, equities, gold reprice.",
    preferredSymbols: [...ECONOMY_MARKETS],
  },
  {
    id: "us-cpi-peak-2022",
    date: "2022-06-10",
    theater: "global",
    domain: "economy",
    kind: "market_shock",
    labelKo: "미국 CPI 고점 국면 (발표)",
    labelEn: "US CPI peak print phase",
    summaryKo: "인플레 피크 인식. 금리·실물·리스크 자산 변동.",
    summaryEn: "Inflation-peak narrative — rates and risk assets move.",
    preferredSymbols: [...ECONOMY_MARKETS],
  },
  {
    id: "svb-collapse-2023",
    date: "2023-03-10",
    theater: "global",
    domain: "economy",
    kind: "banking_stress",
    labelKo: "실리콘밸리은행(SVB) 파산",
    labelEn: "Silicon Valley Bank collapse",
    summaryKo: "지역은행 위기. VIX·금융주·안전자산 동시 반응.",
    summaryEn: "Regional bank crisis — VIX, financials, and safe havens reacted.",
    preferredSymbols: [...ECONOMY_MARKETS],
    primaryForEconomy: true,
  },
  {
    id: "fed-pivot-hope-2023",
    date: "2023-11-01",
    theater: "global",
    domain: "economy",
    kind: "rate_decision",
    labelKo: "연준 피벗 기대 고조 국면",
    labelEn: "Fed pivot expectations rise",
    summaryKo: "금리 정점 인식. 증시·금·달러 동반 재배열.",
    summaryEn: "Peak-rate narrative — equities, gold, dollar rearrange.",
    preferredSymbols: [...ECONOMY_MARKETS],
  },

  // —— Logistics / chokepoints ——
  {
    id: "hormuz-tanker-attacks-2019",
    date: "2019-06-13",
    theater: "middle-east",
    domain: "logistics",
    kind: "blockade",
    labelKo: "호르무즈 유조선 공격 국면",
    labelEn: "Hormuz tanker attack phase",
    summaryKo: "통항 안보 위기. 에너지 초크포인트 리스크 프리미엄.",
    summaryEn: "Transit security crisis — energy chokepoint risk premium.",
    preferredSymbols: [...CHOKE_HORMUZ],
    chokepointId: "choke-hormuz",
    primaryForChokepoint: true,
  },
  {
    id: "abqaiq-attack-2019",
    date: "2019-09-14",
    theater: "middle-east",
    domain: "both",
    kind: "strike",
    labelKo: "사우디 아브카이크 시설 공격",
    labelEn: "Saudi Abqaiq facility attack",
    summaryKo: "세계 원유 처리 허브 타격. 유가·호르무즈 민감도 급등.",
    summaryEn: "Strike on a global crude processing hub — oil/Hormuz sensitivity spiked.",
    preferredSymbols: [...CHOKE_HORMUZ],
    chokepointId: "choke-hormuz",
  },
  {
    id: "ever-given-suez",
    date: "2021-03-23",
    endDate: "2021-03-29",
    theater: "global",
    domain: "logistics",
    kind: "canal_closure",
    labelKo: "수에즈 에버기븐 좌초",
    labelEn: "Suez Ever Given grounding",
    summaryKo: "운하 통항 중단. 컨테이너·에너지 우회·지연 스트레스.",
    summaryEn: "Canal blockage — container/energy diversion and delay stress.",
    preferredSymbols: [...CHOKE_SUEZ],
    chokepointId: "choke-suez",
    primaryForChokepoint: true,
  },
  {
    id: "china-port-delta-2021",
    date: "2021-08-11",
    endDate: "2021-09-30",
    theater: "global",
    domain: "logistics",
    kind: "port_disruption",
    labelKo: "중국 닝보·옌톈 등 항만 봉쇄·적체",
    labelEn: "China Ningbo/Yantian port COVID closures",
    summaryKo: "동아시아 수출 병목. 말라카·태평양 공급망 지연.",
    summaryEn: "East Asia export bottleneck — Malacca/Pacific supply delays.",
    preferredSymbols: [...CHOKE_MALACCA],
    chokepointId: "choke-malacca",
    primaryForChokepoint: true,
  },
  {
    id: "black-sea-grain-deal-2022",
    date: "2022-07-22",
    theater: "russia-ukraine",
    domain: "logistics",
    kind: "diplomacy",
    labelKo: "흑해 곡물 협정 타결",
    labelEn: "Black Sea Grain Initiative deal",
    summaryKo: "보스포루스·흑해 곡물 통항 재개 시도. 식량·해운 스트레스 완화 국면.",
    summaryEn: "Attempt to reopen Black Sea grain lanes via Bosporus — food/shipping ease phase.",
    preferredSymbols: [...CHOKE_BOSPORUS],
    chokepointId: "choke-bosporus",
    primaryForChokepoint: true,
  },
  {
    id: "panama-drought-2023",
    date: "2023-08-01",
    endDate: "2024-03-31",
    theater: "atlantic",
    domain: "logistics",
    kind: "drought",
    labelKo: "파나마 운하 가뭄·통항 제한",
    labelEn: "Panama Canal drought transit cuts",
    summaryKo: "통선 슬롯 축소. 미·아시아 물류 우회·지연.",
    summaryEn: "Transit slots cut — US–Asia diversion and delay.",
    preferredSymbols: [...CHOKE_PANAMA],
    chokepointId: "choke-panama",
    primaryForChokepoint: true,
  },
  {
    id: "red-sea-houthi-2023",
    date: "2023-11-19",
    theater: "middle-east",
    domain: "logistics",
    kind: "blockade",
    labelKo: "홍해·후티 통항 위협 본격화",
    labelEn: "Red Sea Houthi transit threat escalates",
    summaryKo: "바브엘만데브·수에즈 회피 → 희망봉 우회. 운임·에너지 스트레스.",
    summaryEn: "Bab-el-Mandeb/Suez avoidance → Cape reroute — freight and energy stress.",
    preferredSymbols: [...CHOKE_BAB],
    chokepointId: "choke-bab-el-mandeb",
    primaryForChokepoint: true,
  },
  {
    id: "good-hope-reroute-peak-2024",
    date: "2024-01-15",
    theater: "global",
    domain: "logistics",
    kind: "blockade",
    labelKo: "희망봉 우회 통항 피크",
    labelEn: "Cape of Good Hope reroute peak",
    summaryKo: "홍해 회피 선박 집중. 항로·리드타임·유가 연동.",
    summaryEn: "Red Sea avoidance peak — routing, lead times, oil linkage.",
    preferredSymbols: [...CHOKE_GOOD_HOPE],
    chokepointId: "choke-good-hope",
    primaryForChokepoint: true,
  },
  {
    id: "gibraltar-strait-tension-proxy",
    date: "2023-06-01",
    theater: "atlantic",
    domain: "logistics",
    kind: "crisis",
    labelKo: "지브롤터·대서양 접근로 긴장 국면",
    labelEn: "Gibraltar / Atlantic approach tension phase",
    summaryKo: "대서양–지중해 관문 안보·제재 집행 민감도.",
    summaryEn: "Atlantic–Med gateway security and sanctions-enforcement sensitivity.",
    preferredSymbols: [...CHOKE_GIBRALTAR],
    chokepointId: "choke-gibraltar",
    primaryForChokepoint: true,
  },
  {
    id: "taiwan-strait-shipping-2022",
    date: "2022-08-04",
    theater: "china-taiwan",
    domain: "logistics",
    kind: "blockade",
    labelKo: "대만해협 군사훈련·해상 통항 리스크",
    labelEn: "Taiwan Strait drills · shipping risk",
    summaryKo: "펠로시 방문 직후 포위훈련. 해협 해운·반도체 물류 민감.",
    summaryEn: "Encirclement drills after Pelosi visit — Strait shipping and chip logistics risk.",
    preferredSymbols: [...CHOKE_TAIWAN],
    chokepointId: "choke-taiwan",
    primaryForChokepoint: true,
  },

  // —— Russia–Ukraine ——
  {
    id: "crimea-annexation",
    date: "2014-03-18",
    theater: "russia-ukraine",
    domain: "conflict",
    kind: "occupation",
    labelKo: "러시아 크림 병합 선언",
    labelEn: "Russia annexes Crimea",
    summaryKo: "돈바스 전쟁으로 이어진 영토 변경. 유럽 안보 질서 균열의 출발점.",
    summaryEn: "Territorial revision that opened the Donbas war and European security rupture.",
    preferredSymbols: [...ENERGY_GOLD],
  },
  {
    id: "ukraine-full-invasion",
    date: "2022-02-24",
    theater: "russia-ukraine",
    domain: "both",
    kind: "war_start",
    labelKo: "러우 전면전 개전",
    labelEn: "Russia–Ukraine full-scale invasion",
    summaryKo: "전면 침공. 에너지·곡물·흑해 항로·금 프리미엄의 기점.",
    summaryEn: "Full-scale invasion — energy, grain, Black Sea lanes, gold premium anchor.",
    preferredSymbols: [...CHOKE_BOSPORUS, "GC=F"],
    chokepointId: "choke-bosporus",
    primaryForTheater: true,
  },
  {
    id: "nord-stream-blasts",
    date: "2022-09-26",
    theater: "russia-ukraine",
    domain: "both",
    kind: "escalation",
    labelKo: "노르드스트림 파이프라인 폭발",
    labelEn: "Nord Stream pipeline blasts",
    summaryKo: "유럽 가스 인프라 타격. 에너지·물류 안보 고조.",
    summaryEn: "Strike on European gas infrastructure — energy/logistics security spike.",
    preferredSymbols: ["NG=F", "BZ=F", "CL=F", "GC=F", "^VIX"],
  },
  {
    id: "ukraine-kursk-incursion",
    date: "2024-08-06",
    theater: "russia-ukraine",
    domain: "conflict",
    kind: "escalation",
    labelKo: "우크라 쿠르스크 진입",
    labelEn: "Ukraine Kursk incursion",
    summaryKo: "전선이 러시아 본토로 확장된 국면.",
    summaryEn: "Front expands onto Russian soil.",
    preferredSymbols: [...ENERGY_GOLD],
  },

  // —— Middle East ——
  {
    id: "soleimani-strike",
    date: "2020-01-03",
    theater: "middle-east",
    domain: "conflict",
    kind: "strike",
    labelKo: "솔레이마니 암살",
    labelEn: "Soleimani assassination",
    summaryKo: "미–이란 직접 충돌 문턱. 유가·금·중동 리스크 급등.",
    summaryEn: "US–Iran brink — oil and gold risk premium jumped.",
    preferredSymbols: [...OIL_GOLD_VIX],
  },
  {
    id: "israel-hamas-oct7",
    date: "2023-10-07",
    theater: "middle-east",
    domain: "both",
    kind: "war_start",
    labelKo: "이스라엘–하마스 전쟁 개시",
    labelEn: "Israel–Hamas war start",
    summaryKo: "가자 전쟁 개전. 중동 유가·항로·금 리스크의 기본 앵커.",
    summaryEn: "Gaza war start — Middle East oil, shipping, and gold risk anchor.",
    preferredSymbols: [...OIL_GOLD_VIX],
    primaryForTheater: true,
  },
  {
    id: "iran-israel-april-2024",
    date: "2024-04-13",
    theater: "middle-east",
    domain: "both",
    kind: "strike",
    labelKo: "이란→이스라엘 직접 공습",
    labelEn: "Iran direct strike on Israel",
    summaryKo: "국가 간 직접 타격. 호르무즈·유가 민감도 상승.",
    summaryEn: "State-to-state strike — Hormuz/oil sensitivity rose.",
    preferredSymbols: [...CHOKE_HORMUZ],
    chokepointId: "choke-hormuz",
  },
  {
    id: "hezbollah-ceasefire-2024",
    date: "2024-11-27",
    theater: "middle-east",
    domain: "conflict",
    kind: "diplomacy",
    labelKo: "이스라엘–헤즈볼라 휴전",
    labelEn: "Israel–Hezbollah ceasefire",
    summaryKo: "레바논 전선 일시 냉각. 리스크 프리미엄 일부 완화.",
    summaryEn: "Lebanon front cools temporarily — some risk premium ease.",
    preferredSymbols: [...OIL_GOLD_VIX],
  },

  // —— China–Taiwan / Pacific ——
  {
    id: "pelosi-taiwan-visit",
    date: "2022-08-02",
    theater: "china-taiwan",
    domain: "both",
    kind: "crisis",
    labelKo: "펠로시 대만 방문 · PLA 포위훈련",
    labelEn: "Pelosi Taiwan visit · PLA encirclement drills",
    summaryKo: "해협 긴장·해운 리스크 급상승. 반도체·중국 지수 민감.",
    summaryEn: "Strait tension and shipping risk spike — chips and China equities.",
    preferredSymbols: [...CHOKE_TAIWAN],
    chokepointId: "choke-taiwan",
    primaryForTheater: true,
  },
  {
    id: "balloon-incident",
    date: "2023-02-04",
    theater: "china-taiwan",
    domain: "conflict",
    kind: "crisis",
    labelKo: "중국 정찰기구 격추 (미)",
    labelEn: "US shoots down Chinese spy balloon",
    summaryKo: "미·중 군사·외교 마찰. 리스크 자산 변동.",
    summaryEn: "US–China military-diplomatic friction.",
    preferredSymbols: [...ASIA_TECH, "^VIX"],
  },
  {
    id: "taiwan-election-2024",
    date: "2024-01-13",
    theater: "china-taiwan",
    domain: "conflict",
    kind: "diplomacy",
    labelKo: "대만 총통 선거",
    labelEn: "Taiwan presidential election",
    summaryKo: "민진당 연속 집권. 해협·반도체 서사 재가격.",
    summaryEn: "DPP continuity — Strait/chip narrative reprice.",
    preferredSymbols: [...ASIA_TECH],
  },
  {
    id: "pla-joint-sword-2024",
    date: "2024-05-23",
    theater: "china-taiwan",
    domain: "both",
    kind: "escalation",
    labelKo: "PLA 「합검-2024A」 훈련",
    labelEn: "PLA Joint Sword-2024A drills",
    summaryKo: "취임 직후 대규모 포위형 훈련. 해협 통항 리스크.",
    summaryEn: "Large encirclement drills — Strait transit risk.",
    preferredSymbols: [...CHOKE_TAIWAN],
    chokepointId: "choke-taiwan",
  },

  // —— Korean Peninsula ——
  {
    id: "nk-icbm-2022",
    date: "2022-11-18",
    theater: "korea",
    domain: "conflict",
    kind: "escalation",
    labelKo: "북한 ICBM 시험발사",
    labelEn: "North Korea ICBM test",
    summaryKo: "한반도·동맹 억제 긴장. KOSPI·아시아 리스크.",
    summaryEn: "Peninsula deterrence tension — KOSPI/Asia risk.",
    preferredSymbols: [...KOREA_ASIA],
    primaryForTheater: true,
  },
  {
    id: "nk-spy-satellite-2023",
    date: "2023-11-21",
    theater: "korea",
    domain: "conflict",
    kind: "escalation",
    labelKo: "북한 군사정찰위성 발사",
    labelEn: "North Korea military spy satellite launch",
    summaryKo: "우주·미사일 능력 과시. 한미일 공조 국면.",
    summaryEn: "Space/missile signaling — ROK–US–Japan coordination phase.",
    preferredSymbols: [...KOREA_ASIA],
  },
  {
    id: "nk-trash-balloon-2024",
    date: "2024-05-28",
    theater: "korea",
    domain: "conflict",
    kind: "escalation",
    labelKo: "북한 오물 풍선 살포",
    labelEn: "North Korea trash balloons",
    summaryKo: "비군사 회색지대 도발. 심리·안보 마찰.",
    summaryEn: "Gray-zone provocation — psychological/security friction.",
    preferredSymbols: [...KOREA_ASIA],
  },

  // —— South Asia ——
  {
    id: "galwan-clash",
    date: "2020-06-15",
    theater: "south-asia",
    domain: "conflict",
    kind: "escalation",
    labelKo: "갈완 계곡 충돌 (인도–중국)",
    labelEn: "Galwan Valley clash (India–China)",
    summaryKo: "국경 사망 충돌. 남아시아·원자재 민감.",
    summaryEn: "Fatal border clash — South Asia / commodities sensitivity.",
    preferredSymbols: ["BZ=F", "GC=F", "^HSI", "^VIX"],
    primaryForTheater: true,
  },

  // —— Atlantic / NATO ——
  {
    id: "finland-nato",
    date: "2023-04-04",
    theater: "atlantic",
    domain: "conflict",
    kind: "diplomacy",
    labelKo: "핀란드 NATO 가입",
    labelEn: "Finland joins NATO",
    summaryKo: "북유럽 안보 지도 재편. 대서양·러 억제 축.",
    summaryEn: "Northern European map redraw — Atlantic deterrence axis.",
    preferredSymbols: ["DX-Y.NYB", "^GSPC", "^VIX", "BZ=F"],
    primaryForTheater: true,
  },
  {
    id: "sweden-nato",
    date: "2024-03-07",
    theater: "atlantic",
    domain: "conflict",
    kind: "diplomacy",
    labelKo: "스웨덴 NATO 가입",
    labelEn: "Sweden joins NATO",
    summaryKo: "발트·북유럽 동맹 완성 국면.",
    summaryEn: "Baltic/Nordic alliance completion phase.",
    preferredSymbols: ["DX-Y.NYB", "^GSPC", "^VIX", "BZ=F"],
  },

  // —— Arctic ——
  {
    id: "arctic-strategy-us-2022",
    date: "2022-10-07",
    theater: "arctic",
    domain: "both",
    kind: "diplomacy",
    labelKo: "미국 북극 전략 발표",
    labelEn: "US Arctic Strategy released",
    summaryKo: "북극 항로·자원·군사 경쟁 공식화.",
    summaryEn: "Formalizes Arctic routes, resources, and military competition.",
    preferredSymbols: ["BZ=F", "CL=F", "GC=F", "DX-Y.NYB"],
    primaryForTheater: true,
  },

  // —— Japan / Indo-Pac ——
  {
    id: "japan-nss-2022",
    date: "2022-12-16",
    theater: "japan",
    domain: "conflict",
    kind: "diplomacy",
    labelKo: "일본 국가안보전략 개정",
    labelEn: "Japan National Security Strategy revision",
    summaryKo: "반격능력·방위비 전환. 동북아 안보 재가격.",
    summaryEn: "Counterstrike & defense-spend shift — NE Asia security reprice.",
    preferredSymbols: ["^N225", "^HSI", "^IXIC", "^VIX"],
    primaryForTheater: true,
  },

  // —— Supply-chain shift (지경학 구조 변화 — supplyChainShiftEpisodes.ts 연동) ——
  // 니켈(Indonesia)·멕시코 니어쇼어링은 대응하는 선물/지수 심볼이 이 코드베이스 STOCK_TICKER_SYMBOLS에
  // 아직 없어 여기서는 제외 — 없는 심볼을 지어내지 않는다(chokepoints.ts flow:null과 같은 원칙).
  {
    id: "tsmc-arizona-265b-2026",
    date: "2026-07-16",
    theater: "china-taiwan",
    domain: "economy",
    kind: "market_shock",
    labelKo: "TSMC 애리조나 총투자 2650억 달러로 확대 발표",
    labelEn: "TSMC raises total Arizona commitment to $265B",
    summaryKo: "CC 웨이 CEO가 대만 실적발표에서 1000억 달러 추가, 팹 10개·패키징 2개 규모로 재조정.",
    summaryEn: "CEO C.C. Wei added $100B at Taipei earnings — footprint now 10 fabs, 2 packaging plants.",
    preferredSymbols: ["TSM", "SMH", "^IXIC"],
    relatedSupplyChainEpisodeId: "tsmc-arizona-onshoring-2020",
  },
  {
    id: "tsmc-kumamoto-fab2-3nm-2026",
    date: "2026-02-05",
    theater: "japan",
    domain: "economy",
    kind: "market_shock",
    labelKo: "TSMC 구마모토 2공장 3나노 상향 보도",
    labelEn: "TSMC Kumamoto Fab 2 reportedly upgraded to 3nm",
    summaryKo: "6~7나노 목표였던 JASM 2공장이 AI 수요를 타고 3나노로, 일본 정부 추가 보조금 전망.",
    summaryEn: "JASM's second fab, originally 6–7nm, upgraded to 3nm on AI demand — more Japanese subsidy expected.",
    preferredSymbols: ["TSM", "SMH", "^N225"],
    relatedSupplyChainEpisodeId: "tsmc-kumamoto-jasm-friendshoring-2021",
  },
  {
    id: "google-pixel-vietnam-full-exit-2026",
    date: "2026-08-18",
    theater: "southeast-asia",
    domain: "economy",
    kind: "market_shock",
    labelKo: "구글, 2027년 픽셀 전량 탈중국 생산 확정 보도",
    labelEn: "Google confirms full Pixel China-manufacturing exit by 2027",
    summaryKo: "픽셀11 NPI를 베트남에서만 처음 완주한 직후 니혼게이자이가 전면 철수 계획 확인.",
    summaryEn: "Nikkei Asia confirmed the full withdrawal plan right after Pixel 11's first Vietnam-only NPI.",
    preferredSymbols: ["GOOGL", "^IXIC"],
    relatedSupplyChainEpisodeId: "google-pixel-vietnam-china-exit-2023",
  },
  {
    id: "us-bis-affiliates-rule-2025",
    date: "2025-09-29",
    theater: "china-taiwan",
    domain: "economy",
    kind: "sanction_trade",
    labelKo: "미 상무부 '50% 계열사 규정' 즉시 발효",
    labelEn: "US Commerce's '50% Affiliates Rule' takes immediate effect",
    summaryKo: "Entity List 기업의 미상장 해외 계열사까지 자동으로 수출통제 대상에 포함시키는 허점 봉쇄.",
    summaryEn: "Closes the loophole letting unlisted foreign subsidiaries of Entity List firms dodge export controls.",
    preferredSymbols: ["TSM", "SMH", "000001.SS", "^HSI"],
    relatedSupplyChainEpisodeId: "us-bis-affiliates-rule-export-control-2025",
  },
  {
    id: "us-bis-affiliates-rule-suspended-2025",
    date: "2025-11-10",
    theater: "china-taiwan",
    domain: "economy",
    kind: "sanction_trade",
    labelKo: "'50% 계열사 규정' 집행 1년 유예",
    labelEn: "'50% Affiliates Rule' enforcement suspended for one year",
    summaryKo: "베선트 재무장관 주도 미·중 무역 해빙 국면에서 2026-11-09까지 집행 유예 — 폐지 아님.",
    summaryEn: "Enforcement paused through 2026-11-09 amid a Bessent-led US-China trade thaw — not repealed.",
    preferredSymbols: ["TSM", "SMH", "000001.SS", "^HSI"],
    relatedSupplyChainEpisodeId: "us-bis-affiliates-rule-export-control-2025",
  },
  {
    id: "samsung-p4-acceleration-2026",
    date: "2026-04-23",
    theater: "korea",
    domain: "economy",
    kind: "market_shock",
    labelKo: "삼성 평택 P4 가동 6개월 조기화",
    labelEn: "Samsung accelerates Pyeongtaek P4 by six months",
    summaryKo: "임시사용승인으로 상층 7월·하층 11월 가동 목표, 엔비디아 베라 루빈 양산 일정에 맞춘 HBM4 조기 양산 노림수.",
    summaryEn: "Using temporary-use approval to hit HBM4 output timed to Nvidia's Vera Rubin ramp.",
    preferredSymbols: ["005930.KS", "000660.KS", "^KS11"],
    relatedSupplyChainEpisodeId: "samsung-sk-hynix-korea-ai-memory-capacity-race-2019",
  },
  {
    id: "sk-hynix-yongin-cheongju-2026",
    date: "2026-08-07",
    theater: "korea",
    domain: "economy",
    kind: "market_shock",
    labelKo: "SK하이닉스 용인·청주 54.3조원 투자 확정",
    labelEn: "SK Hynix approves ₩54.3T for Yongin and Cheongju fabs",
    summaryKo: "이사회가 용인 Y2(D램)·청주 M17(낸드) 투자를 확정 — AI 메모리 수요 대응, 가동은 2027~2029년 순차.",
    summaryEn: "Board approved Yongin Y2 (DRAM) and Cheongju M17 (NAND) — cleanrooms open 2027–2029.",
    preferredSymbols: ["005930.KS", "000660.KS", "^KS11"],
    relatedSupplyChainEpisodeId: "samsung-sk-hynix-korea-ai-memory-capacity-race-2019",
  },
  {
    id: "indonesia-weda-bay-nickel-quota-halt-2026",
    date: "2026-06-04",
    theater: "southeast-asia",
    domain: "economy",
    kind: "market_shock",
    labelKo: "에라멧 웨다베이니켈, 채굴쿼터 소진으로 생산 중단",
    labelEn: "Eramet halts Weda Bay Nickel output after mining quota runs out",
    summaryKo: "2026년 RKAB 채굴쿼터가 4200만→1200만 톤(-71%)으로 깎이며 5월 말 채굴이 멈췄다고 확인 — 인도네시아 정부는 물량 확대가 아니라 톤당 가격 방어가 목적이라고 설명.",
    summaryEn: "Indonesia's 2026 RKAB quota cut 71% (42M to 12M tonnes) forced Weda Bay's ore mining to stop in late May — Jakarta frames the goal as price support, not output growth.",
    preferredSymbols: ["NIKL", "000001.SS"],
    relatedSupplyChainEpisodeId: "indonesia-nickel-downstreaming-resource-nationalism-2020",
  },
];

function assertPrimaries(rows: MajorEventTimelineEntry[]): void {
  const theaters = new Set<TheaterMarketFilter>();
  const chokes = new Set<LogisticsChokepointId>();
  let economyPrimary = 0;
  for (const row of rows) {
    if (row.primaryForTheater) {
      if (theaters.has(row.theater)) {
        throw new Error(`Duplicate primaryForTheater: ${row.theater} (${row.id})`);
      }
      theaters.add(row.theater);
    }
    if (row.primaryForChokepoint) {
      if (!row.chokepointId) {
        throw new Error(`primaryForChokepoint without chokepointId: ${row.id}`);
      }
      if (chokes.has(row.chokepointId)) {
        throw new Error(`Duplicate primaryForChokepoint: ${row.chokepointId} (${row.id})`);
      }
      chokes.add(row.chokepointId);
      const expected = CHOKEPOINT_PREFERRED_SYMBOLS[row.chokepointId];
      const got = row.preferredSymbols;
      if (
        expected.length !== got.length ||
        expected.some((sym, i) => sym !== got[i])
      ) {
        throw new Error(
          `primaryForChokepoint ${row.chokepointId} (${row.id}) preferredSymbols must match CHOKEPOINT_PREFERRED_SYMBOLS`,
        );
      }
    }
    if (row.primaryForEconomy) economyPrimary += 1;
  }
  if (economyPrimary > 1) {
    throw new Error("primaryForEconomy must be unique");
  }
}

assertPrimaries(MAJOR_EVENT_TIMELINE);

const byId = new Map(MAJOR_EVENT_TIMELINE.map((row) => [row.id, row]));

function matchesDomain(
  row: MajorEventTimelineEntry,
  domain: MajorEventDomain | "any",
): boolean {
  if (domain === "any") return true;
  // both = 지정학 앵커로도 씀. 경제 타임테이블은 economy만 (시장 비교용).
  if (domain === "conflict") return row.domain === "conflict" || row.domain === "both";
  if (domain === "economy") return row.domain === "economy";
  if (domain === "logistics") return row.domain === "logistics" || row.domain === "both";
  return row.domain === domain;
}

export function listMajorEvents(opts?: {
  domain?: MajorEventDomain | "any";
}): MajorEventTimelineEntry[] {
  const domain = opts?.domain ?? "any";
  const rows = [...MAJOR_EVENT_TIMELINE].sort((a, b) => a.date.localeCompare(b.date));
  if (domain === "any") return rows;
  return rows.filter((row) => matchesDomain(row, domain));
}

export function majorEventById(id: string): MajorEventTimelineEntry | null {
  return byId.get(id) ?? null;
}

export function majorEventsForTheater(
  theater: TheaterMarketFilter,
  opts?: { domain?: MajorEventDomain | "any" },
): MajorEventTimelineEntry[] {
  const domain = opts?.domain ?? "any";
  const base =
    theater === "all"
      ? listMajorEvents()
      : listMajorEvents().filter((row) => row.theater === theater);
  if (domain === "any") return base;
  return base.filter((row) => matchesDomain(row, domain));
}

export function majorEventsForChokepoint(
  chokepointId: LogisticsChokepointId,
): MajorEventTimelineEntry[] {
  return listMajorEvents().filter((row) => row.chokepointId === chokepointId);
}

export function listLogisticsEvents(): MajorEventTimelineEntry[] {
  return listMajorEvents({ domain: "logistics" });
}

export function listConflictEvents(): MajorEventTimelineEntry[] {
  return listMajorEvents({ domain: "conflict" });
}

export function listEconomyEvents(): MajorEventTimelineEntry[] {
  return listMajorEvents({ domain: "economy" });
}

/** 지정학 — 전장 기본 앵커 (conflict|both, primaryForTheater) */
export function primaryMajorEventForTheater(
  theater: TheaterMarketFilter,
): MajorEventTimelineEntry | null {
  if (theater === "all") return null;
  const rows = majorEventsForTheater(theater, { domain: "conflict" });
  return rows.find((row) => row.primaryForTheater) ?? rows[rows.length - 1] ?? null;
}

export function primaryMajorEventForChokepoint(
  chokepointId: LogisticsChokepointId,
): MajorEventTimelineEntry | null {
  const rows = majorEventsForChokepoint(chokepointId);
  return rows.find((row) => row.primaryForChokepoint) ?? rows[rows.length - 1] ?? null;
}

/** 경제 타임테이블 기본 앵커 */
export function primaryMajorEventForEconomy(): MajorEventTimelineEntry | null {
  const rows = listEconomyEvents();
  return rows.find((row) => row.primaryForEconomy) ?? rows[rows.length - 1] ?? null;
}

/**
 * 뷰어 모드별 타임테이블 선택.
 * - conflict: 현재 전장 지정학 앵커 (개전·위기)
 * - economy: 초크가 있으면 물류, 없으면 경제·시장(금·VIX·증시) 앵커
 */
export function resolveTimelineAnchorForViewerMode(input: {
  viewerMode: ViewerMode;
  theater: TheaterMarketFilter;
  chokepointId?: LogisticsChokepointId | null;
}): MajorEventTimelineEntry | null {
  if (input.viewerMode === "economy") {
    if (input.chokepointId) {
      return primaryMajorEventForChokepoint(input.chokepointId);
    }
    return primaryMajorEventForEconomy();
  }

  return primaryMajorEventForTheater(input.theater);
}

export function majorEventsBetween(
  fromDate: string,
  toDate: string,
  opts?: { domain?: MajorEventDomain | "any" },
): MajorEventTimelineEntry[] {
  return listMajorEvents(opts).filter((row) => row.date >= fromDate && row.date <= toDate);
}
