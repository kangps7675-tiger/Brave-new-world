/**
 * 속보에 기종이 나왔을 때 지구본에 그릴 미사일 사거리(공개 추정치). 전 세계 무기 백과가 아니라, 속보 글에서 읽힌 기종 하나만 쓴다.
 * 값은 2026-11-12에 아래 출처 페이지에서 확인했다. 사거리는 출처·가정(탑재량·궤도)마다 다르므로 [최소, 최대]로 둔다.
 * 지도에는 최대값으로 그리고 카드에는 범위와 출처를 같이 적는다. 출처가 사거리를 밝히지 않은 기종(화성-19 등)은 넣지 않는다.
 *
 *  - CSIS Missile Threat: https://missilethreat.csis.org/country/dprk/ · /country/china/ · /?p=4084(이란)
 *  - 러시아: Moscow Times(2024-12-03) · 오레시니크는 Meduza(2024-12-05)의 서술(러시아 당국은 사거리를 밝히지 않았다)
 */

export type MissileRangeSource = { name: string; url: string };

export type MissileRangeSpec = {
  id: string;
  /** 표시 이름 */
  name: string;
  country: "kp" | "ir" | "cn" | "ru" | "unknown";
  /** 사거리 [최소, 최대] km. 단일 수치면 둘이 같다. */
  rangeKm: [number, number];
  /** 출처가 정식 수치가 아니라 서술·주장임을 알릴 때 */
  note?: string;
  source: MissileRangeSource;
  /** 속보 글(영어·한글)에서 이 기종을 읽는 패턴 */
  pattern: RegExp;
  /** 표가 아니라 뉴스 서술에서 자동으로 뽑은 값(검수 전). 공식 표 항목에는 없다 */
  auto?: { count: number; links: { title: string; url: string }[] };
};

const CSIS_DPRK: MissileRangeSource = { name: "CSIS Missile Threat", url: "https://missilethreat.csis.org/country/dprk/" };
const CSIS_IRAN: MissileRangeSource = { name: "CSIS Missile Threat", url: "https://missilethreat.csis.org/?p=4084" };
const CSIS_CHINA: MissileRangeSource = { name: "CSIS Missile Threat", url: "https://missilethreat.csis.org/country/china/" };
const MOSCOW_TIMES: MissileRangeSource = {
  name: "The Moscow Times",
  url: "https://www.themoscowtimes.com/2024/12/03/what-do-we-know-about-russias-nuclear-weapons-a87203",
};
const MEDUZA: MissileRangeSource = { name: "Meduza", url: "https://meduza.io/en/feature/2024/12/05/introducing-the-oreshnik" };

/** 숫자 뒤에 숫자가 이어지면(화성-12 vs 화성-1) 다른 기종이라 (?!\d)로 막는다 */
const D = String.raw`(?!\d)`;

export const MISSILE_RANGES: readonly MissileRangeSpec[] = [
  // 북한
  { id: "hwasong-12", name: "화성-12형", country: "kp", rangeKm: [4500, 4500], source: CSIS_DPRK, pattern: new RegExp(String.raw`(hwasong[- ]?12${D}|화성포?[- ]?12${D})`, "i") },
  { id: "hwasong-14", name: "화성-14형", country: "kp", rangeKm: [10400, 10400], source: CSIS_DPRK, pattern: new RegExp(String.raw`(hwasong[- ]?14${D}|화성포?[- ]?14${D})`, "i") },
  { id: "hwasong-15", name: "화성-15형", country: "kp", rangeKm: [8500, 13000], source: CSIS_DPRK, pattern: new RegExp(String.raw`(hwasong[- ]?15${D}|화성포?[- ]?15${D})`, "i") },
  { id: "hwasong-16b", name: "화성-16나", country: "kp", rangeKm: [5500, 5500], source: CSIS_DPRK, pattern: /(hwasong[- ]?16\s?b|화성포?[- ]?16\s?나)/i },
  { id: "hwasong-17", name: "화성-17형", country: "kp", rangeKm: [15000, 15000], source: CSIS_DPRK, pattern: new RegExp(String.raw`(hwasong[- ]?17${D}|화성포?[- ]?17${D})`, "i") },
  { id: "hwasong-18", name: "화성-18형", country: "kp", rangeKm: [15000, 15000], source: CSIS_DPRK, pattern: new RegExp(String.raw`(hwasong[- ]?18${D}|화성포?[- ]?18${D})`, "i") },
  { id: "kn-23", name: "KN-23(화성-11가)", country: "kp", rangeKm: [450, 450], source: CSIS_DPRK, pattern: /(kn[- ]?23\b|hwasong[- ]?11\s?a\b|화성포?[- ]?11\s?가)/i },
  { id: "kn-25", name: "KN-25(600mm 초대형 방사포)", country: "kp", rangeKm: [380, 380], source: CSIS_DPRK, pattern: /\bkn[- ]?25\b/i },
  { id: "pukguksong-2", name: "북극성-2형", country: "kp", rangeKm: [1200, 2000], source: CSIS_DPRK, pattern: new RegExp(String.raw`(pukguksong[- ]?2${D}|북극성[- ]?2${D})`, "i") },
  { id: "pukguksong-3", name: "북극성-3형", country: "kp", rangeKm: [1900, 1900], source: CSIS_DPRK, pattern: new RegExp(String.raw`(pukguksong[- ]?3${D}|북극성[- ]?3${D})`, "i") },
  { id: "nodong", name: "노동(화성-7)", country: "kp", rangeKm: [1200, 1500], source: CSIS_DPRK, pattern: /(\bnodong\b|화성포?[- ]?7(?!\d)\s?형?|노동\s?미사일)/i },
  // 이란
  { id: "shahab-3", name: "샤하브-3", country: "ir", rangeKm: [1300, 1300], source: CSIS_IRAN, pattern: /shahab[- ]?3/i },
  { id: "emad", name: "에마드", country: "ir", rangeKm: [1700, 1700], source: CSIS_IRAN, pattern: /\bemad\b/i },
  { id: "ghadr", name: "가드르-1", country: "ir", rangeKm: [1950, 1950], source: CSIS_IRAN, pattern: /\bghadr\b/i },
  { id: "khorramshahr", name: "호람샤르", country: "ir", rangeKm: [2000, 2000], source: CSIS_IRAN, pattern: /khorramshahr/i },
  { id: "sejjil", name: "세질", country: "ir", rangeKm: [2000, 2000], source: CSIS_IRAN, pattern: /sejjil/i },
  { id: "qiam", name: "키암-1", country: "ir", rangeKm: [700, 800], source: CSIS_IRAN, pattern: /\bqiam\b/i },
  { id: "zolfaghar", name: "졸파가르", country: "ir", rangeKm: [700, 700], source: CSIS_IRAN, pattern: /zolfaghar/i },
  { id: "fateh-313", name: "파테-313", country: "ir", rangeKm: [500, 500], source: CSIS_IRAN, pattern: /fateh[- ]?313/i },
  { id: "fateh-110", name: "파테-110", country: "ir", rangeKm: [200, 300], source: CSIS_IRAN, pattern: /fateh[- ]?110/i },
  // 중국
  { id: "df-4", name: "DF-4", country: "cn", rangeKm: [4500, 5500], source: CSIS_CHINA, pattern: new RegExp(String.raw`\bDF[- ]?4${D}`, "i") },
  { id: "df-5", name: "DF-5", country: "cn", rangeKm: [13000, 13000], source: CSIS_CHINA, pattern: new RegExp(String.raw`\bDF[- ]?5${D}`, "i") },
  { id: "df-15", name: "DF-15", country: "cn", rangeKm: [600, 600], source: CSIS_CHINA, pattern: new RegExp(String.raw`\bDF[- ]?15${D}`, "i") },
  { id: "df-16", name: "DF-16", country: "cn", rangeKm: [800, 1000], source: CSIS_CHINA, pattern: new RegExp(String.raw`\bDF[- ]?16${D}`, "i") },
  { id: "df-17", name: "DF-17(극초음속)", country: "cn", rangeKm: [1800, 2500], source: CSIS_CHINA, pattern: new RegExp(String.raw`\bDF[- ]?17${D}`, "i") },
  { id: "df-21", name: "DF-21", country: "cn", rangeKm: [2150, 2150], source: CSIS_CHINA, pattern: new RegExp(String.raw`\bDF[- ]?21${D}`, "i") },
  { id: "df-26", name: "DF-26", country: "cn", rangeKm: [4000, 4000], source: CSIS_CHINA, pattern: new RegExp(String.raw`\bDF[- ]?26${D}`, "i") },
  { id: "df-31", name: "DF-31", country: "cn", rangeKm: [7000, 11700], source: CSIS_CHINA, pattern: new RegExp(String.raw`\bDF[- ]?31${D}`, "i") },
  { id: "df-41", name: "DF-41", country: "cn", rangeKm: [12000, 15000], source: CSIS_CHINA, pattern: new RegExp(String.raw`\bDF[- ]?41${D}`, "i") },
  // 러시아
  { id: "iskander", name: "이스칸데르-M", country: "ru", rangeKm: [500, 500], note: "최대 약 500km로 알려짐", source: MOSCOW_TIMES, pattern: /iskander|이스칸데르/i },
  { id: "kinzhal", name: "킨잘", country: "ru", rangeKm: [3000, 3000], note: "최대 약 3,000km로 알려짐", source: MOSCOW_TIMES, pattern: /kinzhal|킨잘/i },
  { id: "zircon", name: "지르콘", country: "ru", rangeKm: [1000, 1000], note: "약 1,000km로 알려짐", source: MOSCOW_TIMES, pattern: /zircon|tsirkon|지르콘/i },
  { id: "yars", name: "야르스(RS-24)", country: "ru", rangeKm: [12000, 12000], note: "약 12,000km로 알려짐", source: MOSCOW_TIMES, pattern: /\byars\b|RS-24|야르스/i },
  { id: "sarmat", name: "사르마트(RS-28)", country: "ru", rangeKm: [18000, 18000], note: "최대 약 18,000km로 알려짐", source: MOSCOW_TIMES, pattern: /sarmat|RS-28|사르마트/i },
  { id: "oreshnik", name: "오레시니크", country: "ru", rangeKm: [5000, 5000], note: "러시아 당국은 사거리를 밝히지 않았다. 출처의 서술(최대 약 5,000km)", source: MEDUZA, pattern: /oreshnik|오레시니크/i },
];
