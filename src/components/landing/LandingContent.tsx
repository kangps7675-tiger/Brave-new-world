import type { ReactNode } from "react";
import { GLOBE_MARKS, HeroGlobe } from "@/components/landing/HeroGlobe";
import { LandingSignup } from "@/components/landing/LandingSignup";

/** 지구본으로 들어가는 버튼 자리. 독립 페이지(/landing)와 첫 화면 막(LandingCurtain)이 서로 다른 버튼을 넣는다. */
export type EnterPlace = "nav" | "hero" | "footer";

/**
 * 랜딩 본문. 지구본만 봐서는 반짝이는 게 무슨 뜻인지 알 수 없다 — 들어가기 전에
 * "이게 뭐고, 화면에 뜨는 건 무슨 뜻이고, 왜 믿어도 되는지"를 한 번에 읽히게 한다.
 * 구성: 첫 화면(약속·버튼·지구본 읽는 법) → 이럴 때 → 화면 읽는 법 → 출처 → 마지막 버튼.
 */

const MONO = "font-[family-name:var(--font-jetbrains-mono)]";
const EYEBROW = "m-0 text-[14px] font-semibold tracking-[0.02em] text-[#5eead4]";
const H2 = "mt-4 mb-0 text-[clamp(28px,3.4vw,42px)] font-bold leading-[1.3] tracking-[-0.02em] text-white";
const WRAP = "mx-auto max-w-[1200px] px-6";
const MUTED = "text-[#a3b3bf]";

const PROMISES = [
  {
    title: "그 자리에서 봅니다",
    body: "기사로 읽던 전쟁 소식이 지도 위 실제 위치에 찍힙니다. 어디서 무슨 일이 났는지 지명을 찾아볼 필요가 없어요.",
  },
  {
    title: "지금 이 순간을 봅니다",
    body: "위성 화재 감지, 배와 비행기의 위치 신호, 전선 속보를 몇 분마다 새로 받아 옵니다.",
  },
  {
    title: "얼마나 믿을지 알려 드립니다",
    body: "소식마다 출처끼리 얼마나 맞는지 배지를 붙입니다. 근거가 얇은 소문은 크게 띄우지 않아요.",
  },
];

const USE_CASES = [
  {
    when: "뉴스에서 '홍해에서 상선 피격'을 봤을 때",
    then: "그 배가 어디서 맞았는지, 같은 바다에서 최근 또 공격받은 배가 있는지 바로 확인합니다.",
  },
  {
    when: "유가나 주가가 갑자기 출렁일 때",
    then: "원인이 된 정유소 타격이나 해협 봉쇄가 어디서 일어났는지 지도에서 찾습니다.",
  },
  {
    when: "출장이나 여행을 앞두고 있을 때",
    then: "가려는 지역 주변에 요즘 공습이나 충돌이 있었는지 미리 살펴봅니다.",
  },
  {
    when: "국제 정세를 공부하고 싶을 때",
    then: "영토 분쟁과 진영 관계를 지도 위 이야기로 따라가며 배경부터 이해합니다.",
  },
];

const BADGES = [
  { tag: "탄탄함", cls: "bg-[#0f766e] text-white", body: "여러 종류의 공개 출처가 같은 이야기를 해요. 시간이 없으면 여기부터 보세요." },
  { tag: "교차확인", cls: "bg-[#1d4ed8] text-white", body: "서로 다른 출처가 한쪽으로 맞춰졌어요. 천천히 볼 만해요." },
  { tag: "얇음", cls: "bg-[#a16207] text-white", body: "아직 근거가 적어요. 단서로만 보고 사실처럼 믿지는 마세요." },
  { tag: "모으는 중", cls: "border border-dashed border-[#a3b3bf] text-[#d7e0e6]", body: "확인할 자료를 아직 모으고 있어요." },
];

const SOURCES = [
  ["NASA FIRMS", "위성 화재·열 감지"],
  ["ADS-B", "항공기 위치 신호"],
  ["AIS", "선박 위치 신호"],
  ["Liveuamap", "전선 속보·점령 지역"],
  ["UKMTO", "영국 해군 해상 피습 경보"],
  ["GDELT", "전 세계 기사 자동 분석"],
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
            <a href="#read" className="hidden text-[#c9d5dd] no-underline hover:text-white md:inline">화면 읽는 법</a>
            <a href="#when" className="hidden text-[#c9d5dd] no-underline hover:text-white md:inline">이럴 때 쓰세요</a>
            <a href="#trust" className="hidden text-[#c9d5dd] no-underline hover:text-white md:inline">믿을 수 있나요</a>
            {renderEnter("nav")}
          </div>
        </nav>
      </header>

      {/* HERO — 첫 화면에서 약속·버튼·화면 읽는 법이 모두 보이게 */}
      <section id="top" className={`${WRAP} flex flex-wrap items-center gap-x-14 gap-y-10 pb-20 pt-16`}>
        <div className="min-w-0 flex-[1_1_440px]">
          <p className={EYEBROW}>공개 정보로 만든 나만의 상황실</p>
          <h1 className="mb-0 mt-5 text-[clamp(38px,5vw,62px)] font-bold leading-[1.2] tracking-[-0.03em] text-white">
            정보기관 상황실에 앉은 듯한
            <br className="hidden sm:block" />{" "}
            <span className="text-[#f5c451]">생생한 현장감.</span>
          </h1>
          <p className={`mt-6 max-w-[560px] text-[19px] leading-[1.75] ${MUTED}`}>
            어디에 미사일이 떨어졌는지, 어느 바다에서 배가 공격받았는지, 지금 누가 어느 땅을 차지하고 있는지.
            세계 곳곳의 전쟁과 분쟁 소식을 3D 지구본 하나에 실시간으로 겹쳐 보여 드립니다.
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

        <figure className="m-0 flex min-w-0 flex-[1_1_480px] flex-wrap items-center gap-6">
          <div className="min-w-0 flex-[1_1_300px]">
            <HeroGlobe />
          </div>
          <figcaption className="min-w-0 flex-[1_1_190px]">
            <p className={`mb-3 mt-0 text-sm font-semibold ${MUTED}`}>지구본에 뜨는 것들</p>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {GLOBE_MARKS.map((m) => (
                <li key={m.n} className="flex items-start gap-2.5 text-[15px] leading-snug">
                  <span className="mt-px inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border-[1.5px] border-[#f5c451] text-caption font-bold text-[#f5c451]">
                    {m.n}
                  </span>
                  <span>
                    <b className="font-semibold text-white">{m.title}</b> <span className={MUTED}>{m.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </figcaption>
        </figure>
      </section>

      {/* PROMISES */}
      <section className="border-y border-white/10 bg-[#081019]">
        <div className={`${WRAP} grid gap-px py-0 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]`}>
          {PROMISES.map((p) => (
            <div key={p.title} className="px-2 py-10 sm:px-6">
              <h3 className="m-0 text-xl font-bold text-white">{p.title}</h3>
              <p className={`mb-0 mt-3 text-base leading-[1.75] ${MUTED}`}>{p.body}</p>
            </div>
          ))}
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
          {[
            {
              mark: (
                <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                  <circle cx="20" cy="22" r="16" fill="#ff6a00" fillOpacity="0.25" />
                  <path d="M20 6 C21.6 12 27 16 27 23 C27 28 24 32 20 32 C16 32 13 28 13 23 C13 18.6 16.4 16 17.8 12 C18.6 13.8 19.2 14 19.8 13.2 C20.3 11.2 20 8.6 20 6 Z" fill="#ffb02a" />
                  <path d="M20 19 C21 21.4 23 22.8 23 25.6 C23 27.6 21.7 29 20 29 C18.3 29 17 27.6 17 25.6 C17 23.2 19 21.8 20 19 Z" fill="#fff" />
                </svg>
              ),
              title: "불꽃 — 드론·미사일이 떨어진 곳",
              body: "발사나 요격이 아니라, 실제로 무언가에 맞았다고 보도된 곳만 불꽃으로 켭니다. 누르면 무슨 일이 있었는지 설명이 열려요.",
            },
            {
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
              title: "붉은 면 — 지금 누가 차지했나",
              body: "우크라이나 점령 지역, 중동의 무장세력 통제 구역처럼 땅의 주인이 바뀐 곳을 칠합니다. 빗금 상자는 전쟁 중이거나 외교 긴장이 높은 구역이에요.",
            },
            {
              mark: (
                <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                  <circle cx="20" cy="20" r="15" fill="none" stroke="#f87171" strokeWidth="1.6" strokeDasharray="3 3" />
                  <path d="M10 21 L30 21 L26.5 27 L13.5 27 Z M14.5 21 L14.5 14 L23 14 L25.5 21" fill="#e2e8f0" />
                </svg>
              ),
              title: "배 — 공격받은 배와 항공모함",
              body: "해상에서 공격받거나 붙잡힌 배를 표시하고, 배 위치 신호(AIS)로 주변 움직임도 보여 줍니다. 이름이 붙은 큰 배는 항공모함이에요.",
            },
            {
              mark: (
                <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                  <path transform="translate(20 20) rotate(-30)" d="M0 -14 L2.3 -5 L13 1 L13 4.5 L2.3 1.2 L1.8 9 L6 12.5 L6 14.5 L0 13 L-6 14.5 L-6 12.5 L-1.8 9 L-2.3 1.2 L-13 4.5 L-13 1 L-2.3 -5 Z" fill="#e2e8f0" />
                </svg>
              ),
              title: "비행기 — 지금 떠 있는 군용기",
              body: "항공기가 내보내는 위치 신호(ADS-B)를 받아 군용기가 어디를 날고 있는지 보여 줍니다. 신호를 끈 비행기는 보이지 않아요.",
            },
            {
              mark: (
                <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                  <circle cx="20" cy="20" r="14" fill="none" stroke="#2dd4bf" strokeOpacity="0.45" strokeWidth="1.5" />
                  <circle cx="20" cy="20" r="5" fill="#2dd4bf" />
                </svg>
              ),
              title: "깜빡이는 점 — 방금 들어온 속보",
              body: "전선 속보와 검증된 기사가 가리키는 자리입니다. 테두리 색은 출처가 얼마나 탄탄한지를 뜻해요.",
            },
            {
              mark: (
                <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                  <path d="M5 30 C12 8 28 8 35 28" fill="none" stroke="#a78bfa" strokeOpacity="0.4" strokeWidth="5" />
                  <path d="M5 30 C12 8 28 8 35 28" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeDasharray="4 3" />
                </svg>
              ),
              title: "빛나는 선 — 누가 누구를 돕나",
              body: "중국·러시아·이란·북한처럼 같은 편끼리 무기, 자금, 에너지를 주고받는 관계를 곡선으로 잇습니다. 바닷길과 송유관도 선으로 보여요.",
            },
          ].map((c) => (
            <div key={c.title} className="flex gap-4 rounded-xl border border-white/10 bg-[#0a141f] p-6">
              <div className="flex-none">{c.mark}</div>
              <div className="min-w-0">
                <h3 className="m-0 text-[18px] font-bold leading-snug text-white">{c.title}</h3>
                <p className={`mb-0 mt-2 text-[15px] leading-[1.7] ${MUTED}`}>{c.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className={`mt-8 text-[15px] leading-relaxed ${MUTED}`}>
          지구본 위 무엇이든 누르면 설명 창이 열립니다. 위쪽 「묻기」에 &quot;홍해&quot;, &quot;우크라이나&quot;처럼 적으면 그 지역으로 날아가요.
        </p>
      </section>

      {/* WHEN — 이럴 때 */}
      <section id="when" className="bg-[#081019]">
        <div className={`${WRAP} py-24`}>
          <p className={EYEBROW}>이럴 때 쓰세요</p>
          <h2 className={`${H2} max-w-[780px]`}>뉴스 창 열 개를 띄우는 대신, 지구본 하나를 엽니다.</h2>
          <div className="mt-12 flex flex-col border-t border-white/15">
            {USE_CASES.map((u) => (
              <div key={u.when} className="flex flex-wrap gap-x-10 gap-y-3 border-b border-white/10 py-7">
                <h3 className="m-0 flex-[1_1_300px] text-xl font-bold leading-snug text-white">{u.when}</h3>
                <p className={`m-0 flex-[1.4_1_360px] text-[17px] leading-[1.7] ${MUTED}`}>{u.then}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST — 출처와 근거 등급 */}
      <section id="trust" className={`${WRAP} flex flex-wrap gap-14 pb-20 pt-24`}>
        <div className="min-w-0 flex-[1_1_380px]">
          <p className={EYEBROW}>믿을 수 있나요</p>
          <h2 className={H2}>
            비밀 자료는 없습니다.
            <br />
            누구나 볼 수 있는 공개 정보를
            <br />
            서로 맞춰 봅니다.
          </h2>
          <p className={`mt-6 text-[17px] leading-[1.75] ${MUTED}`}>
            정보기관 자료를 쓰는 게 아닙니다. 위성, 배와 비행기의 위치 신호, 언론 보도처럼 공개된 정보(OSINT, 공개 출처 정보)를
            한곳에 모으고, 출처끼리 얼마나 맞는지 따져서 보여 줍니다. 데이터마다 어디서 왔고 어떤 한계가 있는지 지구본 안 「데이터 출처」에서 확인할 수 있어요.
          </p>
          <ul className="mt-8 grid list-none gap-x-6 gap-y-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
            {SOURCES.map(([name, what]) => (
              <li key={name}>
                <div className={`text-[15px] font-semibold text-white ${MONO}`}>{name}</div>
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

      {/* CTA */}
      <section id="join" className="border-t border-white/10 bg-[#081019]">
        <div className={`${WRAP} flex flex-wrap items-start gap-12 pb-24 pt-20`}>
          <div className="min-w-0 flex-[1_1_420px]">
            <h2 className="m-0 text-[clamp(30px,3.8vw,48px)] font-bold leading-[1.28] tracking-[-0.03em] text-white">
              지금 이 순간,
              <br />
              세계는 어디서 흔들리고 있을까요?
            </h2>
            <p className={`mt-5 max-w-[520px] text-lg leading-[1.7] ${MUTED}`}>
              버튼 하나면 지구본이 열립니다. 가입도, 설치도 필요 없어요.
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
            공개 정보를 모아 보여 주는 서비스이며, 정부·정보기관과는 관계가 없습니다. 투자·여행·안전에 관한 최종 판단은 이용자에게 있습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
