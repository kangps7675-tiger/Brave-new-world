/**
 * SIPRI Arms Transfers — shelved until product-use clearance.
 *
 * Restore (instant):
 *  1. Set SIPRI_ARMS_LENS_ENABLED = true
 *  2. Run: node scripts/publish-axis-arms.js
 *     (copies scripts/vendor/sipri/axis-arms.json → public/data/{lite,full}/)
 *  3. Rebuild / redeploy
 *
 * While false: public axis-arms.json is a blank stub ({ pairs:[], deals:[] }).
 * Re-blank: node scripts/publish-axis-arms.js --unpublish
 * Code paths stay wired behind this flag — do not delete AxisArms* / hubBriefs arms docs.
 */

export const SIPRI_POLICY = {
  sourceName: "SIPRI",
  fullName: "Stockholm International Peace Research Institute",
  product: "Arms Transfers Database / Trade Register",
  licenseNote:
    "데이터 이용은 SIPRI 이용 약관·학술 인용 관행을 따릅니다. 원 DB bulk 재배포는 하지 않습니다.",
} as const;

/**
 * 제품 이용 허락 전까지 OFF.
 * (정적 축 관계망 axis-network · arms-embargo 구역과는 별개)
 */
export const SIPRI_ARMS_LENS_ENABLED = false;

export const SIPRI_ARMS_LENS_DISABLED_KO =
  "SIPRI 무기거래 렌즈는 이용 허락 확인 전까지 일시 비활성화되어 있습니다.";

export const SIPRI_ARMS_LENS_DISABLED_EN =
  "The SIPRI arms-transfers lens is temporarily disabled pending usage clearance.";

export const SIPRI_ATTRIBUTION_KO =
  "본 서비스의 「무기거래」렌즈(호·연도·장비 요약)는 스톡홀름국제평화연구소(SIPRI)의 재래식 무기이전 데이터베이스(Arms Transfers Database / Trade Register)를 바탕으로 한 축(중국·러시아·북한·이란) 관련 요약입니다. TIV는 시장가격이 아닌 이전 규모 비교용 추세지표가치입니다. 원본 DB를 API·파일로 제공하지 않으며, 상세는 SIPRI 원자료를 교차 확인하시기 바랍니다.";

export const SIPRI_ATTRIBUTION_EN =
  "The Arms Transfers lens (arcs, years, and equipment summaries) is a hub-filtered summary derived from SIPRI’s Arms Transfers Database / Trade Register. TIV is a volume index, not a market price. We do not redistribute the raw SIPRI database via API or download; cross-check SIPRI originals for research use.";
