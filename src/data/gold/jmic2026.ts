/**
 * JMIC Advisory Note 001-26 Update 074 (2026-03-01 ~ 07-21)의 「확인된 해상 보안 사건」 표.
 * 출처: https://www.ukmto.org/-/media/ukmto/products/update-074-jmic-advisory-note-21-july.pdf
 *
 * ref = UKMTO 사건 번호(2026년). 우리 D1의 ukmto_incidents.incident_number 와 같은 번호 체계로 보인다
 * (실서버 2026-08-24 사건이 120번). 번호로 맞추면 선명·좌표 없이도 정확하다.
 * vessel=null 은 JMIC가 선명을 가린(UFN) 줄.
 *
 * 쓰임: 우리 UKMTO 적재가 빠뜨린 번호가 없는지(적재 완전성), 가려진 DB 줄에 JMIC가 이름을 아는지.
 * 주의: JMIC 표는 UKMTO와 같은 뿌리라 「적재가 완전한가」를 보는 것이지 「피격 판정이 맞는가」를 보는 게 아니다.
 * 웹 문서를 요약 도구로 옮긴 것이라 번호·날짜 오류 가능성이 있다. 표에 없는 번호(014, 019, 027, 033~035, 044~047, 049, 051, 061, 072~073, 075, 095~)는
 * 이 업데이트에 안 실렸거나 옮기다 빠진 것이다.
 */
export type JmicRow = {
  ref: number;
  date: string;
  vessel: string | null;
  type: string;
  event: string;
  location: string;
};

export const JMIC_2026: readonly JmicRow[] = [
  { ref: 4, date: "2026-03-01", vessel: "SKYLIGHT", type: "Tanker", event: "Attack", location: "Strait of Hormuz" },
  { ref: 5, date: "2026-03-01", vessel: "HERCULES STAR", type: "Tanker", event: "Attack", location: "Strait of Hormuz" },
  { ref: 6, date: "2026-03-01", vessel: "OCEAN ELECTRA", type: "Bulk", event: "Attack", location: "Arabian Gulf" },
  { ref: 7, date: "2026-03-01", vessel: "MKD VYOM", type: "Tanker", event: "Attack", location: "Gulf of Oman" },
  { ref: 8, date: "2026-03-01", vessel: "STENA IMPERATIVE", type: "Tanker", event: "Attack", location: "Bahrain" },
  { ref: 9, date: "2026-03-03", vessel: "PELAGIA", type: "Bulk", event: "Near miss", location: "Gulf of Oman" },
  { ref: 10, date: "2026-03-03", vessel: "GOLD OAK", type: "Bulk", event: "Attack", location: "Gulf of Oman" },
  { ref: 11, date: "2026-03-03", vessel: "LIBRA TRADER", type: "Tanker", event: "Attack", location: "Gulf of Oman" },
  { ref: 12, date: "2026-03-04", vessel: "SAFEEN PRESTIGE", type: "Container", event: "Attack", location: "Strait of Hormuz" },
  { ref: 13, date: "2026-03-04", vessel: "MSC GRACE", type: "Container", event: "Near miss", location: "Arabian Gulf" },
  { ref: 15, date: "2026-03-06", vessel: "MUSSAFAH 2", type: "Tug", event: "Attack", location: "Strait of Hormuz" },
  { ref: 16, date: "2026-03-07", vessel: "ARABIA III", type: "Offshore rig", event: "Attack", location: "Arabian Gulf" },
  { ref: 17, date: "2026-03-10", vessel: "GH KAHLO", type: "Bulk", event: "Near miss", location: "Arabian Gulf" },
  { ref: 18, date: "2026-03-10", vessel: "ONE MAJESTY", type: "Container", event: "Attack", location: "Arabian Gulf" },
  { ref: 20, date: "2026-03-11", vessel: "STAR GWYNETH", type: "Bulk", event: "Attack", location: "Arabian Gulf" },
  { ref: 21, date: "2026-03-11", vessel: "SAFESEA VISHNU", type: "Tanker", event: "Attack", location: "N. Arabian Gulf" },
  { ref: 22, date: "2026-03-12", vessel: "SOURCE BLESSING", type: "Container", event: "Attack", location: "Arabian Gulf" },
  { ref: 23, date: "2026-03-17", vessel: null, type: "LPG carrier", event: "Suspicious activity", location: "~23 NM off UAE" },
  { ref: 24, date: "2026-03-18", vessel: null, type: "Chemical tanker", event: "Attack", location: "11 NM off UAE" },
  { ref: 25, date: "2026-03-19", vessel: null, type: "Tug/MPSV", event: "Suspicious activity", location: "Ras Laffan anchorage" },
  { ref: 26, date: "2026-03-21", vessel: null, type: "Bulk", event: "Suspicious activity", location: "12 NM off UAE" },
  { ref: 28, date: "2026-03-30", vessel: "EXPRESS ROME", type: "Container", event: "Suspicious activity", location: "Arabian Gulf" },
  { ref: 29, date: "2026-03-30", vessel: "AL SALMI", type: "Crude tanker", event: "Suspicious activity", location: "31 NM off UAE" },
  { ref: 30, date: "2026-03-31", vessel: "AQUA 1", type: "Tanker", event: "Suspicious activity", location: "12 NM off Qatar" },
  { ref: 31, date: "2026-04-05", vessel: null, type: "Container", event: "Suspicious activity", location: "Khorfakkan" },
  { ref: 32, date: "2026-04-07", vessel: null, type: "Container", event: "Attack", location: "25 NM off Iran" },
  { ref: 36, date: "2026-04-07", vessel: null, type: "Bulk", event: "Attack", location: "112 NM SE of Ras al Hadd" },
  { ref: 37, date: "2026-04-18", vessel: null, type: "Tanker", event: "Attack", location: "20 NM NE of Oman" },
  { ref: 38, date: "2026-04-18", vessel: null, type: "Container", event: "Attack", location: "25 NM NE of Oman" },
  { ref: 39, date: "2026-04-18", vessel: null, type: "Unspecified", event: "Suspicious activity", location: "3 NM E of Oman" },
  { ref: 40, date: "2026-04-20", vessel: null, type: "Unspecified", event: "Suspicious activity", location: "Strait of Hormuz" },
  { ref: 41, date: "2026-04-22", vessel: null, type: "Container", event: "Attack", location: "15 NM from Oman" },
  { ref: 42, date: "2026-04-22", vessel: null, type: "Container", event: "Attack", location: "6 NM W of Iran" },
  { ref: 43, date: "2026-04-22", vessel: null, type: "Cargo", event: "Attack", location: "8 NM W of Iran" },
  { ref: 50, date: "2026-05-03", vessel: null, type: "Bulk", event: "Attack", location: "11 NM W of Sirik" },
  { ref: 52, date: "2026-05-03", vessel: null, type: "Tanker", event: "Attack", location: "78 NM off UAE" },
  { ref: 53, date: "2026-05-04", vessel: null, type: "Cargo", event: "Suspicious activity", location: "36 NM N of Dubai" },
  { ref: 54, date: "2026-05-04", vessel: null, type: "Tanker", event: "Attack", location: "40 NM off UAE" },
  { ref: 55, date: "2026-05-05", vessel: null, type: "Cargo", event: "Attack", location: "Strait of Hormuz off Oman" },
  { ref: 56, date: "2026-05-10", vessel: null, type: "Bulk", event: "Attack", location: "23 NM NE of Doha" },
  { ref: 57, date: "2026-05-14", vessel: null, type: "Fishery research", event: "Suspicious activity", location: "38 NM NE of Fujairah" },
  { ref: 58, date: "2026-05-14", vessel: null, type: "Livestock carrier", event: "Suspicious activity", location: "Limah Oman" },
  { ref: 59, date: "2026-05-22", vessel: null, type: "Tanker", event: "Suspicious activity", location: "98 NM N of Socotra" },
  { ref: 60, date: "2026-05-23", vessel: null, type: "Product tanker", event: "Suspicious activity", location: "200 NM W of Socotra" },
  { ref: 62, date: "2026-05-26", vessel: null, type: "Tanker", event: "Attack", location: "60 NM E of Muscat" },
  { ref: 63, date: "2026-06-01", vessel: null, type: "Cargo", event: "Attack", location: "40 NM SE of Umm Qasr" },
  { ref: 64, date: "2026-06-08", vessel: "MARIVEX", type: "Tanker", event: "Suspicious activity", location: "15 NM NE of Masirah" },
  { ref: 65, date: "2026-06-10", vessel: null, type: "Cargo", event: "Attack", location: "88 NM SW of Balhaf" },
  { ref: 66, date: "2026-06-10", vessel: "SETTEBELLO", type: "Tanker", event: "Suspicious activity", location: "20 NM NE of Sohar" },
  { ref: 67, date: "2026-06-11", vessel: "JALVEER", type: "Tanker", event: "Suspicious activity", location: "21 NM NE of Sohar" },
  { ref: 68, date: "2026-06-12", vessel: null, type: "Tanker", event: "Attack", location: "6 NM E of Oman" },
  { ref: 69, date: "2026-06-15", vessel: null, type: "Container", event: "Attack", location: "14 NM S of Yemen" },
  { ref: 70, date: "2026-06-15", vessel: null, type: "Tanker", event: "Attack", location: "111 NM SE of Aden" },
  { ref: 71, date: "2026-06-17", vessel: null, type: "Merchant", event: "Attack", location: "105 NM NE of Aden" },
  { ref: 48, date: "2026-06-21", vessel: null, type: "Product tanker", event: "Suspicious activity", location: "50 NM SE of Al-Shihr" },
  { ref: 74, date: "2026-06-25", vessel: null, type: "Container", event: "Attack", location: "7.5 NM off Oman" },
  { ref: 76, date: "2026-06-27", vessel: null, type: "Tanker", event: "Attack", location: "8 NM off Oman" },
  { ref: 77, date: "2026-07-01", vessel: null, type: "Bulk", event: "Illegal boarding", location: "76 NM S of Balhaf" },
  { ref: 78, date: "2026-07-01", vessel: null, type: "Tanker", event: "Suspicious activity", location: "85 NM S of Balhaf" },
  { ref: 79, date: "2026-07-05", vessel: null, type: "Bulk", event: "Attack", location: "30 NM SW of Al Hudaydah" },
  { ref: 80, date: "2026-07-07", vessel: null, type: "Tanker", event: "Attack", location: "8 NM E of Limah" },
  { ref: 81, date: "2026-07-07", vessel: null, type: "VLCC", event: "Attack", location: "16 NM E of Khor Fakkan" },
  { ref: 82, date: "2026-07-07", vessel: null, type: "Tanker", event: "Attack", location: "6 NM E of Musandam" },
  { ref: 83, date: "2026-07-12", vessel: "GFS GALAXY", type: "Container", event: "Attack", location: "9 NM E of Oman" },
  { ref: 84, date: "2026-07-13", vessel: null, type: "Tanker", event: "Suspicious activity", location: "50 NM S of Aden" },
  { ref: 85, date: "2026-07-13", vessel: null, type: "Chemical tanker", event: "Attack", location: "40 NM NE of Qalhat" },
  { ref: 86, date: "2026-07-13", vessel: "MOMBASA B", type: "Tanker", event: "Attack", location: "13 NM SE of Limah" },
  { ref: 87, date: "2026-07-13", vessel: "AL BAHYAH", type: "Tanker", event: "Attack", location: "13 NM SE of Limah" },
  { ref: 89, date: "2026-07-15", vessel: null, type: "Tanker", event: "Blockade enforcement", location: "Arabian Gulf" },
  { ref: 88, date: "2026-07-17", vessel: null, type: "Tanker", event: "Attack", location: "6 NM off Oman" },
  { ref: 90, date: "2026-07-17", vessel: null, type: "Tanker", event: "Hijack", location: "65 NM S of Al Mukalla" },
  { ref: 91, date: "2026-07-17", vessel: "WEN YAO", type: "Tanker", event: "Blockade enforcement", location: "Indian Ocean" },
  { ref: 92, date: "2026-07-20", vessel: null, type: "Tanker", event: "Attack", location: "8 NM NW of Kumzar" },
  { ref: 93, date: "2026-07-20", vessel: null, type: "Tanker", event: "Attack", location: "17 NM E of Dibba" },
  { ref: 94, date: "2026-07-21", vessel: null, type: "Tanker", event: "Attack", location: "6 NM off Limah" },
];
