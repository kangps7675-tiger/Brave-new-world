"use client";

import { EntryCautionOverlay } from "@/components/EntryCautionOverlay";
import { WelcomeParchmentLetter } from "@/components/WelcomeParchmentLetter";
import { DomainGateOverlay } from "@/components/DomainGateOverlay";
import { markWelcomeGateDone } from "@/components/globe/formatters";
import type { EntryGate } from "@/components/globe/types";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

type EntryGateHostProps = {
  entryGate: EntryGate;
  isCompactUi: boolean;
  labelLanguage: LabelLanguage;
  onLabelLanguageChange: (lang: LabelLanguage) => void;
  onSetGate: (gate: EntryGate) => void;
  onDomainSelect: (mode: ViewerMode, ultraLite: boolean) => void;
};

/**
 * 입장 게이트 오버레이 묶음 — 첫 방문 플로우: caution → welcome → domain.
 * 도메인 게이트 하단 링크로 편지·주의를 다시 열 수 있음.
 * 모바일(compact)은 welcome을 건너뛰고 domain으로 간다.
 */
export function EntryGateHost({
  entryGate,
  isCompactUi,
  labelLanguage,
  onLabelLanguageChange,
  onSetGate,
  onDomainSelect,
}: EntryGateHostProps) {
  if (entryGate === "caution") {
    return (
      <EntryCautionOverlay
        lang={labelLanguage}
        onLangChange={onLabelLanguageChange}
        onContinue={() => onSetGate("welcome")}
        onSkipToDomain={() => {
          markWelcomeGateDone();
          onSetGate("domain");
        }}
      />
    );
  }

  if (entryGate === "welcome" && !isCompactUi) {
    return (
      <WelcomeParchmentLetter
        lang={labelLanguage}
        onContinue={() => onSetGate("domain")}
      />
    );
  }

  if (entryGate === "domain") {
    return (
      <DomainGateOverlay
        onSelect={onDomainSelect}
        onOpenLetter={isCompactUi ? undefined : () => onSetGate("welcome")}
        onOpenCaution={() => onSetGate("caution")}
      />
    );
  }

  return null;
}
