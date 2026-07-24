"use client";

import { SoundMuteControl } from "@/components/SoundMuteControl";
import { brandName } from "@/lib/brand";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { ACTIVE_LAYER_CAP_DEFAULT, ACTIVE_LAYER_CAP_ULTRA } from "@/lib/layerExclusiveCap";
import { t } from "@/lib/uiStrings";
import { MAX_ON_LAYERS, MAX_ON_LAYERS_ECONOMY } from "@/lib/viewPackages";

type EntryCautionOverlayProps = {
  lang: LabelLanguage;
  onLangChange: (lang: LabelLanguage) => void;
  onContinue: () => void;
  /** 경고·편지 스킵 → GEOINT/FININT 선택 */
  onSkipToDomain: () => void;
};

/**
 * 진입 주의창 — 첩보국 단말기 부팅 연출 + 성능·사운드 실무 고지.
 */
export function EntryCautionOverlay({
  lang,
  onLangChange,
  onContinue,
  onSkipToDomain,
}: EntryCautionOverlayProps) {
  const soundWhenLines = t("entryCautionSoundWhen", lang).split("\n").filter(Boolean);
  const en = lang === "en";

  return (
    <div
      className="entry-terminal-boot fixed inset-0 z-[10010] flex items-center justify-center overflow-y-auto p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-caution-title"
    >
      <div className="entry-terminal-boot__scan" aria-hidden />
      <div className="entry-terminal-boot__panel relative my-auto w-full max-w-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2" role="group" aria-label="Language mode">
            <button
              type="button"
              onClick={() => onLangChange("en")}
              aria-pressed={lang === "en"}
              className={`rounded border px-2.5 py-1 text-[10px] font-medium tracking-wide transition font-en ${
                lang === "en"
                  ? "border-amber-400/45 bg-amber-500/15 text-amber-100"
                  : "border-slate-600/40 bg-black/40 text-slate-500 hover:border-amber-400/30 hover:text-amber-100/80"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onLangChange("ko")}
              aria-pressed={lang === "ko"}
              className={`rounded border px-2.5 py-1 text-[11px] font-medium tracking-wide transition ${
                lang === "ko"
                  ? "border-amber-400/45 bg-amber-500/15 text-amber-100"
                  : "border-slate-600/40 bg-black/40 text-slate-500 hover:border-amber-400/30 hover:text-amber-100/80"
              }`}
            >
              KO
            </button>
          </div>
          <button
            type="button"
            onClick={onSkipToDomain}
            title={t("entryCautionSkipHint", lang)}
            className="shrink-0 rounded border border-slate-600/40 bg-black/40 px-2 py-1 text-[9px] font-medium tracking-wide text-slate-500 transition hover:border-amber-400/30 hover:text-amber-100/80"
          >
            {t("entryCautionSkip", lang)}
          </button>
        </div>

        <pre className="entry-terminal-boot__header font-data-mono whitespace-pre-wrap">
{`[ SYSTEM NOTICE // RESTRICTED ACCESS AREA ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECURITY CLASSIFICATION: SECRET // NOFORN // ORCON
NODE: ${brandName(lang).toUpperCase()} · OSINT TERMINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}
        </pre>

        <h1
          id="entry-caution-title"
          className="mt-4 text-center font-data-mono text-[11px] tracking-[0.2em] text-amber-300/90 sm:text-xs"
        >
          {t("entryCautionTitle", lang)}
        </h1>
        <p className="mt-1.5 text-center text-[12px] leading-relaxed text-amber-100/75 sm:text-[13px]">
          {t("entryCautionSubtitle", lang)}
        </p>

        <ol className="mt-5 space-y-3">
          <li className="entry-terminal-boot__phase">
            <p className="entry-terminal-boot__phase-id font-data-mono">
              PHASE 01 · NETWORK HANDSHAKE
            </p>
            <p className="entry-terminal-boot__phase-tag font-data-mono">
              [INITIALIZING SECURE TUNNEL]
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-200">
              {t("entryCautionPhase1", lang)}
            </p>
          </li>
          <li className="entry-terminal-boot__phase">
            <p className="entry-terminal-boot__phase-id font-data-mono">
              PHASE 02 · GEOINT / FININT LINK
            </p>
            <p className="entry-terminal-boot__phase-tag font-data-mono">
              [DECRYPTING RAW DATA STREAM]
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-200">
              {t("entryCautionPhase2", lang)
                .replace("{uiCap}", String(ACTIVE_LAYER_CAP_DEFAULT))
                .replace("{ultraCap}", String(ACTIVE_LAYER_CAP_ULTRA))
                .replace("{conflictCap}", String(MAX_ON_LAYERS))
                .replace("{economyCap}", String(MAX_ON_LAYERS_ECONOMY))}
            </p>
          </li>
          <li className="entry-terminal-boot__phase">
            <p className="entry-terminal-boot__phase-id font-data-mono">
              PHASE 03 · AUDIO CHANNEL
            </p>
            <p className="entry-terminal-boot__phase-tag font-data-mono">
              [COMPLIANCE · ACOUSTIC]
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-200">
              {t("entryCautionSoundBody", lang)}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400/70">
              {t("entryCautionSoundWhenTitle", lang)}
            </p>
            <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-slate-400">
              {soundWhenLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-medium text-slate-400">
                {t("soundToggleLabel", lang)}
              </p>
              <SoundMuteControl lang={lang} variant="inline" />
            </div>
          </li>
          <li className="entry-terminal-boot__phase">
            <p className="entry-terminal-boot__phase-id font-data-mono">
              PHASE 04 · CLASSIFICATION
            </p>
            <p className="entry-terminal-boot__phase-tag font-data-mono">
              [OPERATOR MANDATE]
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-200">
              {t("entryCautionPhase4", lang)}
            </p>
          </li>
        </ol>

        <button
          type="button"
          onClick={onContinue}
          className="entry-terminal-boot__cta mt-6 w-full font-data-mono"
        >
          {en
            ? "[ ACKNOWLEDGE & INITIALIZE TERMINAL NODE ]"
            : "[ 인가 · 단말기 노드 초기화 ]"}
        </button>
        <p className="mt-2 text-center text-[10px] leading-snug text-slate-500">
          {t("entryCautionCtaHint", lang)}
        </p>

        {/*
          외부 유입(스레드 등) 신규 방문자용 — 위 코너의 9px 스킵은
          화려한 터미널 연출 옆이라 거의 눈에 안 띔. 메인 CTA 바로 아래,
          시선이 마지막으로 머무는 자리에 눈에 띄는 두 번째 탈출구를 둔다.
        */}
        <button
          type="button"
          onClick={onSkipToDomain}
          className="mt-2.5 w-full rounded border border-slate-600/50 bg-black/30 px-4 py-2 text-[12px] font-medium tracking-wide text-slate-300 transition hover:border-amber-400/40 hover:bg-amber-500/[0.06] hover:text-amber-100"
        >
          {t("entryCautionSkipCta", lang)}
        </button>
      </div>
    </div>
  );
}
