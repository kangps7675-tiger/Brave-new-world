/**
 * ISO A3 → 1차 해상 초크포인트 id (logisticsRiskPoints).
 * 큐레이션 시드 — 무역 의존 관문 힌트용. 공식 통계 아님.
 */

export const ISO3_PRIMARY_CHOKES: Record<string, string[]> = {
  KOR: ["choke-malacca", "choke-taiwan"],
  JPN: ["choke-malacca", "choke-taiwan"],
  TWN: ["choke-taiwan", "choke-malacca"],
  CHN: ["choke-malacca", "choke-taiwan", "choke-hormuz"],
  SGP: ["choke-malacca"],
  MYS: ["choke-malacca"],
  IDN: ["choke-malacca"],
  IND: ["choke-malacca", "choke-hormuz"],
  AUS: ["choke-malacca"],
  USA: ["choke-panama", "choke-hormuz"],
  CAN: ["choke-panama"],
  MEX: ["choke-panama"],
  BRA: ["choke-panama"],
  GBR: ["choke-gibraltar", "choke-suez"],
  FRA: ["choke-gibraltar", "choke-suez"],
  DEU: ["choke-gibraltar", "choke-suez"],
  ITA: ["choke-gibraltar", "choke-suez"],
  ESP: ["choke-gibraltar", "choke-suez"],
  NLD: ["choke-gibraltar", "choke-suez"],
  BEL: ["choke-gibraltar", "choke-suez"],
  POL: ["choke-gibraltar", "choke-suez"],
  SWE: ["choke-gibraltar"],
  NOR: ["choke-gibraltar"],
  TUR: ["choke-bosporus", "choke-suez"],
  GRC: ["choke-suez", "choke-gibraltar"],
  EGY: ["choke-suez", "choke-bab-el-mandeb"],
  SAU: ["choke-hormuz", "choke-bab-el-mandeb"],
  ARE: ["choke-hormuz"],
  QAT: ["choke-hormuz"],
  KWT: ["choke-hormuz"],
  IRQ: ["choke-hormuz"],
  IRN: ["choke-hormuz"],
  ISR: ["choke-suez", "choke-bab-el-mandeb"],
  ZAF: ["choke-good-hope"],
  RUS: ["choke-bosporus"],
};

export function primaryChokesForIso(iso3: string): string[] {
  return ISO3_PRIMARY_CHOKES[iso3.trim().toUpperCase()] ?? [];
}
