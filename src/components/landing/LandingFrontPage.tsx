"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { pick } from "@/components/landing/landingCopy";
import { useLandingLanguage } from "@/lib/landingLanguage";
import { BRAND_NAME } from "@/lib/brand";

/**
 * 오늘의 지정학 1면 — 주 4회 오게 될 이메일 브리핑이 이런 모양이라는 예시 지면.
 * 머리기사 한 건(확인 상태 도장 + 출처), 단신 둘, 출처끼리 어긋난 숫자 칸, 준비 중인 칸으로 구성한다.
 * 실제 신문이 아니라 우리가 만든 화면이고, 사건도 과정을 보여 주려는 가상의 예시다(지면에 그렇게 적는다).
 * 스크롤로 지면이 화면에 들어오면 도장이 찍힌다. 자동 재생은 하지 않는다(히어로 지구본과 겹쳐 산만해지지 않게).
 */

const INK = "#1a150e";
const PAPER = "#f1e8cf";
const RED = "#9b2a1c";
const GREEN = "#1f5d4a";
const AMBER = "#8a5a12";

const SERIF = { fontFamily: "var(--font-merriweather), 'Noto Serif KR', Georgia, serif" } as const;

function useSeen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, seen };
}

function Stamp({ on, color, children, delay = 0 }: { on: boolean; color: string; children: React.ReactNode; delay?: number }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-[15px] font-extrabold tracking-[0.06em] ${on ? "landing-stamp" : "opacity-0"}`}
      style={{ color, borderColor: color, animationDelay: `${delay}ms` }}
    >
      {children}
    </span>
  );
}

export function LandingFrontPage() {
  const lang = useLandingLanguage();
  const { ref, seen } = useSeen<HTMLDivElement>();
  const ko = lang !== "en";

  return (
    <div
      ref={ref}
      className="mx-auto max-w-[1040px] rounded-sm shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
      style={{ background: PAPER, color: INK, transform: "rotate(-0.25deg)" }}
      role="img"
      aria-label={pick(lang, "오늘의 지정학 1면 예시 지면", "Example front page of today’s geopolitics")}
    >
      <div className="px-5 pb-6 pt-5 sm:px-8">
        {/* 제호 */}
        <div className="border-b-[3px] border-double pb-3 text-center" style={{ borderColor: INK }}>
          <p className="m-0 text-micro font-semibold tracking-[0.3em]" style={{ color: RED }}>
            {pick(lang, "예시 지면 · 실제 사건 아님", "EXAMPLE PAGE · NOT A REAL EVENT")}
          </p>
          <p className="m-0 mt-1 text-[clamp(30px,5vw,52px)] font-black leading-none tracking-[-0.02em]" style={SERIF}>
            {BRAND_NAME[ko ? "ko" : "en"]}
          </p>
          <p className="m-0 mt-1.5 text-meta tracking-[0.2em]" style={{ color: `${INK}b0` }}>
            {pick(lang, "오늘의 지정학 1면 · 근거로 확인한 속보", "TODAY’S GEOPOLITICS · ALERTS CHECKED AGAINST EVIDENCE")}
          </p>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-[1.7fr_1fr]">
          {/* 머리기사 */}
          <article className="min-w-0 md:border-r md:pr-6" style={{ borderColor: `${INK}40` }}>
            <p className="m-0 text-meta font-bold tracking-[0.12em]" style={{ color: RED }}>
              {pick(lang, "머리기사 · ○○ 지역", "LEAD · REGION ○○")}
            </p>
            <h3 className="mb-0 mt-2 text-[clamp(24px,3.2vw,38px)] font-black leading-[1.2] tracking-[-0.02em]" style={SERIF}>
              {pick(lang, "정유시설 폭발, 위성 열 감지와 통신사 보도가 일치", "Refinery blast: wire report and satellite heat detection agree")}
            </h3>
            <div className="mt-3">
              <Stamp on={seen} color={AMBER} delay={250}>
                {pick(lang, "유력", "LIKELY")}
              </Stamp>
            </div>
            <p className="mb-0 mt-3 text-[15px] leading-[1.75]" style={{ color: `${INK}e0` }}>
              {pick(
                lang,
                "SNS에서 퍼진 ‘큰 폭발’ 주장을 독립된 세 출처와 맞춰 봤다. 시설과 새벽 시각, 해당 좌표의 새 열원이 맞아 ‘유력’으로 올렸다. 사상자 수는 출처마다 달라 확정하지 않았다.",
                "We checked a viral claim of a ‘major explosion’ against three independent sources. Facility, early-morning time, and a new heat source at the coordinates line up, so it is marked likely. Casualty figures differ by source and are not settled.",
              )}
            </p>
            <ul className="m-0 mt-3 list-none p-0 text-caption leading-[1.9]">
              <li>
                <b style={{ color: GREEN }}>✓</b> {pick(lang, "통신사 A — 같은 시설·시각", "Wire service A — same facility and time")}
              </li>
              <li>
                <b style={{ color: AMBER }}>△</b> {pick(lang, "현지 매체 B — 시각이 한 시간 늦음", "Local outlet B — time an hour later")}
              </li>
              <li>
                <b style={{ color: GREEN }}>✓</b> {pick(lang, "위성 열 감지 — 해당 좌표 새 열원", "Satellite heat detection — new heat source at the coordinates")}
              </li>
            </ul>
          </article>

          {/* 단신 */}
          <aside className="flex min-w-0 flex-col gap-5">
            <article>
              <p className="m-0 text-micro font-bold tracking-[0.12em]" style={{ color: RED }}>
                {pick(lang, "단신 · △△ 해협", "BRIEF · △△ STRAIT")}
              </p>
              <h4 className="mb-0 mt-1 text-[17px] font-extrabold leading-snug" style={SERIF}>
                {pick(lang, "상선 피습 경보, 선박은 아직 특정 안 돼", "Merchant ship attack alert; vessel not yet identified")}
              </h4>
              <div className="mt-2">
                <Stamp on={seen} color={AMBER} delay={550}>
                  {pick(lang, "유력", "LIKELY")}
                </Stamp>
              </div>
            </article>
            <article className="border-t pt-4" style={{ borderColor: `${INK}40` }}>
              <p className="m-0 text-micro font-bold tracking-[0.12em]" style={{ color: RED }}>
                {pick(lang, "단신 · □□ 접경", "BRIEF · □□ BORDER")}
              </p>
              <h4 className="mb-0 mt-1 text-[17px] font-extrabold leading-snug" style={SERIF}>
                {pick(lang, "‘포격이 있었다’는 한쪽 주장뿐", "Only one side says shelling took place")}
              </h4>
              <div className="mt-2">
                <Stamp on={seen} color="#5a5247" delay={850}>
                  {pick(lang, "자료 없음", "NO DATA")}
                </Stamp>
              </div>
            </article>
          </aside>
        </div>

        {/* 어긋남 + 준비 중 */}
        <div className="mt-6 grid gap-4 border-t-[3px] border-double pt-4 md:grid-cols-[1.7fr_1fr]" style={{ borderColor: INK }}>
          <div>
            <p className="m-0 text-meta font-bold tracking-[0.12em]" style={{ color: RED }}>
              {pick(lang, "출처끼리 어긋난 곳", "WHERE SOURCES DISAGREE")}
            </p>
            <div className="mt-2 grid grid-cols-[1fr_auto_auto] items-center gap-x-5 gap-y-1 text-[14px]">
              <span style={{ color: `${INK}b0` }}>{pick(lang, "사상자 수", "Casualties")}</span>
              <span>
                <b>A</b> {pick(lang, "3명", "3")}
              </span>
              <span>
                <b>B</b> {pick(lang, "12명", "12")}
              </span>
            </div>
            <p className="mb-0 mt-2 text-caption" style={{ color: `${INK}c0` }}>
              {pick(lang, "맞는 쪽을 고르지 않고 둘 다 싣는다.", "We do not pick a side. Both are printed.")}
            </p>
          </div>
          <div className="rounded-sm border border-dashed px-3 py-2" style={{ borderColor: `${INK}70` }}>
            <p className="m-0 text-micro font-bold tracking-[0.12em]" style={{ color: GREEN }}>
              {pick(lang, "준비 중", "IN PREPARATION")}
            </p>
            <p className="mb-0 mt-1 text-caption leading-snug" style={{ color: `${INK}d0` }}>
              {pick(lang, "다음 분기점까지 남은 날 · 시나리오 갈래", "Days to the next turning point · scenario branches")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
