import type { AisVesselRow } from "./env";

/**
 * 초크포인트 "게이트" 정의 — ais.ts의 AISSTREAM_BBOXES와는 다른 목적이다.
 *
 * AISSTREAM_BBOXES: AISStream 구독용, 넓게 잡아서 그 구역의 메시지를 최대한 받는다.
 * 여기 AIS_GATE_ZONES: 통과 판정용, 해협 자체만 좁게 잡아서 "진입/이탈"을 세는 게이트다.
 * 넓게 잡으면 배가 해협 밖 먼바다를 지나가기만 해도 "통과"로 잘못 세게 된다.
 *
 * 카스피해·추크치해·남중국해(스프래틀리)는 여기 없다 — 이유:
 * 이 셋은 "좁은 물길을 지나간다"가 아니라 "넓은 바다에 떠 있다"에 가까워서
 * enter/exit 게이트 모델 자체가 안 맞는다. 통과량이 아니라 밀도·존재로
 * 봐야 하는 지역이라, 나중에 다른 지표(예: 구역 내 척수 스냅샷)로 다뤄야 한다.
 */
export type AisGateZone = {
  id: string;
  /** chokepoints.ts의 slug와 맞춰둔 것 — 화면에서 같은 지명으로 묶기 위함 */
  chokepointSlug: string | null;
  name: { ko: string; en: string };
  /** [[latMin, lngMin], [latMax, lngMax]] */
  bbox: [[number, number], [number, number]];
};

export const AIS_GATE_ZONES: AisGateZone[] = [
  {
    id: "hormuz",
    chokepointSlug: "strait-of-hormuz",
    name: { ko: "호르무즈 해협", en: "Strait of Hormuz" },
    bbox: [[26.3, 56.0], [26.9, 56.6]],
  },
  {
    id: "bab-el-mandeb",
    chokepointSlug: "bab-el-mandeb",
    name: { ko: "바브엘만데브 해협", en: "Bab el-Mandeb" },
    bbox: [[12.3, 43.1], [12.9, 43.6]],
  },
  {
    id: "suez",
    chokepointSlug: "suez-canal",
    name: { ko: "수에즈 운하", en: "Suez Canal" },
    bbox: [[29.9, 32.2], [31.3, 32.6]],
  },
  {
    id: "malacca",
    chokepointSlug: "strait-of-malacca",
    name: { ko: "믈라카 해협", en: "Strait of Malacca" },
    bbox: [[1.0, 100.5], [4.0, 103.5]],
  },
  {
    id: "taiwan-strait",
    chokepointSlug: "taiwan-strait",
    name: { ko: "대만 해협", en: "Taiwan Strait" },
    bbox: [[23.0, 119.0], [25.5, 120.5]],
  },
  {
    id: "bashi-channel",
    chokepointSlug: null,
    name: { ko: "바시 해협 (대만-필리핀)", en: "Bashi Channel" },
    bbox: [[20.0, 121.0], [21.5, 122.5]],
  },
  {
    id: "bosporus",
    chokepointSlug: "turkish-straits",
    name: { ko: "보스포루스 해협", en: "Bosporus" },
    bbox: [[40.95, 28.95], [41.25, 29.15]],
  },
  {
    id: "panama",
    chokepointSlug: "panama-canal",
    name: { ko: "파나마 운하", en: "Panama Canal" },
    bbox: [[8.9, -79.9], [9.4, -79.4]],
  },
  {
    id: "great-belt",
    chokepointSlug: "danish-straits",
    name: { ko: "덴마크 해협 (대벨트)", en: "Danish Straits (Great Belt)" },
    bbox: [[55.1, 10.8], [55.6, 11.2]],
  },
  {
    id: "gulf-of-finland",
    chokepointSlug: null,
    name: { ko: "핀란드만 (상트페테르부르크 관문)", en: "Gulf of Finland" },
    bbox: [[59.3, 24.5], [59.9, 27.0]],
  },
  {
    id: "bering-strait",
    chokepointSlug: null,
    name: { ko: "베링 해협", en: "Bering Strait" },
    bbox: [[65.3, -169.2], [65.9, -168.2]],
  },
];

/** 좌표가 어느 게이트 안에 있는지 — 없으면 null. 첫 매치 우선(겹치는 게이트 없음 가정). */
export function classifyGateZone(lat: number, lng: number): string | null {
  for (const zone of AIS_GATE_ZONES) {
    const [[latMin, lngMin], [latMax, lngMax]] = zone.bbox;
    if (lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax) {
      return zone.id;
    }
  }
  return null;
}

export type ZoneCrossingEvent = {
  zoneId: string;
  direction: "enter" | "exit";
};

/**
 * 순수 판정 로직 — DB/시간 의존 없음, 유닛테스트 대상.
 *
 * hasPrior=false(이 MMSI를 D1에서 처음 봄)면 크로싱을 만들지 않는다 — 안 그러면
 * 신규 선박이 게이트 안에서 "처음 관측"될 때마다 가짜 enter가 찍힌다.
 * 이전 위치와 현재 위치의 게이트가 다르면(멀리 떨어진 두 게이트 사이를 10분 만에
 * "이동"한 것처럼 보이는 경우 포함 — 실제로는 그 사이 샘플링을 놓친 것) exit+enter를
 * 둘 다 기록한다. 이건 실제 항적이 아니라 스냅샷 간격의 한계라는 걸 감안하고 읽어야 한다.
 */
export function detectZoneCrossings(params: {
  hasPrior: boolean;
  prevLat: number | null;
  prevLng: number | null;
  currLat: number;
  currLng: number;
}): ZoneCrossingEvent[] {
  const currZone = classifyGateZone(params.currLat, params.currLng);

  if (!params.hasPrior) {
    return [];
  }

  const prevZone =
    params.prevLat != null && params.prevLng != null
      ? classifyGateZone(params.prevLat, params.prevLng)
      : null;

  if (prevZone === currZone) return [];

  const events: ZoneCrossingEvent[] = [];
  if (prevZone) events.push({ zoneId: prevZone, direction: "exit" });
  if (currZone) events.push({ zoneId: currZone, direction: "enter" });
  return events;
}

export type AisZoneCrossingRow = {
  id: string;
  zone_id: string;
  direction: "enter" | "exit";
  mmsi: string;
  ship_name: string | null;
  category: string;
  ship_type_label: string | null;
  lat: number;
  lng: number;
  sog: number | null;
  cog: number | null;
  detected_at: string;
};

/** vessels 배치 + D1에서 읽어온 이전 위치(prior)를 합쳐 크로싱 행을 만든다. */
export function buildAisZoneCrossings(
  vessels: AisVesselRow[],
  priorPositions: Map<string, { lat: number; lng: number }>,
  now: string = new Date().toISOString(),
): AisZoneCrossingRow[] {
  const rows: AisZoneCrossingRow[] = [];
  for (const v of vessels) {
    const prior = priorPositions.get(v.id);
    const events = detectZoneCrossings({
      hasPrior: prior != null,
      prevLat: prior?.lat ?? null,
      prevLng: prior?.lng ?? null,
      currLat: v.lat,
      currLng: v.lng,
    });
    for (const event of events) {
      rows.push({
        id: crypto.randomUUID(),
        zone_id: event.zoneId,
        direction: event.direction,
        mmsi: v.mmsi,
        ship_name: v.ship_name,
        category: v.category,
        ship_type_label: v.ship_type_label,
        lat: v.lat,
        lng: v.lng,
        sog: v.sog,
        cog: v.cog,
        detected_at: now,
      });
    }
  }
  return rows;
}
