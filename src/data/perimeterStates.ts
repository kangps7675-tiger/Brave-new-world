/**
 * 경계 국가 (Perimeter States) — 확전 감지의 지리 기준.
 *
 * ── 이 파일이 존재하는 이유 ────────────────────────────────────────
 *
 * 「러시아 드론이 루마니아 영공에 들어왔다」와
 * 「러시아가 도네츠크를 포격했다」는 **전혀 다른 사건**이다.
 * 후자는 전선 안에서 매일 일어나고, 전자는 **전장 밖 동맹 영토**에서 일어났다.
 *
 * 제품은 전장을 `russia-ukraine` / `middle-east` 처럼 하나씩 나눈다.
 * 그래서 「전장 밖인데 그 전쟁의 무기가 떨어졌다」를 표현할 어휘가 없었다.
 * 이 파일이 그 어휘다.
 *
 * ── 대칭 원칙 ──────────────────────────────────────────────────────
 *
 * NATO 만 넣으면 태평양이 구조적으로 비어버린다. 그러면 제품이
 * 「유럽 확전만 위험하다」고 말하는 셈이 된다. 그건 사실이 아니다.
 * 두 플랭크를 **같은 규칙·같은 가중치**로 둔다.
 *
 * ── 뇌피셜 금지 ────────────────────────────────────────────────────
 *
 * 이 목록은 "어디서 일어나면 주목할 가치가 있나"만 정한다.
 * 「NATO 5조 발동」이나 「확전 임박」 같은 판단은 하지 않는다.
 */

import type { NewsTheater } from "@/lib/news/types";

export type FlankId = "atlantic-flank" | "indo-pacific-flank";

export type PerimeterState = {
  iso2: string;
  iso3: string;
  nameKo: string;
  nameEn: string;
  flank: FlankId;
  /** 이 나라가 인접한 주전장 — "어느 전쟁의 불똥인가" */
  adjacentTheater: NewsTheater;
  /**
   * 이 나라가 **그 전장의 당사국**인 경우.
   *
   * 대만은 `china-taiwan` 의 주인공이면서 동시에 경계국이다.
   * 대만 기사에서 대만을 "제3자 유출"로 세면 이중계상이 된다.
   * 반면 일본은 같은 전장에 인접하지만 당사국이 아니므로 제3자로 남아야 한다.
   * → 그래서 `adjacentTheater` 가 아니라 이 필드로 걸러낸다.
   */
  principalIn?: NewsTheater;
  re: RegExp;
  /**
   * 조약상 집단방위 대상인가.
   * ⚠️ 사실 기술이지 "그래서 참전한다"는 예측이 아니다.
   */
  collectiveDefense: "nato-article5" | "us-bilateral" | "partner" | "none";
  lat: number;
  lng: number;
};

/** 대서양 플랭크 — 러·우 전쟁의 불똥이 닿는 NATO 동부·북유럽 */
const ATLANTIC_FLANK: PerimeterState[] = [
  { iso2: "PL", iso3: "POL", nameKo: "폴란드", nameEn: "Poland",
    flank: "atlantic-flank", adjacentTheater: "russia-ukraine",
    re: /\bpoland\b|\bpolish\b|\bwarsaw\b|폴란드|바르샤바/i,
    collectiveDefense: "nato-article5", lat: 52.23, lng: 21.01 },
  { iso2: "RO", iso3: "ROU", nameKo: "루마니아", nameEn: "Romania",
    flank: "atlantic-flank", adjacentTheater: "russia-ukraine",
    re: /\bromania\b|\bromanian\b|\bbucharest\b|\btulcea\b|루마니아|부쿠레슈티/i,
    collectiveDefense: "nato-article5", lat: 44.43, lng: 26.11 },
  { iso2: "MD", iso3: "MDA", nameKo: "몰도바", nameEn: "Moldova",
    flank: "atlantic-flank", adjacentTheater: "russia-ukraine",
    // 트란스니스트리아 — NATO 비회원이지만 유출 사건 빈발
    re: /\bmoldova\w*\b|\bchisinau\b|\btransnistria\b|몰도바|트란스니스트리아/i,
    collectiveDefense: "none", lat: 47.01, lng: 28.86 },
  { iso2: "LT", iso3: "LTU", nameKo: "리투아니아", nameEn: "Lithuania",
    flank: "atlantic-flank", adjacentTheater: "russia-ukraine",
    // 수바우키 회랑 · 칼리닌그라드 접경
    re: /\blithuania\w*\b|\bvilnius\b|\bsuwalki\b|리투아니아|빌뉴스|수바우키/i,
    collectiveDefense: "nato-article5", lat: 54.69, lng: 25.28 },
  { iso2: "LV", iso3: "LVA", nameKo: "라트비아", nameEn: "Latvia",
    flank: "atlantic-flank", adjacentTheater: "russia-ukraine",
    re: /\blatvia\w*\b|\briga\b|라트비아|리가/i,
    collectiveDefense: "nato-article5", lat: 56.95, lng: 24.11 },
  { iso2: "EE", iso3: "EST", nameKo: "에스토니아", nameEn: "Estonia",
    flank: "atlantic-flank", adjacentTheater: "russia-ukraine",
    re: /\bestonia\w*\b|\btallinn\b|\bnarva\b|에스토니아|탈린|나르바/i,
    collectiveDefense: "nato-article5", lat: 59.44, lng: 24.75 },
  { iso2: "FI", iso3: "FIN", nameKo: "핀란드", nameEn: "Finland",
    flank: "atlantic-flank", adjacentTheater: "russia-ukraine",
    // 1,340km 러시아 국경 · 2023 NATO 가입
    re: /\bfinland\b|\bfinnish\b|\bhelsinki\b|핀란드|헬싱키/i,
    collectiveDefense: "nato-article5", lat: 60.17, lng: 24.94 },
  { iso2: "NO", iso3: "NOR", nameKo: "노르웨이", nameEn: "Norway",
    flank: "atlantic-flank", adjacentTheater: "arctic",
    re: /\bnorway\b|\bnorwegian\b|\boslo\b|\bfinnmark\b|노르웨이|오슬로/i,
    collectiveDefense: "nato-article5", lat: 59.91, lng: 10.75 },
  { iso2: "SE", iso3: "SWE", nameKo: "스웨덴", nameEn: "Sweden",
    flank: "atlantic-flank", adjacentTheater: "russia-ukraine",
    // 고틀란드 — 발트해 통제 요충 · 해저 인프라 사건 다발
    re: /\bsweden\b|\bswedish\b|\bstockholm\b|\bgotland\b|스웨덴|스톡홀름|고틀란드/i,
    collectiveDefense: "nato-article5", lat: 59.33, lng: 18.07 },
  { iso2: "SK", iso3: "SVK", nameKo: "슬로바키아", nameEn: "Slovakia",
    flank: "atlantic-flank", adjacentTheater: "russia-ukraine",
    re: /\bslovakia\b|\bslovak\b|\bbratislava\b|슬로바키아|브라티슬라바/i,
    collectiveDefense: "nato-article5", lat: 48.15, lng: 17.11 },
  { iso2: "HU", iso3: "HUN", nameKo: "헝가리", nameEn: "Hungary",
    flank: "atlantic-flank", adjacentTheater: "russia-ukraine",
    re: /\bhungary\b|\bhungarian\b|\bbudapest\b|헝가리|부다페스트/i,
    collectiveDefense: "nato-article5", lat: 47.5, lng: 19.04 },
  { iso2: "BG", iso3: "BGR", nameKo: "불가리아", nameEn: "Bulgaria",
    flank: "atlantic-flank", adjacentTheater: "russia-ukraine",
    // 흑해 연안 — 표류 기뢰·잔해 낙하
    re: /\bbulgaria\w*\b|\bsofia\b|불가리아|소피아/i,
    collectiveDefense: "nato-article5", lat: 42.7, lng: 23.32 },
  { iso2: "TR", iso3: "TUR", nameKo: "튀르키예", nameEn: "Türkiye",
    flank: "atlantic-flank", adjacentTheater: "russia-ukraine",
    // 몽트뢰 협약 관리자 · 흑해와 중동 양쪽에 걸침
    re: /\bturkey\b|\bt(?:ü|u)rkiye\b|\bturkish\b|\bankara\b|\bistanbul\b|튀르키예|터키|앙카라|이스탄불/i,
    collectiveDefense: "nato-article5", lat: 39.93, lng: 32.86 },
];

/**
 * 인도태평양 플랭크 — 대만·한반도 전장의 불똥이 닿는 동맹·파트너.
 * 대서양과 **같은 가중치**로 다룬다. ADIZ 진입·미사일 경보·영해 침범은
 * 폴란드 공습경보와 같은 종류의 사실이다.
 */
const INDO_PACIFIC_FLANK: PerimeterState[] = [
  { iso2: "JP", iso3: "JPN", nameKo: "일본", nameEn: "Japan",
    flank: "indo-pacific-flank", adjacentTheater: "china-taiwan",
    // 사키시마 제도는 대만에서 110km
    re: /\bjapan\b|\bjapanese\b|\btokyo\b|\bokinawa\b|\byonaguni\b|\bsakishima\b|일본|도쿄|오키나와|요나구니/i,
    collectiveDefense: "us-bilateral", lat: 35.68, lng: 139.69 },
  { iso2: "KR", iso3: "KOR", nameKo: "한국", nameEn: "South Korea",
    flank: "indo-pacific-flank", adjacentTheater: "korea",
    principalIn: "korea",
    re: /\bsouth korea\b|\brepublic of korea\b|\bseoul\b|\brok\b|\bkadiz\b|한국|대한민국|서울/i,
    collectiveDefense: "us-bilateral", lat: 37.57, lng: 126.98 },
  { iso2: "PH", iso3: "PHL", nameKo: "필리핀", nameEn: "Philippines",
    flank: "indo-pacific-flank", adjacentTheater: "china-taiwan",
    re: /\bphilippin\w*\b|\bmanila\b|\bluzon\b|\bsecond thomas\b|\bscarborough\b|필리핀|마닐라|루손|스카버러/i,
    collectiveDefense: "us-bilateral", lat: 14.6, lng: 120.98 },
  { iso2: "AU", iso3: "AUS", nameKo: "호주", nameEn: "Australia",
    flank: "indo-pacific-flank", adjacentTheater: "southeast-asia",
    re: /\baustralia\w*\b|\bcanberra\b|\bdarwin\b|\baukus\b|호주|캔버라|다윈|오커스/i,
    collectiveDefense: "us-bilateral", lat: -35.28, lng: 149.13 },
  { iso2: "TW", iso3: "TWN", nameKo: "대만", nameEn: "Taiwan",
    flank: "indo-pacific-flank", adjacentTheater: "china-taiwan",
    // 주전장의 당사국 — 같은 전장 기사에서는 유출로 세지 않는다
    principalIn: "china-taiwan",
    re: /\btaiwan\b|\btaipei\b|\btaidiz\b|대만|타이완|타이베이/i,
    collectiveDefense: "partner", lat: 25.03, lng: 121.57 },
  { iso2: "GU", iso3: "GUM", nameKo: "괌", nameEn: "Guam",
    flank: "indo-pacific-flank", adjacentTheater: "china-taiwan",
    // 앤더슨 공군기지 — 중·북 중거리 미사일 사거리 논의의 기준점
    re: /\bguam\b|\bandersen air force\b|괌|앤더슨/i,
    collectiveDefense: "us-bilateral", lat: 13.44, lng: 144.79 },
  { iso2: "MY", iso3: "MYS", nameKo: "말레이시아", nameEn: "Malaysia",
    flank: "indo-pacific-flank", adjacentTheater: "southeast-asia",
    // 루코니아 암초 — 남중국해 EEZ 마찰
    re: /\bmalaysia\w*\b|\bkuala lumpur\b|\bluconia\b|말레이시아|쿠알라룸푸르/i,
    collectiveDefense: "none", lat: 3.14, lng: 101.69 },
  { iso2: "VN", iso3: "VNM", nameKo: "베트남", nameEn: "Vietnam",
    flank: "indo-pacific-flank", adjacentTheater: "southeast-asia",
    re: /\bvietnam\w*\b|\bhanoi\b|베트남|하노이/i,
    collectiveDefense: "none", lat: 21.03, lng: 105.85 },
];

export const PERIMETER_STATES: readonly PerimeterState[] = [
  ...ATLANTIC_FLANK,
  ...INDO_PACIFIC_FLANK,
];

export const FLANK_LABEL: Record<FlankId, { ko: string; en: string }> = {
  "atlantic-flank": { ko: "대서양 플랭크", en: "Atlantic flank" },
  "indo-pacific-flank": { ko: "인도태평양 플랭크", en: "Indo-Pacific flank" },
};

/** 본문에서 경계국을 찾는다. 최대 3개 (제목 나열형 노이즈 방지). */
export function findPerimeterStates(text: string, limit = 3): PerimeterState[] {
  if (!text) return [];
  const hits: PerimeterState[] = [];
  for (const s of PERIMETER_STATES) {
    if (hits.length >= limit) break;
    if (s.re.test(text)) hits.push(s);
  }
  return hits;
}

export function perimeterStateByIso2(iso2: string): PerimeterState | undefined {
  const key = iso2.toUpperCase();
  return PERIMETER_STATES.find((s) => s.iso2 === key);
}

/** 두 플랭크가 균형 있게 채워졌는지 — 테스트가 강제한다. */
export function flankCounts(): Record<FlankId, number> {
  return {
    "atlantic-flank": PERIMETER_STATES.filter((s) => s.flank === "atlantic-flank").length,
    "indo-pacific-flank": PERIMETER_STATES.filter((s) => s.flank === "indo-pacific-flank").length,
  };
}
