import { AXIS_NODES, type AxisNode } from "@/data/axisNetwork";

/**
 * SIPRI 무기이전 기록의 비국가 행위자(SIPRI 표기 끝의 `*`).
 * 코드는 scripts/build-axis-arms.js의 NON_STATE_ACTORS와 같아야 한다.
 * `base`는 지도에 호를 그릴 자리일 뿐 — 그 나라 정부와 같은 당사자가 아니다.
 */
export type ArmsNonStateActor = {
  code: string;
  nameKo: string;
  nameEn: string;
  base: string;
};

export const ARMS_NON_STATE_ACTORS: Record<string, ArmsNonStateActor> = {
  "YEM-HOUTHI": { code: "YEM-HOUTHI", nameKo: "후티 반군(예멘)", nameEn: "Houthi rebels (Yemen)", base: "YEM" },
  "CUB-ANTICASTRO": {
    code: "CUB-ANTICASTRO",
    nameKo: "반카스트로 반군(쿠바)",
    nameEn: "Anti-Castro rebels (Cuba)",
    base: "CUB",
  },
  "LBN-HEZBOLLAH": { code: "LBN-HEZBOLLAH", nameKo: "헤즈볼라(레바논)", nameEn: "Hezbollah (Lebanon)", base: "LBN" },
  "PSE-HAMAS": { code: "PSE-HAMAS", nameKo: "하마스(팔레스타인)", nameEn: "Hamas (Palestine)", base: "PSE" },
  "PSE-PIJ": { code: "PSE-PIJ", nameKo: "이슬라믹 지하드(팔레스타인)", nameEn: "PIJ (Palestine)", base: "PSE" },
  "IRQ-PMF": { code: "IRQ-PMF", nameKo: "인민동원군(이라크)", nameEn: "Popular Mobilization Forces (Iraq)", base: "IRQ" },
};

export function isNonStateArmsActor(code: string): boolean {
  return code in ARMS_NON_STATE_ACTORS;
}

/** 지도 자리를 정할 나라 코드 — 비국가 행위자면 근거지 나라, 아니면 그대로. */
export function armsGeoCode(code: string): string {
  return ARMS_NON_STATE_ACTORS[code]?.base ?? code;
}

/** 지도에 놓을 점. 비국가 행위자는 근거지 나라 좌표를 빌린다. */
export function armsGeoNode(code: string): AxisNode | undefined {
  return AXIS_NODES[armsGeoCode(code)];
}
