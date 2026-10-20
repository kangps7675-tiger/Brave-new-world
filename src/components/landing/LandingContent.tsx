import type { ReactNode } from "react";
import { HeroMock } from "@/components/landing/HeroMock";
import { LandingSignup } from "@/components/landing/LandingSignup";

/** 지구본으로 들어가는 버튼 자리. 독립 페이지(/landing)와 첫 화면 막(LandingCurtain)이 서로 다른 버튼을 넣는다. */
export type EnterPlace = "nav" | "hero" | "footer";

const MONO = "font-[family-name:var(--font-jetbrains-mono)]";
const EYEBROW = `m-0 text-caption tracking-[0.08em] ${MONO}`;
const H2 = "mt-4 mb-0 text-[clamp(28px,3.2vw,40px)] font-bold leading-[1.35] tracking-[-0.02em]";
const WRAP = "mx-auto max-w-[1240px] px-6";

const QUESTIONS = [
  ["실제로 맞은 배는", "어느 배일까?"],
  ["그 해역은 지금", "얼마나 위험할까?"],
  ["보험료는", "얼마나 올랐을까?"],
  ["우회하거나 기다릴 수 있는", "날씨일까?"],
];

const FEATURES = [
  {
    title: "피격 선박 확인",
    body: "UKMTO(영국 해상무역작전본부)에서 피습 경보가 나오면, 그 시각 근처를 지나던 배들의 항적을 살펴봅니다. 사고 직후 멈추거나 방향을 바꾸거나 신호가 끊긴 배를 찾아 후보를 좁히고, IMO 번호로 어떤 배인지 확인합니다.",
  },
  {
    title: "해역 상황",
    body: "바브엘만데브, 호르무즈, 흑해 등 주요 해협마다 최근 피격 이력과 항행 경보, 통항량이 어떻게 변하고 있는지 보여 드립니다.",
  },
  {
    title: "전쟁위험 보험료 동향",
    body: "전쟁위험 보험료는 공개된 시세가 없습니다. 그래서 국내외 해운·보험 매체 기사에서 해역별 보험료를 찾아 날짜순으로 정리하고, 어느 기사의 어떤 문장에서 나온 숫자인지 함께 보여 드립니다.",
  },
  {
    title: "해상 날씨",
    body: "해역의 날씨와 파도 상태를 함께 보여 드립니다. 다른 항로로 돌아갈지, 날씨가 풀릴 때까지 기다릴지 정할 때 참고하실 수 있습니다.",
  },
  {
    title: "지정학 뉴스",
    body: "해역에 영향을 주는 군사·외교 소식을 해역과 관련된 기사부터 먼저 보여 드립니다. 지금 벌어지는 일이 어떤 배경에서 나왔는지 함께 읽을 수 있습니다.",
  },
];

const VERDICTS = [
  {
    tag: "확인",
    tagClass: "bg-[#0B6E4F] text-white",
    body: "선주사 발표나 UKMTO 후속 공지에 나온 선박 이름과 일치할 때만 '확인'으로 표시합니다.",
  },
  {
    tag: "유력",
    tagClass: "bg-[#F2B33D] text-[#0E1A24]",
    body: "여러 정황이 한 척을 가리키지만 아직 공식 발표가 없을 때입니다. 항적 기록만으로는 '유력'까지만 판정합니다.",
  },
  {
    tag: "자료 없음",
    tagClass: "border-[1.5px] border-dashed border-[#4A5A63] text-[#33434C]",
    body: "선박 신호가 끊긴 구간을 '배가 없었다'고 보지 않고, '자료가 없다'고 표시합니다.",
  },
];

const AUDIENCES = [
  {
    title: "해운사",
    body: "운항·안전 담당자가 우리 배가 사고와 관련이 있는지, 그 해역을 계속 지나가도 되는지 판단할 때 씁니다.",
    icon: <path d="M4 22 H32 L28 30 H8 Z M10 22 V14 H24 V22 M14 14 V9 H20 V14" />,
  },
  {
    title: "중소 해운기업 · 화주",
    body: "배가 돌아가거나 늦어지면 선적 일정과 납기가 얼마나 밀릴지 미리 가늠해 볼 수 있습니다.",
    icon: (
      <>
        <rect x="5" y="12" width="12" height="10" />
        <rect x="19" y="12" width="12" height="10" />
        <rect x="12" y="2" width="12" height="10" />
        <path d="M3 28 H33" />
      </>
    ),
  },
  {
    title: "해상보험 실무자",
    body: "해역별 위험을 평가하고 요율을 정할 때 참고 자료로 쓸 수 있습니다. 항차마다 따져야 하는 해역 기록도 함께 쌓입니다.",
    icon: (
      <>
        <path d="M18 3 L31 8 V17 C31 25 25 30 18 33 C11 30 5 25 5 17 V8 Z" />
        <path d="M12 18 L16 22 L24 13" />
      </>
    ),
  },
];

const SOURCES = [
  "UKMTO · JMIC 경보",
  "AIS 선박 항적",
  "NAVAREA 항행경보",
  "NASA 위성 화재 감지(FIRMS)",
  "해상 기상",
  "해운 · 보험 매체 보도",
];

function Arrow() {
  return (
    <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true">
      <path d="M0 6 H24 M18 1 L24 6 L18 11" fill="none" stroke="#4A5A63" strokeWidth="1.6" />
    </svg>
  );
}

export function LandingContent({ renderEnter }: { renderEnter: (place: EnterPlace) => ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] w-full bg-[#F3F5F4] text-[#0E1A24] font-[family-name:var(--font-pretendard),system-ui,sans-serif]"
      style={{ wordBreak: "keep-all" }}
    >
      {/* NAV */}
      <header className="border-b border-[#D5DBD9]">
        <nav aria-label="주 메뉴" className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-[18px]`}>
          <a href="#top" className="flex items-center gap-2.5 text-[#0E1A24] no-underline">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <circle cx="14" cy="14" r="12" fill="none" stroke="#0E1A24" strokeWidth="2" />
              <circle cx="14" cy="14" r="6" fill="none" stroke="#0E1A24" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="14" cy="14" r="2" fill="#C2410C" />
            </svg>
            <span className="text-lg font-bold tracking-[-0.01em]">Brave New World</span>
          </a>
          <div className="flex flex-wrap items-center gap-7 text-[15px]">
            <a href="#layers" className="text-[#0E1A24] no-underline hover:text-[#B8430A]">기능</a>
            <a href="#verdict" className="text-[#0E1A24] no-underline hover:text-[#B8430A]">판정 기준</a>
            <a href="#who" className="text-[#0E1A24] no-underline hover:text-[#B8430A]">이용 대상</a>
            {renderEnter("nav")}
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section id="top" className={`${WRAP} flex flex-wrap items-center gap-14 pb-24 pt-20`}>
        <div className="min-w-0 flex-[1_1_460px]">
          <p className={`${EYEBROW} mb-5 text-[#4A5A63]`}>홍해 · 호르무즈 · 흑해 · 말라카 · 대만해협</p>
          <h1 className="m-0 text-[clamp(40px,5.2vw,64px)] font-bold leading-[1.18] tracking-[-0.03em]">
            이 바다,
            <br />
            지금 지나가도 될까요?
          </h1>
          <p className="mt-7 max-w-[560px] text-[19px] leading-[1.7] text-[#33434C]">
            피격 경보가 뜨면 어떤 배가 맞았는지, 보험료는 얼마나 올랐는지, 날씨는 괜찮은지 한꺼번에 확인해야 합니다.
            Brave New World는 이 정보를 해역별로 한 화면에 모아 드립니다.
          </p>
          <div className="mt-9 flex flex-wrap gap-2.5">
            {renderEnter("hero")}
            <a
              href="#join"
              className="inline-flex h-[52px] items-center rounded-md border border-[#9AA7AD] bg-white px-6 text-base font-semibold text-[#0E1A24] no-underline hover:border-[#0E1A24]"
            >
              메일로 소식 받기
            </a>
          </div>
        </div>
        <HeroMock />
      </section>

      {/* PROBLEM */}
      <section className="bg-[#0E1A24] text-[#E6ECEE]">
        <div className={`${WRAP} py-[88px]`}>
          <p className={`${EYEBROW} text-[#A9B7BE]`}>경보가 뜨면 확인해야 할 것들</p>
          <h2 className={`${H2} max-w-[860px]`}>
            대형 선사는 비싼 해사 정보 서비스로 답을 얻습니다. 하지만 많은 회사가 아직 뉴스와 브로커 연락을 하나하나 맞춰
            보며 판단하고 있습니다.
          </h2>
          <div className="mt-12 grid gap-px border border-[#22323D] bg-[#22323D] [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {QUESTIONS.map(([a, b], i) => (
              <div key={a} className="bg-[#0E1A24] px-6 py-7">
                <div className={`text-sm text-[#F2B33D] ${MONO}`}>{String(i + 1).padStart(2, "0")}</div>
                <p className="mb-0 mt-3 text-xl font-semibold leading-normal">
                  {a}
                  <br />
                  {b}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="layers" className={`${WRAP} pb-[88px] pt-[104px]`}>
        <p className={`${EYEBROW} text-[#4A5A63]`}>주요 기능</p>
        <h2 className={`${H2} max-w-[760px]`}>
          해역을 하나 고르면
          <br />
          다섯 가지 정보를 함께 볼 수 있습니다.
        </h2>
        <div className="mt-14 flex flex-col border-t-2 border-[#0E1A24]">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="flex flex-wrap gap-x-10 gap-y-4 border-b border-[#C9D1CF] py-8">
              <div className={`flex-[0_0_72px] text-[15px] text-[#4A5A63] ${MONO}`}>{String(i + 1).padStart(2, "0")}</div>
              <h3 className="m-0 flex-[1_1_260px] text-2xl font-bold tracking-[-0.01em]">{f.title}</h3>
              <p className="m-0 flex-[2_1_420px] text-[17px] leading-[1.75] text-[#33434C]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VERDICT */}
      <section id="verdict" className="bg-[#E4E9E7]">
        <div className={`${WRAP} flex flex-wrap gap-14 py-24`}>
          <div className="min-w-0 flex-[1_1_360px]">
            <p className={`${EYEBROW} text-[#4A5A63]`}>판정 기준</p>
            <h2 className={H2}>
              확실하지 않은 정보는
              <br />
              확실하지 않다고 알려 드립니다.
            </h2>
            <p className="mt-6 text-[17px] leading-[1.75] text-[#33434C]">
              배를 보낼지 말지 정하는 데 쓰는 정보라면, 그 정보가 얼마나 확실한지도 함께 알아야 합니다. 그래서 모든 판정에
              근거와 한계를 같이 적고, 새로운 소식이 들어오면 다시 판단한 기록을 남깁니다.
            </p>
          </div>
          <div className="flex min-w-0 flex-[1.3_1_480px] flex-col gap-3.5">
            {VERDICTS.map((v) => (
              <div key={v.tag} className="flex flex-wrap items-start gap-5 rounded-[10px] bg-white p-6">
                <span className={`flex-none rounded-[5px] px-3 py-1.5 text-[15px] font-bold ${v.tagClass}`}>{v.tag}</span>
                <p className="m-0 flex-[1_1_240px] text-[17px] leading-[1.7]">{v.body}</p>
              </div>
            ))}
            <div className="mt-2.5 border-t border-[#B9C3C1] pt-5">
              <p className={`mb-3 mt-0 text-caption text-[#4A5A63] ${MONO}`}>판정이 바뀌는 과정 (예시)</p>
              <div className={`flex flex-wrap items-center gap-2.5 text-[15px] ${MONO}`}>
                <span className="rounded-md bg-white px-3 py-2">21:10 후보 3척</span>
                <Arrow />
                <span className="rounded-md bg-white px-3 py-2">22:30 1척으로 좁혀짐</span>
                <Arrow />
                <span className="rounded-md bg-[#0B6E4F] px-3 py-2 text-white">23:40 선주사 발표로 확인</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AUDIENCE */}
      <section id="who" className={`${WRAP} pb-24 pt-[104px]`}>
        <p className={`${EYEBROW} text-[#4A5A63]`}>이용 대상</p>
        <h2 className={`${H2} max-w-[820px]`}>
          그대로 지나갈지, 희망봉으로 돌아갈지,
          <br />
          출항을 미룰지 결정해야 하는 분들께
        </h2>
        <div className="mt-[52px] grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="rounded-[10px] border border-[#C9D1CF] bg-white px-7 py-8">
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                aria-hidden="true"
                fill="none"
                stroke="#0E1A24"
                strokeWidth="1.8"
                strokeLinejoin="round"
              >
                {a.icon}
              </svg>
              <h3 className="mb-0 mt-5 text-[22px] font-bold">{a.title}</h3>
              <p className="mb-0 mt-3 text-base leading-[1.75] text-[#33434C]">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SOURCES */}
      <section className="border-y border-[#C9D1CF]">
        <div className={`${WRAP} flex flex-wrap items-baseline gap-x-12 gap-y-5 py-12`}>
          <p className={`${EYEBROW} flex-none text-[#4A5A63]`}>서로 대조하는 자료</p>
          <ul className="m-0 flex flex-[1_1_600px] list-none flex-wrap gap-x-7 gap-y-2.5 p-0 text-[17px] font-medium">
            {SOURCES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section id="join" className={`${WRAP} flex flex-wrap items-start gap-12 pb-28 pt-[104px]`}>
        <div className="min-w-0 flex-[1_1_420px]">
          <h2 className="m-0 text-[clamp(30px,3.6vw,46px)] font-bold leading-[1.3] tracking-[-0.03em]">
            피격 경보가 뜬 직후,
            <br />
            근거 있는 답을 가장 먼저
            <br />
            드리겠습니다.
          </h2>
          <p className="mt-6 max-w-[520px] text-lg leading-[1.7] text-[#33434C]">
            대형 선사만 쓰던 해상 위험 정보를 업계 누구나 부담 없는 비용으로 쓸 수 있게 만들고 있습니다.
          </p>
          {renderEnter("footer")}
        </div>
        <LandingSignup />
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0E1A24] text-[#A9B7BE]">
        <div className={`${WRAP} flex flex-wrap justify-between gap-5 py-10 text-sm leading-[1.7]`}>
          <div>
            <span className="font-semibold text-[#E6ECEE]">Brave New World</span> · PhilSolution
          </div>
          <p className="m-0 max-w-[640px]">
            이 서비스는 정보 제공을 목적으로 하며, 항행과 보험에 관한 최종 결정은 이용자에게 있습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
