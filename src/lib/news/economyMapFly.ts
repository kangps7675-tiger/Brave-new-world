import type { MapFlyTarget } from "@/lib/news/theaterMap";
import { ECON_NAV_MENU_GROUPS, ECON_REGION_KEYWORDS } from "@/data/econNavRegions";

export type EconomyArticleFlyTarget = MapFlyTarget & { label: string };

type PlaceAlias = {
  keys: string[];
  lat: number;
  lng: number;
  altitude: number;
  label: string;
};

function p(
  label: string,
  lat: number,
  lng: number,
  altitude: number,
  ...keys: string[]
): PlaceAlias {
  return { label, lat, lng, altitude, keys };
}

/** 초크포인트(해협·운하) — 유가·물류 뉴스 「지도보러가기」 */
const CHOKEPOINT_PLACES: PlaceAlias[] = [
  p(
    "호르무즈 해협",
    26.55,
    56.25,
    1.15,
    "hormuz",
    "strait of hormuz",
    "호르무즈",
  ),
  p(
    "수에즈 운하",
    30.45,
    32.35,
    1.2,
    "suez",
    "suez canal",
    "수에즈",
  ),
  p(
    "바브엘만데브·홍해",
    12.58,
    43.33,
    1.25,
    "bab el-mandeb",
    "bab-el-mandeb",
    "bab al-mandab",
    "바브엘만데브",
    "red sea",
    "홍해",
  ),
  p(
    "말라카 해협",
    2.5,
    101.5,
    1.2,
    "malacca",
    "strait of malacca",
    "말라카",
  ),
  p(
    "대만해협",
    24.5,
    119.5,
    1.15,
    "taiwan strait",
    "대만해협",
  ),
  p(
    "파나마 운하",
    9.08,
    -79.68,
    1.15,
    "panama canal",
    "파나마 운하",
    "파나마운하",
  ),
  p(
    "보스포루스",
    41.12,
    29.05,
    1.1,
    "bosporus",
    "bosphorus",
    "보스포루스",
    "dardanelles",
    "다르다넬스",
  ),
  p("지브롤터", 36.14, -5.35, 1.15, "gibraltar", "지브롤터"),
  p(
    "희망봉",
    -34.35,
    18.47,
    1.4,
    "cape of good hope",
    "good hope",
    "희망봉",
  ),
];

/** 파이프·에너지 회랑 */
const ENERGY_ROUTE_PLACES: PlaceAlias[] = [
  p(
    "북해·발틱 가스회랑",
    54.4,
    14.0,
    1.45,
    "nord stream",
    "nordstream",
    "노드스트림",
    "노드 스트림",
    "노르드스트림",
    "노르드 스트림",
    "야말",
    "yamal",
    "ukraine transit",
    "우크라이나 통과",
  ),
  p(
    "러·중 가스 회랑",
    50.2,
    120.5,
    1.55,
    "power of siberia",
    "시베리아의 힘",
    "시베리아의힘",
    "power-of-siberia",
    "러중 가스",
    "russia china gas",
  ),
  p(
    "동시베리아·극동 원유",
    52.0,
    128.0,
    1.6,
    "espo",
    "동시베리아",
    "kozmino",
    "코지미노",
    "우랄유",
    "urals crude",
  ),
  p("드루즈바 송유관", 52.2, 21.0, 1.4, "druzhba", "드루즈바", "우정의 송유관"),
  p(
    "흑해·터키 가스",
    43.5,
    34.0,
    1.35,
    "turkstream",
    "터키 스트림",
    "블루스트림",
    "blue stream",
    "흑해 가스",
  ),
  p("걸프 원유", 25.3, 49.0, 1.55, "opec", "석유수출국", "saudi crude", "사우디 원유"),
];

/**
 * 경제·기업·투자 뉴스에 자주 나오는 도시·허브·공장 벨트.
 * 제목/요약에 지역명이 있으면 「지도보러가기」로 이동.
 */
const INVESTMENT_AND_CITY_PLACES: PlaceAlias[] = [
  // 한국
  p("서울", 37.57, 126.98, 0.72, "서울", "seoul", "강남", "여의도", "판교"),
  p("부산", 35.18, 129.08, 0.85, "부산", "busan", "부산항"),
  p("인천", 37.46, 126.63, 0.85, "인천", "incheon", "송도"),
  p("울산", 35.54, 129.31, 0.9, "울산", "ulsan"),
  p("평택", 37.0, 127.09, 0.85, "평택", "pyeongtaek", "삼성 평택"),
  p("용인", 37.24, 127.18, 0.85, "용인", "yongin", "기흥"),
  p("이천", 37.27, 127.44, 0.85, "이천", "icheon", "sk하이닉스 이천"),
  p("청주", 36.64, 127.49, 0.9, "청주", "cheongju"),
  p("구미", 36.12, 128.34, 0.9, "구미", "gumi"),
  p("창원", 35.23, 128.68, 0.9, "창원", "changwon"),
  // 미국
  p("뉴욕", 40.71, -74.01, 0.85, "뉴욕", "new york", "wall street", "월스트리트", "manhattan", "맨해튼"),
  p("실리콘밸리", 37.39, -122.08, 0.9, "실리콘밸리", "silicon valley", "산타클라라", "santa clara"),
  p("샌프란시스코", 37.77, -122.42, 0.85, "샌프란시스코", "san francisco", "bay area", "베이 에이리어"),
  p("시애틀", 47.61, -122.33, 0.9, "시애틀", "seattle", "redmond", "레드먼드"),
  p("오스틴", 30.27, -97.74, 0.95, "오스틴", "austin", "texas fab", "텍사스 공장"),
  p("애리조나", 33.45, -112.07, 1.05, "애리조나", "arizona", "phoenix", "피닉스", "tsmc arizona"),
  p("워싱턴 DC", 38.9, -77.04, 0.95, "워싱턴", "washington dc", "연준", "federal reserve", "the fed"),
  p("시카고", 41.88, -87.63, 0.95, "시카고", "chicago", "cme"),
  p("휴스턴", 29.76, -95.37, 0.95, "휴스턴", "houston", "permian", "퍼미안"),
  p("디트로이트", 42.33, -83.05, 0.95, "디트로이트", "detroit", "모빌리티"),
  p("보스턴", 42.36, -71.06, 0.95, "보스턴", "boston", "케임브리지", "cambridge ma"),
  // 중국·대만·홍콩
  p("베이징", 39.9, 116.4, 0.9, "베이징", "beijing", "북경"),
  p("상하이", 31.23, 121.47, 0.85, "상하이", "shanghai", "푸동", "pudong"),
  p("선전", 22.54, 114.06, 0.85, "선전", "shenzhen", "화웨이", "huawei"),
  p("광저우", 23.13, 113.26, 0.9, "광저우", "guangzhou", "주장 삼각주", "pearl river"),
  p("항저우", 30.27, 120.15, 0.9, "항저우", "hangzhou", "알리바바", "alibaba"),
  p("청두", 30.57, 104.07, 1.0, "청두", "chengdu"),
  p("시안", 34.26, 108.94, 1.0, "시안", "xi'an", "xian"),
  p("홍콩", 22.3, 114.17, 0.85, "홍콩", "hong kong", "hang seng", "항셍"),
  p("타이베이", 25.03, 121.57, 0.85, "타이베이", "台北", "taipei"),
  p("구마모토", 32.8, 130.71, 0.9, "구마모토", "kumamoto", "tsmc japan", "tsmc 구마모토", "대만 반도체 일본", "구마모토 tsmc"),
  p("신주", 24.81, 120.97, 0.8, "신주", "hsinchu", "대만 반도체", "taiwan semiconductor", "tsmc hsinchu"),
  // tsmc 단독은 대만(신주) 기본 — 위에서 구마모토·애리조나가 더 긴 키로 우선
  p("신주·TSMC", 24.81, 120.97, 0.8, "tsmc"),
  // 동남아·인도
  p("싱가포르", 1.35, 103.82, 0.85, "싱가포르", "singapore", "마리나베이"),
  p("자카르타", -6.21, 106.85, 0.95, "자카르타", "jakarta", "인도네시아 수도"),
  p("호치민", 10.82, 106.63, 0.95, "호치민", "ho chi minh", "사이공", "vietnam fab"),
  p("하노이", 21.03, 105.85, 0.95, "하노이", "hanoi", "bac ninh", "박닌"),
  p("방콕", 13.76, 100.5, 0.95, "방콕", "bangkok", "태국"),
  p("쿠알라룸푸르", 3.14, 101.69, 0.95, "쿠알라룸푸르", "kuala lumpur", "말레이시아"),
  p("마닐라", 14.6, 120.98, 0.95, "마닐라", "manila", "필리핀"),
  p("뭄바이", 19.08, 72.88, 0.95, "뭄바이", "mumbai", "봄베이"),
  p("첸나이", 13.08, 80.27, 0.95, "첸나이", "chennai", "마드라스", "madras"),
  p("벵갈루루", 12.97, 77.59, 0.95, "벵갈루루", "bangalore", "bengaluru", "인도 it"),
  p("하이데라바드", 17.39, 78.49, 0.95, "하이데라바드", "hyderabad"),
  p("뉴델리", 28.61, 77.21, 0.95, "뉴델리", "new delhi", "델리", "delhi"),
  // 중동·에너지
  p("두바이", 25.2, 55.27, 0.9, "두바이", "dubai", "difc"),
  p("아부다비", 24.45, 54.38, 0.95, "아부다비", "abu dhabi", "adinoc", "adnoc"),
  p("도하", 25.29, 51.53, 0.95, "도하", "doha", "카타르", "qatar"),
  p("리야드", 24.71, 46.68, 1.0, "리야드", "riyadh", "네옴", "neom", "사우디"),
  p("테헤란", 35.69, 51.39, 1.05, "테헤란", "tehran", "이란"),
  p("텔아비브", 32.09, 34.78, 0.9, "텔아비브", "tel aviv", "이스라엘 하이테크"),
  // 유럽
  p("런던", 51.51, -0.13, 0.85, "런던", "london", "시티 오브 런던", "canary wharf", "영란은행"),
  p("프랑크푸르트", 50.11, 8.68, 0.9, "프랑크푸르트", "frankfurt", "ecb", "유럽중앙은행"),
  p("암스테르담", 52.37, 4.9, 0.9, "암스테르담", "amsterdam", "asml", "아인트호벤", "eindhoven"),
  p("로테르담", 51.92, 4.48, 0.9, "로테르담", "rotterdam"),
  p("파리", 48.86, 2.35, 0.9, "파리", "paris", "cac 40"),
  p("취리히", 47.38, 8.54, 0.95, "취리히", "zurich", "스위스 금융"),
  p("밀라노", 45.46, 9.19, 0.95, "밀라노", "milan", "밀라노 증권"),
  p("베를린", 52.52, 13.41, 0.95, "베를린", "berlin"),
  p("뮌헨", 48.14, 11.58, 0.95, "뮌헨", "munich", "bmw", "지멘스"),
  p("드레스덴", 51.05, 13.74, 0.95, "드레스덴", "dresden", "silicon saxony"),
  p("더블린", 53.35, -6.26, 0.95, "더블린", "dublin", "아일랜드 법인"),
  p("바르셀로나", 41.39, 2.17, 0.95, "바르셀로나", "barcelona"),
  p("마드리드", 40.42, -3.7, 0.95, "마드리드", "madrid"),
  p("모스크바", 55.76, 37.62, 1.0, "모스크바", "moscow", "모스비르자"),
  p("바르샤바", 52.23, 21.01, 1.0, "바르샤바", "warsaw", "폴란드"),
  // 중남미·아프리카·호주
  p("상파울루", -23.55, -46.63, 1.05, "상파울루", "sao paulo", "브라질"),
  p("멕시코시티", 19.43, -99.13, 1.05, "멕시코시티", "mexico city", "멕시코"),
  p("산티아고", -33.45, -70.67, 1.1, "산티아고", "santiago", "칠레 구리"),
  p("요하네스버그", -26.2, 28.05, 1.15, "요하네스버그", "johannesburg", "남아공"),
  p("나이로비", -1.29, 36.82, 1.15, "나이로비", "nairobi", "케냐"),
  p("시드니", -33.87, 151.21, 1.05, "시드니", "sydney", "호주"),
  p("멜버른", -37.81, 144.96, 1.05, "멜버른", "melbourne"),
  p("퍼스", -31.95, 115.86, 1.1, "퍼스", "perth", "철광석"),
  // 국가·광역 (투자 대상국으로 자주 등장)
  p("베트남", 16.0, 108.0, 1.45, "베트남", "vietnam", "viet nam"),
  p("인도네시아", -2.5, 118.0, 1.7, "인도네시아", "indonesia"),
  p("인도", 22.0, 79.0, 1.75, "인도 ", " india", "인도에", "인도로", "india ", "인도 시장", "india market"),
  p("중국", 35.0, 105.0, 1.85, "중국 ", " china", "중국에", "중국으로", "china ", "중국 시장", "china market"),
  p("미국", 39.5, -98.35, 1.9, "미국 ", " u.s.", "미국에", "미국으로", "united states", "미국 시장", "us market"),
  p("일본", 36.2, 138.3, 1.55, "일본 ", " japan", "일본에", "일본으로", "japan ", "일본 시장"),
  p("독일", 51.2, 10.4, 1.55, "독일 ", " germany", "독일에", "독일로", "germany ", "독일 공장"),
  p("프랑스", 46.6, 2.2, 1.55, "프랑스 ", " france", "프랑스에", "france "),
  p("영국", 54.0, -2.0, 1.55, "영국 ", " britain", "uk ", "영국에", "united kingdom"),
  p("캐나다", 56.1, -106.3, 1.9, "캐나다", "canada", "토론토", "toronto", "밴쿠버", "vancouver"),
  p("호주", -25.0, 135.0, 1.85, "호주 ", " australia", "호주에", "australia "),
  p("브라질", -14.2, -51.9, 1.9, "브라질", "brazil"),
  p("멕시코", 23.6, -102.5, 1.7, "멕시코", "mexico", "근거리 이전", "nearshoring"),
  p("사우디아라비아", 23.9, 45.1, 1.7, "사우디아라비아", "saudi arabia", "사우디 "),
  p("UAE", 24.0, 54.0, 1.45, "아랍에미리트", "united arab emirates", "uae"),
];

function navPlaces(): PlaceAlias[] {
  const out: PlaceAlias[] = [];
  for (const group of ECON_NAV_MENU_GROUPS) {
    for (const item of group.items) {
      const keys = new Set<string>([
        item.id,
        item.label,
        ...(ECON_REGION_KEYWORDS[item.id] ?? []),
      ]);
      out.push({
        keys: [...keys],
        lat: item.lat,
        lng: item.lng,
        altitude: item.altitude,
        label: item.label,
      });
      for (const sub of item.subItems) {
        out.push({
          keys: [sub.id, sub.label, ...(ECON_REGION_KEYWORDS[sub.id] ?? [])],
          lat: sub.lat,
          lng: sub.lng,
          altitude: sub.altitude,
          label: sub.label,
        });
      }
    }
  }
  return out;
}

const ALL_PLACES: PlaceAlias[] = [
  ...CHOKEPOINT_PLACES,
  ...navPlaces(),
  ...ENERGY_ROUTE_PLACES,
  ...INVESTMENT_AND_CITY_PLACES,
];

function isHangulHeavy(s: string): boolean {
  let hangul = 0;
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) hangul += 1;
  }
  return hangul >= Math.ceil(s.length * 0.5);
}

function keyUsable(needle: string): boolean {
  if (needle.length < 2) return false;
  // 영문 짧은 토큰(oil, fed 등)은 너무 남발 → 3글자 이상
  if (!isHangulHeavy(needle) && needle.length < 3) return false;
  return true;
}

function matchScore(needle: string): number {
  let score = needle.length * 10;
  if (isHangulHeavy(needle)) score += 55;
  if (needle.includes(" ") || needle.includes("·")) score += 20;
  return score;
}

/** 가장 구체적인 매칭 1건 — 없으면 null */
export function resolveEconomyArticleFlyTarget(
  title: string,
  summary?: string | null,
): EconomyArticleFlyTarget | null {
  const blob = `${title} ${summary ?? ""}`.toLowerCase();
  if (!blob.trim()) return null;

  let best: { place: PlaceAlias; score: number } | null = null;
  for (const place of ALL_PLACES) {
    for (const key of place.keys) {
      const needle = key.trim().toLowerCase();
      if (!keyUsable(needle)) continue;
      if (!blob.includes(needle)) continue;
      const score = matchScore(needle);
      if (!best || score > best.score) {
        best = { place, score };
      }
    }
  }
  if (!best) return null;
  return {
    kind: "coords",
    lat: best.place.lat,
    lng: best.place.lng,
    altitude: best.place.altitude,
    label: best.place.label,
  };
}
