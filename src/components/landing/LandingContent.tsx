"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
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
import { LandingLanguageNav } from "@/components/landing/LandingLanguageNav";
import { LandingOpenLink } from "@/components/landing/LandingOpenLink";
import { landingCopy } from "@/components/landing/landingCopy";
import { useLandingLanguage } from "@/lib/landingLanguage";

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

const MONO = "font-[family-name:var(--font-jetbrains-mono)]";
const EYEBROW = "m-0 text-[14px] font-semibold tracking-[0.02em] text-[#5eead4]";
const H2 = "mt-4 mb-0 text-[clamp(30px,3.7vw,50px)] font-extrabold leading-[1.2] tracking-[-0.035em] text-white";
const WRAP = "mx-auto max-w-[1200px] px-6";
const MUTED = "text-[#a3b3bf]";
const ENTER_CLASS: Record<EnterPlace, string> = {
  nav: "rounded-md bg-[#f5c451] px-[18px] py-3 font-bold text-[#05080d] no-underline hover:bg-[#ffd772]",
  hero: "landing-cta-glow inline-flex h-[54px] items-center rounded-md bg-[#f5c451] px-7 text-[17px] font-bold text-[#05080d] no-underline hover:bg-[#ffd772]",
  footer:
    "inline-flex h-[54px] items-center rounded-md bg-[#f5c451] px-7 text-[17px] font-bold text-[#05080d] no-underline hover:bg-[#ffd772]",
};

function defaultEnter(place: EnterPlace) {
  return <LandingOpenLink className={ENTER_CLASS[place]} />;
}

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

export function LandingContent({ renderEnter = defaultEnter }: { renderEnter?: (place: EnterPlace) => ReactNode }) {
  const lang = useLandingLanguage();
  const copy = landingCopy(lang);
  useEffect(() => {
    document.title = copy.pageTitle;
  }, [copy.pageTitle]);
  return (
    <div
      className="min-h-[100dvh] w-full bg-[#05080d] text-[#e6edf2] font-[family-name:var(--font-pretendard),system-ui,sans-serif]"
      style={{ wordBreak: lang === "en" ? "normal" : "keep-all" }}
    >
      {/* NAV */}
      <header className="border-b border-white/10">
        <nav aria-label={copy.navAria} className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-[18px]`}>
          <a href="#top" className="flex items-center gap-2.5 text-white no-underline">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <circle cx="14" cy="14" r="12" fill="none" stroke="#5eead4" strokeWidth="2" />
              <circle cx="14" cy="14" r="6" fill="none" stroke="#5eead4" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="14" cy="14" r="2" fill="#f5c451" />
            </svg>
            <span className="text-lg font-bold tracking-[-0.01em]">Strait Desk</span>
          </a>
          <div className="flex flex-wrap items-center gap-6 text-[15px]">
            <a href="#ask" className="hidden text-[#c9d5dd] no-underline hover:text-white md:inline">{copy.navAsk}</a>
            <a href="#who" className="hidden text-[#c9d5dd] no-underline hover:text-white md:inline">{copy.navWho}</a>
            <a href="#trust" className="hidden text-[#c9d5dd] no-underline hover:text-white md:inline">{copy.navTrust}</a>
            <LandingLanguageNav />
            {renderEnter("nav")}
          </div>
        </nav>
      </header>

      <SectionDots sections={copy.sections} />
      <Grain />

      {/* HERO */}
      <section id="top" className="relative overflow-hidden">
        <HeroBackdrop />
        <div className={`${WRAP} relative flex flex-wrap items-center gap-x-12 gap-y-10 pb-20 pt-14`}>
        <div className="min-w-0 flex-[1.1_1_480px]">
          <p className={EYEBROW}>{copy.heroEyebrow}</p>
          <h1 className="mb-0 mt-5 text-[clamp(38px,4.6vw,64px)] font-bold leading-[1.14] tracking-[-0.035em] text-white">
            <DecodeText key={`${lang}-1`} text={copy.heroLine1} />
            <br className="hidden sm:block" />{" "}
            <span className="landing-glitch is-live text-[#f5c451]" data-text={copy.heroLine2}>
              <DecodeText key={`${lang}-2`} text={copy.heroLine2} delay={350} />
            </span>
          </h1>
          <p className={`mt-6 max-w-[560px] text-[19px] leading-[1.75] ${MUTED}`}>
            {copy.heroBody}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Magnetic>{renderEnter("hero")}</Magnetic>
            <a
              href="#read"
              className="inline-flex h-[54px] items-center rounded-md border border-white/25 px-6 text-base font-semibold text-white no-underline hover:border-white/60"
            >
              {copy.heroRead}
            </a>
          </div>
          <p className={`mt-4 text-sm ${MUTED}`}>{copy.heroBeta}</p>
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
          <p className={EYEBROW}>{copy.threatEyebrow}</p>
          <h2 className={`${H2} max-w-[900px]`}>{copy.threatTitle}</h2>
        </Reveal>
        <div className="mt-10">
          <ShipStrikeScene />
        </div>
      </section>

      {/* STATS — 숫자로 보는 범위 */}
      <section className={`${WRAP} grid gap-px py-14 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]`}>
        {copy.stats.map((x) => (
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
          <p className={EYEBROW}>{copy.askEyebrow}</p>
          <h2 className={`${H2} max-w-[1080px]`}>
            {copy.askTitle1}
            <br className="hidden md:block" /> {copy.askTitle2}
          </h2>
          <div className="mt-12 grid gap-px border border-white/10 bg-white/10 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {copy.questions.map((x, i) => (
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
          <p className={EYEBROW}>{copy.flowEyebrow}</p>
          <h2 className={`${H2} max-w-[820px]`}>{copy.flowTitle}</h2>
        </Reveal>
        <div className="mt-16">
          <AlertScrolly />
        </div>
      </section>

      {/* READ — 화면 읽는 법 */}
      <section id="read" className={`${WRAP} pb-20 pt-24`}>
        <p className={EYEBROW}>{copy.readEyebrow}</p>
        <h2 className={`${H2} max-w-[780px]`}>
          {copy.readTitle1}
          <br />
          {copy.readTitle2}
        </h2>
        <div className="mt-12 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          {copy.read.map((card, i) => (
            <Reveal key={card.title} delay={(i % 3) * 90}>
              <TiltCard className="flex h-full gap-4 rounded-xl border border-white/10 bg-[#0a141f] p-6">
                <div className="flex-none">{READ_CARDS[i].mark}</div>
                <div className="min-w-0">
                  <h3 className="m-0 text-[18px] font-bold leading-snug text-white">{card.title}</h3>
                  <p className={`mb-0 mt-2 text-[15px] leading-[1.7] ${MUTED}`}>{card.body}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
        <p className={`mt-8 text-[15px] leading-relaxed ${MUTED}`}>
          {copy.readFoot}
        </p>
      </section>

      {/* EXTRA — 호외: 공개 보도로 본 보험료 */}
      <ExtraEdition />

      {/* BREAKING — 속보 기능 설명 */}
      <section id="breaking" className="border-t border-white/10 bg-[#0b0f14]">
        <div className={`${WRAP} py-24`}>
          <Reveal>
            <p className={EYEBROW}>{copy.breakingEyebrow}</p>
            <h2 className={`${H2} max-w-[820px]`}>{copy.breakingTitle}</h2>
            <p className={`mt-5 mb-0 max-w-[720px] text-[17px] leading-[1.75] ${MUTED}`}>
              {copy.breakingLead}
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
            {copy.breakingKinds.map((k, i) => (
              <Reveal key={k.title} delay={(i % 3) * 80}>
                <div className="h-full rounded-xl border border-[#f5c451]/25 bg-[#0a141f] p-6">
                  <span className="block text-caption font-semibold text-[#f5c451]">{k.tag}</span>
                  <h3 className="mb-0 mt-2 text-[19px] font-bold leading-snug text-white">{k.title}</h3>
                  <p className={`mb-0 mt-2 text-[15px] leading-[1.7] ${MUTED}`}>{k.body}</p>
                  <p className="mb-0 mt-4 border-t border-white/10 pt-3 text-[14px] leading-[1.6] text-[#5eead4]">{k.flow}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className={`mb-0 mt-14 max-w-[720px] text-[17px] leading-[1.75] ${MUTED}`}>
              {copy.breakingNote}
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
            {copy.breaking.map((b, i) => (
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
              <strong className="text-white">{lang === "en" ? "Not yet." : "아직 없는 것."}</strong> {lang === "en" ? copy.breakingLimit.replace(/^Not yet\. /, "") : copy.breakingLimit.replace(/^아직 없는 것\. /, "")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* FEATURES — 상세 기능 */}
      <section id="features" className="border-t border-white/10 bg-[#081019]">
        <div className={`${WRAP} py-24`}>
          <Reveal>
            <p className={EYEBROW}>{copy.featuresEyebrow}</p>
            <h2 className={`${H2} max-w-[820px]`}>{copy.featuresTitle}</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {copy.features.map((f, i) => {
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
          <p className={EYEBROW}>{copy.devicesEyebrow}</p>
          <h2 className={`${H2} max-w-[820px]`}>
            {copy.devicesTitle1}
            <br className="hidden md:block" /> {copy.devicesTitle2}
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))]">
          <Reveal className="rounded-xl border border-[#f5c451]/35 bg-[#0a141f] p-7">
            <svg width="64" height="48" viewBox="0 0 64 48" aria-hidden="true" fill="none" stroke="#f5c451" strokeWidth="1.8">
              <rect x="4" y="4" width="56" height="32" rx="3" />
              <circle cx="32" cy="20" r="9" stroke="#5eead4" />
              <path d="M24 44 H40 M32 36 V44" />
            </svg>
            <h3 className="mb-0 mt-5 text-[21px] font-bold text-white">{copy.deskTitle}</h3>
            <ul className={`mb-0 mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-[1.7] ${MUTED}`}>
              {copy.desk.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={90} className="rounded-xl border border-white/10 bg-[#0a141f] p-7">
            <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="#5eead4" strokeWidth="1.8">
              <rect x="13" y="3" width="22" height="42" rx="4" />
              <path d="M20 39 H28" />
              <path d="M31 8 C35 9 38 12 39 16" stroke="#f5c451" />
              <circle cx="31" cy="12" r="3" fill="#f5c451" stroke="none" />
            </svg>
            <h3 className="mb-0 mt-5 text-[21px] font-bold text-white">{copy.phoneTitle}</h3>
            <ul className={`mb-0 mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-[1.7] ${MUTED}`}>
              {copy.phone.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* WHO — 누가 쓰나 */}
      <section id="who" className="bg-[#081019]">
        <div className={`${WRAP} py-24`}>
          <p className={EYEBROW}>{copy.whoEyebrow}</p>
          <h2 className={`${H2} max-w-[820px]`}>
            {copy.whoTitle1}
            <br className="hidden md:block" /> {copy.whoTitle2}
          </h2>
          <div className="mt-12 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {copy.audiences.map((a, i) => (
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
          cards={copy.straits}
          heading={
            <>
              <p className={EYEBROW}>{copy.straitsEyebrow}</p>
              <h2 className={`${H2} max-w-[820px]`}>{copy.straitsTitle}</h2>
            </>
          }
        />
      </section>

      {/* NAME — 왜 'Strait Desk'인가 */}
      <section id="name" className="border-y border-white/10 bg-[#081019]">
        <div className={`${WRAP} flex flex-wrap items-start gap-x-16 gap-y-8 py-24`}>
          <Reveal className="min-w-0 flex-[1_1_360px]">
            <p className={EYEBROW}>{copy.nameEyebrow}</p>
            <h2 className={H2}>
              {copy.nameTitle}
            </h2>
            <p className={`mt-4 text-sm ${MUTED}`}>{copy.nameSub}</p>
          </Reveal>
          <Reveal delay={100} className="min-w-0 flex-[1.4_1_440px] space-y-5 text-[17px] leading-[1.85] text-[#d7e0e6]">
            <p className="m-0">{copy.name1}</p>
            <p className="m-0">{copy.name2}</p>
            <p className="m-0 font-semibold text-white">{copy.name3}</p>
          </Reveal>
        </div>
      </section>

      {/* TRUST — 출처와 근거 등급 */}
      <section id="trust" className={`${WRAP} flex flex-wrap gap-14 pb-20 pt-20`}>
        <div className="min-w-0 flex-[1_1_380px]">
          <p className={EYEBROW}>{copy.trustEyebrow}</p>
          <h2 className={H2}>
            {copy.trustTitle1}
            <br />
            {copy.trustTitle2}
          </h2>
          <p className={`mt-6 text-[17px] leading-[1.75] ${MUTED}`}>
            {copy.trustBody}
          </p>
          <ul className="mt-8 grid list-none gap-x-6 gap-y-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
            {copy.sources.map(([name, what]) => (
              <li key={name}>
                <div className="text-[15px] font-semibold text-white">{name}</div>
                <div className={`text-sm ${MUTED}`}>{what}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3">
          <p className={`mb-1 mt-0 text-sm font-semibold ${MUTED}`}>{copy.badgeTitle}</p>
          {copy.badges.map((b) => (
            <div key={b.tag} className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-[#0a141f] px-5 py-4">
              <span className={`flex-none rounded px-2.5 py-1 text-sm font-bold ${b.cls}`}>{b.tag}</span>
              <span className="text-[15px] text-[#d7e0e6]">{b.body}</span>
            </div>
          ))}
          <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>
            {copy.badgeFoot}
          </p>
        </div>
      </section>

      {/* FAQ — 접었다 펴는 질문 */}
      <section id="faq" className="border-t border-white/10">
        <div className={`${WRAP} py-20`}>
          <div className="max-w-[900px]">
            <p className={EYEBROW}>{copy.faqEyebrow}</p>
            <div className="mt-6">
              {copy.faq.map((f) => (
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
              {copy.ctaTitle1}
              <br />
              {copy.ctaTitle2}
            </h2>
            <p className={`mt-5 max-w-[520px] text-lg leading-[1.7] ${MUTED}`}>
              {copy.ctaBody}
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
            <span className="font-semibold text-[#e6edf2]">Strait Desk</span> · PhilSolution
          </div>
          <p className="m-0 max-w-[640px]">
            {copy.footer}
          </p>
        </div>
      </footer>
    </div>
  );
}
