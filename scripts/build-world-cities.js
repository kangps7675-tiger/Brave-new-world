/**
 * 세계 도시·국가 대표 도시 사전 생성 — src/lib/geo/worldCities.ts
 *
 * 입력: public/data/lite/places.json (Natural Earth 계열 populated places, t === "c")
 * 용도: 신속속보 「위치로 가기」 — 전장 사전(gazetteer)에 없는 나라의 시위·정변 지명 해석.
 * 실행: node scripts/build-world-cities.js
 *
 * 국가 대표 도시는 수도를 우선한다(아래 CAPITAL_OVERRIDE). 사전에 수도가 없으면 최대 인구 도시.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "public", "data", "lite", "places.json");
const OUT = path.join(ROOT, "src", "lib", "geo", "worldCities.ts");

const MIN_POP = 250_000;

/** 최대 인구 도시가 수도가 아닌 나라 — places.json 표기 그대로 */
const CAPITAL_OVERRIDE = {
  Brazil: "Brasilia",
  Turkey: "Ankara",
  Nigeria: "Abuja",
  Australia: "Canberra",
  Canada: "Ottawa",
  Pakistan: "Islamabad",
  India: "New Delhi",
  Tanzania: "Dodoma",
  Myanmar: "Naypyidaw",
  Kazakhstan: "Astana",
  Switzerland: "Bern",
  Vietnam: "Hanoi",
  "South Africa": "Pretoria",
  Morocco: "Rabat",
  "New Zealand": "Wellington",
  "United States of America": "Washington",
  China: "Beijing",
  Israel: "Jerusalem",
  Ukraine: "Kiev",
  Bolivia: "La Paz",
  Netherlands: "Amsterdam",
  "Sri Lanka": "Colombo",
  "Ivory Coast": "Yamoussoukro",
  Georgia: "Tbilisi",
  Kenya: "Nairobi",
};

const places = JSON.parse(fs.readFileSync(SRC, "utf8"));
const cities = places.filter((p) => p.t === "c" && Number.isFinite(p.la) && Number.isFinite(p.ln));

const round = (n) => Math.round(n * 1000) / 1000;
const byCountry = new Map();
for (const c of cities) {
  if (!byCountry.has(c.c)) byCountry.set(c.c, []);
  byCountry.get(c.c).push(c);
}

const rep = {};
for (const [country, list] of byCountry) {
  const wanted = CAPITAL_OVERRIDE[country];
  const hit = wanted && list.find((c) => c.n === wanted);
  const best = hit || [...list].sort((a, b) => (b.p || 0) - (a.p || 0))[0];
  rep[country] = [best.n, round(best.la), round(best.ln)];
}

const keep = cities
  .filter((c) => (c.p || 0) >= MIN_POP || Object.values(rep).some((r) => r[0] === c.n))
  .sort((a, b) => (b.p || 0) - (a.p || 0));

const rows = keep.map(
  (c) => `  [${JSON.stringify(c.n)}, ${JSON.stringify(c.c)}, ${round(c.la)}, ${round(c.ln)}, ${c.p || 0}],`,
);

const body = `/**
 * 세계 도시·국가 대표 도시 사전 — scripts/build-world-cities.js 로 생성. 손으로 고치지 말 것.
 * 원천: public/data/lite/places.json (인구 ${MIN_POP.toLocaleString("en-US")} 이상 + 국가 대표 도시).
 */

/** [도시, 국가, lat, lng, 인구] */
export const WORLD_CITIES: ReadonlyArray<readonly [string, string, number, number, number]> = [
${rows.join("\n")}
];

/** 국가 → [대표 도시(수도 우선), lat, lng] */
export const COUNTRY_REP_CITY: Readonly<Record<string, readonly [string, number, number]>> = ${JSON.stringify(rep, null, 2)};
`;

fs.writeFileSync(OUT, body, "utf8");
console.log(`world cities: ${keep.length} rows, ${Object.keys(rep).length} countries -> ${path.relative(ROOT, OUT)}`);
