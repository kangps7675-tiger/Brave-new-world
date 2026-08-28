/**
 * 실측 좌표 기반 전략 물류·군수 회랑 웨이포인트.
 *
 * 뉴스 인포그래픽의 도식적 화살표(출발지→도착지 직선/대권호) 대신,
 * 실제 철도·항만·해협·국경통과점을 순서대로 잇는 다구간 경로 데이터.
 *
 * 좌표는 주요 도시/항만/역/국경통과점의 실측 근사치(공개 지도 기준)이며,
 * 밀리미터 단위 정밀도가 필요하면 각 구간을 OpenStreetMap Overpass API로
 * 재추출해 실제 철도 centerline geometry로 교체할 것 (app/api/pipelines-osm
 * 라우트가 이미 같은 방식으로 Overpass를 쓰고 있으니 참고).
 *
 * category:
 *  - "trade": 실재/건설중/제안 단계의 여객·화물 무역·통상 회랑
 *  - "military-logistics": 언론·조사보고 기반 군수 이송로 (정부 공식 확인 안 됨)
 *  - "sanctions-evasion": 제재 우회 무역·물자 이동로
 */

export type CorridorWaypoint = {
  lat: number;
  lng: number;
  /** 지점명 (역/항구/국경통과점) */
  name?: string;
};

export type CorridorMode = "rail" | "sea" | "road" | "mixed";

export type CorridorCategory = "trade" | "military-logistics" | "sanctions-evasion";

export type CorridorStatus =
  | "operational"
  | "partial"
  | "under-construction"
  | "proposed"
  | "reported";

/** 호버·칩용 — operational은 생략(완공 기본값), 그 외만 라벨 */
export function corridorStatusLabel(
  status: string | null | undefined,
  lang: "ko" | "en" = "ko",
): string | null {
  switch (status) {
    case "under-construction":
      return lang === "en" ? "Under construction" : "건설중";
    case "proposed":
      return lang === "en" ? "Proposed" : "제안";
    case "partial":
      return lang === "en" ? "Partial / incomplete" : "부분 운용";
    case "reported":
      return lang === "en" ? "Reported route" : "보고된 경로";
    default:
      return null;
  }
}

/**
 * 실제 인프라는 종종 중간에 장애물(바다·호수)을 만나 운송수단이 바뀐다 —
 * 철도로 오다가 카스피해 같은 수역에서 항로(페리)로 갈아타고, 건너편에서 다시
 * 철도/도로로 이어지는 식. `legs`가 있으면 그 구간별 mode를 그대로 지도에
 * 반영해서(육로 실선 → 해상 구간 점선 → 육로 실선) 하나로 이어진 물류망처럼
 * 보이게 렌더링한다. 구간 경계 좌표는 반드시 인접 leg와 정확히 일치해야
 * 시각적으로 끊김 없이 이어진다.
 */
export type CorridorLeg = {
  mode: CorridorMode;
  waypoints: CorridorWaypoint[];
};

export type StrategicCorridor = {
  id: string;
  nameKo: string;
  nameEn: string;
  mode: CorridorMode;
  category: CorridorCategory;
  status: CorridorStatus;
  /** 이 회랑이 대응하는 axis-link 국가쌍 정렬키("A|B", A<B) — 있으면 axisNetworkPaths/axisArmsPaths가 그 축 화살표를 이 실측 경로로 대체한다 */
  axisPairKeys?: string[];
  sources: string[];
  note?: string;
  waypoints: CorridorWaypoint[];
  /** 다구간(육로↔해상 등) 회랑이면 지정 — 있으면 렌더링 시 waypoints 대신 이걸 우선 사용 */
  legs?: CorridorLeg[];
  /**
   * 정량 랭킹 메타는 `src/data/corridor-rank-meta.json`에 둠
   * (endpointCountries · comtradePair · briDestCodes · chokeIds · lengthKmApprox).
   * `npm run corridors:ranks` → corridor-ranks.json → LOD scalerank.
   */
};

export const STRATEGIC_CORRIDORS: StrategicCorridor[] = [
  {
    id: "tsr",
    nameKo: "시베리아횡단철도 (TSR)",
    nameEn: "Trans-Siberian Railway (TSR)",
    mode: "rail",
    category: "trade",
    status: "operational",
    sources: ["OpenStreetMap", "Russian Railways (RZD)"],
    waypoints: [
      { lat: 55.751, lng: 37.617, name: "Moscow" },
      { lat: 56.838, lng: 60.605, name: "Yekaterinburg" },
      { lat: 54.989, lng: 73.368, name: "Omsk" },
      { lat: 55.03, lng: 82.92, name: "Novosibirsk" },
      { lat: 56.01, lng: 92.852, name: "Krasnoyarsk" },
      { lat: 52.287, lng: 104.305, name: "Irkutsk" },
      { lat: 51.833, lng: 107.584, name: "Ulan-Ude" },
      { lat: 52.033, lng: 113.501, name: "Chita" },
      { lat: 53.983, lng: 123.933, name: "Skovorodino" },
      { lat: 48.48, lng: 135.084, name: "Khabarovsk" },
      { lat: 43.116, lng: 131.885, name: "Vladivostok" },
    ],
  },
  {
    id: "tmgr",
    nameKo: "몽골횡단철도 (TMGR)",
    nameEn: "Trans-Mongolian Railway (TMGR)",
    mode: "rail",
    category: "trade",
    status: "operational",
    sources: ["OpenStreetMap", "UBTZ (Ulaanbaatar Railway)"],
    waypoints: [
      { lat: 51.833, lng: 107.584, name: "Ulan-Ude" },
      { lat: 50.386, lng: 106.078, name: "Naushki" },
      { lat: 50.231, lng: 106.213, name: "Sükhbaatar" },
      { lat: 47.886, lng: 106.906, name: "Ulaanbaatar" },
      { lat: 43.73, lng: 111.887, name: "Zamyn-Üüd" },
      { lat: 43.648, lng: 111.978, name: "Erenhot (Erlian)" },
      { lat: 39.904, lng: 116.407, name: "Beijing" },
    ],
  },
  {
    id: "tmr",
    nameKo: "만주횡단철도 (TMR)",
    nameEn: "Trans-Manchurian Railway (TMR)",
    mode: "rail",
    category: "trade",
    status: "operational",
    sources: ["OpenStreetMap", "China Railway"],
    waypoints: [
      { lat: 52.033, lng: 113.501, name: "Chita" },
      { lat: 49.65, lng: 117.324, name: "Zabaykalsk" },
      { lat: 49.588, lng: 117.432, name: "Manzhouli" },
      { lat: 45.803, lng: 126.535, name: "Harbin" },
      { lat: 44.394, lng: 131.156, name: "Suifenhe" },
      { lat: 43.802, lng: 131.944, name: "Ussuriysk" },
      { lat: 43.116, lng: 131.885, name: "Vladivostok" },
    ],
  },
  {
    id: "bam",
    nameKo: "바이칼-아무르 철도 (BAM)",
    nameEn: "Baikal-Amur Mainline (BAM)",
    mode: "rail",
    category: "trade",
    status: "operational",
    sources: ["OpenStreetMap", "RZD"],
    waypoints: [
      { lat: 56.156, lng: 97.964, name: "Taishet" },
      { lat: 56.153, lng: 101.634, name: "Bratsk" },
      { lat: 55.639, lng: 109.329, name: "Severobaikalsk" },
      { lat: 55.169, lng: 124.723, name: "Tynda" },
      { lat: 50.55, lng: 137.007, name: "Komsomolsk-on-Amur" },
      { lat: 48.967, lng: 140.278, name: "Sovetskaya Gavan" },
    ],
  },
  {
    id: "rajin-khasan",
    nameKo: "라진-하산 철도 (북–러 연결)",
    nameEn: "Rajin–Khasan Railway (DPRK–Russia link)",
    mode: "rail",
    category: "military-logistics",
    status: "operational",
    axisPairKeys: ["PRK|RUS"],
    sources: [
      "OpenStreetMap",
      "https://en.wikipedia.org/wiki/Rajin%E2%80%93Khasan_Railway",
      "satellite-imagery reporting on DPRK–Russia munitions transfers, 2023–2024",
    ],
    note:
      "TSR 블라디보스토크 구간에서 분기해 하산·두만강을 거쳐 나진항으로 연결되는 실재 철도. " +
      "2023~24년 대러 포탄·군수품 이송 경로로 다수 보도됨.",
    waypoints: [
      { lat: 43.116, lng: 131.885, name: "Vladivostok" },
      { lat: 43.802, lng: 131.944, name: "Ussuriysk" },
      { lat: 42.43, lng: 130.635, name: "Khasan, Russia" },
      { lat: 42.417, lng: 130.639, name: "Tumangang, DPRK" },
      { lat: 42.35, lng: 130.397, name: "Rajin (Rason), DPRK" },
    ],
  },
  {
    id: "trans-korean-west",
    nameKo: "한반도종단철도 서선 (경의선, 제안)",
    nameEn: "Trans-Korean Railway — western line (proposed reconnection)",
    mode: "rail",
    category: "trade",
    status: "proposed",
    sources: ["국토교통부 남북철도 연결사업 자료"],
    note: "2018 판문점선언 이후 논의된 경의선 축. 비무장지대 구간이 실제로는 단절돼 있음.",
    waypoints: [
      { lat: 35.18, lng: 129.075, name: "Busan" },
      { lat: 37.567, lng: 126.978, name: "Seoul" },
      { lat: 37.971, lng: 126.554, name: "Kaesong" },
      { lat: 39.019, lng: 125.738, name: "Pyongyang" },
      { lat: 40.1, lng: 124.395, name: "Sinuiju" },
      { lat: 40.128, lng: 124.395, name: "Dandong, China" },
    ],
  },
  {
    id: "trans-korean-east",
    nameKo: "한반도종단철도 동선 (동해선, 제안)",
    nameEn: "Trans-Korean Railway — eastern line (proposed reconnection)",
    mode: "rail",
    category: "trade",
    status: "proposed",
    sources: ["국토교통부 남북철도 연결사업 자료"],
    note: "완공 시 하산에서 TSR로 직결되는 동해선 축. 비무장지대~원산 구간이 실제로는 단절돼 있음.",
    waypoints: [
      { lat: 35.18, lng: 129.075, name: "Busan" },
      { lat: 37.567, lng: 126.978, name: "Seoul" },
      { lat: 39.152, lng: 127.443, name: "Wonsan" },
      { lat: 41.797, lng: 129.783, name: "Chongjin" },
      { lat: 42.35, lng: 130.397, name: "Rajin (Rason)" },
      { lat: 42.43, lng: 130.635, name: "Khasan, Russia" },
    ],
  },
  {
    id: "middle-corridor",
    nameKo: "미들 코리도어 (TITR, 중국–유럽)",
    nameEn: "Middle Corridor / Trans-Caspian International Transport Route",
    mode: "mixed",
    category: "trade",
    status: "operational",
    sources: [
      "https://en.wikipedia.org/wiki/Trans-Caspian_International_Transport_Route",
      "https://www.railway-technology.com/features/the-middle-corridor-central-asias-rail-independence-vision/",
    ],
    note:
      "카스피해 구간은 철도 페리로 도하. Baku–Tbilisi–Kars(BTK) 철도가 2017년 개통되어 " +
      "튀르키예까지 환적 없이 육로 연결.",
    waypoints: [
      { lat: 43.826, lng: 87.617, name: "Urumqi, China" },
      { lat: 44.208, lng: 80.406, name: "Khorgos border" },
      { lat: 43.238, lng: 76.945, name: "Almaty" },
      { lat: 43.65, lng: 51.157, name: "Aktau (Caspian port)" },
      { lat: 40.409, lng: 49.867, name: "Baku (Caspian ferry landing)" },
      { lat: 41.715, lng: 44.827, name: "Tbilisi" },
      { lat: 41.406, lng: 43.483, name: "Akhalkalaki" },
      { lat: 40.602, lng: 43.095, name: "Kars, Turkey (BTK railway)" },
      { lat: 41.008, lng: 28.978, name: "Istanbul" },
    ],
    // 카스피해(장애물)를 만나 철도 → 페리 → 철도로 갈아타는 실제 구조를 그대로 반영.
    legs: [
      {
        mode: "rail",
        waypoints: [
          { lat: 43.826, lng: 87.617, name: "Urumqi, China" },
          { lat: 44.208, lng: 80.406, name: "Khorgos border" },
          { lat: 43.238, lng: 76.945, name: "Almaty" },
          { lat: 43.65, lng: 51.157, name: "Aktau (Caspian port)" },
        ],
      },
      {
        mode: "sea",
        waypoints: [
          { lat: 43.65, lng: 51.157, name: "Aktau (Caspian port)" },
          { lat: 40.409, lng: 49.867, name: "Baku (Caspian ferry landing)" },
        ],
      },
      {
        mode: "rail",
        waypoints: [
          { lat: 40.409, lng: 49.867, name: "Baku (Caspian ferry landing)" },
          { lat: 41.715, lng: 44.827, name: "Tbilisi" },
          { lat: 41.406, lng: 43.483, name: "Akhalkalaki" },
          { lat: 40.602, lng: 43.095, name: "Kars, Turkey (BTK railway)" },
          { lat: 41.008, lng: 28.978, name: "Istanbul" },
        ],
      },
    ],
  },
  {
    id: "zangezur-corridor",
    nameKo: "장게주르 회랑 (제안)",
    nameEn: "Zangezur Corridor (proposed)",
    mode: "mixed",
    category: "trade",
    status: "proposed",
    sources: ["https://en.wikipedia.org/wiki/Zangezur_corridor"],
    note:
      "아제르바이잔 본토–나흐치반 역외영토를 아르메니아 시우니크(장게주르) 경유로 " +
      "연결하려는 계획. 2025년 TRIPP 합의로 재부상.",
    waypoints: [
      { lat: 39.478, lng: 47.339, name: "Horadiz, Azerbaijan" },
      { lat: 39.088, lng: 46.706, name: "Zangilan" },
      { lat: 38.897, lng: 46.246, name: "Meghri, Armenia (Syunik)" },
      { lat: 38.96, lng: 45.63, name: "Julfa" },
      { lat: 39.209, lng: 45.412, name: "Nakhchivan City" },
      { lat: 39.925, lng: 44.045, name: "Iğdır, Turkey border" },
    ],
  },
  {
    id: "chn-irn-rail",
    nameKo: "중국–이란 화물철도 (중앙아 경유)",
    nameEn: "China–Iran freight rail (via Central Asia)",
    mode: "rail",
    category: "sanctions-evasion",
    status: "operational",
    axisPairKeys: ["CHN|IRN"],
    sources: [
      "https://uic.org/com/enews/nr/486/article/the-first-train-connecting-china",
      "https://thecradle.co/articles/iran-china-inaugurate-new-freight-train-route-via-turkmenistan",
    ],
    note:
      "2016년 이우(義烏)~테헤란 첫 화물열차(14일, 약 10,400km). " +
      "이후 투르크메니스탄 경유 노선도 추가 개통되어 대이란 제재 우회 통로로 보도됨.",
    waypoints: [
      { lat: 29.306, lng: 120.075, name: "Yiwu, China" },
      { lat: 43.826, lng: 87.617, name: "Urumqi" },
      { lat: 44.208, lng: 80.406, name: "Khorgos border" },
      { lat: 43.238, lng: 76.945, name: "Almaty" },
      { lat: 42.317, lng: 69.586, name: "Shymkent" },
      { lat: 41.299, lng: 69.24, name: "Tashkent, Uzbekistan" },
      { lat: 39.083, lng: 63.578, name: "Turkmenabat, Turkmenistan" },
      { lat: 37.96, lng: 58.326, name: "Ashgabat" },
      { lat: 36.545, lng: 61.16, name: "Sarakhs border" },
      { lat: 36.297, lng: 59.606, name: "Mashhad, Iran" },
      { lat: 35.689, lng: 51.389, name: "Tehran" },
    ],
  },
  {
    id: "instc-trans-caspian",
    nameKo: "국제 남북 운송회랑 (INSTC, 카스피해 경유)",
    nameEn: "International North–South Transport Corridor (INSTC), trans-Caspian route",
    mode: "mixed",
    category: "trade",
    status: "operational",
    sources: ["https://en.wikipedia.org/wiki/International_North%E2%80%93South_Transport_Corridor"],
    note:
      "모스크바~아스트라한(철도) → 카스피해(선박) → 이란 항만 → 테헤란 → " +
      "반다르아바스/차바하르(철도·도로) → 아라비아해(선박) → 뭄바이.",
    waypoints: [
      { lat: 59.934, lng: 30.335, name: "St. Petersburg" },
      { lat: 55.751, lng: 37.617, name: "Moscow" },
      { lat: 46.347, lng: 48.033, name: "Astrakhan (Caspian port)" },
      { lat: 37.47, lng: 49.461, name: "Bandar-e Anzali, Iran" },
      { lat: 35.689, lng: 51.389, name: "Tehran" },
      { lat: 27.187, lng: 56.278, name: "Bandar Abbas (Persian Gulf port)" },
      { lat: 19.076, lng: 72.877, name: "Mumbai, India" },
    ],
    // 카스피해·아라비아해 두 군데서 철도→선박→육로로 갈아탄다 — 실제 그대로 구간화.
    legs: [
      {
        mode: "rail",
        waypoints: [
          { lat: 59.934, lng: 30.335, name: "St. Petersburg" },
          { lat: 55.751, lng: 37.617, name: "Moscow" },
          { lat: 46.347, lng: 48.033, name: "Astrakhan (Caspian port)" },
        ],
      },
      {
        mode: "sea",
        waypoints: [
          { lat: 46.347, lng: 48.033, name: "Astrakhan (Caspian port)" },
          { lat: 37.47, lng: 49.461, name: "Bandar-e Anzali, Iran" },
        ],
      },
      {
        mode: "mixed",
        waypoints: [
          { lat: 37.47, lng: 49.461, name: "Bandar-e Anzali, Iran" },
          { lat: 35.689, lng: 51.389, name: "Tehran" },
          { lat: 27.187, lng: 56.278, name: "Bandar Abbas (Persian Gulf port)" },
        ],
      },
      {
        mode: "sea",
        waypoints: [
          { lat: 27.187, lng: 56.278, name: "Bandar Abbas (Persian Gulf port)" },
          { lat: 19.076, lng: 72.877, name: "Mumbai, India" },
        ],
      },
    ],
  },
  {
    id: "instc-baku-branch",
    nameKo: "INSTC 서부(바쿠) 회랑",
    nameEn: "INSTC western (Baku) branch",
    mode: "mixed",
    category: "trade",
    status: "operational",
    sources: ["https://en.wikipedia.org/wiki/International_North%E2%80%93South_Transport_Corridor"],
    waypoints: [
      { lat: 46.347, lng: 48.033, name: "Astrakhan" },
      { lat: 42.983, lng: 47.504, name: "Makhachkala" },
      { lat: 40.409, lng: 49.867, name: "Baku" },
      { lat: 38.421, lng: 48.877, name: "Astara border" },
      { lat: 37.28, lng: 49.583, name: "Rasht, Iran" },
      { lat: 35.689, lng: 51.389, name: "Tehran" },
    ],
  },
  {
    id: "irn-rus-caspian-arms",
    nameKo: "이란→러시아 드론·군수 이송로 (카스피해, 보도 기반)",
    nameEn: "Iran→Russia drone/munitions transfer route (Caspian, reported)",
    mode: "mixed",
    category: "military-logistics",
    status: "reported",
    axisPairKeys: ["IRN|RUS"],
    sources: [
      "https://israel-alma.org/is-there-a-maritime-corridor-for-arms-transfers-from-russia-to-iran-via-the-caspian-sea/",
      "https://en.wikipedia.org/wiki/Seshcha_air_base",
      "https://en.wikipedia.org/wiki/Primorsko-Akhtarsk_air_base",
    ],
    note:
      "언론·조사보고 기반 경로. 테헤란/아미라바드항 → 카스피해 선박 → 마하치칼라(러) → " +
      "육로로 세샤(브랸스크주)·프리모르스코-아흐타르스크(크라스노다르주) 기지로 이송된다고 보도됨. " +
      "구체적 개별 이동 경로는 정부 공식 확인 대상이 아니며, 참고 이미지에도 'notional'로 표기됨 — " +
      "이 데이터도 같은 불확실성을 안고 있는 근사 경로임.",
    waypoints: [
      { lat: 35.689, lng: 51.389, name: "Tehran" },
      { lat: 36.86, lng: 53.3, name: "Amirabad port (Caspian)" },
      { lat: 42.983, lng: 47.504, name: "Makhachkala, Russia" },
      { lat: 46.35, lng: 41.0, name: "overland via southern Russia" },
      { lat: 46.05, lng: 38.17, name: "Primorsko-Akhtarsk air base" },
    ],
    // 테헤란(내륙)→항구(도로)→카스피해 도하(선박)→러시아 상륙 후 다시 육로 —
    // "호수를 만나 항로로 갈아탄다"의 실사례. axis-link(IRN|RUS) 오버라이드로도 쓰인다.
    legs: [
      {
        mode: "road",
        waypoints: [
          { lat: 35.689, lng: 51.389, name: "Tehran" },
          { lat: 36.86, lng: 53.3, name: "Amirabad port (Caspian)" },
        ],
      },
      {
        mode: "sea",
        waypoints: [
          { lat: 36.86, lng: 53.3, name: "Amirabad port (Caspian)" },
          { lat: 42.983, lng: 47.504, name: "Makhachkala, Russia" },
        ],
      },
      {
        mode: "road",
        waypoints: [
          { lat: 42.983, lng: 47.504, name: "Makhachkala, Russia" },
          { lat: 46.35, lng: 41.0, name: "overland via southern Russia" },
          { lat: 46.05, lng: 38.17, name: "Primorsko-Akhtarsk air base" },
        ],
      },
    ],
  },
  {
    id: "irn-rus-caspian-arms-seshcha-branch",
    nameKo: "이란→러시아 드론·군수 이송로 (세샤 방면 분기, 보도 기반)",
    nameEn: "Iran→Russia drone/munitions route — Seshcha branch (reported)",
    mode: "mixed",
    category: "military-logistics",
    status: "reported",
    sources: ["https://en.wikipedia.org/wiki/Seshcha_air_base"],
    waypoints: [
      { lat: 42.983, lng: 47.504, name: "Makhachkala, Russia" },
      { lat: 46.347, lng: 48.033, name: "Astrakhan" },
      { lat: 51.5, lng: 40.0, name: "overland via Voronezh region" },
      { lat: 53.29, lng: 34.03, name: "Seshcha air base, Bryansk Oblast" },
    ],
  },
  {
    id: "irn-syr-landbridge",
    nameKo: "이란–시리아 육상 회랑 ('시아 회랑' 육로설)",
    nameEn: "Iran–Syria land bridge (\"Shia Crescent\" route, reported)",
    mode: "road",
    category: "military-logistics",
    status: "reported",
    axisPairKeys: ["IRN|SYR"],
    sources: ["다수 서방 국방·중동 싱크탱크 보도 (2018~2024 시아 회랑 관련 분석)"],
    note:
      "이라크를 관통하는 육로 회랑으로 다수 보도됨. 이란의 카스피해~흑해(노보로시스크)~ " +
      "타르투스 해상 우회 경로도 병행 보도됨(별도 항목으로 관리 권장).",
    waypoints: [
      { lat: 35.689, lng: 51.389, name: "Tehran" },
      { lat: 34.314, lng: 47.065, name: "Kermanshah" },
      { lat: 33.315, lng: 44.366, name: "Baghdad" },
      { lat: 35.336, lng: 40.147, name: "Deir ez-Zor" },
      { lat: 33.513, lng: 36.276, name: "Damascus" },
      { lat: 34.89, lng: 35.886, name: "Tartus" },
    ],
  },
  {
    id: "suez-baseline",
    nameKo: "수에즈–말라카 표준 해상항로 (아시아–유럽 기준선)",
    nameEn: "Suez–Malacca standard sea route (Asia–Europe baseline)",
    mode: "sea",
    category: "trade",
    status: "operational",
    sources: ["주요 컨테이너 항로 근사 (searoute 계열 방법론 참고)"],
    waypoints: [
      { lat: 31.23, lng: 121.474, name: "Shanghai" },
      { lat: 1.29, lng: 103.852, name: "Singapore (Malacca Strait)" },
      { lat: 6.927, lng: 79.861, name: "Colombo" },
      { lat: 12.6, lng: 43.4, name: "Bab-el-Mandeb" },
      { lat: 27.95, lng: 34.66, name: "Red Sea approach" },
      { lat: 30.0, lng: 32.55, name: "Suez Canal" },
      { lat: 36.14, lng: -5.35, name: "Strait of Gibraltar" },
      { lat: 51.92, lng: 4.48, name: "Rotterdam" },
    ],
  },

  // ————————————————————————————————————————————————————————————
  // CRINK(중·러·이란·북한) 핵심축 + 스포크 전체 커버 — data/axisNetwork.ts의
  // AXIS_EDGES 전 항목에 대응하는 실측 경로. 물리적으로 확인 가능한 인프라가
  // 있는 관계만 등록했고, 그 외(BLR-PRK, PRK-VEN 등 순수 외교관계)는 의도적으로
  // 비워 axis-link가 기존 대권 호로 폴백하도록 둔다 — 없는 인프라를 지어내는
  // 것보다 정직한 폴백이 낫다고 판단.
  // ————————————————————————————————————————————————————————————

  {
    id: "power-of-siberia",
    nameKo: "시베리아의 힘 가스관 (중–러)",
    nameEn: "Power of Siberia gas pipeline (China–Russia)",
    mode: "mixed",
    category: "trade",
    status: "operational",
    axisPairKeys: ["CHN|RUS"],
    sources: ["https://en.wikipedia.org/wiki/Power_of_Siberia"],
    note: "'무제한 파트너십'의 실제 인프라 상징 — 야쿠티야 가스전에서 헤이허를 거쳐 중국 가스망으로.",
    waypoints: [
      { lat: 60.9, lng: 117.6, name: "Chayandinskoye field, Yakutia" },
      { lat: 60.72, lng: 114.93, name: "Lensk" },
      { lat: 58.6, lng: 125.39, name: "Aldan" },
      { lat: 51.37, lng: 128.13, name: "Svobodny" },
      { lat: 50.27, lng: 127.54, name: "Blagoveshchensk" },
      { lat: 50.24, lng: 127.48, name: "Heihe, China" },
      { lat: 45.8, lng: 126.54, name: "Harbin" },
      { lat: 31.23, lng: 121.47, name: "Shanghai" },
    ],
  },
  {
    id: "tongjiang-nizhneleninskoye-bridge",
    nameKo: "퉁장-니즈네레닌스코예 철도교 (중–러 첫 철도 대교)",
    nameEn: "Tongjiang–Nizhneleninskoye railway bridge (first China–Russia rail bridge)",
    mode: "rail",
    category: "trade",
    status: "operational",
    sources: ["https://en.wikipedia.org/wiki/Tongjiang%E2%80%93Nizhneleninskoye_railway_bridge"],
    note: "2022년 개통. 아무르강을 가로지르는 최초의 중-러 철도 교량 — CHN|RUS 오버라이드는 시베리아의 힘 쪽에 걸어뒀고 이건 보조 데이터.",
    waypoints: [
      { lat: 47.72, lng: 132.51, name: "Tongjiang, China" },
      { lat: 47.7, lng: 132.55, name: "Nizhneleninskoye, Russia" },
    ],
  },
  {
    id: "dandong-sinuiju-bridge",
    nameKo: "단둥-신의주 압록강 우호교 (중–북 최대 교역로)",
    nameEn: "Dandong–Sinuiju Yalu River Friendship Bridge (China–DPRK main trade link)",
    mode: "road",
    category: "trade",
    status: "operational",
    axisPairKeys: ["CHN|PRK"],
    sources: ["https://en.wikipedia.org/wiki/Sino-Korean_Friendship_Bridge"],
    note: "북한 대외무역의 70% 이상이 이 다리 하나로 통과한다고 추산됨.",
    waypoints: [
      { lat: 40.128, lng: 124.395, name: "Dandong, China" },
      { lat: 40.1, lng: 124.4, name: "Sinuiju, DPRK" },
    ],
  },
  {
    id: "irn-prk-missile-route",
    nameKo: "북–이란 미사일·군수 이송로 (해상, 보도 기반)",
    nameEn: "DPRK–Iran missile/arms transfer route (sea, reported)",
    mode: "sea",
    category: "military-logistics",
    status: "reported",
    axisPairKeys: ["IRN|PRK"],
    sources: ["다수 UN 대북제재위 전문가패널 보고서 · 스콧 스캐터 미사일 기술협력 관련 보도"],
    note: "냉전 이후 스커드/노동 계열 미사일 기술협력이 다수 보도된 해상 이송 패턴 근사치. 육로(중국·러시아 경유) 또는 항공화물 경로도 병행 보도됨.",
    waypoints: [
      { lat: 38.74, lng: 125.41, name: "Nampo, DPRK" },
      { lat: 30.0, lng: 125.0, name: "East China Sea" },
      { lat: 22.0, lng: 118.0, name: "South China Sea" },
      { lat: 1.29, lng: 103.85, name: "Malacca Strait (Singapore)" },
      { lat: 10.0, lng: 75.0, name: "Indian Ocean transit" },
      { lat: 27.187, lng: 56.278, name: "Bandar Abbas, Iran" },
    ],
  },
  {
    id: "rus-blr-rail",
    nameKo: "모스크바–민스크 철도 (러–벨라루스 연합국가)",
    nameEn: "Moscow–Minsk railway (Russia–Belarus Union State)",
    mode: "rail",
    category: "trade",
    status: "operational",
    axisPairKeys: ["BLR|RUS"],
    sources: ["OpenStreetMap / RZD"],
    waypoints: [
      { lat: 55.751, lng: 37.617, name: "Moscow" },
      { lat: 54.782, lng: 32.045, name: "Smolensk" },
      { lat: 54.508, lng: 30.416, name: "Orsha" },
      { lat: 53.9, lng: 27.56, name: "Minsk" },
    ],
  },
  {
    id: "cpc-pipeline",
    nameKo: "카스피해 송유관 컨소시엄 (CPC, 카자흐–러 원유)",
    nameEn: "Caspian Pipeline Consortium (CPC) oil pipeline",
    mode: "mixed",
    category: "trade",
    status: "operational",
    axisPairKeys: ["KAZ|RUS"],
    sources: ["https://en.wikipedia.org/wiki/Caspian_Pipeline_Consortium"],
    note: "카자흐 텡기즈 유전에서 러시아 노보로시스크 흑해 터미널까지 — 카자흐 원유 수출의 대부분이 이 노선을 통과.",
    waypoints: [
      { lat: 46.2, lng: 53.4, name: "Tengiz field, Kazakhstan" },
      { lat: 47.1, lng: 51.92, name: "Atyrau" },
      { lat: 48.0, lng: 45.5, name: "Komsomolskaya pumping station" },
      { lat: 45.44, lng: 40.57, name: "Kropotkin, Russia" },
      { lat: 44.72, lng: 37.77, name: "Novorossiysk marine terminal" },
    ],
  },
  {
    id: "rus-uzb-rail",
    nameKo: "모스크바–타슈켄트 철도",
    nameEn: "Moscow–Tashkent railway",
    mode: "rail",
    category: "trade",
    status: "operational",
    axisPairKeys: ["RUS|UZB"],
    sources: ["OpenStreetMap / RZD-Uzbekistan Railways"],
    waypoints: [
      { lat: 55.751, lng: 37.617, name: "Moscow" },
      { lat: 53.2, lng: 50.15, name: "Samara" },
      { lat: 51.77, lng: 55.1, name: "Orenburg" },
      { lat: 50.28, lng: 57.21, name: "Aktobe" },
      { lat: 44.85, lng: 65.52, name: "Kyzylorda" },
      { lat: 41.3, lng: 69.24, name: "Tashkent" },
    ],
  },
  {
    id: "central-asia-center-gas-pipeline",
    nameKo: "중앙아시아-센터 가스관 (투르크멘–러시아)",
    nameEn: "Central Asia–Center (CAC) gas pipeline (Turkmenistan–Russia)",
    mode: "mixed",
    category: "trade",
    status: "operational",
    axisPairKeys: ["RUS|TKM"],
    sources: ["Central Asia–Center gas pipeline system (Soviet-era, still operating)"],
    waypoints: [
      { lat: 39.083, lng: 63.578, name: "Turkmenabat, Turkmenistan" },
      { lat: 39.77, lng: 64.42, name: "Bukhara, Uzbekistan" },
      { lat: 42.78, lng: 59.14, name: "Kungrad area" },
      { lat: 45.32, lng: 55.2, name: "Beyneu, Kazakhstan" },
      { lat: 47.1, lng: 51.92, name: "Atyrau" },
      { lat: 50.15, lng: 48.57, name: "Alexandrov Gay, Russia" },
    ],
  },
  {
    id: "rus-kgz-route",
    nameKo: "모스크바–비슈케크 회랑 (CSTO·칸트 공군기지)",
    nameEn: "Moscow–Bishkek corridor (CSTO / Kant air base)",
    mode: "mixed",
    category: "trade",
    status: "operational",
    axisPairKeys: ["KGZ|RUS"],
    sources: ["일반 철도·항공 연결 경로 근사"],
    waypoints: [
      { lat: 55.751, lng: 37.617, name: "Moscow" },
      { lat: 51.77, lng: 55.1, name: "Orenburg" },
      { lat: 50.28, lng: 57.21, name: "Aktobe" },
      { lat: 43.238, lng: 76.945, name: "Almaty" },
      { lat: 42.87, lng: 74.59, name: "Bishkek" },
    ],
  },
  {
    id: "rus-tjk-route",
    nameKo: "모스크바–두샨베 회랑 (러 201 군사기지)",
    nameEn: "Moscow–Dushanbe corridor (Russian 201st military base)",
    mode: "mixed",
    category: "trade",
    status: "operational",
    axisPairKeys: ["RUS|TJK"],
    sources: ["일반 철도·항공 연결 경로 근사"],
    waypoints: [
      { lat: 55.751, lng: 37.617, name: "Moscow" },
      { lat: 51.77, lng: 55.1, name: "Orenburg" },
      { lat: 50.28, lng: 57.21, name: "Aktobe" },
      { lat: 41.3, lng: 69.24, name: "Tashkent" },
      { lat: 38.56, lng: 68.78, name: "Dushanbe" },
    ],
  },
  {
    id: "syrian-express",
    nameKo: "'시리안 익스프레스' (러 흑해–타르투스 해상 보급로)",
    nameEn: "\"Syrian Express\" (Russia Black Sea–Tartus resupply route)",
    mode: "sea",
    category: "military-logistics",
    status: "operational",
    axisPairKeys: ["RUS|SYR"],
    sources: ["2015년 이후 다수 공개 보도 — 러시아 스스로도 공개 인정하는 정기 보급 항로"],
    waypoints: [
      { lat: 44.72, lng: 37.77, name: "Novorossiysk, Russia" },
      { lat: 41.01, lng: 28.98, name: "Bosphorus (Istanbul)" },
      { lat: 37.0, lng: 25.0, name: "Aegean Sea" },
      { lat: 34.89, lng: 35.89, name: "Tartus, Syria" },
    ],
  },
  {
    id: "chn-kaz-oil-pipeline",
    nameKo: "카자흐스탄-중국 송유관",
    nameEn: "Kazakhstan–China oil pipeline",
    mode: "mixed",
    category: "trade",
    status: "operational",
    axisPairKeys: ["CHN|KAZ"],
    sources: ["https://en.wikipedia.org/wiki/Kazakhstan%E2%80%93China_oil_pipeline"],
    waypoints: [
      { lat: 47.1, lng: 51.92, name: "Atyrau" },
      { lat: 48.2, lng: 57.45, name: "Kenkiyak" },
      { lat: 45.65, lng: 65.15, name: "Kumkol" },
      { lat: 48.68, lng: 71.65, name: "Atasu" },
      { lat: 45.18, lng: 82.57, name: "Alashankou, China border" },
      { lat: 43.826, lng: 87.617, name: "Urumqi" },
    ],
  },
  {
    id: "cku-railway",
    nameKo: "중국-키르기스스탄-우즈베키스탄 철도 (CKU, 건설중)",
    nameEn: "China–Kyrgyzstan–Uzbekistan (CKU) railway (under construction)",
    mode: "rail",
    category: "trade",
    status: "under-construction",
    axisPairKeys: ["CHN|UZB"],
    sources: [
      "https://en.wikipedia.org/wiki/China%E2%80%93Kyrgyzstan%E2%80%93Uzbekistan_railway",
      "https://thediplomat.com/2024/12/a-ceremonial-start-to-construction-of-the-china-kyrgyzstan-uzbekistan-railway/",
    ],
    note: "2024년 12월 착공. 미들 코리도어를 중국-키르기스스탄 경유로 단축하는 신규 노선.",
    waypoints: [
      { lat: 39.47, lng: 75.99, name: "Kashgar, China" },
      { lat: 39.69, lng: 73.95, name: "Irkeshtam Pass" },
      { lat: 40.53, lng: 72.8, name: "Osh, Kyrgyzstan" },
      { lat: 40.93, lng: 72.98, name: "Jalal-Abad" },
      { lat: 40.78, lng: 72.34, name: "Andijan, Uzbekistan" },
    ],
  },
  {
    id: "chn-tkm-gas-pipeline",
    nameKo: "중앙아시아-중국 가스관 (투르크멘 구간)",
    nameEn: "Central Asia–China gas pipeline (Turkmenistan leg)",
    mode: "mixed",
    category: "trade",
    status: "operational",
    axisPairKeys: ["CHN|TKM"],
    sources: ["https://en.wikipedia.org/wiki/Central_Asia%E2%80%93China_gas_pipeline"],
    waypoints: [
      { lat: 38.8, lng: 63.0, name: "Bagtyyarlyk/Samandepe fields, Turkmenistan" },
      { lat: 39.77, lng: 64.42, name: "Bukhara, Uzbekistan" },
      { lat: 42.32, lng: 69.59, name: "Shymkent, Kazakhstan" },
      { lat: 44.21, lng: 80.41, name: "Khorgos border" },
      { lat: 43.826, lng: 87.617, name: "Urumqi" },
    ],
  },
  {
    id: "cpec",
    nameKo: "중국-파키스탄 경제회랑 (CPEC)",
    nameEn: "China–Pakistan Economic Corridor (CPEC)",
    mode: "mixed",
    category: "trade",
    status: "operational",
    axisPairKeys: ["CHN|PAK"],
    sources: ["https://en.wikipedia.org/wiki/China%E2%80%93Pakistan_Economic_Corridor"],
    note: "일대일로 기함 프로젝트. 카슈가르에서 콰다르항까지 카라코람 하이웨이를 따라 도로·에너지·항만 결합 회랑.",
    waypoints: [
      { lat: 39.47, lng: 75.99, name: "Kashgar, China" },
      { lat: 36.85, lng: 75.42, name: "Khunjerab Pass" },
      { lat: 35.92, lng: 74.31, name: "Gilgit" },
      { lat: 33.68, lng: 73.05, name: "Islamabad" },
      { lat: 24.86, lng: 67.01, name: "Karachi" },
      { lat: 25.13, lng: 62.32, name: "Gwadar Port" },
    ],
  },
  {
    id: "chn-sau-sea-route",
    nameKo: "사우디-중국 원유 해상항로",
    nameEn: "Saudi–China oil sea route",
    mode: "sea",
    category: "trade",
    status: "operational",
    axisPairKeys: ["CHN|SAU"],
    sources: ["주요 유조선 항로 근사 (호르무즈-말라카)"],
    waypoints: [
      { lat: 26.64, lng: 50.16, name: "Ras Tanura, Saudi Arabia" },
      { lat: 26.57, lng: 56.25, name: "Strait of Hormuz" },
      { lat: 15.0, lng: 65.0, name: "Arabian Sea" },
      { lat: 1.29, lng: 103.85, name: "Malacca Strait" },
      { lat: 29.87, lng: 121.55, name: "Ningbo, China" },
    ],
  },
  {
    id: "chn-are-sea-route",
    nameKo: "UAE-중국 무역·금융 해상항로",
    nameEn: "UAE–China trade/finance sea route",
    mode: "sea",
    category: "trade",
    status: "operational",
    axisPairKeys: ["ARE|CHN"],
    sources: ["주요 컨테이너 항로 근사 (호르무즈-말라카)"],
    waypoints: [
      { lat: 25.01, lng: 55.06, name: "Jebel Ali, UAE" },
      { lat: 26.57, lng: 56.25, name: "Strait of Hormuz" },
      { lat: 15.0, lng: 65.0, name: "Arabian Sea" },
      { lat: 1.29, lng: 103.85, name: "Malacca Strait" },
      { lat: 31.23, lng: 121.47, name: "Shanghai" },
    ],
  },
  {
    id: "kyaukpyu-pipeline",
    nameKo: "차우퓨-쿤밍 송유·가스관 (중-미얀마, 말라카 우회로)",
    nameEn: "Kyaukpyu–Kunming oil & gas pipeline (China–Myanmar Malacca bypass)",
    mode: "mixed",
    category: "trade",
    status: "operational",
    axisPairKeys: ["CHN|MMR"],
    sources: ["https://en.wikipedia.org/wiki/Sino-Myanmar_pipelines"],
    note: "중국이 말라카 해협을 거치지 않고 벵골만에서 바로 원유·가스를 들여오는 전략적 우회로. 2024년 충칭까지 연장 발표.",
    waypoints: [
      { lat: 19.43, lng: 93.55, name: "Kyaukpyu, Myanmar" },
      { lat: 21.98, lng: 96.08, name: "Mandalay" },
      { lat: 24.0, lng: 97.85, name: "Muse/Ruili border" },
      { lat: 25.04, lng: 102.71, name: "Kunming, China" },
    ],
  },
  {
    id: "irn-irq-route",
    nameKo: "테헤란-바그다드 육로 (이란 영향권)",
    nameEn: "Tehran–Baghdad overland route (Iranian sphere of influence)",
    mode: "road",
    category: "trade",
    status: "operational",
    axisPairKeys: ["IRN|IRQ"],
    sources: ["케르만샤-호스라비/메흐란 국경 통과 순례·교역로"],
    waypoints: [
      { lat: 35.689, lng: 51.389, name: "Tehran" },
      { lat: 34.314, lng: 47.065, name: "Kermanshah" },
      { lat: 33.98, lng: 46.05, name: "Khosravi/Mehran border" },
      { lat: 33.315, lng: 44.366, name: "Baghdad" },
      { lat: 32.616, lng: 44.024, name: "Karbala" },
    ],
  },
  {
    id: "irn-lbn-hezbollah-route",
    nameKo: "이란–레바논(헤즈볼라) 육상 보급로 (보도 기반)",
    nameEn: "Iran–Lebanon (Hezbollah) overland supply route (reported)",
    mode: "road",
    category: "military-logistics",
    status: "reported",
    axisPairKeys: ["IRN|LBN"],
    sources: ["다수 서방 국방·중동 싱크탱크 보도 (이라크-시리아 경유 회랑)"],
    waypoints: [
      { lat: 35.689, lng: 51.389, name: "Tehran" },
      { lat: 34.314, lng: 47.065, name: "Kermanshah" },
      { lat: 33.315, lng: 44.366, name: "Baghdad" },
      { lat: 35.336, lng: 40.147, name: "Deir ez-Zor" },
      { lat: 33.513, lng: 36.276, name: "Damascus" },
      { lat: 33.888, lng: 35.495, name: "Beirut" },
    ],
  },
  {
    id: "irn-yem-houthi-route",
    nameKo: "이란→후티(예멘) 무기밀수 해상로 (UN 보고 기반)",
    nameEn: "Iran→Houthi (Yemen) arms-smuggling sea route (per UN reporting)",
    mode: "sea",
    category: "military-logistics",
    status: "reported",
    axisPairKeys: ["IRN|YEM"],
    sources: ["UN 예멘 전문가패널 보고서 다수 (다우선 밀수 경로)"],
    waypoints: [
      { lat: 25.45, lng: 60.4, name: "Chabahar/Konarak, Iran" },
      { lat: 13.0, lng: 58.0, name: "Arabian Sea" },
      { lat: 10.0, lng: 52.0, name: "Somali basin transshipment zone" },
      { lat: 16.2, lng: 52.19, name: "Al Ghaydah/Nishtun, Yemen (al-Mahrah)" },
    ],
  },
  {
    id: "prk-syr-arms-sea-route",
    nameKo: "북한→시리아 군수 해상로 (수에즈 경유, 보도 기반)",
    nameEn: "DPRK→Syria arms sea route via Suez (reported)",
    mode: "sea",
    category: "military-logistics",
    status: "reported",
    axisPairKeys: ["PRK|SYR"],
    sources: ["UN 대북제재위 전문가패널 보고서 · 다수 언론 보도"],
    waypoints: [
      { lat: 38.74, lng: 125.41, name: "Nampo, DPRK" },
      { lat: 15.0, lng: 115.0, name: "South China Sea" },
      { lat: 1.29, lng: 103.85, name: "Malacca Strait" },
      { lat: 5.0, lng: 75.0, name: "Indian Ocean" },
      { lat: 12.6, lng: 43.4, name: "Bab-el-Mandeb" },
      { lat: 30.0, lng: 32.55, name: "Suez Canal" },
      { lat: 35.52, lng: 35.79, name: "Latakia, Syria" },
    ],
  },
  {
    id: "prk-yem-arms-sea-route",
    nameKo: "북한→예멘 군수 해상로 (보도 기반)",
    nameEn: "DPRK→Yemen arms sea route (reported)",
    mode: "sea",
    category: "military-logistics",
    status: "reported",
    axisPairKeys: ["PRK|YEM"],
    sources: ["UN 예멘/대북제재위 전문가패널 보고서"],
    waypoints: [
      { lat: 38.74, lng: 125.41, name: "Nampo, DPRK" },
      { lat: 15.0, lng: 115.0, name: "South China Sea" },
      { lat: 1.29, lng: 103.85, name: "Malacca Strait" },
      { lat: 5.0, lng: 70.0, name: "Indian Ocean" },
      { lat: 14.8, lng: 42.95, name: "Al Hudaydah, Yemen" },
    ],
  },
  {
    id: "chong-chon-gang-route",
    nameKo: "청천강호 사건 경로 (쿠바→파나마운하→북한, 2013)",
    nameEn: "Chong Chon Gang incident route (Cuba→Panama Canal→DPRK, 2013)",
    mode: "sea",
    category: "military-logistics",
    status: "reported",
    axisPairKeys: ["CUB|PRK"],
    sources: [
      "https://www.csis.org/analysis/smuggling-cuban-weapons-through-panama-canal-north-korea",
      "https://www.38north.org/2013/08/mhanham080113/",
    ],
    note: "2013년 쿠바산 무기(MiG-21 부품·미사일 관련 장비)를 설탕 포대 아래 숨겨 북한으로 이송하려다 파나마에서 나포된 실제 사건의 항로. 상시 운영 노선이 아니라 개별 사건임에 유의.",
    waypoints: [
      { lat: 23.13, lng: -82.35, name: "Havana, Cuba" },
      { lat: 9.36, lng: -79.9, name: "Colón (Panama Canal, Atlantic side)" },
      { lat: 8.95, lng: -79.57, name: "Balboa (Panama Canal, Pacific side)" },
      { lat: 10.0, lng: -140.0, name: "Pacific crossing" },
      { lat: 38.74, lng: 125.41, name: "Nampo, DPRK (intended destination)" },
    ],
  },
];

export function findCorridor(id: string): StrategicCorridor | undefined {
  return STRATEGIC_CORRIDORS.find((c) => c.id === id);
}
