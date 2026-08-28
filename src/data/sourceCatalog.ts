export interface NewsLayerSourceNote {
  layerId: string;
  source: string;
  url: string;
  cadence: string;
  attribution: string;
  notes: string;
  /**
   * `blocked` — 데이터 품질/출처 문제로 **의도적으로 노출을 막은 레이어**.
   * shipped 로 되돌리기 전에 반드시 `blockedReason` 을 해소할 것.
   */
  status: "shipped" | "planned" | "blocked";
  /** status="blocked" 일 때 필수 — 왜 막았는지 한 줄. */
  blockedReason?: string;
  ingest:
    | "static-build"
    | "cached-api"
    | "live-poll"
    | "mapped-existing"
    | "live-api"
    /** 서드파티 데모 저장소에서 온 합성 데이터. 프로덕션 노출 금지. */
    | "synthetic-demo";
  /**
   * 상업적 이용 가능 여부 — **유료화의 정본**.
   *
   * ⚠️ 핵심 오해: "데이터를 팔지 않으니 상업적 이용이 아니다"는 **틀렸다.**
   *    Creative Commons NonCommercial 정의는
   *    "not primarily intended for or directed towards commercial advantage
   *     **or monetary compensation**" 이다. 요금제는 그 자체로 monetary compensation 이다.
   *    화면에 그려서 보여주기만 해도, 그 화면에 접근료를 받으면 상업적 이용이다.
   *
   * ⚠️ 렌더 전용 게이트(viinaRenderGate)는 **재배포** 축의 방어이지
   *    **상업성** 축의 방어가 아니다. 두 축은 별개다.
   *
   *   allowed          CC BY · ODbL · MIT · CC0 · 공공저작물 — 표기만 하면 유료 노출 가능
   *   license-required 상업 이용에 별도 계약·로열티가 필요 (ACLED·SIPRI·MarineTraffic 등)
   *   prohibited       약관이 상업 이용을 명시적으로 금지 (adsb.fi 등)
   *   unknown          미확인 — **유료 티어 노출 금지.** 확인 전까지 allowed 로 올리지 말 것
   */
  commercialUse: "allowed" | "license-required" | "prohibited" | "unknown";
  /** 상업 이용 판단 근거·조건 한 줄. allowed 가 아니면 필수. */
  commercialNote?: string;
  /**
   * 공공누리(KOGL) 유형 — 한국 공공데이터에만 붙는다.
   *
   * ⚠️ "공공데이터"는 두 법 체계를 가리킨다:
   *   · 공공데이터법 (data.go.kr)  — **사실의 집합.** 저작권이 안 붙어 상업 제한 없음
   *   · 공공누리 (저작권법)        — **저작물이 포함된** 공공데이터에만 부착
   *
   * 통계 수치(관세청 금액·해수부 척수)는 사실이라 저작물성이 약하다.
   * 그래도 기관이 유형을 표시해뒀으면 그걸 따르는 게 안전하다.
   *
   *   type-1  출처표시만 — 상업 이용 가능
   *   type-2  출처표시 + 상업금지 → 유료 티어 불가
   *   type-3  출처표시 + 변경금지 → ⚠️ 우리 파이프라인은 데이터를 변경한다
   *           (roundCoord 반올림 · capArrayGeographic 표본추출)
   *   type-4  상업금지 + 변경금지 → 유료 티어 불가
   *   none    표시 없음 (순수 공공데이터) — 실무상 type-1 과 동일하게 취급
   */
  koglType?: "type-1" | "type-2" | "type-3" | "type-4" | "none";
}

/** 주요 실시간 출처 — 자료출처 패널 상단·도움말에 고정 표기 */
export type PrimaryLiveSource = {
  id: "nasa-firms" | "adsb" | "marinetraffic";
  nameKo: string;
  nameEn: string;
  product: string;
  url: string;
  layers: string;
  noteKo: string;
};

export const PRIMARY_LIVE_SOURCES: PrimaryLiveSource[] = [
  {
    id: "nasa-firms",
    nameKo: "NASA FIRMS",
    nameEn: "NASA Fire Information for Resource Management System",
    product: "VIIRS NRT (NOAA-20 / SNPP)",
    url: "https://firms.modaps.eosdis.nasa.gov/",
    layers: "위성 화재·폭격 추정 (/api/firms-fires)",
    noteKo:
      "근실시간 위성 열원 탐지. Cron → D1 → 공개 /firms 폴백. 지도 표기: NASA FIRMS.",
  },
  {
    id: "adsb",
    nameKo: "ADS-B",
    nameEn: "Automatic Dependent Surveillance–Broadcast",
    product: "adsb.lol · airplanes.live · ADSBexchange / adsb.fi",
    url: "https://www.adsbexchange.com/",
    layers: "군용기·민간 항적 (/api/adsb-mil, /api/adsb-traffic)",
    noteKo:
      "ADS-B 항적. 워커는 Worker IP 호환 소스(adsb.lol 등) 우선, 키 있으면 ADSBexchange. 군용 ICAO hex는 Bellingcat Turnstone(adsb-history) modes.csv로 보강. 출처: https://github.com/bellingcat/adsb-history.git · 지도 표기: ADS-B.",
  },
  {
    id: "marinetraffic",
    nameKo: "MarineTraffic",
    nameEn: "MarineTraffic AIS",
    product: "exportvessels · aisstream.io 폴백",
    url: "https://www.marinetraffic.com/",
    layers: "선박 AIS (/api/ais) · 위장선박 (/api/ais-disguised)",
    noteKo:
      "민간 화물·탱커·여객 등. MarineTraffic 키 실패 시 AISstream 폴백. 위장·다크플리트 시드는 AIS_Tracker(https://github.com/arandomguyhere/AIS_Tracker.git). 지도 표기: MarineTraffic · AIS.",
  },
];

/**
 * Conflict-view adapted source catalog.
 * URLs map to `/data/{profile}/*.json` static assets or `/api/*` routes in this app.
 */
export const NEWS_LAYER_SOURCE_CATALOG: NewsLayerSourceNote[] = [
  // Dynamic / real-time layers
  {
    layerId: "intel-hotspots",
    source: "Configurable GeoJSON feed",
    url: "/api/intel-hotspots",
    cadence: "Configured",
    attribution: "External provider",
    notes:
      "Intel/security hotspot events from a configurable GeoJSON endpoint (INTEL_HOTSPOTS_URL).",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "unknown",
    commercialNote:
      "외부 제공자 설정형 엔드포인트. 운영자가 소스별로 확인해야 함.",
  },
  {
    layerId: "conflict-zones",
    source: "AI war-zone demo (local heuristics)",
    url: "/api/layers/conflict-zones",
    cadence: "2 min (120s TTL)",
    attribution: "Natural Earth + GDELT war clustering",
    notes:
      "Demo mode: no external AI API. Heuristically detects war zones from territorial disputes and recent combat news density.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "Natural Earth(퍼블릭 도메인) + GDELT(공개). 상업 이용 가능.",
  },
  {
    layerId: "military-activity",
    source: "ADS-B (군용기) + Bellingcat Turnstone hex DB",
    url: "/api/adsb-mil",
    cadence: "Cron warm ~10m · toggle on-demand D1",
    attribution:
      "ADS-B · adsb.lol (ODbL) / ADSBexchange · Military hex: https://github.com/bellingcat/adsb-history.git (MIT)",
    notes:
      "Military aircraft via ADS-B. Cron → D1 `adsb_aircraft` (mode=mil). ICAO hex military flags enriched from Bellingcat/Turnstone modes.csv (adsb-history, MIT). User toggle reads D1 first; ?live=1 forces upstream.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote:
      "2026-08-01 재판정 (prohibited → allowed). adsb.fi('for personal, non-commercial use only')와 airplanes.live(독점 라이선스 미확인)를 런타임 폴백에서 완전히 제거했다. 남은 소스는 adsb.lol(ODbL — 출처 표기만) + ADSBexchange(상업 키) + Bellingcat adsb-history(MIT) 뿐이다. ⚠️ 폴백에 adsb.fi·airplanes.live 를 되돌리면 이 등급도 함께 내려야 한다. @see src/lib/adsbClient.ts · workers/cron-ingest/src/adsb.ts",
  },
  {
    layerId: "reef-watch",
    source: "ReefWatch feature registry + OpenSky Network",
    url: "/api/reefwatch",
    cadence: "Client poll 3 min while ON · server cache 90s · one combined SCS bbox request",
    attribution:
      "ReefWatch (MIT) https://github.com/NinhGhoster/ReefWatch · OpenSky Network https://opensky-network.org/",
    notes:
      "Feature-centric SCS monitoring bridge. Renders 77 Spratly/Paracel features from ReefWatch target_features.json. Polls OpenSky once over the combined bbox (quick_check policy) and attributes aircraft only within ±0.15° (~16.7 km) of a feature. Not a live battlefield truth engine; Planet/imagery ingest stays optional upstream.",
    status: "shipped",
    ingest: "live-poll",
    commercialUse: "license-required",
    commercialNote:
      "ReefWatch 는 MIT 이나 OpenSky Network 가 비상업·연구용. 상업 시 OpenSky 계약 필요.",
  },
  {
    layerId: "air-traffic",
    source: "ADS-B (민간 항적)",
    url: "/api/adsb-traffic",
    cadence: "Cron hub warm ~10m · toggle on-demand D1",
    attribution: "ADS-B · adsb.lol (ODbL) / ADSBexchange",
    notes:
      "Civilian ADS-B traffic (exclude dbFlags&1 and Bellingcat military hex). Cron warms hub grids into D1; viewport query prefers D1 bbox then live.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote:
      "2026-08-01 재판정 (prohibited → allowed). adsb.fi·airplanes.live 를 런타임 폴백에서 제거하고 adsb.lol(ODbL) + ADSBexchange 만 남겼다. ⚠️ 되돌리면 등급도 함께 내릴 것.",
  },
  {
    layerId: "ais",
    source: "MarineTraffic (AIS)",
    url: "/api/ais",
    cadence: "Cron ~10m · toggle on-demand D1",
    attribution: "MarineTraffic · aisstream.io",
    notes:
      "Commercial AIS via MarineTraffic → D1 `ais_vessels`. Toggle reads D1 first; AISstream live fallback when MT unavailable.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "license-required",
    commercialNote:
      "MarineTraffic 상업 라이선스 필요. AISstream 도 상업 조건 확인 필요.",
  },
  {
    layerId: "disguised-vessels",
    source: "AIS_Tracker (위장·다크플리트 선박)",
    url: "/api/ais-disguised",
    cadence: "Static seed (OSINT watchlist)",
    attribution:
      "https://github.com/arandomguyhere/AIS_Tracker.git — vessels DB · dark_fleet.py · demo_data",
    notes:
      "Civilian vessels conducting military missions / dark fleet / arsenal-ship seed from AIS_Tracker. Seed positions + name/MMSI match against live AIS when available.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "allowed",
    commercialNote: "AIS_Tracker — MIT License (시드 목록).",
  },
  {
    layerId: "tunnels",
    source: "멋진 신세계 submarine tunnel seed → D1",
    url: "/api/submarine-tunnels",
    cadence: "On demand (seeded once)",
    attribution: "멋진 신세계 logistics seed",
    notes:
      "Major undersea tunnels (Eurotunnel, Seikan, Marmaray, …). Stored in D1 `submarine_tunnels`; fetched only when layer toggled ON.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "자체 제작 시드 — 우리 저작물.",
  },
  {
    layerId: "firms-fires",
    source: "NASA FIRMS (VIIRS NRT)",
    url: "/api/firms-fires",
    cadence: "Cron ~10m · viewport bbox",
    attribution: "NASA FIRMS",
    notes:
      "Near-real-time satellite fire detections (VIIRS NOAA-20 / SNPP NRT). Cron → D1 → /api/firms-fires. Map attribution: NASA FIRMS.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "NASA FIRMS — 미 정부 저작물, 퍼블릭 도메인.",
  },
  {
    layerId: "tzeva-adom",
    source: "Pikud HaOref (unofficial JSON)",
    url: "/api/tzeva-adom",
    cadence: "Client poll only while showTzevaAdom ON (stub 3s / live 15s); server cache ~2.5s",
    attribution: "Israel Home Front Command (Oref)",
    notes:
      "Tzeva Adom rocket/missile alerts via AlertsHistory.json — same feed as DavidTheExplorer/Tzeva-Adom-API. Geo-restricted to Israeli IP; use OREF_HISTORY_URL proxy abroad.",
    status: "shipped",
    ingest: "live-poll",
    commercialUse: "license-required",
    commercialNote:
      "Pikud HaOref 비공식 엔드포인트. 상업 이용 시 정식 채널 문의 필요.",
  },
  {
    layerId: "ukmto-incidents",
    source: "UKMTO / Royal Navy (unofficial endpoint)",
    url: "/api/ukmto",
    cadence: "Cron ~30 min min-interval (unofficial upstream, polled politely) → D1",
    attribution: "UK Maritime Trade Operations (Royal Navy) · Open Government Licence",
    notes:
      "Merchant vessel attack / boarding / hijack / suspicious-activity warnings (Red Sea, Gulf of Aden, Strait of Hormuz, etc.). No documented public API — endpoint identified via client JS bundle inspection. Not an official alert substitute; see README 비공식 엔드포인트 사용 원칙.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "license-required",
    commercialNote:
      "OGL 자체는 상업 허용이나 **비공식(리버스 엔지니어링) 엔드포인트**를 쓰고 있음. 수익화 시 Royal Navy/UKMTO 정식 피드 요청 필요 — 프로젝트 자체 원칙.",
  },
  {
    layerId: "navarea-warnings",
    source: "JHOD NAVAREA XI · NGA NAVAREA IV/XII (public TXT)",
    url: "/api/navarea",
    cadence: "Cron self-throttle ~30 min (worker */10, NAVAREA min-interval) → D1 snapshot replace",
    attribution: "Japan Coast Guard (JHOD) · U.S. NGA Navigational Warnings",
    notes:
      "Sources publish event-driven into static TXT (no webhook). 멋진 신세계 polls; each successful poll recomputes the full in-force snapshot and replaces by region. IDs are region-prefixed (XI-26-0330, IV-26-0695). Optional ?region=XI filter. Prefer 15–30 min poll — not FIRMS/AIS cadence.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "일본 해상보안청·미 NGA 항행경보 — 공공저작물.",
  },
  {
    layerId: "military-exercises",
    source: "NAVAREA exercise notices · news_stream keyword slice → D1 military_exercises",
    url: "/api/military-exercises",
    cadence: "Cron with NAVAREA/news ingest · client poll ~3 min (auto-alert even if layer off)",
    attribution: "Underlying NAVAREA / outlet credits per exercise sources_json",
    notes:
      "Normalized military exercise zones (cyan hatch). Confidence: announced / announced_osint / unverified; client may soft-bump to announced_rf when ADS-B/AIS points fall in bbox — RF is a bonus, not proof. DPRK/IR auto-alert does not force military ADS-B ON. See docs/exercise-alerts.md.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "license-required",
    commercialNote:
      "훈련별 출처가 매체 인용. 유료 노출 전 개별 확인.",
  },
  {
    layerId: "newfeeds-iran",
    source: "NewFeeds (ktoetotam/NewFeeds)",
    url: "/api/newfeeds-attacks?iran=1 · news via /api/news-stream",
    cadence: "5 min cache · attacks map + iran.json → bottom breaking",
    attribution:
      "NewFeeds · https://github.com/ktoetotam/NewFeeds (MIT) — underlying outlets retained per article",
    notes:
      "Iran-related geocoded attack/military events on the map (layer toggle). Iran state/regional headlines merge into /api/news-stream as Tier-3 state media and compete for the bottom breaking hero. Always credit NewFeeds when displayed.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "NewFeeds — MIT License.",
  },
  {
    layerId: "neptun",
    source: "NEPTUN (neptun.in.ua)",
    url: "/api/neptun",
    cadence: "WebSocket stream · REST fallback 5s",
    attribution: "NEPTUN — Карта повітряних тривог України",
    notes:
      "Ukraine air threats (UAV, missile, KAB) and official air-raid alerts. Free public API, no key. Not an official alert system — informational only.",
    status: "shipped",
    ingest: "live-poll",
    commercialUse: "license-required",
    commercialNote:
      "NEPTUN 비공식 피드. 상업 이용 시 제공자 문의 필요.",
  },
  {
    layerId: "ucdp-events",
    source: "UCDP GED 26.1 (미수집 — 현재 파일은 데모 스냅샷)",
    url: "https://ucdpapi.pcr.uu.se/api/gedevents/26.1 → /data/{profile}/ucdp-events.json",
    cadence: "Build-time fetch (npm run data:ucdp) · annual GED releases",
    attribution: "(출처 미연결 — 노출 차단됨)",
    notes:
      "⚠️ 이 항목은 오랫동안 실제와 달랐다. 카탈로그는 'UCDP GED 26.1 검증 사망 코딩 이벤트' 라고 " +
      "적어뒀지만, shipped 파일은 15건뿐이고 전부 source='sigint-snapshot' · id='ucdp-snap-N' 인 " +
      "데모 데이터였다 (실제 GED 는 30만 건 이상). .env 의 UCDP_ACCESS_TOKEN 은 이미 채워져 있으므로 " +
      "`npm run data:ucdp` 만 실행하면 된다. 실행 후 status 를 shipped 로 되돌릴 것. " +
      "Source: https://ucdp.uu.se/downloads/index.html · API: https://ucdpapi.pcr.uu.se",
    status: "blocked",
    blockedReason:
      "카탈로그는 UCDP GED 라 적었으나 실제 데이터는 데모 15건 (2026-07-31 감사 P0-3). " +
      "npm run data:ucdp 미실행.",
    ingest: "synthetic-demo",
    commercialUse: "allowed",
    commercialNote: "UCDP GED — CC BY 4.0 (실데이터 연결 후 유효).",
  },
  {
    layerId: "space-launches",
    source: "The Space Devs (LL2)",
    url: "/api/space-launches",
    cadence: "1 hour",
    attribution: "The Space Devs",
    notes: "Recent orbital launches via Launch Library 2 free tier.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "The Space Devs (Launch Library 2) — 공개 라이선스, 표기 조건.",
  },
  {
    layerId: "recon-satellites",
    source: "CelesTrak (T.S. Kelso)",
    url: "/api/satellites",
    cadence: "6–12 hours (TLE)",
    attribution: "Orbital elements: CelesTrak (T.S. Kelso)",
    notes:
      "GP TLEs from the military and earth-resources groups plus recon-family name queries, filtered by public recon-family patterns. Navigation, comms and early-warning series, debris, and TLEs older than 45 days are dropped. Positions computed client-side via SGP4; horizon ring is theoretical footprint, not imaging activity.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "CelesTrak TLE — 공개 배포, 표기 조건.",
  },
  {
    layerId: "gps-interference",
    source: "GPSJam.org (John Wiseman)",
    url: "/api/gps-jam",
    cadence: "Daily CSV (~04:00 UTC) · CDN 6–12h",
    attribution: "GPS interference: GPSJam.org (John Wiseman) · ADS-B Exchange",
    notes:
      "Share of aircraft reporting GNSS anomalies per H3 res-4 cell. MIN_AIRCRAFT filter applied. Does NOT show jammer/equipment locations. Unofficial static feed; solo mode when ON.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "license-required",
    commercialNote:
      "GPSJam.org·ADSBexchange — 상업 이용 조건 확인 필요.",
  },
  {
    layerId: "cyber-incidents",
    source: "GDELT Geo 2.0",
    url: "/api/gdelt?theme=cyber",
    cadence: "2 minutes",
    attribution: "GDELT Project",
    notes: "Cyber attack / ransomware events via GDELT theme query.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "GDELT — 공개, 상업 이용 가능.",
  },
  {
    layerId: "election-events",
    source: "GDELT Geo 2.0",
    url: "/api/gdelt?theme=election",
    cadence: "2 hours",
    attribution: "GDELT Project",
    notes: "Election, vote, referendum events via GDELT.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "GDELT — 공개, 상업 이용 가능.",
  },

  // Static / mapped-existing layers
  {
    layerId: "military-bases",
    source: "Static build",
    url: "/data/{profile}/military-bases.json",
    cadence: "Project versioned",
    attribution: "OpenStreetMap / public datasets",
    notes: "U.S. bases plus Korea/Japan/Philippines OSM airfields and eastern NATO front-line air/naval sites.",
    status: "shipped",
    ingest: "mapped-existing",
    commercialUse: "allowed",
    commercialNote: "OpenStreetMap(ODbL) — 상업 이용 가능, 표기+share-alike.",
  },
  {
    layerId: "nuclear-sites",
    source: "Static build",
    url: "/data/{profile}/nuclear-sites.json",
    cadence: "Project versioned",
    attribution: "IAEA / NTI / public datasets",
    notes: "Nuclear power plants and research reactors.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "unknown",
    commercialNote:
      "IAEA·NTI — 재배포 조건 미확인.",
  },
  {
    layerId: "safecast-radiation",
    source: "Safecast",
    url: "/api/safecast",
    cadence: "Hourly cached near priority nuclear sites",
    attribution: "Radiation: Safecast (api.safecast.org)",
    notes:
      "µSv/h gauges near Zaporizhzhia, Fukushima, Yongbyon, Dimona, Chernobyl, Kori, Sellafield when nuclear sites layer is on.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "Safecast — CC BY.",
  },
  {
    layerId: "noaa-swpc",
    source: "NOAA SWPC",
    url: "/api/swpc",
    cadence: "~10 min (Kp / R-S-G scales)",
    attribution: "Space weather: NOAA SWPC",
    notes: "Planetary K-index and NOAA R/S/G scales as a status chip under the global index.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "NOAA SWPC — 미 정부 저작물, 퍼블릭 도메인.",
  },
  {
    layerId: "adsb-emergency",
    source: "adsb.lol /sqk/",
    url: "/api/adsb-emergency",
    cadence: "~45s poll",
    attribution: "ADS-B emergency squawk: adsb.lol",
    notes: "Squawk 7700/7600/7500 emergency contacts — auto flyTo + siren + banner.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "adsb.lol — ODbL. 상업 이용 가능, 표기 필수.",
  },
  {
    layerId: "missile-silos",
    source: "PLARF Silo Study (KMZ / shapefile)",
    url: "/api/layers/strategic-missile?dataset=silos",
    cadence: "Project versioned",
    attribution: "PLARF Silo Study · China missile silo construction 2019-2021",
    notes:
      "312 identified silos across the Yumen, Hami and Hanggin Banner fields, plus 560 candidate grid cells and 619 access-road segments.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "unknown",
    commercialNote:
      "공개 연구(PLARF Silo Study) 기반. 원저자 조건 미확인.",
  },
  {
    layerId: "strategic-missile-bases",
    source: "RVSN order of battle (open-source curation)",
    url: "/api/layers/strategic-missile?dataset=bases",
    cadence: "Project versioned",
    attribution: "Russian Strategic Rocket Forces — open-source order of battle",
    notes:
      "27th/31st/33rd Missile Army garrisons with silo vs road-mobile basing. Garrison towns, not launch positions.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "unknown",
    commercialNote:
      "공개 전투서열 연구. 원저자 조건 미확인.",
  },
  {
    layerId: "missile-launch-tests",
    source: "NTI / CNS India and Pakistan Missile Launch Tracker",
    url: "/api/layers/strategic-missile?dataset=launches",
    cadence: "Tracker release versioned (v2026.1)",
    attribution: "NTI / CNS James Martin Center for Nonproliferation Studies",
    notes:
      "326 India/Pakistan launch tests since 1979 with facility coordinates, missile family, apogee and outcome.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "unknown",
    commercialNote:
      "NTI/CNS James Martin Center — 재배포 조건 미확인.",
  },
  {
    layerId: "reference-monitor",
    source: "CSIS Beyond Parallel RSS · NTI WordPress REST",
    url: "/api/reference-monitor",
    cadence: "~6h poll (cron ingest)",
    attribution: "CSIS Beyond Parallel · Nuclear Threat Initiative",
    notes:
      "Watches both publishers for new or silently revised analysis, tags each item against our map topics (missile-silo, dprk, plarf …) and keeps only relevant items in D1.",
    status: "shipped",
    ingest: "live-poll",
    commercialUse: "unknown",
    commercialNote:
      "CSIS Beyond Parallel·NTI — RSS 인용 범위 확인 필요.",
  },
  {
    layerId: "crink-hub-monitor",
    source: "38 North · AMTI · Critical Threats · ISW · Jamestown · ASPI 외 CRINK 전문",
    url: "/api/reference-monitor?hub=",
    cadence: "~6h poll (cron ingest) · client poll while hub open",
    attribution: "Each outlet RSS terms · title/summary/link only",
    notes:
      "CRINK 허브 우레일 — crinkSourceRegistry hub-monitor 피드. 속보 news-stream hero와 분리. 기관 위성·맵 원본 미포함.",
    status: "shipped",
    ingest: "live-poll",
    commercialUse: "unknown",
    commercialNote:
      "연구소별 RSS 약관 상이. 제목·짧은 요약·원문 링크만. 그래픽·전선 타일 재전시 금지.",
  },
  {
    layerId: "crink-thumb-sentinel-nasa",
    source: "Sentinel Hub (optional) · NASA GIBS Worldview Snapshots",
    url: "https://wvs.earthdata.nasa.gov/",
    cadence: "On ingest geocode · R2 cache thumbs/sat/*",
    attribution: "Copernicus Sentinel / NASA GIBS (public domain)",
    notes:
      "좌표 있는 허브 카드 썸네일. Sentinel 키 없으면 NASA GIBS. CSIS/ISW og:image 미사용.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "Sentinel CC BY 4.0 표기 · NASA 퍼블릭 도메인.",
  },
  {
    layerId: "crink-thumb-globe-bake",
    source: "ConflictView MapLibre capture (Playwright bake)",
    url: "/internal/globe-thumb",
    cadence: "CI/local bake → R2 thumbs/globe/{placeId}.jpg",
    attribution: "ConflictView globe render",
    notes:
      "가제트 placeId 프리베이크. Workers 요청 경로에서 헤드리스 렌더하지 않음.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "allowed",
    commercialNote: "자체 렌더링 — 저작권 이슈 없음.",
  },
  {
    layerId: "basemap-openfreemap-liberty",
    source: "OpenFreeMap Liberty (MapLibre)",
    url: "https://tiles.openfreemap.org/styles/liberty",
    cadence: "Vector style CDN",
    attribution: "© OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors",
    notes:
      "Nav 「지형」 — OpenFreeMap Liberty 벡터 + DEM. 고줌에서 Esri World Imagery가 바탕에 드러남(도로·라벨은 벡터 유지).",
    status: "shipped",
    ingest: "mapped-existing",
    commercialUse: "allowed",
    commercialNote: "OpenFreeMap·OpenMapTiles·OSM(ODbL) — 표기 필수.",
  },
  {
    layerId: "basemap-esri-world-imagery",
    source: "Esri World Imagery",
    url: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
    cadence: "Raster tiles CDN",
    attribution: "Esri, Maxar, Earthstar Geographics, GIS User Community",
    notes:
      "Terrain basemap underlay — MapLibre raster below Liberty vector fills (fade-in on zoom).",
    status: "shipped",
    ingest: "mapped-existing",
    commercialUse: "unknown",
    commercialNote: "Esri World Imagery — 출처 표기 필수. 상용 재배포 시 Esri 약관 확인.",
  },
  {
    layerId: "basemap-aws-terrarium",
    source: "AWS Terrain Tiles (Terrarium)",
    url: "https://registry.opendata.aws/terrain-tiles/",
    cadence: "Static DEM tiles",
    attribution: "Elevation © AWS Terrain Tiles (Terrarium)",
    notes: "MapLibre setTerrain DEM for intel/terrain exaggeration.",
    status: "shipped",
    ingest: "mapped-existing",
    commercialUse: "allowed",
    commercialNote: "AWS Terrain Tiles — 공개 배포.",
  },
  {
    layerId: "basemap-openfreemap-buildings",
    source: "Cesium OSM Buildings (Ion) · OpenFreeMap fallback",
    url: "https://cesium.com/platform/cesium-ion/content/cesium-osm-buildings/",
    cadence: "3D Tiles (zoom ≥ 14)",
    attribution: "© Cesium OSM Buildings · © OpenStreetMap contributors",
    notes:
      "Terrain mode zoom ≥ 14: Cesium OSM Buildings (3D Tiles via deck.gl, shared MapLibre WebGL). Fill-extrusion fallback if no Ion token.",
    status: "shipped",
    ingest: "mapped-existing",
    commercialUse: "allowed",
    commercialNote:
      "Cesium OSM Buildings — OSM(ODbL) 표기 + Cesium ion 약관. 세슘 뷰어가 아니라 타일셋만 사용.",
  },
  {
    layerId: "ai-data-centers",
    source: "Local build + Wikidata SPARQL",
    url: "/api/layers/ai-data-centers",
    cadence: "4 hours",
    attribution: "Wikidata (CC0) / OpenStreetMap contributors (ODbL)",
    notes:
      "AI/cloud data center clusters from Wikidata entities and OSM facilities. Deterministic confidence and importance scoring. Clusters merge nearby sites within 50 km.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "Wikidata(CC0) + OSM(ODbL) — 상업 이용 가능.",
  },
  {
    layerId: "trade-routes",
    source: "Shipping Lanes (Benden / CIA World Oceans map)",
    url: "https://github.com/newzealandpaul/Shipping-Lanes",
    cadence: "Project versioned (upstream GeoJSON)",
    attribution:
      "Benden, P. (2022). Global Shipping Lanes. Zenodo. CC BY 4.0 — https://doi.org/10.5281/zenodo.6361763",
    notes:
      "Upstream GeoJSON vertices from Benden Global Shipping Lanes (Major/Middle/Minor). Coordinates preserved at build (no ocean A* reshape). Low-opacity cyan strokes; rose tint near curated chokepoints. Not live AIS tracks.",
    status: "shipped",
    ingest: "mapped-existing",
    commercialUse: "allowed",
    commercialNote:
      "CC BY 4.0 — 저작자 표기 필수 (Benden 2022 · Zenodo DOI 10.5281/zenodo.6361763). Statista 재사용 제외는 업스트림 LICENSE·docs/third-party/shipping-lanes.md 참고.",
  },
  {
    layerId: "logistics-risk",
    source: "IMF PortWatch (IMF/Oxford) · curated choke atlas",
    url: "/api/portwatch",
    cadence: "PortWatch weekly (Tue); atlas project-versioned",
    attribution: "Chokepoint transits: IMF PortWatch (IMF/Oxford)",
    notes:
      "Maritime chokepoints (Suez, Hormuz, Malacca, etc.). B-grade transit stress from IMF PortWatch daily volumes (7d vs 30d baseline); A-grade from UKMTO. Oil volatility (C) not connected. Hover/click shows LogisticsStressCard.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "IMF PortWatch — 공개.",
  },
  {
    layerId: "critical-nodes",
    source: "Critical Node Atlas (EkoA/chokepoints-project)",
    url: "src/data/vendor/chokepoints-nodes.json",
    cadence: "Project versioned (upstream MIT)",
    attribution: "Critical Node Atlas · MIT License",
    notes:
      "31 strategic chokepoints across maritime, cables, energy, financial, and tech layers. Shared by conflict and economy modes.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "allowed",
    commercialNote: "Critical Node Atlas — MIT License.",
  },
  {
    layerId: "oil-pipelines",
    source: "Global Energy Monitor (GEM)",
    url: "/data/{profile}/oil-pipelines.json",
    cadence: "Static build (GEM 2026-06)",
    attribution: "Global Energy Monitor (CC BY 4.0)",
    notes: "Oil and NGL pipeline segments from GEM GOIT tracker.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "allowed",
    commercialNote: "Global Energy Monitor — CC BY 4.0. NC 조항 없음, 상업 이용 가능.",
  },
  {
    layerId: "gas-pipelines",
    source: "Global Energy Monitor (GEM)",
    url: "/data/{profile}/gas-pipelines.json",
    cadence: "Static build (GEM 2025-11)",
    attribution: "Global Energy Monitor (CC BY 4.0)",
    notes: "Gas transmission pipelines from GEM GGIT tracker.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "allowed",
    commercialNote: "Global Energy Monitor — CC BY 4.0.",
  },
  {
    layerId: "lng-terminals",
    source: "Global Energy Monitor (GEM)",
    url: "/data/{profile}/lng-terminals.json",
    cadence: "Static build (GEM 2025-09)",
    attribution: "Global Energy Monitor (CC BY 4.0)",
    notes: "LNG import/export terminal points from GEM GGIT.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "allowed",
    commercialNote: "Global Energy Monitor — CC BY 4.0.",
  },
  {
    layerId: "subsea-pipelines",
    source: "GEM offshore + EMODnet Human Activities",
    url: "/data/{profile}/subsea-pipelines.json",
    cadence: "Static build (GEM keywords + EMODnet WFS)",
    attribution:
      "Global Energy Monitor (CC BY 4.0); EMODnet Human Activities (European Commission)",
    notes:
      "Worldwide offshore/subsea oil·gas from GEM name/location heuristics, plus European seas from EMODnet WFS. Zoomed-in OSM underwater merges client-side.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "allowed",
    commercialNote: "GEM(CC BY 4.0) + EMODnet(공개).",
  },
  {
    layerId: "pipelines-osm",
    source: "OpenStreetMap (Overpass)",
    url: "/api/pipelines-osm",
    cadence: "On zoom (regional+), 1h cache",
    attribution: "© OpenStreetMap contributors (ODbL)",
    notes:
      "Viewport Overpass: man_made=pipeline (substance oil|gas|petroleum) and location=underwater|offshore|seabed. Merged with GEM/EMODnet when zoomed in.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "OpenStreetMap — ODbL.",
  },
  {
    layerId: "economic-centers",
    source: "Local build + World Bank context",
    url: "/api/layers/economic-centers",
    cadence: "4 hours",
    attribution:
      "Wikidata (CC0) / OpenStreetMap contributors (ODbL) / World Bank Open Data (CC BY 4.0)",
    notes:
      "Major global economic hubs scored by finance infrastructure, trade gateway presence, urban scale, and country GDP.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "Wikidata(CC0) + OSM(ODbL) + World Bank(CC BY 4.0).",
  },
  {
    layerId: "escalation-signals",
    source: "파생 지표 (뉴스 파이프라인 위 계산)",
    url: "src/lib/escalationSignals.ts · 근거: src/lib/escalationTheory.ts",
    cadence: "뉴스 수집과 동일 (별도 크롤러 없음)",
    attribution:
      "판정 축은 RAND 확전 문헌 (Morgan et al., Dangerous Thresholds MG-614 · Radin et al., A Vocabulary of Escalation RR-A1933-1) · 전이 경로는 Forsberg, Neighbors at Risk",
    notes:
      "이미 수집 중인 기사에 '임계선을 넘었는가'를 계산해 붙이는 파생 지표다. 새 크롤러·LLM 없음. " +
      "RAND 정의(확전 = 강도 또는 범위의 증가로서 참여자 중 하나 이상이 중요하다고 여기는 임계선을 넘는 것)를 따르며, " +
      "수직(강도)/수평(범위) 차원으로 분류한다. " +
      "⚠️ 확전 여부·확률·의도를 판정하지 않는다. 의도 축(고의·비의도·사고)은 공개 보도로 알 수 없어 분류에서 제외했다. " +
      "⚠️ 모든 점수 항목은 매칭 근거 문자열과 함께 UI 에 공개된다 — 사용자가 판정을 검증할 수 있어야 한다. " +
      "가중치는 '임계선을 넘었을 때 대응 의무가 얼마나 성문화되어 있는가' 기준이며 심각도가 아니다.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "allowed",
    commercialNote: "자체 파생 지표 — 우리 저작물. 문헌은 개념 인용.",
  },
  {
    layerId: "mof-port-flows",
    source: "해양수산부 항만 입출항 (PORT-MIS)",
    url: "https://www.data.go.kr/data/15059059/openapi.do → /data/{profile}/korea-macro.json",
    cadence: "월간 통계 · cron 1회/일 (npm run korea:fetch)",
    attribution: "해양수산부 · 공공데이터포털(data.go.kr)",
    notes:
      "항만별 입출항 실적 + 한중일물류 입출항정보. **화물량·다음항·목적지를 포함한다.** " +
      "신고 기반이라 AIS 보다 정확하고, 'ais' 레이어의 MarineTraffic 상업 라이선스 문제를 " +
      "부분적으로 우회한다. 실시간 위치는 못 주지만 '물량이 어디로 흐르나'를 준다 — " +
      "해운 B2B 가 실제로 묻는 질문이다. " +
      "⚠️ 톤수는 G/T·D/W/T·실화물톤이 섞여 온다. 단위별로 분리 보존하며 합산하지 않는다. " +
      "⚠️ 입출항 방향 표기가 제각각이라(I/O·입항/출항·ENTRY) 매핑 실패 시 null 로 둔다(추측 금지).",
    status: "planned",
    ingest: "static-build",
    commercialUse: "unknown",
    commercialNote:
      "활용신청 페이지 하단의 공공누리 유형 확인 전까지 유료 노출 금지. " +
      "입출항 척수·톤수는 사실의 집합이라 저작물성이 약하지만 확인 전에는 unknown 을 유지한다.",
  },
  {
    layerId: "korea-macro-ecos",
    source: "한국은행 경제통계시스템(ECOS)",
    url: "https://ecos.bok.or.kr/api/StatisticSearch/... → /data/{profile}/korea-macro.json",
    cadence: "일·월 혼재 · cron 1회/일",
    attribution: "한국은행 경제통계시스템(ECOS)",
    notes:
      "원/달러 환율·기준금리·국고채 3년. 시장 등불·티커에 붙는다. " +
      "⚠️ **data.go.kr 이 아니라 자체 포털**이라 이용약관이 별도다. " +
      "⚠️ 실패를 HTTP 200 + RESULT.CODE 로 준다 — 조용한 실패를 막으려 파서가 예외를 던진다. " +
      "⚠️ 분기 기간이 5자리(20261)로 와서 월(202601)과 구분해야 한다. " +
      "⚠️ 결측을 0 으로 만들면 '환율 0원'이 되어 차트가 무너진다 — null 로 둔다.",
    status: "planned",
    ingest: "cached-api",
    commercialUse: "unknown",
    commercialNote:
      "ECOS 자체 이용약관 확인 필요 (data.go.kr 공공데이터법 체계와 별개). 확인 전 유료 노출 금지.",
  },
  {
    layerId: "korea-macro-kosis",
    source: "통계청 KOSIS 공유서비스",
    url: "https://kosis.kr/openapi/... → /data/{profile}/korea-macro.json",
    cadence: "월·분기 · cron 1회/일",
    attribution: "통계청 KOSIS",
    notes:
      "에너지 수급·산업 통계. 지경학 양피지 보조. " +
      "⚠️ **자체 포털** — 이용약관 별도. " +
      "⚠️ 정상 응답은 최상위가 **배열**이고 실패는 객체(err 필드)다. " +
      "⚠️ 단위(UNIT_NM)가 행마다 다를 수 있어 버리면 다른 지표를 같은 축에 그리게 된다.",
    status: "planned",
    ingest: "cached-api",
    commercialUse: "unknown",
    commercialNote:
      "KOSIS 자체 이용약관 확인 필요. 확인 전 유료 노출 금지.",
  },
  {
    layerId: "kcs-trade",
    source: "관세청 무역통계 (품목별 수출입실적)",
    url: "https://www.data.go.kr/data/15101609/openapi.do → /data/{profile}/kcs-trade.json",
    cadence: "월간·10일 단위 갱신 · cron 1회/일 (npm run kcs:fetch)",
    attribution: "관세청 무역통계 · 공공데이터포털(data.go.kr)",
    notes:
      "HS 코드별 한국 수출입 실적. **GTA 와 HS 챕터(앞 2자리)로 조인한다** — " +
      "GTA 가 '어떤 조치가 있었나'(정책)를 주고, 관세청이 '그래서 물동량이 어떻게 움직였나'(실적)를 준다. " +
      "거기에 GEM 시설 레이어를 붙이면 '그 공장이 어디 있나'까지 이어진다. " +
      "⚠️ 원본 금액 단위가 **천 달러**다 — exportUsd/importUsd 가 달러 환산값이고 " +
      "exportThousandUsd 가 원본이다. 원본을 달러로 표기하면 1000배 틀린다. " +
      "⚠️ HS 부호는 앞자리 0 이 잘려 오는 경우가 있어 normalizeHs() 로 복원한다 ('208'→'0208').",
    status: "planned",
    ingest: "static-build",
    commercialUse: "unknown",
    commercialNote:
      "활용신청 페이지 하단의 공공누리 유형 확인 전까지 유료 노출 금지. " +
      "통계 수치는 사실의 집합이라 저작물성이 약해 제1유형이거나 표시가 없을 가능성이 높지만, " +
      "확인 전에는 unknown 을 유지한다 (미확인 ≠ 안전).",
  },
  {
    layerId: "gta-interventions",
    source: "Global Trade Alert",
    url: "https://api.globaltradealert.org/api/v1/data/ → /api/layers/gta-interventions",
    cadence: "Daily (npm run gta:fetch · cron 1회/일)",
    attribution: "Global Trade Alert (globaltradealert.org) · CC BY 4.0",
    notes:
      "무역정책 조치 — 관세·보조금·수출제한 등. GTA 연구진이 관보·공식문서를 코딩한 2차 자료다. " +
      "⚠️ 레코드에 좌표가 없다(관할권 UN 코드·HS 품목·CPC 섹터뿐). 지구본에는 " +
      "implementer 중심 → affected 중심 호(arc)로 렌더한다 (gtaTradePaths.ts). " +
      "⚠️ Red/Amber/Green 은 GTA 의 평가이지 객관적 사실 판정이 아니므로 UI 에서 반드시 귀속 표기할 것. " +
      "basic 접근은 셀프서비스 API 키로 가능하고, full 접근(설명·1차출처·관세율 prior/new)은 " +
      "data@globaltradealert.org 승인 대상이다.",
    status: "planned",
    ingest: "static-build",
    commercialUse: "license-required",
    commercialNote:
      "데이터는 CC BY 4.0 이나 GTA 서비스 약관이 'free for non-commercial users'. API 접근은 별도 상업 조건 문의 필요 (data@globaltradealert.org).",
  },
  {
    layerId: "world-stats",
    source: "Statistics of the World API",
    url: "/api/world-stats/countries",
    cadence: "1 hour cache (API Pro)",
    attribution: "Statistics of the World · World Bank WDI / IMF (provider terms apply)",
    notes:
      "Country GDP·population·trade·defense·inflation·growth cards for econ insight parchment and region panel. History shock + peer compare. Proxied with STATSOFTHEWORLD_API_KEY. Routes: /macro, /market-lamp, /compare, /rankings, /history. Bulk CSV: statisticsoftheworld.com/data.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "license-required",
    commercialNote:
      "Statistics of the World — 유료 API, 제공자 약관에 상업 조건 확인.",
  },
  {
    layerId: "critical-minerals",
    source: "Static build (mapped to resources)",
    url: "/data/{profile}/resources.json",
    cadence: "Project versioned",
    attribution: "USGS / public datasets",
    notes: "Key critical mineral deposits and processing sites (mapped to resources).",
    status: "shipped",
    ingest: "mapped-existing",
    commercialUse: "allowed",
    commercialNote: "USGS — 미 정부 저작물, 퍼블릭 도메인.",
  },
  {
    layerId: "resource-deposits",
    source: "Curated strategic deposit footprints",
    url: "/data/{profile}/resource-deposits.json",
    cadence: "Static build (scripts/build-resource-deposits.js)",
    attribution: "Conflict View curated outlines (approximate extents)",
    notes:
      "Irregular Polygon footprints for major lithium/REE/uranium/titanium/copper belts. Not cadastral geology — thematic map extents. Shown with showResources.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "allowed",
    commercialNote: "자체 큐레이션 외곽선 — 우리 저작물.",
  },
  {
    layerId: "internet-exchanges",
    source: "(미연결) PeeringDB 예정",
    url: "https://www.peeringdb.com/api/ix → /data/{profile}/internet-exchanges.json",
    cadence: "Project versioned",
    // ⚠️ PeeringDB 로 표기하지 않는다 — 현재 파일은 PeeringDB 에서 온 것이 아니다.
    attribution: "(출처 미연결 — 노출 차단됨)",
    notes:
      "현재 shipped 파일은 서드파티 데모 저장소(Skytuhua/SIGINT)의 합성 플레이스홀더 5건이다. " +
      "이름이 'internet-exchanges site 0~4' 이고 좌표는 워싱턴DC·파리·도쿄·두바이·상파울루 " +
      "시청 좌표다. 실재하는 IXP 가 아니다. 실제 PeeringDB 에는 IXP 가 1,000개 이상 있다. " +
      "→ scripts/fetch-peeringdb-ix.js 로 교체 후 shipped 로 되돌릴 것.",
    status: "blocked",
    blockedReason:
      "합성 데모 데이터를 PeeringDB 로 표기하고 있었다 (2026-07-31 감사 P0-3).",
    ingest: "synthetic-demo",
    commercialUse: "allowed",
    commercialNote: "PeeringDB — CC BY 4.0 (실데이터 연결 후 유효).",
  },
  {
    layerId: "sanctions-entities",
    source: "(미연결) OFAC SDN + UN + EU + UK 예정",
    url: "/api/layers/sanctions-entities",
    cadence: "Daily (24h cache)",
    attribution: "(출처 미연결 — 노출 차단됨)",
    notes:
      "⚠️ 카탈로그는 '개인·법인·선박·항공기 공식 벌크 다운로드 + 라이브 폴백' 이라 적었지만, " +
      "route.ts 의 loadSanctions() 는 라이브 fetch 없이 로컬 파일만 읽고 lists 배열을 " +
      "하드코딩한다. 그리고 그 파일은 국가 단위 15건뿐이다 (실제 OFAC SDN 은 1만 건 규모의 " +
      "개인·법인·선박 목록). " +
      "진짜 데이터는 이미 리포에 있다: scripts/vendor/sigint-news-layers/sanctions-entities.json (14MB). " +
      "→ scripts/build-sanctions-entities.js 로 컨버전 후 shipped 로 되돌릴 것.",
    status: "blocked",
    blockedReason:
      "OFAC SDN 으로 표기했으나 실제로는 국가 단위 더미 15건 · 라이브 fetch 없음 " +
      "(2026-07-31 감사 P0-3).",
    ingest: "synthetic-demo",
    commercialUse: "allowed",
    commercialNote: "OFAC·UN 공공 목록 (실데이터 연결 후 유효).",
  },
  {
    layerId: "refugee-camps",
    source: "Static build",
    url: "/data/{profile}/refugee-camps.json",
    cadence: "Project versioned",
    attribution: "UNHCR / public datasets",
    notes: "Major UNHCR-registered refugee settlements and camps.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "allowed",
    commercialNote: "UNHCR 등 공공 데이터.",
  },
  {
    layerId: "arms-embargo-zones",
    source: "Official lists · local build",
    url: "/api/layers/arms-embargo-zones",
    cadence: "Daily (24h cache)",
    attribution: "UN / EU / UK / US + Wikidata",
    notes:
      "Country-level arms embargo zones from official sources with Wikidata SPARQL fallback.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "UN·EU·UK·US 공공 목록 + Wikidata(CC0).",
  },
  {
    /*
     * 2026-08-01 감사에서 신설.
     *
     * `feedCatalog.ts` 의 지정학 RSS 피드(12개 전역 × 매체, 항목 220여 개)가
     * **카탈로그에 등재조차 안 돼 있었다.** 가장 저작권 민감한 자산이
     * `verify:commercial` 게이트의 관할 밖이라, 게이트가 "통과"를 찍어도
     * 실제로는 점검되지 않은 상태였다.
     *
     * @see docs/copyright-audit-2026-08-01.md — O-2
     */
    layerId: "news-geopolitics-rss",
    source: "BBC / Reuters / NYT / WSJ / Al Jazeera / TASS / RT 외 60여 매체",
    url: "/api/news-stream",
    cadence: "90s cache",
    attribution: "Each outlet RSS terms",
    notes:
      "지정학 뉴스 스트림 — feedCatalog.ts 의 12개 전역(global·middle-east·russia-ukraine·china-taiwan·korea·japan·south-asia·southeast-asia·africa·arctic·atlantic·south-america) RSS 피드. 제목 + 최대 220자 스니펫 + 원문 링크만 보관하며 한국어 번역본을 함께 제공한다.",
    status: "shipped",
    ingest: "live-poll",
    commercialUse: "license-required",
    commercialNote:
      "매체별 RSS 약관이 제각각이다. NYT·WSJ·Reuters 등 주요 매체는 RSS 를 개인·비상업 이용으로 한정한다. 제목+링크 인용은 통상 허용되나 (a) 본문 스니펫 재배포와 (b) 한국어 번역(2차적저작물 작성, 저작권법 제22조)은 별개 권리다. 스니펫 상한 220자(RSS_BODY_SNIPPET_MAX)·표시 200자(LAMP_DISPLAY_SUMMARY_MAX)로 묶어뒀으나, 유료 노출 전 매체별 개별 확인 또는 자체 LLM 요약(docs/llm-news-digest.md)으로 대체 필요.",
  },
  {
    /*
     * YouTube Atom 피드(feeds/videos.xml) 기반. 2026-08-01 감사에서 신설.
     * 구현은 ToS 준수 패턴 — 공식 embed 플레이어 + i.ytimg.com 썸네일 핫링크.
     * 영상 파일 다운로드·재호스팅 없음.
     */
    layerId: "news-video-youtube",
    source: "YouTube (BBC / Reuters / AP / Al Jazeera / DW / Bloomberg / CNBC / FT)",
    url: "/api/video-news",
    cadence: "폴링 (Atom)",
    attribution: "YouTube · 각 채널 저작권자",
    notes:
      "방송·와이어 공식 채널의 Atom 피드. 재생은 공식 embed 플레이어(youtube.com/embed), 썸네일은 i.ytimg.com 핫링크 — 영상 파일을 내려받거나 재호스팅하지 않는다.",
    status: "shipped",
    ingest: "live-poll",
    commercialUse: "unknown",
    commercialNote:
      "YouTube ToS 는 API Services 또는 공식 embed 플레이어 외의 프로그램적 접근을 제한한다. 공개 Atom 피드(feeds/videos.xml) 사용은 회색지대 — 유료 노출 전 YouTube Data API v3 로 전환하거나 약관 확인 필요. 재생·썸네일 구현 자체는 ToS 가 요구하는 패턴을 따르고 있다.",
  },
  {
    layerId: "news-economy-rss",
    source: "Reuters / WSJ / CNBC / FT / Google News",
    url: "/api/news-stream?packages=geo-trader",
    cadence: "90s cache",
    attribution: "Each outlet RSS terms",
    notes:
      "Major-industry & company headlines for geo-trader: Big Tech/AI, semis (Nvidia·TSMC·ASML), EV/batteries, oil majors, shipping lines, plus market wires. Fetched via ALL_ECON_FEEDS.",
    status: "shipped",
    ingest: "live-poll",
    commercialUse: "license-required",
    commercialNote:
      "매체별 RSS 약관. 제목+링크 인용은 통상 허용되나 본문·이미지 재배포는 별도. 유료 노출 전 매체별 확인.",
  },
  {
    layerId: "telegram-osint",
    source: "IRONSIGHT (Nobler Works)",
    url: "/api/telegram-alerts",
    cadence: "Embed scrape · sync on demand",
    attribution: "Copyright (c) 2026 Nobler Works · MIT License",
    notes:
      "Public Telegram channel catalog derived from IRONSIGHT (MIT). Post bodies belong to channel operators — in-product shows ~half snippet only; full post via t.me CTA (optional click-to-load embed). Not in LLM pipeline. See telegramOsintPolicy.ts.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "license-required",
    commercialNote:
      "IRONSIGHT 채널 카탈로그는 MIT. 채널 게시물은 운영자 저작물 — 제품은 약 절반 스니펫만 표시하고 전문은 t.me CTA. 임베드는 사용자 클릭 시에만.",
  },
  {
    layerId: "app-data",
    source: "Natural Earth + GDELT build",
    url: "/api/data-stream?file=app-data.json",
    cadence: "Static build · stream on demand",
    attribution: "Natural Earth · GDELT",
    notes:
      "Manifest app-data.json + countries/disputes/places chunks. First paint loads countries+disputes only; places.json deferred. gzip: npm run data:compress.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "allowed",
    commercialNote: "Natural Earth(퍼블릭 도메인) + GDELT(공개).",
  },
  {
    layerId: "dispute-zones-me",
    source: "IRONSIGHT regionBoxes → disputes.json → D1 hatch",
    url: "/api/render/dispute-paths",
    cadence: "Build / Cron warm · toggle on-demand D1",
    attribution: "Copyright (c) 2026 Nobler Works · MIT License (IRONSIGHT reference)",
    notes:
      "Middle East combat/tension boxes (IRONSIGHT iran-israel) merged into disputes.json. Hatch precomputed to D1 `dispute_hatch_paths`; client fetches on war/diplomatic toggle only.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "IRONSIGHT — MIT License.",
  },
  {
    layerId: "viina-ukraine-control",
    source: "VIINA → D1 hatch snapshot",
    url: "/api/render/ukraine-control-paths",
    cadence: "Build / Cron warm · toggle on-demand D1",
    attribution: "VIINA · Open Database License (ODbL) v1.0",
    notes:
      "Ukraine control hatch precomputed (`ukraine:hatch:build`) into D1. Globe toggles fetch snapshot paths only — no client geometry hatch. VIINA raw stays private.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "allowed",
    commercialNote: "VIINA — ODbL. 상업 이용 가능하되 렌더 전용 유지(원본 export 금지).",
  },
  {
    layerId: "korea-missile-incidents",
    source: "GDELT live · DPRK missile dens",
    url: "/api/gdelt + src/data/koreaMissileIncidentsSeed.ts",
    cadence: "Live GDELT · layer toggle",
    attribution: "GDELT · open reporting / known launch anchors",
    notes:
      "주황 네온 점+물결. 상시 시드가 아니라 최신(24h) 미사일·발사 속보가 있을 때만 점등. 탄착군 미확정 — 발생 좌표 기준. 실시간 궤적·탄착은 우크라 NEPTUN.",
    status: "shipped",
    ingest: "live-api",
    commercialUse: "allowed",
    commercialNote: "GDELT — 공개.",
  },
  {
    layerId: "ukraine-strikes-russia",
    source: "GDELT live · 러시아 피격지 앵커",
    url: "/api/gdelt + src/data/russiaStrikeIncidentsSeed.ts",
    cadence: "Live GDELT · layer toggle",
    attribution: "GDELT · reported strikes on Russian targets (unverified)",
    notes:
      "우크라이나 → 러시아(및 점령지) 타격. 러시아는 공식 실시간 방공 경보를 공개하지 않아 궤적·탄착 불가 — 자주 피격되는 지점(벨고로드·쿠르스크·엥겔스·세바스토폴·정유소 등) 앵커에 최신(24h) GDELT 속보가 러시아 표적 지명과 함께 있을 때만 점등. 모두 「보도·미확인」. NEPTUN(우크라로 오는 위협)의 반대 방향.",
    status: "shipped",
    ingest: "live-api",
    commercialUse: "allowed",
    commercialNote: "GDELT — 공개.",
  },
  {
    layerId: "china-theater-incidents",
    source: "GDELT live · China theater dens (dyad layers)",
    url: "/api/gdelt + src/data/chinaTheaterIncidentsSeed.ts",
    cadence: "Live GDELT · layer toggles",
    attribution: "GDELT · theater dens for China↔Taiwan / Japan / Philippines / US↔China",
    notes:
      "빨간 네온 점 + 물방울 리플. 시드 앵커는 매칭용 — 최신(24h) GDELT 속보가 앵커 근처에 있을 때만 사건 좌표에 표시.",
    status: "shipped",
    ingest: "live-api",
    commercialUse: "allowed",
    commercialNote: "GDELT — 공개.",
  },
  {
    layerId: "hapi-conflict-casualties",
    source: "ACLED via HDX HAPI · conflict-events (political_violence fatalities)",
    url: "https://hapi.humdata.org/api/v2/coordination-context/conflict-events → /api/hapi-conflict-casualties",
    cadence: "Live HAPI fetch · ~30m cache · theater-start cumulative (UKR/IRN/Gaza) · 4-month CHN/TWN",
    attribution:
      "Armed Conflict Location & Event Data Project (ACLED) · HDX HAPI · OCHA HDX · www.acleddata.com",
    notes:
      "원천: ACLED. 배포/질의: OCHA HDX HAPI conflict-events. 전선 사망은 개전일부터 누적(UKR 2022-02-24, IRN 2026-02-28, Gaza/Lebanon 2023-10-07). 중국·대만은 약 4개월 사건 창. 부상 필드 없음. 우크라 명의 KIA+CSIS WIA는 mediazona-casualties. Docs: https://hapi.humdata.org/docs · Dataset: https://data.humdata.org/dataset/hdx-hapi-conflict-event · ACLED attribution: https://acleddata.com/attributionpolicy",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "prohibited",
    commercialNote:
      "⚠️ ACLED EULA: 'Commercial entities may not access or use the Content and/or Platforms without first obtaining a corporate license from ACLED.' 수익화 제품에 노출 금지. 상업 라이선스 문의: acleddata.com/eula",
  },
  {
    layerId: "nuclear-warheads",
    source: "Our World in Data — Nuclear warhead stockpiles",
    url: "https://ourworldindata.org/grapher/nuclear-warhead-stockpiles-lines",
    cadence: "Annual (OWID/FAS) · static seed",
    attribution: "Our World in Data · FAS Nuclear Notebook",
    notes:
      "각국 좌표 위 ICBM 아이콘 + 최신(2026) 핵탄두 보유 수. 보유 9개국(러·미·중·프·영·인·파·이스라엘·북한)만 표시, 폐기국(남아공)·세계 합계 제외.",
    status: "shipped",
    ingest: "static-build",
    commercialUse: "allowed",
    commercialNote: "Our World in Data(CC BY) + FAS Nuclear Notebook.",
  },
  {
    layerId: "mediazona-casualties",
    source: "Mediazona × BBC (KIA) · CSIS estimate (WIA)",
    url: "/api/mediazona-casualties",
    cadence: "Homepage scrape · 1h cache · Kaggle panel seed fallback",
    attribution: "Mediazona · BBC Russian Service · CSIS (WIA est.) · Meduza",
    notes:
      "Globe overlay: named RU KIA (lower bound) + CSIS WIA estimate on the Ukraine theater. Per-oblast ACLED fatalities remain on hapi-conflict-casualties (different definition).",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "license-required",
    commercialNote:
      "Mediazona·BBC·Meduza — 언론사 저작물. 수치 인용과 본문 재배포는 다름.",
  },
  {
    layerId: "living-conflict-taiwan",
    source: "GDELT Doc 2.0 (query_tag=taiwan-tension) · optional Telegram OSINT",
    url: "/api/living-conflict/taiwan-strait",
    cadence: "Cron heuristic curate · daily · seed baseline always available",
    attribution: "GDELT Project · Telegram public channels (when available)",
    notes:
      "진행형 대만해협 타임라인. LLM 없이 점수·시간 상위 헤드라인을 1~2줄로 압축. 「자동 요약 · 오보 가능」 고지. 수동 검수는 시드/JSON 덮어쓰기.",
    status: "shipped",
    ingest: "cached-api",
    commercialUse: "license-required",
    commercialNote:
      "GDELT 는 공개이나 Telegram 채널 글은 운영자 소유.",
  },
];

export function getSourceNote(layerId: string): NewsLayerSourceNote | undefined {
  return NEWS_LAYER_SOURCE_CATALOG.find((note) => note.layerId === layerId);
}

/** attribution · cadence caption for UI source lines */
export function catalogCaption(layerId: string): string {
  const note = getSourceNote(layerId);
  if (!note) return "";
  return `${note.attribution} · ${note.cadence}`;
}
