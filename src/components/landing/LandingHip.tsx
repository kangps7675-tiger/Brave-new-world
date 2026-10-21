"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * 랜딩을 "힙하게" 만드는 조각들.
 *  - Grain: 화면 전체에 깔리는 필름 노이즈 + 아주 옅은 주사선
 *  - MegaMarquee: 해협 이름이 거대한 외곽선 글자로 흐르고, 스크롤 속도에 따라 빨라지며 기운다
 *  - Magnetic: 버튼이 커서 쪽으로 끌려온다
 *  - StraitRail: 세로 스크롤을 가로 이동으로 바꿔 해협 카드를 한 장씩 넘긴다(고정 + 가로 스크롤)
 * 모두 CSS 변수·transform만 바꾼다. 동작 줄이기 설정이면 전부 멈추거나 일반 배치로 돌아간다.
 */

/** 문서 어디서 스크롤되든(랜딩 막 안의 스크롤 포함) 프레임마다 콜백을 부른다 */
export function useAnyScroll(cb: () => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    let raf = 0;
    const on = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        ref.current();
      });
    };
    document.addEventListener("scroll", on, { capture: true, passive: true });
    window.addEventListener("resize", on);
    on();
    return () => {
      document.removeEventListener("scroll", on, { capture: true });
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, []);
}

export function Grain() {
  return <div aria-hidden="true" className="landing-grain pointer-events-none fixed inset-[-12%]" />;
}

/** 랜딩 아래 해협 카드(StraitRail)와 같은 6곳 — 영문은 크게, 한글 이름은 옆에 작게 */
const MEGA: { en: string; ko: string }[] = [
  { en: "HORMUZ", ko: "호르무즈 해협" },
  { en: "BAB EL-MANDEB", ko: "바브엘만데브 해협" },
  { en: "SUEZ", ko: "수에즈 운하" },
  { en: "MALACCA", ko: "말라카 해협" },
  { en: "TAIWAN STRAIT", ko: "대만해협" },
  { en: "BOSPORUS", ko: "튀르키예 해협 · 흑해 입구" },
];

/**
 * 거대한 외곽선 글자 띠 = 서비스가 지켜보는 해운 길목 이름. 무엇인지 알 수 있게 위에 제목, 단어마다 한글 이름을 붙인다.
 * 기본으로 천천히 흐르고, 스크롤을 빨리 할수록 빨라지며 진행 방향으로 기운다.
 */
export function MegaMarquee({ reverse = false }: { reverse?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const state = useRef({ x: 0, last: 0, lastTop: 0, vel: 0, reduced: false });
  useEffect(() => {
    state.current.reduced = prefersReducedMotion();
    if (state.current.reduced) return;
    let raf = 0;
    const tick = (now: number) => {
      const s = state.current;
      const dt = Math.min(64, now - (s.last || now));
      s.last = now;
      s.vel *= 0.92;
      const speed = (0.018 + Math.min(1.4, Math.abs(s.vel)) * 0.5) * dt;
      s.x = (s.x + (reverse ? -speed : speed)) % 50;
      const el = trackRef.current;
      if (el) {
        const skew = Math.max(-12, Math.min(12, s.vel * 10));
        el.style.transform = `translate3d(${reverse ? -50 + -s.x : -s.x}%, 0, 0) skewX(${-skew}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reverse]);
  useAnyScroll(() => {
    const el = trackRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const s = state.current;
    const d = s.lastTop - top;
    s.lastTop = top;
    s.vel = Math.max(-2, Math.min(2, s.vel + d * 0.004));
  });
  const words = [...MEGA, ...MEGA];
  return (
    <div className="py-6">
      <p className="mx-auto mb-3 max-w-[1200px] px-6 text-sm font-semibold text-[#8fa3b1]">
        <span className="text-[#f5c451]">●</span> Strait Desk가 지켜보는 해운 길목 6곳 — {MEGA.map((m) => m.ko.split(" · ")[0]).join(", ")}
      </p>
      <div aria-hidden="true" className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div ref={trackRef} className="flex w-max will-change-transform">
          {words.map((w, i) => (
            <span key={`${w.en}-${i}`} className="flex items-center whitespace-nowrap pr-10">
              <span className="landing-outline text-[clamp(56px,10vw,150px)] font-black uppercase leading-none tracking-[0.01em]">{w.en}</span>
              <span className="ml-4 self-end pb-[0.6em] text-[clamp(15px,1.4vw,20px)] font-bold text-[#c9d5dd]">{w.ko}</span>
              <span className="ml-10 inline-block h-4 w-4 rounded-full bg-[#f5c451]" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 커서 쪽으로 끌려오는 감싸개. 버튼 자체는 그대로 두고 바깥만 움직인다 */
export function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const onMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "translate3d(0,0,0)";
  };
  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="inline-block transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transform-none"
    >
      {children}
    </span>
  );
}

export type StraitCard = { slug: string; name: string; en: string; what: string; stat: string };

/**
 * 세로 스크롤 → 가로 이동. 섹션이 화면에 붙어 있는 동안 카드 줄이 왼쪽으로 밀려 간다.
 * 휴대폰·동작 줄이기에서는 그냥 가로로 넘겨 보는 목록이다.
 */
export function StraitRail({ cards, heading }: { cards: StraitCard[]; heading: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [pin, setPin] = useState(false);
  const [p, setP] = useState(0);
  useEffect(() => {
    const ok = !prefersReducedMotion() && window.matchMedia("(min-width: 1024px)").matches;
    setPin(ok);
  }, []);
  useAnyScroll(() => {
    if (!pin) return;
    const el = outerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const v = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
    setP((prev) => (Math.abs(prev - v) < 0.002 ? prev : v));
  });
  const travel = () => {
    const t = trackRef.current;
    if (!t) return 0;
    return Math.max(0, t.scrollWidth - t.clientWidth);
  };
  return (
    <div ref={outerRef} style={{ height: pin ? `${100 + cards.length * 38}vh` : undefined }}>
      <div className={pin ? "sticky top-0 flex h-[100vh] flex-col justify-center overflow-hidden" : ""}>
        <div className="mx-auto w-full max-w-[1200px] px-6">{heading}</div>
        <div className="relative mt-10">
          <div
            ref={trackRef}
            className={`flex gap-5 px-6 ${pin ? "" : "snap-x snap-mandatory overflow-x-auto pb-4"} lg:px-[max(24px,calc((100vw-1200px)/2+24px))]`}
            style={pin ? { transform: `translate3d(${-p * travel()}px,0,0)` } : undefined}
          >
            {cards.map((c, i) => (
              <Link
                key={c.slug}
                href={`/chokepoints/${c.slug}`}
                data-reticle="열기"
                className="group relative flex h-[min(56vh,420px)] w-[min(78vw,380px)] flex-none snap-start flex-col justify-between overflow-hidden rounded-2xl border border-white/12 bg-[#0a141f] p-7 text-white no-underline transition-colors hover:border-[#f5c451]/70"
              >
                <span aria-hidden="true" className="landing-outline pointer-events-none absolute -bottom-8 -right-3 text-[170px] font-black leading-none opacity-30 transition-opacity group-hover:opacity-70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="relative">
                  <span className="block text-sm font-semibold tracking-[0.12em] text-[#5eead4]">{c.en}</span>
                  <span className="mt-2 block text-[clamp(26px,2.6vw,34px)] font-black leading-tight">{c.name}</span>
                </span>
                <span className="relative">
                  <span className="block text-[17px] font-semibold text-[#f5c451]">{c.stat}</span>
                  <span className="mt-2 block text-[15px] leading-relaxed text-[#a3b3bf]">{c.what}</span>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white">
                    해협 안내 열기 <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
        {pin ? (
          <div className="mx-auto mt-8 w-full max-w-[1200px] px-6">
            <div className="h-px w-full bg-white/10">
              <div className="h-px bg-[#f5c451]" style={{ width: `${p * 100}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 가끔 RGB가 갈라지는 글리치 — 제목 위에 한 겹 얹는다. 화면 읽기 프로그램에는 숨긴다.
 */
export function Glitch({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`landing-glitch relative inline-block ${className}`} data-text={text}>
      {text}
    </span>
  );
}
