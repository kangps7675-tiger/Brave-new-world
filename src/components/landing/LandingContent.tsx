import Link from "next/link";
import type { ReactNode } from "react";
import { LandingGlobe } from "@/components/landing/LandingGlobe";
import {
  AlertScrolly,
  CountUp,
  DecodeText,
  FaqItem,
  HeroBackdrop,
  LiveTicker,
  Reveal,
  SectionDots,
  TiltCard,
} from "@/components/landing/LandingMotion";
import { Grain, Magnetic, MegaMarquee, StraitRail } from "@/components/landing/LandingHip";
import { ExtraEdition } from "@/components/landing/LandingExtra";
import { ShipStrikeScene } from "@/components/landing/ShipStrikeScene";
import { LandingSignup } from "@/components/landing/LandingSignup";

/** 지구본으로 들어가는 버튼 자리. 독립 페이지(/landing)와 첫 화면 막(LandingCurtain)이 서로 다른 버튼을 넣는다. */
export type EnterPlace = "nav" | "hero" | "footer";

/**
 * 랜딩 본문 — 해운업계 한 곳만 겨냥한다(2026-10-20 결정).
 * 피격 경보가 뜬 순간 운항·선적·보험 담당자가 묻는 질문에, 지구본의 무엇이 답하는지를 먼저 보여 준다.
 * 구성(One Page Love식 한 장짜리): 첫 화면 → 경보 하나에 질문 넷 → 경보가 뜨면(반복 데모) → 화면 읽는 법
 * → 누가 쓰나 → 해협별 안내 → 출처·근거 → 자주 묻는 질문 → 마지막 버튼.
 *
 * 움직임은 One Page Love 후보에서 골랐다: DCS AML(천천히 도는 지구본·내비 점·버튼 빛),
 * World Pollution(누를 수 있는 지구본 지점), Flashform(스크롤로 떠오르는 섹션·반복 데모·FAQ 접기).
 */

const SECTIONS = [
  { id: "top", label: "처음" },
  { id: "threat", label: "위협" },
  { id: "ask", label: "질문 넷" },
  { id: "flow", label: "경보가 뜨면" },
  { id: "read", label: "화면 읽는 법" },
  { id: "extra", label: "호외" },
  { id: "breaking", label: "속보" },
  { id: "features", label: "상세 기능" },
  { id: "devices", label: "데스크톱·휴대폰" },
  { id: "who", label: "누가 쓰나" },
  { id: "name", label: "이름의 뜻" },
  { id: "trust", label: "믿을 수 있나" },
  { id: "faq", label: "자주 묻는 질문" },
];

const MONO = "font-[family-name:var(--font-jetbrains-mono)]";
const EYEBROW = "m-0 text-[14px] font-semibold tracking-[0.02em] text-[#5eead4]";
const H2 = "mt-4 mb-0 text-[clamp(30px,3.7vw,50px)] font-extrabold leading-[1.2] tracking-[-0.035em] text-white";
const WRAP = "mx-auto max-w-[1200px] px-6";
const MUTED = "text-[#a3b3bf]";

const QUESTIONS = [
  {
    q: "어느 배가 맞았나?",
    a: "영국 해군 해상무역작전본부(UKMTO)와 미국 국가지리정보국(NGA)의 해상 경보를 지도에 찍고, 그 시각 주변을 지나던 배의 위치 신호(AIS)를 함께 띄웁니다.",
  },
  {
    q: "그 바다는 지금 얼마나 위험한가?",
    a: "최근 공격받은 배, 항구·정유소에 떨어진 드론·미사일, 국제 항행경보(NAVAREA)를 한 화면에 겹쳐 봅니다.",
  },
  {
    q: "전쟁위험 보험료는 얼마나 올랐나?",
    a: "공개 시세가 없는 보험료를 해운·보험 매체 기사에서 찾아 날짜순으로 보여 줍니다. 어느 기사의 어떤 문장에서 나온 숫자인지도 함께 적어요. 해협별 페이지에서 볼 수 있습니다.",
  },
  {
    q: "그대로 지나가도 될까?",
    a: "주변 군함·항공모함과 군용기 움직임, 그 바다에 영향을 주는 군사·외교 속보, 해역 날씨(파고·바람·시정)까지 보고 판단할 수 있게 합니다.",
  },
];

const READ_CARDS: { title: string; body: string; mark: ReactNode }[] = [
  {
    title: "배 — 공격받은 배와 항공모함",
    body: "해상 피습 경보가 난 자리에 배 표시가 뜨고, 주변 배들의 위치 신호도 같이 보입니다. 이름이 붙은 큰 배는 항공모함이에요.",
    mark: (
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="15" fill="none" stroke="#f87171" strokeWidth="1.6" strokeDasharray="3 3" />
        <path d="M10 21 L30 21 L26.5 27 L13.5 27 Z M14.5 21 L14.5 14 L23 14 L25.5 21" fill="#e2e8f0" />
      </svg>
    ),
  },
  {
    title: "불꽃 — 드론·미사일이 떨어진 곳",
    body: "발사나 요격이 아니라 실제로 맞았다고 보도된 곳만 켭니다. 항구, 정유소, 바다 위 유조선처럼 해운과 닿은 타격도 함께 보여요.",
    mark: (
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="22" r="16" fill="#ff6a00" fillOpacity="0.25" />
        <path d="M20 6 C21.6 12 27 16 27 23 C27 28 24 32 20 32 C16 32 13 28 13 23 C13 18.6 16.4 16 17.8 12 C18.6 13.8 19.2 14 19.8 13.2 C20.3 11.2 20 8.6 20 6 Z" fill="#ffb02a" />
        <path d="M20 19 C21 21.4 23 22.8 23 25.6 C23 27.6 21.7 29 20 29 C18.3 29 17 27.6 17 25.6 C17 23.2 19 21.8 20 19 Z" fill="#fff" />
      </svg>
    ),
  },
  {
    title: "붉은 면 — 전쟁 중인 땅",
    body: "우크라이나 점령 지역, 예멘·레바논의 무장세력 통제 구역처럼 해안을 누가 쥐고 있는지 칠합니다. 그 앞바다가 왜 위험한지 바로 보여요.",
    mark: (
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <pattern id="rd-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="#e5484d" fillOpacity="0.3" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="#ff6b6f" strokeWidth="1.6" />
          </pattern>
        </defs>
        <path d="M6 12 C14 6 28 8 34 14 C36 22 30 32 20 33 C10 32 4 22 6 12 Z" fill="url(#rd-hatch)" stroke="#ff6b6f" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: "비행기 — 지금 떠 있는 군용기",
    body: "항공기 위치 신호(ADS-B)로 해협 위를 나는 정찰기·급유기 같은 군용기를 보여 줍니다. 신호를 끈 비행기는 보이지 않아요.",
    mark: (
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <path transform="translate(20 20) rotate(-30)" d="M0 -14 L2.3 -5 L13 1 L13 4.5 L2.3 1.2 L1.8 9 L6 12.5 L6 14.5 L0 13 L-6 14.5 L-6 12.5 L-1.8 9 L-2.3 1.2 L-13 4.5 L-13 1 L-2.3 -5 Z" fill="#e2e8f0" />
      </svg>
    ),
  },
  {
    title: "깜빡이는 점 — 방금 들어온 속보",
    body: "해상·전선 속보가 가리키는 자리입니다. 테두리 색은 출처가 얼마나 탄탄한지를 뜻해요.",
    mark: (
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="14" fill="none" stroke="#2dd4bf" strokeOpacity="0.45" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="5" fill="#2dd4bf" />
      </svg>
    ),
  },
  {
    title: "빛나는 선 — 누가 누구를 돕나",
    body: "이란·러시아처럼 같은 편끼리 무기와 에너지를 주고받는 관계를 곡선으로 잇습니다. 공격하는 쪽이 어디서 힘을 얻는지 보여요.",
    mark: (
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M5 30 C12 8 28 8 35 28" fill="none" stroke="#a78bfa" strokeOpacity="0.4" strokeWidth="5" />
        <path d="M5 30 C12 8 28 8 35 28" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeDasharray="4 3" />
      </svg>
    ),
  },
];

/** 핵심 화면 말고도 들어가 볼 수 있는 기능들. href가 있으면 따로 열리는 페이지다. */
const BREAKING: { tag: string; title: string; body: string }[] = [
  {
    tag: "새 속보",
    title: "중요한 새 속보는 양피지로 펼쳐집니다",
    body: "접속한 뒤에 새로 나온 중요 속보(또는 10분 안에 나온 것)만 한 번씩 띄워요. 같은 속보가 계속 뜨지 않고, 20초 뒤엔 저절로 넘어갑니다. 다른 안내가 떠 있으면 끝날 때까지 기다렸다 나와요.",
  },
  {
    tag: "걸러내기",
    title: "반증이 나온 소문은 띄우지 않습니다",
    body: "속보를 내보내기 전에 최근 72시간 보도와 맞춰 보고, 반대되는 보도가 있으면 발행하지 않아요. 그래도 뉴스 창의 속보 칸에는 「미검증 속보 · 참고용」이라고 붙여 둡니다.",
  },
  {
    tag: "해상 경보",
    title: "배가 공격받으면 \"그 바다로 갈까요?\" 하고 묻습니다",
    body: "영국 해군 해상무역작전본부(UKMTO)에 피습·승선·나포 경보가 새로 올라오거나, 미사일·군사훈련처럼 안전과 직결된 항행 경보가 나오면 물어봐요. 「예」를 누르면 그 해역으로 날아가 브리프를 열고, 근처 선박 항적을 맞춰 본 내용도 함께 보여 줍니다. 접속 때 이미 있던 옛 경보는 띄우지 않아요.",
  },
  {
    tag: "속보함",
    title: "읽은 속보와 안 읽은 속보가 구분됩니다",
    body: "지도 화면의 속보 서랍에 쌓이고, 읽은 건 표시되며 「안 연 속보 N」으로 남은 개수가 보여요. 하나씩 넘겨 볼 땐 「3 / 12」처럼 위치가 나오고, 속보 근처의 송유관·가스관이 잠깐 같이 표시됩니다.",
  },
  {
    tag: "소리",
    title: "가장 급한 것만 소리가 납니다",
    body: "S급 속보에만 짧은 SOS 신호음이 울리고, A급은 소리 없이 배너로만 알려요. 사이렌처럼 계속 울리는 소리는 없습니다.",
  },
  {
    tag: "휴대폰 · 알림",
    title: "휴대폰은 지구본 없이 알림 목록으로",
    body: "작은 화면에서는 전장별로 묶은 알림·속보 목록이 열립니다. 하루 한 번 \"상황이 바뀌었다\"는 푸시를 받을 수 있고, 변화가 없는 날은 보내지 않아요.",
  },
];

const FEATURES: { title: string; body: string; where: string; href?: string }[] = [
  {
    title: "뉴스 창",
    body: "검증된 보도, 전장별 뉴스, 텔레그램 현지 채널을 한 창에서 봅니다. 기사마다 붙은 지도 버튼을 누르면 그 현장으로 바로 날아가요.",
    where: "지구본 아래 「뉴스」 버튼",
  },
  {
    title: "선박 사건 목록",
    body: "해상 피습 경보와 해역 안 선박 속보가 오른쪽에 쌓입니다. 새 사건이 들어오면 큰 창으로 먼저 알려 드려요.",
    where: "지구본 오른쪽",
  },
  {
    title: "전쟁위험 보험료 줄",
    body: "해역별로 기사에 보도된 보험료를 이전 값과 나란히 보여 주고, 어느 매체의 언제 기사인지 함께 적습니다.",
    where: "지구본 오른쪽",
  },
  {
    title: "오늘의 등불",
    body: "6시간마다 지금 꼭 봐야 할 사진 뉴스를 골라 펼쳐 드립니다. 「왜 중요?」를 누르면 그 기사가 바다와 에너지에 왜 중요한지 짧게 풀어 줘요.",
    where: "지구본을 열면 자동으로",
  },
  {
    title: "묻기",
    body: "\"홍해\", \"호르무즈\"처럼 짧게 적으면 관련 표시가 켜지고 지구본이 그 바다로 이동합니다.",
    where: "지구본 위쪽 검색창 옆",
  },
  {
    title: "피격 확인",
    body: "경보가 뜰 때마다 그 시각 주변을 지나던 배의 항적으로 실제 맞은 배의 후보를 좁혀 봅니다.",
    where: "따로 열리는 페이지",
    href: "/strikes",
  },
  {
    title: "기사 확인",
    body: "속보 기사를 붙여 넣으면 장소와 시각을 뽑아, 지도로 확인되는 것과 확인되지 않는 것을 나눠 보여 줍니다.",
    where: "따로 열리는 페이지",
    href: "/investigate",
  },
  {
    title: "하루 한 번 메일",
    body: "새로 공격받은 배와 보도된 보험료를 매일 한 번 메일로 받습니다. 확인 링크를 눌러야 발송이 시작돼요.",
    where: "이 페이지 맨 아래",
  },
  {
    title: "데이터 출처",
    body: "표시마다 어디서 온 자료인지, 얼마나 자주 바뀌는지, 무엇을 알 수 없는지를 정리해 두었습니다.",
    where: "지구본 왼쪽 메뉴",
  },
];

const AUDIENCES = [
  {
    who: "해운사 운항·안전 담당",
    body: "피격 경보가 뜬 직후, 우리 배가 그 해역에 있는지와 계속 지나가도 될지를 판단합니다.",
  },
  {
    who: "중소 해운기업·화주",
    body: "배가 희망봉으로 돌아가거나 출항이 밀리면 선적 일정과 납기가 얼마나 늦어질지 미리 가늠합니다.",
  },
  {
    who: "해상보험 실무자",
    body: "해역별 피격 기록과 보도된 전쟁위험 보험료 흐름을 위험 평가와 요율 판단의 참고 자료로 씁니다.",
  },
];

const STRAITS = [
  { slug: "strait-of-hormuz", name: "호르무즈 해협", en: "STRAIT OF HORMUZ", stat: "세계 원유 소비량의 약 5분의 1", what: "페르시아만 원유·LNG가 바다로 나가는 사실상 유일한 출구." },
  { slug: "bab-el-mandeb", name: "바브엘만데브 해협", en: "BAB EL-MANDEB", stat: "막히면 희망봉 우회, 1~2주 더", what: "홍해와 수에즈 항로의 입구. 후티 공격이 이어지는 바다." },
  { slug: "suez-canal", name: "수에즈 운하", en: "SUEZ CANAL", stat: "아시아↔유럽 가장 짧은 바닷길", what: "홍해 쪽 위험이 그대로 이어지는 운하." },
  { slug: "strait-of-malacca", name: "말라카 해협", en: "STRAIT OF MALACCA", stat: "중동 원유가 동아시아로 오는 길", what: "한국·중국·일본으로 오는 유조선이 지나는 가장 짧은 길." },
  { slug: "taiwan-strait", name: "대만해협", en: "TAIWAN STRAIT", stat: "동아시아 컨테이너선의 길목", what: "첨단 반도체 생산이 몰린 대만을 끼고 있는 바다." },
  { slug: "turkish-straits", name: "튀르키예 해협", en: "BOSPORUS · DARDANELLES", stat: "흑해와 지중해를 잇는 유일한 길", what: "우크라이나·러시아 곡물과 원유가 나가는 통로." },
];

const BADGES = [
  { tag: "탄탄함", cls: "bg-[#0f766e] text-white", body: "여러 종류의 공개 출처가 같은 이야기를 해요. 시간이 없으면 여기부터 보세요." },
  { tag: "교차확인", cls: "bg-[#1d4ed8] text-white", body: "서로 다른 출처가 한쪽으로 맞춰졌어요. 천천히 볼 만해요." },
  { tag: "얇음", cls: "bg-[#a16207] text-white", body: "아직 근거가 적어요. 단서로만 보고 사실처럼 믿지는 마세요." },
  { tag: "모으는 중", cls: "border border-dashed border-[#a3b3bf] text-[#d7e0e6]", body: "확인할 자료를 아직 모으고 있어요." },
];

const SOURCES = [
  ["UKMTO", "영국 해군 해상 피습 경보"],
  ["NGA", "미국 국가지리정보국 해상 경보"],
  ["NAVAREA", "국제 항행경보"],
  ["AIS", "선박 위치 신호"],
  ["ADS-B", "항공기 위치 신호"],
  ["NASA FIRMS", "위성 화재·열 감지"],
  ["Liveuamap", "전선 속보·점령 지역"],
  ["해운·보험 매체", "전쟁위험 보험료 보도"],
];

const FAQ = [
  {
    q: "돈을 내야 하나요?",
    a: "지금은 베타 기간이라 가입 없이 바로 볼 수 있습니다. 정식 출시 후에는 알림·해역 판단 같은 일부 기능이 유료가 될 예정이며, 시작 전에 미리 알려 드립니다.",
  },
  {
    q: "정말 정보기관 자료를 쓰나요?",
    a: "아니요. 비밀 자료는 하나도 없습니다. 해군 경보, 배와 비행기의 위치 신호, 위성 화재 감지, 언론 보도처럼 누구나 볼 수 있는 공개 정보를 모아 서로 맞춰 보여 줍니다. 정부·정보기관과도 관계가 없습니다.",
  },
  {
    q: "얼마나 자주 새로 바뀌나요?",
    a: "출처마다 다릅니다. 배·비행기 위치와 전선 속보는 몇 분 단위로, 해상 경보와 보험료 보도는 새 소식이 나올 때마다 반영됩니다.",
  },
  {
    q: "우리 배가 지도에 안 보여요.",
    a: "배가 위치 신호(AIS)를 끄거나, 그 바다에 신호를 받는 곳이 없으면 보이지 않습니다. 그 구간은 '배가 없었다'가 아니라 '자료가 없다'로 봐 주세요.",
  },
];

export function LandingContent({ renderEnter }: { renderEnter: (place: EnterPlace) => ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] w-full bg-[#05080d] text-[#e6edf2] font-[family-name:var(--font-pretendard),system-ui,sans-serif]"
      style={{ wordBreak: "keep-all" }}
    >
      {/* NAV */}
      <header className="border-b border-white/10">
        <nav aria-label="주 메뉴" className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-[18px]`}>
          <a href="#top" className="flex items-center gap-2.5 text-white no-underline">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <circle cx="14" cy="14" r="12" fill="none" stroke="#5eead4" strokeWidth="2" />
              <circle cx="14" cy="14" r="6" fill="none" stroke="#5eead4" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="14" cy="14" r="2" fill="#f5c451" />
            </svg>
            <span className="text-lg font-bold tracking-[-0.01em]">Brave New World</span>
          </a>
          <div className="flex flex-wrap items-center gap-6 text-[15px]">
            <a href="#ask" className="hidden text-[#c9d5dd] no-underline hover:text-white md:inline">무엇을 알려 주나</a>
            <a href="#who" className="hidden text-[#c9d5dd] no-underline hover:text-white md:inline">누가 쓰나</a>
            <a href="#trust" className="hidden text-[#c9d5dd] no-underline hover:text-white md:inline">믿을 수 있나</a>
            {renderEnter("nav")}
          </div>
        </nav>
      </header>

      <SectionDots sections={SECTIONS} />
      <Grain />

      {/* HERO */}
      <section id="top" className="relative overflow-hidden">
        <HeroBackdrop />
        <div className={`${WRAP} relative flex flex-wrap items-center gap-x-12 gap-y-10 pb-20 pt-14`}>
        <div className="min-w-0 flex-[1.1_1_480px]">
          <p className={EYEBROW}>해운 위험 상황실 · 홍해 · 호르무즈 · 흑해 · 말라카</p>
          <h1 className="mb-0 mt-5 text-[clamp(38px,4.6vw,64px)] font-bold leading-[1.14] tracking-[-0.035em] text-white">
            <DecodeText text="정보기관 상황실처럼," />
            <br className="hidden sm:block" />{" "}
            <span className="landing-glitch is-live text-[#f5c451]" data-text="바다의 위험을 한눈에.">
              <DecodeText text="바다의 위험을 한눈에." delay={350} />
            </span>
          </h1>
          <p className={`mt-6 max-w-[560px] text-[19px] leading-[1.75] ${MUTED}`}>
            어느 배가 맞았는지, 그 바다가 지금 얼마나 위험한지, 전쟁위험 보험료는 얼마나 올랐는지.
            피격 경보가 뜰 때 운항 담당자가 한꺼번에 찾던 답을 3D 지구본 한 화면에 모았습니다.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Magnetic>{renderEnter("hero")}</Magnetic>
            <a
              href="#read"
              className="inline-flex h-[54px] items-center rounded-md border border-white/25 px-6 text-base font-semibold text-white no-underline hover:border-white/60"
            >
              화면 읽는 법 먼저 보기
            </a>
          </div>
          <p className={`mt-4 text-sm ${MUTED}`}>베타 기간에는 가입 없이 바로 볼 수 있어요.</p>
        </div>

        <div className="min-w-0 flex-[1_1_440px]">
          <LandingGlobe />
        </div>
        </div>
      </section>

      <LiveTicker />

      {/* THREAT — 상선을 때리는 것들 (연출) */}
      <section id="threat" className={`${WRAP} pb-6 pt-20`}>
        <Reveal>
          <p className={EYEBROW}>바다에서 지금 벌어지는 일</p>
          <h2 className={`${H2} max-w-[900px]`}>상선은 드론, 미사일, 기뢰에 맞고 있습니다.</h2>
        </Reveal>
        <div className="mt-10">
          <ShipStrikeScene />
        </div>
      </section>

      {/* STATS — 숫자로 보는 범위 */}
      <section className={`${WRAP} grid gap-px py-14 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]`}>
        {[
          { n: 6, s: "곳", label: "지켜보는 해운 길목" },
          { n: 8, s: "종", label: "서로 맞춰 보는 공개 출처" },
          { n: 6, s: "시간", label: "마다 새로 고르는 사진 뉴스" },
          { n: 9, s: "개", label: "핵심 화면 밖 상세 기능" },
        ].map((x) => (
          <div key={x.label} className="px-2 py-4 sm:px-6">
            <div className="text-[clamp(40px,4.4vw,58px)] font-bold leading-none tracking-[-0.03em] text-white">
              <CountUp to={x.n} />
              <span className="ml-1 text-[0.45em] font-semibold text-[#f5c451]">{x.s}</span>
            </div>
            <div className={`mt-2 text-[15px] ${MUTED}`}>{x.label}</div>
          </div>
        ))}
      </section>

      <MegaMarquee />

      {/* ASK — 경보 하나에 질문 넷 */}
      <section id="ask" className="border-y border-white/10 bg-[#081019]">
        <div className={`${WRAP} py-24`}>
          <p className={EYEBROW}>경보 하나에 질문 넷</p>
          <h2 className={`${H2} max-w-[1080px]`}>
            대형 선사는 비싼 해사 정보 서비스로 답을 얻습니다.
            <br className="hidden md:block" /> 이제 뉴스 창 열 개 대신 지구본 하나면 됩니다.
          </h2>
          <div className="mt-12 grid gap-px border border-white/10 bg-white/10 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {QUESTIONS.map((x, i) => (
              <Reveal key={x.q} delay={i * 90} className="bg-[#081019] p-7">
                <div className={`text-sm text-[#f5c451] ${MONO}`}>{String(i + 1).padStart(2, "0")}</div>
                <h3 className="mb-0 mt-3 text-xl font-bold leading-snug text-white">{x.q}</h3>
                <p className={`mb-0 mt-3 text-[15px] leading-[1.75] ${MUTED}`}>{x.a}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FLOW — 경보가 뜨면 (스크롤로 넘기는 데모) */}
      <section id="flow" className={`${WRAP} pb-4 pt-24`}>
        <Reveal>
          <p className={EYEBROW}>경보가 뜨면</p>
          <h2 className={`${H2} max-w-[820px]`}>피격 경보 한 건이 지구본에서 어떻게 펼쳐지는지, 내려 가며 보세요.</h2>
        </Reveal>
        <div className="mt-16">
          <AlertScrolly />
        </div>
      </section>

      {/* READ — 화면 읽는 법 */}
      <section id="read" className={`${WRAP} pb-20 pt-24`}>
        <p className={EYEBROW}>화면 읽는 법</p>
        <h2 className={`${H2} max-w-[780px]`}>
          반짝이는 데는 다 이유가 있어요.
          <br />
          색과 모양만 알면 30초 만에 읽힙니다.
        </h2>
        <div className="mt-12 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          {READ_CARDS.map((c, i) => (
            <Reveal key={c.title} delay={(i % 3) * 90}>
              <TiltCard className="flex h-full gap-4 rounded-xl border border-white/10 bg-[#0a141f] p-6">
                <div className="flex-none">{c.mark}</div>
                <div className="min-w-0">
                  <h3 className="m-0 text-[18px] font-bold leading-snug text-white">{c.title}</h3>
                  <p className={`mb-0 mt-2 text-[15px] leading-[1.7] ${MUTED}`}>{c.body}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
        <p className={`mt-8 text-[15px] leading-relaxed ${MUTED}`}>
          지구본 위 무엇이든 누르면 설명 창이 열립니다. 위쪽 「묻기」에 &quot;홍해&quot;, &quot;호르무즈&quot;처럼 적으면 그 바다로 날아가요.
        </p>
      </section>

      {/* EXTRA — 호외: 공개 보도로 본 보험료 */}
      <ExtraEdition />

      {/* BREAKING — 속보 기능 설명 */}
      <section id="breaking" className="border-t border-white/10 bg-[#0b0f14]">
        <div className={`${WRAP} py-24`}>
          <Reveal>
            <p className={EYEBROW}>속보 기능</p>
            <h2 className={`${H2} max-w-[820px]`}>속보는 이렇게 알려 드립니다.</h2>
            <p className={`mt-5 mb-0 max-w-[720px] text-[17px] leading-[1.75] ${MUTED}`}>
              속보가 많을수록 정말 급한 것이 묻히기 쉬워요. 그래서 많이 띄우기보다, 한 번만 · 근거와 함께 · 급한 것만 알리는 쪽으로 만들었습니다.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
            {BREAKING.map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 80}>
                <TiltCard className="h-full rounded-xl">
                  <div className="h-full rounded-xl border border-white/10 bg-[#0a141f] p-6">
                    <span className="block text-caption font-semibold text-[#f5c451]">{b.tag}</span>
                    <h3 className="mb-0 mt-2 text-[19px] font-bold leading-snug text-white">{b.title}</h3>
                    <p className={`mb-0 mt-2 text-[15px] leading-[1.7] ${MUTED}`}>{b.body}</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className={`mt-8 mb-0 max-w-[820px] rounded-xl border border-white/10 bg-white/[0.03] p-5 text-[15px] leading-[1.7] ${MUTED}`}>
              <strong className="text-white">아직 없는 것.</strong> 속보 하나하나를 휴대폰으로 즉시 보내 주는 푸시는 아직 없습니다. 지금은 하루 한 번의 상황 변화 푸시와 하루 한 번의 메일이 전부예요. 화면에 안 보이는 속보가 있으면 「N건 더 있음」으로 표시해, 조용하다고 안전한 것으로 오해하지 않게 합니다.
            </p>
          </Reveal>
        </div>
      </section>

      {/* FEATURES — 상세 기능 */}
      <section id="features" className="border-t border-white/10 bg-[#081019]">
        <div className={`${WRAP} py-24`}>
          <Reveal>
            <p className={EYEBROW}>상세 기능</p>
            <h2 className={`${H2} max-w-[820px]`}>핵심 화면 말고도, 이런 기능이 있어요.</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {FEATURES.map((f, i) => {
              const inner = (
                <>
                  <span className="block text-caption font-semibold text-[#5eead4]">{f.where}</span>
                  <span className="mt-2 flex items-center justify-between gap-2 text-[19px] font-bold text-white">
                    {f.title}
                    {f.href ? <span aria-hidden="true" className="text-[#5eead4]">→</span> : null}
                  </span>
                  <span className={`mt-2 block text-[15px] leading-[1.7] ${MUTED}`}>{f.body}</span>
                </>
              );
              return (
                <Reveal key={f.title} delay={(i % 3) * 80}>
                  <TiltCard className="h-full rounded-xl">
                  {f.href ? (
                    <Link
                      href={f.href}
                      className="block h-full rounded-xl border border-white/10 bg-[#0a141f] p-6 no-underline hover:border-[#5eead4]/60"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="h-full rounded-xl border border-white/10 bg-[#0a141f] p-6">{inner}</div>
                  )}
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* DEVICES — 데스크톱은 상황실, 휴대폰은 알림창 */}
      <section id="devices" className={`${WRAP} py-24`}>
        <Reveal>
          <p className={EYEBROW}>데스크톱 · 휴대폰</p>
          <h2 className={`${H2} max-w-[820px]`}>
            상황실은 데스크톱에서,
            <br className="hidden md:block" /> 휴대폰은 주머니 속 알림창으로.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))]">
          <Reveal className="rounded-xl border border-[#f5c451]/35 bg-[#0a141f] p-7">
            <svg width="64" height="48" viewBox="0 0 64 48" aria-hidden="true" fill="none" stroke="#f5c451" strokeWidth="1.8">
              <rect x="4" y="4" width="56" height="32" rx="3" />
              <circle cx="32" cy="20" r="9" stroke="#5eead4" />
              <path d="M24 44 H40 M32 36 V44" />
            </svg>
            <h3 className="mb-0 mt-5 text-[21px] font-bold text-white">데스크톱 — 주로 쓰는 상황실</h3>
            <ul className={`mb-0 mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-[1.7] ${MUTED}`}>
              <li>3D 지구본 위에 배·비행기·불꽃·경보를 모두 겹쳐 봅니다.</li>
              <li>선박 사건 목록, 보험료 줄, 뉴스 창을 옆에 띄워 두고 함께 봅니다.</li>
              <li>넓은 화면에서 해역 하나를 끝까지 따라가며 판단하는 데 맞춰져 있어요.</li>
            </ul>
          </Reveal>
          <Reveal delay={90} className="rounded-xl border border-white/10 bg-[#0a141f] p-7">
            <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="#5eead4" strokeWidth="1.8">
              <rect x="13" y="3" width="22" height="42" rx="4" />
              <path d="M20 39 H28" />
              <path d="M31 8 C35 9 38 12 39 16" stroke="#f5c451" />
              <circle cx="31" cy="12" r="3" fill="#f5c451" stroke="none" />
            </svg>
            <h3 className="mb-0 mt-5 text-[21px] font-bold text-white">휴대폰 — 보조 알림창</h3>
            <ul className={`mb-0 mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-[1.7] ${MUTED}`}>
              <li>무거운 3D 지구본 대신 속보·경보를 글 목록으로 가볍게 봅니다.</li>
              <li>알림을 허용하면 새 소식을 푸시로 받을 수 있어요.</li>
              <li>홈 화면에 추가하면 앱처럼 바로 열립니다. 자세히 볼 일은 데스크톱에서 이어서 보세요.</li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* WHO — 누가 쓰나 */}
      <section id="who" className="bg-[#081019]">
        <div className={`${WRAP} py-24`}>
          <p className={EYEBROW}>누가 쓰나</p>
          <h2 className={`${H2} max-w-[820px]`}>
            그대로 지나갈지, 희망봉으로 돌아갈지,
            <br className="hidden md:block" /> 출항을 미룰지 정해야 하는 분들께
          </h2>
          <div className="mt-12 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {AUDIENCES.map((a, i) => (
              <Reveal key={a.who} delay={i * 90} className="rounded-xl border border-white/10 bg-[#0a141f] px-7 py-8">
                <h3 className="m-0 text-[21px] font-bold text-white">{a.who}</h3>
                <p className={`mb-0 mt-3 text-base leading-[1.75] ${MUTED}`}>{a.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* STRAITS — 세로 스크롤을 가로로 넘기는 해협 카드 */}
      <section className="pt-16">
        <StraitRail
          cards={STRAITS}
          heading={
            <>
              <p className={EYEBROW}>해협별로 보기</p>
              <h2 className={`${H2} max-w-[820px]`}>배가 꼭 지나야 하는 길목, 하나씩 넘겨 보세요.</h2>
            </>
          }
        />
      </section>

      {/* NAME — 왜 '멋진 신세계'인가 */}
      <section id="name" className="border-y border-white/10 bg-[#081019]">
        <div className={`${WRAP} flex flex-wrap items-start gap-x-16 gap-y-8 py-24`}>
          <Reveal className="min-w-0 flex-[1_1_360px]">
            <p className={EYEBROW}>이름의 뜻</p>
            <h2 className={H2}>
              왜 &lsquo;멋진 신세계&rsquo;인가요?
            </h2>
            <p className={`mt-4 text-sm ${MUTED}`}>Brave New World · 올더스 헉슬리, 1932</p>
          </Reveal>
          <Reveal delay={100} className="min-w-0 flex-[1.4_1_440px] space-y-5 text-[17px] leading-[1.85] text-[#d7e0e6]">
            <p className="m-0">
              헉슬리의 소설 『멋진 신세계』에서 &lsquo;멋진&rsquo;은 칭찬이 아니라 경고입니다. 모두가 편안한 화면 앞에 있는 동안,
              진짜 세상은 보이지 않는 곳에서 돌아가죠.
            </p>
            <p className="m-0">
              바다도 그렇습니다. 물건은 제때 도착하고 기름값은 화면 속 숫자일 뿐이지만, 그 뒤에서는 홍해의 미사일 한 발이
              항로를 바꾸고, 해협 하나가 막히면 보험료와 운임이 함께 뛰어오릅니다.
            </p>
            <p className="m-0 font-semibold text-white">
              멋진 신세계는 그 가려진 장면을 지구본 위에 그대로 꺼내 놓습니다. 매끈한 화면 대신, 지금 바다에서 실제로 벌어지는 일을요.
            </p>
          </Reveal>
        </div>
      </section>

      {/* TRUST — 출처와 근거 등급 */}
      <section id="trust" className={`${WRAP} flex flex-wrap gap-14 pb-20 pt-20`}>
        <div className="min-w-0 flex-[1_1_380px]">
          <p className={EYEBROW}>믿을 수 있나</p>
          <h2 className={H2}>
            비밀 자료는 없습니다.
            <br />
            공개 정보를 서로 맞춰 봅니다.
          </h2>
          <p className={`mt-6 text-[17px] leading-[1.75] ${MUTED}`}>
            해군 경보, 배와 비행기의 위치 신호, 위성, 언론 보도처럼 공개된 정보(OSINT, 공개 출처 정보)를 한곳에 모으고
            출처끼리 얼마나 맞는지 따져서 보여 줍니다. 데이터마다 어디서 왔고 어떤 한계가 있는지는 지구본 안 「데이터 출처」에서 확인할 수 있어요.
          </p>
          <ul className="mt-8 grid list-none gap-x-6 gap-y-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
            {SOURCES.map(([name, what]) => (
              <li key={name}>
                <div className="text-[15px] font-semibold text-white">{name}</div>
                <div className={`text-sm ${MUTED}`}>{what}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3">
          <p className={`mb-1 mt-0 text-sm font-semibold ${MUTED}`}>소식마다 붙는 근거 배지</p>
          {BADGES.map((b) => (
            <div key={b.tag} className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-[#0a141f] px-5 py-4">
              <span className={`flex-none rounded px-2.5 py-1 text-sm font-bold ${b.cls}`}>{b.tag}</span>
              <span className="text-[15px] text-[#d7e0e6]">{b.body}</span>
            </div>
          ))}
          <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>
            근거가 얇은 속보는 크게 띄우지 않습니다. 사라진 게 아니라, 읽기 전에 한 번 걸러 둔 거예요.
          </p>
        </div>
      </section>

      {/* FAQ — 접었다 펴는 질문 */}
      <section id="faq" className="border-t border-white/10">
        <div className={`${WRAP} py-20`}>
          <div className="max-w-[900px]">
            <p className={EYEBROW}>자주 묻는 질문</p>
            <div className="mt-6">
              {FAQ.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <MegaMarquee reverse />

      {/* CTA */}
      <section id="join" className="border-t border-white/10 bg-[#081019]">
        <div className={`${WRAP} flex flex-wrap items-start gap-12 pb-24 pt-20`}>
          <div className="min-w-0 flex-[1_1_420px]">
            <h2 className="m-0 text-[clamp(30px,3.8vw,48px)] font-bold leading-[1.28] tracking-[-0.03em] text-white">
              이 바다,
              <br />
              지금 지나가도 될까요?
            </h2>
            <p className={`mt-5 max-w-[520px] text-lg leading-[1.7] ${MUTED}`}>
              지구본을 열고 해역을 하나 골라 보세요. 가입도, 설치도 필요 없어요.
            </p>
            <div className="mt-8">{renderEnter("footer")}</div>
          </div>
          <LandingSignup />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#05080d] text-[#8796a3]">
        <div className={`${WRAP} flex flex-wrap justify-between gap-5 py-10 text-sm leading-[1.7]`}>
          <div>
            <span className="font-semibold text-[#e6edf2]">Brave New World</span> · PhilSolution
          </div>
          <p className="m-0 max-w-[640px]">
            공개 정보를 모아 보여 주는 서비스이며, 정부·정보기관과는 관계가 없습니다. 항행·보험에 관한 최종 판단은 이용자에게 있습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
