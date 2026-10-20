/**
 * 서태평양 함선 이동기 — 관련 뉴스.
 * 1순위: 폴링 중인 USNI·JSO 관측 보고서 링크
 * 2순위: 해군·함정·FONOP 키워드로 걸러진 RSS
 */

import type { NewsStreamItem } from "@/lib/news/types";
import type { PublicShipObservation } from "@/lib/shipMovements/types";

export type WestpacRelatedReport = {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  sourceLabel: string;
  weekStart: string | null;
  publishedAt: string | null;
  vesselHints: string[];
};

const WESTPAC_NAVY_RE =
  /\b(navy|naval|fleet|carrier|destroyer|frigate|submarine|amphib|fonop|csf|7th\s?fleet|pla\(?n\)?|plan\b|jmsdf|rok\s?navy|westpac|indo-?pacific|taiwan\s?strait|south\s?china\s?sea|philippine\s?sea|miyako|senkaku|scarborough|spratly)\b|해군|함대|항공모함|구축함|호위함|잠수함|항모|서태평양|대만해협|남중국해|필리핀해|미야코|센카쿠|FONOP|제7함대|인민해방군\s*해군/i;

function sourceLabelOf(source: PublicShipObservation["source"]): string {
  if (source.startsWith("usni")) return "USNI News";
  if (source === "jso") return "JSO";
  if (source === "cross-strait-signal") return "Cross-Strait";
  return source;
}

/** 관측 타임라인에서 보고서 URL 단위로 묶은 관련 기사 */
export function relatedReportsFromObservations(
  observations: PublicShipObservation[],
): WestpacRelatedReport[] {
  const byUrl = new Map<string, WestpacRelatedReport>();
  for (const obs of observations) {
    const url = (obs.sourceUrl || "").trim();
    if (!url) continue;
    const existing = byUrl.get(url);
    const vessel = [obs.vesselName, obs.hullNumber].filter(Boolean).join(" ").trim();
    if (existing) {
      if (vessel && !existing.vesselHints.includes(vessel)) {
        existing.vesselHints.push(vessel);
      }
      continue;
    }
    byUrl.set(url, {
      id: obs.reportId || url,
      title: obs.title,
      summary: obs.summary,
      url,
      sourceLabel: sourceLabelOf(obs.source),
      weekStart: obs.weekStart,
      publishedAt: obs.observedAt,
      vesselHints: vessel ? [vessel] : [],
    });
  }
  return [...byUrl.values()].sort((a, b) => {
    const da = a.publishedAt || a.weekStart || "";
    const db = b.publishedAt || b.weekStart || "";
    return db.localeCompare(da);
  });
}

/** RSS 풀에서 서태평양 해군·함정 관련만 */
export function filterWestpacRssItems(
  items: NewsStreamItem[],
  limit = 24,
): NewsStreamItem[] {
  const scored = items
    .map((item) => {
      const blob = `${item.title} ${item.summary ?? ""} ${item.source} ${item.publisher ?? ""}`;
      if (!WESTPAC_NAVY_RE.test(blob)) return null;
      const theaterBonus =
        item.theater === "china-taiwan" ||
        item.theater === "southeast-asia" ||
        item.theater === "japan" ||
        item.theater === "korea"
          ? 2
          : item.theater === "global"
            ? 1
            : 0;
      return { item, score: theaterBonus };
    })
    .filter((x): x is { item: NewsStreamItem; score: number } => x != null)
    .sort((a, b) => b.score - a.score || b.item.pubDate.localeCompare(a.item.pubDate));

  const seen = new Set<string>();
  const out: NewsStreamItem[] = [];
  for (const { item } of scored) {
    const key = item.link || item.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
