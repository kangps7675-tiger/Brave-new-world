/**
 * 유럽 드론·영공 침범 핫스팟 (2025~2026).
 *
 * 러시아-우크라이나 전쟁의 부수 효과로 2025년 가을부터 계속되는 나토 영공·공항·
 * 군사기지 상공 드론 사건들 + 나토 비회원이지만 같은 접경 스필오버를 겪는 몰도바.
 * 폴란드·루마니아처럼 정부·나토가 공식적으로 러시아 기원으로 지목하고 요격까지
 * 한 사건이 있는가 하면, 대부분의 공항 폐쇄 사건은 출처가 끝내 밝혀지지 않았다 —
 * 그래서 RUSSIA_STRIKE_INCIDENTS와 마찬가지로
 * "자주 사건이 벌어지는 지점" 앵커만 두고, kind와 본문에 확인 여부를 명시한다.
 * 최신 GDELT 속보가 근처에 있을 때만 점등하고, 없으면 이 시드로 폴백한다.
 */

export type DroneIncidentKind =
  | "border-incursion" // 정부·나토가 공식 확인한 군용 드론의 영공 침범
  | "airport-disruption" // 공항 폐쇄를 부른 드론 목격 (출처 대부분 불상)
  | "military-site-sighting"; // 군사기지·핵시설 상공 드론 목격

export type EuropeDroneIncident = {
  id: string;
  kind: DroneIncidentKind;
  lat: number;
  lng: number;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  /** 0–1 · 리플 세기 (사건 중요도·빈도 근사) */
  intensity: number;
  sourceUrl?: string;
};

export const DRONE_INCIDENT_KIND_LABEL = {
  "border-incursion": { ko: "영공 침범 (공식 확인)", en: "Airspace incursion (confirmed)" },
  "airport-disruption": { ko: "공항 폐쇄 (출처 불상)", en: "Airport disruption (unattributed)" },
  "military-site-sighting": { ko: "군사기지 상공 목격", en: "Military-site sighting" },
} as const;

export const EUROPE_DRONE_INCIDENTS: EuropeDroneIncident[] = [
  {
    id: "ed-poland-lublin",
    kind: "border-incursion",
    lat: 51.6,
    lng: 23.05,
    titleKo: "폴란드 루블린주 (2025.9.9-10)",
    titleEn: "Lublin Voivodeship, Poland (9-10 Sep 2025)",
    bodyKo:
      "러시아 드론 19~23기가 폴란드 영공에 진입, 최소 4기가 네덜란드 F-35 등에 " +
      "요격됨 — 폴란드 정부·나토가 공식 확인한 사건. 나토 4조 협의·" +
      "'Eastern Sentry' 작전 개시로 이어짐.",
    bodyEn:
      "19-23 Russian drones entered Polish airspace; at least 4 shot down (mostly " +
      "by Dutch F-35s) — officially confirmed by Poland and NATO. Triggered NATO " +
      "Article 4 consultations and Operation Eastern Sentry.",
    intensity: 1,
    sourceUrl: "https://en.wikipedia.org/wiki/2025_Russian_drone_incursion_into_Poland",
  },
  {
    id: "ed-romania-tulcea",
    kind: "border-incursion",
    lat: 45.18,
    lng: 28.8,
    titleKo: "루마니아 다뉴브 삼각주 (2025.9)",
    titleEn: "Danube Delta, Romania (Sep 2025)",
    bodyKo: "루마니아 정부가 공식 확인한 러시아 드론 영공 침범 — F-16 스크램블 대응.",
    bodyEn: "Romanian-government-confirmed Russian drone airspace violation — F-16s scrambled.",
    intensity: 0.85,
    sourceUrl:
      "https://www.diplomatie.gouv.fr/en/presse-et-ressources/decouvrir-et-informer/actualites/roumanie-violation-de-l-espace-aerien-par-un-drone-russe",
  },
  {
    id: "ed-baltic-states",
    kind: "border-incursion",
    lat: 56.5,
    lng: 24.5,
    titleKo: "발트 3국·핀란드 상공",
    titleEn: "Baltic states & Finland airspace",
    bodyKo:
      "리투아니아·라트비아·에스토니아·핀란드 상공의 드론 침범 다수 보도 — 기원(러시아/" +
      "우크라이나발 이탈 드론 등)은 사건별로 다르게 보도됨, 출처 확정 이전.",
    bodyEn:
      "Multiple reported drone incursions over Lithuania/Latvia/Estonia/Finland — origin " +
      "(Russian vs. stray Ukrainian-origin drones) varies by report, unconfirmed.",
    intensity: 0.7,
    sourceUrl: "https://en.wikipedia.org/wiki/2026_Ukrainian_drone_incursions_into_the_Baltic_states_and_Finland",
  },
  {
    id: "ed-moldova-corridor",
    kind: "border-incursion",
    lat: 47.1,
    lng: 28.3,
    titleKo: "몰도바 (우크라이나 접경 회랑, 2022~)",
    titleEn: "Moldova (Ukraine-border corridor, since 2022)",
    bodyKo:
      "나토 비회원 중립국이지만 몰도바 국방부가 직접 집계·확인 — 전면전 개전 이후 " +
      "러시아·이란제 미사일·드론의 영공 침범 60건, 이 중 28건은 잔해가 실제 낙하, " +
      "12건은 폭발물 탑재 상태였다고 발표. 2026.5.13에는 드론 1기가 사우카(북부)로 " +
      "진입해 벌치·웅게니·인체슈티·카훌을 거쳐 지우르지울레슈티(루마니아·우크라 " +
      "접경)까지 약 1시간 동안 남하, 북·중부 영공이 일시 통제됨.",
    bodyEn:
      "Non-NATO neutral state, but the Moldovan Ministry of Defense itself tracks and " +
      "confirms the violations — 60 Russian/Iranian missile-and-drone airspace " +
      "incursions since the full-scale invasion began, with debris actually landing in " +
      "28 cases and explosives present in 12. On 13 May 2026 a drone crossed in near " +
      "Sauca in the north and tracked south for about an hour through Balti, Ungheni, " +
      "Hincesti and Cahul before vanishing near Giurgiulesti on the Romania-Ukraine " +
      "border, prompting a temporary airspace restriction over northern/central Moldova.",
    intensity: 0.7,
    sourceUrl: "https://ua.news/en/world/moldova-povidomila-pro-60-porushen-povitrianogo-prostoru-z-boku-rf",
  },
  {
    id: "ed-denmark-airports",
    kind: "airport-disruption",
    lat: 55.62,
    lng: 12.65,
    titleKo: "덴마크 공항권 (코펜하겐 등, 2025.9.22-27)",
    titleEn: "Danish airports (Copenhagen area, 22-27 Sep 2025)",
    bodyKo:
      "코펜하겐·올보르·빌룬·카루프 공항이 며칠 새 연쇄적으로 드론 목격으로 폐쇄. " +
      "덴마크 당국은 '유능한 행위자'로만 언급, 출처 미확정.",
    bodyEn:
      "Copenhagen, Aalborg, Billund and Karup airports closed in a rapid succession of " +
      "drone sightings over several days; Danish authorities cited a \"capable actor\" " +
      "but named no perpetrator.",
    intensity: 0.75,
    sourceUrl: "https://en.wikipedia.org/wiki/2025_European_drone_sightings",
  },
  {
    id: "ed-germany-munich",
    kind: "airport-disruption",
    lat: 48.35,
    lng: 11.79,
    titleKo: "뮌헨 공항 (2025.10.4, 이틀 연속 폐쇄)",
    titleEn: "Munich Airport (4 Oct 2025, closed twice in 24h)",
    bodyKo: "드론 목격으로 하루 새 두 차례 운항 중단, 승객 수천 명 영향 — 출처 미확정.",
    bodyEn: "Two separate drone-sighting suspensions within 24 hours affecting thousands of passengers; unattributed.",
    intensity: 0.72,
    sourceUrl: "https://en.wikipedia.org/wiki/2025_European_drone_sightings",
  },
  {
    id: "ed-belgium-netherlands-bases",
    kind: "military-site-sighting",
    lat: 51.17,
    lng: 5.47,
    titleKo: "벨기에·네덜란드 핵무기 저장 공군기지 (클레이너 브로헬·볼켈)",
    titleEn: "Belgian/Dutch nuclear-storage air bases (Kleine Brogel, Volkel)",
    bodyKo:
      "미군 전술핵 저장으로 알려진 나토 공군기지 상공에서 드론 다수 목격, 헬기·" +
      "재머 대응에도 격추·잔해 회수 없음 — 출처 미확정.",
    bodyEn:
      "Multiple drones sighted over NATO air bases reportedly hosting US tactical nuclear " +
      "storage; helicopters and jammers deployed but no drones downed or recovered — " +
      "unattributed.",
    intensity: 0.68,
    sourceUrl: "https://en.wikipedia.org/wiki/2025_European_drone_sightings",
  },
  {
    id: "ed-germany-kiel",
    kind: "military-site-sighting",
    lat: 54.32,
    lng: 10.13,
    titleKo: "독일 킬 (해군 조선·주 의회 상공)",
    titleEn: "Kiel, Germany (naval shipyard / state parliament area)",
    bodyKo: "티센크루프 조선소·킬 운하·주 의회 상공에서 드론 편대 목격 — 출처 미확정.",
    bodyEn: "Drone formations sighted over Thyssenkrupp's marine division, the Kiel Canal and the state parliament — unattributed.",
    intensity: 0.6,
    sourceUrl: "https://en.wikipedia.org/wiki/2025_European_drone_sightings",
  },
  {
    id: "ed-norway-bases",
    kind: "military-site-sighting",
    lat: 63.7,
    lng: 9.6,
    titleKo: "노르웨이 공군기지권 (외를란·브뢰뇌위순)",
    titleEn: "Norwegian air-base area (Ørland, Brønnøysund)",
    bodyKo: "F-35 기지 등 군 시설 상공에서 드론 목격 다수 — 출처 미확정.",
    bodyEn: "Multiple drone sightings over Norwegian military sites including an F-35 base — unattributed.",
    intensity: 0.55,
    sourceUrl: "https://en.wikipedia.org/wiki/2025_European_drone_sightings",
  },
  {
    id: "ed-france-ile-longue",
    kind: "military-site-sighting",
    lat: 48.29,
    lng: -4.49,
    titleKo: "프랑스 일롱그 해군기지 (전략핵잠수함 모항)",
    titleEn: "Île Longue naval base, France (SSBN home port)",
    bodyKo: "프랑스 전략핵잠수함 모항 상공에서 드론 5기 목격, 재머 투입에도 무력화 실패 — 출처 미확정.",
    bodyEn: "Five unidentified drones observed over France's ballistic-missile-submarine base; jammers deployed but drones not disabled — unattributed.",
    intensity: 0.62,
    sourceUrl: "https://en.wikipedia.org/wiki/2025_European_drone_sightings",
  },
];
