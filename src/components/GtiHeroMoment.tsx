"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { displayGtiScore, formatGtiBriefingLead, gtiBand, gtiBandLabel, GTI } from "@/lib/gti";
import type { WorldTensionSnapshot } from "@/lib/dailyRanks";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  snapshot: WorldTensionSnapshot;
  lang: LabelLanguage;
  /** firstImpression 상태 머신이 gti 단계일 때만 true */
  visible: boolean;
};

const BAND_TONE: Record<ReturnType<typeof gtiBand>, string> = {
  calm: "text-sky-200 border-sky-400/40 bg-sky-500/10",
  elevated: "text-amber-100 border-amber-400/45 bg-amber-500/12",
  high: "text-orange-100 border-orange-400/50 bg-orange-500/14",
  critical: "text-rose-100 border-rose-400/55 bg-rose-500/16",
};

/**
 * GTI 히어로 — 첫 90초의 2단계.
 *
 * `gti.ts` 주석이 이미 정답을 적어 놨다:
 *   "이 서비스의 **단일 기축 통화**. 랭킹·게이지·예측·사운드·브리핑은
 *    전부 이 숫자(및 전일 대비 Δ)의 파생상품으로 취급한다."
 *
 * 그런데 지금까지 첫 방문자는 이 기축 통화를 4번째 화면에서야 만났다.
 * 지구본이 열리자마자 화면 중앙에 크게 한 번 보여주고, 곧 우상단 칩 자리로
 * 축소시킨다. **그 축소 전환이 "저 칩이 무슨 숫자인지"를 가르친다** —
 * 이후 모든 방문에서 칩만 봐도 읽힌다.
 *
 * 문구는 `formatGtiBriefingLead()` 그대로 쓴다. 새로 쓰지 않는다.
 * reduced-motion이면 이동 연출 없이 그대로 표시한다.
 */
export function GtiHeroMoment({ snapshot, lang, visible }: Props) {
  const reducedMotion = useReducedMotion();
  const [shrinking, setShrinking] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShrinking(false);
      return;
    }
    if (reducedMotion) return;
    // 표시 후 잠시 뒤 축소 — 칩 자리로 옮겨가며 의미를 학습시킨다
    const id = window.setTimeout(() => setShrinking(true), 3_000);
    return () => window.clearTimeout(id);
  }, [visible, reducedMotion]);

  if (!visible) return null;

  const band = gtiBand(snapshot.score);
  const score = displayGtiScore(snapshot.score) ?? 0;
  const lead = formatGtiBriefingLead(snapshot, lang === "en" ? "en" : "ko");

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[22vh] z-[600] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex flex-col items-center gap-2 rounded-2xl border px-6 py-5 backdrop-blur-md transition-all duration-700 ease-out ${BAND_TONE[band]} ${
          shrinking ? "scale-90 opacity-0" : "scale-100 opacity-100"
        }`}
        style={{ transitionDuration: reducedMotion ? "0ms" : undefined }}
      >
        <p className="text-meta font-medium uppercase tracking-[0.28em] opacity-70">
          {lang === "en" ? GTI.nameEn : GTI.nameKo} · {GTI.ticker}
        </p>
        <p className="flex items-baseline gap-3">
          <span className="font-data-mono text-[56px] font-bold leading-none tracking-tight">
            {score}
          </span>
          <span className="text-lg font-semibold">{gtiBandLabel(band, lang !== "en")}</span>
        </p>
        <p className="max-w-[26rem] text-center text-body leading-relaxed opacity-85">
          {lead}
        </p>
      </div>
    </div>
  );
}
