/**
 * URL만 보고 "어느 정부·기구의 공식 사이트인가"를 알아낸다. 나라별 사이트를 하나하나 등록하지 않고도
 * 전 세계 정부 도메인을 공식 출처로 알아보게 하는 규칙이다.
 * 확실하지 않으면 null — 정부가 아닌 사이트를 정부로 오인하느니 모른다고 하는 쪽을 택한다.
 */

/** 정부 도메인에 흔히 쓰이는 두 번째 단계 라벨. 예: gov.uk, go.kr, gouv.fr, gob.mx, govt.nz */
const GOV_LABELS = "gov|gob|gouv|govt|go|gv|gub|gouvernement|government|regeringen";
const GENERIC_GOV = new RegExp(`(?:^|\\.)(?:${GOV_LABELS})\\.([a-z]{2})$`);
const GENERIC_MIL = /(?:^|\.)mil\.([a-z]{2})$/;

/** ccTLD가 ISO 코드와 다른 경우 */
const TLD_TO_ISO: Record<string, string> = { uk: "gb" };

/** 일반 규칙에 안 잡히는 정부·군 도메인 */
const SPECIAL: Array<[RegExp, string]> = [
  [/(?:^|\.)gov$/, "us"],
  [/(?:^|\.)mil$/, "us"],
  [/(?:^|\.)(?:kremlin|government|mid|mil|duma|council)\.ru$/, "ru"],
  [/(?:^|\.)(?:bund|bundesregierung|bundestag|auswaertiges-amt)\.de$/, "de"],
  [/(?:^|\.)(?:gc|canada)\.ca$/, "ca"],
  [/(?:^|\.)(?:elysee|diplomatie\.gouv)\.fr$/, "fr"],
  [/(?:^|\.)(?:mofa|mod|kantei|mext)\.go\.jp$/, "jp"],
  [/(?:^|\.)(?:mod|parliament|royal)\.uk$/, "gb"],
  [/(?:^|\.)(?:mfa|mod|fmprc)\.gov\.cn$/, "cn"],
  [/(?:^|\.)(?:president|mfa)\.gov\.ua$/, "ua"],
  [/(?:^|\.)(?:admin\.ch)$/, "ch"],
  [/(?:^|\.)(?:regjeringen\.no)$/, "no"],
  [/(?:^|\.)(?:government\.se|regeringen\.se)$/, "se"],
  [/(?:^|\.)(?:gov\.pl|premier\.gov\.pl)$/, "pl"],
  [/(?:^|\.)(?:esteri|governo|quirinale|difesa)\.it$/, "it"],
  [/(?:^|\.)(?:mfa|president|leader|irna|mod)\.ir$/, "ir"],
  [/(?:^|\.)(?:gov|mfa|mod)\.il$/, "il"],
  [/(?:^|\.)(?:mofa|mod)\.gov\.sa$/, "sa"],
  [/(?:^|\.)korea\.kr$/, "kr"],
  [/(?:^|\.)(?:pib|mea)\.gov\.in$/, "in"],
];

/** 국제기구·동맹. 나라가 아니라 기구 id로 돌려준다. */
const ORGANIZATIONS: Array<[RegExp, string]> = [
  [/(?:^|\.)nato\.int$/, "nato"],
  [/(?:^|\.)europa\.eu$/, "eu"],
  [/(?:^|\.)un\.org$/, "un"],
  [/(?:^|\.)iaea\.org$/, "iaea"],
];

export type OfficialSite = { issuerId: string; kind: "government" | "military" | "organization" };

export function officialSiteFromHost(host: string): OfficialSite | null {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (!h) return null;
  for (const [re, id] of ORGANIZATIONS) if (re.test(h)) return { issuerId: id, kind: "organization" };
  for (const [re, id] of SPECIAL) if (re.test(h)) return { issuerId: id, kind: /(?:^|\.)mil(?:\.|$)/.test(h) ? "military" : "government" };
  const mil = h.match(GENERIC_MIL);
  if (mil) return { issuerId: TLD_TO_ISO[mil[1]] ?? mil[1], kind: "military" };
  const gov = h.match(GENERIC_GOV);
  if (gov) return { issuerId: TLD_TO_ISO[gov[1]] ?? gov[1], kind: "government" };
  return null;
}

export function officialSiteFromUrl(url: string): OfficialSite | null {
  try {
    return officialSiteFromHost(new URL(url).hostname);
  } catch {
    return null;
  }
}

/** 페이지의 <link rel="alternate">에서 RSS·Atom 피드 주소를 찾는다. 상대 주소는 base로 풀어 준다. */
export function discoverFeeds(html: string, baseUrl: string): Array<{ url: string; title: string }> {
  const out: Array<{ url: string; title: string }> = [];
  const seen = new Set<string>();
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/rel=["']alternate["']/i.test(tag)) continue;
    if (!/type=["']application\/(?:rss|atom)\+xml["']/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    let url: string;
    try {
      url = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title: tag.match(/title=["']([^"']*)["']/i)?.[1]?.trim() ?? "" });
  }
  return out;
}

/** 사이트가 첫 페이지에 피드 링크를 안 달아 둘 때 흔히 쓰는 경로. 점검 스크립트가 차례로 두드려 본다. */
export const COMMON_FEED_PATHS = ["/feed", "/feed/", "/rss", "/rss/", "/rss.xml", "/atom.xml", "/index.xml", "/news/feed", "/en/feed", "/en/rss"];

/**
 * 첫 페이지 자동 발견이 안 되는 사이트에서 시도해 볼 피드 주소 "후보". 확인된 주소가 아니다.
 * 점검(docs:check)이 실제로 읽히는지 가려 주고, 읽히는 것만 --add-feed로 등록한다.
 */
export const FEED_CANDIDATES: Record<string, string[]> = {
  "https://www.state.gov": ["https://www.state.gov/rss-feed/press-releases/feed/", "https://www.state.gov/rss-feed/"],
  "https://www.whitehouse.gov": ["https://www.whitehouse.gov/news/feed/"],
  "https://www.gov.uk": ["https://www.gov.uk/search/news-and-communications.atom"],
  "https://en.kremlin.ru": ["http://en.kremlin.ru/events/president/news/feed"],
  "https://www.mid.ru/en/": ["https://www.mid.ru/en/rss/"],
  "https://www.nato.int": ["https://www.nato.int/cps/rss/en/natohq/rssFeed.xsl/rssFeed.xml"],
  "https://www.consilium.europa.eu": ["https://www.consilium.europa.eu/en/rss/pressreleases.ashx", "https://skribi.consilium.europa.eu/en/rss/pressreleases.ashx"],
  "https://www.defense.gov": ["https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=9&Site=945&max=10", "https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=10"],
  "https://www.diplomatie.gouv.fr/en/": ["https://www.diplomatie.gouv.fr/en/backend-fd.php3"],
  "https://www.auswaertiges-amt.de/en": [
    "https://www.auswaertiges-amt.de/static/includes/rss_en/RSS_Pressemitteilungen_Reden.xml",
    "https://www.auswaertiges-amt.de/static/includes/rss_en/RSS_Aktuelle_Artikel.xml",
  ],
};
