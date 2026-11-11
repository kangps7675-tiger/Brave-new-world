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
