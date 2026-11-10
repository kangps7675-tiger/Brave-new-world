"use client";

import { useEffect, useRef, useState } from "react";
import { pick } from "@/components/landing/landingCopy";
import { useLandingLanguage } from "@/lib/landingLanguage";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * 「속보 하나를 이용자가 직접 교차검증하는 과정」을 순서대로 반복 재생하는 예시.
 * 왼쪽은 단계 목록, 오른쪽은 검증 보드. 단계가 넘어갈 때마다 보드에 근거가 하나씩 쌓인다.
 * 예시 속보는 실제 사건이 아니라 과정을 보여 주려고 만든 가상의 사례다(화면에 그렇게 적는다).
 * 6·7단계(직접 판정)는 아직 화면에 없는 기능이라 「준비 중」 표시를 붙인다.
 * 동작 줄이기 설정이면 움직이지 않고 마지막 상태로 고정한다. 보이지 않거나 마우스가 올라가 있으면 멈춘다.
 */

type Step = { t: [string, string]; d: [string, string]; soon?: boolean };

const STEPS: Step[] = [
  {
    t: ["속보가 들어옵니다", "An alert comes in"],
    d: ["아직 아무것도 확인되지 않은 상태입니다. 일단 ‘주장’으로만 둡니다.", "Nothing is confirmed yet. It is held as a claim."],
  },
  {
    t: ["원문 출처를 찾습니다", "Find the original source"],
    d: ["누가 처음 말했는지, 그 사람이나 매체가 믿을 만한지 봅니다.", "Who said it first, and is that person or outlet reliable."],
  },
  {
    t: ["독립된 출처와 맞춰 봅니다", "Compare with independent sources"],
    d: ["서로 베끼지 않은 다른 매체, 위성 열 감지, 공식 발표를 한 줄씩 대조합니다.", "Other outlets that did not copy each other, satellite heat detection, official statements, one line at a time."],
  },
  {
    t: ["장소와 시각을 겹쳐 봅니다", "Overlay place and time"],
    d: ["출처마다 말하는 위치와 시각이 지도와 시간선 위에서 겹치는지 확인합니다.", "Do the places and times each source gives line up on the map and the timeline."],
  },
  {
    t: ["어긋나는 점을 표시합니다", "Mark what does not match"],
    d: ["맞는 것만 모으지 않습니다. 출처끼리 다른 숫자와 표현은 그대로 드러냅니다.", "Not only what agrees. Numbers and wording that differ between sources stay visible."],
  },
  {
    t: ["내가 먼저 판정해 봅니다", "Judge it yourself first"],
    d: ["‘확인·유력·자료 없음’ 중에서 근거만 보고 직접 고릅니다.", "Pick confirmed, likely, or no data, from the evidence alone."],
    soon: true,
  },
  {
    t: ["서비스의 판정과 비교합니다", "Compare with the desk’s call"],
    d: ["같으면 왜 같은지, 다르면 어느 근거를 다르게 봤는지만 보여 줍니다. 점수는 없습니다.", "If they match, why. If not, which evidence you weighed differently. No score."],
    soon: true,
  },
];

const STEP_MS = 3000;
const END_HOLD_MS = 4200;

type Tone = "ok" | "warn" | "bad";
const TONE: Record<Tone, string> = {
  ok: "border-[#0f766e]/60 bg-[#0f766e]/12 text-[#5eead4]",
  warn: "border-[#a16207]/60 bg-[#a16207]/14 text-[#fcd34d]",
  bad: "border-[#b91c1c]/60 bg-[#b91c1c]/14 text-[#fca5a5]",
};

function Row({ show, tone, mark, src, line }: { show: boolean; tone: Tone; mark: string; src: string; line: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-md border px-3 py-2 transition-all duration-500 ${TONE[tone]} ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <span className="mt-px w-4 flex-none text-center font-bold" aria-hidden="true">
        {mark}
      </span>
      <span className="min-w-0 text-[13px] leading-snug">
        <b className="text-white">{src}</b>
        <span className="text-[#d7e0e6]"> — {line}</span>
      </span>
    </div>
  );
}

export function CrossCheckDemo() {
  const lang = useLandingLanguage();
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const last = STEPS.length - 1;

  useEffect(() => {
    const r = prefersReducedMotion();
    setReduced(r);
    if (r) setStep(last);
  }, [last]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      visibleRef.current = e?.isIntersecting ?? true;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 멈춘 동안(마우스가 올라가 있거나 화면 밖)에는 같은 단계에서 다시 기다린다
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(
      () => {
        if (pausedRef.current || !visibleRef.current || document.hidden) {
          setWait((n) => n + 1);
          return;
        }
        setStep((s) => (s >= last ? 0 : s + 1));
      },
      step >= last ? END_HOLD_MS : STEP_MS,
    );
    return () => window.clearTimeout(id);
  }, [step, reduced, last, wait]);

  const at = (n: number) => step >= n;
  const status =
    step >= 5
      ? { tone: "ok" as Tone, label: pick(lang, "유력", "Likely") }
      : step >= 2
        ? { tone: "warn" as Tone, label: pick(lang, "대조 중", "Checking") }
        : { tone: "bad" as Tone, label: pick(lang, "주장 · 미확인", "Claim · unchecked") };

  return (
    <div
      ref={wrapRef}
      className="lg:flex lg:gap-12"
      onPointerEnter={() => {
        pausedRef.current = true;
      }}
      onPointerLeave={() => {
        pausedRef.current = false;
      }}
    >
      <ol className="m-0 flex min-w-0 list-none flex-col gap-1 p-0 lg:flex-[1_1_320px]" aria-label={pick(lang, "교차검증 단계", "Cross-check steps")}>
        {STEPS.map((s, i) => {
          const on = i === step;
          const done = i < step;
          return (
            <li key={s.t[0]}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={on ? "step" : undefined}
                className={`flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-left font-[inherit] transition-colors ${
                  on ? "border-[#f5c451]/50 bg-[#f5c451]/8" : "border-transparent bg-transparent hover:bg-white/[0.04]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-[12px] font-bold ${
                    done ? "bg-[#0f766e] text-white" : on ? "bg-[#f5c451] text-[#05080d]" : "border border-white/20 text-[#8fa3b1]"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[16px] font-bold leading-snug ${on ? "text-white" : done ? "text-[#c9d5dd]" : "text-[#8fa3b1]"}`}>
                    {pick(lang, s.t[0], s.t[1])}
                    {s.soon ? (
                      <span className="ml-2 rounded-full border border-dashed border-[#5eead4]/60 px-2 py-px align-middle text-micro font-semibold text-[#5eead4]">
                        {pick(lang, "준비 중", "Coming")}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`block overflow-hidden text-[14px] leading-relaxed text-[#a3b3bf] transition-all duration-500 ${
                      on ? "mt-1 max-h-24 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    {pick(lang, s.d[0], s.d[1])}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 min-w-0 lg:mt-0 lg:flex-[1.3_1_400px]">
        <div className="rounded-xl border border-white/12 bg-[#0a141f] p-4 sm:p-5" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-micro text-[#8fa3b1]">
              {pick(lang, "예시 속보 · 실제 사건 아님", "Example alert · not a real event")}
            </span>
            <span className={`rounded-full border px-3 py-1 text-[13px] font-bold transition-colors duration-500 ${TONE[status.tone]}`}>{status.label}</span>
          </div>
          <p className="mb-0 mt-3 text-[17px] font-bold leading-snug text-white">
            {pick(lang, "“○○ 지역 정유시설에서 큰 폭발이 났다”는 SNS 게시물", "“A major explosion at a refinery in region ○○,” says a social media post")}
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <Row
              show={at(1)}
              tone="ok"
              mark="✓"
              src={pick(lang, "통신사 A", "Wire service A")}
              line={pick(lang, "같은 시설, 현지 시각 새벽 2시경이라고 보도", "reports the same facility, around 2 a.m. local time")}
            />
            <Row
              show={at(2)}
              tone="warn"
              mark="△"
              src={pick(lang, "현지 매체 B", "Local outlet B")}
              line={pick(lang, "폭발은 확인, 시각은 한 시간 늦게 적음", "confirms an explosion, gives a time an hour later")}
            />
            <Row
              show={at(2)}
              tone="ok"
              mark="✓"
              src={pick(lang, "위성 열 감지", "Satellite heat detection")}
              line={pick(lang, "해당 좌표에서 새 열원이 잡힘", "a new heat source at those coordinates")}
            />
          </div>

          <div
            className={`mt-3 grid grid-cols-2 gap-3 overflow-hidden transition-all duration-500 ${
              at(3) ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="relative h-28 overflow-hidden rounded-md border border-white/10 bg-[#05080d]">
              <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden="true">
                <path d="M0 60 C30 50 50 66 80 54 S110 56 120 50 V80 H0Z" fill="#14344d" />
                <circle cx="62" cy="38" r="18" fill="none" stroke="#5eead4" strokeDasharray="3 3" />
                <circle cx="62" cy="38" r="3.5" fill="#f87171" />
                <circle cx="66" cy="34" r="2.5" fill="#fcd34d" />
                <circle cx="58" cy="41" r="2.5" fill="#5eead4" />
              </svg>
              <span className="absolute bottom-1 left-2 text-micro text-[#8fa3b1]">{pick(lang, "세 출처의 위치", "Three sources’ locations")}</span>
            </div>
            <div className="flex h-28 flex-col justify-center gap-2 rounded-md border border-white/10 bg-[#05080d] px-3">
              {[
                ["A", 22, "#5eead4"],
                ["B", 34, "#fcd34d"],
                ["IR", 24, "#5eead4"],
              ].map(([k, x, c]) => (
                <div key={String(k)} className="relative h-3 rounded bg-white/8">
                  <span className="absolute left-1 top-[-1px] text-[9px] text-[#8fa3b1]">{k}</span>
                  <span className="absolute top-0 h-3 w-3 rounded-full" style={{ left: `${x}%`, background: String(c) }} />
                </div>
              ))}
              <span className="text-micro text-[#8fa3b1]">{pick(lang, "시각이 한 시간 안에 모임", "Times fall within an hour")}</span>
            </div>
          </div>

          <div
            className={`mt-3 overflow-hidden rounded-md border border-[#b91c1c]/50 bg-[#b91c1c]/10 px-3 transition-all duration-500 ${
              at(4) ? "max-h-24 py-2 opacity-100" : "max-h-0 border-transparent py-0 opacity-0"
            }`}
          >
            <p className="m-0 text-[13px] leading-snug text-[#fca5a5]">
              <b>{pick(lang, "어긋남", "Mismatch")}</b>{" "}
              {pick(lang, "사상자 수: A 3명 · B 12명 → 확정하지 않고 둘 다 표시", "Casualties: A says 3, B says 12 → not settled, both shown")}
            </p>
          </div>

          <div
            className={`mt-3 overflow-hidden transition-all duration-500 ${at(5) ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
          >
            <div className="rounded-md border border-dashed border-white/20 px-3 py-2">
              <p className="m-0 text-micro text-[#8fa3b1]">{pick(lang, "내 판정 (준비 중인 기능의 예시)", "Your call (example of a feature in preparation)")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  [pick(lang, "확인", "Confirmed"), false],
                  [pick(lang, "유력", "Likely"), true],
                  [pick(lang, "자료 없음", "No data"), false],
                ].map(([l, sel]) => (
                  <span
                    key={String(l)}
                    className={`rounded-full border px-3 py-1 text-[13px] ${
                      sel ? "border-[#f5c451] bg-[#f5c451]/15 font-bold text-[#f5c451]" : "border-white/15 text-[#a3b3bf]"
                    }`}
                  >
                    {String(l)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={`overflow-hidden transition-all duration-500 ${at(6) ? "mt-3 max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
            <p className="m-0 rounded-md border border-[#0f766e]/50 bg-[#0f766e]/12 px-3 py-2 text-[13px] leading-snug text-[#5eead4]">
              <b>{pick(lang, "같은 판정입니다.", "Same call.")}</b>{" "}
              {pick(
                lang,
                "시설·시각·위성이 맞아 ‘유력’, 사상자 수는 출처끼리 달라 ‘자료 없음’으로 남깁니다.",
                "Facility, time, and satellite agree: likely. Casualties differ between sources, so that part stays no data.",
              )}
            </p>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#f5c451] transition-[width] duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
