/**
 * 대만해협 진행형 분쟁 — 11대 분쟁사와 같은 6하원칙 + 고정 타임라인 시드.
 * living entries는 cron/API가 날짜별로 이어붙인다.
 */

export const TAIWAN_STRAIT_CONFLICT_ID = "taiwan-strait" as const;

export type LivingSixW = {
  whoKo: string;
  whoEn: string;
  whatKo: string;
  whatEn: string;
  whenKo: string;
  whenEn: string;
  whereKo: string;
  whereEn: string;
  whyKo: string;
  whyEn: string;
  howKo: string;
  howEn: string;
};

export type LivingFixedStage = {
  id: string;
  order: number;
  yearLabel: string;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  /** [lng, lat] */
  coordinates: readonly [number, number];
};

export type LivingTimelineEntry = {
  id: string;
  conflictId: typeof TAIWAN_STRAIT_CONFLICT_ID;
  entryDate: string;
  headlineKo: string;
  headlineEn: string;
  sourceUrls: string[];
  createdAt: string;
};

export type LivingConflictDoc = {
  id: typeof TAIWAN_STRAIT_CONFLICT_ID;
  titleKo: string;
  titleEn: string;
  /** fly / ENTRY_GATE와 맞춤 */
  center: { lat: number; lng: number };
  altitude: number;
  sixW: LivingSixW;
  stages: LivingFixedStage[];
  /** UI 완결용 시드 (cron 전에도 「어제 이후」가 비지 않게) */
  seedLivingEntries: LivingTimelineEntry[];
};

export const TAIWAN_STRAIT_LIVING: LivingConflictDoc = {
  id: TAIWAN_STRAIT_CONFLICT_ID,
  titleKo: "대만해협 · 진행형",
  titleEn: "Taiwan Strait · Living",
  center: { lat: 24.48, lng: 119.5 },
  altitude: 1.05,
  sixW: {
    whoKo: "중화인민공화국(PLA·해경·민병)과 중화민국(대만) 군·해순, 미국·동맹의 억제·순찰 관여.",
    whoEn:
      "PRC (PLA, coast guard, maritime militia) and ROC (Taiwan) forces; US/ally deterrence and patrols.",
    whatKo: "대만해협·주변 공해·ADIZ에서의 군사 활동, 외교 압박, 회색지대 해상 대치가 일상화된 진행형 긴장.",
    whatEn:
      "Ongoing tension: military activity, diplomatic pressure, and gray-zone maritime stand-offs in and around the Taiwan Strait and ADIZ.",
    whenKo: "2016년 이후 교차 해협 긴장 상시화. 2022년 펠로시 방문 이후 대규모 연습·봉쇄 시나리오가 반복.",
    whenEn:
      "Cross-strait tension elevated since 2016; large exercises and blockade-style drills recur after the 2022 Pelosi visit.",
    whereKo: "대만해협 중심(약 24.5°N, 119.5°E) · 대만 ADIZ · 남·동중국해 인접 항로.",
    whereEn:
      "Taiwan Strait (~24.5°N, 119.5°E), Taiwan ADIZ, and adjacent East/South China Sea routes.",
    whyKo: "통일/현상유지 목표 충돌, 반도체·항로 전략 가치, 미·중 경쟁이 해협 군사 신호로 표출.",
    whyEn:
      "Conflicting status-quo vs reunification goals, chip/sealane stakes, and US–China rivalry expressed as military signaling.",
    howKo: "항모·구축함 통과, ADIZ 침입, 합동연습, 해경·민병 압박, 외교·제재 레토릭이 병행.",
    howEn:
      "Carrier/destroyer transits, ADIZ incursions, joint drills, coast-guard/militia pressure, plus diplomatic and sanctions rhetoric.",
  },
  stages: [
    {
      id: "tw-1996",
      order: 1,
      yearLabel: "1995–96",
      titleKo: "제3차 대만해협 위기",
      titleEn: "Third Taiwan Strait Crisis",
      bodyKo: "미사일 시험·미 항모 전개로 해협 위기가 세계 이슈가 됨.",
      bodyEn: "Missile tests and US carrier deployments made the strait a global flashpoint.",
      coordinates: [120.2, 24.0],
    },
    {
      id: "tw-2016",
      order: 2,
      yearLabel: "2016",
      titleKo: "차이잉원 정부 · 교류 냉각",
      titleEn: "Tsai administration · cooling ties",
      bodyKo: "공식 교류 채널이 축소되고 군사·외교 신호가 상시화되기 시작.",
      bodyEn: "Official channels narrowed; military and diplomatic signaling became more routine.",
      coordinates: [121.5, 25.0],
    },
    {
      id: "tw-2022",
      order: 3,
      yearLabel: "2022",
      titleKo: "펠로시 방문 이후 대규모 연습",
      titleEn: "Post-Pelosi large-scale drills",
      bodyKo: "봉쇄·포위형 합동연습과 미사일 발사가 반복되며 ‘신정상’ 논의가 확산.",
      bodyEn: "Blockade-style joint drills and missile launches fueled a ‘new normal’ debate.",
      coordinates: [119.8, 23.8],
    },
    {
      id: "tw-2024",
      order: 4,
      yearLabel: "2024",
      titleKo: "대선·취임 국면의 압박",
      titleEn: "Election/inauguration pressure",
      bodyKo: "정치 일정에 맞춘 군사·정보·외교 압박이 동시에 강화된 구간.",
      bodyEn: "Military, information, and diplomatic pressure synchronized with political calendars.",
      coordinates: [121.0, 24.5],
    },
    {
      id: "tw-living",
      order: 5,
      yearLabel: "지금",
      titleKo: "진행형 · 매일 갱신",
      titleEn: "Living · daily updates",
      bodyKo: "아래 「어제 이후」에 GDELT 등 공개 신호로 뽑은 변화가 이어붙습니다.",
      bodyEn: "「Since yesterday」 below appends curated public-signal changes (e.g. GDELT).",
      coordinates: [119.5, 24.48],
    },
  ],
  seedLivingEntries: [
    {
      id: "taiwan-strait-seed-2026-07-17",
      conflictId: TAIWAN_STRAIT_CONFLICT_ID,
      entryDate: "2026-07-17",
      headlineKo: "해협·주변 해역에서 중국군 활동·대만 대응 보도가 연이어 집계됨 (자동 요약).",
      headlineEn:
        "Clustered reports of PRC activity and Taiwan responses around the strait (auto summary).",
      sourceUrls: [],
      createdAt: "2026-07-17T12:00:00.000Z",
    },
    {
      id: "taiwan-strait-seed-2026-07-18",
      conflictId: TAIWAN_STRAIT_CONFLICT_ID,
      entryDate: "2026-07-18",
      headlineKo: "ADIZ·해협 관련 외교·군사 멘션이 전일 대비 증가한 날이 포착됨 (자동 요약).",
      headlineEn:
        "Elevated ADIZ/strait diplomatic–military mentions vs prior day (auto summary).",
      sourceUrls: [],
      createdAt: "2026-07-18T12:00:00.000Z",
    },
  ],
};

export function livingConflictById(id: string): LivingConflictDoc | null {
  if (id === TAIWAN_STRAIT_CONFLICT_ID || id === "taiwan") return TAIWAN_STRAIT_LIVING;
  return null;
}
