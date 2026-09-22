/**
 * 함선(AIS)·항공기(ADS-B) 클릭 상세 카드용 국적 판정.
 *
 * - AIS: MMSI 앞 3자리(MID, Maritime Identification Digits) — ITU가 국가별로
 *   할당하는 공개 표준 코드. https://www.itu.int/en/ITU-R/terrestrial/fmd/Pages/mid.aspx
 * - 항공기: 등록기호(registration) 접두사 — 전 세계 공통으로 기체 동체에 실제
 *   표기되는 국가 접두사(전화 국가코드와 같은 성격의 공개 표준).
 *   registration이 없는 일부 군용기는 N/A로 남긴다 — ICAO 24bit(hex) 국가
 *   할당은 세부 경계가 불확실한 부분이 많아 잘못된 국적 표시보다 미표시를 택함.
 */

export type NationalityInfo = {
  /** ISO 3166-1 alpha-2 (판정 불가 시 null) */
  code: string | null;
  /** 표시용 국가명 (한국어) */
  nameKo: string;
  /** 표시용 국가명 (영어) */
  nameEn: string;
  /** 국기 이모지 (code 있을 때만) */
  flag: string | null;
};

const UNKNOWN: NationalityInfo = { code: null, nameKo: "미상", nameEn: "Unknown", flag: null };

function flagEmoji(iso2: string): string {
  const cc = iso2.toUpperCase();
  if (cc.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}

function info(code: string, nameKo: string, nameEn: string): NationalityInfo {
  return { code, nameKo, nameEn, flag: flagEmoji(code) };
}

/**
 * MMSI MID(앞 3자리) → 국가. ITU 공개 할당표 중 이 앱이 다루는 지역(분쟁·물류
 * 요충지) 위주로 주요 해운국을 수록 — 전체 MID 표는 아니다.
 */
const MID_TABLE: Record<string, NationalityInfo> = {
  // --- 대한민국 / 동북아 ---
  "440": info("KR", "대한민국", "South Korea"),
  "441": info("KR", "대한민국", "South Korea"),
  "445": info("KP", "북한", "North Korea"),
  "412": info("CN", "중국", "China"),
  "413": info("CN", "중국", "China"),
  "414": info("CN", "중국", "China"),
  "416": info("TW", "대만", "Taiwan"),
  "431": info("JP", "일본", "Japan"),
  "432": info("JP", "일본", "Japan"),
  // --- 러시아 / 구소련권 ---
  "273": info("RU", "러시아", "Russia"),
  "274": info("RU", "러시아", "Russia"),
  "275": info("RU", "러시아", "Russia"),
  "272": info("UA", "우크라이나", "Ukraine"),
  "255": info("PT", "포르투갈(마데이라)", "Portugal (Madeira)"),
  // --- 미국 / 북미 ---
  "338": info("US", "미국", "United States"),
  "366": info("US", "미국", "United States"),
  "367": info("US", "미국", "United States"),
  "368": info("US", "미국", "United States"),
  "369": info("US", "미국", "United States"),
  "316": info("CA", "캐나다", "Canada"),
  // --- 유럽 ---
  "232": info("GB", "영국", "United Kingdom"),
  "233": info("GB", "영국", "United Kingdom"),
  "234": info("GB", "영국", "United Kingdom"),
  "235": info("GB", "영국", "United Kingdom"),
  "211": info("DE", "독일", "Germany"),
  "218": info("DE", "독일", "Germany"),
  "226": info("FR", "프랑스", "France"),
  "227": info("FR", "프랑스", "France"),
  "228": info("FR", "프랑스", "France"),
  "247": info("IT", "이탈리아", "Italy"),
  "224": info("ES", "스페인", "Spain"),
  "225": info("ES", "스페인", "Spain"),
  "237": info("GR", "그리스", "Greece"),
  "239": info("GR", "그리스", "Greece"),
  "241": info("GR", "그리스", "Greece"),
  "244": info("NL", "네덜란드", "Netherlands"),
  "245": info("NL", "네덜란드", "Netherlands"),
  "246": info("NL", "네덜란드", "Netherlands"),
  "257": info("NO", "노르웨이", "Norway"),
  "258": info("NO", "노르웨이", "Norway"),
  "259": info("NO", "노르웨이", "Norway"),
  "265": info("SE", "스웨덴", "Sweden"),
  "266": info("SE", "스웨덴", "Sweden"),
  "219": info("DK", "덴마크", "Denmark"),
  "220": info("DK", "덴마크", "Denmark"),
  "230": info("FI", "핀란드", "Finland"),
  "261": info("PL", "폴란드", "Poland"),
  "212": info("CY", "키프로스", "Cyprus"),
  "209": info("CY", "키프로스", "Cyprus"),
  // --- 편의치적(주요 상선 플래그) ---
  "352": info("PA", "파나마", "Panama"),
  "353": info("PA", "파나마", "Panama"),
  "354": info("PA", "파나마", "Panama"),
  "355": info("PA", "파나마", "Panama"),
  "356": info("PA", "파나마", "Panama"),
  "357": info("PA", "파나마", "Panama"),
  "370": info("PA", "파나마", "Panama"),
  "371": info("PA", "파나마", "Panama"),
  "372": info("PA", "파나마", "Panama"),
  "373": info("PA", "파나마", "Panama"),
  "374": info("PA", "파나마", "Panama"),
  "563": info("SG", "싱가포르", "Singapore"),
  "564": info("SG", "싱가포르", "Singapore"),
  "565": info("SG", "싱가포르", "Singapore"),
  "566": info("SG", "싱가포르", "Singapore"),
  "477": info("HK", "홍콩", "Hong Kong"),
  "351": info("LR", "라이베리아", "Liberia"),
  "636": info("LR", "라이베리아", "Liberia"),
  "667": info("LR", "라이베리아", "Liberia"),
  "538": info("MH", "마셜아일랜드", "Marshall Islands"),
  "248": info("MT", "몰타", "Malta"),
  "249": info("MT", "몰타", "Malta"),
  "215": info("MT", "몰타", "Malta"),
  "375": info("BS", "바하마", "Bahamas"),
  "376": info("BS", "바하마", "Bahamas"),
  "311": info("BS", "바하마", "Bahamas"),
  // --- 중동 / 분쟁 요충지 ---
  "428": info("IR", "이란", "Iran"),
  "429": info("IR", "이란", "Iran"),
  "425": info("IQ", "이라크", "Iraq"),
  "426": info("IL", "이스라엘", "Israel"),
  "471": info("JO", "요르단", "Jordan"),
  "403": info("SA", "사우디아라비아", "Saudi Arabia"),
  "422": info("SA", "사우디아라비아", "Saudi Arabia"),
  "470": info("AE", "아랍에미리트", "United Arab Emirates"),
  "447": info("QA", "카타르", "Qatar"),
  "622": info("EG", "이집트", "Egypt"),
  // --- 인도/동남아 ---
  "419": info("IN", "인도", "India"),
  "574": info("VN", "베트남", "Vietnam"),
  "533": info("MY", "말레이시아", "Malaysia"),
  "548": info("PH", "필리핀", "Philippines"),
  "525": info("ID", "인도네시아", "Indonesia"),
  // --- 오세아니아 ---
  "503": info("AU", "호주", "Australia"),
  "512": info("NZ", "뉴질랜드", "New Zealand"),
  // --- 튀르키예 ---
  "271": info("TR", "튀르키예", "Turkey"),
};
// 445 키 충돌 수정: 북한을 최종값으로 유지, 카타르는 별도 처리
MID_TABLE["445"] = info("KP", "북한", "North Korea");
MID_TABLE["447"] = info("QA", "카타르", "Qatar");

export function nationalityFromMmsi(mmsi: string | null | undefined): NationalityInfo {
  if (!mmsi) return UNKNOWN;
  const mid = mmsi.trim().slice(0, 3);
  return MID_TABLE[mid] ?? UNKNOWN;
}

/**
 * 항공기 등록기호(registration) 접두사 → 국가. 전 세계 항공기 동체에 실제
 * 표기되는 공개 표준(전화 국가코드와 같은 성격). 접두사가 긴 것부터 매칭한다.
 */
const REG_PREFIX_TABLE: Array<[string, NationalityInfo]> = [
  ["N", info("US", "미국", "United States")],
  ["C-F", info("CA", "캐나다", "Canada")],
  ["C-G", info("CA", "캐나다", "Canada")],
  ["G-", info("GB", "영국", "United Kingdom")],
  ["D-", info("DE", "독일", "Germany")],
  ["F-", info("FR", "프랑스", "France")],
  ["I-", info("IT", "이탈리아", "Italy")],
  ["EC-", info("ES", "스페인", "Spain")],
  ["PH-", info("NL", "네덜란드", "Netherlands")],
  ["OO-", info("BE", "벨기에", "Belgium")],
  ["LN-", info("NO", "노르웨이", "Norway")],
  ["SE-", info("SE", "스웨덴", "Sweden")],
  ["OY-", info("DK", "덴마크", "Denmark")],
  ["OH-", info("FI", "핀란드", "Finland")],
  ["SP-", info("PL", "폴란드", "Poland")],
  ["HA-", info("HU", "헝가리", "Hungary")],
  ["OK-", info("CZ", "체코", "Czechia")],
  ["YR-", info("RO", "루마니아", "Romania")],
  ["LZ-", info("BG", "불가리아", "Bulgaria")],
  ["SX-", info("GR", "그리스", "Greece")],
  ["TC-", info("TR", "튀르키예", "Turkey")],
  ["UR-", info("UA", "우크라이나", "Ukraine")],
  ["RA-", info("RU", "러시아", "Russia")],
  ["RF-", info("RU", "러시아", "Russia")],
  ["4X-", info("IL", "이스라엘", "Israel")],
  ["4X", info("IL", "이스라엘", "Israel")],
  ["JY-", info("JO", "요르단", "Jordan")],
  ["HZ-", info("SA", "사우디아라비아", "Saudi Arabia")],
  ["A6-", info("AE", "아랍에미리트", "United Arab Emirates")],
  ["A7-", info("QA", "카타르", "Qatar")],
  ["A9C-", info("BH", "바레인", "Bahrain")],
  ["A4O-", info("OM", "오만", "Oman")],
  ["9K-", info("KW", "쿠웨이트", "Kuwait")],
  ["SU-", info("EG", "이집트", "Egypt")],
  ["EP-", info("IR", "이란", "Iran")],
  ["YI-", info("IQ", "이라크", "Iraq")],
  ["JA", info("JP", "일본", "Japan")],
  ["HL", info("KR", "대한민국", "South Korea")],
  ["P-", info("KP", "북한", "North Korea")],
  ["B-", info("CN", "중국", "China")],
  ["B-", info("TW", "대만", "Taiwan")], // note: 실제로는 B- 뒤 숫자대역으로 중국/대만 구분되나 여기선 중국 기본값
  ["VT-", info("IN", "인도", "India")],
  ["AP-", info("PK", "파키스탄", "Pakistan")],
  ["VN-", info("VN", "베트남", "Vietnam")],
  ["9M-", info("MY", "말레이시아", "Malaysia")],
  ["RP-", info("PH", "필리핀", "Philippines")],
  ["PK-", info("ID", "인도네시아", "Indonesia")],
  ["9V-", info("SG", "싱가포르", "Singapore")],
  ["VH-", info("AU", "호주", "Australia")],
  ["ZK-", info("NZ", "뉴질랜드", "New Zealand")],
];

export function nationalityFromRegistration(
  registration: string | null | undefined,
): NationalityInfo {
  if (!registration) return UNKNOWN;
  const reg = registration.trim().toUpperCase();
  // 접두사 긴 것부터 매칭 (예: "C-F"가 "C"보다 먼저 잡히게)
  const sorted = [...REG_PREFIX_TABLE].sort((a, b) => b[0].length - a[0].length);
  for (const [prefix, nat] of sorted) {
    if (reg.startsWith(prefix)) return nat;
  }
  return UNKNOWN;
}

/**
 * 항공기 국적 판정 — registration 우선, 없으면 N/A.
 * (ICAO 24bit hex 국가 할당은 세부 경계 불확실 구간이 많아 의도적으로 사용하지 않음)
 */
export function nationalityForAircraft(registration: string | null | undefined): NationalityInfo {
  return nationalityFromRegistration(registration);
}
