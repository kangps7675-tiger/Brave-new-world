"use client";

import { useEffect, useMemo, useState } from "react";
import { EvidenceTierBadge } from "@/components/EvidenceTierBadge";
import { HoverHint } from "@/components/HoverHint";
import {
  TELEGRAM_CATALOG_NOTE,
  TELEGRAM_REGION_LABELS,
  type TelegramAlert,
  type TelegramAlertRegion,
  type TelegramMediaKind,
} from "@/lib/telegramAlerts";
import { telegramPostUrl } from "@/lib/telegramPublicAlert";
import {
  resolveTelegramPlace,
  type TelegramPlaceHit,
} from "@/lib/telegramPlaceMatch";
import {
  isMostlyEnglish,
  isMostlyKorean,
  translateText,
} from "@/lib/koreanTranslate";
import { useLocale } from "@/contexts/LocaleContext";

export type TelegramMediaFilter = "all" | "video" | "photo" | "media";

export type TelegramFlyPlace = Pick<TelegramPlaceHit, "lat" | "lng" | "label">;

type TelegramIntelFeedProps = {
  alerts: TelegramAlert[];
  liveStatus: "idle" | "loading" | "ok" | "error" | "stub" | "waiting";
  live: boolean;
  needsAuth?: boolean;
  sessionExists?: boolean;
  embedMode?: boolean;
  channelCount?: number;
  /** Intel 시트 full-page 레이아웃 */
  fullPage?: boolean;
  regionFilter?: TelegramAlertRegion | "all";
  /** 영상/사진만 모아보기 */
  mediaFilter?: TelegramMediaFilter;
  /** 닫기 → 레이어 체크박스 OFF (GlobeDashboard) */
  onClose?: () => void;
  /** 모바일 — 더 큰 탭 타겟 */
  compactUi?: boolean;
  /** 본문 지명 정확 매칭 시 지도로 이동 (지정학) */
  onFlyToPlace?: (place: TelegramFlyPlace) => void;
};

function TelegramCloseButton({
  onClick,
  compactUi = false,
}: {
  onClick: () => void;
  compactUi?: boolean;
}) {
  const { t } = useLocale();
  const size = compactUi ? "h-10 w-10 text-lg" : "h-9 w-9 text-base";
  return (
    <HoverHint placement="bottom" title={t("closeTelegramOsint")} detail={t("closeTelegramOsintHint")}>
      <button
        type="button"
        onClick={onClick}
        aria-label={t("closeTelegramOsint")}
        title={t("closeTelegramOsint")}
        className={`tap-target flex shrink-0 items-center justify-center rounded-full border border-red-400/50 bg-red-950/80 font-bold leading-none text-red-50 shadow-[0_4px_14px_rgba(127,29,29,0.35)] transition hover:border-red-300/75 hover:bg-red-900/90 hover:text-white active:scale-95 ${size}`}
      >
        ✕
      </button>
    </HoverHint>
  );
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function inferMediaKind(alert: TelegramAlert): TelegramMediaKind {
  if (alert.mediaKind === "video" || alert.mediaKind === "photo") return alert.mediaKind;
  if (/^\[영상\]/.test(alert.text)) return "video";
  if (/^\[사진\]/.test(alert.text)) return "photo";
  return alert.mediaKind ?? "none";
}

export function alertMatchesMediaFilter(
  alert: TelegramAlert,
  filter: TelegramMediaFilter = "all",
): boolean {
  if (filter === "all") return true;
  const kind = inferMediaKind(alert);
  if (filter === "video") return kind === "video";
  if (filter === "photo") return kind === "photo";
  return kind === "video" || kind === "photo";
}

function mediaBadgeLabel(kind: TelegramMediaKind, lang: "ko" | "en"): string | null {
  if (kind === "video") return lang === "en" ? "Video" : "영상";
  if (kind === "photo") return lang === "en" ? "Photo" : "사진";
  return null;
}

function TelegramAlertCard({
  alert,
  place,
  lang,
  onFlyToPlace,
  fullPage,
  preferMediaCta = false,
}: {
  alert: TelegramAlert;
  place: TelegramPlaceHit | null;
  lang: "ko" | "en";
  onFlyToPlace?: (place: TelegramFlyPlace) => void;
  fullPage: boolean;
  preferMediaCta?: boolean;
}) {
  const [showEmbed, setShowEmbed] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translateStatus, setTranslateStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const mediaKind = inferMediaKind(alert);
  const mediaLabel = mediaBadgeLabel(mediaKind, lang);
  const postUrl = telegramPostUrl(alert);
  const embedSrc = alert.messageUrl
    ? `${alert.messageUrl.replace(/\/$/, "")}?embed=1`
    : null;
  const sourceText = alert.text?.trim() ?? "";
  const needsTranslate =
    Boolean(sourceText) &&
    !(lang === "ko" && isMostlyKorean(sourceText)) &&
    !(lang === "en" && isMostlyEnglish(sourceText));

  useEffect(() => {
    if (lang !== "ko" || !needsTranslate || translated) return;
    let cancelled = false;
    setTranslateStatus("loading");
    void translateText(sourceText, "ko")
      .then((out) => {
        if (cancelled) return;
        setTranslated(out);
        setShowTranslation(true);
        setTranslateStatus("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setTranslateStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [lang, needsTranslate, sourceText, translated]);

  const onTranslateClick = async () => {
    if (translated) {
      setShowTranslation((v) => !v);
      return;
    }
    if (!sourceText || translateStatus === "loading") return;
    setTranslateStatus("loading");
    try {
      const out = await translateText(sourceText, lang);
      setTranslated(out);
      setShowTranslation(true);
      setTranslateStatus("idle");
    } catch {
      setTranslateStatus("error");
    }
  };

  const primaryText =
    showTranslation && translated && lang === "ko" ? translated : sourceText;
  const showOriginalUnder =
    lang === "ko" && showTranslation && Boolean(translated) && translated !== sourceText;

  return (
    <li
      className={`${fullPage ? "mx-3 rounded-lg px-4 py-3 hover:bg-white/5" : "px-3 py-2.5"}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta">
        <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-1.5 py-0.5 text-micro text-cyan-100">
          {lang === "en" ? "Telegram" : "텔레그램"}
        </span>
        <EvidenceTierBadge tier="unverified" lang={lang} />
        {mediaLabel ? (
          <span className="rounded-full border border-violet-300/40 bg-violet-500/15 px-1.5 py-0.5 text-micro text-violet-100">
            {mediaLabel}
          </span>
        ) : null}
        <span className="font-medium text-sky-50">
          {TELEGRAM_REGION_LABELS[alert.region as TelegramAlertRegion]}
        </span>
        <span className="text-slate-500">{formatTime(alert.receivedAt)}</span>
      </div>
      <p className="mt-1 text-meta text-sky-100/70">
        @{alert.channelUsername}
        {alert.channelTitle && alert.channelTitle !== alert.channelUsername ? (
          <span className="text-slate-500"> · {alert.channelTitle}</span>
        ) : null}
      </p>
      {primaryText ? (
        <p className="mt-1.5 whitespace-pre-wrap break-words text-caption leading-5 text-slate-200/90">
          {primaryText}
        </p>
      ) : (
        <p className="mt-1.5 text-caption leading-5 text-slate-400/90">
          {lang === "en"
            ? "Preview unavailable. Open the original on Telegram."
            : "미리보기를 불러오지 못했습니다. 텔레그램에서 원문을 여세요."}
        </p>
      )}
      {alert.textTruncated ? (
        <p className="mt-1 text-micro text-slate-500">
          {lang === "en" ? "Half preview · full post on Telegram" : "절반 미리보기 · 전문은 텔레그램"}
        </p>
      ) : null}
      {showOriginalUnder ? (
        <div className="mt-2 rounded-md border border-white/10 bg-black/25 px-2.5 py-2">
          <p className="text-micro font-medium text-slate-400">원문</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-caption leading-5 text-slate-400/90">
            {sourceText}
          </p>
        </div>
      ) : null}
      {showTranslation && translated && lang === "en" ? (
        <div className="mt-2 rounded-md border border-amber-300/25 bg-amber-500/10 px-2.5 py-2">
          <p className="text-micro font-medium text-amber-100/85">Translation</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-caption leading-5 text-amber-50/95">
            {translated}
          </p>
        </div>
      ) : null}
      {translateStatus === "error" ? (
        <p className="mt-1.5 text-micro text-rose-200/80">
          {lang === "en" ? "Translation failed. Try again." : "번역에 실패했습니다. 다시 시도하세요."}
        </p>
      ) : null}
      {place ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded border border-amber-300/30 bg-amber-500/10 px-1.5 py-0.5 text-micro text-amber-100/90">
            {lang === "en" ? `Place · ${place.label}` : `위치 · ${place.label}`}
          </span>
          {onFlyToPlace ? (
            <button
              type="button"
              onClick={() =>
                onFlyToPlace({ lat: place.lat, lng: place.lng, label: place.label })
              }
              className="rounded-md border border-sky-300/40 bg-sky-500/15 px-2 py-1 text-micro font-medium text-sky-50 transition hover:border-sky-300/60 hover:bg-sky-500/25"
            >
              {lang === "en" ? `Fly · ${place.label}` : `여기로 · ${place.label}`}
            </button>
          ) : null}
        </div>
      ) : null}
      {postUrl || needsTranslate ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {needsTranslate ? (
            <button
              type="button"
              onClick={() => void onTranslateClick()}
              disabled={translateStatus === "loading"}
              aria-busy={translateStatus === "loading"}
              className="rounded-md border border-amber-300/50 bg-amber-500/20 px-2.5 py-1.5 text-micro font-semibold text-amber-50 transition hover:border-amber-200/70 hover:bg-amber-500/30 disabled:cursor-wait disabled:opacity-70"
            >
              {translateStatus === "loading"
                ? lang === "en"
                  ? "Translating…"
                  : "번역 중…"
                : translated
                  ? showTranslation
                    ? lang === "en"
                      ? "Hide translation"
                      : "원문만 보기"
                    : lang === "en"
                      ? "Show translation"
                      : "한글 번역 보기"
                  : lang === "en"
                    ? "Translate"
                    : "한글로 번역"}
            </button>
          ) : null}
          {postUrl ? (
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-cyan-300/50 bg-cyan-500/20 px-2.5 py-1.5 text-micro font-semibold text-cyan-50 transition hover:border-cyan-200/70 hover:bg-cyan-500/30"
            >
              {lang === "en" ? "Open on Telegram →" : "텔레그램에서 보기 →"}
            </a>
          ) : null}
          {embedSrc ? (
            <button
              type="button"
              onClick={() => setShowEmbed((v) => !v)}
              className={`rounded-md border px-2 py-1 text-micro font-medium transition ${
                preferMediaCta
                  ? "border-violet-300/55 bg-violet-500/25 text-violet-50 hover:border-violet-200/70 hover:bg-violet-500/35"
                  : "border-violet-300/45 bg-violet-500/15 text-violet-50 hover:border-violet-300/65 hover:bg-violet-500/25"
              }`}
            >
              {showEmbed
                ? lang === "en"
                  ? "Hide media preview"
                  : "미디어 미리보기 닫기"
                : lang === "en"
                  ? mediaKind === "video"
                    ? "Load video preview"
                    : "Load media preview"
                  : mediaKind === "video"
                    ? "영상 미리보기 로드"
                    : "미디어 미리보기 로드"}
            </button>
          ) : null}
        </div>
      ) : null}
      {showEmbed && embedSrc ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-violet-300/25 bg-black/40">
          <iframe
            title={
              lang === "en"
                ? `Telegram post ${alert.channelUsername}`
                : `텔레그램 ${alert.channelUsername}`
            }
            src={embedSrc}
            className="h-[min(420px,55vh)] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer"
            allow="encrypted-media; fullscreen; picture-in-picture"
          />
          <p className="border-t border-violet-300/15 px-2 py-1.5 text-micro leading-4 text-violet-100/65">
            {lang === "en"
              ? "Official t.me embed · not rehosted. Graphic combat footage may appear."
              : "공식 t.me 임베드 · 재호스팅 없음. 전장·폭격 영상이 포함될 수 있습니다."}
          </p>
        </div>
      ) : null}
    </li>
  );
}

export function TelegramIntelFeed({
  alerts,
  liveStatus,
  live,
  needsAuth,
  embedMode = true,
  channelCount = 0,
  fullPage = false,
  regionFilter = "all",
  mediaFilter = "all",
  onClose,
  compactUi = false,
  onFlyToPlace,
}: TelegramIntelFeedProps) {
  const { lang } = useLocale();
  const filtered = useMemo(() => {
    const byRegion =
      regionFilter === "all"
        ? alerts
        : alerts.filter((alert) => alert.region === regionFilter);
    return byRegion.filter((alert) => alertMatchesMediaFilter(alert, mediaFilter));
  }, [alerts, mediaFilter, regionFilter]);

  const placeById = useMemo(() => {
    const map = new Map<string, TelegramPlaceHit>();
    for (const alert of filtered) {
      if (
        alert.placeLabel &&
        typeof alert.placeLat === "number" &&
        typeof alert.placeLng === "number"
      ) {
        map.set(alert.id, {
          label: alert.placeLabel,
          lat: alert.placeLat,
          lng: alert.placeLng,
          source: "middle-east",
          precision: "city",
        });
        continue;
      }
      if (alert.text?.trim()) {
        const hit = resolveTelegramPlace(alert.text, alert.region);
        if (hit) map.set(alert.id, hit);
      }
    }
    return map;
  }, [filtered]);

  const isVideoDesk = mediaFilter === "video" || mediaFilter === "media";
  const shellClass = fullPage
    ? "flex min-h-0 flex-1 flex-col"
    : "overflow-hidden rounded-2xl border border-sky-300/20 bg-[#0a1428]/88 shadow-2xl backdrop-blur-md";

  return (
    <div className={shellClass}>
      {!fullPage ? (
        <div className="flex items-center justify-between gap-3 border-b border-sky-300/15 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-micro uppercase tracking-[0.24em] text-sky-200/75">
              {isVideoDesk
                ? lang === "en"
                  ? "Telegram Video"
                  : "텔레그램 영상"
                : lang === "en"
                  ? "Telegram OSINT"
                  : "텔레그램 OSINT"}
            </p>
            <p className="mt-0.5 text-xs text-sky-50/90">
              {isVideoDesk
                ? lang === "en"
                  ? `Frontline media · ${filtered.length} clips`
                  : `전선 미디어 · ${filtered.length}건`
                : embedMode
                  ? lang === "en"
                    ? `Link desk · ${channelCount || "—"} channels`
                    : `링크 데스크 · ${channelCount || "—"}채널`
                  : lang === "en"
                    ? "Conflict region alerts · links only"
                    : "분쟁 지역 속보 · 링크만"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LiveBadge live={live} liveStatus={liveStatus} embedMode={embedMode} />
            {onClose ? <TelegramCloseButton onClick={onClose} compactUi={compactUi} /> : null}
          </div>
        </div>
      ) : (
        <div
          className={`mx-4 mt-3 shrink-0 rounded-xl border px-3 py-2.5 ${
            isVideoDesk
              ? "border-violet-400/30 bg-violet-950/20"
              : "border-cyan-400/25 bg-cyan-950/15"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p
              className={`min-w-0 text-xs font-semibold ${
                isVideoDesk ? "text-violet-100" : "text-cyan-100"
              }`}
            >
              {isVideoDesk
                ? lang === "en"
                  ? "Telegram video desk · OSINT"
                  : "텔레그램 영상 데스크 · OSINT"
                : lang === "en"
                  ? "Telegram OSINT · half preview"
                  : "텔레그램 OSINT · 절반 미리보기"}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <LiveBadge live={live} liveStatus={liveStatus} embedMode={embedMode} />
              {onClose ? <TelegramCloseButton onClick={onClose} compactUi={compactUi} /> : null}
            </div>
          </div>
          <p
            className={`mt-1 text-meta leading-5 ${
              isVideoDesk ? "text-violet-200/65" : "text-cyan-200/60"
            }`}
          >
            {isVideoDesk
              ? lang === "en"
                ? "Video-only queue · open on Telegram or load official t.me embed · body not shown"
                : "영상만 모음 · 텔레그램에서 열기 또는 공식 embed · 전문 비표시"
                : lang === "en"
                  ? `Separate from RSS/GDELT/AI · ${embedMode ? `${channelCount || "—"} ch` : "collector"} · ~half preview · CTA for full post`
                  : `RSS/GDELT·AI와 분리 · ${embedMode ? `${channelCount || "—"}채널` : "수집기"} · 절반 미리보기 · 전문은 CTA`}
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={`text-xs leading-5 text-slate-400 ${fullPage ? "mx-4 mt-4" : "px-3 py-4"}`}>
          {liveStatus === "loading" ? (
            <p>텔레그램 공개 채널을 동기화하는 중…</p>
          ) : alerts.length > 0 && regionFilter !== "all" ? (
            <>
              <p className="font-medium text-sky-200/90">
                {lang === "en"
                  ? `No Telegram posts for this theater filter (${regionFilter}).`
                  : `선택한 전장 필터(${TELEGRAM_REGION_LABELS[regionFilter as TelegramAlertRegion] ?? regionFilter})에 해당하는 텔레그램 속보가 없습니다.`}
              </p>
              <p className="mt-2 text-slate-500">
                {lang === "en"
                  ? "Open the News tab and set theater to All, or switch region."
                  : "뉴스 탭에서 전장을 「전체」로 바꾸거나 다른 전장을 선택해 보세요."}
              </p>
            </>
          ) : isVideoDesk ? (
            <p className="font-medium text-violet-200/90">
              {lang === "en"
                ? "No video posts in the current window. Check back after the next sync."
                : "지금 구간에 영상 포스트가 없습니다. 다음 동기화 후 다시 확인하세요."}
            </p>
          ) : liveStatus === "waiting" ? (
            <>
              <p className="font-medium text-sky-200/90">
                {lang === "en"
                  ? "Waiting for cron ingest — browser does not scrape Telegram"
                  : "수집 대기 — 브라우저는 텔레그램을 긁지 않습니다"}
              </p>
              <p className="mt-2 text-slate-500">
                {lang === "en"
                  ? "Cron worker fills D1; this panel only reads cached alerts. First load can take ~30s."
                  : "Cron 워커가 D1에 쌓으면 표시됩니다. 첫 로드는 최대 30초 걸릴 수 있습니다."}
              </p>
            </>
          ) : embedMode ? (
            <>
              <p className="font-medium text-sky-200/90">공개 임베드 수집 (로그인 불필요)</p>
              <p className="mt-2 text-slate-500">
                Cron·공유 피드 폴링 · 우크라이나·중동 채널
              </p>
            </>
          ) : needsAuth ? (
            <p className="font-medium text-amber-200/90">터미널에서 텔레그램 로그인이 필요합니다.</p>
          ) : (
            <p>속보를 불러오는 중입니다…</p>
          )}
          {!fullPage ? (
            <p className="mt-2 text-micro text-slate-600">{TELEGRAM_CATALOG_NOTE}</p>
          ) : null}
        </div>
      ) : (
        <ul
          className={
            fullPage
              ? "intel-scroll-y min-h-0 flex-1 divide-y divide-sky-300/10 px-1 py-2"
              : "intel-scroll-y max-h-[min(52vh,480px)] divide-y divide-sky-300/10"
          }
        >
          {filtered.map((alert) => (
            <TelegramAlertCard
              key={alert.id}
              alert={alert}
              place={placeById.get(alert.id) ?? null}
              lang={lang === "en" ? "en" : "ko"}
              onFlyToPlace={onFlyToPlace}
              fullPage={fullPage}
              preferMediaCta={isVideoDesk}
            />
          ))}
        </ul>
      )}

      {!fullPage ? (
        <p className="border-t border-sky-300/10 px-3 py-2 text-micro leading-4 text-slate-500">
          절반 미리보기 · 한국어 자동 번역 · 전문은 텔레그램 · 영상/사진은 클릭 시에만 t.me 임베드
        </p>
      ) : null}
    </div>
  );
}

function LiveBadge({
  live,
  liveStatus,
  embedMode,
}: {
  live: boolean;
  liveStatus: TelegramIntelFeedProps["liveStatus"];
  embedMode: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-micro ${
        live
          ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-100"
          : "border-sky-300/25 bg-sky-400/10 text-sky-100/80"
      }`}
    >
      {liveStatus === "loading"
        ? "동기화"
        : liveStatus === "error"
          ? embedMode
            ? "재시도"
            : "오프라인"
          : liveStatus === "waiting"
            ? "대기"
            : liveStatus === "stub"
              ? "샘플"
              : live || liveStatus === "ok"
                ? "LIVE"
                : "—"}
    </span>
  );
}
