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

/**
 * 경보 데모 그림 — shown 단계까지의 표시가 차례로 켜진다.
 */
function AlertVisual({ shown, reduced }: { shown: number; reduced: boolean }) {
  const at = (n: number) => shown >= n;
  return (
  <figure className="m-0 min-w-0">
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
  );
}

/**
 * 스크롤로 넘기는 경보 데모(스크롤리텔링). 왼쪽 단계 글이 화면 가운데에 오면 오른쪽 그림이 그 단계로 바뀐다.
 * 그림은 sticky로 붙어 있다. 동작 줄이기 설정이면 마지막 장면(전부 켜진 상태)으로 고정한다.
 */
export function AlertScrolly() {
  const [shown, setShown] = useState(0);
  const [reduced, setReduced] = useState(false);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    const r = prefersReducedMotion();
    setReduced(r);
    if (r) {
      setShown(DEMO_STEPS.length - 1);
      return;
    }
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.step);
          if (Number.isFinite(i)) setShown(i);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lg:flex lg:gap-12">
      {/* 휴대폰: 그림을 위에 붙여 두고 글이 그 아래로 지나간다 */}
      <div className="sticky top-0 z-10 -mx-6 mb-4 bg-[#05080d]/95 px-6 pb-3 pt-2 backdrop-blur lg:hidden">
        <AlertVisual shown={shown} reduced={reduced} />
      </div>
      <ol className="m-0 flex min-w-0 list-none flex-col p-0 lg:flex-[1_1_300px]">
        {DEMO_STEPS.map((s, i) => (
          <li
            key={s.t}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            data-step={i}
            className="flex min-h-[38vh] items-center py-6 first:pt-0 lg:min-h-[46vh]"
          >
            <div className={`transition-all duration-500 ${i === shown ? "translate-x-0 opacity-100" : "translate-x-[-6px] opacity-35"}`}>
              <span className={`block text-sm font-bold ${i === shown ? "text-[#f5c451]" : "text-[#8fa3b1]"}`}>
                {String(i + 1).padStart(2, "0")} / {String(DEMO_STEPS.length).padStart(2, "0")}
              </span>
              <span className="mt-2 block text-[clamp(22px,2.4vw,30px)] font-bold leading-snug text-white">{s.t}</span>
              <span className="mt-3 block max-w-[440px] text-[16px] leading-relaxed text-[#a3b3bf]">{s.d}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="hidden min-w-0 lg:block lg:flex-[1.3_1_380px]">
        <div className="sticky top-[18vh]">
          <AlertVisual shown={shown} reduced={reduced} />
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#f5c451] transition-[width] duration-500"
              style={{ width: `${((shown + 1) / DEMO_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
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

/* ───────────── 극적인 움직임 조각들 ───────────── */

const SCRAMBLE = "가나다라마바사아자차카타파하01#%/<>[]·";

/**
 * 해독되듯 글자가 뒤섞이다 제자리를 찾는 제목 — 상황실 단말기 느낌.
 * 화면 읽기 프로그램에는 처음부터 최종 문장을 준다(aria-label).
 */
export function DecodeText({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const chars = [...text];
    const start = performance.now() + delay;
    const DUR = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - start) / DUR;
      if (t < 0) {
        setOut(chars.map((c) => (c === " " || c === "\n" ? c : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)])).join(""));
        raf = requestAnimationFrame(tick);
        return;
      }
      const fixed = Math.floor(Math.min(1, t) * chars.length);
      setOut(
        chars
          .map((c, i) => (i < fixed || c === " " || c === "\n" ? c : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]))
          .join(""),
      );
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay]);
  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{out}</span>
    </span>
  );
}

/** 화면에 들어오면 0부터 목표 숫자까지 올라간다 */
export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(to);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    setV(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1200);
        setV(Math.round(to * (1 - (1 - t) ** 3)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref} className="tabular-nums">
      {v}
      {suffix}
    </span>
  );
}

/**
 * 카드 위에서 마우스를 움직이면 살짝 기울고, 빛이 커서를 따라간다.
 * CSS 변수만 바꾸므로 다시 그리기가 거의 없다.
 */
export function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--rx", `${(0.5 - y) * 6}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 8}deg`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`landing-tilt ${className}`}>
      {children}
    </div>
  );
}

type TickerItem = { id: string; text: string };

/**
 * 실제 UKMTO 최근 경보를 흐르는 띠로 보여 준다. 못 받아 오면 지구본이 지켜보는 것들의 목록으로 대신한다.
 */
export function LiveTicker() {
  const [items, setItems] = useState<TickerItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/ukmto", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { incidents?: Array<Record<string, unknown>> } | null) => {
        if (!alive) return;
        const rows = (p?.incidents ?? []).slice(0, 12).map((x, i) => {
          const when = typeof x.utcDateOfIncident === "string" ? x.utcDateOfIncident.slice(0, 10) : "";
          const kind = typeof x.incidentTypeName === "string" ? x.incidentTypeName : "Incident";
          const where = (typeof x.place === "string" && x.place) || (typeof x.region === "string" && x.region) || "";
          return { id: String(x.id ?? i), text: ["UKMTO", when, kind, where].filter(Boolean).join(" · ") };
        });
        setItems(rows);
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);
  const live = items && items.length > 0;
  const list: TickerItem[] = live
    ? items
    : [
        "해상 피습 경보",
        "선박 위치 신호(AIS)",
        "군용기 위치 신호(ADS-B)",
        "항구·정유소 타격",
        "국제 항행경보",
        "전쟁위험 보험료 보도",
        "위성 화재 감지",
        "전선 속보",
      ].map((t) => ({ id: t, text: t }));
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-[#070d14] py-3" aria-label={live ? "최근 UKMTO 경보" : "지구본이 지켜보는 것"}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#070d14] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#070d14] to-transparent" />
      <div className="flex w-max motion-safe:animate-[landing-marquee_48s_linear_infinite] hover:[animation-play-state:paused]">
        {[0, 1].map((dup) => (
          <ul key={dup} aria-hidden={dup === 1 ? "true" : undefined} className="m-0 flex list-none items-center gap-10 p-0 pr-10">
            <li className="flex items-center gap-2 text-sm font-bold text-[#f87171]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#f87171] motion-safe:animate-pulse" />
              {live ? "최근 UKMTO 경보 · 실제 데이터" : "지구본이 지켜보는 것"}
            </li>
            {list.map((it) => (
              <li key={`${dup}-${it.id}`} className="whitespace-nowrap text-sm text-[#c9d5dd]">
                {it.text}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/**
 * 첫 화면 배경 — 흐르는 격자, 도는 레이더 빛, 커서를 따라가는 조명.
 * 커서 위치는 CSS 변수로만 넘긴다(한 프레임에 한 번).
 */
export function HeroBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    let x = 0.5;
    let y = 0.3;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x = (e.clientX - r.left) / r.width;
      y = (e.clientY - r.top) / r.height;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        ref.current?.style.setProperty("--sx", `${x * 100}%`);
        ref.current?.style.setProperty("--sy", `${y * 100}%`);
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={ref} aria-hidden="true" className="landing-backdrop pointer-events-none absolute inset-0 overflow-hidden">
      <div className="landing-grid absolute inset-[-40px]" />
      <div className="landing-spot absolute inset-0" />
    </div>
  );
}

/**
 * 요소가 화면을 지나가는 정도(0 → 1)를 돌려준다. 랜딩 막 안의 스크롤도 잡도록
 * 문서 전체의 scroll을 capture 단계에서 듣는다.
 */
export function useScrollProgress(ref: React.RefObject<HTMLElement | null>): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const v = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh * 0.2)));
      setP((prev) => (Math.abs(prev - v) < 0.004 ? prev : v));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    document.addEventListener("scroll", on, { capture: true, passive: true });
    window.addEventListener("resize", on);
    read();
    return () => {
      document.removeEventListener("scroll", on, { capture: true });
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
  return p;
}
