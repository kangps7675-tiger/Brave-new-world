/**
 * 6대 금융 허브 — 지경학 개장 세션 마커용.
 * NYC/London/Singapore/Hong Kong 좌표는 econNav FINANCE_TRADE_GROUP과 동일.
 */

export type FinancialMarketHubId =
  | "ny"
  | "london"
  | "riyadh"
  | "tokyo"
  | "hong-kong"
  | "singapore";

export type FinancialMarketHub = {
  id: FinancialMarketHubId;
  /** 표시명 (ko) */
  labelKo: string;
  labelEn: string;
  lat: number;
  lng: number;
  /** IANA time zone */
  timeZone: string;
  /**
   * 현지 정규장 분(0–1439). 심야 크로스는 overnight=true.
   * 미국: 09:30–16:00 ET / 런던: 08:00–16:30 / 리야드: 10:00–15:00 /
   * 도쿄: 09:00–15:00 / 홍콩·싱가포르: 09:30–16:00
   */
  openMinutes: number;
  closeMinutes: number;
};

export const FINANCIAL_MARKET_HUBS: FinancialMarketHub[] = [
  {
    id: "ny",
    labelKo: "뉴욕",
    labelEn: "New York",
    lat: 40.71,
    lng: -74.0,
    timeZone: "America/New_York",
    openMinutes: 9 * 60 + 30,
    closeMinutes: 16 * 60,
  },
  {
    id: "london",
    labelKo: "런던",
    labelEn: "London",
    lat: 51.5,
    lng: -0.12,
    timeZone: "Europe/London",
    openMinutes: 8 * 60,
    closeMinutes: 16 * 60 + 30,
  },
  {
    id: "riyadh",
    labelKo: "리야드",
    labelEn: "Riyadh",
    lat: 24.71,
    lng: 46.68,
    timeZone: "Asia/Riyadh",
    openMinutes: 10 * 60,
    closeMinutes: 15 * 60,
  },
  {
    id: "tokyo",
    labelKo: "도쿄",
    labelEn: "Tokyo",
    lat: 35.68,
    lng: 139.69,
    timeZone: "Asia/Tokyo",
    openMinutes: 9 * 60,
    closeMinutes: 15 * 60,
  },
  {
    id: "hong-kong",
    labelKo: "홍콩",
    labelEn: "Hong Kong",
    lat: 22.3,
    lng: 114.17,
    timeZone: "Asia/Hong_Kong",
    openMinutes: 9 * 60 + 30,
    closeMinutes: 16 * 60,
  },
  {
    id: "singapore",
    labelKo: "싱가포르",
    labelEn: "Singapore",
    lat: 1.35,
    lng: 103.8,
    timeZone: "Asia/Singapore",
    openMinutes: 9 * 60,
    closeMinutes: 17 * 60,
  },
];
