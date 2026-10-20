/**
 * 세계 지명 해석 — 시위·정변·정치 혼란 속보의 「위치로 가기」용.
 *
 * 전장 사전(gazetteer)이 다루지 않는 나라(케냐·조지아·아르헨티나 …)의 도시와 국가를
 * 기사 제목·사진 설명·요약에서 찾는다. 좌표를 지어내지 않는다.
 *
 * - 도시 이름이 나오면 그 도시 (precision "city")
 * - 도시가 없고 나라만 나오면 그 나라의 대표 도시(수도 우선) — precision "country-rep".
 *   정확한 사건 지점이 아니므로 호출 쪽이 그렇게 표기해야 한다.
 * 데이터가 커서(≈66KB) 호출부는 동적 import 로 불러온다.
 */
import { COUNTRY_REP_CITY, WORLD_CITIES } from "@/lib/geo/worldCities";

/** landmark = 시험장·발사장·기지·해역처럼 이름 있는 지점(도시는 아니지만 나라 대표 도시보다 정확) */
export type WorldPlacePrecision = "city" | "landmark" | "country-rep";

/**
 * 신무기 시험·훈련 기사에 자주 나오는 이름 있는 지점.
 * 도시 사전에 없어 나라 대표 도시로 떨어지면 수천 km 어긋나므로 따로 둔다.
 * 좌표는 공개된 대표 지점(대략 중심)이며 정확한 발사대 위치가 아니다.
 */
const LANDMARKS: ReadonlyArray<{
  names: readonly string[];
  label: string;
  country: string;
  lat: number;
  lng: number;
}> = [
  { names: ["Kapustin Yar", "카푸스틴 야르", "카푸스틴야르"], label: "Kapustin Yar", country: "Russia", lat: 48.57, lng: 45.76 },
  { names: ["Plesetsk", "플레세츠크"], label: "Plesetsk", country: "Russia", lat: 62.93, lng: 40.58 },
  { names: ["Sohae", "Tongchang-ri", "Tongchang-dong", "서해위성발사장", "동창리"], label: "Sohae", country: "North Korea", lat: 39.66, lng: 124.71 },
  { names: ["Punggye-ri", "풍계리"], label: "Punggye-ri", country: "North Korea", lat: 41.28, lng: 129.08 },
  { names: ["Lop Nur", "Lop Nor", "로프노르"], label: "Lop Nur", country: "China", lat: 41.5, lng: 88.7 },
  { names: ["Jiuquan"], label: "Jiuquan", country: "China", lat: 40.96, lng: 100.29 },
  { names: ["Wenchang"], label: "Wenchang", country: "China", lat: 19.61, lng: 110.95 },
  { names: ["Taiyuan"], label: "Taiyuan", country: "China", lat: 38.85, lng: 111.61 },
  { names: ["Xichang"], label: "Xichang", country: "China", lat: 28.25, lng: 102.03 },
  { names: ["Pokhran"], label: "Pokhran", country: "India", lat: 27.1, lng: 71.8 },
  { names: ["Balasore", "Chandipur", "Abdul Kalam Island"], label: "Chandipur", country: "India", lat: 21.44, lng: 87.07 },
  { names: ["Woomera"], label: "Woomera", country: "Australia", lat: -31.15, lng: 136.8 },
  { names: ["Vandenberg"], label: "Vandenberg", country: "United States of America", lat: 34.74, lng: -120.57 },
  { names: ["Wallops"], label: "Wallops", country: "United States of America", lat: 37.94, lng: -75.47 },
  { names: ["Cape Canaveral"], label: "Cape Canaveral", country: "United States of America", lat: 28.39, lng: -80.6 },
  { names: ["White Sands"], label: "White Sands", country: "United States of America", lat: 32.38, lng: -106.48 },
  { names: ["Kwajalein"], label: "Kwajalein", country: "Marshall Islands", lat: 8.72, lng: 167.73 },
  { names: ["Guam", "괌"], label: "Guam", country: "United States of America", lat: 13.44, lng: 144.79 },
  { names: ["Diego Garcia", "디에고가르시아"], label: "Diego Garcia", country: "United Kingdom", lat: -7.31, lng: 72.41 },
  { names: ["Yellow Sea", "West Sea", "황해", "서해"], label: "Yellow Sea", country: "China", lat: 36.0, lng: 123.0 },
  { names: ["Sea of Japan", "East Sea", "일본해", "동해"], label: "Sea of Japan", country: "Japan", lat: 40.0, lng: 135.0 },
  { names: ["Taiwan Strait", "대만해협"], label: "Taiwan Strait", country: "Taiwan", lat: 24.5, lng: 119.5 },
  { names: ["South China Sea", "남중국해"], label: "South China Sea", country: "China", lat: 12.0, lng: 113.0 },
  { names: ["East China Sea", "동중국해"], label: "East China Sea", country: "China", lat: 28.0, lng: 125.0 },
  { names: ["Philippine Sea"], label: "Philippine Sea", country: "Philippines", lat: 20.0, lng: 132.0 },
  { names: ["Baltic Sea", "발트해"], label: "Baltic Sea", country: "Sweden", lat: 58.0, lng: 20.0 },
  { names: ["Black Sea", "흑해"], label: "Black Sea", country: "Ukraine", lat: 43.5, lng: 34.0 },
  { names: ["Barents Sea", "바렌츠해"], label: "Barents Sea", country: "Russia", lat: 73.0, lng: 40.0 },
  { names: ["Mediterranean", "지중해"], label: "Mediterranean", country: "Italy", lat: 35.0, lng: 18.0 },
  { names: ["Red Sea", "홍해"], label: "Red Sea", country: "Egypt", lat: 20.0, lng: 38.5 },
  { names: ["Persian Gulf", "Arabian Gulf", "페르시아만"], label: "Persian Gulf", country: "Iran", lat: 26.0, lng: 52.0 },
  { names: ["Gulf of Oman", "오만만"], label: "Gulf of Oman", country: "Oman", lat: 24.5, lng: 58.5 },
  { names: ["Arabian Sea", "아라비아해"], label: "Arabian Sea", country: "India", lat: 15.0, lng: 65.0 },
];

export type WorldPlaceHit = {
  lat: number;
  lng: number;
  /** 영문 표기 — 도시명 또는 대표 도시명 */
  label: string;
  country: string;
  precision: WorldPlacePrecision;
  /** 어느 글에서 찾았는지 — 0=첫 번째 텍스트(제목) */
  partIndex: number;
};

/** 일상 영어 단어·인명과 겹쳐 오탐이 많은 이름 */
const AMBIGUOUS_CITY = new Set([
  "Nice",
  "Reading",
  "Split",
  "Mobile",
  "Orange",
  "Aurora",
  "Phoenix",
  "Charlotte",
  "Victoria",
  "Georgetown",
  "Hamilton",
  "Columbia",
  "Jackson",
  "Lincoln",
  "Salem",
  "Granada",
  "Santiago",
  "Valencia",
  "Cordoba",
  "Birmingham",
]);

/**
 * "Washington said …"처럼 정부·정치 세력을 가리키는 환유로 자주 쓰이는 이름.
 * 다른 후보가 없을 때만 쓴다.
 */
const METONYM_CITY = new Set(["Washington", "Moscow", "Beijing", "Brussels", "London", "Paris"]);

/** 사전 표기와 기사 표기가 다른 도시 */
const CITY_ALIAS: Record<string, string> = {
  Kyiv: "Kiev",
  Lviv: "Lvov",
  Odesa: "Odessa",
  Kharkov: "Kharkiv",
  Rangoon: "Yangon",
  Saigon: "Ho Chi Minh City",
  Chattogram: "Chittagong",
  Peking: "Beijing",
  Bombay: "Mumbai",
  Calcutta: "Kolkata",
  Madras: "Chennai",
  Bangalore: "Bengaluru",
  "Mexico City": "Mexico City",
  "Washington, D.C.": "Washington",
  "Washington D.C.": "Washington",
  "Sao Paulo": "Sao Paulo",
  "São Paulo": "Sao Paulo",
  Brasília: "Brasilia",
  Bogotá: "Bogota",
  Yaoundé: "Yaounde",
  Nairobi: "Nairobi",
};

/** 기사 표기 → 사전 국가명 */
const COUNTRY_ALIAS: Record<string, string> = {
  "United States": "United States of America",
  "U.S.": "United States of America",
  US: "United States of America",
  USA: "United States of America",
  America: "United States of America",
  UK: "United Kingdom",
  "U.K.": "United Kingdom",
  Britain: "United Kingdom",
  England: "United Kingdom",
  "Czech Republic": "Czechia",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  Burma: "Myanmar",
  Türkiye: "Turkey",
  Turkiye: "Turkey",
  UAE: "United Arab Emirates",
  "DR Congo": "Congo (Kinshasa)",
  DRC: "Congo (Kinshasa)",
  "Democratic Republic of the Congo": "Congo (Kinshasa)",
  "Republic of the Congo": "Congo (Brazzaville)",
  Swaziland: "eSwatini",
  Eswatini: "eSwatini",
  Bahamas: "The Bahamas",
  Gambia: "The Gambia",
  "East Timor": "East Timor",
  "Timor-Leste": "East Timor",
  "Hong Kong": "Hong Kong S.A.R.",
  "Cape Verde": "Cape Verde",
  "Palestinian territories": "Palestine",
  Czechia: "Czechia",
};

/** 시위·정변 기사에 흔한 형용사형 → 국가 */
const DEMONYM: Record<string, string> = {
  Kenyan: "Kenya",
  Georgian: "Georgia",
  Serbian: "Serbia",
  Argentine: "Argentina",
  Argentinian: "Argentina",
  Brazilian: "Brazil",
  Peruvian: "Peru",
  Colombian: "Colombia",
  Ecuadorian: "Ecuador",
  Bolivian: "Bolivia",
  Venezuelan: "Venezuela",
  Chilean: "Chile",
  Iranian: "Iran",
  Iraqi: "Iraq",
  Lebanese: "Lebanon",
  Syrian: "Syria",
  Turkish: "Turkey",
  Egyptian: "Egypt",
  Nigerian: "Nigeria",
  Ugandan: "Uganda",
  Ghanaian: "Ghana",
  Senegalese: "Senegal",
  Malian: "Mali",
  Sudanese: "Sudan",
  Ethiopian: "Ethiopia",
  Pakistani: "Pakistan",
  Bangladeshi: "Bangladesh",
  Indian: "India",
  Nepali: "Nepal",
  Nepalese: "Nepal",
  Indonesian: "Indonesia",
  Thai: "Thailand",
  Filipino: "Philippines",
  Cambodian: "Cambodia",
  Mongolian: "Mongolia",
  Kazakh: "Kazakhstan",
  Kyrgyz: "Kyrgyzstan",
  Armenian: "Armenia",
  Azerbaijani: "Azerbaijan",
  Moldovan: "Moldova",
  Belarusian: "Belarus",
  Hungarian: "Hungary",
  Slovak: "Slovakia",
  Polish: "Poland",
  Romanian: "Romania",
  Bulgarian: "Bulgaria",
  Greek: "Greece",
  Albanian: "Albania",
  Bosnian: "Bosnia and Herzegovina",
  French: "France",
  German: "Germany",
  British: "United Kingdom",
  Spanish: "Spain",
  Italian: "Italy",
  Dutch: "Netherlands",
  Belgian: "Belgium",
  Portuguese: "Portugal",
  Mexican: "Mexico",
  Cuban: "Cuba",
  Haitian: "Haiti",
  Honduran: "Honduras",
  Guatemalan: "Guatemala",
  Panamanian: "Panama",
  Israeli: "Israel",
  Palestinian: "Palestine",
  Jordanian: "Jordan",
  Tunisian: "Tunisia",
  Algerian: "Algeria",
  Libyan: "Libya",
  Moroccan: "Morocco",
  Cameroonian: "Cameroon",
  Zimbabwean: "Zimbabwe",
  Zambian: "Zambia",
  Mozambican: "Mozambique",
  Angolan: "Angola",
  Togolese: "Togo",
  Guinean: "Guinea",
  Burkinabe: "Burkina Faso",
  Burmese: "Myanmar",
  "Sri Lankan": "Sri Lanka",
  Taiwanese: "Taiwan",
  Japanese: "Japan",
  Russian: "Russia",
  Ukrainian: "Ukraine",
  Chinese: "China",
  Afghan: "Afghanistan",
  Yemeni: "Yemen",
  Somali: "Somalia",
};

type CityRow = {
  name: string;
  country: string;
  lat: number;
  lng: number;
  pop: number;
};

let cityIndex: CityRow[] | null = null;
let cityByName: Map<string, CityRow> | null = null;

function cities(): CityRow[] {
  if (cityIndex) return cityIndex;
  cityIndex = WORLD_CITIES.map(([name, country, lat, lng, pop]) => ({
    name,
    country,
    lat,
    lng,
    pop,
  }));
  cityByName = new Map();
  for (const row of cityIndex) {
    const prev = cityByName.get(row.name);
    if (!prev || row.pop > prev.pop) cityByName.set(row.name, row);
  }
  return cityIndex;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 대문자로 시작하는 고유명사로서의 단어 경계 매칭 (대소문자 구분) */
function findWord(text: string, word: string): number {
  if (!word || !text.includes(word)) return -1;
  // 한글 이름은 "동해에서"처럼 조사가 붙어 단어 경계가 없다 — 포함 위치를 쓴다
  if (/[가-힣]/.test(word)) return text.indexOf(word);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(word)}(?![\\p{L}\\p{N}])`, "u");
  const m = re.exec(text);
  return m ? m.index : -1;
}

const LOCATIVE_BEFORE =
  /\b(?:in|at|near|outside|across|around|from|of|to|into|throughout|streets of|capital)\s+(?:the\s+)?$/i;
const METONYM_VERB_AFTER =
  /^\s+(?:said|says|has|have|will|is|was|warned|condemned|denied|accused|announced|urged|called|insisted|vowed|rejected)\b/i;

function mentionScore(text: string, index: number, length: number): number {
  let score = 0;
  const before = text.slice(Math.max(0, index - 24), index);
  if (LOCATIVE_BEFORE.test(before)) score += 2;
  const after = text.slice(index + length, index + length + 24);
  if (METONYM_VERB_AFTER.test(after)) score -= 3;
  return score;
}

type Candidate = { row: CityRow; index: number; score: number; metonym: boolean };

function bestCityIn(text: string): Candidate | null {
  cities();
  const candidates: Candidate[] = [];
  const consider = (display: string, rowName: string) => {
    const row = cityByName!.get(rowName);
    if (!row) return;
    if (AMBIGUOUS_CITY.has(rowName)) return;
    const idx = findWord(text, display);
    if (idx < 0) return;
    candidates.push({
      row,
      index: idx,
      score: mentionScore(text, idx, display.length),
      metonym: METONYM_CITY.has(rowName),
    });
  };
  for (const row of cityIndex!) consider(row.name, row.name);
  for (const [alias, canonical] of Object.entries(CITY_ALIAS)) consider(alias, canonical);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (a.metonym !== b.metonym) return a.metonym ? 1 : -1;
    if (a.score !== b.score) return b.score - a.score;
    if (a.index !== b.index) return a.index - b.index;
    return b.row.pop - a.row.pop;
  });
  return candidates[0] ?? null;
}

function bestLandmarkIn(
  text: string,
): { entry: (typeof LANDMARKS)[number]; index: number; score: number } | null {
  let best: { entry: (typeof LANDMARKS)[number]; index: number; score: number } | null = null;
  for (const entry of LANDMARKS) {
    for (const name of entry.names) {
      const idx = findWord(text, name);
      if (idx < 0) continue;
      const score = mentionScore(text, idx, name.length);
      if (!best || score > best.score || (score === best.score && idx < best.index)) {
        best = { entry, index: idx, score };
      }
    }
  }
  return best;
}

function bestCountryIn(text: string): { country: string; index: number } | null {
  let best: { country: string; index: number; score: number } | null = null;
  const consider = (display: string, country: string) => {
    if (!COUNTRY_REP_CITY[country]) return;
    const idx = findWord(text, display);
    if (idx < 0) return;
    const score = mentionScore(text, idx, display.length);
    if (
      !best ||
      score > best.score ||
      (score === best.score && idx < best.index)
    ) {
      best = { country, index: idx, score };
    }
  };
  for (const country of Object.keys(COUNTRY_REP_CITY)) consider(country, country);
  for (const [alias, country] of Object.entries(COUNTRY_ALIAS)) consider(alias, country);
  for (const [demonym, country] of Object.entries(DEMONYM)) {
    consider(demonym, country);
  }
  return best;
}

/**
 * 여러 글(우선순위 순: 제목 → 사진 설명 → 요약 …)에서 위치 하나.
 * 도시가 어느 글에든 있으면 그것이 나라만 있는 경우보다 우선한다.
 */
export function resolveWorldPlace(
  parts: ReadonlyArray<string | null | undefined>,
): WorldPlaceHit | null {
  const texts = parts.map((p) => (p ?? "").replace(/\s+/g, " ").trim());

  // 1) 도시·이름 있는 지점 — 비환유 우선, 앞선 글 우선
  let metonymFallback: WorldPlaceHit | null = null;
  for (let i = 0; i < texts.length; i += 1) {
    const text = texts[i]!;
    if (!text) continue;
    const hit = bestCityIn(text);
    const landmark = bestLandmarkIn(text);
    // 시험장·해역이 도시보다 앞서 나오거나 도시가 없으면 지점을 쓴다
    if (landmark && (!hit || hit.metonym || landmark.score > hit.score || (landmark.score === hit.score && landmark.index < hit.index))) {
      return {
        lat: landmark.entry.lat,
        lng: landmark.entry.lng,
        label: landmark.entry.label,
        country: landmark.entry.country,
        precision: "landmark",
        partIndex: i,
      };
    }
    if (!hit) continue;
    const place: WorldPlaceHit = {
      lat: hit.row.lat,
      lng: hit.row.lng,
      label: hit.row.name,
      country: hit.row.country,
      precision: "city",
      partIndex: i,
    };
    if (!hit.metonym) return place;
    metonymFallback ??= place;
  }

  // 2) 나라 → 대표 도시
  for (let i = 0; i < texts.length; i += 1) {
    const text = texts[i]!;
    if (!text) continue;
    const hit = bestCountryIn(text);
    if (!hit) continue;
    const rep = COUNTRY_REP_CITY[hit.country];
    if (!rep) continue;
    return {
      lat: rep[1],
      lng: rep[2],
      label: rep[0],
      country: hit.country,
      precision: "country-rep",
      partIndex: i,
    };
  }

  return metonymFallback;
}
