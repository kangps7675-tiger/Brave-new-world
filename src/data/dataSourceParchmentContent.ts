import type { LabelLanguage } from "@/lib/layerPrefs";
import { getSourceCatalogStats, SANCTIONS_ENTITY_SUMMARY } from "@/data/sourceCatalog";

export type DataSourceEntry = {
  name: string;
  body: string;
  warn?: boolean;
};

export type DataSourceSection = {
  id: string;
  title: string;
  intro: string;
  entries: DataSourceEntry[];
};

const SECTIONS_KO: DataSourceSection[] = [
  {
    id: "surveillance",
    title: "① 실시간 감시·추적",
    intro:
      "지도가 「지금 이 순간」을 주장하는 근거입니다. 전부 센서·트랜스폰더·위성이 자동으로 쏘는 신호입니다.",
    entries: [
      {
        name: "NASA FIRMS",
        body: "VIIRS 위성 열원(10분). 포격·산불 등 이상 고온 — 「무엇이 불탔는지」는 구분 못 함. 미 정부 퍼블릭 도메인.",
      },
      {
        name: "ADS-B",
        body: "adsb.lol(ODbL) 1순위. 군용기는 Turnstone ICAO 목록 보강. adsb.fi·airplanes.live는 2026-08-01 상업 조항 문제로 제거.",
      },
      {
        name: "MarineTraffic (AIS)",
        body: "상선 AIS 상업 API. 장애 시 aisstream.io. 유료 화면 노출 시 별도 계약 필요.",
      },
      {
        name: "AIS_Tracker",
        body: "AIS 끄거나 위장한 선박 OSINT(MIT). 실시간 위치가 아니라 알려진 시드와 대조.",
      },
      {
        name: "비상 스쿼크 7700/7600/7500",
        body: "adsb.lol 45초 폴링. 발신 시 지도 자동 fly·경보음.",
      },
      {
        name: "ReefWatch + OpenSky",
        body: "남중국해 77개 지형지물 근처 항적. OpenSky는 비상업·연구용 — 상업 노출 전 계약 필요.",
      },
      {
        name: "CelesTrak · The Space Devs · GPSJam.org",
        body: "정찰위성 TLE(SGP4), 로켓 발사 일정, ADS-B GNSS 오차로 GPS 재밍 「증상」 추정.",
      },
    ],
  },
  {
    id: "conflict",
    title: "② 분쟁·타격·공중경보",
    intro: "대부분 「보도·미확인」 꼬리표. 확인 좌표가 아니라 보도 근사치인 경우가 많습니다.",
    entries: [
      { name: "VIINA", body: "우크라 전선 통제구역(ODbL). 서버 해치 후 결과만 전달." },
      { name: "Tzeva Adom", body: "이스라엘 Pikud HaOref 비공식 JSON. 상업 이용 시 정식 문의 필요." },
      { name: "NEPTUN", body: "우크라 공중위협 WebSocket. 공식 경보 대체 아님." },
      { name: "UKMTO", body: "홍해·호르무즈 상선 피격 경보. 비공식 엔드포인트 — 수익화 전 정식 피드 요청 원칙." },
      { name: "NAVAREA · 군사훈련", body: "일본·미 NGA 경보 30분 갱신. 훈련은 announced / announced_osint / unverified 등급." },
      {
        name: "한반도·우크라→러·중국권역 사건",
        body: "GDELT + 시드 앵커 매칭. 탄착점이 아닌 발생·보도 좌표. 전부 보도·미확인.",
      },
      { name: "대만해협 타임라인", body: "GDELT Doc 2.0 + 자동 요약. 「자동 요약·오보 가능」 고지." },
      {
        name: "UCDP GED",
        body: "카탈로그엔 검증 사망 이벤트로 적혀 있으나, 배포 중인 건 데모 15건(sigint-snapshot)뿐. 진짜 UCDP는 30만 건+.",
        warn: true,
      },
      { name: "Mediazona×BBC · CSIS", body: "러 전사자 실명(하한) · 부상 추정. 언론 저작물 — 재배포 조건 별도." },
      { name: "핵탄두 보유량", body: "Our World in Data(FAS Nuclear Notebook 인용) 연간 집계." },
    ],
  },
  {
    id: "infra",
    title: "③ 인프라·에너지·자원",
    intro: "전쟁이 물리적으로 부딪히는 땅 위의 물건들입니다.",
    entries: [
      { name: "군사기지 / 핵시설", body: "OSM + IAEA·NTI. 핵시설 재배포 조건 미확인 — 상업 노출 보류." },
      { name: "Safecast", body: "원전 인근 µSv/h. CC BY." },
      { name: "미사일 사일로·기지", body: "중·러·인·파 공개 연구·NTI 트래커. 재배포 조건 미확인." },
      { name: "파이프라인 · LNG · 해저", body: "Global Energy Monitor(CC BY 4.0) + EMODnet. 확대 시 OSM Overpass 겹침." },
      { name: "핵심광물", body: "USGS + 자체 큐레이션 외곽. 지질도가 아니라 「대략 이 구역」 주제도." },
      { name: "AI 데이터센터", body: "위키데이터(CC0) + OSM, 50km 클러스터." },
      {
        name: "인터넷 교환점(IXP)",
        body: "PeeringDB라고 적혀 있으나 배포 파일은 합성 5건(시청 좌표). 진짜 IXP 1,000+ 미연결.",
        warn: true,
      },
      { name: "해저터널", body: "유로터널·세이칸 등 자체 시드 — 저작권 문제 없음." },
    ],
  },
  {
    id: "trade",
    title: "④ 무역·경제(지경학)",
    intro: "무엇이 어떻게 흐르는가를 보여주는 축입니다.",
    entries: [
      { name: "IMF PortWatch", body: "병목 구간 7일 vs 30일 통행량 스트레스. 공개 데이터." },
      { name: "Critical Node Atlas", body: "31개 전략 병목(MIT 오픈)." },
      { name: "Global Shipping Lanes", body: "Benden/Zenodo(CC BY 4.0) 정적 항로 — 실시간 AIS 아님." },
      { name: "경제 허브 지수", body: "위키·OSM·세계은행 CC BY 4.0 조합." },
      { name: "Statistics of the World API", body: "국가 거시지표 유료 API — 상업 조건 별도 확인." },
      { name: "한국 관세청(KCS)", body: "HS 수출입. 공공누리 확인 전 — 유료 노출 보류." },
      { name: "Global Trade Alert", body: "무역정책 2차 자료(CC BY 4.0). API는 비상업 무료 — 상업 승인 필요. R/A/G는 GTA 판단." },
      { name: "한국은행 ECOS · KOSIS · PORT-MIS", body: "환율·금리·항만 실적. 라이선스 최종 확인 전." },
    ],
  },
  {
    id: "axis",
    title: "⑤ 축·코리도 백엔드",
    intro: "sourceCatalog.ts에는 아직 없지만 CRINK·코리도에 쓰는 자료입니다.",
    entries: [
      { name: "SIPRI 무기이전", body: "축 arms 관계선 근거. 상업 이용 SIPRI 승인 필요(진행 중)." },
      { name: "OSM(Geofabrik)", body: "코리도 실측 스냅(ODbL). BY·UA 완료, RU·아시아 등 진행 중." },
      { name: "UN Comtrade · UNCTAD · Ocean Trade", body: "corridor-ranks.json 신뢰도. PortWatch 4코리도 · Eurostat 철도 10페어 · Comtrade 33 · LSBCI 23 등 반영." },
      { name: "DeepStateMap.live", body: "라이선스 검토 완료, 코드 통합 전. VIINA 병행/대체 후보." },
      { name: "ACLED", body: "상업 이용 금지 약관으로 제품에서 완전 제거. API 410." },
    ],
  },
  {
    id: "sanctions",
    title: "⑥ 제재·분쟁지대",
    intro: "",
    entries: [
      {
        name: "제재 대상",
        body:
          `OFAC·UN 실명단 ${SANCTIONS_ENTITY_SUMMARY.total.toLocaleString()}건 ` +
          `(OFAC ${SANCTIONS_ENTITY_SUMMARY.ofac.toLocaleString()} · UN ${SANCTIONS_ENTITY_SUMMARY.un.toLocaleString()}). ` +
          `좌표 있는 건 ${SANCTIONS_ENTITY_SUMMARY.withCoords}건만 지도 핀 — 나머지는 관할권 집계(국가 음영). EU·UK 명단 없음.`,
      },
      { name: "무기금수구역 · 난민캠프", body: "UN·EU·UK·미 공식 + 위키·UNHCR." },
      { name: "분쟁지대 히트맵", body: "Natural Earth + GDELT 밀도 자체 휴리스틱. 외부 AI 없음." },
      { name: "분쟁 핫스팟 · 중동", body: "외부 GeoJSON + IRONSIGHT(MIT) 참조." },
      {
        name: "확전 신호(자체)",
        body: "RAND 문헌 기준 파생 지표. 확전 판정 아님 — 근거 문장 공개. 100% 자체 저작.",
      },
      {
        name: "GTS(글로벌 긴장 점수)",
        body: "IEP 테러 지수(GTI)가 아닌 자체 Global Tension Score. FIRMS·텔레그램·GDELT 등 공개 신호를 최근 90일 평소와 비교해 0–100으로 묶음. 출처 패널에 설명 공개.",
      },
    ],
  },
  {
    id: "news",
    title: "⑦ 뉴스·OSINT",
    intro: "",
    entries: [
      { name: "지정학 RSS(~60)", body: "90초 캐시, 220자 스니펫+원문. 대부분 비상업 RSS — 상업 재배포·번역 확인 필요." },
      { name: "유튜브 영상뉴스", body: "BBC·로이터 등 Atom. 임베드만, 다운로드 없음." },
      { name: "경제 RSS", body: "반도체·빅테크·해운 등 키워드 큐레이션." },
      { name: "텔레그램 OSINT", body: "IRONSIGHT(MIT) 채널 목록. 본문은 절반만 스니펫." },
      { name: "CRINK 허브 모니터", body: "CSIS·NTI·38N·AMTI·ISW 등 6시간 RSS. 제목·요약·링크만." },
    ],
  },
  {
    id: "render",
    title: "⑧ 지도 렌더링",
    intro: "정보가 아니라 지도를 그리는 재료입니다.",
    entries: [
      {
        name: "OpenFreeMap · Esri · AWS Terrain · Cesium OSM · Natural Earth",
        body: "벡터·위성·DEM·3D·국경. Esri 상업 재배포 시 약관 확인.",
      },
    ],
  },
];

const SECTIONS_EN: DataSourceSection[] = [
  {
    id: "surveillance",
    title: "① Live tracking",
    intro:
      "What backs “right now” on the map — sensor, transponder, and satellite feeds, not human curation.",
    entries: [
      { name: "NASA FIRMS", body: "VIIRS heat (10 min). Shells and wildfires look alike — heat only. US public domain." },
      { name: "ADS-B", body: "adsb.lol (ODbL) first. Military ICAO via Turnstone. adsb.fi / airplanes.live removed Aug 2026 (commercial terms)." },
      { name: "MarineTraffic (AIS)", body: "Commercial AIS API; aisstream.io fallback. Separate contract for paid product." },
      { name: "AIS_Tracker", body: "Dark-fleet OSINT (MIT). Known seeds vs live AIS — not guaranteed current position." },
      { name: "Emergency squawks", body: "7700/7600/7500 poll every 45s — auto fly + alert sound." },
      { name: "ReefWatch + OpenSky", body: "SCS features vs nearby traffic. OpenSky non-commercial — contract before commercial use." },
      { name: "CelesTrak · Space Devs · GPSJam", body: "Recon TLE (SGP4), launch schedule, GPS jam inferred from GNSS error in ADS-B." },
    ],
  },
  {
    id: "conflict",
    title: "② Conflict · strikes · air alerts",
    intro: "Most layers tagged “reported · unverified”. Coordinates are often approximate.",
    entries: [
      { name: "VIINA", body: "Ukraine control polygons (ODbL). Server-side hatch only." },
      { name: "Tzeva Adom", body: "Unofficial Pikud HaOref JSON — commercial use needs official channel." },
      { name: "NEPTUN", body: "Ukraine air-threat WebSocket — not a replacement for official alerts." },
      { name: "UKMTO", body: "Red Sea / Hormuz maritime attacks. Unofficial endpoint — formal feed before monetization." },
      { name: "NAVAREA · exercises", body: "JP / US NGA every 30 min. Training: announced / osint / unverified tiers." },
      { name: "Korea · RU strikes · China theater", body: "GDELT + anchor seeds. Report coordinates, not impact points." },
      { name: "Taiwan Strait timeline", body: "GDELT Doc 2.0 auto summaries — misreport risk disclosed." },
      {
        name: "UCDP GED",
        body: "Catalog says verified deaths; shipped file is 15 demo rows (sigint-snapshot). Real UCDP has 300k+ events.",
        warn: true,
      },
      { name: "Mediazona×BBC · CSIS", body: "Russian KIA names (lower bound) · casualty estimates. Media rights apply." },
      { name: "Nuclear warhead counts", body: "Our World in Data (FAS Nuclear Notebook)." },
    ],
  },
  {
    id: "infra",
    title: "③ Infrastructure · energy · resources",
    intro: "Physical objects war touches on the ground.",
    entries: [
      { name: "Military bases / nuclear", body: "OSM + IAEA/NTI. Nuclear redistribution terms unclear — commercial hold." },
      { name: "Safecast", body: "µSv/h near major plants. CC BY." },
      { name: "Missile silos / bases", body: "Open research + NTI tracker. Redistribution TBD." },
      { name: "Pipelines · LNG · subsea", body: "Global Energy Monitor (CC BY 4.0) + EMODnet; OSM Overpass when zoomed." },
      { name: "Critical minerals", body: "USGS + curated belts — thematic, not geological survey." },
      { name: "AI data centers", body: "Wikidata (CC0) + OSM clusters." },
      {
        name: "Internet exchanges (IXP)",
        body: "Docs say PeeringDB; live file is 5 synthetic city-hall points. 1,000+ real IXPs not wired.",
        warn: true,
      },
      { name: "Subsea tunnels", body: "In-house seed (Channel, Seikan, etc.)." },
    ],
  },
  {
    id: "trade",
    title: "④ Trade · geoeconomics",
    intro: "What moves, how, and through which chokepoints.",
    entries: [
      { name: "IMF PortWatch", body: "7d vs 30d transit stress at chokepoints. Open data." },
      { name: "Critical Node Atlas", body: "31 strategic nodes (MIT open)." },
      { name: "Global Shipping Lanes", body: "Benden/Zenodo (CC BY 4.0) static lanes — not live AIS." },
      { name: "Economic hub index", body: "Wiki + OSM + World Bank (CC BY 4.0)." },
      { name: "Statistics of the World", body: "Paid macro API — confirm commercial terms." },
      { name: "Korea Customs (KCS)", body: "HS trade stats — public license check pending." },
      { name: "Global Trade Alert", body: "Policy coding (CC BY 4.0). API free for non-commercial; R/A/G is GTA judgment." },
      { name: "BOK ECOS · KOSIS · PORT-MIS", body: "FX, rates, port throughput — license pending." },
    ],
  },
  {
    id: "axis",
    title: "⑤ Axis · corridor backend",
    intro: "Not yet in sourceCatalog.ts but powers CRINK / corridor layers.",
    entries: [
      { name: "SIPRI arms transfers", body: "Axis “arms” edges. Commercial use needs SIPRI approval (in progress)." },
      { name: "OSM (Geofabrik)", body: "Corridor geometry snap (ODbL). BY/UA done; RU/Asia in progress." },
      { name: "UN Comtrade · UNCTAD", body: "corridor-ranks.json. PortWatch 4 corridors · Eurostat rail 10 pairs · Comtrade 33 · LSBCI 23 hits." },
      { name: "DeepStateMap.live", body: "License reviewed; code not integrated. VIINA alternative candidate." },
      { name: "ACLED", body: "Removed from product — commercial terms. API returns 410." },
    ],
  },
  {
    id: "sanctions",
    title: "⑥ Sanctions · dispute zones",
    intro: "",
    entries: [
      {
        name: "Sanctions targets",
        body:
          `OFAC + UN lists: ${SANCTIONS_ENTITY_SUMMARY.total.toLocaleString()} entities ` +
          `(OFAC ${SANCTIONS_ENTITY_SUMMARY.ofac.toLocaleString()} · UN ${SANCTIONS_ENTITY_SUMMARY.un.toLocaleString()}). ` +
          `Only ${SANCTIONS_ENTITY_SUMMARY.withCoords} have map pins — rest roll up by jurisdiction (country shading). No EU/UK lists yet.`,
      },
      { name: "Arms embargoes · refugee camps", body: "Official lists + Wiki/UNHCR." },
      { name: "Dispute heatmap", body: "Natural Earth + GDELT density heuristic — no external AI." },
      { name: "Hotspots · Middle East", body: "External GeoJSON + IRONSIGHT (MIT) reference." },
      { name: "Escalation signals (in-house)", body: "RAND-informed derivative — not a verdict; evidence strings shown." },
      {
        name: "GTS (Global Tension Score)",
        body: "Not IEP’s terrorism index (GTI) — our own 0–100 score from public FIRMS, Telegram, GDELT vs a ~90-day baseline. Explained in the Sources panel.",
      },
    ],
  },
  {
    id: "news",
    title: "⑦ News · OSINT",
    intro: "",
    entries: [
      { name: "Geopolitics RSS (~60)", body: "90s cache, 220-char snippet + link. Most feeds non-commercial — check before paid redistribution." },
      { name: "YouTube video news", body: "Official Atom feeds — embed only." },
      { name: "Economy RSS", body: "Chips, big tech, shipping keywords." },
      { name: "Telegram OSINT", body: "IRONSIGHT (MIT) channel list — partial snippets only." },
      { name: "CRINK hub monitor", body: "CSIS, NTI, 38N, AMTI, ISW, etc. — 6h RSS title/summary/link." },
    ],
  },
  {
    id: "render",
    title: "⑧ Map rendering",
    intro: "Basemap and terrain — not intelligence content.",
    entries: [
      {
        name: "OpenFreeMap · Esri · AWS Terrain · Cesium · Natural Earth",
        body: "Vector, imagery, DEM, 3D buildings, borders. Esri commercial redistribution needs terms check.",
      },
    ],
  },
];

export const DATA_SOURCE_FOOTNOTE = {
  ko: [
    "정상 작동: sourceCatalog 50개 중 43개 shipped.",
    "⚠ 가짜·데모로 표시 중 2개: UCDP GED, IXP.",
    "제재 명단: OFAC·UN 19,709건 반영(좌표 268). EU·UK 없음.",
    "제거 1개: ACLED(상업 약관).",
    "연동 전 5개: KCS, ECOS, KOSIS, PORT-MIS, GTA API.",
    "MarineTraffic·OpenSky·언론 RSS 등 — 상업 이용 별도 계약·확인 필요.",
    "우리는 완벽한 정보기관이 아닙니다. 이만큼의 재료로 이만큼을 보여주는 서비스입니다.",
  ],
  en: [
    "Shipped: 43 of 50 sourceCatalog entries.",
    "⚠ Demo/placeholder (2): UCDP GED, IXP.",
    "Sanctions: OFAC+UN 19,709 entities (268 with coords). No EU/UK lists.",
    "Removed (1): ACLED (commercial terms).",
    "Planned (5): KCS, ECOS, KOSIS, PORT-MIS, GTA API.",
    "MarineTraffic, OpenSky, news RSS, etc. — separate commercial clearance.",
    "We are not a perfect intelligence agency — only what these sources allow us to show.",
  ],
} as const;

/** shipped/planned/blocked 건수를 카탈로그에서 읽어 각주를 갱신한다. */
export function dataSourceFootnoteLines(lang: LabelLanguage): string[] {
  const stats = getSourceCatalogStats();
  const ko = lang !== "en";
  const s = SANCTIONS_ENTITY_SUMMARY;
  if (ko) {
    return [
      `정상 작동: sourceCatalog ${stats.total}개 중 ${stats.shipped}개 shipped.`,
      "⚠ 가짜·데모로 표시 중 2개: UCDP GED, IXP.",
      `제재 명단: OFAC·UN ${s.total.toLocaleString()}건 반영(좌표 ${s.withCoords}). EU·UK 없음.`,
      "제거 1개: ACLED(상업 약관).",
      `연동 전 ${stats.planned}개: KCS, ECOS, KOSIS, PORT-MIS, GTA API 등.`,
      "MarineTraffic·OpenSky·언론 RSS 등 — 상업 이용 별도 계약·확인 필요.",
      "우리는 완벽한 정보기관이 아닙니다. 이만큼의 재료로 이만큼을 보여주는 서비스입니다.",
    ];
  }
  return [
    `Shipped: ${stats.shipped} of ${stats.total} sourceCatalog entries.`,
    "⚠ Demo/placeholder (2): UCDP GED, IXP.",
    `Sanctions: OFAC+UN ${s.total.toLocaleString()} entities (${s.withCoords} with coords). No EU/UK lists.`,
    "Removed (1): ACLED (commercial terms).",
    `Planned (${stats.planned}): KCS, ECOS, KOSIS, PORT-MIS, GTA API, etc.`,
    "MarineTraffic, OpenSky, news RSS, etc. — separate commercial clearance.",
    "We are not a perfect intelligence agency — only what these sources allow us to show.",
  ];
}

export function dataSourceSections(lang: LabelLanguage): DataSourceSection[] {
  return lang === "en" ? SECTIONS_EN : SECTIONS_KO;
}
