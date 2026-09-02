"use client";

import { EntryCautionOverlay } from "@/components/EntryCautionOverlay";
import { WelcomeBriefOverlay } from "@/components/WelcomeBriefOverlay";
import { WelcomeParchmentLetter } from "@/components/WelcomeParchmentLetter";
import { DataSourceParchmentOverlay } from "@/components/DataSourceParchmentOverlay";
import { DomainGateOverlay } from "@/components/DomainGateOverlay";
import {
  markLangChoiceDone,
  markSourcesGateDone,
  readWelcomeGateDone,
} from "@/components/globe/formatters";
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
 * 입장 게이트 — caution → welcome → sources → domain.
 * 등불·긴장지수 등 실시간 콘텐츠는 sources 확인 전엔 뜨지 않음 (entryGate !== null).
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

  /** 경고 화면 통과 — welcome 또는 sources(스킵) */
  const leaveCaution = (next: "welcome" | "sources") => {
    markLangChoiceDone();
    onLangChoiceConfirmed?.();
    onSetGate(next);
  };

  const leaveWelcome = () => {
    onSetGate("sources");
  };

  const leaveSources = () => {
    markSourcesGateDone();
    onSetGate(readWelcomeGateDone() ? null : "domain");
  };

  if (entryGate === "caution") {
    return (
      <EntryCautionOverlay
        lang={labelLanguage}
        onLangChange={confirmLang}
        onContinue={() => leaveCaution("welcome")}
        onSkipToDomain={() => leaveCaution("sources")}
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

  if (entryGate === "sources") {
    return (
      <DataSourceParchmentOverlay lang={labelLanguage} onContinue={leaveSources} />
    );
  }

  if (entryGate === "domain") {
    return (
      <DomainGateOverlay
        onSelect={onDomainSelect}
        onOpenLetter={() => onSetGate("welcome")}
        onOpenSources={() => onSetGate("sources")}
        onOpenCaution={() => onSetGate("caution")}
        letterLinkCompact={isCompactUi}
      />
    );
  }

  return null;
}
