/**
 * 호외 — 가까운 공식 일정 6건.
 * 날짜는 그 나라 공식 글에 적힌 정밀도만 둔다. 투표일을 만들지 않는다.
 */

export type ExtraScene = "calm" | "alarm" | "waiting" | "recover" | "hit" | "night";

export type ExtraBeat = {
  scene: ExtraScene;
  caption: string;
  tick: string;
  label: string;
  headline: string;
  summary: string;
  stamp: string;
  stampNote?: string;
  url: string;
};

export const EXTRA_BEATS: ExtraBeat[] = [
  {
    scene: "calm",
    caption: "대만 지방공직 선거",
    tick: "11월 28일",
    label: "11월 28일",
    headline: "대만, 다음 공식 일정은 지방선거",
    summary: "중앙선거관리위원회가 알린 투표일은 2026년 11월 28일입니다. 대통령 선거의 날은 아직 공고되지 않았습니다.",
    stamp: "타이베이시 공고",
    stampNote: "중앙선거관리위원회 서한을 인용",
    url: "https://www.gov.taipei/News_Content.aspx?n=D0042A87C2F0270A&s=B7B2EFAD39C3AAA6",
  },
  {
    scene: "alarm",
    caption: "중국 공산당 제21차 당대회",
    tick: "2027년 하반기",
    label: "하반기",
    headline: "중국, 당대회는 2027년 하반기",
    summary: "20기 중앙위원회 5차 전체회의가 베이징에서 2027년 하반기에 열기로 결정했습니다. 개막일은 없습니다.",
    stamp: "중국 정부망",
    url: "https://www.gov.cn/yaowen/liebiao/202610/content_7084510.htm",
  },
  {
    scene: "waiting",
    caption: "호주 연방선거",
    tick: "날짜 미정",
    label: "날짜 미정",
    headline: "호주, 투표일은 아직 없습니다",
    summary: "상원 절반과 하원을 같은 날에 하면 2027년 8월 7일부터 2028년 5월 20일 사이입니다. 그날은 정해지지 않았습니다.",
    stamp: "호주 의회 도서관",
    url: "https://www.aph.gov.au/About_Parliament/Parliamentary_departments/Parliamentary_Library/Research/FlagPost/2025/August/When_is_the_next_federal_election",
  },
  {
    scene: "recover",
    caption: "이란 의회·대통령 선거",
    tick: "2028년",
    label: "날짜 미정",
    headline: "이란, 2028년이라는 말만 있습니다",
    summary: "내무부 정치차관은 현행 일정으로 의회 선거가 2028년 3월, 대통령 선거가 6월이나 7월이라고 말했습니다. 5월에 함께 치르는 안은 아직 법이 아닙니다.",
    stamp: "내무부, 타스님 보도",
    stampNote: "차관의 말. 공고된 투표일이 아님",
    url: "https://www.tasnimnews.ir/en/news/2026/09/19/3700321/iran-mulls-simultaneous-parliamentary-presidential-elections",
  },
  {
    scene: "hit",
    caption: "한국 제23대 국회의원선거",
    tick: "4월 12일",
    label: "4월 12일",
    headline: "한국, 국회의원선거는 2028년 4월 12일",
    summary: "임기 만료에 맞춘 법정 선거일입니다. 중앙선거관리위원회 안내가 그 계산의 근거입니다.",
    stamp: "중앙선거관리위원회",
    url: "https://www.nec.go.kr/site/nec/ex/bbs/View.do?bcIdx=9174&cbIdx=1100",
  },
  {
    scene: "night",
    caption: "우크라이나 대통령 선거",
    tick: "지난 날",
    label: "3월 31일",
    headline: "우크라이나, 그 일요일은 지났습니다",
    summary: "2024년 3월 31일은 임기 다섯째 해 3월의 마지막 일요일입니다. 계엄 중에는 선거를 하지 않아, 새 날짜가 나오기 전까지 이 줄을 둡니다.",
    stamp: "중앙선거관리위원회",
    url: "https://cvk.gov.ua/zmi-pro-tsvk/oleg-didenko-golova-tsentralnoi-viborchoi-komisii-ukraini-zakon-pro-voienniy-stan-peredbachaie-shho-ni-prezidentski-ni-parlamentski-ni-mistsevi-vibori-ne-organizovuyutsya-i-ne-provodyatsya.html",
  },
];

type ExtraCopy = Pick<ExtraBeat, "caption" | "tick" | "label" | "headline" | "summary" | "stamp" | "stampNote">;

const EXTRA_EN: ExtraCopy[] = [
  {
    caption: "Taiwan local elections",
    tick: "28 Nov",
    label: "28 Nov",
    headline: "Taiwan’s next official date is the local elections",
    summary: "The polling day announced by the election commission is 28 November 2026. A presidential polling day has not been announced.",
    stamp: "Taipei City notice",
    stampNote: "Citing the Central Election Commission",
  },
  {
    caption: "21st Congress of the Chinese Communist Party",
    tick: "Second half of 2027",
    label: "H2 2027",
    headline: "China’s party congress is in the second half of 2027",
    summary: "The fifth plenum of the 20th Central Committee decided it will be held in Beijing then. There is no opening day.",
    stamp: "State Council of China",
  },
  {
    caption: "Australian federal election",
    tick: "Day not set",
    label: "Not set",
    headline: "Australia has no polling day yet",
    summary: "A joint half-Senate and House election falls between 7 August 2027 and 20 May 2028. The day itself is not set.",
    stamp: "Parliamentary Library",
  },
  {
    caption: "Iranian parliamentary and presidential elections",
    tick: "2028",
    label: "Not set",
    headline: "Iran has only been told “2028”",
    summary: "The Interior Ministry’s political deputy said the current timetable puts parliament in March 2028 and the presidency in June or July. Holding both in May is not yet law.",
    stamp: "Interior Ministry, via Tasnim",
    stampNote: "A deputy’s remark, not a writ",
  },
  {
    caption: "Korea’s 23rd National Assembly election",
    tick: "12 Apr",
    label: "12 Apr",
    headline: "Korea’s assembly election is 12 April 2028",
    summary: "That is the statutory day tied to the end of the term. The election commission’s notice is the basis for the calculation.",
    stamp: "National Election Commission",
  },
  {
    caption: "Ukrainian presidential election",
    tick: "Passed",
    label: "31 Mar",
    headline: "Ukraine’s Sunday has passed",
    summary: "31 March 2024 was the last Sunday of March in the fifth year of the term. Elections are not held under martial law, so this line stays until a new date is set.",
    stamp: "Central Election Commission",
  },
];

export function extraText(i: number, lang: "ko" | "en"): ExtraBeat {
  const b = EXTRA_BEATS[i]!;
  if (lang !== "en") return b;
  return { ...b, ...EXTRA_EN[i]! };
}
