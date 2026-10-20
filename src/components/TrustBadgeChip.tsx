"use client";

import { HoverHint } from "@/components/HoverHint";
import { trustChipLabel, trustIntroLine, type TrustLang } from "@/data/newsTrustTiers";
import type { LabelLanguage } from "@/lib/layerPrefs";

type TrustBadgeChipProps = {
  lang: LabelLanguage;
  onClick: () => void;
  /** compact header — shorter label */
  compact?: boolean;
};

function toTrustLang(lang: LabelLanguage): TrustLang {
  return lang === "en" ? "en" : "ko";
}

/**
 * 상시 노출 — 데이터 신뢰도 패널 진입 칩.
 * 데스크톱·모바일 · 지정학·경제 모두에서 사용.
 */
export function TrustBadgeChip({ lang, onClick, compact = false }: TrustBadgeChipProps) {
  const tLang = toTrustLang(lang);
  const title = trustChipLabel(tLang);
  const detail = trustIntroLine(tLang);
  const short = tLang === "en" ? "Trust" : "신뢰도";

  return (
    <HoverHint placement="bottom" title={title} detail={detail}>
      <button
        type="button"
        aria-label={title}
        onClick={onClick}
        className={
          compact
            ? "pointer-events-auto flex h-9 items-center gap-1 rounded-xl border border-sky-300/25 bg-[#0f2744]/85 px-2.5 text-meta font-medium text-sky-50 shadow-lg backdrop-blur-md transition hover:border-sky-300/45 hover:bg-[#16355a]/90"
            : "pointer-events-auto flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-sky-300/25 bg-[#1e3a5f]/55 px-2.5 text-meta font-medium text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-300/45 hover:bg-[#254875]/65"
        }
      >
        <span aria-hidden>🛡</span>
        <span className="whitespace-nowrap tracking-tight">{compact ? short : title}</span>
      </button>
    </HoverHint>
  );
}
