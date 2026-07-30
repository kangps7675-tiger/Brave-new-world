"use client";

import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LampWhyMattersButton } from "@/components/LampWhyMattersButton";
import { ParchmentLetter, PARCHMENT_FOLD_EXIT_MS } from "@/components/ParchmentLetter";
import {
  emitBreakingDispatchSound,
  emitParchmentFoldSound,
  emitParchmentUnfoldSound,
} from "@/components/SoundEffectsBridge";
import { BRAND_NAME } from "@/lib/brand";
import { EvidenceTierBadge } from "@/components/EvidenceTierBadge";
import { upcomingAnnouncements } from "@/lib/announcementCalendar";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { isArticleUrl } from "@/lib/news/articleLink";
import type { PeriodicBriefing } from "@/lib/news/periodicBriefing";
import { formatGtiTitle, gtiBand, gtiBandLabel } from "@/lib/gti";
import { useDialog } from "@/hooks/useDialog";
import {
  LAMP_THUMB_GRADIENT,
  LAMP_THUMB_LABEL,
  resolveLampThumbTheme,
} from "@/lib/news/lampThumbnail";

type PeriodicBriefingParchmentProps = {
  briefing: PeriodicBriefing;
  lang: LabelLanguage;
  /** 접기 — 하루 종료가 아니라 다시 펼칠 수 있게 접어둠 */
  onDismiss: () => void;
  /** 잊혀진 경고 — 지도 soft fly */
  onFlyToForgottenWarning?: (coords: {
    lat: number;
    lng: number;
    altitude?: number;
  }) => void;
};

/**
 * 지정학/지경학 등불 — 입장 온보딩 이후, 각각 하루 종일.
 * 접으면 칩으로 다시 펼칠 수 있고, 뉴스 본문은 6시간마다 갱신.
 * 지정학·지경학 모두 사진 데스크(지역별 심층). 과거사건 텍스트 양피지는 쓰지 않음.
 */
export function PeriodicBriefingParchment({
  briefing,
  lang,
  onDismiss,
  onFlyToForgottenWarning,
}: PeriodicBriefingParchmentProps) {
  const isConflictLamp = /-conflict(?:$|-)/.test(briefing.key);
  const isPhotoLamp =
    isConflictLamp ||
    (briefing.featuredNews && briefing.featuredNews.length > 0) ||
    (briefing.macroTable && briefing.macroTable.length > 0);

  if (!isPhotoLamp) {
    return (
      <ParchmentLetter
        lang={lang}
        title={briefing.title}
        paragraphs={briefing.paragraphs}
        ctaLabel={lang === "en" ? "Fold" : "접기"}
        onContinue={onDismiss}
        playBreakingDispatch
        titleId="periodic-briefing-title"
        historyHandFont={lang !== "en"}
        blackInk
      />
    );
  }

  return (
    <PhotoNewsLampParchment
      briefing={briefing}
      lang={lang}
      onDismiss={onDismiss}
      onFlyToForgottenWarning={onFlyToForgottenWarning}
    />
  );
}

function PhotoNewsLampParchment({
  briefing,
  lang,
  onDismiss,
  onFlyToForgottenWarning,
}: PeriodicBriefingParchmentProps) {
  /** 브리핑 양피지 — Escape로 접는다 (P1-7) */
  const dialogRef = useDialog<HTMLDivElement>({ open: true, onClose: onDismiss });
  const [phase, setPhase] = useState<"idle" | "folding" | "done">("idle");
  const [expandedNews, setExpandedNews] = useState(false);
  /** 모바일 — 전장/거시 카테고리 패널 접기 (기본 접힘) */
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const parchmentStack =
    lang === "en"
      ? "var(--font-intel)"
      : 'var(--font-letter-hand), "RIDI Batang", "Gowun Batang", "Nanum Myeongjo", "Batang", serif';
  /** 등불 글자 — 전부 검정 */
  const articleInk = "#000000";
  const articleInkMuted = "#000000";
  const exiting = phase === "folding" || phase === "done";
  const news = useMemo(() => briefing.featuredNews ?? [], [briefing.featuredNews]);
  const macroRows = briefing.macroTable ?? [];
  /** 거시 표 실패해도 키로 지경학 판별 — 지역 요약·컬러 면이 빠지지 않게 */
  const isEconomy =
    /-economy(?:$|-)/.test(briefing.key) || macroRows.length > 0;
  const mobilePreview = 4;
  const visibleNews =
    isNarrow && !expandedNews ? news.slice(0, mobilePreview) : news;
  const canExpandNews = isNarrow && news.length > mobilePreview && !expandedNews;
  const titleLines = briefing.title.split("\n");
  const kicker = titleLines[0] ?? briefing.title;
  const subtitle =
    titleLines.slice(1).join(" ") ||
    (lang === "en"
      ? isEconomy
        ? "Macro desk"
        : "Global regional deep desk"
      : isEconomy
        ? "거시 데스크"
        : "전 세계 지역별 심층 데스크");

  const theaterRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of news) {
      const label = (item.focusLabel ?? "").split("·")[0]?.trim() || item.focusLabel || "—";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([theater, count]) => ({ theater, count }))
      .sort((a, b) => b.count - a.count);
  }, [news]);

  const regionCategoryLabel = isEconomy
    ? lang === "en"
      ? "Regions in frame"
      : "담긴 지역"
    : lang === "en"
      ? "Regions in frame"
      : "담긴 지역";
  const categoryLabel = isEconomy
    ? lang === "en"
      ? "Macro · regions"
      : "거시 · 지역"
    : regionCategoryLabel;
  const categoryCount = isEconomy
    ? macroRows.length + theaterRows.length
    : theaterRows.length;
  const categorySummary =
    categoryCount > 0
      ? lang === "en"
        ? `${categoryCount} items`
        : `${categoryCount}개`
      : lang === "en"
        ? "Empty"
        : "없음";
  /** 데스크톱은 항상 펼침, 모바일은 토글 */
  const showCategoryBody = !isNarrow || categoryOpen;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      const narrow = mq.matches;
      setIsNarrow(narrow);
      // 데스크톱으로 넓어지면 패널을 열린 상태로 맞춤
      if (!narrow) setCategoryOpen(true);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    emitParchmentUnfoldSound();
    const reduced = prefersReducedMotion();
    if (!reduced) {
      emitBreakingDispatchSound({ bed: isEconomy ? "cheer" : "dark" });
    }
  }, [isEconomy]);

  const handleContinue = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("folding");
    emitParchmentFoldSound();
    const reduced =
      prefersReducedMotion();
    window.setTimeout(() => {
      setPhase("done");
      onDismiss();
    }, reduced ? 80 : PARCHMENT_FOLD_EXIT_MS);
  }, [onDismiss, phase]);

  const regionList = (
    <>
      {!isNarrow || isEconomy ? (
        <p
          className={`mb-2 px-1 text-micro font-semibold uppercase tracking-[0.2em] text-[#6b4a22]/7 ${
            isEconomy ? "mt-4" : ""
          }`}
        >
          {regionCategoryLabel}
        </p>
      ) : null}
      {theaterRows.length > 0 ? (
        <ul className="space-y-1.5 px-1">
          {theaterRows.map((row) => (
            <li
              key={row.theater}
              className="flex items-baseline justify-between gap-2 border-b border-[#8b6914]/12 py-2 text-body text-[#3f2e1c]"
            >
              <span className="font-medium">{row.theater}</span>
              <span className="tabular-nums text-[#6b4a22]/75">{row.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-1 text-caption leading-relaxed text-[#5a4428]/7">
          {lang === "en"
            ? isEconomy
              ? "Color desk below — regional market briefs."
              : "Photo desk below — multi-theater selection."
            : isEconomy
              ? "아래 컬러 데스크에서 지역별 시장 요약본을 보세요."
              : "아래 사진 데스크에서 지역별 심층 뉴스를 보세요."}
        </p>
      )}
      <p className="mt-4 px-1 text-meta leading-relaxed text-[#5a4428]/65">
        {lang === "en"
          ? "Summaries are at least ~300 characters. Open 「Article」 for the full source piece."
          : "요약은 약 300자 이상입니다. 개별 원문은 「원문」으로 이동합니다."}
      </p>
    </>
  );

  const categoryBody = (
    <>
      {isEconomy ? (
        <>
          {!isNarrow ? (
            <p className="mb-2 px-1 text-micro font-semibold uppercase tracking-[0.2em] text-[#6b4a22]/7">
              {lang === "en" ? "Macro snapshot" : "거시 스냅샷"}
            </p>
          ) : null}
          <AnnouncementStrip lang={lang} />
          {macroRows.length > 0 ? (
            <table className="w-full border-collapse text-left text-caption text-[#3f2e1c] sm:text-body">
              <thead>
                <tr className="border-b border-[#8b6914]/30 text-micro uppercase tracking-[0.14em] text-[#6b4a22]/65">
                  <th className="py-2 pr-2 font-medium">
                    {lang === "en" ? "Country" : "국가"}
                  </th>
                  <th className="py-2 pr-2 font-medium">
                    {lang === "en" ? "Metric" : "지표"}
                  </th>
                  <th className="py-2 text-right font-medium">
                    {lang === "en" ? "Value" : "수치"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {macroRows.map((row, i) => (
                  <tr
                    key={`${row.country}-${row.indicator}-${i}`}
                    className="border-b border-[#8b6914]/12"
                  >
                    <td className="py-2.5 pr-2 align-top font-medium">{row.country}</td>
                    <td className="py-2.5 pr-2 align-top text-[#5a4428]/9">
                      {row.indicator}
                    </td>
                    <td className="py-2.5 text-right align-top tabular-nums tracking-tight">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-1 text-caption leading-relaxed text-[#5a4428]/7">
              {lang === "en"
                ? "Macro table unavailable — regional news desk below."
                : "거시 표 데이터를 불러오지 못했습니다. 아래 지역 뉴스 데스크를 보세요."}
            </p>
          )}
          {regionList}
        </>
      ) : (
        <>
          {briefing.wti ? (
            <div className="mb-4 rounded-sm border border-[#8b6914]/30 bg-[#f7ecd4]/70 px-3 py-3">
              <div className="flex items-center gap-1.5">
                <p className="text-micro font-semibold uppercase tracking-[0.2em] text-[#6b4a22]/7">
                  {formatGtiTitle(lang !== "en")}
                </p>
                <EvidenceTierBadge tier="model" lang={lang} surface="light" />
              </div>
              <div className="mt-1 flex items-end justify-between gap-2">
                <p className="text-[2rem] font-semibold tabular-nums leading-none tracking-tight text-[#3d2a18]">
                  {Math.round(briefing.wti.score)}
                </p>
                <p className="pb-0.5 text-meta text-[#6b4a22]/8">
                  {gtiBandLabel(gtiBand(briefing.wti.score), lang !== "en")}
                  {briefing.wti.deltaScore != null &&
                  Math.abs(briefing.wti.deltaScore) >= 0.05
                    ? ` · ${briefing.wti.deltaScore > 0 ? "+" : ""}${Math.round(briefing.wti.deltaScore * 10) / 10}`
                    : ""}
                </p>
              </div>
              <p className="mt-2 text-meta leading-relaxed text-[#5a4428]/85">
                {briefing.wti.lead}
              </p>
            </div>
          ) : null}
          {regionList}
        </>
      )}
    </>
  );

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className={`welcome-letter-scrim fixed inset-0 z-[800] flex items-center justify-center p-2 sm:p-4 ${
        exiting ? "welcome-letter-scrim--exit" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="periodic-briefing-title"
      aria-busy={phase === "folding"}
    >
      <div className="welcome-letter-stage welcome-letter-stage--economy-lamp w-full">
        <div
          className={`welcome-letter-card parchment-letter parchment-letter--lamp-ink welcome-letter-card--economy-lamp ${
            exiting ? "welcome-letter-card--fold-exit" : "welcome-letter-card--unfold-enter"
          }`}
          style={{ fontFamily: parchmentStack }}
        >
          <div className="welcome-parchment welcome-letter-face welcome-letter-face--front relative flex h-[min(94vh,920px)] w-full flex-col overflow-hidden rounded-sm shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="welcome-parchment-edge pointer-events-none absolute inset-0" aria-hidden />
            <div className="welcome-parchment-filigree pointer-events-none absolute inset-0" aria-hidden />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
              <aside className="flex w-full shrink-0 flex-col border-b border-[#8b6914]/25 bg-[#efe2c0]/55 md:w-[min(32%,22rem)] md:border-b-0 md:border-r md:border-[#8b6914]/25">
                <div className="px-5 pb-3 pt-6 sm:px-6 sm:pt-8">
                  <p className="text-micro uppercase tracking-[0.28em] text-[#7a5a2e]/75">
                    {lang === "en" ? BRAND_NAME.en : BRAND_NAME.ko}
                  </p>
                  <h1
                    id="periodic-briefing-title"
                    className="mt-2 whitespace-pre-line text-[1.35rem] leading-snug tracking-[0.04em] text-[#3d2a18] sm:text-[1.55rem]"
                    style={{ fontFamily: parchmentStack, fontWeight: 400 }}
                  >
                    {kicker}
                  </h1>
                  <p className="mt-1.5 text-sm leading-snug text-[#5a4428]/85">{subtitle}</p>
                </div>

                {/* 모바일: 카테고리 드롭다운 / 데스크톱: 항상 펼침 */}
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
                  {isNarrow ? (
                    <div className="rounded-sm border border-[#8b6914]/30 bg-[#f7ecd4]/55">
                      <button
                        type="button"
                        onClick={() => setCategoryOpen((open) => !open)}
                        aria-expanded={categoryOpen}
                        aria-controls="lamp-category-panel"
                        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block text-micro font-semibold uppercase tracking-[0.2em] text-[#6b4a22]/7">
                            {categoryLabel}
                          </span>
                          <span className="mt-0.5 block truncate text-body text-[#3f2e1c]">
                            {categorySummary}
                            {!categoryOpen && theaterRows.length > 0
                              ? ` · ${theaterRows
                                  .slice(0, 2)
                                  .map((r) => r.theater)
                                  .join(" · ")}`
                              : ""}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 text-[#6b4a22]/8 transition-transform ${
                            categoryOpen ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        >
                          ▾
                        </span>
                      </button>
                      {showCategoryBody ? (
                        <div
                          id="lamp-category-panel"
                          className="border-t border-[#8b6914]/20 px-3 pb-3 pt-2"
                        >
                          {categoryBody}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    categoryBody
                  )}
                </div>
              </aside>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-[#8b6914]/20 px-5 py-3 sm:px-7">
                  <p className="text-micro uppercase tracking-[0.22em] text-[#6b4a22]/7">
                    {isEconomy
                      ? lang === "en"
                        ? "US · China · Europe · chokepoints (oil · freight) — today's hottest"
                        : "미·중·유럽 · 초크포인트(유가·물류) · 당일 핫"
                      : lang === "en"
                        ? "Worldwide regional deep desk — clear photos · 6h refresh"
                        : "전 세계 지역별 심층 — 선명 사진 · 6시간 갱신"}
                  </p>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                  {visibleNews.length > 0 ? (
                    <>
                      {visibleNews.map((item) => (
                        <article
                          key={item.id}
                          className="overflow-hidden rounded-sm border border-[#8b6914]/25 bg-[#f7ecd4]/55 shadow-[0_8px_28px_rgba(61,42,24,0.12)]"
                        >
                          <LampCardHero
                            imageUrl={item.imageUrl}
                            title={item.title}
                            summary={item.summary}
                            focusLabel={item.focusLabel}
                            theater={item.theater}
                            econGenre={item.econGenre}
                            isDiplomacy={item.isDiplomacy}
                            isEconomy={isEconomy}
                            lang={lang}
                          />
                          <div className="flex items-stretch gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
                            <div className="min-w-0 flex-1" style={{ color: articleInk }}>
                              <div
                                className="flex flex-wrap items-center gap-2 text-micro uppercase tracking-[0.16em]"
                                style={{ color: articleInkMuted }}
                              >
                                <span>{item.source}</span>
                                <span aria-hidden>·</span>
                                <span>T{item.trustTier}</span>
                                {item.focusLabel ? (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span
                                      className="normal-case tracking-[0.04em]"
                                      style={{ color: articleInk }}
                                    >
                                      {item.focusLabel}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                              <h2
                                className="mt-2 text-[1.2rem] leading-snug tracking-[0.02em] sm:text-[1.45rem] sm:leading-snug"
                                style={{ color: articleInk, fontFamily: parchmentStack }}
                              >
                                {item.title}
                              </h2>
                              {item.matterHook ? (
                                <p
                                  className="mt-2 text-caption leading-snug sm:text-body"
                                  style={{ color: articleInkMuted, fontFamily: parchmentStack }}
                                >
                                  {item.matterHook}
                                </p>
                              ) : null}
                              <p
                                className="mt-3 text-[0.98rem] leading-[1.75] sm:text-[1.08rem] sm:leading-[1.8]"
                                style={{ color: articleInk, fontFamily: parchmentStack }}
                              >
                                {item.summary}
                              </p>
                              {!isEconomy ? (
                                <LampWhyMattersButton
                                  lang={lang}
                                  title={item.title}
                                  source={item.source}
                                  link={item.link}
                                  focusLabel={item.focusLabel}
                                  excerpt={item.summary}
                                />
                              ) : null}
                            </div>
                            <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-center">
                              {isArticleUrl(item.link) ? (
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center rounded-full border border-[#8b6914]/4 bg-[#efe0b8] px-3 py-2.5 text-caption font-medium tracking-[0.06em] text-[#3d2a18] transition hover:bg-[#f7ecd0] sm:px-4"
                                  aria-label={
                                    lang === "en"
                                      ? `Open article: ${item.title}`
                                      : `원문 보기: ${item.title}`
                                  }
                                  title={lang === "en" ? "Open article" : "원문"}
                                >
                                  {lang === "en" ? "Article" : "원문"}
                                </a>
                              ) : (
                                <span
                                  className="max-w-[4.5rem] text-center text-micro leading-snug text-[#6b4a22]/65"
                                  title={item.source}
                                >
                                  {item.source}
                                </span>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                      {canExpandNews ? (
                        <div className="pb-2 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedNews(true)}
                            className="rounded-sm border border-[#8b6914]/4 bg-[#efe0b8] px-4 py-2 text-body text-[#3d2a18] hover:bg-[#f7ecd0]"
                          >
                            {lang === "en"
                              ? `Show ${news.length - mobilePreview} more`
                              : `${news.length - mobilePreview}건 더 보기`}
                          </button>
                        </div>
                      ) : null}
                    </>
                      ) : (
                    <p className="py-10 text-center text-sm text-[#5a4428]/7">
                      {lang === "en"
                        ? "This 6-hour slot lacks photo-backed article cards. Fold and reopen after the next refresh (0 / 6 / 12 / 18)."
                        : "이번 6시간 슬롯에 사진 있는 원문 카드가 부족합니다. 접었다가 다음 갱신(0·6·12·18시) 후 다시 펼쳐 보세요."}
                    </p>
                  )}

                  {briefing.forgottenWarning ? (
                    <ForgottenWarningBlock
                      warning={briefing.forgottenWarning}
                      lang={lang}
                      parchmentStack={parchmentStack}
                      articleInk={articleInk}
                      onFly={
                        briefing.forgottenWarning.lat != null &&
                        briefing.forgottenWarning.lng != null &&
                        onFlyToForgottenWarning
                          ? () => {
                              const w = briefing.forgottenWarning!;
                              onFlyToForgottenWarning({
                                lat: w.lat!,
                                lng: w.lng!,
                                altitude: w.altitude,
                              });
                            }
                          : undefined
                      }
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative shrink-0 border-t border-[#8b6914]/25 bg-[#f3e4c4]/80 px-6 py-4 text-center">
              <button
                type="button"
                onClick={handleContinue}
                disabled={phase !== "idle"}
                className="rounded-sm border border-[#8b6914]/45 bg-[#efe0b8] px-6 py-2.5 text-base tracking-[0.06em] text-[#3d2a18] shadow-sm transition hover:bg-[#f7ecd0] disabled:cursor-wait disabled:opacity-70"
                style={{ fontFamily: parchmentStack, fontWeight: 400 }}
              >
                {lang === "en" ? "Fold" : "접기"}
              </button>
              <p className="mt-2 text-meta tracking-[0.04em] text-[#6b4a22]/65" style={{ fontFamily: parchmentStack }}>
                {lang === "en"
                  ? "Fold to keep exploring — reopen anytime today. News refreshes every 6 hours."
                  : "접어두면 지도를 보고, 오늘 하루 언제든 다시 펼칠 수 있습니다. 뉴스는 6시간마다 갱신됩니다."}
              </p>
            </div>
          </div>

          <div className="welcome-parchment welcome-letter-face welcome-letter-face--back" aria-hidden>
            <div className="welcome-parchment-edge pointer-events-none absolute inset-0" />
            <div className="welcome-parchment-filigree pointer-events-none absolute inset-0" />
            <div className="welcome-letter-back-inner">
              <div className="welcome-letter-wax" />
              <p className="welcome-letter-back-mark" style={{ fontFamily: parchmentStack }}>
                {lang === "en" ? BRAND_NAME.en : BRAND_NAME.ko}
              </p>
              <p className="welcome-letter-back-sub" style={{ fontFamily: parchmentStack }}>
                {lang === "en" ? BRAND_NAME.ko : BRAND_NAME.en}
              </p>
              <div className="welcome-letter-back-lines" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LampCardHero({
  imageUrl,
  title,
  summary,
  focusLabel,
  theater,
  econGenre,
  isDiplomacy,
  isEconomy,
  lang,
}: {
  imageUrl: string;
  title: string;
  summary: string;
  focusLabel?: string;
  theater?: string;
  econGenre?: string;
  isDiplomacy?: boolean;
  isEconomy: boolean;
  lang: LabelLanguage;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  /** 지정학·지경학 모두 대형 컬러 사진 우선. 없거나 실패하면 지역 컬러 면 */
  const hasPhoto = Boolean(imageUrl) && !imgFailed;
  const theme = resolveLampThumbTheme({
    mode: isEconomy ? "economy" : "conflict",
    theater,
    econGenre,
    title,
    summary,
    focusLabel,
  });
  const label = lang === "en" ? LAMP_THUMB_LABEL[theme].en : LAMP_THUMB_LABEL[theme].ko;

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#d4c4a0] sm:aspect-[2/1]">
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full flex-col justify-end bg-gradient-to-br ${LAMP_THUMB_GRADIENT[theme]} px-5 py-4`}
          aria-hidden
        >
          <p className="text-micro uppercase tracking-[0.28em] text-[#f5ead2]/55">
            {isEconomy ? (lang === "en" ? "Market lamp" : "시장 등불") : lang === "en" ? "Geopolitics lamp" : "지정학 등불"}
          </p>
          <p className="mt-1 text-[1.35rem] tracking-[0.08em] text-[#f5ead2]/92">{label}</p>
          {focusLabel ? (
            <p className="mt-1 max-w-[90%] truncate text-caption text-[#f5ead2]/65">{focusLabel}</p>
          ) : null}
        </div>
      )}
      {isDiplomacy ? (
        <span className="absolute left-3 top-3 rounded-sm border border-[#8b6914]/35 bg-[#efe0b8]/92 px-2 py-0.5 text-micro font-semibold uppercase tracking-[0.14em] text-[#5a3d1c]">
          {lang === "en" ? "Diplomacy" : "외교"}
        </span>
      ) : null}
    </div>
  );
}

function ForgottenWarningBlock({
  warning,
  lang,
  parchmentStack,
  articleInk,
  onFly,
}: {
  warning: NonNullable<PeriodicBriefing["forgottenWarning"]>;
  lang: LabelLanguage;
  parchmentStack: string;
  articleInk: string;
  onFly?: () => void;
}) {
  const ko = lang !== "en";
  const title = ko ? warning.titleKo : warning.titleEn;
  const summary = ko ? warning.summaryKo : warning.summaryEn;

  return (
    <section
      className="overflow-hidden rounded-sm border border-[#6b4a22]/35 bg-[#efe0b8]/70 px-4 py-4 shadow-[0_6px_20px_rgba(61,42,24,0.1)] sm:px-5"
      aria-label={ko ? "그날의 경고" : "Forgotten warning"}
    >
      <p
        className="text-micro uppercase tracking-[0.2em] text-[#6b4a22]/8"
        style={{ fontFamily: parchmentStack }}
      >
        {ko ? "그날의 경고" : "Forgotten warning"}
      </p>
      <p
        className="mt-1.5 text-caption leading-snug text-[#5a3d1c]"
        style={{ fontFamily: parchmentStack }}
      >
        {warning.lead}
      </p>
      <h3
        className="mt-2 text-[1.05rem] leading-snug tracking-[0.02em]"
        style={{ color: articleInk, fontFamily: parchmentStack }}
      >
        {title}
      </h3>
      <p
        className="mt-2 text-[0.92rem] leading-[1.7]"
        style={{ color: articleInk, fontFamily: parchmentStack }}
      >
        {summary}
      </p>
      <p className="mt-2 text-micro tracking-[0.08em] text-[#6b4a22]/7">
        {warning.date}
        {warning.exactAnniversary
          ? ko
            ? ` · ${warning.yearsAgo}년 전 바로 그날`
            : ` · exactly ${warning.yearsAgo}y ago`
          : ko
            ? ` · 대략 ${warning.yearsAgo}년 전`
            : ` · ~${warning.yearsAgo}y ago`}
      </p>
      {onFly ? (
        <button
          type="button"
          onClick={onFly}
          className="mt-3 rounded-sm border border-[#8b6914]/45 bg-[#efe0b8] px-3 py-1.5 text-caption text-[#3d2a18] transition hover:bg-[#f7ecd0]"
        >
          {ko ? "지도에서 보기" : "Fly to map"}
        </button>
      ) : null}
    </section>
  );
}

/**
 * 거시 지표(무슨 일이 있었나) 위에, 다음 발표 일정(무엇이 다가오나)을 덧붙인다.
 * FOMC·OPEC+ — 공개 캘린더 기준, 신규 API 없이 정적 유지.
 */
function AnnouncementStrip({ lang }: { lang: LabelLanguage }) {
  const en = lang === "en";
  const upcoming = upcomingAnnouncements(new Date(), 3);
  if (upcoming.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 px-1">
      <span className="text-micro font-semibold uppercase tracking-[0.16em] text-[#6b4a22]/6">
        {en ? "Next" : "다가오는 발표"}
      </span>
      {upcoming.map((ev) => (
        <span
          key={ev.id}
          className="rounded-full border border-[#8b6914]/30 bg-[#f7ecd4]/60 px-2 py-0.5 text-micro text-[#3f2e1c]"
        >
          {ev.label[lang]} · {ev.date.slice(5)}
          {" · "}
          {ev.daysUntil === 0
            ? en
              ? "today"
              : "오늘"
            : en
              ? `D-${ev.daysUntil}`
              : `${ev.daysUntil}일 후`}
        </span>
      ))}
    </div>
  );
}

