/**
 * 하이브리드전 사건 분류 — Liveuamap 속보와 RSS 뉴스 공용.
 *
 * 하이브리드전 = 전면전이 아닌 방식의 압박: 영공·국경 침범 드론, GPS 교란, 사보타주,
 * 사이버, 해저 인프라 훼손, 풍선, 해상 회색지대, 정보전.
 *
 * 구역(zone)
 *  - ce-europe : 중부-동부유럽 + 발트 3국 (폴란드·발트·체코·슬로바키아·헝가리·루마니아·불가리아·몰도바·벨라루스·발칸 …)
 *  - europe    : 유럽 (영국·프랑스·독일·베네룩스·이베리아·이탈리아·그리스 …)
 *  - n-europe  : 북유럽 (핀란드·스웨덴·노르웨이·덴마크·아이슬란드 · 발트해)
 *  - asia      : 대만·한반도·일본·남중국해
 *  - world     : 그 밖의 전 세계 — 사보타주만 여기까지 본다
 *
 * 사보타주는 기관(정보기관·국가 후원 세력)의 도발이 의심되는 인프라 파괴를 전 세계에서 잡는다.
 * 기관 지목이 글에 있으면 `agency` 를 켠다 — 확정이 아니라 보도된 의심이다.
 * 텍스트 신호가 반드시 있어야 하고, 좌표만으로는 분류하지 않는다.
 */

import type { LiveuamapEvent } from "@/lib/liveuamap/types";

export type HybridKind =
  | "airspace-incursion"
  | "gps-jamming"
  | "sabotage"
  | "cyber"
  | "undersea-cable"
  | "balloon"
  | "gray-zone-sea"
  | "disinformation";

export type HybridZone = "ce-europe" | "europe" | "n-europe" | "asia" | "world";

export type HybridIncident = {
  kind: HybridKind;
  zone: HybridZone;
  /** 유럽 구역일 때 글에서 확인된 나라 (영문) */
  country?: string;
  /** 기관·국가 후원 세력의 소행이 보도에서 의심·지목됨 */
  agency?: boolean;
};

type HybridText = Pick<
  LiveuamapEvent,
  "title" | "body" | "titleKo" | "bodyKo" | "tags" | "lat" | "lng"
>;

export const HYBRID_TAG = "hybrid";
export const HYBRID_AGENCY_TAG = "hybrid-agency";
export const hybridKindTag = (kind: HybridKind) => `hybrid:${kind}`;
export const hybridZoneTag = (zone: HybridZone) => `hybrid-zone:${zone}`;

// ── 수단 ────────────────────────────────────────────────────────────

const AIRSPACE_RE =
  /\b(?:airspace|border|frontier)\b[^.]{0,60}\b(?:violat\w*|breach\w*|intru\w*|incursion|crossed?|enter(?:ed|s)?|entered|penetrat\w*)\b|\b(?:violat\w*|breach\w*|intru\w*|incursion|crossed?|enter(?:ed|s)?|penetrat\w*)\b[^.]{0,60}\b(?:airspace|border)\b|\bdrones?\b[^.]{0,50}\b(?:fell|crash(?:ed)?|landed|found|entered|violat\w*|spotted|sighted|over)\b[^.]{0,40}\b(?:airport|airbase|base|Poland|Polish|Lithuania|Latvia|Estonia|Romania|Moldova|Slovakia|Finland|Denmark|Germany|Norway|Sweden)\b|영공\s*(?:침범|침입|위반)|국경\s*(?:침범|침입)|드론\s*(?:추락|진입|침투|목격)/i;

const GPS_RE =
  /\b(?:gps|gnss)\s?(?:jamm\w*|spoof\w*|interfer\w*|disrupt\w*)\b|\bjamming\b|\bspoofing\b|GPS\s*(?:교란|재밍|전파\s*방해)|전파\s*교란/i;

/** 사보타주 수단 — 방화·철도 파괴·소포 폭발물·시설 파괴 */
const SABOTAGE_RE =
  /\b(?:sabotage[ds]?|sabotaging|saboteurs?|arson|set\s?(?:on\s?)?fire|set\s?ablaze|incendiary\s?(?:device|parcel|package)s?|(?:rail(?:way)?|track|signal)\s?(?:line\s?)?(?:blast|explosion|sabotage|damaged|cut)|(?:blast|explosion)\s?(?:on|at|near)\s?(?:the\s?)?(?:rail(?:way)?|pipeline|substation|power\s?(?:line|plant)|telecom|bridge)|deliberate(?:ly)?\s?(?:damag\w*|cut|set)|suspected\s?(?:arson|sabotage))\b|사보타주|방화|철도\s*(?:폭발|파괴|훼손)|소포\s*(?:폭발|발화)|고의\s*(?:파손|훼손)/i;

/** 사보타주가 인프라·산업 시설을 겨냥했다는 맥락 — 일상적 은유("그의 캠페인을 방해")를 거른다 */
const INFRA_CONTEXT_RE =
  /\b(?:rail(?:way)?|train|track|signal|pipeline|power|grid|substation|pylon|transformer|cable|telecom|tower|bridge|airport|airbase|port|harbou?r|factory|plant|depot|warehouse|logistics|parcel|dhl|ups|fedex|shopping\s?centre|mall|dam|water\s?(?:supply|plant)|refiner(?:y|ies)|arms|ammunition|defen[cs]e|military|base|data\s?cent(?:er|re)|satellite|ship|vessel|tanker)\b|철도|열차|송전|변전|파이프라인|통신|케이블|공항|항만|공장|물류|창고|소포|방산|군수|탄약|군사|기지|데이터\s*센터|발전소/i;

const CYBER_RE =
  /\b(?:cyber\s?-?attack\w*|ddos|ransomware|hack(?:ed|ers?|ing)?|data\s?breach|malware)\b|사이버\s*공격|해킹|디도스/i;

const CABLE_RE =
  /\b(?:undersea|submarine|subsea|seabed)\s?(?:cable|pipeline|power\s?line)s?\b[^.]{0,60}\b(?:cut|damag\w*|sever\w*|break|broken|anchor|dragged)\b|해저\s*(?:케이블|파이프라인)/i;

const BALLOON_RE =
  /\b(?:trash|garbage|waste)\s?balloons?\b|\bballoons?\b[^.]{0,40}\b(?:border|DMZ|airspace|launched|drifted)\b|오물\s*풍선|쓰레기\s*풍선|풍선\s*(?:살포|부양)/i;

const GRAY_SEA_RE =
  /\b(?:coast\s?guard|maritime\s?militia|water\s?cannon\w*|ADIZ|air\s?defen[cs]e\s?identification\s?zone|median\s?line|scarborough|second\s?thomas|senkaku|blockade\s?drill|encircl\w*|joint\s?combat\s?readiness|rammed|harass\w*)\b|해경|해상\s*민병대|물대포|방공식별구역|중간선|센카쿠|스카버러|세컨드\s*토마스/i;

const DISINFO_RE =
  /\b(?:disinformation|propaganda\s?campaign|influence\s?operation|fake\s?news\s?campaign|deepfake)\b|허위\s*정보|가짜\s*뉴스|여론\s*조작/i;

// ── 기원·기관 지목 ───────────────────────────────────────────────────

const RUSSIA_ORIGIN_RE =
  /\b(?:russia\w*|belarus\w*|shahed|geran|gerbera|lukashenko|kaliningrad)\b|러시아|벨라루스|샤헤드|게란/i;

/**
 * 기관·국가 후원 소행 지목 — 정보기관 이름, "국가 후원", 외국 요원, 텔레그램 모집 대리인.
 * 의심 보도도 잡는다(suspected/alleged/linked to 포함). 확정 표현이 아니다.
 */
const AGENCY_RE =
  /\b(?:GRU|FSB|SVR|KGB|MSS|MOIS|IRGC|RGB|Mossad|intelligence\s?(?:agenc\w*|service\w*|officers?|operatives?)|state[\s-]?(?:sponsored|backed|linked|directed)|foreign\s?(?:agents?|intelligence|state)|(?:hired|recruited|paid|tasked|directed)\s?(?:via|through|by|on)\s?(?:telegram|russia\w*|chin\w*|iran\w*|north\s?korea\w*|foreign)|proxy\s?(?:actors?|agents?|saboteurs?)|hybrid\s?(?:attack|campaign|war\w*)|disposable\s?agents?|on\s?behalf\s?of\s?(?:russia|china|iran|north\s?korea|a\s?foreign))\b|정보\s*(?:기관|당국)|국가\s*(?:후원|배후)|배후에\s*(?:러시아|중국|이란|북한)|(?:러시아|중국|이란|북한)\s*(?:정보|요원|배후|소행)|공작원|하이브리드\s*(?:공격|전)/i;

// ── 구역: 나라 이름 ──────────────────────────────────────────────────

type ZoneCountry = { re: RegExp; name: string; zone: HybridZone };

const c = (re: RegExp, name: string, zone: HybridZone): ZoneCountry => ({ re, name, zone });

const ZONE_COUNTRIES: readonly ZoneCountry[] = [
  // 북유럽 — 노르딕 + 발트
  c(/\bFinland\b|\bFinnish\b|핀란드/i, "Finland", "n-europe"),
  c(/\bSweden\b|\bSwedish\b|스웨덴/i, "Sweden", "n-europe"),
  c(/\bNorway\b|\bNorwegian\b|노르웨이/i, "Norway", "n-europe"),
  c(/\bDenmark\b|\bDanish\b|덴마크/i, "Denmark", "n-europe"),
  c(/\bIceland\w*\b|아이슬란드/i, "Iceland", "n-europe"),
  // 발트 3국은 동부유럽과 한 묶음 — 발트해보다 먼저 판정해 "에스토니아 앞바다"가 북유럽으로 새지 않게 한다
  c(/\bEstonia\w*\b|에스토니아/i, "Estonia", "ce-europe"),
  c(/\bLatvia\w*\b|라트비아/i, "Latvia", "ce-europe"),
  c(/\bLithuania\w*\b|리투아니아/i, "Lithuania", "ce-europe"),
  c(/\bBaltic\s?Sea\b|\bGotland\b|\bBornholm\b|\bÅland\b|\bAland\b|발트해/i, "Baltic Sea", "n-europe"),
  // 중부-동부유럽
  c(/\bPoland\b|\bPolish\b|폴란드/i, "Poland", "ce-europe"),
  c(/\bCzech\w*\b|체코/i, "Czechia", "ce-europe"),
  c(/\bSlovakia\w*\b|\bSlovak\b|슬로바키아/i, "Slovakia", "ce-europe"),
  c(/\bHungary\b|\bHungarian\b|헝가리/i, "Hungary", "ce-europe"),
  c(/\bRomania\w*\b|루마니아/i, "Romania", "ce-europe"),
  c(/\bBulgaria\w*\b|불가리아/i, "Bulgaria", "ce-europe"),
  c(/\bMoldova\w*\b|몰도바/i, "Moldova", "ce-europe"),
  c(/\bBelarus\w*\b|벨라루스/i, "Belarus", "ce-europe"),
  c(/\bSerbia\w*\b|세르비아/i, "Serbia", "ce-europe"),
  c(/\bCroatia\w*\b|크로아티아/i, "Croatia", "ce-europe"),
  c(/\bSlovenia\w*\b|슬로베니아/i, "Slovenia", "ce-europe"),
  c(/\bBosnia\w*\b|보스니아/i, "Bosnia", "ce-europe"),
  c(/\bAlbania\w*\b|알바니아/i, "Albania", "ce-europe"),
  c(/\bMontenegro\b|몬테네그로/i, "Montenegro", "ce-europe"),
  c(/\bKosovo\b|코소보/i, "Kosovo", "ce-europe"),
  c(/\bNorth\s?Macedonia\b|북마케도니아/i, "North Macedonia", "ce-europe"),
  // 유럽
  c(/\bGermany\b|\bGerman\b|독일/i, "Germany", "europe"),
  c(/\bFrance\b|\bFrench\b|프랑스/i, "France", "europe"),
  c(/\bUnited\s?Kingdom\b|\bBritain\b|\bBritish\b|\bUK\b|\bEngland\b|\bScotland\b|영국/i, "United Kingdom", "europe"),
  c(/\bIreland\b|\bIrish\b|아일랜드/i, "Ireland", "europe"),
  c(/\bNetherlands\b|\bDutch\b|네덜란드/i, "Netherlands", "europe"),
  c(/\bBelgium\b|\bBelgian\b|벨기에/i, "Belgium", "europe"),
  c(/\bLuxembourg\b|룩셈부르크/i, "Luxembourg", "europe"),
  c(/\bSpain\b|\bSpanish\b|스페인/i, "Spain", "europe"),
  c(/\bPortugal\b|\bPortuguese\b|포르투갈/i, "Portugal", "europe"),
  c(/\bItaly\b|\bItalian\b|이탈리아/i, "Italy", "europe"),
  c(/\bAustria\w*\b|오스트리아/i, "Austria", "europe"),
  c(/\bSwitzerland\b|\bSwiss\b|스위스/i, "Switzerland", "europe"),
  c(/\bGreece\b|\bGreek\b|그리스/i, "Greece", "europe"),
  c(/\bCyprus\b|키프로스/i, "Cyprus", "europe"),
  c(/\bMalta\b|몰타/i, "Malta", "europe"),
];

/** 유럽 구역 대략 좌표 상자 — 글에 나라가 없을 때의 보조. 겹치면 단정하지 않는다 */
const ZONE_BOXES: ReadonlyArray<{
  zone: HybridZone;
  country?: string;
  south: number;
  north: number;
  west: number;
  east: number;
}> = [
  { zone: "ce-europe", country: "Estonia", south: 57.5, north: 59.7, west: 21.7, east: 28.2 },
  { zone: "ce-europe", country: "Latvia", south: 55.7, north: 57.8, west: 20.9, east: 28.3 },
  { zone: "ce-europe", country: "Lithuania", south: 53.9, north: 56.5, west: 20.9, east: 26.9 },
  { zone: "n-europe", country: "Finland", south: 59.8, north: 70.1, west: 20.5, east: 31.6 },
  // 스웨덴·노르웨이는 상자가 핀란드·발트와 겹쳐 오판이 커서 두지 않는다 (글의 나라·도시 이름으로만 판정)
  { zone: "n-europe", country: "Denmark", south: 54.5, north: 57.8, west: 8.0, east: 15.2 },
  { zone: "ce-europe", country: "Poland", south: 49.0, north: 54.9, west: 14.1, east: 24.2 },
  { zone: "ce-europe", country: "Romania", south: 43.6, north: 48.3, west: 20.2, east: 29.8 },
  { zone: "ce-europe", country: "Slovakia", south: 47.7, north: 49.7, west: 16.8, east: 22.6 },
  { zone: "europe", country: "Germany", south: 47.3, north: 55.0, west: 5.9, east: 15.0 },
  { zone: "europe", country: "France", south: 42.3, north: 51.1, west: -4.8, east: 8.2 },
  { zone: "europe", country: "United Kingdom", south: 49.9, north: 60.9, west: -8.2, east: 1.8 },
];

const ASIA_PLACE_RE =
  /\b(?:Taiwan\w*|PLA\b|Taiwan\s?Strait|South\s?China\s?Sea|East\s?China\s?Sea|Philippin\w*|Japan\w*|Okinawa|Senkaku|Korea\w*|DMZ|Pyongyang|Seoul|Scarborough|Spratly|Paracel|Hong\s?Kong)\b|대만|중국|일본|한국|북한|필리핀|남중국해|동중국해|한반도/i;

// ── 헬퍼 ────────────────────────────────────────────────────────────

function textBlob(event: HybridText): string {
  return [event.title, event.body, event.titleKo, event.bodyKo, ...(event.tags ?? [])]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join("\n");
}

/**
 * 기사에 나라 대신 도시만 나오는 경우("코펜하겐 공항 드론", "바르샤바 물류창고 방화")를 위한 대표 도시.
 * 나라 이름이 있으면 그쪽이 우선한다.
 */
const ZONE_CITIES: ReadonlyArray<{ names: readonly string[]; country: string; zone: HybridZone }> = [
  { names: ["Helsinki", "헬싱키"], country: "Finland", zone: "n-europe" },
  { names: ["Stockholm", "Gothenburg", "스톡홀름"], country: "Sweden", zone: "n-europe" },
  { names: ["Oslo", "Bergen", "오슬로"], country: "Norway", zone: "n-europe" },
  { names: ["Copenhagen", "Aalborg", "코펜하겐"], country: "Denmark", zone: "n-europe" },
  { names: ["Reykjavik", "레이캬비크"], country: "Iceland", zone: "n-europe" },
  { names: ["Tallinn", "탈린"], country: "Estonia", zone: "ce-europe" },
  { names: ["Riga", "리가"], country: "Latvia", zone: "ce-europe" },
  { names: ["Vilnius", "빌뉴스"], country: "Lithuania", zone: "ce-europe" },
  { names: ["Warsaw", "Gdansk", "Krakow", "Rzeszow", "바르샤바"], country: "Poland", zone: "ce-europe" },
  { names: ["Prague", "프라하"], country: "Czechia", zone: "ce-europe" },
  { names: ["Bratislava", "브라티슬라바"], country: "Slovakia", zone: "ce-europe" },
  { names: ["Budapest", "부다페스트"], country: "Hungary", zone: "ce-europe" },
  { names: ["Bucharest", "부쿠레슈티"], country: "Romania", zone: "ce-europe" },
  { names: ["Sofia", "소피아"], country: "Bulgaria", zone: "ce-europe" },
  { names: ["Chisinau", "키시너우"], country: "Moldova", zone: "ce-europe" },
  { names: ["Minsk", "민스크"], country: "Belarus", zone: "ce-europe" },
  { names: ["Belgrade", "베오그라드"], country: "Serbia", zone: "ce-europe" },
  { names: ["Berlin", "Hamburg", "Munich", "Frankfurt", "베를린"], country: "Germany", zone: "europe" },
  { names: ["Paris", "Marseille", "Lyon", "파리"], country: "France", zone: "europe" },
  { names: ["London", "Manchester", "런던"], country: "United Kingdom", zone: "europe" },
  { names: ["Dublin", "더블린"], country: "Ireland", zone: "europe" },
  { names: ["Amsterdam", "Rotterdam", "암스테르담"], country: "Netherlands", zone: "europe" },
  { names: ["Brussels", "Antwerp", "브뤼셀"], country: "Belgium", zone: "europe" },
  { names: ["Madrid", "Barcelona", "마드리드"], country: "Spain", zone: "europe" },
  { names: ["Lisbon", "리스본"], country: "Portugal", zone: "europe" },
  { names: ["Rome", "Milan", "로마"], country: "Italy", zone: "europe" },
  { names: ["Vienna", "빈"], country: "Austria", zone: "europe" },
  { names: ["Zurich", "Geneva", "취리히"], country: "Switzerland", zone: "europe" },
  { names: ["Athens", "아테네"], country: "Greece", zone: "europe" },
];

function cityPattern(name: string): RegExp {
  // 영문은 단어 경계, 한글은 포함 여부 (조사가 붙는다)
  return /[a-z]/i.test(name)
    ? new RegExp(`\\b${name}\\b`)
    : new RegExp(name);
}

function countryByName(text: string): ZoneCountry | undefined {
  for (const entry of ZONE_COUNTRIES) {
    if (entry.re.test(text)) return entry;
  }
  for (const city of ZONE_CITIES) {
    if (city.names.some((n) => cityPattern(n).test(text))) {
      return { re: /$^/, name: city.country, zone: city.zone };
    }
  }
  return undefined;
}

/** 좌표 상자 — 정확히 하나일 때만 나라를 말한다. 여러 상자(국경 지대)면 구역만 */
function boxZone(
  lat: number,
  lng: number,
): { zone: HybridZone; country?: string } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const hits = ZONE_BOXES.filter(
    (b) => lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east,
  );
  if (hits.length === 0) return null;
  const zones = new Set(hits.map((h) => h.zone));
  if (hits.length === 1) return { zone: hits[0]!.zone, country: hits[0]!.country };
  return { zone: zones.size === 1 ? hits[0]!.zone : "europe", country: undefined };
}

function pickKind(text: string): HybridKind | null {
  // 구체적인 수단부터 — 영공 침범이 가장 마지막 포괄 항목
  if (CABLE_RE.test(text)) return "undersea-cable";
  if (BALLOON_RE.test(text)) return "balloon";
  if (GPS_RE.test(text)) return "gps-jamming";
  if (SABOTAGE_RE.test(text) && INFRA_CONTEXT_RE.test(text)) return "sabotage";
  if (CYBER_RE.test(text)) return "cyber";
  if (DISINFO_RE.test(text)) return "disinformation";
  if (AIRSPACE_RE.test(text)) return "airspace-incursion";
  if (GRAY_SEA_RE.test(text)) return "gray-zone-sea";
  return null;
}

/**
 * 하이브리드전 사건이면 종류·구역을, 아니면 null.
 *  - 사보타주: 전 세계. 구역은 글의 나라 → 좌표 상자(나토 맥락 없이도) → 아시아 지명 → world.
 *  - 그 밖의 수단: 유럽 3구역은 (러시아·벨라루스 기원 | 영공 침범) + 나라 이름 또는 나토 맥락+좌표,
 *    아시아는 아시아 지명.
 */
export function classifyHybridIncident(event: HybridText): HybridIncident | null {
  const text = textBlob(event);
  if (!text.trim()) return null;
  const kind = pickKind(text);
  if (!kind) return null;

  const lat = event.lat;
  const lng = event.lng;
  const agency = AGENCY_RE.test(text) || undefined;
  const named = countryByName(text);
  const origin = RUSSIA_ORIGIN_RE.test(text);
  const natoContext = /NATO|나토/i.test(text);

  // 사보타주 — 전 세계
  if (kind === "sabotage") {
    if (named) return { kind, zone: named.zone, country: named.name, agency };
    const box = boxZone(lat, lng);
    if (box && (origin || natoContext || agency)) {
      return { kind, zone: box.zone, country: box.country, agency };
    }
    if (ASIA_PLACE_RE.test(text)) return { kind, zone: "asia", agency };
    return { kind, zone: "world", agency };
  }

  // 유럽 3구역
  if (named || natoContext) {
    let zone: HybridZone | undefined = named?.zone;
    let country: string | undefined = named?.name;
    if (!named) {
      const box = boxZone(lat, lng);
      zone = box?.zone;
      country = box?.country;
    }
    if (zone && (kind === "airspace-incursion" || origin || agency)) {
      return { kind, zone, country, agency };
    }
  }

  if (ASIA_PLACE_RE.test(text)) {
    return { kind, zone: "asia", agency };
  }

  return null;
}

// ── 태그 ────────────────────────────────────────────────────────────

/** 이벤트 태그에 하이브리드 표지를 더한다 (이미 있으면 그대로). */
export function withHybridTags(tags: string[], incident: HybridIncident | null): string[] {
  if (!incident) return tags;
  const add = [HYBRID_TAG, hybridKindTag(incident.kind), hybridZoneTag(incident.zone)];
  if (incident.agency) add.push(HYBRID_AGENCY_TAG);
  const out = [...tags];
  for (const t of add) if (!out.includes(t)) out.push(t);
  return out;
}

export function isHybridEvent(event: Pick<LiveuamapEvent, "tags">): boolean {
  return (event.tags ?? []).includes(HYBRID_TAG);
}

export function hybridAgencyOf(event: Pick<LiveuamapEvent, "tags">): boolean {
  return (event.tags ?? []).includes(HYBRID_AGENCY_TAG);
}

/** 예전 저장분("nato-east"·"other")을 새 구역 이름으로 읽는다 */
export function hybridZoneOf(event: Pick<LiveuamapEvent, "tags">): HybridZone | null {
  const tag = (event.tags ?? []).find((t) => t.startsWith("hybrid-zone:"));
  if (!tag) return null;
  const zone = tag.slice("hybrid-zone:".length);
  if (zone === "nato-east") return "ce-europe";
  if (zone === "other") return "world";
  return zone === "ce-europe" ||
    zone === "europe" ||
    zone === "n-europe" ||
    zone === "asia" ||
    zone === "world"
    ? zone
    : null;
}

export function hybridKindOf(event: Pick<LiveuamapEvent, "tags">): HybridKind | null {
  const tag = (event.tags ?? []).find(
    (t) => t.startsWith("hybrid:") && t.length > "hybrid:".length,
  );
  return tag ? (tag.slice("hybrid:".length) as HybridKind) : null;
}

// ── 표기 ────────────────────────────────────────────────────────────

const KIND_LABEL_KO: Record<HybridKind, string> = {
  "airspace-incursion": "영공·국경 침범",
  "gps-jamming": "GPS 교란",
  sabotage: "사보타주",
  cyber: "사이버 공격",
  "undersea-cable": "해저 인프라 훼손",
  balloon: "풍선 살포",
  "gray-zone-sea": "해상 회색지대 압박",
  disinformation: "정보전·허위정보",
};

const KIND_LABEL_EN: Record<HybridKind, string> = {
  "airspace-incursion": "airspace / border incursion",
  "gps-jamming": "GPS jamming",
  sabotage: "sabotage",
  cyber: "cyber attack",
  "undersea-cable": "undersea infrastructure damage",
  balloon: "balloon launches",
  "gray-zone-sea": "maritime gray-zone pressure",
  disinformation: "disinformation",
};

export const HYBRID_ZONE_LABEL_KO: Record<HybridZone, string> = {
  "ce-europe": "중부-동부유럽(발트 포함)",
  europe: "유럽",
  "n-europe": "북유럽",
  asia: "아시아",
  world: "전 세계",
};

export const HYBRID_ZONE_LABEL_EN: Record<HybridZone, string> = {
  "ce-europe": "Central-Eastern Europe (incl. Baltics)",
  europe: "Europe",
  "n-europe": "Northern Europe",
  asia: "Asia",
  world: "Worldwide",
};

/**
 * 구역 주시 순위 — 숫자가 클수록 먼저.
 * 현재 정세 판단(위험도 순): 우크라이나 → 이란 → 중동 → 동유럽(발트 3국 포함 중부-동부유럽).
 * (우크라이나·이란·중동은 이 분류 바깥의 본 전장이라 여기엔 없다.) 사건 수가 상한을 넘을 때
 * 핀·큐에서 밀려나지 않게 하는 용도이며, 사건의 사실 여부와는 무관하다.
 */
export const HYBRID_ZONE_PRIORITY: Record<HybridZone, number> = {
  "ce-europe": 5,
  "n-europe": 4,
  asia: 3,
  europe: 2,
  world: 1,
};

export function hybridKindLabel(kind: HybridKind, lang: "ko" | "en"): string {
  return lang === "en" ? KIND_LABEL_EN[kind] : KIND_LABEL_KO[kind];
}

/** 양피지·카드에 붙일 한 줄 — 단정하지 않고 분류 근거만 */
export function hybridNote(
  event: Pick<LiveuamapEvent, "tags">,
  lang: "ko" | "en",
): string | null {
  const kind = hybridKindOf(event);
  if (!kind) return null;
  const zone = hybridZoneOf(event) ?? "world";
  const agency = hybridAgencyOf(event);
  if (lang === "en") {
    return (
      `Hybrid warfare · ${HYBRID_ZONE_LABEL_EN[zone]} · ${KIND_LABEL_EN[kind]}` +
      (agency ? " · state or intelligence-agency involvement suspected in the report" : "") +
      " (auto-classified from the report text — verify at source)."
    );
  }
  return (
    `하이브리드전 · ${HYBRID_ZONE_LABEL_KO[zone]} · ${KIND_LABEL_KO[kind]}` +
    (agency ? " · 보도에서 기관·국가 후원 세력 개입이 의심됨" : "") +
    " — 속보 문구 기준 자동 분류이며 출처 확인이 필요합니다."
  );
}
