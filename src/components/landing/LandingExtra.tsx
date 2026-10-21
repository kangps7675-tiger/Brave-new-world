"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { useAnyScroll } from "@/components/landing/LandingHip";
import { EXTRA_BEATS, EXTRA_CHART_LABEL } from "@/components/landing/extraData";
import { ExtraPhoto } from "@/components/landing/LandingExtraPhoto";

/**
 * 호외 — 호르무즈 전쟁위험 보험료 보도 6건을 신문 지면으로 넘겨 본다.
 *
 * - 데스크톱: 섹션이 화면에 붙는 동안 스크롤로 기사가 한 장씩 넘어간다.
 *   들어올 때는 "호외요" 하듯 빙글 돌며 커지고, 기사마다 도장이 쾅 찍히고, 인쇄 그래프에 점이 하나씩 찍힌다.
 * - 휴대폰·동작 줄이기: 붙지 않는다. 이전/다음 버튼이나 점을 눌러 넘긴다.
 *
 * 지면은 우리가 만든 화면이다(실제 신문 아님). 제호는 우리 이름을 쓰고, 기사 문장은 옮기지 않고 요약한다.
 */

const N = EXTRA_BEATS.length;
const MIN = 0;
const MAX = 10; // 그래프 세로축(%)

const INK = "#1a150e";
const RED = "#9b2a1c";

const GMARKET = { fontFamily: "var(--font-gmarket), var(--font-geist-sans), sans-serif" } as const;
const BATANG = { fontFamily: "var(--font-letter-hand), 'Noto Serif KR', serif" } as const;
const SERIF = { fontFamily: "var(--font-merriweather), Georgia, serif" } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 좁은 화면에서는 가로를 줄여 글자가 작게 줄어들지 않게 하고, 날짜를 짧게 쓴다 */
const shortTick = (t: string) => t.replace(/(\d+)월 (\d+)일/, "$1/$2");

function Chart({ beat, onPick, narrow }: { beat: number; onPick: (i: number) => void; narrow: boolean }) {
  const W = narrow ? 360 : 430;
  const H = narrow ? 340 : 360;
  const left = narrow ? 46 : 54;
  const right = narrow ? 14 : 18;
  const top = 52;
  const bottom = narrow ? 46 : 54;
  const pw = W - left - right;
  const ph = H - top - bottom;
  const x = (i: number) => left + (i + 0.5) * (pw / N);
  const y = (v: number) => top + (1 - (v - MIN) / (MAX - MIN)) * ph;
  const mid = (i: number) => (EXTRA_BEATS[i].lo + EXTRA_BEATS[i].hi) / 2;

  const line: string[] = [];
  for (let i = 0; i <= beat; i++) line.push(`${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(mid(i)).toFixed(1)}`);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={EXTRA_CHART_LABEL} className="block h-auto w-full">
      {[0, 2, 4, 6, 8, 10].map((v) => (
        <g key={v}>
          <line x1={left} x2={W - right} y1={y(v)} y2={y(v)} stroke={INK} strokeOpacity={v === 0 ? 0.7 : 0.22} strokeDasharray={v === 0 ? undefined : "2 5"} />
          <text x={left - 9} y={y(v) + 5} textAnchor="end" fontSize={15} fill={INK} fillOpacity={0.75} style={SERIF}>
            {v}%
          </text>
        </g>
      ))}
      {EXTRA_BEATS.map((b, i) => (
        <text key={b.tick} x={x(i)} y={H - bottom + 26} textAnchor="middle" fontSize={15} fill={INK} fillOpacity={i <= beat ? 0.9 : 0.4} style={BATANG}>
          {shortTick(b.tick)}
        </text>
      ))}
      {/* 기사 사이를 잇는 점선 — 흐름을 보기 위한 선일 뿐, 그 사이 시세는 없다 */}
      <path d={line.join(" ")} fill="none" stroke={INK} strokeOpacity={0.5} strokeWidth={1.6} strokeDasharray="4 6" />
      {EXTRA_BEATS.map((b, i) => {
        if (i > beat) return null;
        const cur = i === beat;
        const cx = x(i);
        const range = b.hi > b.lo;
        const ry = range ? Math.max(24, (y(b.lo) - y(b.hi)) / 2 + 14) : 20;
        // 값 글자는 빨간 동그라미 위로 비켜 놓는다
        const labelY = cur ? Math.min(y(b.hi) - 18, y(mid(i)) - ry - 8) : y(b.hi) - 18;
        return (
          <g
            key={b.tick}
            role="button"
            tabIndex={0}
            aria-label={`${b.tick} ${b.approx ? "약 " : ""}${b.label} 기사 보기`}
            className="cursor-pointer outline-none [&:focus-visible_circle:last-child]:stroke-[#9b2a1c]"
            onClick={() => onPick(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick(i);
              }
            }}
          >
            <g className="landing-dot-in">
              {range ? (
                <>
                  <line x1={cx} x2={cx} y1={y(b.lo)} y2={y(b.hi)} stroke={INK} strokeWidth={9} strokeLinecap="round" />
                  <circle cx={cx} cy={y(mid(i))} r={3.5} fill="#ecdfbd" />
                </>
              ) : (
                <circle cx={cx} cy={y(b.lo)} r={8} fill={INK} />
              )}
              <text x={cx} y={labelY} textAnchor="middle" fontSize={cur ? 22 : 17} fill={cur ? RED : INK} style={GMARKET}>
                {b.approx ? "약 " : ""}
                {b.label}
              </text>
            </g>
            {/* 지금 보는 기사: 빨간 펜 동그라미 */}
            {cur ? (
              <ellipse
                key={`ring-${beat}`}
                className="landing-pen"
                cx={cx}
                cy={y(mid(i))}
                rx={range ? 22 : 20}
                ry={ry}
                fill="none"
                stroke={RED}
                strokeWidth={3}
                strokeLinecap="round"
                transform={`rotate(-8 ${cx} ${y(mid(i))})`}
              />
            ) : null}
            <circle cx={cx} cy={y(mid(i))} r={26} fill="transparent" stroke="transparent" strokeWidth={2} />
          </g>
        );
      })}
    </svg>
  );
}

export function ExtraEdition() {
  const outerRef = useRef<HTMLDivElement>(null);
  const sentinels = useRef<(HTMLSpanElement | null)[]>([]);
  const [pin, setPin] = useState(false);
  const [p, setP] = useState(0);
  const [intro, setIntro] = useState(0);
  const [manual, setManual] = useState(0);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const ok = !prefersReducedMotion() && window.matchMedia("(min-width: 1024px) and (min-height: 640px)").matches;
    setPin(ok);
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
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
  const b = EXTRA_BEATS[beat];

  const go = (i: number) => {
    const t = Math.max(0, Math.min(N - 1, i));
    if (pin) sentinels.current[t]?.scrollIntoView({ block: "start", behavior: "smooth" });
    else setManual(t);
  };

  // 등장: 작고 투명한 채로 빙글 돌며 커진다
  const e = 1 - (1 - intro) ** 3;
  const paperStyle = pin
    ? {
        transform: `scale(${0.1 + 0.9 * e}) rotate(${(1 - e) * -720 - 0.6}deg)`,
        opacity: Math.min(1, intro * 2.6),
        willChange: "transform, opacity",
      }
    : { transform: "rotate(-0.2deg)" };

  return (
    <section id="extra" className="relative border-y border-white/10 bg-[#081019]">
      <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-24">
        <p className="m-0 text-[14px] font-semibold tracking-[0.02em] text-[#5eead4]">공개 보도로 본 보험료</p>
        <h2 className="mb-0 mt-4 max-w-[860px] text-[clamp(30px,3.7vw,50px)] font-extrabold leading-[1.2] tracking-[-0.035em] text-white">
          전쟁위험 보험료, 이렇게 널뛰었습니다.
        </h2>
        <p className="mb-0 mt-5 max-w-[720px] text-[18px] leading-[1.75] text-[#a3b3bf]">
          호르무즈를 지날 때 내는 보험료는 전쟁 전 0.25% 안팎에서 한때 10%까지 올랐고, 휴전에 내렸다가 다시 올랐습니다.
          공개 시세가 없는 숫자라서 우리는 기사에서 뽑아 날짜순으로 쌓고, 점마다 근거 기사를 붙여 둡니다.
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

        <div className={pin ? "sticky top-0 flex h-screen items-center justify-center overflow-hidden px-6" : "px-4 pb-24 pt-4 sm:px-6"}>
          <article className="landing-paper mx-auto w-full max-w-[1080px] rounded-sm p-4 sm:p-7" style={paperStyle} aria-label="호르무즈 전쟁위험 보험료 호외">
            {/* 제호 — 1950년대 신문 1면: 별 장식, 굵은 제호, 겹줄, 발행 줄 */}
            <header className="text-center">
              <div className="flex items-center justify-between gap-3 text-caption leading-snug" style={BATANG}>
                <span className="w-[22%] text-left font-bold tracking-[0.12em]">★ 호외 ★</span>
                <span className="flex-1 text-center tracking-[0.18em]">EXTRA EDITION</span>
                <span className="w-[22%] text-right">{beat + 1} / {N}</span>
              </div>
              <h3
                className="landing-ink m-0 mt-1 whitespace-nowrap text-[clamp(28px,5.2vw,70px)] font-black uppercase leading-[0.95] tracking-[0.02em]"
                style={SERIF}
              >
                Brave New World
              </h3>
              <div className="mt-2 border-y-[3px] border-double border-[#1a150e] py-1 text-caption tracking-[0.06em]" style={BATANG}>
                ★ 해운 위험 속보 ★ 호르무즈 해협 · 전쟁위험 보험료 ★ {b.tick} 보도 ★
              </div>
            </header>

            <div className="grid gap-6 pt-4 md:grid-cols-[1.45fr_1fr] md:gap-6">
              {/* 기사 */}
              <div className="min-w-0">
                <div aria-live="polite">
                  <p className="m-0 text-[14px] font-bold tracking-[0.04em]" style={{ ...BATANG, color: RED }}>
                    {b.tick} 보도
                  </p>
                  <h4
                    key={`h-${beat}`}
                    className="landing-headline landing-ink m-0 mt-2 text-[clamp(28px,3.4vw,46px)] font-black leading-[1.2] tracking-[-0.03em]"
                    style={BATANG}
                  >
                    {b.headline}
                  </h4>
                  <p
                    key={`n-${beat}`}
                    className="landing-headline landing-ink m-0 mt-1 text-[clamp(40px,5vw,72px)] font-black leading-none tracking-[-0.03em]"
                    style={{ ...SERIF, color: RED }}
                  >
                    {b.approx ? <span className="mr-2 align-middle text-[0.3em] font-bold text-[#1a150e]">약</span> : null}
                    {b.label}
                  </p>
                  <div className="mt-3 grid gap-4 border-t-2 border-[#1a150e] pt-3 sm:grid-cols-[0.95fr_1fr]">
                    <figure key={`p-${beat}`} className="landing-headline m-0">
                      <div className="landing-photo">
                        <div className="landing-photo-in">
                          <ExtraPhoto scene={b.scene} />
                        </div>
                      </div>
                      <figcaption className="mt-1 text-caption leading-snug" style={BATANG}>
                        ▲ {b.caption} <span className="whitespace-nowrap">(편집부 일러스트)</span>
                      </figcaption>
                    </figure>
                    <p
                      key={`s-${beat}`}
                      className="landing-headline m-0 text-[16px] leading-[1.75]"
                      style={BATANG}
                    >
                      {b.summary}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span key={`st-${beat}`} className="landing-stamp inline-block px-3 py-1.5 text-[14px] font-extrabold tracking-wide" style={GMARKET}>
                    {b.stamp}
                  </span>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] font-bold text-[#1a150e] underline decoration-[#9b2a1c] decoration-2 underline-offset-4 hover:text-[#9b2a1c]"
                  >
                    원문 기사 보기 ↗
                  </a>
                </div>
                {b.stampNote ? (
                  <p className="m-0 mt-2 text-caption italic" style={BATANG}>
                    ※ {b.stampNote}
                  </p>
                ) : null}
              </div>

              {/* 인쇄 그래프 */}
              <div className="min-w-0 border-t border-[#1a150e]/40 pt-3 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                <p className="m-0 mb-1 text-[14px] font-bold" style={BATANG}>
                  기사에 나온 전쟁위험 보험료율(%)
                </p>
                <Chart beat={beat} onPick={go} narrow={narrow} />
                <p className="m-0 mt-1 text-caption leading-snug" style={BATANG}>
                  세로 막대는 기사에 적힌 범위, 점은 기사에 적힌 값입니다. 점을 잇는 점선은 흐름을 보려는 선일 뿐, 그 사이 시세가 있다는 뜻이 아닙니다.
                </p>
              </div>
            </div>

            {/* 넘기기 */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#1a150e]/50 pt-3">
              <div className="flex items-center gap-2" role="group" aria-label="기사 넘기기">
                {EXTRA_BEATS.map((x, i) => (
                  <button
                    key={x.tick}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`${i + 1}번째 기사, ${x.tick}`}
                    aria-current={i === beat ? "true" : undefined}
                    className={`h-3 rounded-full border border-[#1a150e] transition-all ${i === beat ? "w-8 bg-[#9b2a1c] border-[#9b2a1c]" : "w-3 bg-transparent hover:bg-[#1a150e]/40"}`}
                  />
                ))}
              </div>
              {!pin ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => go(beat - 1)}
                    disabled={beat === 0}
                    className="rounded border border-[#1a150e] px-3 py-1.5 text-[14px] font-bold disabled:opacity-30"
                    style={BATANG}
                  >
                    ◀ 이전
                  </button>
                  <button
                    type="button"
                    onClick={() => go(beat + 1)}
                    disabled={beat === N - 1}
                    className="rounded border border-[#1a150e] bg-[#1a150e] px-3 py-1.5 text-[14px] font-bold text-[#ecdfbd] disabled:opacity-30"
                    style={BATANG}
                  >
                    다음 ▶
                  </button>
                </div>
              ) : (
                <span className="text-caption" style={BATANG}>
                  스크롤하면 다음 속보가 넘어갑니다
                </span>
              )}
            </div>

            <p className="m-0 mt-3 border-t-2 border-[#1a150e] pt-2 text-caption leading-snug" style={BATANG}>
              이 지면은 Brave New World가 공개 보도를 요약해 만든 화면이며 실제 신문이 아닙니다. 보험료율은 기사마다 기준(선가 대비 여부 등)이 달라 서로 단순 비교할 수 없습니다.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
