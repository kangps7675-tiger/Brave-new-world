import type { ConflictTheater } from "@/lib/conflictEvents/types";

/**
 * 전장 칩·골든 샘플 정본.
 *
 * 시급(교전·압박): 이란 > 우크라 > 대만 > 한국 > 레바논 > 시리아
 * 커버리지 공백(대단층선): 쿠릴 > 발트 > 흑해 > 캅카스 > 중앙아
 * 일본: 난세이·센카쿠·독도·동해(일본해)·서태평양 영해
 * 남중국해: 스프래틀리·파라셀·스카버러 등
 *
 * 기본 노출 12전장. 중앙아시아만 기본 OFF. 칩 0개 = 빈 화면.
 */
export const CONFLICT_THEATER_META: Record<
  ConflictTheater,
  {
    ko: string;
    en: string;
    /** 골든 샘플 목표 건수(합 ~100+) */
    goldQuota: number;
    /** 기본 칩 ON */
    defaultOn: boolean;
    /** urgency | gap | both */
    track: "urgency" | "gap" | "both";
  }
> = {
  iran: { ko: "이란", en: "Iran", goldQuota: 16, defaultOn: true, track: "urgency" },
  ukraine: { ko: "우크라이나", en: "Ukraine", goldQuota: 16, defaultOn: true, track: "urgency" },
  taiwan: { ko: "대만", en: "Taiwan", goldQuota: 12, defaultOn: true, track: "urgency" },
  korea: { ko: "한국", en: "Korea", goldQuota: 10, defaultOn: true, track: "urgency" },
  "south-china-sea": {
    ko: "남중국해",
    en: "South China Sea",
    goldQuota: 6,
    defaultOn: true,
    track: "urgency",
  },
  kuril: { ko: "쿠릴", en: "Kurils", goldQuota: 10, defaultOn: true, track: "gap" },
  baltic: { ko: "발트", en: "Baltic", goldQuota: 10, defaultOn: true, track: "gap" },
  "black-sea": { ko: "흑해", en: "Black Sea", goldQuota: 8, defaultOn: true, track: "gap" },
  lebanon: { ko: "레바논", en: "Lebanon", goldQuota: 6, defaultOn: true, track: "urgency" },
  syria: { ko: "시리아", en: "Syria", goldQuota: 4, defaultOn: true, track: "urgency" },
  japan: { ko: "일본", en: "Japan", goldQuota: 6, defaultOn: true, track: "both" },
  caucasus: { ko: "캅카스", en: "Caucasus", goldQuota: 4, defaultOn: true, track: "gap" },
  "central-asia": {
    ko: "중앙아시아",
    en: "Central Asia",
    goldQuota: 4,
    defaultOn: false,
    track: "gap",
  },
};

/** 기본 ON 전장 — 레이어 prefs·부모 토글 리셋에 사용 */
export const CONFLICT_THEATER_DEFAULT_ON: ConflictTheater[] = (
  Object.entries(CONFLICT_THEATER_META) as [ConflictTheater, (typeof CONFLICT_THEATER_META)[ConflictTheater]][]
)
  .filter(([, meta]) => meta.defaultOn)
  .map(([id]) => id);

/** 칩·필터 표시 순서 (시급·공백 반영) */
export const CONFLICT_THEATER_ORDER: ConflictTheater[] = [
  "iran",
  "ukraine",
  "taiwan",
  "korea",
  "south-china-sea",
  "kuril",
  "baltic",
  "black-sea",
  "lebanon",
  "syria",
  "japan",
  "caucasus",
  "central-asia",
];

export const CONFLICT_THEATER_PREF_KEY: Record<
  ConflictTheater,
  | "showConflictTheaterUkraine"
  | "showConflictTheaterIran"
  | "showConflictTheaterLebanon"
  | "showConflictTheaterSyria"
  | "showConflictTheaterTaiwan"
  | "showConflictTheaterKorea"
  | "showConflictTheaterSouthChinaSea"
  | "showConflictTheaterKuril"
  | "showConflictTheaterBaltic"
  | "showConflictTheaterBlackSea"
  | "showConflictTheaterJapan"
  | "showConflictTheaterCaucasus"
  | "showConflictTheaterCentralAsia"
> = {
  ukraine: "showConflictTheaterUkraine",
  iran: "showConflictTheaterIran",
  lebanon: "showConflictTheaterLebanon",
  syria: "showConflictTheaterSyria",
  taiwan: "showConflictTheaterTaiwan",
  korea: "showConflictTheaterKorea",
  "south-china-sea": "showConflictTheaterSouthChinaSea",
  kuril: "showConflictTheaterKuril",
  baltic: "showConflictTheaterBaltic",
  "black-sea": "showConflictTheaterBlackSea",
  japan: "showConflictTheaterJapan",
  caucasus: "showConflictTheaterCaucasus",
  "central-asia": "showConflictTheaterCentralAsia",
};

export const CONFLICT_THEATER_PANEL_ID: Record<ConflictTheater, string> = {
  ukraine: "conflict-theater-ukraine",
  iran: "conflict-theater-iran",
  lebanon: "conflict-theater-lebanon",
  syria: "conflict-theater-syria",
  taiwan: "conflict-theater-taiwan",
  korea: "conflict-theater-korea",
  "south-china-sea": "conflict-theater-south-china-sea",
  kuril: "conflict-theater-kuril",
  baltic: "conflict-theater-baltic",
  "black-sea": "conflict-theater-black-sea",
  japan: "conflict-theater-japan",
  caucasus: "conflict-theater-caucasus",
  "central-asia": "conflict-theater-central-asia",
};
