/**
 * 주요 나라의 헌법. 원문은 공식 사이트에서 연다.
 * 본문은 여기에 두지 않는다.
 * 한 권의 헌법전이 없는 나라는 그 법이 헌법이라고 부르는 문서만 둔다.
 */

export type ConstitutionLink = {
  labelKo: string;
  labelEn: string;
  url: string;
};

export type NationalConstitution = {
  id: string;
  countryKo: string;
  countryEn: string;
  titleKo: string;
  titleEn: string;
  sourceNameKo: string;
  sourceNameEn: string;
  links: readonly ConstitutionLink[];
  noteKo?: string;
  noteEn?: string;
};

export const NATIONAL_CONSTITUTIONS: readonly NationalConstitution[] = [
  {
    id: "tw",
    countryKo: "대만",
    countryEn: "Taiwan",
    titleKo: "중화민국 헌법",
    titleEn: "Constitution of the Republic of China",
    sourceNameKo: "전국법규자료고",
    sourceNameEn: "Laws and Regulations Database",
    links: [
      {
        labelKo: "헌법",
        labelEn: "Constitution",
        url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000001",
      },
      {
        labelKo: "증수조문",
        labelEn: "Additional Articles",
        url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000002",
      },
    ],
  },
  {
    id: "cn",
    countryKo: "중국",
    countryEn: "China",
    titleKo: "중화인민공화국 헌법",
    titleEn: "Constitution of the People's Republic of China",
    sourceNameKo: "중국 정부망",
    sourceNameEn: "State Council of China",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://www.gov.cn/guoqing/2018-03/22/content_5276318.htm",
      },
    ],
  },
  {
    id: "us",
    countryKo: "미국",
    countryEn: "United States",
    titleKo: "미국 헌법",
    titleEn: "Constitution of the United States",
    sourceNameKo: "미국 의회 도서관",
    sourceNameEn: "Library of Congress",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://constitution.congress.gov/constitution/",
      },
    ],
  },
  {
    id: "au",
    countryKo: "호주",
    countryEn: "Australia",
    titleKo: "호주 연방 헌법",
    titleEn: "Commonwealth of Australia Constitution",
    sourceNameKo: "호주 연방 법령 등록부",
    sourceNameEn: "Federal Register of Legislation",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://www.legislation.gov.au/C2004Q00685/latest/text",
      },
    ],
  },
  {
    id: "kr",
    countryKo: "한국",
    countryEn: "Korea",
    titleKo: "대한민국 헌법",
    titleEn: "Constitution of the Republic of Korea",
    sourceNameKo: "국가법령정보센터",
    sourceNameEn: "Korean Law Information Center",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://www.law.go.kr/LSW/lsEfInfoP.do?lsiSeq=61603",
      },
    ],
  },
  {
    id: "tr",
    countryKo: "튀르키예",
    countryEn: "Turkey",
    titleKo: "튀르키예 공화국 헌법",
    titleEn: "Constitution of the Republic of Turkey",
    sourceNameKo: "튀르키예 법령정보시스템",
    sourceNameEn: "Turkish legislation system",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2709&MevzuatTur=1&MevzuatTertip=5",
      },
    ],
  },
  {
    id: "jp",
    countryKo: "일본",
    countryEn: "Japan",
    titleKo: "일본국 헌법",
    titleEn: "Constitution of Japan",
    sourceNameKo: "일본 e-Gov 법령 검색",
    sourceNameEn: "e-Gov law search",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://laws.e-gov.go.jp/law/321CONSTITUTION/",
      },
    ],
  },
  {
    id: "in",
    countryKo: "인도",
    countryEn: "India",
    titleKo: "인도 헌법",
    titleEn: "Constitution of India",
    sourceNameKo: "인도 법무부 법제국",
    sourceNameEn: "Legislative Department of India",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://legislative.gov.in/documents/constitution-of-india/constitution-of-india-AjN2EjMtQWa",
      },
    ],
  },
  {
    id: "ru",
    countryKo: "러시아",
    countryEn: "Russia",
    titleKo: "러시아 연방 헌법",
    titleEn: "Constitution of the Russian Federation",
    sourceNameKo: "크렘린",
    sourceNameEn: "Kremlin",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://www.kremlin.ru/acts/constitution",
      },
    ],
  },
  {
    id: "ua",
    countryKo: "우크라이나",
    countryEn: "Ukraine",
    titleKo: "우크라이나 헌법",
    titleEn: "Constitution of Ukraine",
    sourceNameKo: "우크라이나 최고의회",
    sourceNameEn: "Verkhovna Rada of Ukraine",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://zakon.rada.gov.ua/laws/show/254%D0%BA/96-%D0%B2%D1%80",
      },
    ],
  },
  {
    id: "kp",
    countryKo: "북한",
    countryEn: "North Korea",
    titleKo: "조선민주주의인민공화국 사회주의헌법",
    titleEn: "Socialist Constitution of the DPRK",
    sourceNameKo: "통일부 발표본",
    sourceNameEn: "Text released by the Ministry of Unification",
    noteKo: "북한 공식 사이트에서 전문을 확인하지 못했습니다. 아래는 통일부가 발표한 본문입니다. 2026년 개정은 이 주소에 없습니다.",
    noteEn: "The full text was not confirmed on a DPRK site. This is the text released by the Ministry of Unification. The 2026 revision is not at this address.",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://www.nk-law.kr/law/%EC%A1%B0%EC%84%A0%EB%AF%BC%EC%A3%BC%EC%A3%BC%EC%9D%98%EC%9D%B8%EB%AF%BC%EA%B3%B5%ED%99%94%EA%B5%AD%20%ED%97%8C%EB%B2%95",
      },
    ],
  },
  {
    id: "sa",
    countryKo: "사우디",
    countryEn: "Saudi Arabia",
    titleKo: "사우디아라비아 통치기본법",
    titleEn: "Basic Law of Governance",
    sourceNameKo: "사우디 법령 포털",
    sourceNameEn: "Saudi laws portal",
    noteKo: "기본법 제1조는 꾸란과 순나를 헌법이라고 적습니다. 아래는 그 기본법입니다.",
    noteEn: "Article 1 calls the Quran and the Sunnah the constitution. This link is the Basic Law.",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/16b97fcb-4833-4f66-8531-a9a700f161b6/1",
      },
    ],
  },
  {
    id: "gb",
    countryKo: "영국",
    countryEn: "United Kingdom",
    titleKo: "영국 헌정 법률",
    titleEn: "United Kingdom constitutional statutes",
    sourceNameKo: "영국 법령 사이트",
    sourceNameEn: "legislation.gov.uk",
    noteKo: "단일한 헌법전은 없습니다. 아래는 지금도 효력이 있는 권리장전과 인권법입니다.",
    noteEn: "There is no single written constitution. These are the Bill of Rights and the Human Rights Act, both still in force.",
    links: [
      {
        labelKo: "권리장전",
        labelEn: "Bill of Rights",
        url: "https://www.legislation.gov.uk/aep/WillandMarSess2/1/2",
      },
      {
        labelKo: "인권법",
        labelEn: "Human Rights Act",
        url: "https://www.legislation.gov.uk/ukpga/1998/42",
      },
    ],
  },
  {
    id: "de",
    countryKo: "독일",
    countryEn: "Germany",
    titleKo: "독일연방공화국 기본법",
    titleEn: "Basic Law for the Federal Republic of Germany",
    sourceNameKo: "독일 연방법무부",
    sourceNameEn: "Federal Ministry of Justice",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://www.gesetze-im-internet.de/gg/BJNR000010949.html",
      },
    ],
  },
  {
    id: "fr",
    countryKo: "프랑스",
    countryEn: "France",
    titleKo: "프랑스 헌법",
    titleEn: "Constitution of France",
    sourceNameKo: "프랑스 헌법재판소",
    sourceNameEn: "Constitutional Council",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://www.conseil-constitutionnel.fr/le-bloc-de-constitutionnalite/texte-integral-de-la-constitution-du-4-octobre-1958-en-vigueur",
      },
    ],
  },
  {
    id: "ir",
    countryKo: "이란",
    countryEn: "Iran",
    titleKo: "이란 이슬람공화국 헌법",
    titleEn: "Constitution of the Islamic Republic of Iran",
    sourceNameKo: "이란 수호위원회",
    sourceNameEn: "Guardian Council",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://www.shora-gc.ir/fa/news/1884/%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%A7%D8%B3%D8%A7%D8%B3%DB%8C-%D8%AC%D9%85%D9%87%D9%88%D8%B1%DB%8C-%D8%A7%D8%B3%D9%84%D8%A7%D9%85%DB%8C-%D8%A7%DB%8C%D8%B1%D8%A7%D9%86",
      },
    ],
  },
  {
    id: "il",
    countryKo: "이스라엘",
    countryEn: "Israel",
    titleKo: "이스라엘 기본법",
    titleEn: "Basic Laws of Israel",
    sourceNameKo: "크네세트",
    sourceNameEn: "The Knesset",
    noteKo: "단일한 헌법전은 없습니다. 아래는 크네세트가 모은 기본법입니다.",
    noteEn: "There is no single written constitution. This is the Knesset's collection of Basic Laws.",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://main.knesset.gov.il/Activity/Legislation/documents/knesset_laws.pdf",
      },
    ],
  },
  {
    id: "pk",
    countryKo: "파키스탄",
    countryEn: "Pakistan",
    titleKo: "파키스탄 이슬람공화국 헌법",
    titleEn: "Constitution of the Islamic Republic of Pakistan",
    sourceNameKo: "파키스탄 국민의회",
    sourceNameEn: "National Assembly of Pakistan",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://na.gov.pk/uploads/documents/6926e060076ed_467.pdf",
      },
    ],
  },
  {
    id: "it",
    countryKo: "이탈리아",
    countryEn: "Italy",
    titleKo: "이탈리아 공화국 헌법",
    titleEn: "Constitution of the Italian Republic",
    sourceNameKo: "이탈리아 상원",
    sourceNameEn: "Senate of the Republic",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://www.senato.it/sites/default/files/media-documents/Costituzione_ITALIANO.pdf",
      },
    ],
  },
  {
    id: "ca",
    countryKo: "캐나다",
    countryEn: "Canada",
    titleKo: "캐나다 헌법",
    titleEn: "Constitution of Canada",
    sourceNameKo: "캐나다 법무부",
    sourceNameEn: "Department of Justice",
    links: [
      {
        labelKo: "열기",
        labelEn: "Open",
        url: "https://laws-lois.justice.gc.ca/eng/const/",
      },
    ],
  },
];
