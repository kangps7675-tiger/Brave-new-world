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
      "지도가 「지금」을 말할 때 쓰는 눈입니다. 사람이 손으로 그린 그림이 아니라, 위성·항공기·선박이 자동으로 보내는 신호입니다.",
    entries: [
      {
        name: "NASA FIRMS",
        body: "인공위성이 약 10분마다 찍은 「뜨거운 점」입니다. 포격·산불·공장 화재가 같은 점으로 보일 수 있어, 무엇이 탔는지는 말하지 않습니다. 미국 정부가 공개한 자료입니다.",
      },
      {
        name: "ADS-B (항공기 위치)",
        body: "여객기·화물기가 스스로 알리는 위치 신호입니다. 민간 공개망(adsb.lol)을 우선 쓰고, 군용 기체는 공개 목록으로 보강합니다. 상업 조건이 애매한 다른 공개망은 빼 두었습니다.",
      },
      {
        name: "선박 AIS (MarineTraffic 등)",
        body: "상선이 보내는 위치·침로 신호입니다. 유료 API를 쓰고, 장애 시 공개 스트림으로 넘깁니다. 화면을 유료로 팔 때는 별도 계약이 필요합니다.",
      },
      {
        name: "AIS 끄거나 위장한 배",
        body: "신호를 끄거나 이름을 바꿔 다니는 배로 알려진 사례를 공개 OSINT와 맞춰 봅니다. 「지금 GPS」가 아니라 「알려진 패턴」에 가깝습니다.",
      },
      {
        name: "비상 스쿼크 7700/7600/7500",
        body: "항공기가 「긴급·통신장애·납치」를 알리는 특수 코드입니다. 감지되면 지도가 그쪽으로 움직이고 경보음이 납니다.",
      },
      {
        name: "남중국해 ReefWatch + OpenSky",
        body: "인공섬·암초 근처를 지나는 항적을 봅니다. 연구·비상업용 공개망이라, 상업 서비스로 키우기 전엔 계약이 더 필요합니다.",
      },
      {
        name: "정찰위성 · 발사 · GPS 이상",
        body: "공개 궤도 요소로 정찰위성 위치를 추정하고, 발사 일정을 표시하며, ADS-B의 GPS 오차로 「재밍 증상」을 가늠합니다. 확정이 아니라 추정입니다.",
      },
    ],
  },
  {
    id: "conflict",
    title: "② 분쟁·타격·공중경보",
    intro:
      "대부분 「보도·미확인」 꼬리표가 붙습니다. 점이 찍힌 곳이 탄착점이 아니라, 보도가 가리킨 대략의 위치인 경우가 많습니다.",
    entries: [
      {
        name: "우크라이나 전선 (VIINA)",
        body: "누가 어느 마을·도로를 잡고 있다는 공개 통제 지도를 해치로 그립니다. 실시간 CCTV가 아닙니다.",
      },
      {
        name: "이스라엘 공습경보 (Tzeva Adom)",
        body: "비공식으로 공개되는 경보 JSON을 이어 받습니다. 상업 이용 전에는 정식 채널 확인이 필요합니다.",
      },
      {
        name: "우크라이나 공중위협 (NEPTUN)",
        body: "공중 위협 알림을 실시간으로 받습니다. 국가 공식 경보 앱을 대신하지 않습니다.",
      },
      {
        name: "홍해·호르무즈 상선 경보 (UKMTO)",
        body: "상선이 피격·위협받았다는 해상 경보입니다. 비공식 주소로 읽고 있어, 수익화 전에는 정식 피드를 요청하는 것이 원칙입니다.",
      },
      {
        name: "항행경보 · 군사훈련",
        body: "바닷길 위험과 「훈련합니다」 공지를 약 30분마다 갱신합니다. 훈련은 공식 발표 / OSINT / 미확인으로 등급을 나눕니다.",
      },
      {
        name: "한반도·러 타격·중국권 사건",
        body: "뉴스 데이터베이스와 미리 잡아 둔 장소를 맞춰 점을 찍습니다. 탄이 떨어진 좌표가 아니라, 보도가 말한 발생·보도 위치입니다.",
      },
      {
        name: "대만해협 타임라인",
        body: "공개 뉴스 문서를 모아 짧게 요약합니다. 자동 요약이라 오보·과장 가능성이 있어 화면에 고지합니다.",
      },
      {
        name: "UCDP 사망 사건",
        body: "카탈로그에는 「검증된 사망 사건」으로 적혀 있으나, 지금 배포 파일은 데모 몇 건뿐입니다. 진짜 전체 자료는 아직 연결하지 않았습니다.",
        warn: true,
      },
      {
        name: "러 전사자·부상 추정",
        body: "언론이 공개한 실명·추정입니다. 재배포·화면 이용에는 언론 저작권 조건이 따릅니다.",
      },
      {
        name: "핵탄두 보유량",
        body: "공개 연구(연간)를 인용한 보유량 그래프입니다. 오늘의 「발사 준비」가 아닙니다.",
      },
    ],
  },
  {
    id: "infra",
    title: "③ 인프라·에너지·자원",
    intro: "전쟁이 실제로 부딪히는 땅 위의 물건들 — 기지, 관, 광물, 데이터센터입니다.",
    entries: [
      {
        name: "군사기지 / 핵시설",
        body: "지도·공개 기관 목록을 바탕으로 위치를 표시합니다. 핵시설은 재배포 조건이 애매해 상업 노출을 보류한 항목이 있습니다.",
      },
      {
        name: "Safecast 방사선",
        body: "원전 주변에서 측정된 방사선량(µSv/h)입니다. 시민 과학 공개 자료입니다.",
      },
      {
        name: "미사일 사일로·기지",
        body: "공개 연구와 트래커를 모은 추정 위치입니다. 「오늘 발사대」가 아닙니다.",
      },
      {
        name: "파이프라인 · LNG · 해저",
        body: "가스·석유가 지상·바다 아래로 지나가는 길을 그립니다. 가까이 확대하면 더 촘촘한 공개 지도가 겹칩니다.",
      },
      {
        name: "핵심광물",
        body: "어디에 중요한 광물이 많은지 「대략 이 띠」로 보여 줍니다. 정밀 지질도가 아닙니다.",
      },
      {
        name: "AI 데이터센터",
        body: "공개 위키·지도에서 모은 대형 컴퓨팅 시설을 묶어 표시합니다.",
      },
      {
        name: "인터넷 교환점(IXP)",
        body: "문서에는 대규모 공개 DB를 쓴다고 되어 있으나, 지금 배포 파일은 도시 시청 좌표 데모 몇 건입니다. 진짜 교환점 전체는 아직 연결하지 않았습니다.",
        warn: true,
      },
      {
        name: "해저터널",
        body: "유로터널·세이칸 등 잘 알려진 터널을 자체 목록으로 올렸습니다.",
      },
    ],
  },
  {
    id: "trade",
    title: "④ 무역·경제(지경학)",
    intro: "물건과 돈이 어디를 지나가는지 — 좁은 길목과 무역 규칙을 보여 줍니다.",
    entries: [
      {
        name: "IMF PortWatch",
        body: "호르무즈·수에즈 같은 좁은 바다 길목에서, 배가 평소보다 많이/적게 지나는지를 봅니다. 공개 관측입니다.",
      },
      {
        name: "전략 병목 지도",
        body: "세계 물류에서 「여기가 막히면 아프다」는 길목 목록입니다.",
      },
      {
        name: "세계 항로선",
        body: "배가 자주 다니는 길을 정적으로 그려 둔 것입니다. 지금 이 순간 AIS 배 위치가 아닙니다.",
      },
      {
        name: "경제 허브 지수",
        body: "항만·도시·무역 거점을 공개 통계와 지도로 묶은 요약입니다.",
      },
      {
        name: "국가 거시지표 API",
        body: "나라별 경제 숫자를 가져오는 유료 창구입니다. 상업 이용 조건은 따로 확인합니다.",
      },
      {
        name: "한국 관세청·한은·항만 통계",
        body: "수출입·환율·항만 실적 같은 공공 숫자입니다. 라이선스 최종 확인 전이라 일부는 아직 화면 연결을 보류합니다.",
      },
      {
        name: "Global Trade Alert",
        body: "누가 관세·보조금·수출통제를 바꿨는지 정리한 2차 자료입니다. 「좋음/나쁨」 색은 그 기관의 판단입니다.",
      },
    ],
  },
  {
    id: "axis",
    title: "⑤ 축·회랑 백엔드",
    intro: "CRINK 축과 육상·해상 회랑을 그릴 때 뒤에서 쓰는 재료입니다.",
    entries: [
      {
        name: "무기 이전 (SIPRI)",
        body: "누가 누구에게 무기를 넘겼는지 공개 통계입니다. 상업 화면에는 승인 절차가 필요합니다.",
      },
      {
        name: "OpenStreetMap 도로·철도",
        body: "회랑이 실제로 지나는 길을 맞출 때 씁니다. 일부 나라는 작업이 끝났고, 일부는 진행 중입니다.",
      },
      {
        name: "무역·해운·철도 통계",
        body: "회랑 「얼마나 중요한가」 점수를 만들 때 UN·유럽·해운 공개표를 섞습니다.",
      },
      {
        name: "DeepStateMap / ACLED",
        body: "DeepState는 검토만 끝났고 코드에 넣기 전입니다. ACLED는 상업 약관 때문에 제품에서 뺐습니다.",
      },
    ],
  },
  {
    id: "sanctions",
    title: "⑥ 제재·분쟁지대",
    intro: "누가 제재 명단에 있는지, 어디가 분쟁·금수 구역인지 보여 줍니다.",
    entries: [
      {
        name: "제재 대상",
        body:
          `미국(OFAC)·유엔 실명단을 합쳐 ${SANCTIONS_ENTITY_SUMMARY.total.toLocaleString()}건을 반영했습니다. ` +
          `지도 핀이 찍히는 건 좌표가 있는 ${SANCTIONS_ENTITY_SUMMARY.withCoords}건뿐이고, 나머지는 나라 단위로만 모아 봅니다. 유럽·영국 명단은 아직 없습니다.`,
      },
      {
        name: "무기금수 · 난민캠프",
        body: "공식 금수 구역과 공개된 캠프 위치를 올립니다.",
      },
      {
        name: "분쟁 히트맵 · 핫스팟",
        body: "공개 지도와 뉴스 밀도로 「어디가 뜨거운지」를 색으로 보여 줍니다. 외부 AI가 그린 그림이 아닙니다.",
      },
      {
        name: "확전 신호(자체)",
        body: "공개 문헌을 참고해 만든 「분위기가 고조되는지」 보조 지표입니다. 확전 판결이 아닙니다.",
      },
      {
        name: "긴장지수(GTS)",
        body: "유명 테러 지수와 다른, 이 서비스만의 0~100 점수입니다. 전장 신호와 최근 90일 평소를 비교해 만듭니다. 칩을 누르면 더 쉽게 풀어 설명합니다.",
      },
    ],
  },
  {
    id: "news",
    title: "⑦ 뉴스·OSINT",
    intro: "헤드라인과 현장 채널 — 지도 위의 「글」을 채웁니다.",
    entries: [
      {
        name: "지정학·경제 RSS",
        body: "신뢰할 만한 매체 RSS를 모아 짧은 요약과 원문 링크를 보여 줍니다. 유료 재배포·번역은 매체마다 조건이 다릅니다.",
      },
      {
        name: "유튜브·텔레그램",
        body: "공식 영상 피드와 OSINT 채널 목록입니다. 영상은 임베드만, 텔레그램은 일부 문장만 보여 저작권을 지킵니다.",
      },
      {
        name: "CRINK 허브 모니터",
        body: "싱크탱크·전문 매체의 제목·요약·링크를 몇 시간마다 갱신합니다.",
      },
    ],
  },
  {
    id: "news-ko-flash",
    title: "⑧ 한글·신속속보 설계",
    intro:
      "한글 모드에서 뉴스를 어떻게 보여 주는지, 신속속보 양피지가 무엇을 쓰는지 — 코드에 박아 둔 동작입니다. 설정으로 끄지 않습니다.",
    entries: [
      {
        name: "① 한글 모드 번역 (등불 · RSS)",
        body: "등불은 점화 직전에 제목·카드 제목·요약을 한글로 맞춥니다. 하단 RSS 스택은 브라우저가 Google을 직접 부르지 않고, 서버 `/api/translate-text` 프록시로 배치 번역합니다. 영문 모드에서는 원문을 유지합니다.",
      },
      {
        name: "② 신속속보 — 6하원칙 상세 브리핑",
        body: "속보 양피지 본문은 누가·무엇을·언제·어디서·왜·어떻게 구조로 20단락 이상 씁니다. 출처·경과 시간·Tier 검증 메모를 넣고, 제목·요약·전장 신호만 사용합니다. 없는 사실을 지어내지 않습니다.",
      },
      {
        name: "③ 뉴스 검증 티어 (다음 책갈피)",
        body: "Tier 1·2·3 편집독립·당사자성 설계는 바로 다음 「⑨ 뉴스 검증 티어」 책갈피에 자세히 적혀 있습니다. 등불·속보·RSS 카드의 T1/T2/T3 뱃지와 같은 축입니다.",
      },
    ],
  },
  {
    id: "news-tiers",
    title: "⑨ 뉴스 검증 티어",
    intro:
      "뉴스를 「얼마나 믿을지」를 점수화하지 않습니다. 대신 편집독립·당사자성으로 Tier 1·2·3을 나누고, 교차 확인·속보 등급에 씁니다. 지도 레이어의 관측·보도·미확인 꼬리표와는 다른 축입니다.",
    entries: [
      {
        name: "설계 원칙",
        body: "국적과 무관하게 같은 잣대를 씁니다. 「우리 편 공보실」도 Tier 3이고, 「상대 국영통신」도 Tier 3입니다. 자국 정부를 비판할 수 있는 독립 와이어·대형 매체는 Tier 1입니다.",
      },
      {
        name: "Tier 1 · 기본 근거",
        body: "게이트키핑을 거친 국제 통신사·대형 독립매체(예: Reuters·AP·AFP·BBC·NYT·연합 등). AI 요약·등불·신속속보의 기본 뼈대로 우선합니다. 정부·군 공보실 발표는 국적과 무관하게 Tier 1이 아닙니다.",
      },
      {
        name: "Tier 2 · 보완 취재",
        body: "실제 취재하되 특정 주제에서 편집 방향 논란이 반복 관찰되는 매체·민간 OSINT·안보연구소. Tier 1이 얇을 때 보완하고, Tier 1 교차가 쌓이면 무게가 올라갑니다.",
      },
      {
        name: "Tier 3 · 당사자·국영·공보",
        body: "국영 방송·국영 통신·당·군 공보(예: TASS·신화·조선중앙통신·각국 국방부·사령부 보도자료). 「그 쪽의 말」로 읽고, 독립 매체 교차 전에는 단정하지 않습니다. 속보 히어로에서 Tier 3만이면 등급을 낮추거나 보류합니다.",
      },
      {
        name: "화면에 쓰는 방식",
        body: "카드에 T1/T2/T3 뱃지, 클러스터에 Tier 1이 있으면 confirmed에 가깝게, Tier 3만이면 unverified에 가깝게 둡니다. 신속속보 등급·등불 선정·지도 뉴스 태그 가중치에 같은 축이 들어갑니다. 진실 점수가 아닙니다.",
      },
      {
        name: "애매한 경계",
        body: "국영이지만 편집 독립 논쟁이 있는 매체(예: 일부 국가기간통신)는 언론자유 참고표로 수동 판단합니다. 라이브 점수 API가 아니며, 목록은 코드(mediaTiers)에서 갱신합니다.",
      },
    ],
  },
  {
    id: "render",
    title: "⑩ 지도 렌더링",
    intro: "정보가 아니라, 지구본을 그리는 바탕 그림입니다.",
    entries: [
      {
        name: "OpenFreeMap · Esri · 지형 · 국경",
        body: "도로·위성사진·높이·3D 건물·국경선입니다. 위성 상용 재배포는 약관을 따로 확인합니다.",
      },
    ],
  },
];

const SECTIONS_EN: DataSourceSection[] = [
  {
    id: "surveillance",
    title: "① Live tracking",
    intro:
      "The map’s “right now” eyes — satellite heat, aircraft, and ships talking automatically, not hand-drawn art.",
    entries: [
      {
        name: "NASA FIRMS",
        body: "Hot spots from satellites about every 10 minutes. Shells, wildfires, and industrial fires can look the same—heat only, not “what burned.” US public domain.",
      },
      {
        name: "ADS-B (aircraft)",
        body: "Planes broadcasting their own positions. We prefer the open adsb.lol net and enrich military ICAO from public lists. Other open nets with fuzzy commercial terms were removed.",
      },
      {
        name: "Ship AIS (MarineTraffic, etc.)",
        body: "Commercial vessel position/course. Paid API with a public-stream fallback. Selling the screen needs a separate contract.",
      },
      {
        name: "Dark / spoofed AIS",
        body: "Open OSINT on ships that go dark or spoof identity—pattern matching, not guaranteed live GPS.",
      },
      {
        name: "Emergency squawks",
        body: "7700/7600/7500 codes. When seen, the map flies there and plays an alert.",
      },
      {
        name: "ReefWatch + OpenSky (SCS)",
        body: "Traffic near South China Sea features. Research/non-commercial open nets—more paperwork before heavy commercial use.",
      },
      {
        name: "Recon sats · launches · GPS oddities",
        body: "Public orbits, launch calendars, and GNSS error hints from ADS-B. Estimates, not courtroom proof.",
      },
    ],
  },
  {
    id: "conflict",
    title: "② Conflict · strikes · air alerts",
    intro:
      "Most layers say “reported · unverified.” Pins are often where reporting pointed—not proven impact points.",
    entries: [
      { name: "Ukraine front (VIINA)", body: "Who holds which ground as open control maps—hatched, not CCTV." },
      { name: "Israel alerts (Tzeva Adom)", body: "Unofficial alert JSON. Formal channel needed before commercial use." },
      { name: "Ukraine air threat (NEPTUN)", body: "Live air-threat feed—not a replacement for official apps." },
      { name: "UKMTO maritime alerts", body: "Ship attacks/threats in Red Sea / Hormuz. Unofficial endpoint for now." },
      { name: "NAVAREA · exercises", body: "Sea hazards and drill notices ~30 min. Training tiers: announced / OSINT / unverified." },
      { name: "Korea · RU strikes · China theater", body: "News DBs matched to seed places—report coords, not shell impacts." },
      { name: "Taiwan Strait timeline", body: "Auto-summarized open docs—misreport risk disclosed on screen." },
      {
        name: "UCDP deaths",
        body: "Catalog claims verified deaths; the shipped file is a tiny demo. Full UCDP is not wired yet.",
        warn: true,
      },
      { name: "RU KIA / casualty estimates", body: "Named lists and press estimates—media rights apply." },
      { name: "Nuclear warhead counts", body: "Annual public research charts—not today’s launch readiness." },
    ],
  },
  {
    id: "infra",
    title: "③ Infrastructure · energy · resources",
    intro: "Physical things war bumps into—bases, pipes, minerals, compute.",
    entries: [
      { name: "Bases / nuclear sites", body: "Maps + public lists. Some nuclear items held for redistribution clarity." },
      { name: "Safecast", body: "Citizen science µSv/h near plants." },
      { name: "Missile silos / bases", body: "Open research estimates—not today’s TELs." },
      { name: "Pipelines · LNG · subsea", body: "Where energy moves on land and under sea; denser OSM when zoomed." },
      { name: "Critical minerals", body: "Thematic belts—“about this region,” not a full geology survey." },
      { name: "AI data centers", body: "Public wiki/map clusters of large compute sites." },
      {
        name: "Internet exchanges (IXP)",
        body: "Docs mention a large DB; the live file is a handful of city-hall demo points. Real IXPs not wired yet.",
        warn: true,
      },
      { name: "Subsea tunnels", body: "Well-known tunnels from an in-house list." },
    ],
  },
  {
    id: "trade",
    title: "④ Trade · geoeconomics",
    intro: "What moves where—narrow gates and trade rules.",
    entries: [
      { name: "IMF PortWatch", body: "Whether ships pass Hormuz/Suez-style gates more or less than usual—open observation." },
      { name: "Critical nodes", body: "A list of “if this clogs, it hurts” global nodes." },
      { name: "Global shipping lanes", body: "Static busy-lane drawings—not live AIS dots." },
      { name: "Economic hubs", body: "Ports/cities summarized from open stats and maps." },
      { name: "Macro APIs · Korea stats", body: "Paid/public macro and trade numbers—some still waiting on license clearance." },
      { name: "Global Trade Alert", body: "Who changed tariffs/subsidies/controls. R/A/G colors are that project’s judgment." },
    ],
  },
  {
    id: "axis",
    title: "⑤ Axis · corridor backend",
    intro: "Behind CRINK axes and land/sea corridors.",
    entries: [
      { name: "SIPRI arms transfers", body: "Who transferred arms to whom—approval needed for commercial screens." },
      { name: "OpenStreetMap", body: "Snaps corridors to real roads/rails. Some countries done, others in progress." },
      { name: "Trade · shipping · rail stats", body: "Public tables that feed “how important is this corridor?” scores." },
      { name: "DeepStateMap / ACLED", body: "DeepState reviewed not coded; ACLED removed on commercial terms." },
    ],
  },
  {
    id: "sanctions",
    title: "⑥ Sanctions · dispute zones",
    intro: "Who is listed, and where disputes or embargoes sit.",
    entries: [
      {
        name: "Sanctions targets",
        body:
          `OFAC + UN lists: ${SANCTIONS_ENTITY_SUMMARY.total.toLocaleString()} entities. ` +
          `Only ${SANCTIONS_ENTITY_SUMMARY.withCoords} have map pins; the rest roll up by country. No EU/UK lists yet.`,
      },
      { name: "Arms embargoes · camps", body: "Official zones and public camp locations." },
      { name: "Dispute heat · hotspots", body: "Open maps + news density—no external AI painting." },
      { name: "Escalation signals (ours)", body: "A helper “is the mood rising?” read—not a verdict." },
      {
        name: "Tension score (GTS)",
        body: "Not the famous terrorism index—our 0–100 score from theater signals vs a ~90-day baseline. Tap the chip for a plain-language explainer.",
      },
    ],
  },
  {
    id: "news",
    title: "⑦ News · OSINT",
    intro: "Headlines and field channels that fill the “words” on the map.",
    entries: [
      { name: "Geopolitics · economy RSS", body: "Curated feeds with short blurbs and source links. Paid redistribution rules vary by outlet." },
      { name: "YouTube · Telegram", body: "Official video atoms (embed only) and OSINT channel lists (partial snippets)." },
      { name: "CRINK hub monitor", body: "Think-tank titles/summaries/links on a multi-hour cadence." },
    ],
  },
  {
    id: "news-ko-flash",
    title: "⑧ KO · flash design",
    intro:
      "How Korean-mode news is shown, and what the breaking-flash parchment writes — baked into code, not a toggle.",
    entries: [
      {
        name: "① Korean-mode translation (lamp · RSS)",
        body: "The lamp localizes title and card title/summary right before ignition. The bottom RSS stack does not call Google from the browser; it batches through the server `/api/translate-text` proxy. English mode keeps the original wording.",
      },
      {
        name: "② Breaking flash — 5W1H briefing",
        body: "Flash parchment body follows who / what / when / where / why / how for 20+ paragraphs. Includes source, age, and Tier notes. Uses only title, summary, and theater signals — no invented facts.",
      },
      {
        name: "③ News trust tiers (next bookmark)",
        body: "Tier 1/2/3 editorial-independence design is detailed in the next 「⑨ News trust tiers」 bookmark. Same axis as T1/T2/T3 badges on lamp, flash, and RSS cards.",
      },
    ],
  },
  {
    id: "news-tiers",
    title: "⑨ News trust tiers",
    intro:
      "We do not score “how true” a story is. We label editorial independence vs party interest as Tier 1 / 2 / 3, then use that for corroboration and flash grading. This is a different axis from map-layer Observed / Reported / Unverified tags.",
    entries: [
      {
        name: "Design rule",
        body: "Same yardstick regardless of nationality. “Our” defense PA is Tier 3; so is “their” state wire. Independent wires that can criticize their own governments sit in Tier 1.",
      },
      {
        name: "Tier 1 · primary spine",
        body: "Gatekept international wires and major independents (e.g. Reuters, AP, AFP, BBC, NYT, Yonhap). Preferred spine for AI summaries, lamp, and flash. Government/military PA is never Tier 1, any country.",
      },
      {
        name: "Tier 2 · fill gaps",
        body: "Real reporting with recurring bias disputes on some topics, plus civilian OSINT / security institutes. Fills gaps when Tier 1 is thin; weight rises with Tier 1 corroboration.",
      },
      {
        name: "Tier 3 · party / state / PA",
        body: "State TV/wires and party/military PA (e.g. TASS, Xinhua, KCNA, any MoD/command release). Read as interested-party copy; hold hard claims until independent corroboration. Flash heroes with Tier 3 only are downgraded or held.",
      },
      {
        name: "How the UI uses it",
        body: "T1/T2/T3 badges on cards; clusters with Tier 1 lean confirmed, Tier 3-only lean unverified. Same axis feeds flash grade, lamp picks, and map news-tag weights. Not a truth score.",
      },
      {
        name: "Fuzzy edges",
        body: "State-affiliated outlets with independence debates are judged via a static press-freedom reference table—not a live API. Lists live in mediaTiers code.",
      },
    ],
  },
  {
    id: "render",
    title: "⑩ Map rendering",
    intro: "Basemap paint—not intelligence content.",
    entries: [
      {
        name: "OpenFreeMap · Esri · terrain · borders",
        body: "Roads, imagery, elevation, 3D buildings, borders. Commercial imagery redistribution needs its own terms check.",
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

export function dataSourceFootnoteLines(lang: LabelLanguage): string[] {
  const stats = getSourceCatalogStats();
  const ko = lang !== "en";
  const s = SANCTIONS_ENTITY_SUMMARY;
  if (ko) {
    return [
      `정상 작동 중: 공개 카탈로그 ${stats.total}개 중 ${stats.shipped}개를 실제로 씁니다.`,
      "⚠ 지금은 데모·가짜로만 보이는 항목 2개: 사망 사건(UCDP), 인터넷 교환점.",
      `제재 명단: 미국·유엔 ${s.total.toLocaleString()}건(지도 핀 ${s.withCoords}건). 유럽·영국 명단은 아직 없습니다.`,
      "상업 약관 때문에 뺀 항목: ACLED.",
      `아직 연결 전 ${stats.planned}개(관세청·한은·항만·무역정책 API 등).`,
      "선박·항공기·언론 RSS는 상업 이용 시 따로 계약·확인이 필요할 수 있습니다.",
      "우리는 완벽한 정보기관이 아닙니다. 이 재료로 보여줄 수 있는 만큼만 보여 줍니다.",
    ];
  }
  return [
    `Live: ${stats.shipped} of ${stats.total} catalog sources actually wired.`,
    "⚠ Demo/placeholder (2): UCDP deaths, IXP.",
    `Sanctions: OFAC+UN ${s.total.toLocaleString()} (${s.withCoords} pinned). No EU/UK lists yet.`,
    "Removed for commercial terms: ACLED.",
    `Still planned (${stats.planned}): customs, central bank, ports, trade-policy APIs, etc.`,
    "Ship/aircraft/news feeds may need separate commercial clearance.",
    "We are not a perfect intelligence agency—only what these sources let us show.",
  ];
}

export function dataSourceSections(lang: LabelLanguage): DataSourceSection[] {
  return lang === "en" ? SECTIONS_EN : SECTIONS_KO;
}
