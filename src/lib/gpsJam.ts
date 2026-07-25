/**
 * GPSJam — 항공기 GPS 이상 보고 기반 재밍 추정 히트맵.
 *
 * 출처: GPSJam.org (John Wiseman) · 데이터 원천 ADS-B Exchange.
 *   하루 1개 CSV. H3 resolution-4 육각형별 정상/이상 항공기 수.
 *   URL: https://gpsjam.org/data/YYYY-MM-DD-h3_4.csv
 *   CSV 헤더: hex,count_good_aircraft,count_bad_aircraft
 *
 * 정확도 원칙:
 *  - 재밍 비율 = bad / (good + bad). 근데 표본이 적으면(항공기 1~2대) 100%도 노이즈.
 *    → 최소 항공기 수(MIN_AIRCRAFT) 이상인 육각형만 신뢰.
 *  - "재밍원·장비"는 표시하지 않는다(기밀). 항공기가 겪은 "이상 보고 비율"만.
 *  - 비공식 소스 → 하루 1회 폴링, 출처 표기, 상업화 시 제작자 문의(README 원칙).
 */

export type GpsJamLevel = "low" | "medium" | "high";

export type GpsJamCell = {
  hex: string; // H3 res-4 인덱스
  ratio: number; // 0~1 재밍 추정 비율
  level: GpsJamLevel;
  total: number; // 관측 항공기 수 (신뢰도)
};

/** 이 미만이면 표본 부족 → 노이즈로 보고 제외 */
export const MIN_AIRCRAFT = 5;

/** GPSJam 공식 색 기준: 0-2% 낮음 / 2-10% 중간 / >10% 높음 */
export function gpsJamLevel(ratio: number): GpsJamLevel {
  if (ratio > 0.1) return "high";
  if (ratio >= 0.02) return "medium";
  return "low";
}

/**
 * CSV 텍스트 → 신뢰할 만한 재밍 셀 목록.
 * 표본 부족(MIN_AIRCRAFT 미만)·재밍 없음(low)은 기본 제외해 페이로드를 줄인다.
 */
export function parseGpsJamCsv(
  csv: string,
  opts?: { minAircraft?: number; includeLow?: boolean },
): GpsJamCell[] {
  const minAircraft = opts?.minAircraft ?? MIN_AIRCRAFT;
  const includeLow = opts?.includeLow ?? false;
  const out: GpsJamCell[] = [];
  const lines = csv.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (i === 0 && /hex/i.test(line)) continue; // 헤더
    const parts = line.split(",");
    if (parts.length < 3) continue;
    const hex = parts[0].trim();
    const good = Number(parts[1]);
    const bad = Number(parts[2]);
    if (!hex || !Number.isFinite(good) || !Number.isFinite(bad)) continue;
    const total = good + bad;
    if (total < minAircraft) continue; // 표본 부족 → 노이즈 제외
    const ratio = total > 0 ? bad / total : 0;
    const level = gpsJamLevel(ratio);
    if (!includeLow && level === "low") continue; // 재밍 거의 없는 셀 제외
    out.push({ hex, ratio, level, total });
  }
  // 강한 재밍 먼저
  out.sort((a, b) => b.ratio - a.ratio);
  return out;
}

/** 다크 배경용 등급 색 */
export function gpsJamColor(level: GpsJamLevel): string {
  switch (level) {
    case "high":
      return "#ef4444"; // red-500
    case "medium":
      return "#f59e0b"; // amber-500
    default:
      return "#22c55e"; // green-500
  }
}

export function gpsJamLevelLabel(level: GpsJamLevel, lang: "ko" | "en"): string {
  const map: Record<GpsJamLevel, { ko: string; en: string }> = {
    high: { ko: "높음 (>10%)", en: "High (>10%)" },
    medium: { ko: "중간 (2–10%)", en: "Medium (2–10%)" },
    low: { ko: "낮음 (<2%)", en: "Low (<2%)" },
  };
  return lang === "en" ? map[level].en : map[level].ko;
}

/** YYYY-MM-DD (UTC). GPSJam은 전일 데이터를 ~04:00 UTC 발행 → 안전하게 어제 사용 */
export function gpsJamDateUtc(daysAgo = 1): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function gpsJamCsvUrl(dateUtc: string): string {
  return `https://gpsjam.org/data/${dateUtc}-h3_4.csv`;
}

export function gpsJamDisclaimer(lang: "ko" | "en"): string {
  return lang === "en"
    ? "Share of aircraft reporting GNSS anomalies per H3 cell (GPSJam / ADS-B Exchange). Jamming sources/equipment are NOT shown. Estimate, updated daily."
    : "H3 셀별 GNSS 이상 보고 항공기 비율(GPSJam / ADS-B Exchange). 재밍원·장비는 표시하지 않습니다. 추정치, 일 1회 갱신.";
}
