"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { useAnyScroll } from "@/components/landing/LandingHip";
import { pick } from "@/components/landing/landingCopy";
import { EXTRA_BEATS, extraText } from "@/components/landing/extraData";
import { useLandingLanguage } from "@/lib/landingLanguage";

/**
 * 호외 — 가까운 공식 일정 6건을 신문 지면으로 넘겨 본다.
 *
 * - 데스크톱: 섹션이 화면에 붙는 동안 스크롤로 기사가 한 장씩 넘어간다.
 *   들어올 때는 "호외요" 하듯 빙글 돌며 커지고, 기사마다 도장이 쾅 찍힌다.
 * - 휴대폰·동작 줄이기: 붙지 않는다. 이전/다음 버튼이나 점을 눌러 넘긴다.
 *
 * 지면은 우리가 만든 화면이다(실제 신문 아님). 제호는 우리 이름을 쓰고, 기사 문장은 옮기지 않고 요약한다.
 */

const N = EXTRA_BEATS.length;

const RED = "#9b2a1c";

const DESK = { fontFamily: "var(--font-wanted), var(--font-geist-sans), sans-serif" } as const;
const PAPER = { fontFamily: "var(--font-letter-hand), Georgia, serif" } as const;
const SERIF = { fontFamily: "var(--font-merriweather), Georgia, serif" } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 좁은 화면에서는 가로를 줄여 글자가 작게 줄어들지 않게 하고, 날짜를 짧게 쓴다 */
function DatesList({ beat, onPick }: { beat: number; onPick: (i: number) => void }) {
  const lang = useLandingLanguage();
  return (
    <ol className="m-0 grid list-none gap-2 p-0">
      {EXTRA_BEATS.map((_, i) => {
        const row = extraText(i, lang);
        const on = i === beat;
        return (
          <li key={row.url}>
            <button
              type="button"
              onClick={() => onPick(i)}
              className="w-full rounded-sm border px-3 py-2 text-left"
              style={{ borderColor: on ? "#9b2a1c" : "rgba(26,21,14,.35)", background: on ? "rgba(155,42,28,.08)" : "transparent", ...PAPER }}
            >
              <span className="block text-caption font-bold" style={{ color: "#9b2a1c" }}>{row.tick}</span>
              <span className="block text-[16px] font-black leading-snug" style={{ color: "#1a150e" }}>{row.headline}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function ExtraEdition() {
  const lang = useLandingLanguage();
  const outerRef = useRef<HTMLDivElement>(null);
  const sentinels = useRef<(HTMLSpanElement | null)[]>([]);
  const [pin, setPin] = useState(false);
  const [p, setP] = useState(0);
  const [intro, setIntro] = useState(0);
  const [manual, setManual] = useState(0);

  useEffect(() => {
    const ok = !prefersReducedMotion() && window.matchMedia("(min-width: 1024px) and (min-height: 700px)").matches;
    setPin(ok);
  }, []);

  useAnyScroll(() => {
    if (!pin) return;
    const el = outerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    // 지면이 화면 아래에서 올라와 맨 위에 붙을 때까지 = 빙글 등장
    const a = clamp01((vh - r.top) / vh);
    // 붙어 있는 동안 = 기사 넘기기
    const b = clamp01(-r.top / Math.max(1, r.height - vh));
    setIntro((prev) => (Math.abs(prev - a) < 0.002 ? prev : a));
    setP((prev) => (Math.abs(prev - b) < 0.002 ? prev : b));
  });

  const beat = pin ? Math.min(N - 1, Math.floor(clamp01(p) * N)) : manual;
  const b = extraText(beat, lang);

  const go = (i: number) => {
    const t = Math.max(0, Math.min(N - 1, i));
    if (pin) sentinels.current[t]?.scrollIntoView({ block: "start", behavior: "smooth" });
    else setManual(t);
  };

  // 등장: 가운데 접힌 선에서 양쪽으로 사르륵 펼쳐진다 (섹션이 올라와 붙을 즈음 다 펼쳐짐)
  const open = clamp01((intro - 0.3) / 0.6);
  const eo = 1 - (1 - open) ** 3;
  const half = 50 * (1 - eo);
  const paperStyle = pin
    ? { clipPath: `inset(0 ${half.toFixed(2)}% 0 ${half.toFixed(2)}%)`, willChange: "clip-path" }
    : { transform: "rotate(-0.2deg)" };

  return (
    <section id="extra" className="relative border-y border-white/10 bg-[#081019]">
      <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-24">
        <p className="m-0 text-[14px] font-semibold tracking-[0.02em] text-[#5eead4]">
          {pick(lang, "공식 글에 적힌 일정", "Dates written in official texts")}
        </p>
        <h2 className="mb-0 mt-4 max-w-[860px] text-[clamp(30px,3.7vw,50px)] font-extrabold leading-[1.2] tracking-[-0.035em] text-white">
          {pick(lang, "다음 일정은 이렇게 이어집니다.", "The next dates run like this.")}
        </h2>
        <p className="mb-0 mt-5 max-w-[720px] text-[18px] leading-[1.75] text-[#a3b3bf]">
          {pick(
            lang,
            "선거와 당대회를 가까운 날부터 넘깁니다. 투표일이 없으면 그 글에 적힌 말만 둡니다. 우크라이나 대통령 선거는 그 일요일이 지났지만, 새 날짜가 나오기 전까지 남겨 둡니다.",
            "Elections and party congresses, nearest first. If no polling day is set, only the wording in the official text stays. Ukraine’s presidential Sunday has passed, and the line stays until a new date is set.",
          )}
        </p>
      </div>

      <div ref={outerRef} className="relative" style={{ height: pin ? `${100 + N * 55 + 30}vh` : undefined }}>
        {pin
          ? EXTRA_BEATS.map((_, i) => (
              <span
                key={i}
                ref={(el) => {
                  sentinels.current[i] = el;
                }}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 h-px w-px"
                style={{ top: `calc((100% - 100vh) * ${(i + 0.5) / N})` }}
              />
            ))
          : null}

        <div className={pin ? "sticky top-0 h-screen overflow-hidden" : "px-4 pb-24 pt-4 sm:px-6"}>
          <article
            className={pin ? "landing-paper relative h-full w-full" : "landing-paper mx-auto w-full max-w-[1080px] rounded-sm p-4 sm:p-7"}
            style={paperStyle}
            aria-label={pick(lang, "국가 중대 일정 호외", "Major dates extra")}
          >
            {pin ? (
              <>
                {/* 접은 자국: 가로 한 줄은 늘 보이고, 세로 가운데 선과 펼쳐지는 가장자리 그림자는 펼치는 동안만 */}
                <div aria-hidden="true" className="landing-crease pointer-events-none absolute inset-0" />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-[#1a150e]/40"
                  style={{ opacity: 1 - eo }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-16"
                  style={{ left: `${half}%`, opacity: 1 - eo, background: "linear-gradient(to right, rgba(40,28,8,.45), transparent)" }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-16"
                  style={{ right: `${half}%`, opacity: 1 - eo, background: "linear-gradient(to left, rgba(40,28,8,.45), transparent)" }}
                />
              </>
            ) : null}
            <div className={pin ? "relative mx-auto flex h-full max-w-[1320px] flex-col px-[clamp(24px,4vw,64px)] py-[clamp(14px,2.6vh,32px)]" : undefined}>
            {/* 제호 — 1950년대 신문 1면: 별 장식, 굵은 제호, 겹줄, 발행 줄 */}
            <header className="text-center">
              <div className="flex items-center justify-between gap-3 text-caption leading-snug" style={PAPER}>
                <span className="w-[22%] text-left font-bold tracking-[0.12em]">{pick(lang, "★ 호외 ★", "★ EXTRA ★")}</span>
                <span className="flex-1 text-center tracking-[0.18em]">EXTRA EDITION</span>
                <span className="w-[22%] text-right">{beat + 1} / {N}</span>
              </div>
              <h3
                className={`landing-ink m-0 mt-1 whitespace-nowrap font-black uppercase leading-[0.95] tracking-[0.02em] ${pin ? "text-[clamp(32px,min(6.4vw,8.6vh),96px)]" : "text-[clamp(28px,5.2vw,70px)]"}`}
                style={SERIF}
              >
                conflict-view
              </h3>
              <div className="mt-2 border-y-[3px] border-double border-[#1a150e] py-1 text-caption tracking-[0.06em]" style={PAPER}>
                {pick(
                  lang,
                  `★ 공식 일정 ★ ${b.caption} ★ ${b.tick} ★`,
                  `★ Official date ★ ${b.caption} ★ ${b.tick} ★`,
                )}
              </div>
            </header>

            <div className={`grid gap-6 pt-4 md:gap-8 ${pin ? "min-h-0 flex-1 md:grid-cols-[1.5fr_1fr]" : "md:grid-cols-[1.45fr_1fr]"}`}>
              {/* 기사 */}
              <div className="min-w-0">
                <div aria-live="polite">
                  <p className="m-0 text-[14px] font-bold tracking-[0.04em]" style={{ ...PAPER, color: RED }}>
                    {b.tick}
                  </p>
                  <h4
                    key={`h-${beat}`}
                    className={`landing-headline landing-ink m-0 mt-2 font-black leading-[1.2] tracking-[-0.03em] ${pin ? "text-[clamp(30px,min(4vw,6vh),60px)]" : "text-[clamp(28px,3.4vw,46px)]"}`}
                    style={PAPER}
                  >
                    {b.headline}
                  </h4>
                  <p
                    key={`n-${beat}`}
                    className={`landing-headline landing-ink m-0 mt-1 font-black leading-none tracking-[-0.03em] ${pin ? "text-[clamp(44px,min(6vw,9vh),104px)]" : "text-[clamp(40px,5vw,72px)]"}`}
                    style={{ ...SERIF, color: RED }}
                  >
                    {b.label}
                  </p>
                  <div className={`mt-3 grid gap-4 border-t-2 border-[#1a150e] pt-3 ${pin ? "sm:grid-cols-[auto_1fr]" : "sm:grid-cols-[1.05fr_1fr]"}`}>
                    <p className="m-0 text-[15px] font-bold leading-snug" style={PAPER}>
                      {b.caption}
                    </p>
                    <p
                      key={`s-${beat}`}
                      className={`landing-headline m-0 leading-[1.75] ${pin ? "text-[clamp(16px,2.2vh,21px)]" : "text-[16px]"}`}
                      style={PAPER}
                    >
                      {b.summary}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span key={`st-${beat}`} className="landing-stamp inline-block px-3 py-1.5 text-[14px] font-extrabold tracking-wide" style={DESK}>
                    {b.stamp}
                  </span>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] font-bold text-[#1a150e] underline decoration-[#9b2a1c] decoration-2 underline-offset-4 hover:text-[#9b2a1c]"
                  >
                    {pick(lang, "공식 글 열기 ↗", "Open the official text ↗")}
                  </a>
                </div>
                {b.stampNote ? (
                  <p className="m-0 mt-2 text-caption italic" style={PAPER}>
                    ※ {b.stampNote}
                  </p>
                ) : null}
              </div>

              {/* 인쇄 그래프 */}
              <div className="min-w-0 border-t border-[#1a150e]/40 pt-3 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                <p className="m-0 mb-1 text-[14px] font-bold" style={PAPER}>
                  {pick(lang, "이 지면의 일정", "Dates on this page")}
                </p>
                <DatesList beat={beat} onPick={go} />
                <p className="m-0 mt-1 text-caption leading-snug" style={PAPER}>
                  {pick(
                    lang,
                    "줄을 누르면 그 일정으로 넘어갑니다. 투표일이 없는 나라는 그 글의 말만 적습니다.",
                    "Choose a line to open that date. Where no polling day is set, only the official wording is shown.",
                  )}
                </p>
              </div>
            </div>

            {/* 넘기기 */}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#1a150e]/50 pt-3">
              <div className="flex items-center gap-2" role="group" aria-label={pick(lang, "기사 넘기기", "Next report")}>
                {EXTRA_BEATS.map((_, i) => {
                  const x = extraText(i, lang);
                  return (
                  <button
                    key={x.tick}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={pick(lang, `${i + 1}번째 기사, ${x.tick}`, `Report ${i + 1}, ${x.tick}`)}
                    aria-current={i === beat ? "true" : undefined}
                    className={`h-3 rounded-full border border-[#1a150e] transition-all ${i === beat ? "w-8 bg-[#9b2a1c] border-[#9b2a1c]" : "w-3 bg-transparent hover:bg-[#1a150e]/40"}`}
                  />
                  );
                })}
              </div>
              {!pin ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => go(beat - 1)}
                    disabled={beat === 0}
                    className="rounded border border-[#1a150e] px-3 py-1.5 text-[14px] font-bold disabled:opacity-30"
                    style={PAPER}
                  >
                    {pick(lang, "◀ 이전", "◀ Previous")}
                  </button>
                  <button
                    type="button"
                    onClick={() => go(beat + 1)}
                    disabled={beat === N - 1}
                    className="rounded border border-[#1a150e] bg-[#1a150e] px-3 py-1.5 text-[14px] font-bold text-[#ecdfbd] disabled:opacity-30"
                    style={PAPER}
                  >
                    {pick(lang, "다음 ▶", "Next ▶")}
                  </button>
                </div>
              ) : (
                <span className="text-caption lg:mr-[150px]" style={PAPER}>
                  {pick(lang, "스크롤하면 다음 속보가 넘어갑니다", "Scroll for the next report")}
                </span>
              )}
            </div>

            <p className="m-0 mt-3 border-t-2 border-[#1a150e] pt-2 text-caption leading-snug" style={PAPER}>
              {pick(
                lang,
                "이 지면은 conflict-view가 공식 글을 요약해 만든 화면이며 실제 신문이 아닙니다. 본문은 그 링크에 있습니다.",
                "This page is a conflict-view summary of official texts, not a real newspaper. The full text is at the link.",
              )}
            </p>
          </div>
          </article>
        </div>
      </div>
    </section>
  );
}
