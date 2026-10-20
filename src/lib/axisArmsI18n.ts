import { AXIS_NODES } from "@/data/axisNetwork";
import type { LabelLanguage } from "@/lib/layerPrefs";

/** SIPRI Trade Register 카테고리 → 한국어 */
const CATEGORY_KO: Record<string, string> = {
  Aircraft: "항공기",
  "Air-defence systems": "방공 체계",
  "Armoured vehicles": "장갑차량",
  Artillery: "포병",
  Engines: "엔진",
  Missiles: "미사일",
  "Naval weapons": "함정 무기",
  Sensors: "센서",
  Ships: "함정",
};

/** SIPRI description 필드 → 한국어 (가능한 항목) */
const DESCRIPTION_KO: Record<string, string> = {
  "air-search radar": "대공 탐색 레이더",
  "anti-ship missile": "대함 미사일",
  "anti-ship/land-attack missile": "대함·대지 공격 미사일",
  "combat helicopter": "공격 헬기",
  "fighter/ground-attack aircraft": "전투·대지공격기",
  "fire-control radar": "사격통제 레이더",
  "heavy transport aircraft": "대형 수송기",
  "infantry fighting vehicle": "보병전투차",
  "light transport aircraft": "경수송기",
  "long-range air-to-air missile": "장거리 공대공 미사일",
  "missile boat": "미사일고속정",
  "mobile surface-to-air missile system": "이동식 지대공 미사일 체계",
  mortar: "박격포",
  "naval gun": "함포",
  "one-way attack drone": "일방향 공격 드론",
  "sea-search radar": "해상 탐색 레이더",
  "self-propelled gun": "자주포",
  submarine: "잠수함",
  "surface-to-air missile": "지대공 미사일",
  "surface-to-air missile system": "지대공 미사일 체계",
  "surface-to-surface missile": "지대지 미사일",
  tank: "전차",
  "trainer/combat aircraft": "훈련·전투기",
  "transport aircraft": "수송기",
  "transport helicopter": "수송 헬기",
  turbofan: "터보팬 엔진",
};

const CITATION_KO =
  "SIPRI 무기이전 데이터베이스 © SIPRI. https://www.sipri.org/databases/armstransfers · 화면은 축 렌즈 필터 요약이며, 연구 인용 시 SIPRI 원자료를 교차 확인하십시오.";

const CITATION_EN =
  "SIPRI Arms Transfers Database © SIPRI. https://www.sipri.org/databases/armstransfers · Hub-filtered summary; cross-check SIPRI originals for research.";

export function armsCountryName(code: string, lang: LabelLanguage): string {
  const node = AXIS_NODES[code];
  if (!node) return code;
  return lang === "en" ? node.nameEn : node.nameKo;
}

export function armsCategoryLabel(category: string, lang: LabelLanguage): string {
  if (lang === "en") return category;
  return CATEGORY_KO[category] ?? category;
}

export function armsDescriptionLabel(description: string, lang: LabelLanguage): string {
  if (!description) return "";
  if (lang === "en") return description;
  return DESCRIPTION_KO[description] ?? description;
}

export function armsCitationLabel(citation: string | undefined, lang: LabelLanguage): string {
  if (lang === "en") return citation?.trim() || CITATION_EN;
  return CITATION_KO;
}

export function armsPanelTitle(hubLabel: string, lang: LabelLanguage): string {
  return lang === "en" ? `${hubLabel} · related transfers` : `${hubLabel} 관련 이전`;
}

export function armsPanelEmpty(lang: LabelLanguage): string {
  return lang === "en" ? "No transfers to show." : "표시할 거래가 없습니다.";
}

export function armsPanelHeader(lang: LabelLanguage): string {
  return lang === "en" ? "SIPRI · Arms transfers" : "SIPRI · 무기거래";
}
