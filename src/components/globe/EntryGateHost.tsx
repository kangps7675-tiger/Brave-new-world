"use client";

import { EntryCautionOverlay } from "@/components/EntryCautionOverlay";
import { WelcomeBriefOverlay } from "@/components/WelcomeBriefOverlay";
import { WelcomeParchmentLetter } from "@/components/WelcomeParchmentLetter";
import { DomainGateOverlay } from "@/components/DomainGateOverlay";
import { markLangChoiceDone, markWelcomeGateDone } from "@/components/globe/formatters";
import type { EntryGate } from "@/components/globe/types";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

type EntryGateHostProps = {
  entryGate: EntryGate;
  isCompactUi: boolean;
  labelLanguage: LabelLanguage;
  onLabelLanguageChange: (lang: LabelLanguage) => void;
  /** caution에서 언어 확정·통과 시 — 등불 게이트 해제 */
  onLangChoiceConfirmed?: () => void;
  onSetGate: (gate: EntryGate) => void;
  onDomainSelect: (mode: ViewerMode, ultraLite: boolean) => void;
};

/**
 * 입장 게이트 오버레이 묶음 — 첫 방문 플로우: caution → welcome → domain.
 * 데스크톱: 양피지 편지 / 모바일(compact): 짧은 브랜드 welcome.
 * 도메인 게이트 하단 링크로 편지·주의를 다시 열 수 있음.
 */
export function EntryGateHost({
  entryGate,
  isCompactUi,
  labelLanguage,
  onLabelLanguageChange,
  onLangChoiceConfirmed,
  onSetGate,
  onDomainSelect,
}: EntryGateHostProps) {
  const confirmLang = (lang: LabelLanguage) => {
    onLabelLanguageChange(lang);
    markLangChoiceDone();
    onLangChoiceConfirmed?.();
  };

  /** 경고 화면을 지나갈 때 — 현재 선택(기본값 포함)을 확정으로 간주 */
  const leaveCaution = (next: EntryGate) => {
    markLangChoiceDone();
    onLangChoiceConfirmed?.();
    if (next === "domain") markWelcomeGateDone();
    onSetGate(next);
  };

  const leaveWelcome = () => {
    markWelcomeGateDone();
    onSetGate("domain");
  };

  if (entryGate === "caution") {
    return (
      <EntryCautionOverlay
        lang={labelLanguage}
        onLangChange={confirmLang}
        onContinue={() => leaveCaution("welcome")}
        onSkipToDomain={() => leaveCaution("domain")}
      />
    );
  }

  if (entryGate === "welcome") {
    if (isCompactUi) {
      return (
        <WelcomeBriefOverlay lang={labelLanguage} onContinue={leaveWelcome} />
      );
    }
    return (
      <WelcomeParchmentLetter
        lang={labelLanguage}
        onContinue={leaveWelcome}
      />
    );
  }

  if (entryGate === "domain") {
    return (
      <DomainGateOverlay
        onSelect={onDomainSelect}
        onOpenLetter={() => onSetGate("welcome")}
        onOpenCaution={() => onSetGate("caution")}
        letterLinkCompact={isCompactUi}
      />
    );
  }

  return null;
}
