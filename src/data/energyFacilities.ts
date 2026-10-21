/**
 * 에너지·항만 시설 — 공습 불꽃이 "어디를" 맞혔는지 붙이는 감시 목록.
 *
 * 랜딩 약속(「불꽃 — 드론·미사일이 떨어진 곳」): 항구, 정유소, 수출터미널처럼 해운과 닿은 타격을 구분해 보여 준다.
 * 2026-10-20 해역판(SeaDashboard)에 있던 러시아·우크라이나 목록을 되살리고, 홍해·걸프·지중해 동쪽 해운 시설을 더했다.
 *
 * 포함: 정유소·유류저장소·송유관 펌프장·원유/LNG 수출터미널·항구·항구행 철도 거점.
 * 제외: 발전소·송전망, 군사기지, 일반 도시 (그건 뉴스 패널 몫).
 *
 * 왜 해운 서비스에 들어가나:
 *   - 수출터미널이 맞으면 유조선 출항이 멈추거나 밀리고 그 항구 전쟁위험 보험료가 뛴다.
 *   - 내륙 정유소가 멈추면 노보로시스크·투압세·프리모르스크로 나가는 디젤·중유 물량이 준다.
 *   - 우크라이나 항구·철도가 맞으면 곡물 선적이 밀린다.
 *   - 홍해 항구(호데이다·라스 이사)·걸프 터미널(라스 타누라·푸자이라·하르그)이 맞으면 그 해역 통항 판단이 바로 바뀐다.
 *
 * ⚠️ 좌표는 공개 지도·위키백과·항만 DB 기반 **근사값**이다 (시설 중심 ±2~5km 수준).
 *    매칭은 `radiusKm` 안에서만 하므로 정밀 측량이 필요하지 않지만,
 *    새 시설을 넣을 때는 출처 좌표를 한 번 확인한다. (중동 항목: 2026-10-21 확인)
 */

export type EnergyFacilityCountry = "RU" | "UA" | "SA" | "AE" | "QA" | "IR" | "YE" | "IL";

export type EnergyFacilityKind =
  | "export-terminal" // 원유·제품 수출터미널
  | "lng-terminal" // LNG 수출 기지
  | "refinery" // 정유소
  | "oil-depot" // 유류저장소
  | "pipeline-pump" // 송유관 펌프장
  | "oil-processing" // 원유 처리 시설
  | "gas" // 가스 생산·저장
  | "port" // 항구 (곡물·컨테이너)
  | "rail-hub"; // 항구행 철도 거점

export type EnergySeaRegion = "black-sea" | "baltic" | "red-sea" | "hormuz" | "med";

export type EnergyFacility = {
  id: string;
  country: EnergyFacilityCountry;
  kind: EnergyFacilityKind;
  nameKo: string;
  nameEn: string;
  /** 속보 본문 매칭용 별칭 (영문 소문자·한글) */
  aliases: string[];
  lat: number;
  lng: number;
  /** 속보·열점 좌표를 이 시설로 볼 반경 */
  radiusKm: number;
  /** 해안(선적 직결) 여부 — 화면에서 "해안 터미널 / 내륙 시설" 구분 */
  coastal: boolean;
  /** 이 시설과 연결된 해역 (war_risk_quotes.region 과 같은 축) */
  seaRegion: EnergySeaRegion;
  /** 점령지 시설 */
  occupied?: boolean;
};

export const ENERGY_FACILITY_KIND_KO: Record<EnergyFacilityKind, string> = {
  "export-terminal": "수출터미널",
  "lng-terminal": "LNG 터미널",
  refinery: "정유소",
  "oil-depot": "유류저장소",
  "pipeline-pump": "송유관 펌프장",
  "oil-processing": "원유 처리 시설",
  gas: "가스 시설",
  port: "항구",
  "rail-hub": "철도 거점",
};

export const ENERGY_FACILITY_KIND_EN: Record<EnergyFacilityKind, string> = {
  "export-terminal": "export terminal",
  "lng-terminal": "LNG terminal",
  refinery: "refinery",
  "oil-depot": "oil depot",
  "pipeline-pump": "pumping station",
  "oil-processing": "oil processing",
  gas: "gas facility",
  port: "port",
  "rail-hub": "rail hub",
};

const F = (f: EnergyFacility) => f;

export const ENERGY_FACILITIES: EnergyFacility[] = [
  // ── 러시아 · 흑해·아조프 수출터미널 ────────────────────────────
  F({ id: "ru-novorossiysk-sheskharis", country: "RU", kind: "export-terminal", nameKo: "노보로시스크 셰스하리스 터미널", nameEn: "Novorossiysk Sheskharis terminal", aliases: ["novorossiysk", "sheskharis", "노보로시스크"], lat: 44.68, lng: 37.8, radiusKm: 8, coastal: true, seaRegion: "black-sea" }),
  F({ id: "ru-cpc-terminal", country: "RU", kind: "export-terminal", nameKo: "CPC 해상터미널", nameEn: "CPC Marine Terminal", aliases: ["cpc", "caspian pipeline consortium", "yuzhnaya ozereyevka", "카스피 송유관"], lat: 44.67, lng: 37.63, radiusKm: 8, coastal: true, seaRegion: "black-sea" }),
  F({ id: "ru-tuapse", country: "RU", kind: "export-terminal", nameKo: "투압세 정유소·항구", nameEn: "Tuapse refinery & port", aliases: ["tuapse", "투압세"], lat: 44.1, lng: 39.08, radiusKm: 6, coastal: true, seaRegion: "black-sea" }),
  F({ id: "ru-taman", country: "RU", kind: "export-terminal", nameKo: "타만 항", nameEn: "Port of Taman", aliases: ["taman", "타만"], lat: 45.11, lng: 36.78, radiusKm: 10, coastal: true, seaRegion: "black-sea" }),
  F({ id: "ru-kavkaz", country: "RU", kind: "port", nameKo: "카프카스 항", nameEn: "Port Kavkaz", aliases: ["port kavkaz", "kavkaz", "카프카스 항"], lat: 45.36, lng: 36.67, radiusKm: 5, coastal: true, seaRegion: "black-sea" }),
  F({ id: "ru-feodosia-depot", country: "RU", kind: "oil-depot", nameKo: "페오도시야 유류저장소", nameEn: "Feodosia oil depot", aliases: ["feodosia", "페오도시야"], lat: 45.05, lng: 35.39, radiusKm: 5, coastal: true, seaRegion: "black-sea", occupied: true }),
  // ── 러시아 · 발트 수출터미널 ───────────────────────────────────
  F({ id: "ru-primorsk", country: "RU", kind: "export-terminal", nameKo: "프리모르스크 석유터미널", nameEn: "Primorsk oil terminal", aliases: ["primorsk", "프리모르스크"], lat: 60.35, lng: 28.7, radiusKm: 6, coastal: true, seaRegion: "baltic" }),
  F({ id: "ru-ust-luga", country: "RU", kind: "export-terminal", nameKo: "우스트루가 항", nameEn: "Port of Ust-Luga", aliases: ["ust-luga", "ust luga", "우스트루가"], lat: 59.68, lng: 28.4, radiusKm: 8, coastal: true, seaRegion: "baltic" }),
  F({ id: "ru-vysotsk", country: "RU", kind: "export-terminal", nameKo: "비소츠크 터미널", nameEn: "Vysotsk terminal", aliases: ["vysotsk", "비소츠크"], lat: 60.62, lng: 28.57, radiusKm: 5, coastal: true, seaRegion: "baltic" }),
  // ── 러시아 · 남부 정유소 (흑해 제품 수출 직결) ─────────────────
  F({ id: "ru-afipsky", country: "RU", kind: "refinery", nameKo: "아피프스키 정유소", nameEn: "Afipsky refinery", aliases: ["afipsky", "afipskiy", "아피프스키"], lat: 44.89, lng: 38.84, radiusKm: 5, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-ilsky", country: "RU", kind: "refinery", nameKo: "일스키 정유소", nameEn: "Ilsky refinery", aliases: ["ilsky", "ilskiy", "일스키"], lat: 44.85, lng: 38.56, radiusKm: 5, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-slavyansk", country: "RU", kind: "refinery", nameKo: "슬라뱐스크나쿠바니 정유소", nameEn: "Slavyansk-na-Kubani refinery", aliases: ["slavyansk", "slavyansk-na-kubani", "슬라뱐스크"], lat: 45.26, lng: 38.13, radiusKm: 5, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-krasnodar", country: "RU", kind: "refinery", nameKo: "크라스노다르 정유소", nameEn: "Krasnodar refinery", aliases: ["krasnodar refinery", "크라스노다르 정유"], lat: 45.02, lng: 39.05, radiusKm: 5, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-novoshakhtinsk", country: "RU", kind: "refinery", nameKo: "노보샤흐틴스크 정유소", nameEn: "Novoshakhtinsk refinery", aliases: ["novoshakhtinsk", "노보샤흐틴스크"], lat: 47.76, lng: 39.93, radiusKm: 5, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-volgograd", country: "RU", kind: "refinery", nameKo: "볼고그라드 정유소", nameEn: "Volgograd refinery", aliases: ["volgograd refinery", "volgograd", "볼고그라드"], lat: 48.51, lng: 44.53, radiusKm: 6, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-tikhoretsk", country: "RU", kind: "pipeline-pump", nameKo: "티호레츠크 송유관 펌프장", nameEn: "Tikhoretsk oil pumping station", aliases: ["tikhoretsk", "티호레츠크"], lat: 45.87, lng: 40.1, radiusKm: 5, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-kropotkinskaya", country: "RU", kind: "pipeline-pump", nameKo: "CPC 크로폿킨스카야 펌프장", nameEn: "CPC Kropotkinskaya pumping station", aliases: ["kropotkinskaya", "kropotkin", "크로폿킨"], lat: 45.42, lng: 40.58, radiusKm: 5, coastal: false, seaRegion: "black-sea" }),
  // ── 러시아 · 중부·볼가·우랄 정유소 (깊숙한 내륙) ──────────────
  F({ id: "ru-ryazan", country: "RU", kind: "refinery", nameKo: "랴잔 정유소", nameEn: "Ryazan refinery", aliases: ["ryazan", "랴잔"], lat: 54.58, lng: 39.72, radiusKm: 6, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-moscow", country: "RU", kind: "refinery", nameKo: "모스크바 정유소(카프로냐)", nameEn: "Moscow refinery (Kapotnya)", aliases: ["moscow refinery", "kapotnya", "모스크바 정유"], lat: 55.63, lng: 37.8, radiusKm: 4, coastal: false, seaRegion: "baltic" }),
  F({ id: "ru-yaroslavl", country: "RU", kind: "refinery", nameKo: "야로슬라블 정유소", nameEn: "Yaroslavl refinery (YANOS)", aliases: ["yaroslavl", "yanos", "야로슬라블"], lat: 57.55, lng: 39.82, radiusKm: 6, coastal: false, seaRegion: "baltic" }),
  F({ id: "ru-kirishi", country: "RU", kind: "refinery", nameKo: "키리시 정유소", nameEn: "Kirishi refinery (KINEF)", aliases: ["kirishi", "kinef", "키리시"], lat: 59.47, lng: 32.03, radiusKm: 6, coastal: false, seaRegion: "baltic" }),
  F({ id: "ru-kstovo", country: "RU", kind: "refinery", nameKo: "크스토보 정유소(니즈니노브고로드)", nameEn: "Kstovo refinery (NORSI)", aliases: ["kstovo", "norsi", "nizhny novgorod refinery", "크스토보"], lat: 56.13, lng: 44.17, radiusKm: 6, coastal: false, seaRegion: "baltic" }),
  F({ id: "ru-saratov", country: "RU", kind: "refinery", nameKo: "사라토프 정유소", nameEn: "Saratov refinery", aliases: ["saratov", "사라토프"], lat: 51.49, lng: 46.06, radiusKm: 6, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-syzran", country: "RU", kind: "refinery", nameKo: "시즈란 정유소", nameEn: "Syzran refinery", aliases: ["syzran", "시즈란"], lat: 53.16, lng: 48.47, radiusKm: 6, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-novokuibyshevsk", country: "RU", kind: "refinery", nameKo: "노보쿠이비셰프스크 정유소", nameEn: "Novokuibyshevsk refinery", aliases: ["novokuibyshevsk", "노보쿠이비셰프스크"], lat: 53.1, lng: 49.95, radiusKm: 6, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-samara-kuibyshev", country: "RU", kind: "refinery", nameKo: "사마라(쿠이비셰프) 정유소", nameEn: "Kuibyshev refinery (Samara)", aliases: ["kuibyshev refinery", "samara refinery", "사마라 정유"], lat: 53.23, lng: 50.21, radiusKm: 6, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-ufa", country: "RU", kind: "refinery", nameKo: "우파 정유단지", nameEn: "Ufa refineries (Bashneft)", aliases: ["ufa", "bashneft", "우파"], lat: 54.82, lng: 56.07, radiusKm: 8, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-salavat", country: "RU", kind: "refinery", nameKo: "살라바트 정유소", nameEn: "Salavat refinery", aliases: ["salavat", "살라바트"], lat: 53.37, lng: 55.92, radiusKm: 6, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-orsk", country: "RU", kind: "refinery", nameKo: "오르스크 정유소", nameEn: "Orsk refinery", aliases: ["orsk", "오르스크"], lat: 51.21, lng: 58.62, radiusKm: 6, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ru-ukhta", country: "RU", kind: "refinery", nameKo: "우흐타 정유소", nameEn: "Ukhta refinery", aliases: ["ukhta", "우흐타"], lat: 63.56, lng: 53.7, radiusKm: 6, coastal: false, seaRegion: "baltic" }),
  F({ id: "ru-antipinsky", country: "RU", kind: "refinery", nameKo: "안티핀스키 정유소(튜멘)", nameEn: "Antipinsky refinery (Tyumen)", aliases: ["antipinsky", "tyumen refinery", "안티핀스키", "튜멘"], lat: 57.1, lng: 65.5, radiusKm: 6, coastal: false, seaRegion: "baltic" }),
  F({ id: "ru-unecha", country: "RU", kind: "pipeline-pump", nameKo: "우네차 드루즈바 펌프장", nameEn: "Unecha Druzhba pumping station", aliases: ["unecha", "druzhba", "우네차", "드루즈바"], lat: 52.86, lng: 32.68, radiusKm: 5, coastal: false, seaRegion: "baltic" }),
  // ── 우크라이나 · 항구 ─────────────────────────────────────────
  F({ id: "ua-odesa-port", country: "UA", kind: "port", nameKo: "오데사 항", nameEn: "Port of Odesa", aliases: ["odesa port", "odessa port", "port of odesa", "오데사 항"], lat: 46.49, lng: 30.74, radiusKm: 5, coastal: true, seaRegion: "black-sea" }),
  F({ id: "ua-chornomorsk", country: "UA", kind: "port", nameKo: "초르노모르스크 항", nameEn: "Port of Chornomorsk", aliases: ["chornomorsk", "chernomorsk", "초르노모르스크"], lat: 46.3, lng: 30.66, radiusKm: 5, coastal: true, seaRegion: "black-sea" }),
  F({ id: "ua-pivdennyi", country: "UA", kind: "port", nameKo: "피우덴니(유즈네) 항", nameEn: "Port of Pivdennyi", aliases: ["pivdennyi", "yuzhne", "yuzhny", "피우덴니"], lat: 46.62, lng: 31.02, radiusKm: 5, coastal: true, seaRegion: "black-sea" }),
  F({ id: "ua-izmail", country: "UA", kind: "port", nameKo: "이즈마일 항", nameEn: "Port of Izmail", aliases: ["izmail", "이즈마일"], lat: 45.34, lng: 28.84, radiusKm: 5, coastal: true, seaRegion: "black-sea" }),
  F({ id: "ua-reni", country: "UA", kind: "port", nameKo: "레니 항", nameEn: "Port of Reni", aliases: ["reni", "레니"], lat: 45.45, lng: 28.29, radiusKm: 4, coastal: true, seaRegion: "black-sea" }),
  // ── 우크라이나 · 정유·가스·철도 ───────────────────────────────
  F({ id: "ua-kremenchuk", country: "UA", kind: "refinery", nameKo: "크레멘추크 정유소", nameEn: "Kremenchuk refinery", aliases: ["kremenchuk", "크레멘추크"], lat: 49.07, lng: 33.34, radiusKm: 6, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ua-shebelynka", country: "UA", kind: "gas", nameKo: "셰벨린카 가스전", nameEn: "Shebelynka gas field", aliases: ["shebelynka", "셰벨린카"], lat: 49.45, lng: 36.22, radiusKm: 10, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ua-bilche-volytsia", country: "UA", kind: "gas", nameKo: "빌체볼리치아 지하가스저장소", nameEn: "Bilche-Volytsia gas storage", aliases: ["bilche-volytsia", "stryi", "빌체볼리치아"], lat: 49.3, lng: 23.85, radiusKm: 10, coastal: false, seaRegion: "black-sea" }),
  F({ id: "ua-rozdilna", country: "UA", kind: "rail-hub", nameKo: "로즈딜나 철도 분기점", nameEn: "Rozdilna rail junction", aliases: ["rozdilna", "로즈딜나"], lat: 46.85, lng: 30.08, radiusKm: 4, coastal: false, seaRegion: "black-sea" }),

  // ── 홍해·아덴만 (후티 공격권) ─────────────────────────────────
  F({ id: "ye-hodeidah-port", country: "YE", kind: "port", nameKo: "호데이다 항", nameEn: "Port of Hodeidah", aliases: ["hodeidah port", "port of hodeidah", "hudaydah port", "호데이다 항"], lat: 14.84, lng: 42.93, radiusKm: 6, coastal: true, seaRegion: "red-sea" }),
  F({ id: "ye-ras-isa", country: "YE", kind: "export-terminal", nameKo: "라스 이사 석유터미널", nameEn: "Ras Isa oil terminal", aliases: ["ras isa", "ras issa", "라스 이사"], lat: 15.22, lng: 42.69, radiusKm: 8, coastal: true, seaRegion: "red-sea" }),
  F({ id: "ye-aden-port", country: "YE", kind: "port", nameKo: "아덴 항", nameEn: "Port of Aden", aliases: ["aden port", "port of aden", "아덴 항"], lat: 12.86, lng: 45.0, radiusKm: 8, coastal: true, seaRegion: "red-sea" }),
  F({ id: "sa-jazan-refinery", country: "SA", kind: "refinery", nameKo: "지잔 정유소", nameEn: "Jazan refinery", aliases: ["jazan refinery", "jizan refinery", "지잔 정유", "지잔"], lat: 17.29, lng: 42.38, radiusKm: 8, coastal: true, seaRegion: "red-sea" }),
  F({ id: "sa-yanbu", country: "SA", kind: "export-terminal", nameKo: "얀부 정유·수출터미널", nameEn: "Yanbu refinery & terminal", aliases: ["yanbu", "얀부"], lat: 24.09, lng: 38.06, radiusKm: 15, coastal: true, seaRegion: "red-sea" }),
  F({ id: "il-eilat-port", country: "IL", kind: "port", nameKo: "에일라트 항", nameEn: "Port of Eilat", aliases: ["eilat port", "port of eilat", "에일라트"], lat: 29.53, lng: 34.94, radiusKm: 5, coastal: true, seaRegion: "red-sea" }),
  // ── 걸프·호르무즈 ───────────────────────────────────────────────
  F({ id: "sa-ras-tanura", country: "SA", kind: "export-terminal", nameKo: "라스 타누라 터미널", nameEn: "Ras Tanura terminal", aliases: ["ras tanura", "라스 타누라"], lat: 26.63, lng: 50.15, radiusKm: 10, coastal: true, seaRegion: "hormuz" }),
  F({ id: "sa-abqaiq", country: "SA", kind: "oil-processing", nameKo: "아브카이크 원유처리시설", nameEn: "Abqaiq processing facility", aliases: ["abqaiq", "buqayq", "아브카이크"], lat: 25.94, lng: 49.67, radiusKm: 8, coastal: false, seaRegion: "hormuz" }),
  F({ id: "ae-fujairah", country: "AE", kind: "export-terminal", nameKo: "푸자이라 석유터미널", nameEn: "Fujairah oil terminal", aliases: ["fujairah", "푸자이라"], lat: 25.12, lng: 56.33, radiusKm: 10, coastal: true, seaRegion: "hormuz" }),
  F({ id: "qa-ras-laffan", country: "QA", kind: "lng-terminal", nameKo: "라스 라판 LNG 기지", nameEn: "Ras Laffan LNG", aliases: ["ras laffan", "라스 라판"], lat: 25.86, lng: 51.54, radiusKm: 10, coastal: true, seaRegion: "hormuz" }),
  F({ id: "ir-kharg", country: "IR", kind: "export-terminal", nameKo: "하르그 섬 석유터미널", nameEn: "Kharg Island oil terminal", aliases: ["kharg", "하르그"], lat: 29.25, lng: 50.31, radiusKm: 8, coastal: true, seaRegion: "hormuz" }),
  F({ id: "ir-bandar-abbas", country: "IR", kind: "port", nameKo: "반다르아바스·샤히드 라자이 항", nameEn: "Bandar Abbas / Shahid Rajaee port", aliases: ["shahid rajaee", "bandar abbas port", "반다르아바스", "샤히드 라자이"], lat: 27.15, lng: 56.18, radiusKm: 15, coastal: true, seaRegion: "hormuz" }),
  F({ id: "ir-abadan", country: "IR", kind: "refinery", nameKo: "아바단 정유소", nameEn: "Abadan refinery", aliases: ["abadan refinery", "아바단"], lat: 30.35, lng: 48.27, radiusKm: 6, coastal: true, seaRegion: "hormuz" }),
  // ── 지중해 동쪽 ─────────────────────────────────────────────────
  F({ id: "il-haifa", country: "IL", kind: "port", nameKo: "하이파 항·정유소", nameEn: "Port of Haifa & Bazan refinery", aliases: ["haifa port", "port of haifa", "bazan", "하이파"], lat: 32.8, lng: 34.99, radiusKm: 6, coastal: true, seaRegion: "med" }),
];

/** 두 좌표 사이 거리 (km, 하버사인) */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 좌표가 반경 안에 드는 가장 가까운 시설 */
export function nearestEnergyFacility(
  lat: number,
  lng: number,
  slackKm = 0,
): { facility: EnergyFacility; km: number } | null {
  let best: { facility: EnergyFacility; km: number } | null = null;
  for (const f of ENERGY_FACILITIES) {
    const km = distanceKm(lat, lng, f.lat, f.lng);
    if (km <= f.radiusKm + slackKm && (!best || km < best.km)) best = { facility: f, km };
  }
  return best;
}
