/**
 * 일정 목록에 없는 지난 분기점과, 선거 뒤에 확인할 칸.
 * 의석 숫자는 보도마다 다르면 적지 않는다. 그 칸은 공식 주소만 연다.
 */

import { usElectionTuesday } from "@/lib/majorSchedule";

export type CheckKind = "seats" | "constitution" | "leadership" | "law";

export type BranchCheck = {
  id: string;
  kind: CheckKind;
  status: "open" | "cited";
  promptKo: string;
  promptEn: string;
  sourceUrl: string;
  sourceNameKo: string;
  sourceNameEn: string;
  checkedOn: string;
  claimKo?: string;
  claimEn?: string;
};

export type ExtraBranch = {
  id: string;
  countryId: string;
  goalId?: string;
  titleKo: string;
  titleEn: string;
  start: string;
  end?: string;
  precision: "day";
  whenKo: string;
  whenEn: string;
  sourceUrl: string;
  sourceNameKo: string;
  sourceNameEn: string;
  checkedOn: string;
  checks: readonly BranchCheck[];
};

const CHECKED = "2026-11-11";
const US_MIDTERM = usElectionTuesday(2026);

export const EXTRA_BRANCHES: readonly ExtraBranch[] = [
  {
    id: "us-midterm-2026",
    countryId: "us",
    titleKo: "미국 중간선거",
    titleEn: "United States midterm elections",
    start: US_MIDTERM,
    precision: "day",
    whenKo: "2026년 11월 3일. 이 날짜는 지났습니다.",
    whenEn: "3 November 2026. That day has passed.",
    sourceUrl: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title2-section7&num=0&edition=prelim",
    sourceNameKo: "미국 법전 2편 7조",
    sourceNameEn: "2 U.S.C. § 7",
    checkedOn: CHECKED,
    checks: [
      {
        id: "us-midterm-2026-control",
        kind: "leadership",
        status: "cited",
        promptKo: "어느 당이 하원과 상원을 맡는지",
        promptEn: "Which party holds the House and the Senate",
        sourceUrl:
          "https://apnews.com/article/midterm-election-house-senate-democrats-republicans-trump-f126e12e05b579a327b98481c0ae2226",
        sourceNameKo: "AP 통신",
        sourceNameEn: "Associated Press",
        checkedOn: CHECKED,
        claimKo: "AP는 민주당이 하원과 상원을 모두 이겼다고 보도했다. 의석 총수는 보도마다 달라 이 칸에 적지 않는다.",
        claimEn: "AP reported that Democrats won both the House and the Senate. Seat totals differ across reports, so none is written here.",
      },
      {
        id: "us-midterm-2026-seats",
        kind: "seats",
        status: "open",
        promptKo: "인증된 하원 의석수는 하원 사무처에서 확인한다. 그 숫자가 이 칸에 아직 없다.",
        promptEn: "The certified House seat count is checked at the Office of the Clerk. That number is not in this slot yet.",
        sourceUrl: "https://clerk.house.gov/",
        sourceNameKo: "하원 사무처",
        sourceNameEn: "Office of the Clerk",
        checkedOn: CHECKED,
      },
    ],
  },
];

/** 다가오는 일정에 붙는 사후 확인 칸. 결과는 아직 없다. */
export const SCHEDULE_CHECKS: Readonly<Record<string, readonly BranchCheck[]>> = {
  "ua-president-2024": [
    {
      id: "ua-president-2024-law",
      kind: "law",
      status: "cited",
      promptKo: "계엄 중에 선거를 하는지",
      promptEn: "Whether an election is held under martial law",
      sourceUrl:
        "https://cvk.gov.ua/zmi-pro-tsvk/oleg-didenko-golova-tsentralnoi-viborchoi-komisii-ukraini-zakon-pro-voienniy-stan-peredbachaie-shho-ni-prezidentski-ni-parlamentski-ni-mistsevi-vibori-ne-organizovuyutsya-i-ne-provodyatsya.html",
      sourceNameKo: "우크라이나 중앙선거관리위원회",
      sourceNameEn: "Central Election Commission of Ukraine",
      checkedOn: CHECKED,
      claimKo: "중앙선거관리위원회 위원장은, 계엄법이 대통령·의회·지방 선거를 치르지 않는다고 적는다고 말했다. 새 투표일은 이 칸에 없다.",
      claimEn:
        "The head of the Central Election Commission said the martial-law statute provides that presidential, parliamentary, and local elections are not held. A new polling day is not in this slot.",
    },
    {
      id: "ua-president-2024-constitution",
      kind: "constitution",
      status: "open",
      promptKo: "선거를 멈추는 조항이 바뀌었는지는 최고회의 헌법 페이지에서 본다. 바뀐 조문은 이 칸에 아직 없다.",
      promptEn: "Whether the clause that stops elections has changed is checked on the Rada constitution page. An amended article is not in this slot yet.",
      sourceUrl: "https://zakon.rada.gov.ua/laws/show/254%D0%BA/96-%D0%B2%D1%80",
      sourceNameKo: "우크라이나 최고회의",
      sourceNameEn: "Verkhovna Rada",
      checkedOn: CHECKED,
    },
  ],
};

export const SCHEDULE_GOAL: Readonly<Record<string, string>> = {
  "us-general-2028": "us-hemisphere",
  "jp-councillors-2028": "jp-counterstrike",
  "kr-assembly-2028": "kr-tasks",
};
