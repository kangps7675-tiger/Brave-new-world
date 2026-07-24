"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";

const DISCLAIMER_EN =
  "Disclaimer: This website is a conceptual OSINT dashboard built for educational and visualization purposes. All data displayed is aggregated from publicly available open-source intelligence feeds and does not represent an official intelligence agency.";

const DISCLAIMER_KO =
  "면책: 본 웹사이트는 교육 및 시각화 목적의 컨셉 OSINT 대시보드입니다. 표시된 모든 데이터는 공개된 오픈소스 인텔리전스 피드에서 수집되었으며, 공식 정보 기관을 대변하지 않습니다.";

/**
 * 상시 노출 법적 면책 — UI 언어에 맞춰 한 줄만 표시.
 */
export function LegalDisclaimerFooter({ lang }: { lang: LabelLanguage }) {
  return (
    <footer className="legal-disclaimer-footer" role="contentinfo">
      <p className="legal-disclaimer-footer__text">
        {lang === "en" ? DISCLAIMER_EN : DISCLAIMER_KO}
      </p>
    </footer>
  );
}

export { DISCLAIMER_EN, DISCLAIMER_KO };
