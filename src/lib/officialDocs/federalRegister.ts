import { decodeHtmlEntities } from "@/lib/htmlEntities";
import type { IssuerId } from "@/data/officialDocs";
import { classifyDocKind, weightOf } from "@/lib/officialDocs/classify";
import type { DocCandidate } from "@/lib/officialDocs/feed";

/**
 * 미국 연방관보(federalregister.gov) JSON → 후보.
 * 연방관보는 모든 연방기관(상무부 BIS·재무부 OFAC·국무부·국방부·법무부·국토안보부 등)과 대통령 문서(행정명령·포고문)가
 * 정식으로 공시되는 곳이라, 기관별 RSS를 일일이 찾는 대신 이 한 API로 넓게 덮는다. 키가 필요 없다.
 * 미국 연방정부가 만든 저작물은 일반적으로 저작권이 없다(17 U.S.C. §105). 사이트 자체가 "공식 법률판은 아니다"라고
 * 밝히므로 원문은 항상 링크로 연결한다. 여기서는 제목·링크·초록만 쓴다.
 *
 * 연방관보는 하루 수백 건이라 그대로 두면 속보 근거에 노이즈가 된다. 제재·수출통제·지정학과 맞는 것만 남긴다.
 */

type FrAgency = { name?: string; raw_name?: string; slug?: string };
type FrDoc = {
  title?: string;
  html_url?: string;
  publication_date?: string;
  abstract?: string | null;
  type?: string;
  agencies?: FrAgency[];
};

/** 지정학·제재·수출통제와 닿는 문서만. 제목+초록에서 하나라도 걸리면 남긴다. */
const GEO_RELEVANT =
  /\b(sanction\w*|designat\w+|blocking property|entity list|export (control|administration)\w*|embargo\w*|national emergency|ITAR|arms (export|transfer)|russia\w*|china|chinese|iran\w*|north korea\w*|dprk|ukrain\w+|syria\w*|venezuela\w*|belarus\w*|cuba\w*|taiwan\w*|hong kong|israel\w*|gaza|houthi\w*|red sea|hormuz|hezbollah|hamas|nuclear|missile\w*|military|critical minerals|semiconductor\w*)\b/i;

export function isGeoRelevant(title: string, abstract: string): boolean {
  return GEO_RELEVANT.test(`${title} ${abstract}`);
}

function agencyName(doc: FrDoc): string {
  const first = doc.agencies?.find((a) => a.name || a.raw_name);
  return decodeHtmlEntities(first?.name ?? first?.raw_name ?? "").trim();
}

export function parseFederalRegister(json: unknown, issuerId: IssuerId = "us"): DocCandidate[] {
  const results = (json as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];
  const out: DocCandidate[] = [];
  for (const raw of results as FrDoc[]) {
    const title = decodeHtmlEntities(raw.title ?? "").replace(/\s+/g, " ").trim();
    const url = raw.html_url ?? "";
    if (!title || !/^https:\/\//i.test(url)) continue;
    const abstract = decodeHtmlEntities((raw.abstract ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    const presidential = raw.type === "Presidential Document";
    // 대통령 문서는 전부, 기관 규칙·고시는 지정학과 닿을 때만
    if (!presidential && !isGeoRelevant(title, abstract)) continue;
    let kind = classifyDocKind(title);
    if (kind === "press-release" || kind === "remarks") kind = "statement";
    const day = raw.publication_date && /^\d{4}-\d{2}-\d{2}$/.test(raw.publication_date) ? raw.publication_date : null;
    out.push({ issuerId, title, url, publishedAt: day, kind, weight: weightOf(kind), summary: abstract.slice(0, 280), agency: agencyName(raw) || undefined });
  }
  return out;
}
