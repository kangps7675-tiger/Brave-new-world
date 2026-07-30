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
    lat: 31.25,
    lng: 32.34,
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
    scenePlaceId: "china-taiwan",
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
export function chokepointSceneHref(cp: Chokepoint): string {
  const params = new URLSearchParams({
    scene: "1",
    mode: cp.scene.mode,
    lat: cp.lat.toFixed(4),
    lng: cp.lng.toFixed(4),
    alt: cp.scene.altitude.toFixed(3),
    layers: cp.scene.layers.join("."),
  });
  return `/?${params.toString()}`;
}

/** EIA 출처 — 모든 물동량 수치의 근거 */
export const FLOW_SOURCE = {
  label: "U.S. Energy Information Administration — World Oil Transit Chokepoints",
  url: "https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints",
};
