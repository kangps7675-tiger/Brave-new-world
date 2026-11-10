/**
 * 국가 카드. 공식 문서가 말한 목표만 옮긴다.
 * 본문은 두지 않는다. 문장을 확인하지 못한 나라는 주소만 두고 칸을 비운다.
 */

export type InitiativeBasis = "document" | "speech";

export type InitiativeGoal = {
  id: string;
  saidKo: string;
  saidEn: string;
  docKo: string;
  docEn: string;
  year: string;
  locatorKo: string;
  locatorEn: string;
  url: string;
  readKo?: string;
  readEn?: string;
};

export type CountryInitiative = {
  id: string;
  countryKo: string;
  countryEn: string;
  basis: InitiativeBasis;
  scopeKo: string;
  scopeEn: string;
  /** 나라 이름. 이것만으로는 기사를 카드에 걸지 않는다. */
  name: RegExp;
  /** 문서가 적은 범위. 이 말이 있으면 나라 이름이 없어도 카드에 건다. */
  scope?: RegExp;
  goals: readonly InitiativeGoal[];
  /** 목표 문장을 옮기지 않았을 때, 열어 볼 공식 글. */
  docUrl?: string;
  docNameKo?: string;
  docNameEn?: string;
  noteKo?: string;
  noteEn?: string;
};

export const COUNTRY_INITIATIVES: readonly CountryInitiative[] = [
  {
    id: "us",
    countryKo: "미국",
    countryEn: "United States",
    basis: "document",
    scopeKo: "중동 길목과 서반구",
    scopeEn: "Middle East chokepoints and the Western Hemisphere",
    name: /united states|\bu\.?s\.?\b|\bamerica\b|white house|미국|워싱턴/i,
    scope: /midterm|hormuz|chokepoint|middle east|western hemisphere|중간선거|호르무즈|서반구/i,
    goals: [
      {
        id: "us-chokepoint",
        saidKo:
          "2025년 11월 국가안보전략은, 적대 세력이 중동과 그 석유·가스와 그것이 지나는 길목을 지배하지 못하게 하는 것을 우선 이익으로 적는다.",
        saidEn:
          "The November 2025 National Security Strategy lists, as a priority interest, preventing an adversarial power from dominating the Middle East, its oil and gas, and the chokepoints they pass through.",
        docKo: "국가안보전략",
        docEn: "National Security Strategy",
        year: "2025",
        locatorKo: "우선 이익 목록",
        locatorEn: "priority-interest list",
        url: "https://www.whitehouse.gov/wp-content/uploads/2025/12/2025-National-Security-Strategy.pdf",
        readKo: "이 문장을 지도로 읽으면 호르무즈를 포함한 중동 길목이다. 문서가 해협 이름을 하나씩 적지는 않았다.",
        readEn: "Read onto a map, the sentence covers Middle East chokepoints, including Hormuz. The document does not name each strait.",
      },
      {
        id: "us-hemisphere",
        saidKo:
          "같은 전략은 서반구에서 적대 세력의 침투나 핵심 자산 소유를 막고, 전략 요충에 계속 드나드는 것을 우선 이익으로 적는다.",
        saidEn:
          "The same strategy lists, as a priority interest, a Western Hemisphere free of hostile incursion or ownership of key assets, with continued access to strategic locations.",
        docKo: "국가안보전략",
        docEn: "National Security Strategy",
        year: "2025",
        locatorKo: "우선 이익 목록",
        locatorEn: "priority-interest list",
        url: "https://www.whitehouse.gov/wp-content/uploads/2025/12/2025-National-Security-Strategy.pdf",
      },
    ],
  },
  {
    id: "jp",
    countryKo: "일본",
    countryEn: "Japan",
    basis: "document",
    scopeKo: "인도·태평양, 일본 방위",
    scopeEn: "The Indo-Pacific and the defense of Japan",
    name: /\bjapan\b|\btokyo\b|일본|도쿄/i,
    scope: /indo-pacific|counterstrike|동중국해|인도태평양|반격/i,
    goals: [
      {
        id: "jp-counterstrike",
        saidKo:
          "2022년 12월 16일 각의에서 정한 국가안보전략은, 일본을 지키는 일차 책임은 일본에 있다고 적는다. 같은 문서는 탄도미사일 등을 쓴 무력공격이 있으면, 자위를 위한 최소한의 조치로 상대 영역에 반격할 능력을 갖춘다고 적는다.",
        saidEn:
          "The National Security Strategy adopted by the Cabinet on 16 December 2022 says the primary responsibility for defending Japan lies with Japan. It also says Japan will hold counterstrike capabilities to strike an opponent’s territory, as a minimum necessary measure of self-defense, if an armed attack uses ballistic missiles or similar means.",
        docKo: "국가안전보장전략",
        docEn: "National Security Strategy",
        year: "2022",
        locatorKo: "III.1과 반격 능력 절",
        locatorEn: "section III.1 and the counterstrike section",
        url: "https://www.cas.go.jp/jp/siryou/221216anzenhoshou/nss-e.pdf",
        readKo: "범위는 일본 열도와 그 앞바다, 그리고 문서가 적은 인도·태평양 질서다. 한 도시의 목표가 아니다.",
        readEn: "The scope is the Japanese islands, the water in front of them, and the Indo-Pacific order named in the document. It is not a goal aimed at one city.",
      },
    ],
  },
  {
    id: "kr",
    countryKo: "한국",
    countryEn: "Korea",
    basis: "document",
    scopeKo: "한반도",
    scopeEn: "The Korean Peninsula",
    name: /south korea|\bseoul\b|한국|서울/i,
    goals: [
      {
        id: "kr-tasks",
        saidKo: "청와대 국정과제 페이지의 제목은 ‘국익 중심의 외교안보’다.",
        saidEn: "The title on the presidential national-tasks page is “diplomacy and security centered on the national interest.”",
        docKo: "123대 국정과제",
        docEn: "123 national tasks",
        year: "2025",
        locatorKo: "국정목표 ⑤",
        locatorEn: "national goal 5",
        url: "https://www.president.go.kr/national-tasks/CfpO1qWF",
        readKo: "2023년 국가안보전략 책자는 이전 정부의 문서라 이 칸의 목표로 두지 않는다.",
        readEn: "The 2023 national security strategy booklet belongs to the previous administration, so it is not the goal in this slot.",
      },
    ],
  },
  {
    id: "cn",
    countryKo: "중국",
    countryEn: "China",
    basis: "document",
    scopeKo: "다음 당대회가 문서를 갈아 끼우는 범위",
    scopeEn: "The scope the next party congress can rewrite",
    name: /\bchina\b|\bbeijing\b|중국|베이징/,
    scope: /party congress|당대회/,
    goals: [],
    docUrl: "https://www.gov.cn/xinwen/2022-10/25/content_5721685.htm",
    docNameKo: "제20차 당대회 보고",
    docNameEn: "Report to the 20th Party Congress",
    noteKo: "2022년 보고는 정부망에 있다. 목표 문장은 그 페이지에서 읽고 이 카드에는 옮기지 않았다.",
    noteEn: "The 2022 report is on the government site. The goal sentence stays on that page and is not copied here.",
  },
  {
    id: "ru",
    countryKo: "러시아",
    countryEn: "Russia",
    basis: "document",
    scopeKo: "외교정책 개념이 적는 범위",
    scopeEn: "The scope named in the foreign-policy concept",
    name: /\brussia\b|\bmoscow\b|\bkremlin\b|러시아|모스크바/,
    goals: [],
    docUrl: "http://www.kremlin.ru/acts/news/70811",
    docNameKo: "2023년 3월 31일 외교정책 개념",
    docNameEn: "Foreign Policy Concept approved 31 March 2023",
    noteKo: "승인 문서는 크렘린에 있다. 목표 문장은 그 페이지에서 읽고 이 카드에는 옮기지 않았다.",
    noteEn: "The approving act is on the Kremlin site. The goal sentence stays on that page and is not copied here.",
  },
  {
    id: "tw",
    countryKo: "대만",
    countryEn: "Taiwan",
    basis: "document",
    scopeKo: "지방 공직과 헌법 문서",
    scopeEn: "Local offices and the constitutional texts",
    name: /\btaiwan\b|대만|타이베이/i,
    goals: [],
    docUrl: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000001",
    docNameKo: "중화민국 헌법",
    docNameEn: "Constitution of the Republic of China",
    noteKo: "다음 공식 일정은 지방선거다. 선거가 헌법을 고친다는 뜻은 아니다. 고쳤는지는 사후 칸에서 헌법 주소로 확인한다.",
    noteEn: "The next official date is the local elections. That does not mean the election amends the constitution. A change is checked afterward at the constitution’s address.",
  },
  {
    id: "ua",
    countryKo: "우크라이나",
    countryEn: "Ukraine",
    basis: "speech",
    scopeKo: "계엄 아래의 선거 규정",
    scopeEn: "The election rule under martial law",
    name: /\bukraine\b|\bkyiv\b|\bkiev\b|우크라이/,
    goals: [],
    docUrl: "https://zakon.rada.gov.ua/laws/show/254%D0%BA/96-%D0%B2%D1%80",
    docNameKo: "우크라이나 헌법",
    docNameEn: "Constitution of Ukraine",
    noteKo: "2026년에 새로 낸 국가안보전략 문장은 확인하지 못했다. 이 카드가 확인하는 것은 선거를 멈추는 규정이다.",
    noteEn: "A 2026 national security strategy sentence was not confirmed. What this card checks is the rule that stops elections.",
  },
  {
    id: "au",
    countryKo: "호주",
    countryEn: "Australia",
    basis: "document",
    scopeKo: "국방 전략 문서가 적는 범위",
    scopeEn: "The scope named in the defence strategy",
    name: /\baustralia\b|\bcanberra\b|호주/,
    goals: [],
    docUrl: "https://www.defence.gov.au/about/strategic-planning/2024-national-defence-strategy",
    docNameKo: "2024년 국방전략",
    docNameEn: "2024 National Defence Strategy",
    noteKo: "국방부 페이지에 문서가 있다. 목표 문장은 그 페이지에서 읽고 이 카드에는 옮기지 않았다.",
    noteEn: "The document is on the defence site. The goal sentence stays on that page and is not copied here.",
  },
  {
    id: "in",
    countryKo: "인도",
    countryEn: "India",
    basis: "speech",
    scopeKo: "공개 발언과 결정",
    scopeEn: "Public statements and decisions",
    name: /\bindia\b|\bdelhi\b|인도|뉴델리/,
    goals: [],
    docUrl: "https://www.mea.gov.in/",
    docNameKo: "외무부",
    docNameEn: "Ministry of External Affairs",
    noteKo: "한 권으로 된 공개 국가안보전략을 찾지 못했다. 공식 발언과 결정이 이 주소에 쌓인다.",
    noteEn: "No single public national security strategy was found. Official statements and decisions accumulate at this address.",
  },
  {
    id: "tr",
    countryKo: "튀르키예",
    countryEn: "Turkey",
    basis: "speech",
    scopeKo: "대통령실 발표",
    scopeEn: "Presidency announcements",
    name: /\bturkey\b|\btürkiye\b|\bankara\b|튀르키예|앙카라/,
    goals: [],
    docUrl: "https://www.tccb.gov.tr/",
    docNameKo: "대통령실",
    docNameEn: "Presidency",
    noteKo: "한 권으로 된 공개 국방전략을 찾지 못했다. 공식 발표는 대통령실에서 연다.",
    noteEn: "No single public defense strategy was found. Official announcements open at the presidency.",
  },
  {
    id: "sa",
    countryKo: "사우디",
    countryEn: "Saudi Arabia",
    basis: "speech",
    scopeKo: "비전 2030이 적는 경제 범위",
    scopeEn: "The economic scope named in Vision 2030",
    name: /\bsaudi\b|사우디/,
    goals: [],
    docUrl: "https://www.vision2030.gov.sa/en",
    docNameKo: "비전 2030",
    docNameEn: "Vision 2030",
    noteKo: "공개된 문서는 경제 프로그램이다. 국방 전략 전문은 이 카드에 없다.",
    noteEn: "The public document is an economic program. A defense-strategy text is not on this card.",
  },
  {
    id: "ir",
    countryKo: "이란",
    countryEn: "Iran",
    basis: "speech",
    scopeKo: "다음 선거 일정이 아직 없는 나라",
    scopeEn: "A country whose next polling day is not set",
    name: /\biran\b|\btehran\b|이란|테헤란/,
    goals: [],
    docUrl: "https://www.shora-gc.ir/fa/news/1884/%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%A7%D8%B3%D8%A7%D8%B3%DB%8C-%D8%AC%D9%85%D9%87%D9%88%D8%B1%DB%8C-%D8%A7%D8%B3%D9%84%D8%A7%D9%85%DB%8C-%D8%A7%DB%8C%D8%B1%D8%A7%D9%86",
    docNameKo: "이란 헌법",
    docNameEn: "Constitution of Iran",
    noteKo: "공개된 국가안보전략 문장은 확인하지 못했다. 다음 칸은 아직 날짜가 없는 선거다.",
    noteEn: "A public national security strategy sentence was not confirmed. The next slot is an election that still has no date.",
  },
];

export function initiativeById(id: string): CountryInitiative | null {
  return COUNTRY_INITIATIVES.find((row) => row.id === id) ?? null;
}
