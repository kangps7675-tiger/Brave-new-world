/** 폰 미디어쿼리 — 좁은 화면 + 터치 + hover 없음(실제 폰).
 *  터치 노트북·서피스를 창만 줄였을 때 지구본이 사라지지 않게 hover:none 필수. */
export const PHONE_QUERY =
  "(max-width: 640px) and (pointer: coarse) and (hover: none), ((pointer: coarse) and (hover: none) and (max-height: 480px))";
