/**
 * SIPRI Arms Transfers — product lens (hub arcs + AxisArmsPanel).
 *
 * SIPRI 승인 조건(2026-11, 메일 회신):
 *  (i)  비상업 목적 — 유료·프리미엄·후원을 켜기 전에 SIPRI 유료 라이선스를 받는다.
 *       `npm run verify:commercial`이 COMMERCIAL_TIER_ENABLED=true일 때 아래 두 스위치가 켜져 있으면 빌드를 막는다.
 *  (ii) 유저가 원본 데이터를 내려받을 수 없을 것 — 데이터는 `src/data/sipri/`(서버 번들)에만 두고
 *       `/api/sipri/arms`가 허브·나라 쌍 단위로만 내보낸다. public 폴더에 JSON을 두지 않는다.
 *  (iii) 출처 명시 + SIPRI 웹사이트 링크 — `SIPRI_URL`, 아래 SIPRI_ATTRIBUTION_*.
 *
 * Publish / blank server data:
 *  - npm run axis:arms:publish   → scripts/vendor/sipri/axis-arms.json → src/data/sipri/
 *  - npm run axis:arms:unpublish → blank stubs ({ pairs:[], deals:[] })
 * Rebuild from CSV: node scripts/build-axis-arms.js [trade-register.csv]
 */

export const SIPRI_URL = "https://www.sipri.org/databases/armstransfers";

export const SIPRI_POLICY = {
  sourceName: "SIPRI",
  fullName: "Stockholm International Peace Research Institute",
  product: "Arms Transfers Database / Trade Register",
  licenseNote:
    "데이터 이용은 SIPRI 이용 약관·학술 인용 관행을 따릅니다. 원 DB bulk 재배포는 하지 않습니다.",
} as const;

/**
 * OFF — 무기거래 점선(호)·패널을 지도에서 뺌.
 * (정적 축 관계망 axis-network · arms-embargo 구역과는 별개)
 */
export const SIPRI_ARMS_LENS_ENABLED = false;

/**
 * ON — 속보 카드의 「무기 이전 기록」 칸. 속보가 말한 나라 쌍이 SIPRI에 있는지만 보여 준다.
 * 연 단위 기록이라 속보의 사실 여부를 가르지 않고 "배경 기록"으로만 쓴다.
 */
export const SIPRI_ARMS_EVIDENCE_ENABLED = true;

export const SIPRI_ARMS_LENS_DISABLED_KO =
  "SIPRI 무기거래 렌즈는 이용 허락 확인 전까지 일시 비활성화되어 있습니다.";

export const SIPRI_ARMS_LENS_DISABLED_EN =
  "The SIPRI arms-transfers lens is temporarily disabled pending usage clearance.";

export const SIPRI_ATTRIBUTION_KO =
  "본 서비스의 「무기거래」렌즈(호·연도·장비 요약)는 스톡홀름국제평화연구소(SIPRI)의 재래식 무기이전 데이터베이스(Arms Transfers Database / Trade Register)를 바탕으로 한 축(중국·러시아·북한·이란) 관련 요약입니다. TIV는 시장가격이 아닌 이전 규모 비교용 추세지표가치입니다. 원본 DB를 API·파일로 제공하지 않으며, 상세는 SIPRI 원자료(https://www.sipri.org/databases/armstransfers)를 교차 확인하시기 바랍니다.";

export const SIPRI_ATTRIBUTION_EN =
  "The Arms Transfers lens (arcs, years, and equipment summaries) is a hub-filtered summary derived from SIPRI’s Arms Transfers Database / Trade Register. TIV is a volume index, not a market price. We do not redistribute the raw SIPRI database via API or download; cross-check SIPRI originals (https://www.sipri.org/databases/armstransfers) for research use.";

