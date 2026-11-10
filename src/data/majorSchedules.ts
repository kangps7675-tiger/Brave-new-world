/**
 * 국가 중대 일정. 공식 글에 적힌 시기만 둔다.
 * 결과 의석·당선은 그 글을 확인하기 전에는 적지 않는다.
 */

export type MajorScheduleKind = "election" | "congress" | "parliament";

export type MajorSchedulePrecision = "day" | "range" | "half" | "window" | "unfixed";

export type MajorSchedule = {
  id: string;
  countryKo: string;
  countryEn: string;
  kind: MajorScheduleKind;
  titleKo: string;
  titleEn: string;
  /** 기간의 첫날. 하반기는 그 해 7월 1일. */
  start: string;
  /** 기간의 마지막 날. 하루짜리는 생략한다. */
  end?: string;
  precision: MajorSchedulePrecision;
  whenKo: string;
  whenEn: string;
  sourceUrl: string;
  sourceNameKo: string;
  sourceNameEn: string;
  checkedOn: string;
  outcomeKo?: string;
  outcomeEn?: string;
  outcomeUrl?: string;
  /**
   * 날짜가 지나도 목록에 남긴다. 새 공식 날짜로 고치기 전까지.
   * 우크라이나 대통령 선거처럼, 법정의 날이 지났는데 선거가 열리지 않은 경우.
   */
  retainPast?: boolean;
};

export const MAJOR_SCHEDULES: readonly MajorSchedule[] = [
  {
    id: "tw-local-2026",
    countryKo: "대만",
    countryEn: "Taiwan",
    kind: "election",
    titleKo: "대만 지방공직 선거",
    titleEn: "Taiwan local elections",
    start: "2026-11-28",
    precision: "day",
    whenKo: "2026년 11월 28일",
    whenEn: "28 November 2026",
    sourceUrl: "https://www.gov.taipei/News_Content.aspx?n=D0042A87C2F0270A&s=B7B2EFAD39C3AAA6",
    sourceNameKo: "타이베이시가 전한 중앙선거위원회 공고",
    sourceNameEn: "Taipei City notice of the Central Election Commission order",
    checkedOn: "2026-11-11",
  },
  {
    id: "cn-ccp-21",
    countryKo: "중국",
    countryEn: "China",
    kind: "congress",
    titleKo: "중국 공산당 제21차 전국대표대회",
    titleEn: "21st National Congress of the Chinese Communist Party",
    start: "2027-07-01",
    end: "2027-12-31",
    precision: "half",
    whenKo: "2027년 하반기",
    whenEn: "the second half of 2027",
    sourceUrl: "https://www.gov.cn/yaowen/liebiao/202610/content_7084510.htm",
    sourceNameKo: "중국 정부망",
    sourceNameEn: "State Council of China",
    checkedOn: "2026-11-11",
  },
  {
    id: "us-general-2028",
    countryKo: "미국",
    countryEn: "United States",
    kind: "election",
    titleKo: "미국 대통령 선거와 연방의회 선거",
    titleEn: "United States presidential and congressional election",
    start: "2028-11-07",
    precision: "day",
    whenKo: "2028년 11월 7일",
    whenEn: "7 November 2028",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title3-section1&num=0&edition=prelim",
    sourceNameKo: "미국 법전 3편 1조 · 2편 7조",
    sourceNameEn: "3 U.S.C. § 1 and 2 U.S.C. § 7",
    checkedOn: "2026-11-11",
  },
  {
    id: "au-federal",
    countryKo: "호주",
    countryEn: "Australia",
    kind: "election",
    titleKo: "호주 연방선거",
    titleEn: "Australian federal election",
    start: "2027-08-07",
    end: "2028-05-20",
    precision: "window",
    whenKo: "투표일은 아직 정해지지 않았습니다. 상원 절반과 하원을 같은 날에 하면 2027년 8월 7일부터 2028년 5월 20일 사이입니다.",
    whenEn: "The polling day is not set. A joint half-Senate and House election falls between 7 August 2027 and 20 May 2028.",
    sourceUrl:
      "https://www.aph.gov.au/About_Parliament/Parliamentary_departments/Parliamentary_Library/Research/FlagPost/2025/August/When_is_the_next_federal_election",
    sourceNameKo: "호주 의회 도서관",
    sourceNameEn: "Parliamentary Library of Australia",
    checkedOn: "2026-11-11",
  },
  {
    id: "ir-national-2028",
    countryKo: "이란",
    countryEn: "Iran",
    kind: "election",
    titleKo: "이란 의회 선거와 대통령 선거",
    titleEn: "Iranian parliamentary and presidential elections",
    start: "2028-03-01",
    end: "2028-07-31",
    precision: "window",
    whenKo:
      "투표일은 정해지지 않았습니다. 내무부 정치차관은 현행 일정으로 의회 선거가 2028년 3월, 대통령 선거가 2028년 6월이나 7월이라고 말했습니다. 5월에 함께 치르는 안은 아직 법이 아닙니다.",
    whenEn:
      "The polling day is not set. The Interior Ministry's political deputy said the current timetable puts the parliamentary election in March 2028 and the presidential election in June or July 2028. A plan to hold both in May is not yet law.",
    sourceUrl:
      "https://www.tasnimnews.ir/en/news/2026/09/19/3700321/iran-mulls-simultaneous-parliamentary-presidential-elections",
    sourceNameKo: "내무부 정치차관, 타스님 보도",
    sourceNameEn: "Interior Ministry political deputy, via Tasnim",
    checkedOn: "2026-11-11",
  },
  {
    id: "kr-assembly-2028",
    countryKo: "한국",
    countryEn: "South Korea",
    kind: "parliament",
    titleKo: "제23대 국회의원선거",
    titleEn: "23rd National Assembly election",
    start: "2028-04-12",
    precision: "day",
    whenKo: "2028년 4월 12일",
    whenEn: "12 April 2028",
    sourceUrl: "https://www.nec.go.kr/site/nec/ex/bbs/View.do?bcIdx=9174&cbIdx=1100",
    sourceNameKo: "중앙선거관리위원회",
    sourceNameEn: "National Election Commission",
    checkedOn: "2026-11-11",
  },
  {
    id: "tr-general-2028",
    countryKo: "튀르키예",
    countryEn: "Turkey",
    kind: "election",
    titleKo: "튀르키예 대통령 선거와 총선",
    titleEn: "Turkish presidential and parliamentary election",
    start: "2028-05-07",
    precision: "day",
    whenKo: "2028년 5월 7일. 조기 선거를 정하지 않으면 법령상 이 일요일입니다.",
    whenEn: "7 May 2028, the statutory Sunday unless an early election is called.",
    sourceUrl:
      "https://www.aa.com.tr/tr/analiz/genel-secimler-icin-16-nisan-2028-tarihinin-onerilmesi-uzerine-tartisilan-bazi-hususlar/3977383",
    sourceNameKo: "아나돌루 통신의 선거법 해설",
    sourceNameEn: "Anadolu Agency note on the election law",
    checkedOn: "2026-11-11",
  },
  {
    id: "jp-councillors-2028",
    countryKo: "일본",
    countryEn: "Japan",
    kind: "parliament",
    titleKo: "일본 참의원 통상선거",
    titleEn: "Japanese House of Councillors election",
    start: "2028-06-25",
    end: "2028-07-25",
    precision: "window",
    whenKo: "투표일은 아직 정해지지 않았습니다. 2028년 7월 25일 임기 만료 전 30일 안에 합니다.",
    whenEn: "The polling day is not set. It falls within 30 days before the 25 July 2028 term end.",
    sourceUrl: "https://www.city.sayama.saitama.jp/shisei/senkyo/ninki.html",
    sourceNameKo: "사이타마시 임기 만료일 표",
    sourceNameEn: "Sayama City term-expiry table",
    checkedOn: "2026-11-11",
  },
  {
    id: "in-loksabha",
    countryKo: "인도",
    countryEn: "India",
    kind: "parliament",
    titleKo: "인도 하원 총선",
    titleEn: "Indian Lok Sabha election",
    start: "2029-06-23",
    precision: "window",
    whenKo: "투표일은 아직 정해지지 않았습니다. 제18대 하원 임기는 2029년 6월 23일에 끝납니다.",
    whenEn: "The polling day is not set. The 18th Lok Sabha term expires on 23 June 2029.",
    sourceUrl: "https://www.mpa.gov.in/static/uploads/2025/08/4bcd918f55eecc52c7b5ea2dbdb561ac.pdf",
    sourceNameKo: "인도 의회부 임기표",
    sourceNameEn: "Ministry of Parliamentary Affairs term table",
    checkedOn: "2026-11-11",
  },
  {
    id: "jp-representatives",
    countryKo: "일본",
    countryEn: "Japan",
    kind: "parliament",
    titleKo: "일본 중의원 총선거",
    titleEn: "Japanese House of Representatives election",
    start: "2030-02-07",
    precision: "window",
    whenKo: "투표일은 아직 정해지지 않았습니다. 임기는 2030년 2월 7일에 끝나고, 그 전에 해산하면 해산일부터 40일 안에 합니다.",
    whenEn: "The polling day is not set. The term ends on 7 February 2030, or within 40 days of an earlier dissolution.",
    sourceUrl: "https://www.city.sayama.saitama.jp/shisei/senkyo/ninki.html",
    sourceNameKo: "사이타마시 임기 만료일 표",
    sourceNameEn: "Sayama City term-expiry table",
    checkedOn: "2026-11-11",
  },
  {
    id: "ru-president",
    countryKo: "러시아",
    countryEn: "Russia",
    kind: "election",
    titleKo: "러시아 대통령 선거",
    titleEn: "Russian presidential election",
    start: "2030-05-07",
    precision: "unfixed",
    whenKo: "투표일은 아직 정해지지 않았습니다. 연방평의회가 선거 전에 날짜를 정합니다.",
    whenEn: "The polling day is not set. The Federation Council names it before the election.",
    sourceUrl: "https://www.kremlin.ru/acts/constitution",
    sourceNameKo: "러시아 헌법",
    sourceNameEn: "Constitution of Russia",
    checkedOn: "2026-11-11",
  },
  {
    id: "ua-president-2024",
    countryKo: "우크라이나",
    countryEn: "Ukraine",
    kind: "election",
    titleKo: "우크라이나 대통령 선거",
    titleEn: "Ukrainian presidential election",
    start: "2024-03-31",
    precision: "day",
    whenKo: "2024년 3월 31일. 임기 다섯째 해 3월의 마지막 일요일이고, 이 날짜는 지났습니다. 계엄 중에는 선거를 하지 않습니다. 새 날짜가 나오기 전까지 이 줄을 둡니다.",
    whenEn: "31 March 2024, the last Sunday of March in the fifth year of the term. That day has passed. Elections are not held under martial law. This line stays until a new date is set.",
    sourceUrl:
      "https://cvk.gov.ua/zmi-pro-tsvk/oleg-didenko-golova-tsentralnoi-viborchoi-komisii-ukraini-zakon-pro-voienniy-stan-peredbachaie-shho-ni-prezidentski-ni-parlamentski-ni-mistsevi-vibori-ne-organizovuyutsya-i-ne-provodyatsya.html",
    sourceNameKo: "우크라이나 중앙선거관리위원회",
    sourceNameEn: "Central Election Commission of Ukraine",
    checkedOn: "2026-11-11",
    retainPast: true,
  },
];
