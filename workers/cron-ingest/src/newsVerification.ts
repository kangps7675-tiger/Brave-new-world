/**
 * 구글뉴스(news_stream_items, source="Google News*") 매칭으로 만드는 검증 게이트.
 *
 * 카운트 신호로 쓰지 않는다 — RSS 피드 자체가 상위 N개로 캡돼 있고 우리가 짠 검색어에
 * 갇혀 있어서 "정확히 몇 건"은 신뢰할 수 없다. 대신 "이 전장에 대해 매체 보도가
 * 있었나(있으면 몇 곳이나)"만 확인해서, GDELT·텔레그램 같은 주장 기반(soft) 신호의
 * 신뢰도 계수로 쓴다. FIRMS 같은 하드 센서 신호에는 적용하지 않는다.
 *
 * dailyRanks.ts의 THEATERS id 체계(ukraine, taiwan 등)와 news_stream_items.theater
 * (russia-ukraine, china-taiwan 등, @/lib/news/types NewsTheater)가 서로 다른 태그를
 * 쓰므로 NEWS_THEATER_MAP으로 매핑한다. 매핑이 없는 전장(pacific 등)은 항상 unverified.
 */

export type VerificationLevel = "unverified" | "confirmed" | "strong";

export const VERIFICATION_FACTOR: Record<VerificationLevel, number> = {
  unverified: 0.5,
  confirmed: 1.0,
  strong: 1.2,
};

/** dailyRanks THEATERS id → news_stream_items.theater (NewsTheater) */
export const NEWS_THEATER_MAP: Record<string, string> = {
  ukraine: "russia-ukraine",
  "middle-east": "middle-east",
  taiwan: "china-taiwan",
  korea: "korea",
  atlantic: "atlantic",
  arctic: "arctic",
  // pacific: 대응하는 news_stream 전장 태그 없음 — 항상 unverified 취급
};

/** 검증 확인 시 뉴스 보도 시차를 감안한 룩백 윈도우 */
const VERIFICATION_LOOKBACK_HOURS = 48;

type TheaterVerification = {
  count: number;
  distinctPublishers: number;
  level: VerificationLevel;
};

export async function googleNewsVerificationByTheater(
  db: D1Database,
): Promise<Map<string, TheaterVerification>> {
  const byNewsTheater = new Map<string, { count: number; publishers: Set<string> }>();
  try {
    const sinceIso = new Date(Date.now() - VERIFICATION_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
    const { results } = await db
      .prepare(
        `SELECT theater, publisher, COUNT(*) AS c
         FROM news_stream_items
         WHERE source LIKE 'Google News%'
           AND theater IS NOT NULL AND theater != ''
           AND ingested_at >= ?1
         GROUP BY theater, publisher`,
      )
      .bind(sinceIso)
      .all<{ theater: string; publisher: string | null; c: number }>();
    for (const row of results ?? []) {
      const key = String(row.theater);
      const entry = byNewsTheater.get(key) ?? { count: 0, publishers: new Set<string>() };
      entry.count += Number(row.c) || 0;
      if (row.publisher) entry.publishers.add(row.publisher);
      byNewsTheater.set(key, entry);
    }
  } catch {
    // news_stream_items 비어있거나 없음 — 전부 unverified로 폴백
  }

  const out = new Map<string, TheaterVerification>();
  for (const [theaterId, newsTag] of Object.entries(NEWS_THEATER_MAP)) {
    const hit = byNewsTheater.get(newsTag);
    if (!hit) {
      out.set(theaterId, { count: 0, distinctPublishers: 0, level: "unverified" });
      continue;
    }
    const level: VerificationLevel =
      hit.publishers.size >= 3 ? "strong" : hit.count > 0 ? "confirmed" : "unverified";
    out.set(theaterId, { count: hit.count, distinctPublishers: hit.publishers.size, level });
  }
  return out;
}

export function verificationLevelFor(
  theaterId: string,
  byTheater: Map<string, TheaterVerification>,
): VerificationLevel {
  return byTheater.get(theaterId)?.level ?? "unverified";
}
