/**
 * IMF PortWatch — 초크포인트 일일 통과량(실측) → 물류 스트레스 B급 신호.
 *
 * 출처: IMF PortWatch (IMF + Oxford). 무료·공개 ArcGIS REST.
 *   위성 AIS로 집계한 초크포인트 통과 선박수를 IMF가 가공해 제공 → 우리는 재계산 없이 받아씀.
 *   주간 갱신(화 09:00 ET). "실시간"은 아니나 통과량 추세엔 충분.
 *
 * 스트레스 신호 = 최근 통과량이 기준선(baseline) 대비 얼마나 줄었나.
 *   급감 = 우회·봉쇄·정체 → 물류 스트레스. 증가·정상은 중립.
 *   ※ 절대치가 아니라 "자기 자신의 평소 대비 변화"라 초크포인트 규모차에 안 휘둘림.
 */

/** 앱 초크포인트 ID ↔ PortWatch portid (28개 중 앱이 쓰는 9개) */
export const CHOKE_TO_PORTWATCH: Record<string, string> = {
  "choke-hormuz": "chokepoint6", // Strait of Hormuz
  "choke-suez": "chokepoint1", // Suez Canal
  "choke-bab-el-mandeb": "chokepoint4", // Bab el-Mandeb Strait
  "choke-malacca": "chokepoint5", // Malacca Strait
  "choke-taiwan": "chokepoint11", // Taiwan Strait
  "choke-panama": "chokepoint2", // Panama Canal
  "choke-bosporus": "chokepoint3", // Bosporus Strait
  "choke-gibraltar": "chokepoint8", // Gibraltar Strait
  "choke-good-hope": "chokepoint7", // Cape of Good Hope
};

export const PORTWATCH_CHOKEPOINTS_URL =
  "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query";

export type PortWatchDaily = {
  portid: string;
  date: string; // ISO date
  nTotal: number;
  capacity: number;
};

/** ArcGIS 응답 1건 attributes */
type ArcgisFeature = {
  attributes: {
    portid?: string;
    date?: string | number;
    n_total?: number;
    capacity?: number;
  };
};

/** ArcGIS 응답 파싱 (서버에서 fetch 후 이 함수로 정규화) */
export function parsePortWatchResponse(json: unknown): PortWatchDaily[] {
  const features = (json as { features?: ArcgisFeature[] })?.features;
  if (!Array.isArray(features)) return [];
  const out: PortWatchDaily[] = [];
  for (const f of features) {
    const a = f?.attributes;
    if (!a?.portid) continue;
    const dateIso =
      typeof a.date === "number"
        ? new Date(a.date).toISOString().slice(0, 10)
        : String(a.date ?? "");
    out.push({
      portid: a.portid,
      date: dateIso,
      nTotal: Number(a.n_total ?? 0),
      capacity: Number(a.capacity ?? 0),
    });
  }
  return out;
}

export type ChokeTransitStress = {
  /** 최근 평균 일일 통과량 */
  recentAvg: number;
  /** 기준선(더 긴 창) 평균 */
  baselineAvg: number;
  /** 변화율 % (음수면 감소=스트레스). null이면 데이터 부족 */
  changePct: number | null;
  /** 최근 관측일 */
  latestDate: string | null;
};

/**
 * 한 초크포인트의 통과량 스트레스 계산.
 * recentDays(기본 7일) 평균 vs baselineDays(기본 30일) 평균 비교.
 * @param rows 해당 portid의 일별 데이터 (여러 날)
 */
export function computeTransitStress(
  rows: PortWatchDaily[],
  recentDays = 7,
  baselineDays = 30,
): ChokeTransitStress {
  const sorted = [...rows]
    .filter((r) => Number.isFinite(r.nTotal))
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // 최신 먼저

  if (sorted.length === 0) {
    return { recentAvg: 0, baselineAvg: 0, changePct: null, latestDate: null };
  }

  const recent = sorted.slice(0, recentDays);
  const baseline = sorted.slice(0, baselineDays);
  const avg = (xs: PortWatchDaily[]) =>
    xs.length ? xs.reduce((s, r) => s + r.nTotal, 0) / xs.length : 0;

  const recentAvg = avg(recent);
  const baselineAvg = avg(baseline);
  const changePct =
    baselineAvg > 0 ? ((recentAvg - baselineAvg) / baselineAvg) * 100 : null;

  return {
    recentAvg,
    baselineAvg,
    changePct,
    latestDate: sorted[0]?.date ?? null,
  };
}

/**
 * logisticsStress의 aisObservation 슬롯에 넣을 형태로 변환.
 * PortWatch는 위성 AIS 기반이므로 B급(간접) 신호로 매핑. isDemo=false(실측).
 */
export function toStressObservation(
  stress: ChokeTransitStress,
): { changePct: number; observedAt: string | null; isDemo: false } | null {
  if (stress.changePct == null) return null;
  return {
    changePct: stress.changePct,
    observedAt: stress.latestDate,
    isDemo: false,
  };
}
