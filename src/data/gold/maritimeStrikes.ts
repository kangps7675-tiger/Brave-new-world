/**
 * 해상 피격 정답 리스트 — 「확인 / 유력」 판정의 정확도를 재는 기준표.
 *
 * 규칙
 * - 공개 기록(언론·UN·IMO 문서)으로 확인되는 사건만 넣는다. 기억으로 채우지 않는다.
 * - 출처 URL이 없는 줄은 넣지 않는다.
 * - reviewed=false 는 초안이다. 필성이 출처를 열어 선명·날짜를 확인하면 true로 바꾼다.
 *   정밀도·재현율은 reviewed=true 인 줄만으로 계산한다 (maritimeGold.ts).
 * - date 는 출처가 일까지 적었으면 YYYY-MM-DD, 월까지만 적었으면 YYYY-MM.
 *
 * 목표: 2023-11 이후 후티 홍해 피격 30~50건 (product-decision-2026-10-16). 지금은 씨앗 8건.
 */
export type GoldOutcome = "hit" | "sunk" | "seized" | "missed";

export type GoldStrike = {
  id: string;
  vessel: string;
  flag: string | null;
  /** YYYY-MM-DD 또는 YYYY-MM */
  date: string;
  place: string;
  outcome: GoldOutcome;
  sourceUrl: string;
  reviewed: boolean;
};

const GCAPTAIN = "https://gcaptain.com/list-notable-houthi-attacks-on-merchant-ships-in-the-red-sea/";

export const MARITIME_GOLD: readonly GoldStrike[] = [
  { id: "g-2023-11-galaxy-leader", vessel: "Galaxy Leader", flag: "Bahamas", date: "2023-11", place: "international waters, Red Sea", outcome: "seized", sourceUrl: GCAPTAIN, reviewed: false },
  { id: "g-2024-01-zografia", vessel: "Zografia", flag: null, date: "2024-01", place: "off Saleef, Yemen", outcome: "hit", sourceUrl: GCAPTAIN, reviewed: false },
  { id: "g-2024-02-rubymar", vessel: "Rubymar", flag: null, date: "2024-02", place: "Red Sea", outcome: "sunk", sourceUrl: GCAPTAIN, reviewed: false },
  { id: "g-2024-03-true-confidence", vessel: "True Confidence", flag: "Barbados", date: "2024-03", place: "~50 nm off Aden, Yemen", outcome: "hit", sourceUrl: GCAPTAIN, reviewed: false },
  { id: "g-2024-06-tutor", vessel: "Tutor", flag: null, date: "2024-06", place: "near Hodeidah, Yemen", outcome: "sunk", sourceUrl: GCAPTAIN, reviewed: false },
  { id: "g-2024-08-21-sounion", vessel: "Sounion", flag: "Greece", date: "2024-08-21", place: "Red Sea", outcome: "hit", sourceUrl: GCAPTAIN, reviewed: false },
  { id: "g-2025-07-06-magic-seas", vessel: "Magic Seas", flag: "Liberia", date: "2025-07-06", place: "Red Sea", outcome: "sunk", sourceUrl: GCAPTAIN, reviewed: false },
  { id: "g-2025-07-09-eternity-c", vessel: "Eternity C", flag: "Liberia", date: "2025-07-09", place: "Red Sea", outcome: "sunk", sourceUrl: GCAPTAIN, reviewed: false },
];
