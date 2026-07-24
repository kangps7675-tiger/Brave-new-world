/**
 * "당신의 지정학 감각은 몇 점?" — 사건→시장 반응 5문항 퀴즈.
 * 실제 있었던 사건·가격 반응을 고정 뱅크로 둔다 (라이브 API 대기 없음).
 */

import type { AnalystTierId } from "@/lib/wti";
import { analystTierLabel } from "@/lib/wti";

export type SenseChoice = {
  id: string;
  labelKo: string;
  labelEn: string;
};

export type SenseQuestion = {
  id: string;
  /** 사건 한 줄 */
  eventKo: string;
  eventEn: string;
  /** 질문 */
  questionKo: string;
  questionEn: string;
  choices: SenseChoice[];
  answerId: string;
  explainKo: string;
  explainEn: string;
};

/** 8문항 뱅크에서 5개 셔플 — 리플레이 시 다른 세트 */
export const SENSE_QUIZ_BANK: SenseQuestion[] = [
  {
    id: "iran-israel-2024-oil",
    eventKo: "2024년 4월, 이란이 이스라엘에 드론·미사일을 직접 발사한 직후",
    eventEn: "Right after Iran’s direct drone/missile strike on Israel (Apr 2024)",
    questionKo: "브렌트유는 어떻게 움직였을까?",
    questionEn: "What did Brent crude do?",
    choices: [
      { id: "up", labelKo: "올랐다", labelEn: "Went up" },
      { id: "down", labelKo: "내렸다", labelEn: "Went down" },
      { id: "flat", labelKo: "거의 안 움직였다", labelEn: "Barely moved" },
    ],
    answerId: "up",
    explainKo: "중동 확전 공포로 유가 단기 급등. ‘전쟁 ↔ 이익’의 전형.",
    explainEn: "Escalation fear bid oil higher — classic war↔markets.",
  },
  {
    id: "nordstream-2022",
    eventKo: "2022년 9월, 노르드스트림 파이프라인이 폭파·누출로 정지된 직후",
    eventEn: "After Nord Stream pipelines were ruptured (Sep 2022)",
    questionKo: "유럽 천연가스(TTF) 가격은?",
    questionEn: "European natural gas (TTF) prices?",
    choices: [
      { id: "up", labelKo: "급등했다", labelEn: "Spiked" },
      { id: "down", labelKo: "급락했다", labelEn: "Crashed" },
      { id: "flat", labelKo: "큰 변화 없었다", labelEn: "Little change" },
    ],
    answerId: "up",
    explainKo: "공급 물리적 차단 신호 → 가스 가격 폭등.",
    explainEn: "Physical supply shock — gas prices surged.",
  },
  {
    id: "suez-evergiven-2021",
    eventKo: "2021년 3월, 에버기븐호가 수에즈 운하를 막은 동안",
    eventEn: "While Ever Given blocked the Suez Canal (Mar 2021)",
    questionKo: "글로벌 해운·컨테이너 운임 분위기는?",
    questionEn: "Global shipping / container freight?",
    choices: [
      { id: "up", labelKo: "병목·운임 상승 압력", labelEn: "Bottleneck / freight up" },
      { id: "down", labelKo: "운임 폭락", labelEn: "Freight collapsed" },
      { id: "flat", labelKo: "시장이 무시", labelEn: "Markets ignored it" },
    ],
    answerId: "up",
    explainKo: "세계 무역의 ~12%가 지나는 초크포인트 마비 → 물류 스트레스.",
    explainEn: "~12% of world trade jammed — logistics stress.",
  },
  {
    id: "houthi-red-sea-2023",
    eventKo: "2023년 말~2024년, 후티의 홍해 상선 공격이 잦아지던 때",
    eventEn: "As Houthi Red Sea shipping attacks intensified (late 2023–24)",
    questionKo: "유조선·컨테이너선 항로는?",
    questionEn: "Tanker & container routes?",
    choices: [
      { id: "cape", labelKo: "희망봉 우회가 늘었다", labelEn: "More Cape of Good Hope detours" },
      { id: "suez-more", labelKo: "수에즈 통과가 더 늘었다", labelEn: "More Suez transits" },
      { id: "flat", labelKo: "항로 변화 거의 없음", labelEn: "Routes unchanged" },
    ],
    answerId: "cape",
    explainKo: "위험 회피로 아프리카 희망봉 우회 → 운송일·비용 증가.",
    explainEn: "Risk avoidance → Cape detours, longer voyages.",
  },
  {
    id: "ukraine-grain-2022",
    eventKo: "2022년 러·우 전쟁 초, 흑해 곡물 수출이 막히던 시기",
    eventEn: "Early Russia–Ukraine war, Black Sea grain exports blocked (2022)",
    questionKo: "밀·옥수수 등 곡물 가격은?",
    questionEn: "Wheat / corn prices?",
    choices: [
      { id: "up", labelKo: "급등했다", labelEn: "Spiked" },
      { id: "down", labelKo: "급락했다", labelEn: "Crashed" },
      { id: "flat", labelKo: "거의 무반응", labelEn: "Muted" },
    ],
    answerId: "up",
    explainKo: "세계 식량 공급의 핵심 회랑 차단 → 곡물 선물 급등.",
    explainEn: "Key food corridor shut — grain futures jumped.",
  },
  {
    id: "saudi-aramco-2019",
    eventKo: "2019년 9월, 사우디 아람코 시설 드론 공격 직후",
    eventEn: "Right after the drone strike on Saudi Aramco (Sep 2019)",
    questionKo: "유가(브렌트)는?",
    questionEn: "Brent oil?",
    choices: [
      { id: "up", labelKo: "하루 만에 크게 올랐다", labelEn: "Jumped hard in a day" },
      { id: "down", labelKo: "내렸다", labelEn: "Fell" },
      { id: "flat", labelKo: "반응 없음", labelEn: "No reaction" },
    ],
    answerId: "up",
    explainKo: "세계 최대 산유국 공급 차질 공포 → 유가 일일 급등 기록.",
    explainEn: "Top producer supply scare — historic one-day oil spike.",
  },
  {
    id: "taiwan-chip-2022-rhetoric",
    eventKo: "대만해협 긴장·봉쇄 시뮬레이션 뉴스가 잦아지던 구간",
    eventEn: "When Taiwan Strait blockade sims / tension headlines spiked",
    questionKo: "시장이 가장 먼저 민감해진 테마는?",
    questionEn: "What theme did markets price first?",
    choices: [
      { id: "chips", labelKo: "반도체·공급망 리스크", labelEn: "Chips / supply-chain risk" },
      { id: "coffee", labelKo: "커피 선물", labelEn: "Coffee futures" },
      { id: "flat", labelKo: "완전 무시", labelEn: "Total ignore" },
    ],
    answerId: "chips",
    explainKo: "TSMC 의존도가 높은 테크 공급망이 지정학 프리미엄으로 직결.",
    explainEn: "TSMC exposure links geopolitics straight into tech risk.",
  },
  {
    id: "oil-embargo-talk",
    eventKo: "주요국이 러시아 원유 가격 상한·제재를 강화한다고 발표한 직후",
    eventEn: "Right after major powers tightened Russia oil price-cap / sanctions talk",
    questionKo: "단기 유가 반응의 전형은?",
    questionEn: "Typical near-term oil reaction?",
    choices: [
      { id: "up", labelKo: "공급 불확실성으로 상승 압력", labelEn: "Upside from supply uncertainty" },
      { id: "down", labelKo: "항상 폭락", labelEn: "Always crashes" },
      { id: "crypto", labelKo: "비트코인만 움직임", labelEn: "Only Bitcoin moves" },
    ],
    answerId: "up",
    explainKo: "제재 = 공급 경로 재편 비용. 단기엔 가격에 리스크 프리미엄.",
    explainEn: "Sanctions reshuffle barrels — risk premium in the near term.",
  },
];

export const SENSE_QUIZ_COUNT = 5;

export function pickSenseQuizQuestions(count = SENSE_QUIZ_COUNT): SenseQuestion[] {
  return SENSE_QUIZ_BANK.slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(count, SENSE_QUIZ_BANK.length));
}

export function scoreSenseQuiz(correctCount: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((100 * correctCount) / total);
}

/** 퀴즈 점수 → 과시용 등급 (WTI 애널리스트 라벨 재사용) */
export function senseQuizTierFromScore(score: number): AnalystTierId {
  if (score >= 80) return "chief";
  if (score >= 60) return "senior";
  if (score >= 40) return "analyst";
  return "rookie";
}

export function senseQuizTierLabel(score: number, ko: boolean): string {
  return analystTierLabel(senseQuizTierFromScore(score), ko);
}

export function senseQuizHeadline(score: number, ko: boolean): string {
  const tier = senseQuizTierLabel(score, ko);
  return ko
    ? `지정학 감각 ${score}점 · ${tier}`
    : `Geopolitics sense ${score} · ${tier}`;
}
