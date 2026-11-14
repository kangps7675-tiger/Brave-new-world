/**
 * SIPRI 무기이전 기록 조회 — 서버 전용.
 *
 * 데이터는 공개 폴더가 아니라 서버 번들에만 둔다(`src/data/sipri/axis-arms.json`).
 * SIPRI 승인 조건(2026-11): 유저가 원본 데이터를 내려받을 수 없어야 한다.
 * 그래서 이 모듈은 클라이언트에서 import하지 않고, API 라우트가 나라 쌍·허브 단위로 잘라서만 내보낸다.
 */
import raw from "@/data/sipri/axis-arms.json";
import type { AxisArmsDeal, AxisArmsPair, AxisArmsPayload } from "@/lib/axisArmsPaths";

const payload = raw as unknown as AxisArmsPayload;

/** 한 번의 응답에 실을 수 있는 최대 건수. 통째 수집을 어렵게 한다. */
export const SIPRI_MAX_DEALS_PER_RESPONSE = 40;

export const SIPRI_SITE_URL = "https://www.sipri.org/databases/armstransfers";

export type SipriRecordResult = {
  pairs: AxisArmsPair[];
  deals: AxisArmsDeal[];
  yearRange: [number, number];
  citation: string;
  url: string;
};

function cap(deals: AxisArmsDeal[]): AxisArmsDeal[] {
  return deals.slice(0, SIPRI_MAX_DEALS_PER_RESPONSE);
}

function shape(pairs: AxisArmsPair[], deals: AxisArmsDeal[]): SipriRecordResult {
  return {
    pairs,
    deals: cap(deals),
    yearRange: payload.yearRange,
    citation: payload.citation,
    url: SIPRI_SITE_URL,
  };
}

/** 허브(CHN·RUS·IRN·PRK) 한 곳이 공급 또는 수령으로 나온 기록. */
export function sipriRecordsForHub(hub: string): SipriRecordResult {
  const h = hub.toUpperCase();
  return shape(
    payload.pairs.filter((p) => p.supplier === h || p.recipient === h),
    payload.deals.filter((d) => d.supplier === h || d.recipient === h),
  );
}

/** 두 나라 사이(양방향)의 기록. */
export function sipriRecordsForPair(a: string, b: string): SipriRecordResult {
  const x = a.toUpperCase();
  const y = b.toUpperCase();
  const match = (s: string, r: string) => (s === x && r === y) || (s === y && r === x);
  return shape(
    payload.pairs.filter((p) => match(p.supplier, p.recipient)),
    payload.deals.filter((d) => match(d.supplier, d.recipient)),
  );
}
