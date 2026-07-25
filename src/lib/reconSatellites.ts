/**
 * 정찰·감시 위성 분류 — 이름(국제 명칭) 패턴 기반.
 *
 * 정확도 원칙:
 *  - 특정 NORAD 번호를 하드코딩하지 않는다(틀리면 엉뚱한 위성 위치 → 오탐).
 *    대신 CelesTrak TLE의 위성 "이름"을 패턴으로 분류한다.
 *  - 센서 종류(광학/레이더/신호정보)는 공개된 위성 계열의 "통상 용도"에서 추정한 것이며,
 *    개별 위성의 실제 탑재·임무는 기밀일 수 있다 → UI에 "추정" 명시.
 *  - "지금 무엇을 촬영 중인지"는 공개 데이터로 알 수 없다(기밀). 표시하지 않는다.
 */

export type ReconCountry =
  | "us"
  | "china"
  | "russia"
  | "israel"
  | "france"
  | "japan"
  | "korea"
  | "india"
  | "germany"
  | "italy"
  | "spain"
  | "uae"
  | "uk"
  | "other";
export type ReconSensor = "optical" | "radar" | "sigint" | "unknown";

export type ReconSatelliteClass = {
  country: ReconCountry;
  sensor: ReconSensor;
  /** 위성 계열 한글/영문 설명 */
  familyKo: string;
  familyEn: string;
};

type Rule = {
  test: RegExp;
  cls: ReconSatelliteClass;
};

/**
 * 공개적으로 정찰·군사 감시 계열로 알려진 위성 이름 패턴.
 * 순서 = 우선순위(구체적 패턴 먼저).
 */
const RULES: Rule[] = [
  // 중국 — 야오간(정찰), 가오펀(고해상 관측)
  {
    test: /\byaogan\b/i,
    cls: { country: "china", sensor: "unknown", familyKo: "야오간(遥感) — 중국 정찰위성 계열", familyEn: "Yaogan — Chinese recon series" },
  },
  {
    test: /\bgaofen\b/i,
    cls: { country: "china", sensor: "optical", familyKo: "가오펀(高分) — 중국 고해상 관측", familyEn: "Gaofen — Chinese high-res imaging" },
  },
  {
    test: /\bjilin\b/i,
    cls: { country: "china", sensor: "optical", familyKo: "지린(吉林) — 중국 상업·관측", familyEn: "Jilin — Chinese imaging" },
  },
  // 러시아 — 코스모스(군용 다목적), 페르소나/바르스(광학정찰)
  {
    test: /\b(persona|bars-m|barsm)\b/i,
    cls: { country: "russia", sensor: "optical", familyKo: "페르소나·바르스-M — 러시아 광학 정찰", familyEn: "Persona / Bars-M — Russian optical recon" },
  },
  {
    test: /\b(kosmos|cosmos)\b/i,
    cls: { country: "russia", sensor: "unknown", familyKo: "코스모스 — 러시아 군용 다목적(정찰 포함)", familyEn: "Kosmos — Russian military multi-purpose (incl. recon)" },
  },
  // 미국 — USA 지정(군사, 명칭 비공개 다수), NROL, KH/Keyhole 계열
  {
    test: /\b(nrol|kh-\d|keyhole|onyx|lacrosse|topaz)\b/i,
    cls: { country: "us", sensor: "radar", familyKo: "NRO 정찰 — 레이더/광학(계열 추정)", familyEn: "NRO recon — radar/optical (family inferred)" },
  },
  {
    test: /\busa[- ]?\d+/i,
    cls: { country: "us", sensor: "unknown", familyKo: "USA 지정 — 미 군사위성(명칭 비공개 다수)", familyEn: "USA-designated — US military (often undisclosed)" },
  },
  // 이스라엘 — 오펙(광학정찰), TecSAR(레이더)
  {
    test: /\b(ofeq|ofek)\b/i,
    cls: { country: "israel", sensor: "optical", familyKo: "오펙(Ofeq) — 이스라엘 광학 정찰", familyEn: "Ofeq — Israeli optical recon" },
  },
  {
    test: /\btecsar\b/i,
    cls: { country: "israel", sensor: "radar", familyKo: "TecSAR — 이스라엘 레이더 정찰", familyEn: "TecSAR — Israeli radar recon" },
  },
  // 프랑스 — CSO/Helios(광학), CERES(신호정보)
  {
    test: /\b(cso|helios|pleiades)\b/i,
    cls: { country: "france", sensor: "optical", familyKo: "CSO·Helios — 프랑스 광학 정찰", familyEn: "CSO / Helios — French optical recon" },
  },
  {
    test: /\bceres\b/i,
    cls: { country: "france", sensor: "sigint", familyKo: "CERES — 프랑스 신호정보(SIGINT)", familyEn: "CERES — French SIGINT" },
  },
  // 한국 — 아리랑(KOMPSAT, 광학/레이더 관측), 425사업(군 정찰 SAR/EO), 차세대중형
  {
    test: /\b(425(\s|-)?(project|sat)?|kompsat|arirang|anasis)\b/i,
    cls: { country: "korea", sensor: "unknown", familyKo: "아리랑·425 — 한국 관측/군 정찰", familyEn: "KOMPSAT / Project 425 — Korean imaging & military recon" },
  },
  // 인도 — RISAT(레이더), CARTOSAT(광학), EMISAT(신호정보), GSAT 군용
  {
    test: /\brisat\b/i,
    cls: { country: "india", sensor: "radar", familyKo: "RISAT — 인도 레이더 정찰", familyEn: "RISAT — Indian radar recon" },
  },
  {
    test: /\bcartosat\b/i,
    cls: { country: "india", sensor: "optical", familyKo: "CARTOSAT — 인도 고해상 광학", familyEn: "CARTOSAT — Indian high-res optical" },
  },
  {
    test: /\bemisat\b/i,
    cls: { country: "india", sensor: "sigint", familyKo: "EMISAT — 인도 신호정보", familyEn: "EMISAT — Indian SIGINT" },
  },
  // 독일 — SAR-Lupe / SARah (레이더 정찰)
  {
    test: /\b(sar[- ]?lupe|sarah)\b/i,
    cls: { country: "germany", sensor: "radar", familyKo: "SAR-Lupe·SARah — 독일 레이더 정찰", familyEn: "SAR-Lupe / SARah — German radar recon" },
  },
  // 이탈리아 — COSMO-SkyMed (이중용도 레이더)
  {
    test: /\b(cosmo[- ]?skymed|csg|cosmo)\b/i,
    cls: { country: "italy", sensor: "radar", familyKo: "COSMO-SkyMed — 이탈리아 레이더(이중용도)", familyEn: "COSMO-SkyMed — Italian radar (dual-use)" },
  },
  // 스페인 — PAZ(레이더), Ingenio/SEOSAT
  {
    test: /\b(paz|ingenio|seosat)\b/i,
    cls: { country: "spain", sensor: "radar", familyKo: "PAZ — 스페인 레이더 관측", familyEn: "PAZ — Spanish radar imaging" },
  },
  // UAE — Falcon Eye (광학 정찰)
  {
    test: /\bfalcon[- ]?eye\b/i,
    cls: { country: "uae", sensor: "optical", familyKo: "Falcon Eye — UAE 광학 정찰", familyEn: "Falcon Eye — UAE optical recon" },
  },
  // 영국 — Skynet(군 통신, 감시 지원), Carbonite/군집
  {
    test: /\b(skynet|carbonite)\b/i,
    cls: { country: "uk", sensor: "unknown", familyKo: "Skynet·Carbonite — 영국 군용", familyEn: "Skynet / Carbonite — UK military" },
  },
  // 일본 — IGS(정보수집위성)
  {
    test: /\big(s|s-)?[- ]?(optical|radar)?/i, // 아래에서 별도 강한 매칭
    cls: { country: "japan", sensor: "unknown", familyKo: "IGS — 일본 정보수집위성", familyEn: "IGS — Japanese Intelligence Gathering Satellite" },
  },
];

// IGS는 위 러프 패턴이 과매칭 위험 → 강한 패턴으로 교체
RULES[RULES.length - 1] = {
  test: /\bigs[- ]?\d|intelligence gathering/i,
  cls: { country: "japan", sensor: "unknown", familyKo: "IGS — 일본 정보수집위성", familyEn: "IGS — Japanese Intelligence Gathering Satellite" },
};

/**
 * 위성 이름을 정찰 계열로 분류. 알려진 계열이 아니면 null(=지도에 안 올림).
 * 정찰로 "추정"되는 것만 반환하며, 실제 임무는 기밀일 수 있음.
 */
export function classifyReconSatellite(name: string | undefined | null): ReconSatelliteClass | null {
  if (!name) return null;
  for (const rule of RULES) {
    if (rule.test.test(name)) return rule.cls;
  }
  return null;
}

export function reconCountryLabel(c: ReconCountry, lang: "ko" | "en"): string {
  const map: Record<ReconCountry, { ko: string; en: string }> = {
    us: { ko: "미국", en: "USA" },
    china: { ko: "중국", en: "China" },
    russia: { ko: "러시아", en: "Russia" },
    israel: { ko: "이스라엘", en: "Israel" },
    france: { ko: "프랑스", en: "France" },
    japan: { ko: "일본", en: "Japan" },
    korea: { ko: "한국", en: "South Korea" },
    india: { ko: "인도", en: "India" },
    germany: { ko: "독일", en: "Germany" },
    italy: { ko: "이탈리아", en: "Italy" },
    spain: { ko: "스페인", en: "Spain" },
    uae: { ko: "UAE", en: "UAE" },
    uk: { ko: "영국", en: "UK" },
    other: { ko: "기타", en: "Other" },
  };
  return lang === "en" ? map[c].en : map[c].ko;
}

export function reconSensorLabel(s: ReconSensor, lang: "ko" | "en"): string {
  const map: Record<ReconSensor, { ko: string; en: string }> = {
    optical: { ko: "광학 정찰(추정)", en: "Optical recon (inferred)" },
    radar: { ko: "레이더 정찰(추정)", en: "Radar recon (inferred)" },
    sigint: { ko: "신호정보(추정)", en: "SIGINT (inferred)" },
    unknown: { ko: "용도 미상", en: "Role undisclosed" },
  };
  return lang === "en" ? map[s].en : map[s].ko;
}

/**
 * 고도(km)로부터 지표 "가시 범위" 대략 반경(도).
 * 이건 위성이 이론상 볼 수 있는 지평선 원의 근사이지, "촬영 중인 영역"이 아니다.
 * 실제 정찰은 좁은 시야로 특정 지점만 찍는다 → UI에 "잠재 가시권, 촬영 대상 아님" 명시.
 */
export function horizonRadiusDeg(altitudeKm: number): number {
  const R = 6371; // 지구 반경 km
  const alt = Math.max(150, Math.min(2000, altitudeKm));
  // 지평선까지의 지심각 = acos(R / (R + h))
  const rad = Math.acos(R / (R + alt));
  return (rad * 180) / Math.PI;
}

/** "촬영 중"으로 오해 없게 하는 고지 문구 */
export function reconDisclaimer(lang: "ko" | "en"): string {
  return lang === "en"
    ? "Orbital position from public TLE (CelesTrak) is accurate; actual imaging targets/activity are classified and NOT shown. The circle is a potential horizon footprint, not what the satellite is photographing."
    : "궤도 위치는 공개 TLE(CelesTrak) 기반으로 정확합니다. 실제 촬영 대상·활동은 기밀이라 표시하지 않습니다. 원은 이론상 지평선 가시권일 뿐, 촬영 영역이 아닙니다.";
}
