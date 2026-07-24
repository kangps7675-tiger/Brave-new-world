/** Cloudflare Worker bindings for conflict-view-ingest */

export type IngestEnv = {
  DB: D1Database;
  /** NASA FIRMS map key — set via `wrangler secret put NASA_FIRMS_API_KEY` */
  NASA_FIRMS_API_KEY?: string;
  FIRMS_MAP_KEY?: string;
  /** Optional bearer for manual HTTP trigger */
  INGEST_CRON_SECRET?: string;
  /**
   * Next 앱의 뉴스 워밍 URL.
   * 예: https://your-app.example/api/news-stream/warm
   * 설정 시 Cron이 FIRMS/GDELT 직후 POST로 D1 뉴스 스냅샷을 채운다.
   */
  NEWS_WARM_URL?: string;
  /**
   * Next 동영상 뉴스 워밍 URL (YouTube Atom 메타 → D1)
   * 예: https://your-app.example/api/video-news/warm
   */
  VIDEO_NEWS_WARM_URL?: string;
  /**
   * Next AIS 워밍 URL (MarineTraffic → D1)
   * 예: https://your-app.example/api/ais/warm
   */
  AIS_WARM_URL?: string;
  /**
   * Next ADS-B 워밍 URL (mil + civ hubs → D1)
   * 예: https://your-app.example/api/adsb/warm
   */
  ADSB_WARM_URL?: string;
  /**
   * Next 해저터널 시드 워밍
   * 예: https://your-app.example/api/submarine-tunnels/warm
   */
  TUNNELS_WARM_URL?: string;
  /**
   * 분쟁·중동(이란) 전선 hatch 재빌드
   * 예: https://your-app.example/api/render/dispute-paths?lod=overview
   * (POST — overview/detail 각각 또는 Cron이 두 번 호출)
   */
  DISPUTE_HATCH_WARM_URL?: string;
  /**
   * 우크라 전선 hatch 재빌드 (VIINA 캐시가 앱 서버에 있을 때만)
   * 예: https://your-app.example/api/render/ukraine-control-paths?lod=overview
   */
  UKRAINE_HATCH_WARM_URL?: string;
  FIRMS_DAY_RANGE?: string;
  FIRMS_MAX_PER_THEATER?: string;
  GDELT_MAX_POINTS?: string;
  RETENTION_HOURS?: string;
  /** 텔레그램 스크레이프 최대 속보 수 (기본 200) */
  TELEGRAM_MAX_ALERTS?: string;
  /** "false"/"0" 이면 텔레그램 스크레이프 비활성 */
  TELEGRAM_INGEST_ENABLED?: string;
  /** MarineTraffic exportvessels API key */
  MARINETRAFFIC_API_KEY?: string;
  MarineTraffic_API_KEY?: string;
  /** ADS-B Exchange gateway key (없으면 adsb.fi 오픈데이터) */
  ADSBEXCHANGE_API_KEY?: string;
  ADSB_API_KEY?: string;
  ADSBX_API_KEY?: string;
  /** AISstream WebSocket (MarineTraffic 실패 시 폴백) */
  AISSTREAM_API_KEY?: string;
  AIS_MAX_VESSELS?: string;
  ADSB_MIL_MAX?: string;
  ADSB_CIV_PER_HUB?: string;
  /** Web Push VAPID — `wrangler secret put VAPID_PRIVATE_KEY` */
  VAPID_PRIVATE_KEY?: string;
  /** Public key (base64url) — wrangler [vars] 또는 secret */
  VAPID_PUBLIC_KEY?: string;
  /** mailto: or https: contact for VAPID JWT */
  VAPID_SUBJECT?: string;
  /**
   * OREF(이스라엘 공습경보) 프록시 — CF Worker가 403이면 이스라엘 IP 경유 URL.
   * 예: https://your-proxy.example/oref/history.json
   */
  OREF_HISTORY_URL?: string;
  OREF_ACTIVE_URL?: string;
  /** "false"/"0" 이면 공습경보 인제스트 비활성 */
  AIR_RAID_INGEST_ENABLED?: string;
  /** NEPTUN 베이스 (기본 https://neptun.in.ua) */
  NEPTUN_API_BASE?: string;
  /**
   * UKMTO 상선 경보 — 비공식(리버스 엔지니어링) 엔드포인트.
   * 기본 https://sccd.royalnavy.mod.uk/api/ukmto/all
   */
  UKMTO_API_URL?: string;
  /** "false"/"0" 이면 UKMTO 인제스트 비활성 */
  UKMTO_INGEST_ENABLED?: string;
  /** 최소 재폴링 간격(분) — 예의상 여유 있게, 기본 30 */
  UKMTO_POLL_MIN_INTERVAL_MINUTES?: string;
  /**
   * JHOD NAVAREA XI 공개 TXT.
   * 기본 https://www1.kaiho.mlit.go.jp/TUHO/freetext/NavareaXI.txt
   * "off" 이면 JHOD 피드 스킵
   */
  NAVAREA_JHOD_XI_URL?: string;
  /**
   * NGA NAVAREA TXT URL 목록 (콤마 구분).
   * 예: https://.../navarea_iv.txt,https://.../navarea_xii.txt
   */
  NAVAREA_NGA_TXT_URLS?: string;
  /** "false"/"0" 이면 NAVAREA 인제스트 비활성 */
  NAVAREA_INGEST_ENABLED?: string;
  /** 최소 재폴링 간격(분) — 정부 TXT 예의상 15~30, 기본 30 */
  NAVAREA_POLL_MIN_INTERVAL_MINUTES?: string;
};

export type FirmsFireRow = {
  id: string;
  lat: number;
  lng: number;
  frp: number | null;
  brightness: number | null;
  confidence: string | null;
  acq_date: string | null;
  acq_time: string | null;
  satellite: string | null;
  daynight: string | null;
  source: string;
  theater: string;
};

export type GdeltPointRow = {
  id: string;
  lat: number;
  lng: number;
  name: string | null;
  url: string | null;
  mention_count: number | null;
  share_image: string | null;
  query_tag: string;
};

export type TelegramAlertRow = {
  id: string;
  channel_username: string;
  channel_title: string | null;
  region: string;
  text: string;
  message_url: string | null;
  received_at: string;
};

export type AisVesselRow = {
  id: string;
  mmsi: string;
  ship_name: string | null;
  lat: number;
  lng: number;
  sog: number | null;
  cog: number | null;
  true_heading: number | null;
  ship_type: number | null;
  ship_type_label: string | null;
  category: string;
  provider: string;
  timestamp: string | null;
};

export type AdsbAircraftRow = {
  id: string;
  hex: string;
  mode: string;
  callsign: string | null;
  registration: string | null;
  lat: number;
  lng: number;
  altitude: number | null;
  altitude_geom: number | null;
  ground_speed: number | null;
  track: number | null;
  type: string | null;
  category: string | null;
  db_flags: number | null;
  squawk: string | null;
  emergency: string | null;
  payload_json: string;
  hub: string | null;
};
