"use client";

import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { useDialog } from "@/hooks/useDialog";
import {
  emitBreakingDispatchSound,
  type BreakingDispatchBed,
  emitParchmentFoldSound,
  emitParchmentUnfoldSound,
} from "@/components/SoundEffectsBridge";

/** 접기(뒷면) + 상승 모션 총 길이 (CSS와 맞춤) */
export const PARCHMENT_FOLD_EXIT_MS = 1100;

function LetterCorner({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const rot =
    corner === "tl" ? 0 : corner === "tr" ? 90 : corner === "br" ? 180 : 270;
  const pos =
    corner === "tl"
      ? "left-2 top-2 sm:left-3 sm:top-3"
      : corner === "tr"
        ? "right-2 top-2 sm:right-3 sm:top-3"
        : corner === "br"
          ? "bottom-2 right-2 sm:bottom-3 sm:right-3"
          : "bottom-2 left-2 sm:bottom-3 sm:left-3";

  return (
    <svg
      className={`welcome-letter-corner pointer-events-none absolute h-10 w-10 text-[#6b4a22]/70 sm:h-12 sm:w-12 ${pos}`}
      style={{ transform: `rotate(${rot}deg)` }}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 48 V18 C8 10 14 6 22 6 H48"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M12 48 V22 C12 14 18 10 26 10 H48"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M22 6 C18 14 14 18 6 22"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="22" cy="6" r="1.6" fill="currentColor" />
      <circle cx="8" cy="48" r="1.4" fill="currentColor" />
      <path
        d="M28 14 C32 10 38 10 42 14 M30 18 C34 15 38 15 42 18"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.65"
      />
    </svg>
  );
}

export type ParchmentLetterProps = {
  lang: LabelLanguage;
  title: string;
  paragraphs: string[];
  signOff?: string;
  backMark?: string;
  backSub?: string;
  ctaLabel: string;
  onContinue: () => void;
  /** 펼침 시 종이 소리 (기본 true) */
  playUnfoldSound?: boolean;
  /** 펼침과 동시에 SOS 모스(타전) 재생 — 분쟁 외교사 등 */
  playBreakingDispatch?: boolean;
  /** dark=지정학(기본) · cheer=지경학 등불과 동일 깔개 */
  breakingDispatchBed?: BreakingDispatchBed;
  /** 본문을 타자기처럼 한 글자씩 출력 (분쟁 외교사 등) */
  typewriter?: boolean;
  /**
   * true면 반서방 11대·첫입장(한글) 등 RIDI Batang 필체.
   * 기본(false)은 Wanted Sans / EN Merriweather.
   */
  historyHandFont?: boolean;
  /** true면 Intel UI(Inter) — 첫입장 영문 편지 등 */
  intelFont?: boolean;
  /** 등불 등 — 글자색 전부 검정 */
  blackInk?: boolean;
  /** dialog 접근성 라벨 id */
  titleId?: string;
  zIndexClass?: string;
};

const TYPE_MS_PER_CHAR = 28;

export function ParchmentLetter({
  lang,
  title,
  paragraphs,
  signOff,
  backMark,
  backSub,
  ctaLabel,
  onContinue,
  playUnfoldSound = true,
  playBreakingDispatch = false,
  breakingDispatchBed = "dark",
  typewriter = false,
  historyHandFont = false,
  intelFont = false,
  blackInk = false,
  titleId = "parchment-letter-title",
  zIndexClass = "z-[800]",
}: ParchmentLetterProps) {
  /** 편지 — Escape는 '계속'과 같은 의미(다음으로 넘어감) (P1-7) */
  const dialogRef = useDialog<HTMLDivElement>({ open: true, onClose: onContinue });
  const [phase, setPhase] = useState<"idle" | "folding" | "done">("idle");
  const [typedChars, setTypedChars] = useState(0);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const typingSkipRef = useRef(false);
  const typingIntervalRef = useRef<number | null>(null);
  /** 타이핑 중 본문 하단 자동 추적. 유저가 스크롤하면 false. */
  const autoScrollFollowRef = useRef(true);
  const programmaticScrollRef = useRef(false);
  const parchmentStack = intelFont
    ? "var(--font-intel)"
    : historyHandFont
      ? 'var(--font-letter-hand), "RIDI Batang", "Gowun Batang", "Nanum Myeongjo", "Batang", serif'
      : lang === "en"
        ? "var(--font-parchment-en)"
        : 'var(--font-wanted), "Wanted Sans Variable", "Wanted Sans", sans-serif';
  const bodyFont = parchmentStack;
  const titleFont = parchmentStack;
  const resolvedBackMark = backMark ?? (lang === "en" ? BRAND_NAME.en : BRAND_NAME.ko);
  const resolvedBackSub = backSub ?? (lang === "en" ? BRAND_NAME.ko : BRAND_NAME.en);

  const fullBody = useMemo(() => paragraphs.join("\n\n"), [paragraphs]);
  const totalChars = fullBody.length;
  const typingDone = !typewriter || typedChars >= totalChars;

  useEffect(() => {
    if (!playUnfoldSound && !playBreakingDispatch) return;
    if (playUnfoldSound) emitParchmentUnfoldSound();
    if (playBreakingDispatch) {
      emitBreakingDispatchSound({ bed: breakingDispatchBed });
    }
  }, [playUnfoldSound, playBreakingDispatch, breakingDispatchBed]);

  useEffect(() => {
    if (!typewriter) {
      typingSkipRef.current = true;
      setTypedChars(totalChars);
      return;
    }
    typingSkipRef.current = false;
    autoScrollFollowRef.current = true;
    setTypedChars(0);
    const reduced =
      prefersReducedMotion();
    if (reduced || totalChars === 0) {
      typingSkipRef.current = true;
      setTypedChars(totalChars);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      if (typingSkipRef.current) {
        window.clearInterval(id);
        typingIntervalRef.current = null;
        return;
      }
      i += 1;
      setTypedChars(i);
      if (i >= totalChars) {
        window.clearInterval(id);
        typingIntervalRef.current = null;
      }
    }, TYPE_MS_PER_CHAR);
    typingIntervalRef.current = id;
    return () => {
      window.clearInterval(id);
      typingIntervalRef.current = null;
    };
  }, [typewriter, totalChars, fullBody]);

  const visibleParagraphs = useMemo(() => {
    if (!typewriter || typedChars >= totalChars) return paragraphs;
    let remaining = typedChars;
    const out: string[] = [];
    for (const p of paragraphs) {
      if (remaining <= 0) break;
      if (remaining >= p.length) {
        out.push(p);
        remaining -= p.length;
        // account for "\n\n" join separators between paragraphs
        if (remaining > 0) remaining = Math.max(0, remaining - 2);
      } else {
        out.push(p.slice(0, remaining));
        remaining = 0;
      }
    }
    return out.length > 0 ? out : [""];
  }, [paragraphs, typewriter, typedChars, totalChars]);

  useEffect(() => {
    if (!typewriter) return;
    const el = bodyScrollRef.current;
    if (!el) return;

    const stopAutoFollow = () => {
      autoScrollFollowRef.current = false;
    };
    const onScroll = () => {
      if (programmaticScrollRef.current) return;
      autoScrollFollowRef.current = false;
    };

    el.addEventListener("wheel", stopAutoFollow, { passive: true });
    el.addEventListener("touchmove", stopAutoFollow, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("wheel", stopAutoFollow);
      el.removeEventListener("touchmove", stopAutoFollow);
      el.removeEventListener("scroll", onScroll);
    };
  }, [typewriter, fullBody]);

  useEffect(() => {
    if (!typewriter || !autoScrollFollowRef.current) return;
    const el = bodyScrollRef.current;
    if (!el) return;
    programmaticScrollRef.current = true;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
  }, [typedChars, typewriter, typingDone]);

  const handleContinue = useCallback(() => {
    if (phase !== "idle") return;
    if (typewriter && !typingDone) {
      typingSkipRef.current = true;
      if (typingIntervalRef.current != null) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setTypedChars(totalChars);
      return;
    }
    setPhase("folding");
    emitParchmentFoldSound();
    const reduced =
      prefersReducedMotion();
    window.setTimeout(() => {
      setPhase("done");
      onContinue();
    }, reduced ? 80 : PARCHMENT_FOLD_EXIT_MS);
  }, [onContinue, phase, totalChars, typewriter, typingDone]);

  const exiting = phase === "folding" || phase === "done";

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className={`welcome-letter-scrim fixed inset-0 ${zIndexClass} flex items-center justify-center p-3 sm:p-6 ${
        exiting ? "welcome-letter-scrim--exit" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-busy={phase === "folding"}
    >
      <div className="welcome-letter-stage">
        <div
          className={`welcome-letter-card parchment-letter ${
            historyHandFont ? "parchment-letter--history" : ""
          } ${intelFont ? "parchment-letter--intel" : ""} ${
            blackInk ? "parchment-letter--lamp-ink" : ""
          } ${
            exiting ? "welcome-letter-card--fold-exit" : "welcome-letter-card--unfold-enter"
          }`}
          style={{ fontFamily: bodyFont }}
        >
          <div className="welcome-parchment welcome-letter-face welcome-letter-face--front relative flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-sm shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="welcome-parchment-edge pointer-events-none absolute inset-0" aria-hidden />
            <div className="welcome-parchment-filigree pointer-events-none absolute inset-0" aria-hidden />
            <LetterCorner corner="tl" />
            <LetterCorner corner="tr" />
            <LetterCorner corner="bl" />
            <LetterCorner corner="br" />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-8 py-9 sm:px-14 sm:py-11">
              <h1
                id={titleId}
                className={`welcome-letter-title shrink-0 whitespace-pre-line text-center text-[1.7rem] leading-[1.4] tracking-[0.03em] sm:text-[2.15rem] sm:leading-[1.35] sm:tracking-[0.04em] ${
                  blackInk ? "text-black" : "text-[#3d2a18]"
                }`}
                style={{ fontFamily: titleFont, fontWeight: 400 }}
              >
                {title}
              </h1>
              <div className="welcome-letter-divider mx-auto mt-4 shrink-0" aria-hidden />
              <div
                ref={bodyScrollRef}
                className={`welcome-letter-body mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain text-[1.02rem] leading-[1.65] tracking-[0.012em] sm:text-[1.08rem] sm:leading-[1.7] sm:tracking-[0.015em] ${
                  blackInk ? "text-black" : "text-[#3f2e1c]"
                }`}
                style={{ fontFamily: bodyFont, fontWeight: 400 }}
                aria-live="polite"
              >
                {visibleParagraphs.map((p, i) => (
                  <p key={i} className="welcome-letter-verse whitespace-pre-line text-pretty">
                    {p}
                    {typewriter && !typingDone && i === visibleParagraphs.length - 1 ? (
                      <span className="parchment-type-caret" aria-hidden>
                        ▍
                      </span>
                    ) : null}
                  </p>
                ))}
                {signOff && typingDone ? (
                  <p
                    className={`whitespace-pre-line pb-2 pt-2 text-right text-[1.02rem] leading-relaxed tracking-[0.04em] ${
                      blackInk ? "text-black" : "text-[#5a4428]"
                    }`}
                    style={{
                      fontFamily: parchmentStack,
                      fontStyle: lang === "en" ? "italic" : "normal",
                      fontWeight: 400,
                    }}
                  >
                    {signOff}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="relative shrink-0 border-t border-[#8b6914]/25 bg-[#f3e4c4]/80 px-6 py-4 text-center">
              <button
                type="button"
                onClick={handleContinue}
                disabled={phase !== "idle"}
                className={`rounded-sm border border-[#8b6914]/45 bg-[#efe0b8] px-6 py-2.5 text-base tracking-[0.06em] shadow-sm transition hover:bg-[#f7ecd0] disabled:cursor-wait disabled:opacity-70 ${
                  blackInk ? "text-black" : "text-[#3d2a18]"
                }`}
                style={{ fontFamily: titleFont, fontWeight: 400 }}
              >
                {typewriter && !typingDone
                  ? lang === "en"
                    ? "Skip typing"
                    : "타자 건너뛰기"
                  : ctaLabel}
              </button>
            </div>
          </div>

          <div
            className="welcome-parchment welcome-letter-face welcome-letter-face--back"
            aria-hidden
          >
            <div className="welcome-parchment-edge pointer-events-none absolute inset-0" />
            <div className="welcome-parchment-filigree pointer-events-none absolute inset-0" />
            <LetterCorner corner="tl" />
            <LetterCorner corner="tr" />
            <LetterCorner corner="bl" />
            <LetterCorner corner="br" />
            <div className="welcome-letter-back-inner">
              <div className="welcome-letter-wax" />
              <p className="welcome-letter-back-mark" style={{ fontFamily: titleFont }}>
                {resolvedBackMark}
              </p>
              <p
                className="welcome-letter-back-sub"
                style={{ fontFamily: parchmentStack }}
              >
                {resolvedBackSub}
              </p>
              <div className="welcome-letter-back-lines" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
