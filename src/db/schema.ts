import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * D1 schema (Drizzle) — 멋진 신세계
 *
 * - firms_fires: Cron ingest 라이브 산불/열원 (NASA FIRMS)
 * - ukraine_control_paths: 점령/주장 테두리·빗금 사전계산 path
 * - ukraine_control_builds: 사전계산 빌드 메타
 * - gdelt_points / ingest_runs: Cron ingest 호환
 * - news_stream_snapshots / news_stream_items: RSS 티어 뉴스 D1 캐시
 * - ais_vessels / adsb_aircraft: MarineTraffic·ADS-B 클라우드 로그
 * - submarine_tunnels: 해저터널 인프라 (온디맨드)
 * - dispute_hatch_*: 분쟁·중동(이란) 전선 빗금 스냅샷
 */

/** NASA FIRMS 라이브 포인트 (workers/cron-ingest 와 동일 테이블) */
export const firmsFires = sqliteTable(
  "firms_fires",
  {
    id: text("id").primaryKey(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    frp: real("frp"),
    brightness: real("brightness"),
    confidence: text("confidence"),
    acqDate: text("acq_date"),
    acqTime: text("acq_time"),
    satellite: text("satellite"),
    daynight: text("daynight"),
    source: text("source").notNull().default("VIIRS_SNPP_NRT"),
    theater: text("theater"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    ingestedIdx: index("idx_firms_ingested").on(t.ingestedAt),
    theaterIdx: index("idx_firms_theater").on(t.theater),
    geoIdx: index("idx_firms_geo").on(t.lat, t.lng),
  }),
);

/**
 * 우크라이나 점령/주장 빗금·테두리 사전계산 결과.
 * 클라이언트 `buildUkraineFrontRender` 대신 D1에서 path를 읽어 그린다.
 *
 * kind 예:
 *  ukraine-ru-occupied | ukraine-ua-occupied
 *  ukraine-ru-occupied-hatch | ukraine-ua-occupied-hatch
 *  ukraine-ru-claim | ukraine-ua-claim
 *  ukraine-ru-claim-hatch | ukraine-ua-claim-hatch
 */
export const ukraineControlPaths = sqliteTable(
  "ukraine_control_paths",
  {
    id: text("id").primaryKey(),
    /** VIINA zone id */
    zoneId: text("zone_id").notNull(),
    kind: text("kind").notNull(),
    name: text("name"),
    accentColor: text("accent_color"),
    /** overview | detail — LOD별 사전계산 세트 */
    lodTier: text("lod_tier").notNull(),
    /** VIINA 기준일 YYYYMMDD */
    controlDate: text("control_date").notNull(),
    /** JSON: Array<{ lat: number; lng: number }> */
    pointsJson: text("points_json").notNull(),
    pointCount: integer("point_count").notNull().default(0),
    minLat: real("min_lat"),
    minLng: real("min_lng"),
    maxLat: real("max_lat"),
    maxLng: real("max_lng"),
    builtAt: text("built_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    zoneIdx: index("idx_ua_paths_zone").on(t.zoneId),
    kindIdx: index("idx_ua_paths_kind").on(t.kind),
    lodDateIdx: index("idx_ua_paths_lod_date").on(t.lodTier, t.controlDate),
    geoIdx: index("idx_ua_paths_geo").on(t.minLat, t.maxLat, t.minLng, t.maxLng),
  }),
);

/** 우크라 사전계산 빌드 이력 */
export const ukraineControlBuilds = sqliteTable(
  "ukraine_control_builds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    controlDate: text("control_date").notNull(),
    lodTier: text("lod_tier").notNull(),
    pathCount: integer("path_count").notNull().default(0),
    zoneCount: integer("zone_count").notNull().default(0),
    source: text("source").default("viina-build"),
    builtAt: text("built_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    note: text("note"),
  },
  (t) => ({
    dateLodIdx: index("idx_ua_builds_date_lod").on(t.controlDate, t.lodTier),
  }),
);

/** GDELT Geo 스냅샷 (Cron ingest 호환) */
export const gdeltPoints = sqliteTable(
  "gdelt_points",
  {
    id: text("id").primaryKey(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    name: text("name"),
    url: text("url"),
    mentionCount: integer("mention_count"),
    shareImage: text("share_image"),
    queryTag: text("query_tag"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    ingestedIdx: index("idx_gdelt_ingested").on(t.ingestedAt),
    tagIdx: index("idx_gdelt_tag").on(t.queryTag),
    geoIdx: index("idx_gdelt_geo").on(t.lat, t.lng),
  }),
);

/**
 * 뉴스 스트림 전체 페이로드 스냅샷 (패키지·언어별).
 * `/api/news-stream` 이 RSS 재수집 대신 D1을 우선 읽어 렌더를 빠르게 한다.
 */
export const newsStreamSnapshots = sqliteTable(
  "news_stream_snapshots",
  {
    /** e.g. conflict-watch:ko | default:en */
    cacheKey: text("cache_key").primaryKey(),
    packages: text("packages"),
    lang: text("lang").notNull().default("ko"),
    /** JSON: NewsStreamPayload */
    payloadJson: text("payload_json").notNull(),
    itemCount: integer("item_count").notNull().default(0),
    tier1Count: integer("tier1_count").notNull().default(0),
    tier2Count: integer("tier2_count").notNull().default(0),
    tier3Count: integer("tier3_count").notNull().default(0),
    fetchedAt: text("fetched_at").notNull(),
    ingestedAt: text("ingested_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    fetchedIdx: index("idx_news_snap_fetched").on(t.fetchedAt),
    langIdx: index("idx_news_snap_lang").on(t.lang),
  }),
);

/**
 * 뉴스 티어별 개별 아이템 (스냅샷에서 펼친 행).
 * trust_tier = 1|2|3 (매체 신뢰도).
 */
export const newsStreamItems = sqliteTable(
  "news_stream_items",
  {
    /** `${cacheKey}:${itemId}:${role}` */
    id: text("id").primaryKey(),
    cacheKey: text("cache_key").notNull(),
    itemId: text("item_id").notNull(),
    trustTier: integer("trust_tier").notNull(),
    theater: text("theater"),
    title: text("title").notNull(),
    link: text("link").notNull(),
    source: text("source"),
    publisher: text("publisher"),
    pubDate: text("pub_date"),
    feedTopic: text("feed_topic"),
    econGenre: text("econ_genre"),
    category: text("category"),
    imageUrl: text("image_url"),
    summary: text("summary"),
    /** verified | stateMedia | hero */
    role: text("role").notNull().default("verified"),
    ingestedAt: text("ingested_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    cacheIdx: index("idx_news_items_cache").on(t.cacheKey),
    tierIdx: index("idx_news_items_tier").on(t.trustTier),
    theaterIdx: index("idx_news_items_theater").on(t.theater),
    ingestedIdx: index("idx_news_items_ingested").on(t.ingestedAt),
  }),
);

/** MarineTraffic / aisstream AIS 스냅샷 (Cron warm → D1) */
export const aisVessels = sqliteTable(
  "ais_vessels",
  {
    id: text("id").primaryKey(),
    mmsi: text("mmsi").notNull(),
    shipName: text("ship_name"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    sog: real("sog"),
    cog: real("cog"),
    trueHeading: real("true_heading"),
    shipType: integer("ship_type"),
    shipTypeLabel: text("ship_type_label"),
    category: text("category").notNull().default("other"),
    provider: text("provider"),
    timestamp: text("timestamp"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    ingestedIdx: index("idx_ais_ingested").on(t.ingestedAt),
    categoryIdx: index("idx_ais_category").on(t.category),
    geoIdx: index("idx_ais_geo").on(t.lat, t.lng),
  }),
);

/** ADS-B 군용·민간 스냅샷 (Cron warm → D1) */
export const adsbAircraft = sqliteTable(
  "adsb_aircraft",
  {
    id: text("id").primaryKey(),
    hex: text("hex").notNull(),
    /** mil | civ */
    mode: text("mode").notNull(),
    callsign: text("callsign"),
    registration: text("registration"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    altitude: real("altitude"),
    altitudeGeom: real("altitude_geom"),
    groundSpeed: real("ground_speed"),
    track: real("track"),
    type: text("type"),
    category: text("category"),
    dbFlags: integer("db_flags"),
    squawk: text("squawk"),
    emergency: text("emergency"),
    /** JSON: 나머지 MilitaryAircraft 필드 */
    payloadJson: text("payload_json"),
    hub: text("hub"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    ingestedIdx: index("idx_adsb_ingested").on(t.ingestedAt),
    modeIdx: index("idx_adsb_mode").on(t.mode),
    geoIdx: index("idx_adsb_geo").on(t.lat, t.lng),
    hexIdx: index("idx_adsb_hex").on(t.hex),
  }),
);

/** 해저터널 정적 인프라 (시드 + 온디맨드 API) */
export const submarineTunnels = sqliteTable(
  "submarine_tunnels",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    startLat: real("start_lat"),
    startLng: real("start_lng"),
    endLat: real("end_lat"),
    endLng: real("end_lng"),
    country: text("country"),
    lengthKm: real("length_km"),
    riskNote: text("risk_note"),
    relatedTickers: text("related_tickers"),
    tier: integer("tier").notNull().default(1),
    ingestedAt: text("ingested_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    geoIdx: index("idx_tunnels_geo").on(t.lat, t.lng),
  }),
);

/**
 * 분쟁·중동(이란 등) 전선 빗금 사전계산.
 * disputes.json 기반 — 이란/이스라엘 IRONSIGHT 시드 포함.
 */
export const disputeHatchPaths = sqliteTable(
  "dispute_hatch_paths",
  {
    id: text("id").primaryKey(),
    disputeId: text("dispute_id").notNull(),
    kind: text("kind").notNull(),
    name: text("name"),
    accentColor: text("accent_color"),
    lodTier: text("lod_tier").notNull(),
    pointsJson: text("points_json").notNull(),
    pointCount: integer("point_count").notNull().default(0),
    minLat: real("min_lat"),
    minLng: real("min_lng"),
    maxLat: real("max_lat"),
    maxLng: real("max_lng"),
    builtAt: text("built_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    disputeIdx: index("idx_dispute_hatch_dispute").on(t.disputeId),
    lodIdx: index("idx_dispute_hatch_lod").on(t.lodTier),
    geoIdx: index("idx_dispute_hatch_geo").on(t.minLat, t.maxLat, t.minLng, t.maxLng),
  }),
);

export const disputeHatchBuilds = sqliteTable(
  "dispute_hatch_builds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    lodTier: text("lod_tier").notNull(),
    pathCount: integer("path_count").notNull().default(0),
    disputeCount: integer("dispute_count").notNull().default(0),
    pathDisputeIdsJson: text("path_dispute_ids_json"),
    source: text("source").default("dispute-hatch-precompute"),
    builtAt: text("built_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    note: text("note"),
  },
  (t) => ({
    lodIdx: index("idx_dispute_hatch_builds_lod").on(t.lodTier),
  }),
);

/**
 * 동영상 뉴스 메타 스냅샷 (YouTube Atom → 제목·썸네일·URL만).
 * 본 `news_stream_*` 와 분리 — 클릭 재생용.
 */
export const videoNewsSnapshots = sqliteTable(
  "video_news_snapshots",
  {
    /** e.g. video:defense:ko | video:economy:en */
    cacheKey: text("cache_key").primaryKey(),
    topic: text("topic").notNull(),
    lang: text("lang").notNull().default("ko"),
    packages: text("packages"),
    /** JSON: VideoNewsPayload */
    payloadJson: text("payload_json").notNull(),
    itemCount: integer("item_count").notNull().default(0),
    fetchedAt: text("fetched_at").notNull(),
    ingestedAt: text("ingested_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    fetchedIdx: index("idx_video_news_fetched").on(t.fetchedAt),
    topicIdx: index("idx_video_news_topic").on(t.topic),
  }),
);

/**
 * 텔레그램 OSINT 라이브 속보 (Cloudflare cron 워커가 t.me 공개 채널 스크레이프 → D1).
 * 서버리스(Vercel/CF) 어디에 배포해도 방문자 모두 같은 피드를 본다.
 */
export const telegramAlerts = sqliteTable(
  "telegram_alerts",
  {
    /** `${channelUsername}/${postId}` */
    id: text("id").primaryKey(),
    channelUsername: text("channel_username").notNull(),
    channelTitle: text("channel_title"),
    /** ukraine | middle-east | global */
    region: text("region").notNull().default("global"),
    text: text("text").notNull(),
    messageUrl: text("message_url"),
    receivedAt: text("received_at").notNull(),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    receivedIdx: index("idx_tg_received").on(t.receivedAt),
    ingestedIdx: index("idx_tg_ingested").on(t.ingestedAt),
    regionIdx: index("idx_tg_region").on(t.region),
  }),
);

/**
 * 일간/주간/월간 회고 브리핑용 집계 (LLM 없음).
 * Cron이 매일 daily-* 스냅샷을 쌓고, weekly/monthly는 daily 합산.
 */
export const briefingPeriodStats = sqliteTable(
  "briefing_period_stats",
  {
    /** daily-YYYY-MM-DD | weekly-YYYY-Www | monthly-YYYY-MM */
    periodKey: text("period_key").primaryKey(),
    tier: text("tier").notNull(),
    gdeltCount: integer("gdelt_count").notNull().default(0),
    firmsCount: integer("firms_count").notNull().default(0),
    telegramCount: integer("telegram_count").notNull().default(0),
    newsItemCount: integer("news_item_count").notNull().default(0),
    topGdeltTag: text("top_gdelt_tag"),
    topTelegramRegion: text("top_telegram_region"),
    detailJson: text("detail_json"),
    windowStart: text("window_start"),
    windowEnd: text("window_end"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    tierIdx: index("idx_briefing_tier").on(t.tier),
    updatedIdx: index("idx_briefing_updated").on(t.updatedAt),
  }),
);

/**
 * 일일 전장 긴장도 / 초크포인트 공급망 스트레스 / 세계 긴장도 랭킹.
 * Cron이 UTC 날짜별로 upsert — 전장 점수는 7일 베이스라인 z-score,
 * kind=world entity=global 은 전장 점수 평균·최고치 혼합 간판 숫자.
 * 전일 rank와 비교해 delta_rank / delta_score 채움.
 */
export const dailyEntityRanks = sqliteTable(
  "daily_entity_ranks",
  {
    rankDate: text("rank_date").notNull(),
    /** theater | chokepoint */
    kind: text("kind").notNull(),
    entityId: text("entity_id").notNull(),
    labelKo: text("label_ko").notNull(),
    labelEn: text("label_en").notNull(),
    score: real("score").notNull().default(0),
    rank: integer("rank").notNull(),
    prevRank: integer("prev_rank"),
    deltaRank: integer("delta_rank"),
    deltaScore: real("delta_score"),
    detailJson: text("detail_json"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.rankDate, t.kind, t.entityId] }),
    dateKindRankIdx: index("idx_daily_ranks_date_kind_rank").on(t.rankDate, t.kind, t.rank),
    updatedIdx: index("idx_daily_ranks_updated").on(t.updatedAt),
  }),
);

/**
 * SITREP 변화 로그 — 상태 전환(검증등급 변경·유의미한 점수 델타)을 append-only로 기록.
 * cron-ingest가 매 실행마다 daily_entity_ranks 전일 대비 diff를 감지해서 쓴다.
 * 원시 사건(뉴스)이 아니라 "우리 시스템 판단이 바뀐 순간"만 기록 — 상황실 로그 컨셉.
 */
export const sitrepEvents = sqliteTable(
  "sitrep_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    rankDate: text("rank_date").notNull(),
    entityId: text("entity_id").notNull(),
    labelKo: text("label_ko").notNull(),
    labelEn: text("label_en").notNull(),
    /** verification-change | score-delta */
    eventType: text("event_type").notNull(),
    messageKo: text("message_ko").notNull(),
    messageEn: text("message_en").notNull(),
    deltaScore: real("delta_score"),
    prevVerification: text("prev_verification"),
    nextVerification: text("next_verification"),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    createdIdx: index("idx_sitrep_created").on(t.createdAt),
  }),
);

/**
 * UKMTO(Royal Navy) 상선 피습·나포·의심활동 경보 — 홍해·호르무즈 등.
 * 비공식(리버스 엔지니어링) 엔드포인트 — README「비공식 엔드포인트 사용 원칙」참고.
 * id = 소스 sitecoreId (dedupe 기준, 값 갱신 시 upsert).
 */
export const ukmtoIncidents = sqliteTable(
  "ukmto_incidents",
  {
    id: text("id").primaryKey(),
    incidentNumber: integer("incident_number"),
    /** Attack | Suspicious Activity | Advisory | Boarding | Hijack 등 */
    incidentTypeName: text("incident_type_name").notNull(),
    incidentTypeLevel: integer("incident_type_level"),
    /** Yellow | Red — 소스 표기 그대로 */
    pinColour: text("pin_colour"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    region: text("region"),
    place: text("place"),
    vesselName: text("vessel_name"),
    vesselType: text("vessel_type"),
    vesselUnderPirateControl: integer("vessel_under_pirate_control").notNull().default(0),
    crewHeld: integer("crew_held"),
    detail: text("detail"),
    utcDateOfIncident: text("utc_date_of_incident"),
    utcDateCreated: text("utc_date_created"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    geoIdx: index("idx_ukmto_geo").on(t.lat, t.lng),
    dateIdx: index("idx_ukmto_date").on(t.utcDateOfIncident),
  }),
);

/**
 * NAVAREA in-force 경고 (JHOD / NGA TXT → cron 스냅샷 교체).
 * id = `{region}-{yy}-{num}` (예: XI-26-0330, IV-26-0695).
 */
export const navareaFeatures = sqliteTable(
  "navarea_features",
  {
    id: text("id").primaryKey(),
    region: text("region").notNull(),
    source: text("source").notNull(),
    warningDate: text("warning_date").notNull(),
    areaHint: text("area_hint"),
    description: text("description").notNull(),
    geometryType: text("geometry_type").notNull(),
    geojson: text("geojson").notNull(),
    radiusNm: real("radius_nm"),
    lat: real("lat"),
    lng: real("lng"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    regionIdx: index("idx_navarea_region").on(t.region),
    dateIdx: index("idx_navarea_date").on(t.warningDate),
    geoIdx: index("idx_navarea_geo").on(t.lat, t.lng),
  }),
);

/**
 * 군사 훈련 경보 — 공시·OSINT·(보너스) RF 다층.
 * 항적만으로 북·중·러·이란을 “정확”히 보는 용도가 아님.
 */
export const militaryExercises = sqliteTable(
  "military_exercises",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary"),
    actorsJson: text("actors_json").notNull().default("[]"),
    coalition: text("coalition"),
    theater: text("theater"),
    lat: real("lat"),
    lng: real("lng"),
    geojson: text("geojson"),
    startsAt: text("starts_at"),
    endsAt: text("ends_at"),
    announcedAt: text("announced_at"),
    /** announced | announced_rf | announced_osint | unverified */
    confidence: text("confidence").notNull().default("announced"),
    sourcesJson: text("sources_json").notNull().default("[]"),
    rfGapNote: text("rf_gap_note"),
    active: integer("active").notNull().default(1),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    activeIdx: index("idx_military_exercises_active").on(t.active, t.announcedAt),
    theaterIdx: index("idx_military_exercises_theater").on(t.theater),
    geoIdx: index("idx_military_exercises_geo").on(t.lat, t.lng),
  }),
);

/**
 * 게스트 일일 예측 — 내일 긴장도 1위 전장 고르기 / 긴장도 UP·DOWN.
 * PK (target_date, kind, device_id) — 하루 1표 upsert.
 */
export const dailyRankPredictions = sqliteTable(
  "daily_rank_predictions",
  {
    targetDate: text("target_date").notNull(),
    /** theater | tension-dir */
    kind: text("kind").notNull(),
    deviceId: text("device_id").notNull(),
    /** theater id 또는 up|down */
    pickEntityId: text("pick_entity_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.targetDate, t.kind, t.deviceId] }),
    dateKindIdx: index("idx_daily_pred_date_kind").on(t.targetDate, t.kind),
  }),
);

/**
 * 매일 동일 문제 — 「내일 이 지표 긴장도는 오를까/내릴까」
 * target_date = 정산일(UTC). 전날 유저가 투표.
 */
export const dailyPrompts = sqliteTable("daily_prompts", {
  targetDate: text("target_date").primaryKey(),
  /** theater | chokepoint | world */
  subjectKind: text("subject_kind").notNull(),
  subjectId: text("subject_id").notNull(),
  labelKo: text("label_ko").notNull(),
  labelEn: text("label_en").notNull(),
  baselineScore: real("baseline_score").notNull().default(0),
  questionKo: text("question_ko").notNull(),
  questionEn: text("question_en").notNull(),
  createdAt: text("created_at").notNull(),
});

/** 예측 정산 집계 — 「어제 맞춘 N%」 */
export const dailyPredictionStats = sqliteTable(
  "daily_prediction_stats",
  {
    targetDate: text("target_date").notNull(),
    kind: text("kind").notNull(),
    total: integer("total").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    correctPct: real("correct_pct").notNull().default(0),
    winnerEntityId: text("winner_entity_id"),
    resolvedAt: text("resolved_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.targetDate, t.kind] }),
  }),
);

/**
 * 벙커 감성지수 — UTC 날짜·device당 STABLE | BUNKER 1표.
 * 집계: bunker / total = 패닉 %.
 */
export const bunkerSentimentVotes = sqliteTable(
  "bunker_sentiment_votes",
  {
    voteDate: text("vote_date").notNull(),
    deviceId: text("device_id").notNull(),
    /** stable | bunker */
    pick: text("pick").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.voteDate, t.deviceId] }),
    dateIdx: index("idx_bunker_sentiment_date").on(t.voteDate),
  }),
);

/** Tzeva Adom / NEPTUN 공습경보 스냅샷 — soft rank 신호 */
export const airRaidAlerts = sqliteTable(
  "air_raid_alerts",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    theaterId: text("theater_id").notNull(),
    region: text("region"),
    title: text("title"),
    severity: integer("severity").notNull().default(3),
    alertAt: text("alert_at").notNull(),
    active: integer("active").notNull().default(0),
    detailJson: text("detail_json"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    theaterAtIdx: index("idx_air_raid_theater_at").on(t.theaterId, t.alertAt),
    sourceAtIdx: index("idx_air_raid_source_at").on(t.source, t.alertAt),
    ingestedIdx: index("idx_air_raid_ingested").on(t.ingestedAt),
  }),
);

/** 전장 일별 신호 집계 — FIRMS/GDELT prune 후에도 90일 기준선 유지 */
export const theaterSignalDaily = sqliteTable(
  "theater_signal_daily",
  {
    signalDate: text("signal_date").notNull(),
    theaterId: text("theater_id").notNull(),
    mentions: real("mentions").notNull().default(0),
    points: real("points").notNull().default(0),
    fireCount: real("fire_count").notNull().default(0),
    telegramCount: real("telegram_count").notNull().default(0),
    airRaidScore: real("air_raid_score").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.signalDate, t.theaterId] }),
    theaterIdx: index("idx_theater_signal_daily_theater").on(
      t.theaterId,
      t.signalDate,
    ),
  }),
);

/**
 * 경량 UI 이벤트 로그 — 공유 버튼 등 바이럴 기능이 실제로 눌리는지 확인용.
 * 개인식별 정보 없음(세션/유저 식별자 저장 안 함). 순수 append-only 카운팅 목적.
 */
export const uiEvents = sqliteTable(
  "ui_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** e.g. share_view_click | friction_card_share_success | mobile_home_view_toggle */
    event: text("event").notNull(),
    /** JSON: 부가 메타(예: {"to":"globe"}) — 없으면 null */
    metaJson: text("meta_json"),
    viewerMode: text("viewer_mode"),
    lang: text("lang"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    eventIdx: index("idx_ui_events_event").on(t.event),
    createdIdx: index("idx_ui_events_created").on(t.createdAt),
  }),
);

/**
 * 진행형 분쟁 타임라인 — cron이 GDELT(taiwan-tension 등)에서 휴리스틱 큐레이션.
 * PK (conflict_id, entry_date, id) — 날짜당 1~3행 상한은 앱/큐레이터가 강제.
 */
export const livingTimelineEntries = sqliteTable(
  "living_timeline_entries",
  {
    id: text("id").primaryKey(),
    conflictId: text("conflict_id").notNull(),
    entryDate: text("entry_date").notNull(),
    headlineKo: text("headline_ko").notNull(),
    headlineEn: text("headline_en").notNull(),
    sourceUrlsJson: text("source_urls_json"),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    conflictDateIdx: index("idx_living_timeline_conflict_date").on(
      t.conflictId,
      t.entryDate,
    ),
    dateIdx: index("idx_living_timeline_date").on(t.entryDate),
  }),
);

/**
 * 웹 푸시 구독 — endpoint 단위. 개인정보 최소(UA·lang만 선택).
 */
export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    endpoint: text("endpoint").primaryKey(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    lang: text("lang"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    updatedIdx: index("idx_push_subscriptions_updated").on(t.updatedAt),
  }),
);

/** Cron / 빌드 실행 로그 */
export const ingestRuns = sqliteTable("ingest_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  firmsCount: integer("firms_count").default(0),
  gdeltCount: integer("gdelt_count").default(0),
  ok: integer("ok").notNull().default(0),
  error: text("error"),
  detailJson: text("detail_json"),
});

export type FirmsFireRow = typeof firmsFires.$inferSelect;
export type NewFirmsFireRow = typeof firmsFires.$inferInsert;
export type UkraineControlPathRow = typeof ukraineControlPaths.$inferSelect;
export type NewUkraineControlPathRow = typeof ukraineControlPaths.$inferInsert;
export type UkraineControlBuildRow = typeof ukraineControlBuilds.$inferSelect;
export type NewsStreamSnapshotRow = typeof newsStreamSnapshots.$inferSelect;
export type NewsStreamItemRow = typeof newsStreamItems.$inferSelect;
export type VideoNewsSnapshotRow = typeof videoNewsSnapshots.$inferSelect;
export type AisVesselRow = typeof aisVessels.$inferSelect;
export type AdsbAircraftRow = typeof adsbAircraft.$inferSelect;
export type SubmarineTunnelRow = typeof submarineTunnels.$inferSelect;
export type DisputeHatchPathRow = typeof disputeHatchPaths.$inferSelect;
export type NewDisputeHatchPathRow = typeof disputeHatchPaths.$inferInsert;
export type TelegramAlertRow = typeof telegramAlerts.$inferSelect;
export type NewTelegramAlertRow = typeof telegramAlerts.$inferInsert;
export type BriefingPeriodStatsRow = typeof briefingPeriodStats.$inferSelect;
export type NewBriefingPeriodStatsRow = typeof briefingPeriodStats.$inferInsert;
export type DailyEntityRankRow = typeof dailyEntityRanks.$inferSelect;
export type NewDailyEntityRankRow = typeof dailyEntityRanks.$inferInsert;
export type SitrepEventRow = typeof sitrepEvents.$inferSelect;
export type NewSitrepEventRow = typeof sitrepEvents.$inferInsert;
export type DailyRankPredictionRow = typeof dailyRankPredictions.$inferSelect;
export type NewDailyRankPredictionRow = typeof dailyRankPredictions.$inferInsert;
export type DailyPredictionStatsRow = typeof dailyPredictionStats.$inferSelect;
export type NewDailyPredictionStatsRow = typeof dailyPredictionStats.$inferInsert;
export type DailyPromptRow = typeof dailyPrompts.$inferSelect;
export type NewDailyPromptRow = typeof dailyPrompts.$inferInsert;
export type BunkerSentimentVoteRow = typeof bunkerSentimentVotes.$inferSelect;
export type NewBunkerSentimentVoteRow = typeof bunkerSentimentVotes.$inferInsert;
export type UiEventRow = typeof uiEvents.$inferSelect;
export type NewUiEventRow = typeof uiEvents.$inferInsert;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;
export type LivingTimelineEntryRow = typeof livingTimelineEntries.$inferSelect;
export type NewLivingTimelineEntryRow = typeof livingTimelineEntries.$inferInsert;
export type UkmtoIncidentRow = typeof ukmtoIncidents.$inferSelect;
export type NewUkmtoIncidentRow = typeof ukmtoIncidents.$inferInsert;
export type NavareaFeatureRow = typeof navareaFeatures.$inferSelect;
export type NewNavareaFeatureRow = typeof navareaFeatures.$inferInsert;
export type MilitaryExerciseRow = typeof militaryExercises.$inferSelect;
export type NewMilitaryExerciseRow = typeof militaryExercises.$inferInsert;
