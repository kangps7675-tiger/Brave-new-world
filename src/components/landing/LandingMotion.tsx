"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * 랜딩의 움직임 조각들 — One Page Love 후보(Flashform·DCS AML·World Pollution)에서 가져온 것.
 *  - Reveal: 섹션이 화면에 들어올 때 아래에서 떠오른다 (Flashform식 스크롤 전환)
 *  - SectionDots: 오른쪽 점으로 지금 어느 섹션인지 표시 (DCS AML의 내비 점)
 *  - AlertDemo: 경보가 뜬 뒤 지구본에서 일어나는 일을 반복 재생하는 예시 (Flashform의 반복 데모)
 * 동작 줄이기 설정이면 움직이지 않고 최종 상태를 바로 보여 준다.
 */

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`landing-reveal ${on ? "is-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function SectionDots({ sections }: { sections: { id: string; label: string }[] }) {
  const [current, setCurrent] = useState(sections[0]?.id ?? "");
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (seen?.target.id) setCurrent(seen.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.2, 0.5] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);
  return (
    <nav aria-label="섹션 이동" className="fixed right-5 top-1/2 hidden -translate-y-1/2 flex-col gap-3 xl:flex">
      {sections.map((s) => {
        const on = s.id === current;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={on ? "true" : undefined}
            className="group flex items-center justify-end gap-2 no-underline"
          >
            <span className={`text-caption transition-opacity ${on ? "text-[#f5c451] opacity-100" : "text-[#a3b3bf] opacity-0 group-hover:opacity-100"}`}>
              {s.label}
            </span>
            <span
              className={`block rounded-full transition-all ${on ? "h-2.5 w-2.5 bg-[#f5c451] shadow-[0_0_10px_rgba(245,196,81,0.8)]" : "h-2 w-2 bg-white/30 group-hover:bg-white/70"}`}
            />
          </a>
        );
      })}
    </nav>
  );
}

const DEMO_STEPS = [
  { t: "경보가 뜹니다", d: "UKMTO가 상선 피격을 보고하면 오른쪽 '선박 사건'에 새 카드가 올라오고, 지도에 그 자리가 표시됩니다." },
  { t: "주변 배가 보입니다", d: "그 시각 근처를 지나던 배들의 위치 신호(AIS)가 함께 떠서, 어떤 배들이 그 바다에 있었는지 봅니다." },
  { t: "그 바다의 위험이 겹칩니다", d: "항행경보 구역과 근처 항구·정유소에 떨어진 드론·미사일 불꽃이 같은 화면에 겹칩니다." },
  { t: "보험료 흐름을 확인합니다", d: "기사에 보도된 전쟁위험 보험료를 날짜순으로, 출처 문장과 함께 봅니다." },
];

const STEP_MS = 2800;

export function AlertDemo() {
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const r = prefersReducedMotion();
    setReduced(r);
    if (r) {
      setStep(DEMO_STEPS.length - 1);
      return;
    }
    let visible = true;
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => (visible = e?.isIntersecting ?? true)) : null;
    if (boxRef.current) io?.observe(boxRef.current);
    const id = window.setInterval(() => {
      if (!visible || document.hidden) return;
      setStep((s) => (s + 1) % (DEMO_STEPS.length + 1));
    }, STEP_MS);
    return () => {
      window.clearInterval(id);
      io?.disconnect();
    };
  }, []);
  // 마지막 장면을 한 박자 더 보여 준 뒤 처음으로
  const shown = Math.min(step, DEMO_STEPS.length - 1);
  const at = (n: number) => shown >= n;

  return (
    <div ref={boxRef} className="flex flex-wrap gap-8">
      <ol className="m-0 flex min-w-0 flex-[1_1_300px] list-none flex-col gap-2 p-0">
        {DEMO_STEPS.map((s, i) => (
          <li key={s.t}>
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === shown ? "step" : undefined}
              className={`w-full cursor-pointer rounded-lg border px-5 py-4 text-left font-[inherit] transition-colors ${
                i === shown ? "border-[#f5c451]/70 bg-[#f5c451]/10" : "border-white/10 bg-transparent hover:border-white/30"
              }`}
            >
              <span className={`block text-caption font-bold ${i === shown ? "text-[#f5c451]" : "text-[#8fa3b1]"}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mt-1 block text-[17px] font-bold text-white">{s.t}</span>
              <span className="mt-1 block text-[15px] leading-relaxed text-[#a3b3bf]">{s.d}</span>
            </button>
          </li>
        ))}
      </ol>

      <figure className="m-0 min-w-0 flex-[1.3_1_380px]">
        <div className="overflow-hidden rounded-xl border border-white/12 bg-[#081420]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-caption text-[#8fa3b1]">
            <span>홍해 남부 · 예시 화면</span>
            <span>실제 데이터 아님</span>
          </div>
          <div className="relative">
            <svg viewBox="0 0 480 300" className="block h-auto w-full" role="img" aria-label="경보가 뜬 뒤 지구본에 순서대로 나타나는 것들의 예시 그림">
              <defs>
                <pattern id="demo-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="#e5484d" fillOpacity="0.16" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#ff6b6f" strokeWidth="1.4" strokeOpacity="0.7" />
                </pattern>
                <radialGradient id="demo-fire">
                  <stop offset="0%" stopColor="#fff3c4" />
                  <stop offset="35%" stopColor="#ffb02a" />
                  <stop offset="100%" stopColor="#ff5a0a" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="480" height="300" fill="#0b1e2e" />
              {/* 해안선: 왼쪽 아프리카, 오른쪽 아라비아 */}
              <path d="M0 0 L150 0 C140 60 120 110 128 160 C136 210 110 250 92 300 L0 300 Z" fill="#1f3d52" stroke="#3b6378" />
              <path d="M300 0 L480 0 L480 300 L360 300 C350 250 372 210 356 170 C340 130 320 70 300 0 Z" fill="#1f3d52" stroke="#3b6378" />
              <text x="20" y="40" fill="#6d8797" fontSize="12">에리트레아</text>
              <text x="400" y="40" fill="#6d8797" fontSize="12">예멘</text>

              {/* 3: 항행경보 구역 */}
              <g style={{ opacity: at(2) ? 1 : 0, transition: reduced ? "none" : "opacity .6s" }}>
                <path d="M190 90 L300 80 L320 200 L200 215 Z" fill="url(#demo-hatch)" stroke="#ff6b6f" strokeDasharray="4 3" />
                <text x="198" y="108" fill="#ff9a9d" fontSize="11">항행경보 구역</text>
                <circle cx="368" cy="150" r="16" fill="url(#demo-fire)" />
                <path d="M368 138 C369.3 142 373 144.6 373 149.4 C373 152.8 370.8 155.4 368 155.4 C365.2 155.4 363 152.8 363 149.4 C363 146.4 365.4 144.6 366.4 142 C367 143.2 367.4 143.4 367.8 142.9 C368.1 141.5 368 139.7 368 138 Z" fill="#ffd25a" />
              </g>

              {/* 2: 주변 배 */}
              <g style={{ opacity: at(1) ? 1 : 0, transition: reduced ? "none" : "opacity .6s" }} fill="#93c5fd">
                {[
                  [205, 70, 160],
                  [232, 230, 340],
                  [290, 120, 200],
                  [180, 180, 20],
                  [270, 265, 330],
                ].map(([x, y, r]) => (
                  <path key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${r})`} d="M0 -7 L4 4 L0 2 L-4 4 Z" />
                ))}
              </g>

              {/* 1: 경보 위치 */}
              <g style={{ opacity: at(0) ? 1 : 0, transition: reduced ? "none" : "opacity .4s" }}>
                <circle cx="252" cy="160" r="34" fill="none" stroke="#f87171" strokeWidth="1.6" strokeDasharray="4 4" />
                <circle cx="252" cy="160" r="5" fill="#f87171" />
                <path transform="translate(252 160)" d="M-9 -2 L9 -2 L6 3 L-6 3 Z M-4 -2 L-4 -8 L3 -8 L5 -2" fill="#fff" />
              </g>
            </svg>

            {/* 1: 선박 사건 카드 */}
            <div
              className={`absolute right-3 top-3 w-[min(56%,230px)] rounded-md border border-[#f87171]/50 bg-[#05080d]/90 px-3 py-2 transition-all duration-500 ${
                at(0) ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
              }`}
            >
              <p className="m-0 text-caption font-bold text-[#fca5a5]">새 선박 사건 · UKMTO</p>
              <p className="mb-0 mt-0.5 text-caption leading-snug text-[#d7e0e6]">홍해 남부에서 상선이 공격받았다는 보고</p>
            </div>

            {/* 4: 보험료 줄 */}
            <div
              className={`absolute bottom-3 left-3 right-3 rounded-md border border-white/12 bg-[#05080d]/90 px-3 py-2 transition-all duration-500 ${
                at(3) ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              <p className="m-0 text-caption text-[#d7e0e6]">
                <b className="text-white">전쟁위험 보험료(보도 기준)</b> 홍해·아덴만 <span className="text-[#f5c451]">[요율] ▲</span>
              </p>
              <p className="mb-0 mt-0.5 text-micro text-[#8fa3b1]">출처: 해운 매체 기사 · 근거 문장 함께 표시</p>
            </div>
          </div>
        </div>
      </figure>
    </div>
  );
}

export function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b border-white/10 py-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-white">
        {q}
        <span aria-hidden="true" className="flex-none text-2xl font-light text-[#f5c451] transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="mb-0 mt-3 text-[15px] leading-[1.75] text-[#a3b3bf]">{a}</p>
    </details>
  );
}
