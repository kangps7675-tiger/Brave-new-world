import type { StaticPoint } from "@/data/geoTypes";

/**
 * 글로우 링 반경(deg) — 각 해협·운하 해역 폭에 맞춤.
 * ringMaxRadius ≈ 위도 도(°); 1° ≈ 111km. 최협부 폭의 절반 + 소폭 패딩.
 */
export const CHOKE_RING_RADIUS_DEG: Record<string, number> = {
  "choke-hormuz": 0.38, // 호르무즈 최협 ~33–39km
  "choke-suez": 0.28, // 운하 회랑(접근수로 포함)
  "choke-bab-el-mandeb": 0.32, // 바브엘만데브 최협 ~26–32km
  "choke-malacca": 0.42, // 말라카 남단 병목 해역
  "choke-taiwan": 0.85, // 대만해협 최협 ~130km → 반경 ~0.6° + 패딩
  "choke-panama": 0.22, // 파나마 운하 회랑
  "choke-bosporus": 0.18, // 보스포루스 ~0.7–3.7km (가독 최소)
  "choke-gibraltar": 0.26, // 지브롤터 최협 ~14km
  "choke-good-hope": 0.55, // 희망봉 우회 해역(해협 아님)
};

/**
 * 글로벌 4대(+보조) 해상 초크포인트 — 좌표 [경도, 위도] 기준 시드.
 * 카메라 힌트(meta.cameraZoom / cameraPitch)는 nav fly 시 참고.
 */
export const LOGISTICS_RISK_POINTS: StaticPoint[] = [
  {
    id: "choke-hormuz",
    kind: "chokepoint",
    name: "호르무즈 해협",
    lat: 26.58,
    lng: 56.25,
    tier: 1,
    meta: {
      category: "strait",
      nameEn: "Strait of Hormuz",
      throughput: "~20% global oil",
      riskNote: "걸프 원유 수출 관문. 봉쇄 위협 시 유가·LNG 스프레드 즉각 반응.",
      relatedTickers: "Brent · DXY · VIX",
      cameraZoom: 8.5,
      cameraPitch: 55,
      glow: 1,
    },
  },
  {
    id: "choke-suez",
    kind: "chokepoint",
    name: "수에즈 운하",
    lat: 31.25,
    lng: 32.34,
    tier: 1,
    meta: {
      category: "canal",
      nameEn: "Suez Canal",
      throughput: "~12% global trade",
      riskNote: "유럽·아시아 컨테이너·원유 우회 비용의 핵심 병목. 봉쇄·공습 시 Brent·운임 프리미엄 급등.",
      relatedTickers: "Brent · DXY · VIX",
      cameraZoom: 9,
      cameraPitch: 45,
      glow: 1,
    },
  },
  {
    id: "choke-bab-el-mandeb",
    kind: "chokepoint",
    name: "바브엘만데브 해협",
    lat: 12.61,
    lng: 43.35,
    tier: 1,
    meta: {
      category: "strait",
      nameEn: "Bab-el-Mandeb",
      throughput: "Red Sea gateway",
      riskNote: "홍해·수에즈 연결 관문. 후티·해상 공격 시 아프리카 우회·운송 지연.",
      relatedTickers: "Brent · Gold · VIX",
      cameraZoom: 8.5,
      cameraPitch: 50,
      glow: 1,
    },
  },
  {
    id: "choke-malacca",
    kind: "chokepoint",
    name: "말라카 해협",
    lat: 2.52,
    lng: 101.34,
    tier: 1,
    meta: {
      category: "strait",
      nameEn: "Strait of Malacca",
      throughput: "~25% traded goods",
      riskNote: "중국·동남아 에너지·제조 공급망 허리. 대만·남중국해 긴장과 연동.",
      relatedTickers: "Shanghai · Hang Seng · Brent",
      cameraZoom: 8,
      cameraPitch: 45,
      glow: 1,
    },
  },
  {
    id: "choke-taiwan",
    kind: "chokepoint",
    name: "대만 해협",
    lat: 24.32,
    lng: 120.85,
    tier: 1,
    meta: {
      category: "strait",
      nameEn: "Taiwan Strait",
      throughput: "Semiconductor lane",
      riskNote: "반도체·해운 핵심 수로. 군사 긴장 시 아시아·미국 기술주 변동성 확대.",
      relatedTickers: "NASDAQ · Hang Seng · Shanghai",
      cameraZoom: 7.5,
      cameraPitch: 50,
      glow: 1,
    },
  },
  {
    id: "choke-panama",
    kind: "chokepoint",
    name: "파나마 운하",
    lat: 9.12,
    lng: -79.91,
    tier: 1,
    meta: {
      category: "canal",
      nameEn: "Panama Canal",
      throughput: "Americas–Asia link",
      riskNote: "태평양·대서양 연결. 가뭄·통행 제한 시 미주·아시아 컨테이너 재배치.",
      relatedTickers: "S&P 500 · Brent",
      cameraZoom: 10,
      cameraPitch: 45,
      glow: 1,
    },
  },
  {
    id: "choke-bosporus",
    kind: "chokepoint",
    name: "터키 해협(보스포루스)",
    lat: 41.12,
    lng: 29.05,
    tier: 2,
    meta: {
      category: "strait",
      nameEn: "Bosporus",
      throughput: "Black Sea grain·oil",
      riskNote: "흑해 곡물·에너지 수출 관문. 우크라·러 전쟁·제재와 직접 연동.",
      relatedTickers: "Brent · Gold · S&P 500",
      glow: 0.7,
    },
  },
  {
    id: "choke-gibraltar",
    kind: "chokepoint",
    name: "지브롤터 해협",
    lat: 35.98,
    lng: -5.6,
    tier: 2,
    meta: {
      category: "strait",
      nameEn: "Strait of Gibraltar",
      throughput: "Med–Atlantic",
      riskNote: "지중해·대서양 연결. 유럽 에너지·LNG 수입 경로.",
      relatedTickers: "Brent · DXY",
      glow: 0.55,
    },
  },
  {
    id: "choke-good-hope",
    kind: "chokepoint",
    name: "희망봉 우회로",
    lat: -34.36,
    lng: 18.47,
    tier: 2,
    meta: {
      category: "cape",
      nameEn: "Cape of Good Hope",
      throughput: "Red Sea bypass",
      riskNote: "홍해 리스크 시 대체 항로. 운항 거리·연료·운임 상승의 벤치마크.",
      relatedTickers: "Brent · VIX",
      glow: 0.45,
    },
  },
  {
    id: "hub-crimea-bridge",
    kind: "logistics-hub",
    name: "크림 대교",
    lat: 45.3,
    lng: 36.512,
    tier: 1,
    meta: {
      category: "bridge",
      riskNote: "크림·러 본토 연결. 파괴·봉쇄 시 흑해 전선·곡물·에너지 물류 재편.",
      relatedTickers: "Brent · Gold · S&P 500",
    },
  },
  {
    id: "hub-kerch-strait",
    kind: "logistics-hub",
    name: "케르치 해협",
    lat: 45.25,
    lng: 36.48,
    tier: 2,
    meta: {
      category: "strait",
      riskNote: "아조프해·흑해 연결. 우크라 곡물·철강 수출 경로.",
      relatedTickers: "Brent · Gold",
    },
  },
];

/** 초크포인트 은은한 주황 링용 — logisticsRisk 레이어 ON일 때 */
export function chokeGlowRingSeed(
  points: StaticPoint[] = LOGISTICS_RISK_POINTS,
  colorForId?: (id: string) => string | undefined,
) {
  return points
    .filter((p) => p.kind === "chokepoint")
    .map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      glow: typeof p.meta?.glow === "number" ? p.meta.glow : p.tier === 1 ? 1 : 0.55,
      radiusScale: CHOKE_RING_RADIUS_DEG[p.id] ?? 0.35,
      ...(colorForId?.(p.id) ? { color: colorForId(p.id)! } : {}),
    }));
}
