"use client";

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
import { zc } from "@/lib/uiStack";

type Props = {
  lang: LabelLanguage;
  event: LiveuamapEvent;
  onClose: () => void;
  onOpenFull: () => void;
  onFocusChokepoint?: (choke: LiveuaFlashChokepoint) => void;
  onFocusMarkets?: () => void;
  onEnableShipTraffic?: () => void;
};

/**
 * LiveUA「위치로 가기」후 지구본 위에 붙는 미디어 퍼스트 포커스 카드.
 * 양피지를 닫아 Ctrl/Alt 카메라 조작이 가능하게 한 뒤, 사건·시세·해협을 한 줄로 잇는다.
 */
export function LiveuaEventFocusCard({
  lang,
  event,
  onClose,
  onOpenFull,
  onFocusChokepoint,
  onFocusMarkets,
  onEnableShipTraffic,
}: Props) {
  const en = lang === "en";
  const peeled = splitLiveuaTitleBody(
    en ? event.title : event.titleKo?.trim() || event.title,
    en ? event.body : event.bodyKo?.trim() || event.body,
    event.sourceUrl,
  );
  const title = peeled.title;
  const body = peeled.body;
  const market = liveuaFlashMarketContext(event);
  const hasMedia = Boolean(event.imageUrl || event.videoUrl);
  const hasBridge =
    market.symbols.length > 0 || Boolean(market.chokepoint) || Boolean(onEnableShipTraffic);

  return (
    <aside
      className={`pointer-events-auto fixed bottom-4 left-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-md border border-amber-500/35 bg-[#120e08]/94 font-sans shadow-2xl backdrop-blur-md sm:left-4 ${en ? "font-en" : ""} ${zc("immersive")}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label={en ? "Liveuamap event at location" : "Liveuamap 사건 위치"}
    >
      {hasMedia ? (
        <div className="relative aspect-[16/9] max-h-36 w-full bg-black/50">
          {event.videoUrl ? (
            <video
              className="h-full w-full object-cover"
              src={event.videoUrl}
              poster={event.imageUrl}
              controls
              muted
              playsInline
              preload="metadata"
            />
          ) : event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-micro uppercase tracking-[0.14em] text-amber-200/75">
              Liveuamap · {event.regionId}
            </p>
            <h3 className="mt-0.5 line-clamp-2 text-meta font-semibold text-amber-50">
              {title}
            </h3>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-sm border border-amber-500/30 px-1.5 py-0.5 text-micro text-amber-100/80 hover:bg-amber-500/15"
            aria-label={en ? "Close" : "닫기"}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {body ? (
          <p className="line-clamp-3 text-micro leading-snug text-amber-100/70">{body}</p>
        ) : null}

        <p className="rounded-sm border border-sky-400/25 bg-sky-950/40 px-2 py-1 text-micro leading-snug text-sky-100/85">
          {t("liveuaFocusControlsHint", lang)}
        </p>

        {hasBridge ? (
          <div className="space-y-1.5 border-t border-amber-600/25 pt-2">
            <p className="text-micro font-semibold uppercase tracking-wide text-amber-200/70">
              {t("liveuaFlashMarketTitle", lang)}
            </p>
            {(en ? market.noteEn : market.noteKo) ? (
              <p className="text-micro leading-snug text-amber-100/75">
                <span className="font-semibold text-amber-200/80">
                  {t("liveuaFlashMarketWhy", lang)}{" "}
                </span>
                {en ? market.noteEn : market.noteKo}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {market.chokepoint ? (
                <button
                  type="button"
                  className="rounded-sm border border-amber-600/40 bg-amber-900/40 px-2 py-0.5 text-micro text-amber-50 hover:bg-amber-800/50"
                  onClick={() => onFocusChokepoint?.(market.chokepoint!)}
                >
                  ⚓ {flashChokepointLabel(market.chokepoint, lang)}
                </button>
              ) : null}
              {onEnableShipTraffic ? (
                <button
                  type="button"
                  className="rounded-sm border border-cyan-500/35 bg-cyan-950/50 px-2 py-0.5 text-micro text-cyan-50 hover:bg-cyan-900/50"
                  onClick={onEnableShipTraffic}
                >
                  {t("liveuaFocusShips", lang)}
                </button>
              ) : null}
              {market.symbols.map((symbol) => (
                <a
                  key={symbol}
                  href={flashSymbolQuoteHref(symbol)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-micro text-emerald-50 hover:bg-emerald-900/45"
                >
                  {symbol}
                </a>
              ))}
              {onFocusMarkets ? (
                <button
                  type="button"
                  className="rounded-sm border border-emerald-500/35 bg-emerald-950/50 px-2 py-0.5 text-micro text-emerald-50 hover:bg-emerald-900/50"
                  onClick={onFocusMarkets}
                >
                  {t("liveuaFlashNextEconomy", lang)}
                </button>
              ) : null}
            </div>
            <p className="text-micro text-amber-200/45">
              {t("liveuaFlashMarketDisclaimer", lang)}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="rounded-sm border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-micro font-medium text-amber-50 hover:bg-amber-500/25"
            onClick={onOpenFull}
          >
            {en ? "Full flash" : "양피지 전문"}
          </button>
          {event.sourceUrl ? (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm border border-white/15 px-2 py-1 text-micro text-amber-100/80 hover:bg-white/5"
            >
              URL
            </a>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
