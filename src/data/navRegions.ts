export type RegionBBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type NavSelection = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  altitude: number;
  description: string;
  bbox: RegionBBox;
  actorCountries?: string[];
  groupId: string;
  parentLabel?: string;
  /** 반서방 축 허브 렌즈 */
  hubId?: "IRN" | "CHN" | "RUS" | "PRK";
  focusMode?: "network" | "ally" | "claim" | "arms" | "regime" | "westpac-pulse" | "disputes";
  claimId?: string;
  allyCode?: string;
};

export type NavSubItem = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  altitude: number;
  description: string;
  bbox: RegionBBox;
  actorCountries?: string[];
};

export type NavMenuItem = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  altitude: number;
  description: string;
  bbox: RegionBBox;
  actorCountries?: string[];
  subItems: NavSubItem[];
};

export type NavMenuGroup = {
  id: string;
  label: string;
  items: NavMenuItem[];
};

/** 충돌지역 순서: 대만 → 한반도 → 우크라이나 → 이란 */
export const CONFLICT_ZONE_GROUP: NavMenuGroup = {
  id: "conflict-zones",
  label: "충돌지역",
  items: [
    {
      id: "taiwan",
      label: "대만",
      lat: 22.7,
      lng: 122.9,
      /** 푸젠·대만·오키나와·루손 북부가 한 화면에 들어오는 고도 */
      altitude: 0.98,
      description: "푸젠성·대만섬·오키나와·루손 북부",
      bbox: { minLat: 18.2, maxLat: 27.2, minLng: 116.8, maxLng: 129.0 },
      subItems: [
        {
          id: "taiwan-strait",
          label: "대만해협",
          lat: 24.5,
          lng: 119.5,
          altitude: 0.78,
          description: "중국-대만 군사·외교 긴장",
          bbox: { minLat: 22, maxLat: 26, minLng: 117, maxLng: 122 },
          actorCountries: ["TWN", "CHN", "USA"],
        },
        {
          id: "spratly",
          label: "남중국해(스프래틀리)",
          lat: 10.0,
          lng: 114.5,
          altitude: 0.95,
          description: "영유권·항로 분쟁",
          bbox: { minLat: 4, maxLat: 16, minLng: 108, maxLng: 120 },
          actorCountries: ["CHN", "VNM", "PHL", "MYS"],
        },
        {
          id: "senkaku",
          label: "동중국해(센카쿠)",
          lat: 26.0,
          lng: 125.5,
          altitude: 0.88,
          description: "중일 영유권 갈등",
          bbox: { minLat: 24, maxLat: 30, minLng: 122, maxLng: 128 },
          actorCountries: ["CHN", "JPN"],
        },
      ],
    },
    {
      id: "korea",
      label: "한반도",
      lat: 38.0,
      lng: 127.3,
      /** 한반도가 뷰포트를 거의 채우는 고도 */
      altitude: 0.7,
      description: "남북 분단·DMZ·서해 분쟁",
      bbox: { minLat: 33.2, maxLat: 43.0, minLng: 124.3, maxLng: 130.8 },
      subItems: [
        {
          id: "dmz",
          label: "DMZ",
          lat: 38.0,
          lng: 127.0,
          altitude: 0.8,
          description: "남북 군사분계",
          bbox: { minLat: 37.5, maxLat: 38.5, minLng: 126, maxLng: 128 },
          actorCountries: ["KOR", "PRK"],
        },
        {
          id: "west-sea",
          label: "서해(NLL)",
          lat: 37.9,
          lng: 125.5,
          altitude: 0.82,
          description: "서해 분쟁지역",
          bbox: { minLat: 37, maxLat: 38.5, minLng: 124, maxLng: 126.5 },
          actorCountries: ["KOR", "PRK"],
        },
        {
          id: "dokdo",
          label: "독도·동해",
          lat: 37.5,
          lng: 131.9,
          altitude: 0.85,
          description: "동해 영유권",
          bbox: { minLat: 36, maxLat: 39, minLng: 130, maxLng: 133 },
          actorCountries: ["KOR", "JPN"],
        },
      ],
    },
    {
      id: "ukraine",
      label: "우크라이나",
      lat: 48.5,
      lng: 34.5,
      altitude: 1.72,
      description: "동부·남부 전선·VIINA 점령지",
      bbox: { minLat: 42, maxLat: 54, minLng: 18, maxLng: 44 },
      actorCountries: ["UKR", "RUS"],
      subItems: [
        {
          id: "ukraine-east",
          label: "동부 전선",
          lat: 48.6,
          lng: 37.8,
          altitude: 0.68,
          description: "도네츠크·루한스크·바흐무트",
          bbox: { minLat: 47.5, maxLat: 50, minLng: 36, maxLng: 39.5 },
          actorCountries: ["UKR", "RUS"],
        },
        {
          id: "ukraine-south",
          label: "남부·자포리자",
          lat: 47.4,
          lng: 35.5,
          altitude: 0.7,
          description: "자포리자·멜리토폴 축",
          bbox: { minLat: 46, maxLat: 48.5, minLng: 33, maxLng: 37 },
          actorCountries: ["UKR", "RUS"],
        },
        {
          id: "ukraine-north",
          label: "하르키우·북동",
          lat: 49.9,
          lng: 36.3,
          altitude: 0.72,
          description: "하르키우·쿠피얀스크",
          bbox: { minLat: 49, maxLat: 51, minLng: 35, maxLng: 38.5 },
          actorCountries: ["UKR", "RUS"],
        },
      ],
    },
    {
      id: "iran",
      label: "이란",
      lat: 29,
      lng: 48,
      altitude: 1.75,
      description: "중동·페르시아만·시리아",
      bbox: { minLat: 12, maxLat: 42, minLng: 32, maxLng: 66 },
      subItems: [
        {
          id: "persian-gulf",
          label: "페르시아만",
          lat: 26.5,
          lng: 52.0,
          altitude: 0.95,
          description: "해상·에너지 안보",
          bbox: { minLat: 24, maxLat: 30, minLng: 48, maxLng: 56 },
          actorCountries: ["IRN", "SAU", "USA", "IRQ"],
        },
        {
          id: "levant",
          label: "시리아·레바논",
          lat: 34.5,
          lng: 38.5,
          altitude: 0.9,
          description: "프록시·지역 전쟁",
          bbox: { minLat: 32, maxLat: 37, minLng: 34, maxLng: 42 },
          actorCountries: ["ISR", "IRN", "SYR", "LBN"],
        },
        {
          id: "hormuz",
          label: "호르무즈",
          lat: 26.8,
          lng: 56.5,
          altitude: 0.92,
          description: "해협 통행권",
          bbox: { minLat: 25, maxLat: 28, minLng: 54, maxLng: 58 },
          actorCountries: ["IRN", "USA", "OMN"],
        },
      ],
    },
  ],
};

/** 대륙간 갈등과 협력 */
export const INTERCONTINENTAL_GROUP: NavMenuGroup = {
  id: "intercontinental",
  label: "대륙간 갈등과 협력",
  items: [
    {
      id: "europe",
      label: "유럽·서부 러시아",
      lat: 50,
      lng: 15,
      altitude: 1.15,
      description: "NATO·EU·서부 러시아 완충",
      bbox: { minLat: 35, maxLat: 60, minLng: -10, maxLng: 40 },
      subItems: [
        {
          id: "nato",
          label: "NATO",
          lat: 50.8,
          lng: 4.4,
          altitude: 1.2,
          description: "북대서양조약기구 · 집단방위",
          bbox: { minLat: 36, maxLat: 62, minLng: -25, maxLng: 35 },
          actorCountries: ["USA", "GBR", "FRA", "DEU", "POL", "TUR", "NOR"],
        },
        {
          id: "eu",
          label: "EU",
          lat: 50.1,
          lng: 8.7,
          altitude: 1.25,
          description: "유럽연합 · 경제·정치 통합",
          bbox: { minLat: 36, maxLat: 58, minLng: -10, maxLng: 28 },
          actorCountries: ["DEU", "FRA", "ITA", "ESP", "POL", "NLD", "BEL"],
        },
        {
          id: "west-russia",
          label: "서부 러시아",
          lat: 55.8,
          lng: 37.6,
          altitude: 1.1,
          description: "모스크바·서부 군구",
          bbox: { minLat: 50, maxLat: 60, minLng: 28, maxLng: 45 },
          actorCountries: ["RUS", "BLR"],
        },
      ],
    },
    {
      id: "middle-east",
      label: "중동",
      lat: 29.2,
      lng: 42.5,
      altitude: 1.35,
      description: "걸프·레반트·이란 전역",
      bbox: { minLat: 10, maxLat: 42, minLng: 28, maxLng: 66 },
      subItems: [
        {
          id: "gulf",
          label: "걸프·페르시아만",
          lat: 26,
          lng: 51,
          altitude: 1.0,
          description: "GCC·에너지·해상로",
          bbox: { minLat: 22, maxLat: 32, minLng: 46, maxLng: 58 },
          actorCountries: ["SAU", "ARE", "QAT", "IRN", "IRQ"],
        },
        {
          id: "israel-iran",
          label: "이스라엘·이란",
          lat: 31.5,
          lng: 48,
          altitude: 0.95,
          description: "프록시·핵·미사일 갈등",
          bbox: { minLat: 29, maxLat: 35, minLng: 44, maxLng: 54 },
          actorCountries: ["ISR", "IRN", "USA"],
        },
        {
          id: "yemen-red-sea",
          label: "예멘·홍해",
          lat: 15,
          lng: 44,
          altitude: 1.05,
          description: "홍해 항로·후티",
          bbox: { minLat: 12, maxLat: 18, minLng: 42, maxLng: 50 },
          actorCountries: ["YEM", "SAU", "IRN", "USA"],
        },
      ],
    },
    {
      id: "asia-pacific",
      label: "아시아-태평양",
      lat: 20,
      lng: 125,
      altitude: 1.35,
      description: "한미일·중국 견제·ASEAN",
      bbox: { minLat: -10, maxLat: 45, minLng: 95, maxLng: 155 },
      subItems: [
        {
          id: "us-jpn-kor",
          label: "한미일 동맹",
          lat: 35,
          lng: 135,
          altitude: 1.15,
          description: "동북아 안보 삼각협력",
          bbox: { minLat: 30, maxLat: 42, minLng: 124, maxLng: 145 },
          actorCountries: ["USA", "JPN", "KOR"],
        },
        {
          id: "quad-aukus",
          label: "QUAD·AUKUS",
          lat: -25,
          lng: 135,
          altitude: 1.4,
          description: "인도-태평양 중국 견제",
          bbox: { minLat: -45, maxLat: 10, minLng: 110, maxLng: 155 },
          actorCountries: ["USA", "AUS", "GBR", "IND", "JPN"],
        },
        {
          id: "asean",
          label: "ASEAN",
          lat: 4,
          lng: 108,
          altitude: 1.2,
          description: "동남아시아국가연합",
          bbox: { minLat: -8, maxLat: 20, minLng: 95, maxLng: 120 },
          actorCountries: ["IDN", "MYS", "SGP", "VNM", "PHL", "THA", "MMR", "KHM", "LAO", "BRN"],
        },
        {
          id: "south-china-sea",
          label: "남중국해",
          lat: 12,
          lng: 114,
          altitude: 1.0,
          description: "영유권·항로·중국 A2/AD",
          bbox: { minLat: 4, maxLat: 22, minLng: 105, maxLng: 122 },
          actorCountries: ["CHN", "VNM", "PHL", "MYS", "USA"],
        },
      ],
    },
    {
      id: "eurasia",
      label: "유라시아",
      lat: 55,
      lng: 85,
      altitude: 1.45,
      description: "러시아·중국 중심 대륙축",
      bbox: { minLat: 35, maxLat: 65, minLng: 50, maxLng: 140 },
      subItems: [
        {
          id: "russia-china",
          label: "러시아-중국",
          lat: 50,
          lng: 90,
          altitude: 1.35,
          description: "전략적 협력·에너지·국경",
          bbox: { minLat: 42, maxLat: 58, minLng: 70, maxLng: 130 },
          actorCountries: ["RUS", "CHN"],
        },
        {
          id: "central-asia",
          label: "중앙아시아",
          lat: 43,
          lng: 68,
          altitude: 1.25,
          description: "SCO·에너지·국경",
          bbox: { minLat: 35, maxLat: 50, minLng: 55, maxLng: 80 },
          actorCountries: ["KAZ", "UZB", "RUS", "CHN"],
        },
        {
          id: "india-china",
          label: "인도-중국",
          lat: 28,
          lng: 92,
          altitude: 1.1,
          description: "히말라야·국경 분쟁",
          bbox: { minLat: 26, maxLat: 36, minLng: 78, maxLng: 98 },
          actorCountries: ["IND", "CHN", "PAK"],
        },
      ],
    },
    {
      id: "americas",
      label: "북미·남미",
      lat: 15,
      lng: -80,
      altitude: 1.55,
      description: "미국 중심·서반구",
      bbox: { minLat: -55, maxLat: 55, minLng: -130, maxLng: -35 },
      subItems: [
        {
          id: "usa-alliances",
          label: "미국 동맹망",
          lat: 38.9,
          lng: -77,
          altitude: 1.3,
          description: "NATO·일본·한국·호주",
          bbox: { minLat: 25, maxLat: 50, minLng: -125, maxLng: -65 },
          actorCountries: ["USA", "CAN", "MEX"],
        },
        {
          id: "latin-america",
          label: "남미·중남미",
          lat: -15,
          lng: -60,
          altitude: 1.4,
          description: "브릭스·중국 영향력",
          bbox: { minLat: -55, maxLat: 12, minLng: -82, maxLng: -35 },
          actorCountries: ["BRA", "ARG", "CHL", "COL", "VEN", "CHN", "RUS"],
        },
      ],
    },
    {
      id: "africa",
      label: "아프리카",
      lat: 5,
      lng: 20,
      altitude: 1.5,
      description: "사헬·북아·호른·아프리카 연합",
      bbox: { minLat: -35, maxLat: 37, minLng: -18, maxLng: 52 },
      subItems: [
        {
          id: "sahel",
          label: "사헬",
          lat: 16,
          lng: 2,
          altitude: 1.2,
          description: "테러·쿠데타·불안정",
          bbox: { minLat: 10, maxLat: 20, minLng: -12, maxLng: 16 },
          actorCountries: ["MLI", "NER", "BFA", "NGA", "FRA", "USA"],
        },
        {
          id: "horn-africa",
          label: "홍해·호른",
          lat: 10,
          lng: 44,
          altitude: 1.1,
          description: "에티오피아·예멘·수에즈",
          bbox: { minLat: 0, maxLat: 18, minLng: 38, maxLng: 52 },
          actorCountries: ["ETH", "SOM", "ERI", "DJI", "YEM", "EGY"],
        },
        {
          id: "au",
          label: "아프리카연합(AU)",
          lat: 9,
          lng: 38.7,
          altitude: 1.35,
          description: "대륙 통합·평화·안보",
          bbox: { minLat: -35, maxLat: 37, minLng: -18, maxLng: 52 },
        },
      ],
    },
    {
      id: "supranational",
      label: "초국경 협력",
      lat: 20,
      lng: 0,
      altitude: 2.0,
      description: "BRICS·SCO·G7·G20",
      bbox: { minLat: -60, maxLat: 70, minLng: -180, maxLng: 180 },
      subItems: [
        {
          id: "brics",
          label: "BRICS",
          lat: -15.8,
          lng: -47.9,
          altitude: 1.6,
          description: "브라질·러·인·중·남아",
          bbox: { minLat: -35, maxLat: 55, minLng: 20, maxLng: 140 },
          actorCountries: ["BRA", "RUS", "IND", "CHN", "ZAF", "SAU", "EGY", "IRN", "ARE"],
        },
        {
          id: "sco",
          label: "상하이협력기구(SCO)",
          lat: 39.9,
          lng: 116.4,
          altitude: 1.45,
          description: "중·러 중심 유라시아 포럼",
          bbox: { minLat: 35, maxLat: 55, minLng: 60, maxLng: 130 },
          actorCountries: ["CHN", "RUS", "IND", "PAK", "KAZ", "UZB", "KGZ", "TJK"],
        },
        {
          id: "g7",
          label: "G7",
          lat: 46,
          lng: 2,
          altitude: 1.5,
          description: "선진 7개국",
          bbox: { minLat: 35, maxLat: 62, minLng: -130, maxLng: 145 },
          actorCountries: ["USA", "GBR", "FRA", "DEU", "ITA", "JPN", "CAN"],
        },
        {
          id: "g20",
          label: "G20",
          lat: 0,
          lng: 0,
          altitude: 2.1,
          description: "주요 20개국 경제",
          bbox: { minLat: -60, maxLat: 70, minLng: -180, maxLng: 180 },
          actorCountries: ["USA", "CHN", "RUS", "IND", "BRA", "SAU", "ZAF", "AUS", "KOR", "JPN", "DEU", "FRA", "GBR", "ITA", "CAN", "MEX", "TUR", "IDN"],
        },
      ],
    },
  ],
};

export const NAV_MENU_GROUPS: NavMenuGroup[] = [CONFLICT_ZONE_GROUP, INTERCONTINENTAL_GROUP];

export type ExplorationPreset = {
  id: string;
  label: string;
  tagline: string;
  navItem: NavMenuItem;
  groupId: string;
};

/** 첫 방문 유저용 대형 탐색 탭 — 주요 전선 4곳 */
function findNavMenuEntry(id: string): { navItem: NavMenuItem; groupId: string } | undefined {
  const inConflict = CONFLICT_ZONE_GROUP.items.find((item) => item.id === id);
  if (inConflict) return { navItem: inConflict, groupId: CONFLICT_ZONE_GROUP.id };
  const inIntercontinental = INTERCONTINENTAL_GROUP.items.find((item) => item.id === id);
  if (inIntercontinental) return { navItem: inIntercontinental, groupId: INTERCONTINENTAL_GROUP.id };
  return undefined;
}

function buildExplorationPresets(): ExplorationPreset[] {
  const taglines: Record<string, string> = {
    taiwan: "대만해협·남중국해",
    korea: "DMZ·한반도 긴장",
    ukraine: "동부·남부·하르키우 전선",
    "middle-east": "이란-이스라엘·홍해·걸프",
  };
  const ids = ["taiwan", "korea", "ukraine", "middle-east"] as const;

  return ids.flatMap((id) => {
    const entry = findNavMenuEntry(id);
    if (!entry) return [];
    return [
      {
        id,
        label: entry.navItem.label,
        tagline: taglines[id],
        navItem: entry.navItem,
        groupId: entry.groupId,
      },
    ];
  });
}

export const EXPLORATION_PRESETS = buildExplorationPresets();

export function toNavSelection(
  item: NavMenuItem | NavSubItem,
  groupId: string,
  parentLabel?: string,
): NavSelection {
  return {
    id: item.id,
    label: item.label,
    lat: item.lat,
    lng: item.lng,
    altitude: item.altitude,
    description: item.description,
    bbox: item.bbox,
    actorCountries: item.actorCountries,
    groupId,
    parentLabel,
  };
}
