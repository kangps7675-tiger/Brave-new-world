"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import {
  dataSourceFootnoteLines,
  dataSourceSections,
  type DataSourceSection,
} from "@/data/dataSourceParchmentContent";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { useDialog } from "@/hooks/useDialog";
import {
  emitParchmentFoldSound,
  emitParchmentUnfoldSound,
} from "@/components/SoundEffectsBridge";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

type Props =
  | {
      lang: LabelLanguage;
      variant?: "gate";
      onContinue: () => void;
    }
  | {
      lang: LabelLanguage;
      variant: "browse";
      onClose: () => void;
    };

export function DataSourceParchmentOverlay(props: Props) {
  const { lang } = props;
  const browse = props.variant === "browse";
  const onDismiss = browse ? props.onClose : props.onContinue;
  const ko = lang !== "en";
  const sections = useMemo(() => dataSourceSections(lang), [lang]);
  const footnoteLines = useMemo(() => dataSourceFootnoteLines(lang), [lang]);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "surveillance");
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set([sections[0]?.id ?? "surveillance"]),
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [phase, setPhase] = useState<"idle" | "folding" | "done">("idle");
  const [expanded, setExpanded] = useState(false);

  const dialogRef = useDialog<HTMLDivElement>({
    open: true,
    closeOnEscape: browse,
    onClose: browse ? onDismiss : undefined,
  });
  const parchmentStack = ko
    ? 'var(--font-letter-hand), "RIDI Batang", "Gowun Batang", "Nanum Myeongjo", serif'
    : "var(--font-intel)";
  const ink = "#1a1208";
  const active = sections.find((s) => s.id === activeId) ?? sections[0]!;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    emitParchmentUnfoldSound();
  }, []);

  useEffect(() => {
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(activeId);
      return next;
    });
  }, [activeId]);

  const allTabsSeen = sections.every((s) => visited.has(s.id));

  const handleContinue = useCallback(() => {
    if (browse) {
      onDismiss();
      return;
    }
    if (!acknowledged || phase !== "idle") return;
    setPhase("folding");
    if (!prefersReducedMotion()) emitParchmentFoldSound();
    window.setTimeout(() => {
      setPhase("done");
      onDismiss();
    }, 900);
  }, [acknowledged, browse, onDismiss, phase]);

  const shellSize = expanded
    ? "h-[min(96vh,980px)] max-h-[96vh] w-full max-w-[min(96vw,1280px)]"
    : "h-[min(88vh,760px)] max-h-[88vh] w-full max-w-4xl";

  const faceHeight = expanded
    ? "h-[min(96vh,980px)] max-h-[96vh]"
    : "h-[min(88vh,760px)] max-h-[88vh]";

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[800] flex items-center justify-center overflow-y-auto bg-black/55 p-2 outline-none sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-source-parchment-title"
    >
      <div
        className={`welcome-parchment welcome-letter-shell my-auto transition-[max-width,height,opacity] duration-300 ease-out ${shellSize} ${
          phase === "folding" || phase === "done" ? "opacity-0" : "opacity-100"
        }`}
      >
        <div
          className={`welcome-parchment welcome-letter-face welcome-letter-face--front relative overflow-hidden rounded-sm shadow-2xl ${faceHeight}`}
        >
          <div className="welcome-parchment-edge pointer-events-none absolute inset-0" />
          <div className="welcome-parchment-filigree pointer-events-none absolute inset-0" />

          <div className={`flex flex-col ${faceHeight}`}>
            <header className="relative shrink-0 border-b border-[#8b6914]/25 px-4 py-3 sm:px-5 sm:py-4">
              <div className="absolute right-2 top-2 flex items-center gap-1.5 sm:right-3 sm:top-3">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="rounded-sm border border-[#8b6914]/35 px-2 py-1 text-xs text-[#5a4428] transition hover:bg-[#efe0b8]"
                  style={{ fontFamily: parchmentStack }}
                  aria-pressed={expanded}
                  aria-label={
                    expanded
                      ? ko
                        ? "창 축소"
                        : "Shrink window"
                      : ko
                        ? "창 확대"
                        : "Expand window"
                  }
                >
                  {expanded
                    ? ko
                      ? "축소"
                      : "Shrink"
                    : ko
                      ? "확대"
                      : "Expand"}
                </button>
                {browse ? (
                  <button
                    type="button"
                    onClick={() => onDismiss()}
                    className="rounded-sm border border-[#8b6914]/35 px-2 py-1 text-xs text-[#5a4428] transition hover:bg-[#efe0b8]"
                    style={{ fontFamily: parchmentStack }}
                    aria-label={ko ? "닫기" : "Close"}
                  >
                    {ko ? "닫기" : "Close"}
                  </button>
                ) : null}
              </div>
              <p
                className="pr-24 text-center text-meta tracking-[0.22em] text-[#6b4a22]/75"
                style={{ fontFamily: parchmentStack }}
              >
                {ko ? BRAND_NAME.ko : BRAND_NAME.en}
              </p>
              <h1
                id="data-source-parchment-title"
                className="mt-1.5 pr-24 text-center text-lg leading-snug text-[#2a1a0c] sm:text-xl"
                style={{ fontFamily: parchmentStack, fontWeight: 600 }}
              >
                {ko ? "데이터 출처 · 한계 고지" : "Data sources · limits disclosure"}
              </h1>
              <p
                className="mx-auto mt-1.5 max-w-2xl pr-4 text-center text-sm leading-relaxed text-[#3d2a18]/90 sm:pr-24"
                style={{ fontFamily: parchmentStack }}
              >
                {browse
                  ? ko
                    ? "왼쪽 책갈피로 레이어·한글·속보·검증 티어·한계를 살펴보세요. ≡ 메뉴·지도 하단 「데이터 출처」에서도 다시 열 수 있습니다."
                    : "Use the left bookmarks for layers, Korean/flash design, trust tiers, and limits. Reopen from ≡ menu or the map attribution bar."
                  : ko
                    ? "등불·긴장지수·실시간 레이어를 보기 전에 반드시 읽어 주십시오. 완벽한 정보기관이 아니며, 아래는 있는 그대로의 재료와 공백입니다."
                    : "Read before breaking news, tension scores, or live layers. We are not a perfect agency — this is an honest inventory of what we use and what is missing."}
              </p>
            </header>

            <div className="flex min-h-0 flex-1">
              <nav
                className={`flex shrink-0 flex-col overflow-y-auto border-r border-[#8b6914]/20 ${
                  expanded ? "w-52 sm:w-56" : "w-40 sm:w-48"
                }`}
                aria-label={ko ? "출처 책갈피" : "Source bookmarks"}
              >
                <ul className="flex flex-col py-1">
                  {sections.map((section) => {
                    const seen = visited.has(section.id);
                    const isActive = section.id === activeId;
                    return (
                      <li key={section.id}>
                        <button
                          type="button"
                          onClick={() => setActiveId(section.id)}
                          className={`w-full px-3 py-2.5 text-left text-xs leading-snug transition sm:text-sm ${
                            isActive
                              ? "border-l-2 border-[#6b4a22] bg-[#efe0b8] text-[#2a1a0c]"
                              : "border-l-2 border-transparent text-[#5a4428]/85 hover:bg-[#f3e4c4]/60"
                          }`}
                          style={{ fontFamily: parchmentStack }}
                          aria-current={isActive ? "true" : undefined}
                        >
                          <span className="block">{section.title}</span>
                          {seen && !isActive ? (
                            <span className="mt-0.5 block text-micro opacity-55">
                              {ko ? "열람함" : "opened"}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                  <SectionBody
                    section={active}
                    ink={ink}
                    font={parchmentStack}
                    lang={lang}
                  />
                </div>

                <footer className="shrink-0 border-t border-[#8b6914]/25 bg-[#f3e4c4]/80 px-4 py-3 sm:px-5 sm:py-4">
                  <div
                    className="rounded-sm border border-[#8b6914]/35 bg-[#efe0b8]/90 px-3 py-2.5 text-xs leading-relaxed text-[#3d2a18]"
                    style={{ fontFamily: parchmentStack }}
                  >
                    <p className="font-semibold">
                      {ko ? "상태 요약 (각주)" : "Status summary"}
                    </p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4">
                      {footnoteLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>

                  {browse ? (
                    <button
                      type="button"
                      onClick={handleContinue}
                      className="mt-3 w-full rounded-sm border border-[#8b6914]/45 bg-[#efe0b8] px-6 py-2.5 text-base tracking-[0.04em] text-[#3d2a18] shadow-sm transition hover:bg-[#f7ecd0]"
                      style={{ fontFamily: parchmentStack }}
                    >
                      {ko ? "닫기" : "Close"}
                    </button>
                  ) : (
                    <>
                      <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={acknowledged}
                          onChange={(e) => setAcknowledged(e.target.checked)}
                          className="mt-1 h-4 w-4 shrink-0 accent-[#6b4a22]"
                        />
                        <span
                          className="text-sm leading-snug text-[#2a1a0c]"
                          style={{ fontFamily: parchmentStack }}
                        >
                          {ko
                            ? allTabsSeen
                              ? "책갈피를 모두 열람했고, 한글·속보·검증 티어·한계 고지를 이해했습니다."
                              : "모든 책갈피를 열람한 뒤 체크할 수 있습니다. (아직 안 연 탭이 있습니다)"
                            : allTabsSeen
                              ? "I opened all bookmarks and understand Korean/flash design, trust tiers, and limits."
                              : "Open all bookmarks before checking this box."}
                        </span>
                      </label>

                      <button
                        type="button"
                        disabled={!acknowledged || !allTabsSeen || phase !== "idle"}
                        onClick={handleContinue}
                        className="mt-3 w-full rounded-sm border border-[#8b6914]/45 bg-[#efe0b8] px-6 py-2.5 text-base tracking-[0.04em] text-[#3d2a18] shadow-sm transition hover:bg-[#f7ecd0] disabled:cursor-not-allowed disabled:opacity-45"
                        style={{ fontFamily: parchmentStack }}
                      >
                        {ko
                          ? "확인 · 지정학/지경학 선택으로"
                          : "Acknowledge · choose geopolitics or geoeconomics"}
                      </button>
                    </>
                  )}
                </footer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionBody({
  section,
  ink,
  font,
  lang,
}: {
  section: DataSourceSection;
  ink: string;
  font: string;
  lang: LabelLanguage;
}) {
  const ko = lang !== "en";
  return (
    <article>
      {section.intro ? (
        <p className="mb-4 text-sm leading-relaxed" style={{ fontFamily: font, color: ink }}>
          {section.intro}
        </p>
      ) : null}
      <ul className="space-y-3">
        {section.entries.map((entry) => (
          <li
            key={entry.name}
            className={`rounded-sm border px-3 py-2.5 ${
              entry.warn
                ? "border-amber-700/40 bg-amber-100/50"
                : "border-[#8b6914]/25 bg-[#faf3e0]/80"
            }`}
          >
            <p className="text-sm font-semibold" style={{ fontFamily: font, color: ink }}>
              {entry.warn ? (ko ? "⚠ " : "⚠ ") : null}
              {entry.name}
            </p>
            <p
              className="mt-1 text-sm leading-relaxed opacity-90"
              style={{ fontFamily: font, color: ink }}
            >
              {entry.body}
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}
