"use client";

import { ParchmentLetter } from "@/components/ParchmentLetter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ChokepointStressBriefing } from "@/lib/chokepointStressBriefing";

type Props = {
  briefing: ChokepointStressBriefing;
  lang: LabelLanguage;
  onDismiss: () => void;
  onFlyTo: () => void;
};

/** 선물 등가 연동 전 — 등락 그래프 자리만 표시. */
function AssetGraphSlot({
  label,
  changePct,
  lang,
}: {
  label: string;
  changePct: number | null;
  lang: LabelLanguage;
}) {
  const en = lang === "en";
  const rising = (changePct ?? 0) >= 0;
  const stroke = rising ? "#16a34a" : "#dc2626";
  // 자리 표시용 가짜 스파크 — 실제 시세 시계열 아님
  const path = rising
    ? "M4 36 L18 30 L32 28 L46 18 L60 22 L74 12 L88 16"
    : "M4 10 L18 14 L32 20 L46 18 L60 28 L74 32 L88 36";

  return (
    <figure className="mt-3 overflow-hidden rounded-sm border border-[#6b4a22]/35 bg-[#f3e6c8]/55 px-3 py-2">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2 text-[11px] tracking-wide text-[#5c4030]/90">
        <span>
          {en ? "Linked asset (slot)" : "연동 자산 (자리)"} · {label}
        </span>
        <span className="font-mono tabular-nums text-[#5c4030]/70">
          {changePct == null
            ? en
              ? "awaiting futures"
              : "선물 연동 대기"
            : en
              ? `transit ${changePct >= 0 ? "+" : ""}${changePct.toFixed(0)}%`
              : `통항 ${changePct >= 0 ? "+" : ""}${changePct.toFixed(0)}%`}
        </span>
      </figcaption>
      <svg viewBox="0 0 96 44" className="h-14 w-full" aria-hidden>
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
          strokeDasharray="3 3"
        />
        <text
          x="48"
          y="42"
          textAnchor="middle"
          fill="#6b4a22"
          fontSize="7"
          opacity="0.75"
        >
          {en ? "chart reserved · not live quotes" : "그래프 예약 · 실시간 시세 아님"}
        </text>
      </svg>
    </figure>
  );
}

export function ChokepointStressParchment({
  briefing,
  lang,
  onDismiss,
  onFlyTo,
}: Props) {
  const desk =
    briefing.kind === "energy-infra"
      ? lang === "en"
        ? "Energy infra desk · open reporting · Not advice"
        : "에너지 인프라 데스크 · 공개 보도 · 투자 권유 아님"
      : lang === "en"
        ? "Chokepoint desk · PortWatch / UKMTO · Not advice"
        : "병목 데스크 · PortWatch / UKMTO · 투자 권유 아님";

  return (
    <ParchmentLetter
      lang={lang}
      title={briefing.title}
      paragraphs={briefing.paragraphs}
      signOff={desk}
      ctaLabel={lang === "en" ? "Understood" : "확인"}
      onContinue={onDismiss}
      secondaryCtaLabel={lang === "en" ? "View location" : "위치 보기"}
      onSecondaryCta={onFlyTo}
      playBreakingDispatch
      typewriter={false}
      blackInk
      titleId="chokepoint-stress-briefing-title"
      zIndexClass="z-[900]"
      bodyExtra={
        <AssetGraphSlot
          label={briefing.assetSlotLabel}
          changePct={briefing.transitChangePct}
          lang={lang}
        />
      }
    />
  );
}
