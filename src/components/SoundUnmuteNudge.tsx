"use client";

import { useEffect, useState } from "react";
import { Z_ABOVE_NAV } from "@/lib/uiStack";
import { useSoundEnabled } from "@/hooks/useSoundEnabled";
import { canShowNudge, markNudgeShown } from "@/lib/onboardingBudget";
import { hasSoundChoice } from "@/lib/soundPrefs";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

type Props = {
  lang: LabelLanguage;
  /** 첫 90초가 끝나고 화면이 안정된 뒤에만 true */
  ready: boolean;
};

/**
 * 소리 언뮤트 유도 — 기본값 OFF 전환(2026-07)의 짝.
 *
 * 소리를 기본 OFF로 바꾸면 "무동의 자동 재생" 문제는 사라지지만,
 * 대신 **사이렌·모스라는 제품의 핵심 자산을 아무도 못 듣게 될** 위험이 생긴다.
 * 그래서 한 번도 선택한 적 없는 유저(`hasSoundChoice() === false`)에게만
 * 딱 한 번, 조용히 권한다.
 *
 * - 끈 적이 있는 사람에겐 절대 안 뜬다 (거절 존중)
 * - 첫 90초 동안엔 안 뜬다 (지도가 주인공)
 * - **온보딩 예산제 대상** — 코치·투어와 세션 총량을 공유한다.
 *   이게 없으면 "안내 하나 더"가 10번째 독립 넛지가 된다.
 */
export function SoundUnmuteNudge({ lang, ready }: Props) {
  const { soundEnabled, setSoundEnabled } = useSoundEnabled();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || soundEnabled) return;
    // 유저가 한 번이라도 직접 골랐으면 다시 묻지 않는다
    if (hasSoundChoice()) return;
    // 이번 세션에 자리가 남았는가 (코치·투어·성능제안과 총량 공유)
    if (!canShowNudge("soundUnmute")) return;
    markNudgeShown("soundUnmute");
    setOpen(true);
  }, [ready, soundEnabled]);

  if (!open || soundEnabled) return null;

  const accept = () => {
    setSoundEnabled(true);
    setOpen(false);
  };

  const dismiss = () => {
    // 명시적 거절도 '선택'으로 기록 — 다음부터 안 묻는다
    setSoundEnabled(false);
    setOpen(false);
  };

  return (
    <div
      className={`pointer-events-auto fixed bottom-[calc(var(--bottom-intel-stack-clearance,3.25rem)+1rem+env(safe-area-inset-bottom,0px))] right-3 ${Z_ABOVE_NAV} w-[min(92vw,20rem)] sm:right-4`}
      role="dialog"
      aria-labelledby="sound-nudge-title"
      aria-describedby="sound-nudge-body"
    >
      <div className="overflow-hidden rounded-xl border border-sky-400/30 bg-[#071120]/96 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="px-4 pt-3.5">
          <p id="sound-nudge-title" className="text-[15px] font-semibold text-sky-50">
            {t("soundNudgeTitle", lang)}
          </p>
          <p
            id="sound-nudge-body"
            className="mt-1.5 text-body leading-relaxed text-sky-100/75"
          >
            {t("soundNudgeBody", lang)}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 pb-3.5 pt-3">
          <button
            type="button"
            onClick={accept}
            className="min-h-[38px] flex-1 rounded-lg border border-sky-300/45 bg-sky-500/20 px-3 text-body font-semibold text-sky-50 transition hover:bg-sky-500/30"
          >
            {t("soundNudgeAccept", lang)}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="min-h-[38px] rounded-lg border border-white/12 px-3 text-body text-white/65 transition hover:border-white/25 hover:text-white"
          >
            {t("soundNudgeDismiss", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
