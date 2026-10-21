/**
 * 호외 섹션에 쓰는 공개 보도 6건.
 * 숫자·날짜는 기사 본문을 직접 열어 확인한 것만 넣었다(2026-10-21 기준).
 * 헤드라인·요약은 Brave New World가 짧게 다시 쓴 문장이고, 기사 문장을 옮겨 싣지 않는다.
 * 보험료율은 기사마다 기준(선가 대비 여부 등)이 달라 단순 비교할 수 없다 — 지면 하단에 밝힌다.
 */
export type ExtraScene = "calm" | "alarm" | "waiting" | "recover" | "hit" | "night";

export type ExtraBeat = {
  /** 지면에 싣는 그림 장면과 캡션(실제 사진이 아니라 편집부 일러스트) */
  scene: ExtraScene;
  caption: string;
  /** x축 짧은 이름 */
  tick: string;
  /** 보험료율(%) 범위. 한 점이면 lo === hi */
  lo: number;
  hi: number;
  /** 차트·헤드라인에 찍는 숫자 글자 */
  label: string;
  /** 숫자가 '약'인지 */
  approx?: boolean;
  headline: string;
  summary: string;
  /** 도장에 찍을 매체·날짜 */
  stamp: string;
  /** 도장 아래 한 줄(보도 성격) */
  stampNote?: string;
  url: string;
};

export const EXTRA_BEATS: ExtraBeat[] = [
  {
    scene: "calm",
    caption: "개전 전, 호르무즈를 지나는 유조선",
    tick: "개전 전",
    lo: 0.25,
    hi: 0.25,
    label: "0.25%",
    approx: true,
    headline: "전쟁 전엔 선가의 0.25% 안팎이었다",
    summary:
      "호르무즈를 지날 때 내는 전쟁위험 보험료는 개전(2월 28일) 전만 해도 선가의 0.25% 수준이었다. 1억 달러짜리 유조선이면 25만 달러쯤이다.",
    stamp: "The National · 7월 17일 보도",
    stampNote: "개전 전 기준을 회고한 숫자",
    url: "https://www.thenationalnews.com/business/2026/07/17/war-risk-shipping-premium-surges-again-as-tensions-escalate-at-strait-of-hormuz/",
  },
  {
    scene: "alarm",
    caption: "수평선 너머로 연기가 오르면 보험료부터 움직인다",
    tick: "3월 15일",
    lo: 1,
    hi: 3,
    label: "1~3%",
    headline: "3월 중순, 1~3%로 뛰었다",
    summary:
      "서울신문 보도. 제목은 '5~10배'라고 달았지만 본문 수치(0.25%에서 1~3%)로 계산하면 약 4~12배다. 이 기사는 선가 대비 비율이라고 밝히지 않았다.",
    stamp: "서울신문 · 3월 15일",
    stampNote: "기사 제목의 배수와 본문 수치가 다름",
    url: "https://www.seoul.co.kr/news/economy/finance/2026/03/15/20260315500052",
  },
  {
    scene: "waiting",
    caption: "보험 효력이 짧아 출항을 미루는 배들",
    tick: "4월 2일",
    lo: 7.5,
    hi: 7.5,
    label: "7.5%",
    approx: true,
    headline: "4월 초 7.5%, 보험 효력은 12~24시간",
    summary:
      "로이드시장협회와 마쉬 관계자 인터뷰. 요율이 워낙 출렁여 보험 유효기간이 12~24시간에 그쳤고, 휴전이 돼도 한동안은 전쟁 전보다 높을 거라고 봤다.",
    stamp: "이투데이 · 4월 2일",
    stampNote: "서면 인터뷰",
    url: "https://www.etoday.co.kr/news/view/2572262",
  },
  {
    scene: "recover",
    caption: "휴전 뒤 다시 움직이기 시작한 배",
    tick: "6월경",
    lo: 2,
    hi: 2,
    label: "2%",
    approx: true,
    headline: "휴전 합의에 2%대로 한숨 돌렸다",
    summary:
      "6월 미국·이란 양해각서(The National은 6월 17일) 뒤 약 2%까지 내렸다고 OpsCon이 전했다. 정확한 날짜는 이 기사에 없다.",
    stamp: "OpsCon · 7월 14일 보도",
    stampNote: "6월 수준을 회고한 숫자",
    url: "https://theopscon.com/intelligence/hormuz-war-risk-cover-five-percent-norm-2026-07-14",
  },
  {
    scene: "hit",
    caption: "피격 소식이 돌면 요율의 기준이 다시 바뀐다",
    tick: "7월 14일",
    lo: 5,
    hi: 5,
    label: "5%",
    approx: true,
    headline: "휴전이 깨지자 5%가 '새 기준'이 됐다",
    summary:
      "7월 13일 UAE 유조선 두 척이 미사일에 맞고 미국이 봉쇄 재개에 나서자 중개인들이 5% 안팎을 새 기준으로 본다고 OpsCon이 전했다. 한때 최고 10%였다는 언급도 있다.",
    stamp: "OpsCon · 7월 14일",
    stampNote: "단독 보도 — 다른 매체 교차 확인 전",
    url: "https://theopscon.com/intelligence/hormuz-war-risk-cover-five-percent-norm-2026-07-14",
  },
  {
    scene: "night",
    caption: "밤에도 요율은 널뛴다",
    tick: "7월 17일",
    lo: 3,
    hi: 10,
    label: "3~10%",
    headline: "3~10%… 마쉬 \"요율이 널뛴다\"",
    summary:
      "마쉬의 마커스 베이커 해상·화물·물류 글로벌 총괄은 7월 중순 요율이 3~10%이고 유가를 따라 변동이 크다고 말했다. 1억 달러 유조선이면 한 번 지나는 데 300만~1,000만 달러다.",
    stamp: "The National · 7월 17일",
    stampNote: "마쉬 인용, 선가 대비 비율",
    url: "https://www.thenationalnews.com/business/2026/07/17/war-risk-shipping-premium-surges-again-as-tensions-escalate-at-strait-of-hormuz/",
  },
];

/** 스크린리더용 한 줄 요약 */
export const EXTRA_CHART_LABEL = `호르무즈 전쟁위험 보험료율 보도 추이: ${EXTRA_BEATS.map(
  (b) => `${b.tick} ${b.approx ? "약 " : ""}${b.label}`,
).join(", ")}`;
