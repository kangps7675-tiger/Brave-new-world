"use client";

import { useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { shareOrDownloadImageBlob } from "@/lib/captureShareImage";
import { renderGeopoliticsSenseCard } from "@/lib/geopoliticsSenseCard";
import {
  pickSenseQuizQuestions,
  scoreSenseQuiz,
  senseQuizHeadline,
  senseQuizTierLabel,
  type SenseQuestion,
} from "@/lib/geopoliticsSenseQuiz";
import { trackEvent } from "@/lib/trackClient";

type Props = {
  lang: LabelLanguage;
  onClose: () => void;
};

/**
 * 지정학 감각 5문항 + 결과 공유.
 * MBTI류 "내 점수 보여주기" — 사건→시장 재료는 이미 있는 뱅크.
 */
export function GeopoliticsSenseQuizModal({ lang, onClose }: Props) {
  const ko = lang !== "en";
  const questions = useMemo(() => pickSenseQuizQuestions(5), []);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);

  const q: SenseQuestion | undefined = questions[index];
  const score = scoreSenseQuiz(correct, questions.length);
  const tierLabel = senseQuizTierLabel(score, ko);
  const headline = senseQuizHeadline(score, ko);

  function handlePick(choiceId: string) {
    if (!q || picked) return;
    setPicked(choiceId);
    const hit = choiceId === q.answerId;
    if (hit) setCorrect((c) => c + 1);
    trackEvent(
      "sense_quiz_answer",
      { qid: q.id, hit, choiceId },
      { lang: ko ? "ko" : "en" },
    );
  }

  function handleNext() {
    if (!q || !picked) return;
    if (index + 1 >= questions.length) {
      setDone(true);
      trackEvent(
        "sense_quiz_done",
        { score: scoreSenseQuiz(correct, questions.length) },
        { lang: ko ? "ko" : "en" },
      );
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  }

  async function handleShare() {
    if (shareBusy) return;
    setShareBusy(true);
    trackEvent("sense_quiz_share_click", { score }, { lang: ko ? "ko" : "en" });
    try {
      const blob = await renderGeopoliticsSenseCard({
        lang: ko ? "ko" : "en",
        score,
        correct,
        total: questions.length,
        tierLabel,
      });
      if (!blob) return;
      await shareOrDownloadImageBlob(
        blob,
        `geopolitics-sense-${score}.png`,
        headline,
        ko
          ? `나의 지정학 감각 ${score}점 (${tierLabel}). 당신도 맞춰보실래요?`
          : `My geopolitics sense: ${score} (${tierLabel}). Can you beat it?`,
      );
      trackEvent("sense_quiz_share_success", { score }, { lang: ko ? "ko" : "en" });
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10030] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={ko ? "지정학 감각 테스트" : "Geopolitics sense quiz"}
    >
      <div className="w-full max-w-lg rounded-2xl border border-violet-400/25 bg-[#0b1020]/96 shadow-2xl">
        <div className="flex items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300/90">
              {ko ? "지정학 감각 테스트" : "Geopolitics sense"}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {done
                ? headline
                : ko
                  ? `${index + 1}/5 · 사건 직후 시장은?`
                  : `${index + 1}/5 · Markets after the event?`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[13px] text-slate-400 hover:bg-white/5 hover:text-slate-100"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="space-y-4 px-4 py-5">
            <p className="text-2xl font-semibold text-violet-50">{headline}</p>
            <p className="text-[13px] text-slate-400">
              {ko
                ? `${correct}/${questions.length} 문항 적중. 결과를 자랑하세요.`
                : `${correct}/${questions.length} correct. Show off the card.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={shareBusy}
                onClick={() => void handleShare()}
                className="flex-1 rounded-xl border border-violet-400/40 bg-violet-500/20 px-3 py-2.5 text-[13px] font-semibold text-violet-100 disabled:opacity-60"
              >
                {shareBusy
                  ? ko
                    ? "만드는 중…"
                    : "Rendering…"
                  : ko
                    ? "결과 카드 공유"
                    : "Share result card"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 px-3 py-2.5 text-[13px] text-slate-300"
              >
                {ko ? "닫기" : "Close"}
              </button>
            </div>
          </div>
        ) : q ? (
          <div className="px-4 py-4">
            <p className="text-[13px] leading-snug text-slate-300">
              {ko ? q.eventKo : q.eventEn}
            </p>
            <p className="mt-2 text-[15px] font-semibold text-slate-50">
              {ko ? q.questionKo : q.questionEn}
            </p>

            <div className="mt-3 space-y-2">
              {q.choices.map((c) => {
                const isPick = picked === c.id;
                const isAnswer = c.id === q.answerId;
                let cls =
                  "w-full rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium transition ";
                if (picked) {
                  if (isAnswer) cls += "border-emerald-400/50 bg-emerald-500/20 text-emerald-100";
                  else if (isPick) cls += "border-rose-400/40 bg-rose-500/15 text-rose-200";
                  else cls += "border-white/10 bg-white/5 text-slate-500";
                } else {
                  cls +=
                    "border-violet-300/25 bg-slate-950/50 text-slate-100 hover:border-violet-300/45 hover:bg-violet-500/10";
                }
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={Boolean(picked)}
                    onClick={() => handlePick(c.id)}
                    className={cls}
                  >
                    {ko ? c.labelKo : c.labelEn}
                  </button>
                );
              })}
            </div>

            {picked ? (
              <>
                <p className="mt-3 text-[12px] leading-snug text-slate-400">
                  {ko ? q.explainKo : q.explainEn}
                </p>
                <button
                  type="button"
                  onClick={handleNext}
                  className="mt-3 w-full rounded-xl border border-violet-400/40 bg-violet-500/20 px-3 py-2.5 text-[13px] font-semibold text-violet-100"
                >
                  {index + 1 >= questions.length
                    ? ko
                      ? "결과 보기"
                      : "See score"
                    : ko
                      ? "다음 문제"
                      : "Next"}
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
