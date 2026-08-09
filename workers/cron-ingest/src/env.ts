/** Cloudflare Worker bindings for conflict-view-ingest */

export type IngestEnv = {
  DB: D1Database;
  /** NASA FIRMS map key — set via `wrangler secret put NASA_FIRMS_API_KEY` */
  NASA_FIRMS_API_KEY?: string;
  FIRMS_MAP_KEY?: string;
  /**
   * 수동 HTTP 트리거용 bearer 시크릿.
   * **프로덕션 필수** — 미설정 시 /run·/push/send·/track·/backfill-baseline 이 전부 401.
   * `npx wrangler secret put INGEST_CRON_SECRET -c wrangler.ingest.toml`
   */
  INGEST_CRON_SECRET?: string;
  /**
   * 로컬 개발 전용 탈출구. `.dev.vars` 에 "true" 로 두면 시크릿 없이도 수동 트리거 허용.
   * **프로덕션에는 절대 설정하지 말 것.**
   */
  ALLOW_UNAUTHENTICATED_INGEST?: string;
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

  /**
   * FRED API key — 컨버전스 발화 이후 시장 반응 측정용.
   * 미 세인트루이스 연은. 데이터는 퍼블릭 도메인이라 상업적 재배포 제약 없음.
   * `wrangler secret put FRED_API_KEY`
   */
  FRED_API_KEY?: string;
  AIS_MAX_VESSELS?: string;
  ADSB_MIL_MAX?: string;
  ADSB_CIV_PER_HUB?: string;
  /**
   * 유료 티어 운영 여부.
   *
   * "true" 면 **비상업 전용 소스를 폴백에서 제외**한다.
   *   · adsb.fi        "for personal, non-commercial use only"
   *   · airplanes.live 독점 라이선스 — 상업 조건 미확인
   * 남는 것: adsb.lol(ODbL, 상업 가능) · ADSBexchange(상업 티어, 키 필요)
   *
   * ⚠️ 요금제를 켜면 이 값도 반드시 켤 것. 안 켜면 조용히 약관 위반이 계속된다.
   */
  COMMERCIAL_TIER_ENABLED?: string;
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
  /** "false"/"0" 이면 레퍼런스 감시(CSIS Beyond Parallel · NTI) 비활성 */
  REFERENCE_MONITOR_ENABLED?: string;
  /** 최소 재폴링 간격(분) — 분석물이라 여유 있게, 기본 360(6시간) */
  REFERENCE_MONITOR_POLL_MIN_INTERVAL_MINUTES?: string;
  /** 채널당 가져올 최대 항목 수 (기본 20) */
  REFERENCE_MONITOR_MAX_PER_CHANNEL?: string;
  /** 이 점수 미만은 저장 안 함 — 모금·행사 글 컷 (기본 2) */
  REFERENCE_MONITOR_MIN_RELEVANCE?: string;
  /**
   * CSIS Beyond Parallel RSS.
   * 기본 https://beyondparallel.csis.org/feed/ — "off" 이면 스킵
   */
  CSIS_BEYOND_PARALLEL_FEED_URL?: string;
  /**
   * NTI WordPress REST 베이스 (/feed/ 는 빈 채널이라 REST 사용).
   * 기본 https://www.nti.org/wp-json/wp/v2 — "off" 이면 스킵
   */
  NTI_REST_BASE_URL?: string;
  /**
   * NTI REST 가 Cloudflare 챌린지로 막혔을 때 폴백할 sitemap 인덱스.
   * 기본 https://www.nti.org/sitemap_index.xml — "off" 이면 폴백 없음
   */
  NTI_SITEMAP_INDEX_URL?: string;
  /**
   * Next 주간 함선 이동기 워밍 URL
   * 예: https://your-app.example/api/ship-movements/warm
   */
  SHIP_MOVEMENTS_WARM_URL?: string;
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
