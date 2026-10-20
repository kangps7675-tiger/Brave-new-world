"use client";

import { SoundMuteControl } from "@/components/SoundMuteControl";
import { LanguagePickButtons } from "@/components/LanguagePickButtons";
import { useDialog } from "@/hooks/useDialog";
import { brandName } from "@/lib/brand";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

type EntryCautionOverlayProps = {
  lang: LabelLanguage;
  onLangChange: (lang: LabelLanguage) => void;
  onContinue: () => void;
  /** 경고·편지 스킵 → GEOINT/FININT 선택 */
  onSkipToDomain: () => void;
};

/**
 * 진입 주의창 — 첩보국 단말기 부팅 연출 + 성능·사운드 실무 고지.
 * 맨 위 대형 한/영 선택 후 본문·스킵.
 */
export function EntryCautionOverlay({
  lang,
  onLangChange,
  onContinue,
  onSkipToDomain,
}: EntryCautionOverlayProps) {
  const soundWhenLines = t("entryCautionSoundWhen", lang).split("\n").filter(Boolean);
  const en = lang === "en";
  /**
   * 진입 게이트 — 포커스를 가두고 첫 포커스를 옮긴다 (P1-7).
   * Escape는 막는다: 이 화면은 "닫기"가 아니라 「인가」 또는 「스킵」 중
   * 하나를 **고르는** 화면이고, 두 선택의 결과가 다르다.
   * Escape에 둘 중 하나를 임의로 매핑하면 사용자 의도를 추측하는 셈이다.
   */
  const dialogRef = useDialog<HTMLDivElement>({ open: true, closeOnEscape: false });

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="entry-terminal-boot fixed inset-0 z-[800] flex items-center justify-center overflow-y-auto p-3 outline-none sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-caution-title"
    >
      <div className="entry-terminal-boot__scan" aria-hidden />
      <div className="entry-terminal-boot__panel relative my-auto w-full max-w-xl">
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            onClick={onSkipToDomain}
            title={t("entryCautionSkipHint", lang)}
            className="entry-terminal-boot__cta w-auto shrink-0 px-4 py-2 text-caption font-medium tracking-wide"
          >
            {t("entryCautionSkip", lang)}
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-3 py-3 sm:px-4 sm:py-3.5">
          <LanguagePickButtons lang={lang} onChange={onLangChange} size="large" />
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
          className="mt-4 text-center font-data-mono text-meta tracking-[0.2em] text-amber-300/90 sm:text-xs"
        >
          {t("entryCautionTitle", lang)}
        </h1>
        <p className="mt-1.5 text-center text-caption leading-relaxed text-amber-100/75 sm:text-body">
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
            <p className="mt-2 text-body leading-relaxed text-slate-200">
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
            <p className="mt-2 text-body leading-relaxed text-slate-200">
              {/* P1-10 — 캡 숫자 4개 제거. 정확한 상한은 레이어 패널이 상시 보여준다 */}
              {t("entryCautionPhase2", lang)}
            </p>
          </li>
          <li className="entry-terminal-boot__phase">
            <p className="entry-terminal-boot__phase-id font-data-mono">
              PHASE 03 · AUDIO CHANNEL
            </p>
            <p className="entry-terminal-boot__phase-tag font-data-mono">
              [COMPLIANCE · ACOUSTIC]
            </p>
            <p className="mt-2 text-body leading-relaxed text-slate-200">
              {t("entryCautionSoundBody", lang)}
            </p>
            <p className="mt-2 text-micro font-semibold uppercase tracking-[0.18em] text-amber-400/70">
              {t("entryCautionSoundWhenTitle", lang)}
            </p>
            <ul className="mt-1.5 space-y-1 text-caption leading-relaxed text-slate-400">
              {soundWhenLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="mt-3">
              <p className="mb-1.5 text-meta font-medium text-slate-400">
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
            <p className="mt-2 text-body leading-relaxed text-slate-200">
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
        <p className="mt-2 text-center text-micro leading-snug text-slate-500">
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
          className="entry-terminal-boot__cta mt-2.5 w-full opacity-90"
        >
          {t("entryCautionSkipCta", lang)}
        </button>
      </div>
    </div>
  );
}
