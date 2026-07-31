"use client";

/**
 * 확전 신호 패널 — **판정 근거를 전부 펼쳐 보여주는 것이 핵심 기능이다.**
 *
 * ══════════════════════════════════════════════════════════════════════
 *  이 컴포넌트의 설계 제약
 * ══════════════════════════════════════════════════════════════════════
 *
 * 이 제품이 "확전이 임박했다"고 말하는 순간 신뢰를 잃는다.
 * 그래서 UI 는 **판정을 주장하지 않고 계산 과정을 보여준다.**
 *
 *   ✗ 「확전 위험 높음」 「전쟁 임박」 「NATO 5조 발동 가능」
 *   ✓ 「비교전국 주권 영역 +4 — "violated Romanian airspace" [UN 헌장 2(4)]」
 *
 * 점수 분해를 접어두지 않고 **기본으로 펼친다.** 이게 이 화면의 존재 이유다.
 * 사용자가 우리 판정을 검증할 수 있어야 하고, 우리가 오탐을 디버깅할 수 있어야 한다.
 *
 * 고지 문구(ESCALATION_DISCLAIMER)는 **접히지 않고 항상 보인다.**
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  ESCALATION_DISCLAIMER_EN,
  ESCALATION_DISCLAIMER_KO,
  ESCALATION_METHOD_NOTE_EN,
  ESCALATION_METHOD_NOTE_KO,
  ESCALATION_PATTERN_LABEL,
  ESCALATION_SHOW_THRESHOLD,
  type EscalationSignal,
  shouldFlash,
} from "@/lib/escalationSignals";
import { FLANK_LABEL } from "@/data/perimeterStates";

type Props = {
  signal: EscalationSignal;
  lang: LabelLanguage;
  /** 원문 기사 제목 — 신호는 기사에 붙는다 */
  title?: string;
  link?: string;
  sourceLabel?: string;
  /**
   * 노출 상한에 걸려 가린 신호 수.
   *
   * ⚠️ 반드시 표시해야 한다. 우리가 가린 것을 사용자가
   *    "아무 일 없음"으로 오독하게 하면 안 된다.
   */
  suppressedCount?: number;
  onDismiss?: () => void;
  onFocusTheater?: (theater: string) => void;
};

const COPY = {
  ko: {
    kicker: "확전 신호",
    why: "왜 올라왔나",
    breakdown: "판정 근거",
    method: "방법론",
    thresholdLine: (score: number) => `${score}점 (노출 임계 ${ESCALATION_SHOW_THRESHOLD})`,
    theaters: "관련 전장",
    perimeter: "경계국",
    stray: "보도는 이 사건을 '표류·오폭'으로 기술함 — 의도는 판정하지 않음",
    source: "출처",
    dismiss: "닫기",
    suppressed: (n: number) => `같은 시간대에 ${n}건 더 있음 (표시 상한)`,
    dimension: { horizontal: "수평 (범위 확대)", vertical: "수직 (강도 증가)" },
  },
  en: {
    kicker: "Escalation signal",
    why: "Why this surfaced",
    breakdown: "Scoring basis",
    method: "Methodology",
    thresholdLine: (score: number) => `${score} (threshold ${ESCALATION_SHOW_THRESHOLD})`,
    theaters: "Theaters",
    perimeter: "Perimeter states",
    stray: "Reporting describes this as stray/errant — intent is not assessed",
    source: "Source",
    dismiss: "Dismiss",
    suppressed: (n: number) => `${n} more in this window (display cap)`,
    dimension: { horizontal: "Horizontal (scope)", vertical: "Vertical (intensity)" },
  },
} as const;

/** 점수 부호에 따른 색 — 감점(가정·전망)을 시각적으로 구분한다 */
function factorTone(points: number): string {
  if (points < 0) return "text-sky-300/80";
  if (points >= 4) return "text-rose-200";
  return "text-amber-100/90";
}

export function EscalationSignalPanel({
  signal,
  lang,
  title,
  link,
  sourceLabel,
  suppressedCount = 0,
  onDismiss,
  onFocusTheater,
}: Props) {
  const ko = lang !== "en";
  const copy = ko ? COPY.ko : COPY.en;
  const pattern = ESCALATION_PATTERN_LABEL[signal.pattern];
  const headline = ko ? signal.headlineKo : signal.headlineEn;
  const flash = shouldFlash(signal);

  return (
    <section
      className="pointer-events-auto w-[min(94vw,34rem)] overflow-hidden rounded-md border border-amber-400/40 bg-[#12100a]/96 shadow-[0_18px_56px_rgba(60,40,0,0.5)] backdrop-blur-md"
      role="region"
      aria-label={copy.kicker}
    >
      {/* ── 헤더: 패턴·차원·점수 ─────────────────────────────── */}
      <header className="border-b border-amber-400/25 bg-amber-950/40 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-meta uppercase tracking-[0.14em] text-amber-300/70">
              {copy.kicker}
              {flash ? <span className="ml-2 text-rose-300/90">●</span> : null}
            </p>
            <h2 className="mt-1 text-[15px] font-semibold leading-snug text-amber-50">
              {headline}
            </h2>
          </div>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-md border border-white/15 px-2 py-1 text-meta text-amber-100/70 transition hover:bg-white/5"
            >
              {copy.dismiss}
            </button>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
          <span className="rounded border border-amber-400/30 bg-amber-900/30 px-1.5 py-0.5 text-amber-100/90">
            {ko ? pattern.ko : pattern.en}
          </span>
          <span className="text-amber-200/60">{copy.dimension[signal.dimension]}</span>
          <span className="font-mono text-amber-100/80">
            {copy.thresholdLine(signal.score)}
          </span>
        </div>
      </header>

      {/* ── 원문 기사 ─────────────────────────────────────────── */}
      {title ? (
        <div className="border-b border-white/8 px-4 py-2.5">
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-caption leading-relaxed text-amber-50/90 underline decoration-amber-400/30 underline-offset-2 hover:decoration-amber-300"
            >
              {title}
            </a>
          ) : (
            <p className="text-caption leading-relaxed text-amber-50/90">{title}</p>
          )}
          {sourceLabel ? (
            <p className="mt-1 text-meta text-amber-200/55">
              {copy.source}: {sourceLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── 이 패턴이 무슨 뜻인가 (해석 아님, 정의) ──────────── */}
      <div className="border-b border-white/8 px-4 py-3">
        <p className="text-meta uppercase tracking-[0.12em] text-amber-300/60">{copy.why}</p>
        <p className="mt-1.5 text-caption leading-relaxed text-amber-50/80">
          {ko ? pattern.hintKo : pattern.hintEn}
        </p>
      </div>

      {/* ── ★ 판정 근거 — 접지 않는다 ─────────────────────────── */}
      <div className="px-4 py-3">
        <p className="text-meta uppercase tracking-[0.12em] text-amber-300/60">
          {copy.breakdown}
        </p>
        <ul className="mt-2 space-y-1.5">
          {signal.factors.map((f) => (
            <li key={f.code} className="text-caption leading-relaxed">
              <span className={`font-mono ${factorTone(f.points)}`}>
                {f.points >= 0 ? "+" : ""}
                {f.points}
              </span>
              <span className="ml-2 text-amber-50/85">{ko ? f.labelKo : f.labelEn}</span>
              {f.evidence ? (
                <span className="ml-1.5 text-amber-200/55">— &ldquo;{f.evidence}&rdquo;</span>
              ) : null}
              {ko && f.basisKo ? (
                <span className="mt-0.5 block pl-6 text-meta text-amber-300/45">
                  {f.basisKo}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-2.5 border-t border-white/8 pt-2 font-mono text-caption text-amber-100/90">
          = {copy.thresholdLine(signal.score)}
        </p>
      </div>

      {/* ── 관련 전장·경계국 ──────────────────────────────────── */}
      {(signal.theaters.length > 0 || signal.perimeter.length > 0) ? (
        <div className="border-t border-white/8 px-4 py-2.5 text-meta">
          {signal.theaters.length > 0 ? (
            <p className="text-amber-200/60">
              {copy.theaters}:{" "}
              {signal.theaters.map((t, i) => (
                <span key={t}>
                  {i > 0 ? " · " : ""}
                  {onFocusTheater ? (
                    <button
                      type="button"
                      onClick={() => onFocusTheater(t)}
                      className="underline decoration-dotted underline-offset-2 hover:text-amber-100"
                    >
                      {t}
                    </button>
                  ) : (
                    t
                  )}
                </span>
              ))}
            </p>
          ) : null}
          {signal.perimeter.length > 0 ? (
            <p className="mt-1 text-amber-200/60">
              {copy.perimeter}:{" "}
              {signal.perimeter.map((p) => (ko ? p.nameKo : p.nameEn)).join(" · ")}
              {signal.flanks.length > 0 ? (
                <span className="ml-1.5 text-amber-300/40">
                  ({signal.flanks.map((f) => (ko ? FLANK_LABEL[f].ko : FLANK_LABEL[f].en)).join(", ")})
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── 보도가 사고성으로 기술한 경우 (의도 판정 아님) ───── */}
      {signal.reportedAsStray ? (
        <div className="border-t border-white/8 bg-sky-950/20 px-4 py-2">
          <p className="text-meta leading-relaxed text-sky-200/70">{copy.stray}</p>
        </div>
      ) : null}

      {/* ── 가려진 신호 개수 — "없음"으로 오독하게 두면 안 된다 ─ */}
      {suppressedCount > 0 ? (
        <div className="border-t border-white/8 px-4 py-2">
          <p className="text-meta text-amber-300/55">{copy.suppressed(suppressedCount)}</p>
        </div>
      ) : null}

      {/* ── ★ 고지 — 접히지 않는다 ────────────────────────────── */}
      <footer className="border-t border-amber-400/20 bg-amber-950/25 px-4 py-2.5">
        <p className="text-meta leading-relaxed text-amber-200/70">
          {ko ? ESCALATION_DISCLAIMER_KO : ESCALATION_DISCLAIMER_EN}
        </p>
        <details className="mt-1.5">
          <summary className="cursor-pointer text-meta text-amber-300/50 hover:text-amber-200/70">
            {copy.method}
          </summary>
          <p className="mt-1.5 text-meta leading-relaxed text-amber-200/50">
            {ko ? ESCALATION_METHOD_NOTE_KO : ESCALATION_METHOD_NOTE_EN}
          </p>
        </details>
      </footer>
    </section>
  );
}
