/**
 * 해상 초크포인트 — 검색·LLM이 읽을 수 있는 텍스트 표면 (SEO/AEO)
 *
 * ── 왜 이 파일이 필요한가 ──────────────────────────────────────────
 * 지구본은 WebGL 캔버스다. 크롤러도 LLM도 그 안을 못 읽는다. 사이트가
 * 아무리 좋아도 색인 가능한 문장이 없으면 검색·AI 인용 유입은 구조적으로 0이다.
 *
 * 초크포인트를 첫 텍스트 표면으로 고른 이유:
 *   - 전쟁(지정학)과 돈(지경학)이 **같은 좌표에서 만나는** 유일한 장소 →
 *     이 제품의 컨셉을 설명이 아니라 예시로 증명한다
 *   - 뉴스 사이클이 알아서 발생한다 (홍해·호르무즈)
 *   - 필요한 레이어가 이미 전부 있다
 *
 * ── 수치 정책 ─────────────────────────────────────────────────────
 * 여기 적힌 물동량은 전부 **EIA World Oil Transit Chokepoints** 출처다.
 * 추정치를 지어내지 않는다 — 이 사이트의 유일한 자산은 신뢰다.
 * EIA가 발표하지 않는 항목(대만해협 석유 물동량 등)은 `flow: null`로 두고
 * 정성 서술만 한다. 빈칸을 그럴듯한 숫자로 메우는 순간 전부를 잃는다.
 */

import type { ViewerMode } from "@/lib/viewPackages";

export type Bilingual = { ko: string; en: string };

export type ChokepointFlow = {
  /** 일일 석유 물동량 (백만 배럴/일) */
  oilMbd: number;
  /** 해당 수치의 기준 시점 */
  period: string;
  /** 세계 대비 비중 서술 */
  share: Bilingual;
};

export type Chokepoint = {
  /** URL 슬러그 — `/chokepoints/<slug>` */
  slug: string;
  /** sceneCard.ts의 SCENE_PLACES id와 일치시킨다 (지명 역참조 일관성) */
  scenePlaceId: string;
  name: Bilingual;
  /** 검색 질의에 대응하는 별칭 — JSON-LD alternateName */
  aliases: string[];
  lat: number;
  lng: number;
  /** 접경/연안 국가 (ISO 3166-1 alpha-2) */
  littoral: string[];
  /** EIA 미발표 시 null */
  flow: ChokepointFlow | null;
  /** 한 줄 요약 — 메타 설명·카드에 재사용 */
  summary: Bilingual;
  /** 왜 이 좁은 물길이 중요한가 */
  whyItMatters: Bilingual;
  /** 막히면 무슨 일이 벌어지나 — 대체 항로와 그 비용 */
  ifDisrupted: Bilingual;
  /** 지구본에서 이 지점을 열 때 쓸 장면 상태 */
  scene: {
    mode: ViewerMode;
    altitude: number;
    layers: string[];
  };
};

/** 지경학 시선 기본 레이어 — 돈과 물류 */
const ECON_LAYERS = [
  "showAis",
  "showShippingLanes",
  "showCriticalNodes",
  "showPorts",
  "showOilPipelines",
  "showLogisticsRisk",
];

/** 지정학 시선 기본 레이어 — 축과 전선 */
const CONFLICT_LAYERS = [
  "showWarZones",
  "showAis",
  "showUkmtoIncidents",
  "showGdeltWar",
  "showMilitaryActivity",
  "showShippingLanes",
];

export const CHOKEPOINTS: Chokepoint[] = [
  {
    slug: "strait-of-hormuz",
    scenePlaceId: "choke-hormuz",
    name: { ko: "호르무즈 해협", en: "Strait of Hormuz" },
    aliases: ["Hormuz", "Hormoz", "호르무즈"],
    lat: 26.58,
    lng: 56.25,
    littoral: ["IR", "OM", "AE"],
    flow: {
      oilMbd: 20.9,
      period: "2025 H1 (2024 avg: 20.0)",
      share: {
        ko: "세계 석유 소비량의 약 20%",
        en: "About 20% of global petroleum liquids consumption",
      },
    },
    summary: {
      ko: "세계에서 가장 대체 불가능한 석유 통로. 페르시아만의 유일한 바닷길이다.",
      en: "The world's most irreplaceable oil passage — the only sea route out of the Persian Gulf.",
    },
    whyItMatters: {
      ko: "가장 좁은 곳의 항로 폭은 3km 남짓이고, 사우디·이라크·쿠웨이트·UAE·이란의 수출이 전부 이 한 줄을 지난다. 여기를 지나는 원유의 대부분은 아시아행 — 중국·인도·일본·한국이다. 즉 호르무즈의 긴장은 지리적으로는 걸프의 문제지만, 청구서는 동아시아가 받는다.",
      en: "The shipping lanes narrow to roughly two miles across, and the exports of Saudi Arabia, Iraq, Kuwait, the UAE and Iran all pass through that single line. The overwhelming majority of the crude crossing it is bound for Asia — China, India, Japan and South Korea. Tension at Hormuz is geographically a Gulf problem, but the bill arrives in East Asia.",
    },
    ifDisrupted: {
      ko: "육상 우회로는 사우디의 동-서 파이프라인과 UAE의 후자이라 파이프라인뿐이고, 둘을 합쳐도 정상 물동량의 일부만 감당한다. 실질적 대체 항로가 없다는 점에서 다른 모든 초크포인트와 다르다.",
      en: "The only bypasses are Saudi Arabia's East-West pipeline and the UAE's Fujairah line, and together they cover only a fraction of normal flow. The absence of a practical alternative route is what separates Hormuz from every other chokepoint.",
    },
    scene: { mode: "economy", altitude: 0.42, layers: ECON_LAYERS },
  },
  {
    slug: "strait-of-malacca",
    scenePlaceId: "choke-malacca",
    name: { ko: "믈라카 해협", en: "Strait of Malacca" },
    aliases: ["Malacca", "Melaka", "말라카", "믈라카"],
    lat: 2.5,
    lng: 101.5,
    littoral: ["MY", "ID", "SG"],
    flow: {
      oilMbd: 23.2,
      period: "2025 H1 (2024 avg: 22.5)",
      share: {
        ko: "세계 해상 석유 교역의 약 29%",
        en: "About 29% of global seaborne oil trade",
      },
    },
    summary: {
      ko: "물동량 기준 세계 최대 석유 초크포인트. 인도양과 태평양을 잇는 문이다.",
      en: "The world's busiest oil chokepoint by volume — the door between the Indian and Pacific Oceans.",
    },
    whyItMatters: {
      ko: "중동·아프리카의 에너지가 동아시아로 가는 최단 경로다. 중국이 오래전부터 '말라카 딜레마'를 국가 전략 문제로 다뤄온 이유이며, 파키스탄·미얀마를 통한 육상 회랑 투자와 남중국해 태세가 전부 이 한 줄의 취약성에서 파생된다.",
      en: "It is the shortest path for Middle Eastern and African energy to reach East Asia. This is why Beijing has treated the \"Malacca dilemma\" as a strategic problem for two decades — the overland corridors through Pakistan and Myanmar, and much of the posture in the South China Sea, derive from the vulnerability of this single line.",
    },
    ifDisrupted: {
      ko: "롬복·순다 해협으로 우회가 가능하지만 항로가 길어지고 대형 선박에는 수심 제약이 따른다. 호르무즈와 달리 '봉쇄되면 끝'은 아니고, '봉쇄되면 비싸진다'에 가깝다.",
      en: "Traffic can divert through the Lombok or Sunda Straits, but the voyage lengthens and draft limits bite for the largest vessels. Unlike Hormuz, closure here is less an absolute stop than a sharp, sustained increase in cost.",
    },
    scene: { mode: "economy", altitude: 0.5, layers: ECON_LAYERS },
  },
  {
    slug: "bab-el-mandeb",
    scenePlaceId: "choke-bab-el-mandeb",
    name: { ko: "바브엘만데브 해협", en: "Bab el-Mandeb" },
    aliases: ["Bab al-Mandab", "Mandeb", "Red Sea entrance", "바브엘만데브"],
    lat: 12.61,
    lng: 43.35,
    littoral: ["YE", "DJ", "ER"],
    flow: {
      oilMbd: 4.2,
      period: "2025 H1",
      share: {
        ko: "수에즈 경로의 관문 — 물동량은 작지만 대체 시 항로가 크게 늘어난다",
        en: "The gateway to the Suez route — modest in volume, but costly to bypass",
      },
    },
    summary: {
      ko: "홍해로 들어가는 유일한 남쪽 입구. 최근 몇 년 세계에서 가장 자주 시험받은 물길이다.",
      en: "The only southern entrance to the Red Sea — and in recent years the most frequently tested waterway in the world.",
    },
    whyItMatters: {
      ko: "이 해협을 지나야 수에즈 운하에 닿는다. 즉 바브엘만데브가 위험해지면 수에즈의 물동량도 함께 무너진다. 두 초크포인트는 사실상 하나의 직렬 회로다.",
      en: "You must pass here to reach the Suez Canal. When Bab el-Mandeb becomes dangerous, Suez volumes fall with it — the two chokepoints are effectively a single circuit in series.",
    },
    ifDisrupted: {
      ko: "선박은 희망봉을 돌아간다. 아시아-유럽 항로 기준 대략 10일 안팎이 추가되고 연료·용선료·보험료가 함께 오른다. 운임과 보험 프리미엄이 가장 먼저 반응하는 지점이다.",
      en: "Vessels route around the Cape of Good Hope, adding roughly ten days on the Asia-Europe run along with fuel, charter and insurance costs. Freight rates and war-risk premiums are the first indicators to move.",
    },
    scene: { mode: "conflict", altitude: 0.45, layers: CONFLICT_LAYERS },
  },
  {
    slug: "suez-canal",
    scenePlaceId: "choke-suez",
    name: { ko: "수에즈 운하", en: "Suez Canal" },
    aliases: ["Suez", "SUMED", "수에즈"],
    // 운하 중간부(이스마일리아 인근). 기존 값 31.25/32.34 는 북단 포트사이드였고
    // criticalNodes(MIT Atlas) 와 73km 어긋나 같은 지명 핀이 두 개 떴다 (P0-5).
    // 193km 길이의 운하를 한 점으로 나타낼 때는 중간부가 더 대표적이다.
    lat: 30.593,
    lng: 32.437,
    littoral: ["EG"],
    flow: {
      oilMbd: 4.9,
      period: "2025 H1 (Suez Canal + SUMED pipeline)",
      share: {
        ko: "운하와 SUMED 파이프라인 합산",
        en: "Canal and SUMED pipeline combined",
      },
    },
    summary: {
      ko: "아시아와 유럽을 잇는 인공 물길. 여기서 하루가 밀리면 유럽 공장 일정이 밀린다.",
      en: "The man-made link between Asia and Europe — a day lost here is a day lost on European factory schedules.",
    },
    whyItMatters: {
      ko: "컨테이너 정기선 관점에서는 석유보다 더 중요하다. 2021년 좌초 한 건이 세계 공급망 논의를 몇 년치 앞당겼다는 사실이 이 운하의 레버리지를 보여준다. 병렬로 놓인 SUMED 파이프라인이 원유 일부를 우회시킨다.",
      en: "For container liner traffic it matters even more than for oil. A single grounding in 2021 advanced the global supply-chain conversation by years, which is a fair measure of this canal's leverage. The parallel SUMED pipeline carries some crude around it.",
    },
    ifDisrupted: {
      ko: "역시 희망봉 우회다. 정기선 스케줄이 어긋나면 항만 혼잡과 컨테이너 위치 불균형이 뒤따라 발생하고, 이 2차 효과가 종종 1차 효과보다 오래 간다.",
      en: "Again, the Cape route. When liner schedules break, port congestion and container repositioning imbalances follow — and these second-order effects often outlast the original disruption.",
    },
    scene: { mode: "economy", altitude: 0.35, layers: ECON_LAYERS },
  },
  {
    slug: "taiwan-strait",
    scenePlaceId: "choke-taiwan-strait",
    name: { ko: "대만 해협", en: "Taiwan Strait" },
    aliases: ["Formosa Strait", "대만해협", "타이완 해협"],
    lat: 24.48,
    lng: 119.5,
    littoral: ["TW", "CN"],
    // EIA는 대만해협 석유 물동량을 별도 초크포인트로 발표하지 않는다.
    // 지어내지 않고 비워 둔다.
    flow: null,
    summary: {
      ko: "석유가 아니라 반도체와 컨테이너가 지나는 초크포인트. 그래서 더 대체하기 어렵다.",
      en: "A chokepoint for semiconductors and containers rather than oil — and harder to substitute for exactly that reason.",
    },
    whyItMatters: {
      ko: "다른 초크포인트는 '무엇이 지나가는가'로 정의되지만, 대만해협은 '무엇이 만들어지는가'로 정의된다. 첨단 반도체 생산이 이 섬에 집중돼 있어, 해협의 긴장은 항로 문제인 동시에 생산 문제다. 세계 컨테이너 선복의 상당 부분이 이 해협 또는 그 인근을 통과한다.",
      en: "Other chokepoints are defined by what passes through them; the Taiwan Strait is defined by what is made beside it. Advanced semiconductor fabrication is concentrated on the island, so tension here is simultaneously a shipping problem and a production problem. A large share of the world's container tonnage transits the strait or its approaches.",
    },
    ifDisrupted: {
      ko: "항로는 대만 동쪽으로 우회할 수 있지만, 생산은 우회할 수 없다. 이것이 다른 네 곳과 근본적으로 다른 점이다. 대체 팹 건설은 항로 변경과 달리 수년 단위 문제다.",
      en: "Shipping can route east of Taiwan; production cannot be rerouted at all. That is the fundamental difference from the other four. Standing up alternative fabs is a multi-year problem, not a course change.",
    },
    scene: { mode: "conflict", altitude: 0.55, layers: CONFLICT_LAYERS },
  },
  {
    slug: "turkish-straits",
    scenePlaceId: "choke-bosporus",
    name: { ko: "터키 해협 (보스포루스·다르다넬스)", en: "Turkish Straits" },
    aliases: ["Bosporus", "Bosphorus", "Dardanelles", "보스포루스", "다르다넬스", "터키해협"],
    // 보스포루스 최협부 — 이스탄불 시내를 관통한다
    lat: 41.12,
    lng: 29.07,
    littoral: ["TR"],
    flow: {
      oilMbd: 3.7,
      period: "2025 H1",
      share: {
        ko: "흑해 산유국의 유일한 지중해 출구",
        en: "The only Mediterranean outlet for Black Sea producers",
      },
    },
    summary: {
      ko: "러시아·카자흐 원유와 우크라이나 곡물이 같은 물길을 쓴다. 도시 한복판을 지나는 유일한 초크포인트.",
      en: "Russian and Kazakh crude share this water with Ukrainian grain — the only chokepoint that runs through the middle of a city.",
    },
    whyItMatters: {
      ko: "흑해는 닫힌 바다이고, 나가는 문은 여기 하나다. 러시아 노보로시스크와 카자흐 CPC 터미널의 원유, 우크라이나 오데사의 곡물이 전부 이 한 줄을 통과한다. 게다가 몽트뢰 협약이 군함 통항을 규율하기 때문에, 이 해협은 상업 항로인 동시에 **해군 전력 배치의 법적 관문**이다. 지경학과 지정학이 같은 좌표에서 만나는 드문 지점이다.",
      en: "The Black Sea is a closed sea with one door. Crude from Novorossiysk and the Kazakh CPC terminal, and grain from Odesa, all pass this single line. And because the Montreux Convention governs warship transit, the strait is simultaneously a commercial lane and a **legal gate on naval deployment** — a rare place where geoeconomics and geopolitics share one coordinate.",
    },
    ifDisrupted: {
      ko: "실질적 해상 대체로가 없다. 흑해 물량은 파이프라인(드루즈바·BTC)으로 돌리거나 포기해야 하는데, 두 경로 모두 여유 용량이 제한적이다. 곡물은 다뉴브 강 바지선·루마니아 콘스탄차로 일부 우회했지만 처리량이 크게 떨어진다.",
      en: "There is no practical maritime alternative. Black Sea volumes must shift to pipelines (Druzhba, BTC) or be foregone, and both have limited spare capacity. Grain has partly rerouted via Danube barges and Romania's Constanța, at a sharp cost in throughput.",
    },
    scene: { mode: "conflict", altitude: 0.4, layers: CONFLICT_LAYERS },
  },
  {
    slug: "panama-canal",
    scenePlaceId: "choke-panama",
    name: { ko: "파나마 운하", en: "Panama Canal" },
    aliases: ["Panama", "파나마운하", "Gatun"],
    // ⚠️ sceneCard.ts 의 SCENE_PLACES["choke-panama"] 와 값이 같아야 한다 (P0-5)
    lat: 9.08,
    lng: -79.68,
    littoral: ["PA"],
    flow: {
      oilMbd: 2.3,
      period: "2025 H1",
      share: {
        ko: "미국 걸프–아시아 LPG·석유제품의 주 통로",
        en: "Main route for US Gulf–Asia LPG and refined products",
      },
    },
    summary: {
      ko: "기후가 초크포인트를 좁힐 수 있다는 것을 증명한 곳. 봉쇄가 아니라 가뭄으로 막혔다.",
      en: "The place that proved climate can narrow a chokepoint — closed by drought, not by blockade.",
    },
    whyItMatters: {
      ko: "다른 초크포인트의 위험은 군사·정치적이지만 파나마의 위험은 **수문학적**이다. 갑문식 운하라 통항 1회마다 가툰 호수의 담수를 대량 소모하고, 강우가 부족하면 물리적으로 배를 넘길 수 없다. 2023~24년 가뭄 때 일일 통항 척수가 크게 줄고 슬롯 경매가가 폭등했다. 미국 걸프의 LPG·석유제품이 아시아로 가는 최단 경로이기도 하다.",
      en: "Risk at other chokepoints is military or political; at Panama it is **hydrological**. It is a lock canal, so every transit consumes fresh water from Gatún Lake — when rainfall falls short, ships physically cannot be lifted. During the 2023–24 drought, daily transits were cut sharply and slot auction prices spiked. It is also the shortest path for US Gulf LPG and refined products bound for Asia.",
    },
    ifDisrupted: {
      ko: "수에즈 경유 또는 케이프 혼·희망봉 우회. 미 걸프–동아시아 기준 수 주가 추가된다. 특이한 점은 이 초크포인트가 **부분적으로만 막힌다**는 것 — 완전 폐쇄가 아니라 통항 슬롯이 줄고 값이 오르는 방식으로 조여든다.",
      en: "Reroute via Suez, or around Cape Horn / the Cape of Good Hope, adding weeks on the US Gulf–East Asia run. What is unusual here is that the chokepoint constricts **partially** — not a closure so much as fewer transit slots at rising prices.",
    },
    scene: { mode: "economy", altitude: 0.42, layers: ECON_LAYERS },
  },
  {
    slug: "danish-straits",
    scenePlaceId: "choke-danish-straits",
    name: { ko: "덴마크 해협 (대벨트·외레순)", en: "Danish Straits" },
    aliases: ["Great Belt", "Oresund", "Øresund", "Kattegat", "덴마크해협", "외레순"],
    // 대벨트 해협 — 발트 원유 수출의 실질 관문
    lat: 55.34,
    lng: 11.0,
    littoral: ["DK", "SE"],
    flow: {
      oilMbd: 4.9,
      period: "2025 H1",
      share: {
        ko: "러시아 발트 수출의 관문 — 그림자 함대의 주 무대",
        en: "Gateway for Russian Baltic exports — the shadow fleet's main stage",
      },
    },
    summary: {
      ko: "제재받는 원유가 매일 NATO 회원국 사이를 지나간다. 법과 항행의 자유가 정면으로 부딪히는 곳.",
      en: "Sanctioned crude passes between NATO members every day — where sanctions law and freedom of navigation collide head-on.",
    },
    whyItMatters: {
      ko: "프리모르스크·우스트루가 등 러시아 발트 항구에서 나온 원유는 전부 여기를 지난다. 그런데 이 해협은 덴마크와 스웨덴 사이, 즉 **NATO 내해에 가깝다.** 유가 상한제 이후 늘어난 노후 유조선·불투명 보험의 '그림자 함대'가 바로 이 구간을 통과하며, 연안국은 국제 해협 통항권 때문에 임검에 제약을 받는다. 제재의 실효성이 시험되는 물리적 좌표다.",
      en: "Crude leaving Russian Baltic ports such as Primorsk and Ust-Luga all passes here — through what is effectively a **NATO inner sea** between Denmark and Sweden. The ageing, opaquely insured 'shadow fleet' that grew after the price cap transits this stretch, while littoral states are constrained in boarding them by transit rights through international straits. This is the physical coordinate where sanctions enforcement is tested.",
    },
    ifDisrupted: {
      ko: "발트 원유에는 사실상 해상 대체로가 없다. 무르만스크·노보로시스크로 육상 재배치해야 하는데 파이프라인 용량과 거리가 모두 불리하다. 반대로 이 해협의 통항 통제 강화는 '봉쇄'로 해석될 수 있어 정치적 비용이 매우 크다.",
      en: "There is effectively no maritime alternative for Baltic crude; volumes would have to be rerouted overland toward Murmansk or Novorossiysk, where both pipeline capacity and distance work against it. Conversely, tightening transit control here risks being read as blockade — the political cost is steep.",
    },
    scene: { mode: "economy", altitude: 0.42, layers: ECON_LAYERS },
  },
];

export function getChokepoint(slug: string): Chokepoint | undefined {
  return CHOKEPOINTS.find((c) => c.slug === slug);
}

/**
 * 지구본 딥링크 — `sceneLink.ts`의 `buildSceneUrl`과 동일한 쿼리 형식.
 *
 * 그쪽 모듈은 `"use client"`라 서버 컴포넌트에서 import할 수 없어서
 * 형식만 맞춰 여기서 다시 만든다. 형식이 바뀌면 두 곳을 함께 고쳐야 한다.
 */
export function chokepointSceneHref(cp: Chokepoint, asOf?: string | null): string {
  const params = new URLSearchParams({
    scene: "1",
    mode: cp.scene.mode,
    lat: cp.lat.toFixed(4),
    lng: cp.lng.toFixed(4),
    alt: cp.scene.altitude.toFixed(3),
    layers: cp.scene.layers.join("."),
  });
  if (asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    params.set("asOf", asOf);
  }
  return `/?${params.toString()}`;
}

/** EIA 출처 — 모든 물동량 수치의 근거 */
export const FLOW_SOURCE = {
  label: "U.S. Energy Information Administration — World Oil Transit Chokepoints",
  url: "https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints",
};
