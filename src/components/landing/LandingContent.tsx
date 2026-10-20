import Link from "next/link";
import type { ReactNode } from "react";
import { LandingGlobe } from "@/components/landing/LandingGlobe";
import { AlertDemo, FaqItem, Reveal, SectionDots } from "@/components/landing/LandingMotion";
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
  { id: "ask", label: "질문 넷" },
  { id: "flow", label: "경보가 뜨면" },
  { id: "read", label: "화면 읽는 법" },
  { id: "who", label: "누가 쓰나" },
  { id: "trust", label: "믿을 수 있나" },
  { id: "faq", label: "자주 묻는 질문" },
];

const MONO = "font-[family-name:var(--font-jetbrains-mono)]";
const EYEBROW = "m-0 text-[14px] font-semibold tracking-[0.02em] text-[#5eead4]";
const H2 = "mt-4 mb-0 text-[clamp(28px,3.4vw,42px)] font-bold leading-[1.3] tracking-[-0.02em] text-white";
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
    a: "공개 시세가 없는 보험료를 해운·보험 매체 기사에서 찾아 날짜순으로 보여 줍니다. 어느 기사의 어떤 문장에서 나온 숫자인지도 함께 적어요.",
  },
  {
    q: "그대로 지나가도 될까?",
    a: "주변 군함·항공모함과 군용기 움직임, 그 바다에 영향을 주는 군사·외교 속보까지 보고 판단할 수 있게 합니다.",
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
  ["strait-of-hormuz", "호르무즈 해협", "페르시아만 원유·LNG의 출구"],
  ["bab-el-mandeb", "바브엘만데브 해협", "홍해·수에즈 항로의 입구"],
  ["suez-canal", "수에즈 운하", "아시아와 유럽을 잇는 지름길"],
  ["strait-of-malacca", "말라카 해협", "중동 원유가 동아시아로 오는 길"],
  ["taiwan-strait", "대만해협", "동아시아 컨테이너선의 길목"],
  ["turkish-straits", "튀르키예 해협", "흑해와 지중해를 잇는 유일한 길"],
] as const;

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
    a: "아니요. 지구본은 가입 없이 무료로 볼 수 있습니다.",
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

      {/* HERO */}
      <section id="top" className={`${WRAP} flex flex-wrap items-center gap-x-12 gap-y-10 pb-20 pt-14`}>
        <div className="min-w-0 flex-[1.1_1_480px]">
          <p className={EYEBROW}>해운 위험 상황실 · 홍해 · 호르무즈 · 흑해 · 말라카</p>
          <h1 className="mb-0 mt-5 text-[clamp(38px,4.6vw,64px)] font-bold leading-[1.14] tracking-[-0.035em] text-white">
            정보기관 상황실처럼,
            <br className="hidden sm:block" />{" "}
            <span className="text-[#f5c451]">바다의 위험을 한눈에.</span>
          </h1>
          <p className={`mt-6 max-w-[560px] text-[19px] leading-[1.75] ${MUTED}`}>
            어느 배가 맞았는지, 그 바다가 지금 얼마나 위험한지, 전쟁위험 보험료는 얼마나 올랐는지.
            피격 경보가 뜰 때 운항 담당자가 한꺼번에 찾던 답을 3D 지구본 한 화면에 모았습니다.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {renderEnter("hero")}
            <a
              href="#read"
              className="inline-flex h-[54px] items-center rounded-md border border-white/25 px-6 text-base font-semibold text-white no-underline hover:border-white/60"
            >
              화면 읽는 법 먼저 보기
            </a>
          </div>
          <p className={`mt-4 text-sm ${MUTED}`}>가입 없이 무료로 바로 볼 수 있어요.</p>
        </div>

        <div className="min-w-0 flex-[1_1_440px]">
          <LandingGlobe />
        </div>
      </section>

      {/* ASK — 경보 하나에 질문 넷 */}
      <section id="ask" className="border-y border-white/10 bg-[#081019]">
        <div className={`${WRAP} py-24`}>
          <p className={EYEBROW}>경보 하나에 질문 넷</p>
          <h2 className={`${H2} max-w-[860px]`}>
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

      {/* FLOW — 경보가 뜨면 (반복 데모) */}
      <section id="flow" className={`${WRAP} pb-4 pt-24`}>
        <Reveal>
          <p className={EYEBROW}>경보가 뜨면</p>
          <h2 className={`${H2} max-w-[820px]`}>피격 경보 한 건이 지구본에서 어떻게 펼쳐지는지 보세요.</h2>
        </Reveal>
        <Reveal className="mt-12">
          <AlertDemo />
        </Reveal>
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
            <Reveal key={c.title} delay={(i % 3) * 90} className="flex gap-4 rounded-xl border border-white/10 bg-[#0a141f] p-6">
              <div className="flex-none">{c.mark}</div>
              <div className="min-w-0">
                <h3 className="m-0 text-[18px] font-bold leading-snug text-white">{c.title}</h3>
                <p className={`mb-0 mt-2 text-[15px] leading-[1.7] ${MUTED}`}>{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className={`mt-8 text-[15px] leading-relaxed ${MUTED}`}>
          지구본 위 무엇이든 누르면 설명 창이 열립니다. 위쪽 「묻기」에 &quot;홍해&quot;, &quot;호르무즈&quot;처럼 적으면 그 바다로 날아가요.
        </p>
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

      {/* STRAITS — 해협별 안내 */}
      <section className={`${WRAP} pb-8 pt-24`}>
        <p className={EYEBROW}>해협별로 보기</p>
        <h2 className={`${H2} max-w-[780px]`}>배가 꼭 지나야 하는 길목부터 살펴보세요.</h2>
        <ul className="mt-10 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
          {STRAITS.map(([slug, name, what]) => (
            <li key={slug}>
              <Link
                href={`/chokepoints/${slug}`}
                className="flex h-full items-center justify-between gap-3 rounded-lg border border-white/10 px-5 py-4 text-white no-underline hover:border-[#5eead4]/60"
              >
                <span>
                  <span className="block text-[17px] font-semibold">{name}</span>
                  <span className={`block text-sm ${MUTED}`}>{what}</span>
                </span>
                <span aria-hidden="true" className="text-[#5eead4]">→</span>
              </Link>
            </li>
          ))}
        </ul>
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
