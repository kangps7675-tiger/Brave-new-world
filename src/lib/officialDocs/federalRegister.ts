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
 * 연방관보는 하루 수백 건이라 그대로 두면 속보 근거에 노이즈가 된다. 반도체·AI 연산·방산·수출통제·제재·투자심사·핵심광물·
 * 기술 공급망·바이오·양자·주요국 지정학과 맞는 것만 남기고, 맞은 주제를 topics로 붙인다.
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

/**
 * 안보화된 주제들. id는 D1 tags 칸에 "topic:<id>"로 저장돼 나중에 속보와 맞댈 때 쓴다.
 * 제목+초록에서 하나라도 걸리면 "지정학과 닿는 문서"로 보고 남긴다.
 */
const TOPICS: Array<[string, RegExp]> = [
  ["semiconductor", /\b(semiconductor\w*|integrated circuits?|advanced (computing|node)\w*|chip(s|making)?|wafer\w*|lithography|foundr(y|ies)|polysilicon|CHIPS (Act|and Science))\b/i],
  ["ai-compute", /\b(artificial intelligence|AI (model|chip|diffusion)\w*|model weights|data ?center\w*|supercomput\w+|GPU\w*)\b/i],
  ["defense-industry", /\b(defense industrial base|defense article\w*|munitions?|ITAR|international traffic in arms|DFARS|NDAA|arms (export|transfer)\w*|military (end|use)\w*|shipbuilding|hypersonic\w*|missile\w*|nuclear|military)\b/i],
  ["export-control", /\b(export (control|administration)\w*|entity list|EAR\b|license requirement\w*|foreign direct product|end[- ]use)\b/i],
  ["sanctions", /\b(sanction\w*|designat\w+|blocking property|embargo\w*|national emergency|OFAC|specially designated)\b/i],
  ["investment-screening", /\b(CFIUS|outbound investment|covered foreign person|foreign investment|committee on foreign investment)\b/i],
  ["critical-minerals", /\b(critical minerals?|rare earth\w*|lithium|cobalt|graphite|gallium|germanium|antimony|tungsten|permanent magnets?)\b/i],
  ["tech-supply-chain", /\b(foreign adversar\w+|covered list|ICTS|information and communications technology|connected vehicles?|unmanned aircraft\w*|drones?|telecommunications equipment|5G|forced labor|UFLPA|Section 232|Section 301)\b/i],
  ["biotech-quantum", /\b(biotechnolog\w+|biosecurity|quantum|genomic\w*|pharmaceutical supply|active pharmaceutical)\b/i],
  ["geopolitics", /\b(russia\w*|china|chinese|iran\w*|north korea\w*|dprk|ukrain\w+|syria\w*|venezuela\w*|belarus\w*|cuba\w*|taiwan\w*|hong kong|israel\w*|gaza|houthi\w*|red sea|hormuz|hezbollah|hamas)\b/i],
];

export function topicsOf(title: string, abstract: string): string[] {
  const text = `${title} ${abstract}`;
  return TOPICS.filter(([, re]) => re.test(text)).map(([id]) => id);
}

export function isGeoRelevant(title: string, abstract: string): boolean {
  return topicsOf(title, abstract).length > 0;
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
    out.push({ issuerId, title, url, publishedAt: day, kind, weight: weightOf(kind), summary: abstract.slice(0, 280), agency: agencyName(raw) || undefined, topics: topicsOf(title, abstract) });
  }
  return out;
}
