"use client";

import { createPortal } from "react-dom";
import { ParchmentLetter } from "@/components/ParchmentLetter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  flashChokepointLabel,
  flashSymbolQuoteHref,
  liveuaFlashMarketContext,
  type LiveuaFlashChokepoint,
} from "@/lib/liveuamap/flashMarketContext";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import { t } from "@/lib/uiStrings";
import { Z, zc } from "@/lib/uiStack";

type Props = {
  lang: LabelLanguage;
  events: LiveuamapEvent[];
  index: number;
  onIndexChange: (next: number) => void;
  onDismiss: () => void;
  onGoToLocation: (event: LiveuamapEvent) => void;
  /** 인근 초크 칩 — 물류 레이어 ON + 초크 좌표로 이동 */
  onFocusChokepoint?: (choke: LiveuaFlashChokepoint) => void;
  /** 에너지 배관 칩 — 송유·가스관 잠깐 ON + 사건 위치로 이동 */
  onFocusPipelines?: (event: LiveuamapEvent) => void;
  /** 다음 문 — 분쟁(지정학) / 시장(지경학) */
  onGoConflict?: () => void;
  onGoEconomy?: () => void;
};

export function LiveuaFlashParchment({
  lang,
  events,
  index,
  onIndexChange,
  onDismiss,
  onGoToLocation,
  onFocusChokepoint,
  onFocusPipelines,
  onGoConflict,
  onGoEconomy,
}: Props) {
  const event = events[index];
  if (!event) return null;

  const en = lang === "en";
  const title = en ? event.title : event.titleKo?.trim() || event.title;
  const body = en ? event.body : event.bodyKo?.trim() || event.body;
  const desk = en
    ? "Frontline desk · Liveuamap · approximate geolocation"
    : "전선 데스크 · Liveuamap · 위치는 근사치";
  const signOff = [event.viaSource, event.sourceUrl, desk].filter(Boolean).join("\n");

  const market = liveuaFlashMarketContext(event);
  const marketNote = en ? market.noteEn : market.noteKo;
  const hasMarket =
    market.symbols.length > 0 || market.chokepoint || market.suggestPipelines;
  const showNextDoors = Boolean(onGoConflict || onGoEconomy);
  const showMarketDock = hasMarket || showNextDoors;

  /**
   * ParchmentLetter는 fixed inset-0 — 형제 absolute는 높이 0 relative 부모에 붙으면
   * 화면 상단으로 붕괴한다. body 포털 + fixed로 양피지 위에 올린다.
   */
  const chrome =
    typeof document !== "undefined"
      ? createPortal(
          <div
            className="pointer-events-none fixed inset-0"
            style={{ zIndex: Z.alert + 1 }}
            data-liveua-flash-chrome
          >
            <button
              type="button"
              className="pointer-events-auto absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm border border-[#6b4a22]/45 bg-[#f3e6c8]/95 text-lg leading-none text-[#3d2a12] shadow sm:right-6 sm:top-6"
              aria-label={en ? "Close" : "닫기"}
              onClick={onDismiss}
            >
              ×
            </button>

            <div className="pointer-events-auto absolute bottom-8 left-1/2 flex w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 flex-col items-center gap-2 pb-[env(safe-area-inset-bottom,0px)]">
              {showMarketDock ? (
                <div className="w-full rounded-sm border border-[#6b4a22]/35 bg-[#f3e6c8]/95 px-3 py-2 shadow">
                  {hasMarket ? (
                    <>
                      <p className="text-micro font-semibold uppercase tracking-wide text-[#5c4020]/90">
                        {t("liveuaFlashMarketTitle", lang)}
                      </p>
                      {marketNote ? (
                        <p className="mt-1 text-micro leading-snug text-[#3d2a12]">
                          <span className="font-semibold text-[#5c4020]/90">
                            {t("liveuaFlashMarketWhy", lang)}{" "}
                          </span>
                          {marketNote}
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {market.chokepoint ? (
                          <button
                            type="button"
                            className="rounded-sm border border-amber-800/35 bg-amber-100/80 px-2 py-0.5 text-micro font-medium text-[#3d2a12] hover:bg-amber-50"
                            onClick={() => onFocusChokepoint?.(market.chokepoint!)}
                            title={
                              en
                                ? `~${market.chokepoint.distanceKm} km · logistics corridor`
                                : `약 ${market.chokepoint.distanceKm} km · 물류 회랑`
                            }
                          >
                            ⚓ {flashChokepointLabel(market.chokepoint, lang)}
                          </button>
                        ) : null}
                        {market.suggestPipelines ? (
                          <button
                            type="button"
                            className="rounded-sm border border-orange-800/35 bg-orange-100/80 px-2 py-0.5 text-micro font-medium text-[#3d2a12] hover:bg-orange-50"
                            onClick={() => onFocusPipelines?.(event)}
                            title={
                              en
                                ? "Briefly show oil/gas pipelines near this flash"
                                : "이 속보 근처 송유·가스관을 잠깐 표시"
                            }
                          >
                            {en ? "⛽ Pipelines" : "⛽ 송유·가스관"}
                          </button>
                        ) : null}
                        {market.symbols.map((symbol) => (
                          <a
                            key={symbol}
                            href={flashSymbolQuoteHref(symbol)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-sm border border-[#6b4a22]/30 bg-[#efe0bc]/90 px-2 py-0.5 text-micro font-medium text-[#3d2a12] hover:bg-[#e8d6a8]"
                          >
                            {symbol}
                          </a>
                        ))}
                      </div>
                      <p className="mt-0.5 text-micro text-[#5c4020]/60">
                        {t("liveuaFlashMarketDisclaimer", lang)}
                      </p>
                    </>
                  ) : marketNote ? (
                    <p className="mb-1.5 text-micro leading-snug text-[#3d2a12]">
                      <span className="font-semibold text-[#5c4020]/90">
                        {t("liveuaFlashMarketWhy", lang)}{" "}
                      </span>
                      {marketNote}
                    </p>
                  ) : null}
                  {showNextDoors ? (
                    <div
                      className={
                        hasMarket || marketNote
                          ? "mt-2 border-t border-[#6b4a22]/25 pt-2"
                          : ""
                      }
                    >
                      <p className="text-micro font-semibold text-[#5c4020]/85">
                        {t("liveuaFlashNextHint", lang)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {onGoConflict ? (
                          <button
                            type="button"
                            className="rounded-sm border border-[#6b4a22]/40 bg-[#efe0bc]/95 px-2 py-0.5 text-micro font-medium text-[#3d2a12] hover:bg-[#e8d6a8]"
                            onClick={onGoConflict}
                          >
                            {t("liveuaFlashNextConflict", lang)}
                          </button>
                        ) : null}
                        {onGoEconomy ? (
                          <button
                            type="button"
                            className="rounded-sm border border-emerald-800/30 bg-emerald-50/90 px-2 py-0.5 text-micro font-medium text-[#3d2a12] hover:bg-emerald-50"
                            onClick={onGoEconomy}
                          >
                            {t("liveuaFlashNextEconomy", lang)}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-sm border border-[#6b4a22]/40 bg-[#f3e6c8]/95 px-3 py-1 text-micro text-[#3d2a12] disabled:opacity-40"
                  disabled={index <= 0}
                  onClick={() => onIndexChange(index - 1)}
                >
                  {en ? "Previous" : "이전"}
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-[#6b4a22]/40 bg-[#f3e6c8]/95 px-3 py-1 text-micro text-[#3d2a12]"
                  onClick={() => onGoToLocation(event)}
                >
                  {en ? "Go to location" : "위치로 가기"}
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-[#6b4a22]/40 bg-[#f3e6c8]/95 px-3 py-1 text-micro text-[#3d2a12] disabled:opacity-40"
                  disabled={index >= events.length - 1}
                  onClick={() => onIndexChange(index + 1)}
                >
                  {en ? "Next" : "다음"}
                </button>
              </div>
              <p className="pointer-events-none text-micro text-[#5c4020]/80">
                {index + 1} / {events.length}
              </p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <ParchmentLetter
        lang={lang}
        title={title}
        paragraphs={[body]}
        signOff={signOff}
        ctaLabel={en ? "Close" : "닫기"}
        onContinue={onDismiss}
        playUnfoldSound
        playBreakingDispatch
        typewriter={false}
        newsFlashFont
        blackInk
        titleId="liveua-flash-title"
        zIndexClass={zc("alert")}
        leadImageUrl={event.imageUrl}
        leadVideoUrl={event.videoUrl}
        secondaryCtaLabel={t("breakingFlashGoToLocation", lang)}
        onSecondaryCta={() => onGoToLocation(event)}
      />
      {chrome}
    </>
  );
}
