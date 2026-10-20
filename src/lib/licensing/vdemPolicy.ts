/**
 * V-Dem — 멋진 신세계 출처 표기
 *
 * 「반서방국간 분쟁 외교사」화면은 전수 V-Dem 연표가 아니라
 * 큐레이션 에피소드이지만, 권위주의·체제 마찰 렌즈의 개념·분류에
 * V-Dem(Varieties of Democracy) 전통을 참고합니다.
 */

export const VDEM_POLICY = {
  sourceName: "V-Dem",
  fullName: "Varieties of Democracy",
  product: "V-Dem Dataset / Country-Year",
  licenseNote: "V-Dem Institute (University of Gothenburg). 원 데이터셋 이용 약관을 따릅니다. 원 DB bulk 재배포는 하지 않습니다.",
} as const;

export const VDEM_ATTRIBUTION_KO =
  "「반서방국간 분쟁 외교사」렌즈는 V-Dem 전수 시계열을 그대로 그리지 않습니다. 권위주의·진영 내부 마찰을 대표하는 현장 에피소드를 공개 기록 기반으로 큐레이션한 뷰입니다. 체제·민주주의 지표 분류와 권위주의 국가 논의의 학술 프레임에는 Varieties of Democracy(V-Dem) 프로젝트의 전통을 참고합니다. V-Dem 원 데이터셋을 API·파일로 제공하지 않습니다.";

export const VDEM_ATTRIBUTION_EN =
  "The ‘authoritarian conflict diplomacy’ lens is not a full V-Dem country-year timeline. It is a curated set of flashpoint episodes grounded in open records. Conceptual framing of authoritarian regimes draws on the Varieties of Democracy (V-Dem) tradition. We do not redistribute the raw V-Dem dataset via API or download.";
