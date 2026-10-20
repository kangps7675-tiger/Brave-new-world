/**
 * OpenAlex — 분쟁 외교사 학술 메타데이터 출처
 * @see https://docs.openalex.org
 * @see https://api.openalex.org/works
 */

export const OPENALEX_POLICY = {
  sourceName: "OpenAlex",
  fullName: "OpenAlex Works API",
  product: "Scholarly works catalog (REST)",
  url: "https://openalex.org",
  apiUrl: "https://api.openalex.org/works",
  docsUrl: "https://docs.openalex.org",
  licenseNote:
    "OpenAlex 메타데이터(제목·DOI·인용수·저자 등)를 허브 렌즈용 참고문헌으로 인용합니다. 논문 전문을 재배포하지 않으며, 원문·DOI 링크로 교차 확인을 권장합니다.",
} as const;

export const OPENALEX_ATTRIBUTION_KO =
  "「반서방국 충돌사」양피지·타임라인의 학술 참고문헌은 OpenAlex Works API(https://api.openalex.org/works)에서 검색·선별한 공개 메타데이터입니다. 제목·연도·DOI·인용수 등만 표시하며, 논문 전문·PDF를 앱에서 재배포하지 않습니다. 연구·인용 시 OpenAlex 및 원 출판사/DOI를 확인하십시오.";

export const OPENALEX_ATTRIBUTION_EN =
  "Scholarly references in the intra-bloc clash briefs are curated metadata from the OpenAlex Works API (https://api.openalex.org/works). We show titles, years, DOIs, and citation counts only—we do not redistribute full texts. Cross-check OpenAlex and the original DOI for research use.";
