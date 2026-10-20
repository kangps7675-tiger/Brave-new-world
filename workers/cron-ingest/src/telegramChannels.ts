/**
 * Public Telegram channels — cron 워커 로컬 카피 (앱 src/data/telegramChannels.ts 와 동기화).
 * 워커는 `@/` alias·app 번들을 못 쓰므로 username/label/region 최소 필드만 유지한다.
 * 색상 등 표시 메타는 앱이 username으로 다시 매핑한다.
 */

export type TelegramTheater = "middle-east" | "ukraine";
export type TelegramRegion = "middle-east" | "ukraine" | "global";

export type WorkerTelegramChannel = {
  username: string;
  label: string;
  theater: TelegramTheater;
};

const MIDDLE_EAST: WorkerTelegramChannel[] = [
  { username: "IDFofficial", label: "IDF Official", theater: "middle-east" },
  { username: "RocketAlert", label: "Rocket Alert", theater: "middle-east" },
  { username: "Alertisrael", label: "Alert Israel", theater: "middle-east" },
  { username: "TimesofIsrael", label: "Times of Israel", theater: "middle-east" },
  { username: "AbuAliExpress", label: "Abu Ali Express", theater: "middle-east" },
  { username: "OSINTdefender", label: "OSINT Defender", theater: "middle-east" },
  { username: "warfareanalysis", label: "Warfare Analysis", theater: "middle-east" },
  { username: "rnintel", label: "RN Intel", theater: "middle-east" },
  { username: "GeoPWatch", label: "GeoPol Watch", theater: "middle-east" },
  { username: "middle_east_spectator", label: "ME Spectator", theater: "middle-east" },
  { username: "Middle_East_Spectator", label: "ME Spectator 2", theater: "middle-east" },
  { username: "HAMASW", label: "Hamas-Israel War", theater: "middle-east" },
  { username: "PressTV", label: "PressTV (Iran)", theater: "middle-east" },
  { username: "iranintl_en", label: "Iran International", theater: "middle-east" },
  { username: "FarsNews_EN", label: "Fars News", theater: "middle-east" },
  { username: "TasnimNewsEN", label: "Tasnim News", theater: "middle-east" },
  { username: "SaberinFa", label: "Saberin (IRGC)", theater: "middle-east" },
  { username: "defapress_ir", label: "DefaPress (Iran MOD)", theater: "middle-east" },
  { username: "sepah", label: "IRGC Official", theater: "middle-east" },
  { username: "FotrosResistancee", label: "Fotros Resistance", theater: "middle-east" },
  { username: "QudsNen", label: "Quds News", theater: "middle-east" },
  { username: "Alsaa_plus_EN", label: "Al-Saa EN", theater: "middle-east" },
  { username: "thecradlemedia", label: "The Cradle", theater: "middle-east" },
  { username: "dropsitenews", label: "Drop Site News", theater: "middle-east" },
  { username: "france24_en", label: "France 24", theater: "middle-east" },
  { username: "wamnews_en", label: "WAM (UAE)", theater: "middle-east" },
  { username: "gulfnewsUAE", label: "Gulf News (UAE)", theater: "middle-east" },
  { username: "Alibk3", label: "Ali Bk", theater: "middle-east" },
  { username: "aljazeeraglobal", label: "Al Jazeera", theater: "middle-east" },
  { username: "bintjbeilnews", label: "Bint Jbeil", theater: "middle-east" },
  { username: "kianmeli1", label: "Kian Meli (Iran)", theater: "middle-east" },
];

const UKRAINE: WorkerTelegramChannel[] = [
  { username: "GeneralStaffZSU", label: "UA General Staff", theater: "ukraine" },
  { username: "kpszsu", label: "UA Air Force", theater: "ukraine" },
  { username: "V_Zelenskiy_official", label: "Zelensky Official", theater: "ukraine" },
  { username: "operativnoZSU", label: "Operatyvno ZSU", theater: "ukraine" },
  { username: "UkraineNow", label: "Ukraine NOW", theater: "ukraine" },
  { username: "KyivIndependent_official", label: "Kyiv Independent", theater: "ukraine" },
  { username: "ukrpravda_news", label: "Ukrainska Pravda", theater: "ukraine" },
  { username: "uniannet", label: "UNIAN", theater: "ukraine" },
  { username: "suspilnenews", label: "Suspilne", theater: "ukraine" },
  { username: "truexanewsua", label: "Trukha UA", theater: "ukraine" },
  { username: "nexta_live", label: "NEXTA", theater: "ukraine" },
  { username: "insiderUKR", label: "Insider UA", theater: "ukraine" },
  { username: "bbcukrainian", label: "BBC Ukraine", theater: "ukraine" },
  { username: "radiosvoboda", label: "Radio Svoboda", theater: "ukraine" },
  { username: "butusovplus", label: "Yuriy Butusov", theater: "ukraine" },
  { username: "ssternenko", label: "Serhii Sternenko", theater: "ukraine" },
  { username: "serhii_flash", label: "Serhii Flash", theater: "ukraine" },
  { username: "lachentyt", label: "Lachen", theater: "ukraine" },
  { username: "pravdaGerashchenko_en", label: "Anton Gerashchenko", theater: "ukraine" },
  { username: "tsaplienko", label: "Tsaplienko", theater: "ukraine" },
  { username: "motolkohelp", label: "Motolko (Belarus)", theater: "ukraine" },
  { username: "rian_ru", label: "RIA Novosti (RU)", theater: "ukraine" },
  { username: "mod_russia", label: "Russian MoD (RU)", theater: "ukraine" },
  { username: "readovkanews", label: "Readovka (RU)", theater: "ukraine" },
  { username: "wargonzo", label: "WarGonzo (RU)", theater: "ukraine" },
  { username: "rvvoenkor", label: "RV Voenkor (RU)", theater: "ukraine" },
  { username: "epoddubny", label: "Poddubny (RU)", theater: "ukraine" },
  { username: "boris_rozhin", label: "Colonel Cassad (RU)", theater: "ukraine" },
  { username: "grey_zone", label: "Grey Zone (RU)", theater: "ukraine" },
  { username: "dva_majors", label: "Two Majors (RU)", theater: "ukraine" },
  { username: "sashakots", label: "Kots (RU)", theater: "ukraine" },
  { username: "voenkorKotenok", label: "Kotenok (RU)", theater: "ukraine" },
  { username: "meduzalive", label: "Meduza (RU)", theater: "ukraine" },
  { username: "astrapress", label: "Astra (indep)", theater: "ukraine" },
  { username: "mediazzzona", label: "Mediazona", theater: "ukraine" },
  { username: "agentstvonews", label: "Agentstvo", theater: "ukraine" },
  { username: "holodmedia", label: "Holod", theater: "ukraine" },
  { username: "maximkatz", label: "Maxim Katz", theater: "ukraine" },
  { username: "DeepStateUA", label: "DeepState UA", theater: "ukraine" },
  { username: "war_monitor", label: "War Monitor", theater: "ukraine" },
  { username: "rybar", label: "Rybar (RU)", theater: "ukraine" },
];

const BY_USER = new Map<string, WorkerTelegramChannel>();
for (const ch of [...MIDDLE_EAST, ...UKRAINE]) {
  const key = ch.username.toLowerCase();
  if (!BY_USER.has(key)) BY_USER.set(key, ch);
}

export const WORKER_TELEGRAM_CHANNELS: WorkerTelegramChannel[] = Array.from(BY_USER.values());

export function regionForTheater(theater: TelegramTheater): TelegramRegion {
  return theater === "ukraine" ? "ukraine" : "middle-east";
}
