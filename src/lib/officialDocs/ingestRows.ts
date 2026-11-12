import feedsJson from "@/data/officialFeeds.json";
import listPagesJson from "@/data/officialListPages.json";
import { ISSUERS } from "@/data/officialDocs";
import { parseOfficialFeed, worthKeeping, type DocCandidate } from "@/lib/officialDocs/feed";
import { parseFederalRegister } from "@/lib/officialDocs/federalRegister";
import { parseListPage } from "@/lib/officialDocs/listPages";
import { rareTagsOf } from "@/lib/news/eventScenarios";

/**
 * 공식 문서 수집의 순수 부분(워커 환경 타입에 기대지 않는다). 워커(workers/cron-ingest/src/officialDocsIngest.ts)와 테스트가 함께 쓴다.
 * 이 파일이 워커 타입(@cloudflare/workers-types)을 끌어오면 Next 쪽 타입체크에서 fetch().json()이 unknown이 되어 깨진다.
 */

const MAX_NEW_PER_FEED = 60;

/** page = RSS가 없어 목록 페이지를 직접 읽는 곳(listPages.ts) */
export type OfficialDocFeedSource = { issuerId: string; url: string; label: string; page?: boolean; format?: "federal-register" };

export function officialFeedSources(): OfficialDocFeedSource[] {
  const out: OfficialDocFeedSource[] = [];
  const seen = new Set<string>();
  const add = (s: OfficialDocFeedSource) => {
    if (seen.has(s.url)) return;
    seen.add(s.url);
    out.push(s);
  };
  for (const f of feedsJson as OfficialDocFeedSource[]) add(f);
  for (const f of listPagesJson as OfficialDocFeedSource[]) add({ ...f, page: true });
  for (const issuer of ISSUERS) {
    for (const f of issuer.feeds) if (f.url) add({ issuerId: issuer.id, url: f.url, label: f.label });
  }
  return out;
}

export type OfficialDocFeedWriteRow = {
  id: string;
  issuer_id: string;
  kind: string;
  weight: string;
  title: string;
  url: string;
  published_at: string | null;
  summary: string;
  tags: string;
  feed: string;
  agency: string;
};

async function sha1Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20);
}

/** 응답 본문 → 후보. 소스 종류(RSS·목록 페이지·연방관보 JSON)에 맞는 읽기 함수를 고른다. */
export function candidatesOfBody(body: string, source: OfficialDocFeedSource): DocCandidate[] {
  if (source.format === "federal-register") {
    try {
      return parseFederalRegister(JSON.parse(body), source.issuerId);
    } catch {
      return [];
    }
  }
  return source.page ? parseListPage(body, source.url, source.issuerId) : parseOfficialFeed(body, source.issuerId);
}

/** 피드 XML → 저장할 행 (테스트용으로 export) */
export async function rowsFromOfficialFeed(xml: string, source: OfficialDocFeedSource): Promise<OfficialDocFeedWriteRow[]> {
  const rows: OfficialDocFeedWriteRow[] = [];
  const parsed = candidatesOfBody(xml, source);
  const candidates: DocCandidate[] = parsed.filter(worthKeeping);
  for (const c of candidates.slice(0, MAX_NEW_PER_FEED)) {
    rows.push({
      id: await sha1Hex(c.url),
      issuer_id: c.issuerId,
      kind: c.kind,
      weight: c.weight,
      title: c.title.slice(0, 300),
      url: c.url,
      published_at: c.publishedAt,
      summary: c.summary,
      tags: rareTagsOf(`${c.title}. ${c.summary}`).join(","),
      feed: source.label,
      agency: c.agency ?? "",
    });
  }
  return rows;
}

