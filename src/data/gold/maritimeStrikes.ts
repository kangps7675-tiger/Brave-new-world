/**
 * 해상 피격 정답 리스트 — 「확인 / 유력」 판정의 정확도를 재는 기준표.
 *
 * 규칙
 * - 공개 기록으로 확인되는 사건만 넣는다. 기억으로 채우지 않는다. 출처 URL이 없는 줄은 넣지 않는다.
 * - 배에 실제 영향이 있었던 것(나포·명중·침몰·피해)만 넣는다. 빗나감·요격·후티 주장만 있는 건은 뺀다.
 * - 출처가 서로 어긋나는 건(Pollux: 위키 「피해」 / 윌슨센터 「명중 없음」)은 뺐다.
 * - sourceUrls가 2개 이상이면 교차 확인된 줄이다. 그래도 reviewed=false 는 초안이다.
 *   필성이 출처를 열어 선명·날짜를 확인하면 true로 바꾼다. 점수는 reviewed=true 만 쓴다
 *   (초안까지 보고 싶으면 평가 스크립트에 --include-draft).
 * - 날짜는 출처마다 하루 어긋나기도 한다(Strinda 12-11/12-12, Eternity C 07-07/07-09). 비교는 ±2일 허용.
 * - 이 표는 후티 홍해·아덴만 사건이다. 호르무즈·흑해는 아직 없다.
 *
 * 출처 요약은 웹 페이지를 요약 도구로 읽어 옮긴 것이라 옮기다 틀렸을 수 있다. 그래서 reviewed=false.
 */
export type GoldOutcome = "hit" | "damaged" | "sunk" | "seized";

export type GoldStrike = {
  id: string;
  vessel: string;
  flag: string | null;
  /** YYYY-MM-DD 또는 YYYY-MM */
  date: string;
  place: string;
  outcome: GoldOutcome;
  sourceUrls: readonly string[];
  reviewed: boolean;
};

const W = "https://en.wikipedia.org/wiki/Houthi_attacks_on_commercial_vessels";
const WC = "https://www.wilsoncenter.org/article/timeline-houthi-attacks";
const GC = "https://gcaptain.com/list-notable-houthi-attacks-on-merchant-ships-in-the-red-sea/";

export const MARITIME_GOLD: readonly GoldStrike[] = [
  { id: "g-2023-11-19-galaxy-leader", vessel: "Galaxy Leader", flag: "Bahamas", date: "2023-11-19", place: "Red Sea", outcome: "seized", sourceUrls: [W, WC, GC], reviewed: false },
  { id: "g-2023-11-24-cma-cgm-symi", vessel: "CMA CGM Symi", flag: "Malta", date: "2023-11-24", place: "Indian Ocean", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2023-11-26-central-park", vessel: "Central Park", flag: "Liberia", date: "2023-11-26", place: "Gulf of Aden", outcome: "seized", sourceUrls: [W], reviewed: false },
  { id: "g-2023-12-03-number-9", vessel: "Number 9", flag: "Panama", date: "2023-12-03", place: "Bab el-Mandeb", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2023-12-03-sophie-ii", vessel: "Sophie II", flag: "Panama", date: "2023-12-03", place: "Bab el-Mandeb", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2023-12-03-unity-explorer", vessel: "Unity Explorer", flag: "Bahamas", date: "2023-12-03", place: "Bab el-Mandeb", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2023-12-12-strinda", vessel: "Strinda", flag: "Norway", date: "2023-12-12", place: "Bab el-Mandeb", outcome: "hit", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2023-12-15-al-jasrah", vessel: "Al-Jasrah", flag: "Liberia", date: "2023-12-15", place: "Bab el-Mandeb", outcome: "hit", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2023-12-18-swan-atlantic", vessel: "Swan Atlantic", flag: "Norway", date: "2023-12-18", place: "Red Sea near Mocha", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2023-12-30-maersk-hangzhou", vessel: "Maersk Hangzhou", flag: "Singapore", date: "2023-12-30", place: "Red Sea", outcome: "hit", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-01-15-gibraltar-eagle", vessel: "Gibraltar Eagle", flag: "Marshall Islands", date: "2024-01-15", place: "Red Sea", outcome: "hit", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-01-16-zografia", vessel: "Zografia", flag: "Malta", date: "2024-01-16", place: "Red Sea", outcome: "hit", sourceUrls: [W, WC, GC], reviewed: false },
  { id: "g-2024-01-17-genco-picardy", vessel: "Genco Picardy", flag: "Marshall Islands", date: "2024-01-17", place: "Gulf of Aden", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-01-26-marlin-luanda", vessel: "Marlin Luanda", flag: "Marshall Islands", date: "2024-01-26", place: "Gulf of Aden", outcome: "hit", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-02-06-morning-tide", vessel: "Morning Tide", flag: "Barbados", date: "2024-02-06", place: "Red Sea", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2024-02-12-star-iris", vessel: "Star Iris", flag: "Marshall Islands", date: "2024-02-12", place: "south of Bab el-Mandeb", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-02-18-rubymar", vessel: "Rubymar", flag: "Belize", date: "2024-02-18", place: "Bab el-Mandeb", outcome: "sunk", sourceUrls: [W, WC, GC], reviewed: false },
  { id: "g-2024-02-19-sea-champion", vessel: "Sea Champion", flag: "Greece", date: "2024-02-19", place: "east of Aden", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-02-19-navis-fortuna", vessel: "Navis Fortuna", flag: "Marshall Islands", date: "2024-02-19", place: "east of Aden", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-02-22-islander", vessel: "Islander", flag: "Palau", date: "2024-02-22", place: "Red Sea", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-03-06-true-confidence", vessel: "True Confidence", flag: "Barbados", date: "2024-03-06", place: "Gulf of Aden", outcome: "hit", sourceUrls: [W, WC, GC], reviewed: false },
  { id: "g-2024-03-24-huang-pu", vessel: "Huang Pu", flag: "Panama", date: "2024-03-24", place: "en route to New Mangalore", outcome: "hit", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-04-26-andromeda-star", vessel: "Andromeda Star", flag: "Panama", date: "2024-04-26", place: "SW of Mokha", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-04-29-cyclades", vessel: "Cyclades", flag: "Malta", date: "2024-04-29", place: "Red Sea", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2024-04-29-msc-orion", vessel: "MSC Orion", flag: "Portugal", date: "2024-04-29", place: "Arabian Sea", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2024-05-18-wind", vessel: "Wind", flag: "Panama", date: "2024-05-18", place: "off Mokha", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-05-28-laax", vessel: "Laax", flag: "Marshall Islands", date: "2024-05-28", place: "Red Sea", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-06-08-msc-tavvishi", vessel: "MSC Tavvishi", flag: "Liberia", date: "2024-06-08", place: "Gulf of Aden", outcome: "hit", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-06-08-norderney", vessel: "Norderney", flag: "Antigua and Barbuda", date: "2024-06-08", place: "Gulf of Aden", outcome: "hit", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-06-12-tutor", vessel: "Tutor", flag: "Liberia", date: "2024-06-12", place: "Red Sea near Al Hudaydah", outcome: "sunk", sourceUrls: [W, WC, GC], reviewed: false },
  { id: "g-2024-06-13-verbena", vessel: "Verbena", flag: "Palau", date: "2024-06-13", place: "Gulf of Aden", outcome: "hit", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-06-23-transworld-navigator", vessel: "Transworld Navigator", flag: "Liberia", date: "2024-06-23", place: "Red Sea", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-07-15-bentley-i", vessel: "Bentley I", flag: "Panama", date: "2024-07-15", place: "Red Sea", outcome: "hit", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-07-15-chios-lion", vessel: "Chios Lion", flag: "Liberia", date: "2024-07-15", place: "NW of Al Hudaydah", outcome: "damaged", sourceUrls: [W, WC], reviewed: false },
  { id: "g-2024-07-19-lobivia", vessel: "Lobivia", flag: "Singapore", date: "2024-07-19", place: "Gulf of Aden", outcome: "hit", sourceUrls: [W], reviewed: false },
  { id: "g-2024-07-20-pumba", vessel: "Pumba", flag: "Liberia", date: "2024-07-20", place: "near Mokha", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2024-08-03-groton", vessel: "Groton", flag: "Liberia", date: "2024-08-03", place: "east of Aden", outcome: "hit", sourceUrls: [W], reviewed: false },
  { id: "g-2024-08-13-delta-atlantica", vessel: "Delta Atlantica", flag: "Liberia", date: "2024-08-13", place: "Red Sea", outcome: "hit", sourceUrls: [W], reviewed: false },
  { id: "g-2024-08-21-sounion", vessel: "Sounion", flag: "Greece", date: "2024-08-21", place: "west of Al Hudaydah", outcome: "hit", sourceUrls: [W, GC], reviewed: false },
  { id: "g-2024-08-21-sw-north-wind-i", vessel: "SW North Wind I", flag: "Panama", date: "2024-08-21", place: "near Aden", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2024-09-02-blue-lagoon-i", vessel: "Blue Lagoon I", flag: "Panama", date: "2024-09-02", place: "NW of As-Salif", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2024-10-01-cordelia-moon", vessel: "Cordelia Moon", flag: "Panama", date: "2024-10-01", place: "NW of Al Hudaydah", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2024-10-01-minoan-courage", vessel: "Minoan Courage", flag: "Liberia", date: "2024-10-01", place: "NW of Al Hudaydah", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2024-10-10-olympic-spirit", vessel: "Olympic Spirit", flag: "Liberia", date: "2024-10-10", place: "near Al Hudaydah", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2024-12-05-isa-star", vessel: "ISA Star", flag: "Panama", date: "2024-12-05", place: "NW of Al Hudaydah", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2025-07-06-magic-seas", vessel: "Magic Seas", flag: "Liberia", date: "2025-07-06", place: "near Al Hudaydah", outcome: "sunk", sourceUrls: [W, GC], reviewed: false },
  { id: "g-2025-07-07-eternity-c", vessel: "Eternity C", flag: "Liberia", date: "2025-07-07", place: "near Al Hudaydah", outcome: "sunk", sourceUrls: [W, GC], reviewed: false },
  { id: "g-2025-09-29-minervagracht", vessel: "Minervagracht", flag: "Netherlands", date: "2025-09-29", place: "Gulf of Aden", outcome: "hit", sourceUrls: [W], reviewed: false },
  { id: "g-2026-07-22-encelia", vessel: "Encelia", flag: "Saudi Arabia", date: "2026-07-22", place: "Red Sea SW of Al Shuqaiq", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2026-07-24-ncc-masa", vessel: "NCC Masa", flag: "Saudi Arabia", date: "2026-07-24", place: "Red Sea", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2026-07-28-ncc-ghazal", vessel: "NCC Ghazal", flag: "Saudi Arabia", date: "2026-07-28", place: "Red Sea", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2026-08-04-faize-noore-oliya", vessel: "Faize Noore Oliya", flag: "India", date: "2026-08-04", place: "Yemeni waters", outcome: "sunk", sourceUrls: [W], reviewed: false },
  { id: "g-2026-08-05-daisy", vessel: "Daisy", flag: "Dominica", date: "2026-08-05", place: "Gulf of Aden", outcome: "damaged", sourceUrls: [W], reviewed: false },
  { id: "g-2026-08-11-tihamah", vessel: "Tihamah", flag: "Tanzania", date: "2026-08-11", place: "Bab el-Mandeb", outcome: "damaged", sourceUrls: [W], reviewed: false },
];
