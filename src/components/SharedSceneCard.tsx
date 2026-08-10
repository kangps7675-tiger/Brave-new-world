"use client";

import { useCallback, useEffect, useState } from "react";
import { trackSceneCardCopy, trackSceneOpen } from "@/lib/analyticsEvents";
import { GTI, displayGtiScore, formatGtiBriefingLead, gtiBand, gtiBandLabel } from "@/lib/gti";
import { buildSceneCard } from "@/lib/sceneCard";
import type { SceneLinkState } from "@/lib/sceneLink";
import type { WorldTensionSnapshot } from "@/lib/dailyRanks";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

type Props = {
  scene: SceneLinkState;
  lang: LabelLanguage;
  /** 오늘의 GTI — 없으면 장면 정보만 */
  gtiSnapshot?: WorldTensionSnapshot | null;
  /** 원본 공유 URL (복사용). 없으면 현재 주소 */
  shareUrl?: string;
  onDismiss: () => void;
};

const BAND_TONE = {
  calm: "border-sky-400/40 bg-sky-500/10 text-sky-100",
  elevated: "border-amber-400/45 bg-amber-500/12 text-amber-100",
  high: "border-orange-400/50 bg-orange-500/14 text-orange-100",
  critical: "border-rose-400/55 bg-rose-500/16 text-rose-100",
} as const;

/**
 * 공유 장면 카드 — 폰 랜딩 (P2-3-A)
 *
 * 폰은 지구본을 마운트하지 않는다(성능상 옳은 결단). 그래서 데스크톱에서
 * 공유한 `?scene=` 링크를 폰에서 열면 **아무것도 못 보고 끝났다.**
 * 유입은 있는데 장면이 전달되지 않으니 재공유도 없다 — 성장 루프가 끊긴 지점.
 *
 * 여기서의 약속은 「지도」가 아니라
 * **「공유된 장면이 무엇이었는지 이해할 수 있다」**이다:
 *   · 어디를 보고 있었나 (좌표 → 지명)
 *   · 무엇을 켜고 있었나 (레이어 → 주제 최대 3개)
 *   · 오늘 세계는 어떤 상태인가 (GTI)
 *   · 지도로 보고 싶으면 어디로 가야 하나 (CTA + 링크 복사)
 *
 * 지명을 못 찾으면 **지어내지 않고 좌표를 보여준다.** 남태평양 한복판을
 * 「아프리카」라고 부르면 카드 전체의 신뢰가 무너진다.
 */
export function SharedSceneCard({
  scene,
  lang,
  gtiSnapshot,
  shareUrl,
  onDismiss,
}: Props) {
  const [copied, setCopied] = useState(false);
  const card = buildSceneCard(scene, lang);
  const band = gtiSnapshot ? gtiBand(gtiSnapshot.score) : null;

  /**
   * 씬이 폰 카드로 전달됐음을 기록.
   * `placeResolved`를 같이 보내는 이유: 지명을 못 찾아 좌표만 보여준 비율이
   * 높으면 `SCENE_PLACES` 앵커를 늘려야 한다는 신호다.
   */
  useEffect(() => {
    trackSceneOpen("card", scene.mode, card.placeResolved);
    // 장면 1건당 1회만 — card는 매 렌더 새 객체라 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.mode, scene.lat, scene.lng]);

  const copyLink = useCallback(() => {
    const url =
      shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
    if (!url) return;
    try {
      void navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        trackSceneCardCopy(scene.mode);
        window.setTimeout(() => setCopied(false), 2_000);
      });
    } catch {
      /* 클립보드 차단 환경 — 조용히 무시 */
    }
  }, [scene.mode, shareUrl]);

  return (
    <section
      className="mx-auto w-full max-w-lg px-4 py-6"
      aria-label={t("sceneCardKicker", lang)}
    >
      <p className="text-meta font-medium uppercase tracking-[0.24em] text-sky-200/60">
        {t("sceneCardKicker", lang)} · {card.modeLabel}
      </p>

      <h1 className="mt-2 text-2xl font-semibold leading-tight text-slate-50">
        {card.placeLabel}
      </h1>
      {!card.placeResolved ? (
        <p className="mt-1 text-meta text-slate-500">{t("sceneCardCoordsOnly", lang)}</p>
      ) : null}
      {card.asOfLabel ? (
        <p className="mt-2 text-caption text-amber-100/80">{card.asOfLabel}</p>
      ) : null}

      {/* 오늘의 GTI — 장면과 무관하게 "지금 세계"를 알려주는 앵커 */}
      {gtiSnapshot && band ? (
        <div className={`mt-4 rounded-xl border px-4 py-3 ${BAND_TONE[band]}`}>
          <p className="flex items-baseline gap-2">
            <span className="text-meta uppercase tracking-[0.2em] opacity-70">
              {GTI.ticker}
            </span>
            <span className="font-data-mono text-3xl font-bold leading-none">
              {displayGtiScore(gtiSnapshot.score)}
            </span>
            <span className="text-sm font-semibold">
              {gtiBandLabel(band, lang !== "en")}
            </span>
          </p>
          <p className="mt-1.5 text-caption leading-relaxed opacity-85">
            {formatGtiBriefingLead(gtiSnapshot, lang === "en" ? "en" : "ko")}
          </p>
        </div>
      ) : null}

      {card.topics.length > 0 ? (
        <div className="mt-4">
          <p className="text-meta uppercase tracking-[0.2em] text-slate-500">
            {t("sceneCardWhat", lang)}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {card.topics.map((topic) => (
              <li
                key={topic}
                className="rounded-full border border-slate-600/60 bg-slate-900/50 px-3 py-1.5 text-caption text-slate-200"
              >
                {topic}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-slate-700/70 bg-black/30 p-4">
        <p className="text-caption leading-relaxed text-slate-400">
          {t("sceneCardDesktopHint", lang)}
        </p>
        <button
          type="button"
          onClick={copyLink}
          className="mt-3 min-h-[var(--tap-target-min)] w-full rounded-lg border border-sky-300/45 bg-sky-500/20 px-4 text-body font-semibold text-sky-50 transition hover:bg-sky-500/30"
        >
          {copied ? t("sceneCardCopied", lang) : t("sceneCardCopyLink", lang)}
        </button>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-4 min-h-[var(--tap-target-min)] w-full rounded-lg border border-white/12 px-4 text-body text-white/70 transition hover:border-white/25 hover:text-white"
      >
        {t("sceneCardDismiss", lang)}
      </button>
    </section>
  );
}
