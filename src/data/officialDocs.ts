/**
 * 공식 문서(팩트시트·공동성명·발표문) 원문 스냅샷의 자료 구조와, 문서를 내는 곳(나라·기구) 목록.
 *
 * - 목록(메타)은 `officialDocs.index.json`, 원문 텍스트는 `public/official-docs/<id>.txt`에 둔다.
 *   원문이 번들에 실리지 않게 하려는 것이고, 화면은 열 때만 텍스트를 받는다.
 * - 후보는 `scripts/fetch-official-docs.ts`가 모으고, 필성이 `--approve`로 승인한 것만 목록에 들어간다.
 */
import index from "./officialDocs.index.json";

export type IssuerId =
  | "us" | "cn" | "ru" | "jp" | "kr" | "tw" | "in" | "ir" | "tr" | "ua" | "au"
  | "gb" | "fr" | "de" | "it"
  | "nato" | "eu";

export const ISSUER_IDS: readonly IssuerId[] = [
  "us", "cn", "ru", "jp", "kr", "tw", "in", "ir", "tr", "ua", "au", "gb", "fr", "de", "it", "nato", "eu",
];

export type OfficialFeed = {
  /** 피드 주소. 모르면 null(수동으로만 넣는다). */
  url: string | null;
  label: string;
  /** 실제로 열어 보고 확인했는가. false면 주소가 틀렸을 수 있다. 스크립트가 실패를 그대로 알린다. */
  verified: boolean;
};

export type Issuer = {
  id: IssuerId;
  kind: "country" | "organization";
  nameKo: string;
  nameEn: string;
  feeds: OfficialFeed[];
  /** 이 곳 문서의 이용 조건. 확인 전이면 "확인 전". 문서를 처음 넣을 때 필성이 적는다. */
  terms: string;
};

const UNCHECKED = "확인 전";

function issuer(id: IssuerId, kind: Issuer["kind"], nameKo: string, nameEn: string, feeds: OfficialFeed[] = []): Issuer {
  return { id, kind, nameKo, nameEn, feeds, terms: UNCHECKED };
}

/** 1차 범위: 15개국 + 나토·EU. 피드가 비어 있는 곳은 수동으로 넣는다. */
export const ISSUERS: readonly Issuer[] = [
  issuer("us", "country", "미국", "United States"),
  issuer("cn", "country", "중국", "China"),
  issuer("ru", "country", "러시아", "Russia"),
  issuer("jp", "country", "일본", "Japan"),
  issuer("kr", "country", "한국", "South Korea"),
  issuer("tw", "country", "대만", "Taiwan"),
  issuer("in", "country", "인도", "India"),
  issuer("ir", "country", "이란", "Iran"),
  issuer("tr", "country", "튀르키예", "Türkiye"),
  issuer("ua", "country", "우크라이나", "Ukraine"),
  issuer("au", "country", "호주", "Australia"),
  issuer("gb", "country", "영국", "United Kingdom", [
    { url: "https://www.gov.uk/search/news-and-communications.atom", label: "GOV.UK 뉴스·발표 전체", verified: true },
  ]),
  issuer("fr", "country", "프랑스", "France"),
  issuer("de", "country", "독일", "Germany"),
  issuer("it", "country", "이탈리아", "Italy"),
  issuer("nato", "organization", "나토", "NATO"),
  issuer("eu", "organization", "EU", "European Union", [
    { url: "https://skribi.consilium.europa.eu/en/rss/pressreleases.ashx", label: "EU 이사회 보도자료", verified: false },
  ]),
];

export type DocKind = "factsheet" | "joint-statement" | "readout" | "statement" | "press-release" | "remarks" | "treaty";

/**
 * agreed = 둘 이상이 합의한 문서(공동성명·조약·나토 정상선언). 한쪽이 그렇게 말했다는 뜻이 아니다.
 * unilateral = 한쪽이 낸 발표·팩트시트·회담 요약(당사자 입장).
 * remarks = 개인의 발언·기자회견(그 사람의 말이지 기관의 합의가 아니다).
 */
export type DocWeight = "agreed" | "unilateral" | "remarks";

export type OfficialDocMeta = {
  id: string;
  issuerIds: IssuerId[];
  kind: DocKind;
  weight: DocWeight;
  title: string;
  /** 문서에 적힌 날짜(YYYY-MM-DD) */
  publishedAt: string;
  sourceUrl: string;
  /** 가져온 날짜(YYYY-MM-DD). 원문이 나중에 바뀌었는지 가릴 때 쓴다. */
  fetchedAt: string;
  /** 원문 텍스트의 SHA-256 */
  sha256: string;
  /** 원문 언어(BCP-47) */
  language: string;
  /** 이 문서를 붙일 사건·지역 태그(eventScenarios의 RARE id와 같은 말을 쓴다). */
  relatedTags: string[];
  /** 원문 페이지의 대표 이미지(있을 때만). 권리는 발행 기관에 있다. */
  imageUrl?: string;
  /** 문서에서 가져온 이용 조건 메모 */
  terms: string;
};

export const OFFICIAL_DOCS: readonly OfficialDocMeta[] = index as OfficialDocMeta[];

export function issuerById(id: IssuerId): Issuer | undefined {
  return ISSUERS.find((row) => row.id === id);
}

export function officialDocTextPath(id: string): string {
  return `/official-docs/${id}.txt`;
}
