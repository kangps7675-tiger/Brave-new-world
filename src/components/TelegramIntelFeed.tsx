"use client";

import { useMemo } from "react";
import { EvidenceTierBadge } from "@/components/EvidenceTierBadge";
import { HoverHint } from "@/components/HoverHint";
import {
  TELEGRAM_CATALOG_NOTE,
  TELEGRAM_REGION_LABELS,
  type TelegramAlert,
  type TelegramAlertRegion,
} from "@/lib/telegramAlerts";
import { useLocale } from "@/contexts/LocaleContext";
import { localizedDisplayText, useLocalizedTextMap } from "@/hooks/useLocalizedTextMap";

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
  /** 닫기 → 레이어 체크박스 OFF (GlobeDashboard) */
  onClose?: () => void;
  /** 모바일 — 더 큰 탭 타겟 */
  compactUi?: boolean;
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

export function TelegramIntelFeed({
  alerts,
  liveStatus,
  live,
  needsAuth,
  embedMode = true,
  channelCount = 0,
  fullPage = false,
  regionFilter = "all",
  onClose,
  compactUi = false,
}: TelegramIntelFeedProps) {
  const { lang } = useLocale();
  const filtered =
    regionFilter === "all"
      ? alerts
      : alerts.filter((alert) => alert.region === regionFilter);

  const koreanEntries = useMemo(
    () => filtered.map((alert) => ({ key: alert.id, text: alert.text })),
    [filtered],
  );
  const localizedMap = useLocalizedTextMap(koreanEntries, lang);

  const shellClass = fullPage
    ? "flex min-h-0 flex-1 flex-col"
    : "overflow-hidden rounded-2xl border border-sky-300/20 bg-[#0a1428]/88 shadow-2xl backdrop-blur-md";

  return (
    <div className={shellClass}>
      {!fullPage ? (
        <div className="flex items-center justify-between gap-3 border-b border-sky-300/15 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-sky-200/75">Telegram OSINT</p>
            <p className="mt-0.5 text-xs text-sky-50/90">
              {embedMode
                ? `공개 채널 임베드 · ${channelCount || "—"}채널`
                : "분쟁 지역 실시간 속보"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LiveBadge live={live} liveStatus={liveStatus} embedMode={embedMode} />
            {onClose ? <TelegramCloseButton onClick={onClose} compactUi={compactUi} /> : null}
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-3 shrink-0 rounded-xl border border-cyan-400/25 bg-cyan-950/15 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 text-xs font-semibold text-cyan-100">Telegram OSINT · Raw 피드</p>
            <div className="flex shrink-0 items-center gap-2">
              <LiveBadge live={live} liveStatus={liveStatus} embedMode={embedMode} />
              {onClose ? <TelegramCloseButton onClick={onClose} compactUi={compactUi} /> : null}
            </div>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-cyan-200/60">
            RSS/GDELT 뉴스·AI 요약과 분리 · {embedMode ? `공개 임베드 ${channelCount || "—"}채널` : "수집기"}
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={`text-xs leading-5 text-slate-400 ${fullPage ? "mx-4 mt-4" : "px-3 py-4"}`}>
          {liveStatus === "loading" ? (
            <p>텔레그램 공개 채널을 동기화하는 중…</p>
          ) : embedMode ? (
            <>
              <p className="font-medium text-sky-200/90">공개 임베드 수집 (로그인 불필요)</p>
              <p className="mt-2 text-slate-500">60초마다 자동 갱신 · 우크라이나·중동 채널</p>
            </>
          ) : needsAuth ? (
            <p className="font-medium text-amber-200/90">터미널에서 텔레그램 로그인이 필요합니다.</p>
          ) : (
            <p>속보를 불러오는 중입니다…</p>
          )}
          {!fullPage ? (
            <p className="mt-2 text-[10px] text-slate-600">{TELEGRAM_CATALOG_NOTE}</p>
          ) : null}
        </div>
      ) : (
        <ul
          className={
            fullPage
              ? "min-h-0 flex-1 divide-y divide-sky-300/10 overflow-y-auto px-1 py-2"
              : "max-h-[min(42vh,320px)] divide-y divide-sky-300/10 overflow-y-auto"
          }
        >
          {filtered.map((alert) => (
            <li key={alert.id} className={`${fullPage ? "mx-3 rounded-lg px-4 py-3 hover:bg-white/5" : "px-3 py-2.5"}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] text-cyan-100">
                  Telegram
                </span>
                <EvidenceTierBadge tier="unverified" lang={lang} />
                <span className="font-medium text-sky-50">
                  {TELEGRAM_REGION_LABELS[alert.region as TelegramAlertRegion]}
                </span>
                <span className="text-slate-500">{formatTime(alert.receivedAt)}</span>
              </div>
              <p className="mt-1 truncate text-[11px] text-sky-100/70">@{alert.channelUsername}</p>
              <p className="mt-1 line-clamp-4 text-[11px] leading-5 text-slate-300">
                {localizedDisplayText(localizedMap, alert.id, alert.text)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!fullPage ? (
        <p className="border-t border-sky-300/10 px-3 py-2 text-[10px] leading-4 text-slate-500">
          Raw 피드 · Intel 뉴스·AI 요약과 분리
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
      className={`rounded-full border px-2 py-0.5 text-[10px] ${
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
          : live
            ? "LIVE"
            : liveStatus === "waiting"
              ? "대기"
              : "대기"}
    </span>
  );
}
