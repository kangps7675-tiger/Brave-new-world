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
import { splitLiveuaTitleBody } from "@/lib/liveuamap/peelTitleUrls";
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
  /** 접을 때 우측 상단 속보함으로 */
  exitToDock?: boolean;
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
  exitToDock = true,
}: Props) {
  const event = events[index];
  if (!event) return null;

  const en = lang === "en";
  const rawTitle = en ? event.title : event.titleKo?.trim() || event.title;
  const rawBody = en ? event.body : event.bodyKo?.trim() || event.body;
  /** 캐시된 이벤트에도 name에 URL이 붙어 있을 수 있음 → 표시 시 한 번 더 분리 */
  const peeled = splitLiveuaTitleBody(rawTitle, rawBody, event.sourceUrl);
  const title = peeled.title;
  const body = peeled.body;
  const desk = en
    ? "Frontline desk · Liveuamap · approximate geolocation"
    : "전선 데스크 · Liveuamap · 위치는 근사치";
  const coordLabel = `${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}`;
  const signOff = [event.viaSource, `Liveuamap · ${coordLabel}`, desk]
    .filter(Boolean)
    .join("\n");
  const sourceHref =
    peeled.sourceUrl && /^https?:\/\//i.test(peeled.sourceUrl)
      ? peeled.sourceUrl
      : "https://liveuamap.com/";

  const market = liveuaFlashMarketContext(event);
  const marketNote = en ? market.noteEn : market.noteKo;
  const hasMarket =
    market.symbols.length > 0 || market.chokepoint || market.suggestPipelines;
  const showNextDoors = Boolean(onGoConflict || onGoEconomy);
  const multi = events.length > 1;

  const bodyExtra = (
    <div className="space-y-3 border-t border-[#6b4a22]/25 pt-3">
      {multi ? (
        <section
          aria-label={en ? "Flash deck" : "속보 넘기기"}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <p className="text-micro font-semibold text-[#5c4020]/90">
            {en
              ? `Flash ${index + 1} of ${events.length}`
              : `속보 ${index + 1} / ${events.length}`}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              className="rounded-sm border border-[#6b4a22]/40 bg-[#efe0bc]/95 px-2.5 py-0.5 text-micro text-[#3d2a12] hover:bg-[#e8d6a8] disabled:opacity-40"
              disabled={index <= 0}
              onClick={() => onIndexChange(index - 1)}
            >
              {en ? "Previous" : "이전"}
            </button>
            <button
              type="button"
              className="rounded-sm border border-[#6b4a22]/40 bg-[#efe0bc]/95 px-2.5 py-0.5 text-micro text-[#3d2a12] hover:bg-[#e8d6a8] disabled:opacity-40"
              disabled={index >= events.length - 1}
              onClick={() => onIndexChange(index + 1)}
            >
              {en ? "Next" : "다음"}
            </button>
          </div>
        </section>
      ) : null}

      {hasMarket || marketNote ? (
        <section aria-label={t("liveuaFlashMarketTitle", lang)}>
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
          {hasMarket ? (
            <>
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
          ) : null}
        </section>
      ) : null}

      {showNextDoors ? (
        <section
          className={
            hasMarket || marketNote
              ? "border-t border-[#6b4a22]/25 pt-2"
              : undefined
          }
          aria-label={t("liveuaFlashNextHint", lang)}
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
        </section>
      ) : null}

      <section aria-label="Liveuamap">
        <p className="text-micro font-semibold uppercase tracking-wide text-[#5c4020]/90">
          Liveuamap
        </p>
        <p className="mt-1 text-micro tabular-nums text-[#3d2a12]">
          {en ? "Coordinates" : "좌표"}: {coordLabel}
        </p>
        <a
          href={sourceHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate text-micro text-[#3d2a12] underline underline-offset-2 hover:text-[#5c4020]"
          title={sourceHref}
        >
          {en ? "Source URL" : "원문 URL"}
        </a>
      </section>
    </div>
  );

  /** 닫기만 포털 — 이전/다음은 양피지 본문(bodyExtra) 안 */
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
        exitToDock={exitToDock}
        secondaryCtaLabel={t("breakingFlashGoToLocation", lang)}
        onSecondaryCta={() => onGoToLocation(event)}
        bodyExtra={bodyExtra}
      />
      {chrome}
    </>
  );
}
