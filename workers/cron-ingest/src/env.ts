/// <reference types="@cloudflare/workers-types" />
/** Cloudflare Worker bindings for conflict-view-ingest */

export type IngestEnv = {
  DB: D1Database;
  /** NASA FIRMS map key ??set via `wrangler secret put NASA_FIRMS_API_KEY` */
  NASA_FIRMS_API_KEY?: string;
  FIRMS_MAP_KEY?: string;
  /**
   * ?ë HTTP ?¸ë¦¬ê±°ì© bearer ?í¬ë¦?
   * **?ë¡?ì ?ì** ??ë¯¸ì¤????/runÂ·/push/sendÂ·/trackÂ·/backfill-baseline ???ë? 401.
   * `npx wrangler secret put INGEST_CRON_SECRET -c wrangler.ingest.toml`
   */
  INGEST_CRON_SECRET?: string;
  /**
   * ë¡ì»¬ ê°ë° ?ì© ?ì¶êµ? `.dev.vars` ??"true" ë¡??ë©´ ?í¬ë¦??ì´???ë ?¸ë¦¬ê±??ì©.
   * **?ë¡?ì?ë ?ë? ?¤ì ?ì? ë§?ê²?**
   */
  ALLOW_UNAUTHENTICATED_INGEST?: string;
  /**
   * Next ?±ì ?´ì¤ ?ë° URL.
   * ?? https://your-app.example/api/news-stream/warm
   * ?¤ì  ??Cron??FIRMS/GDELT ì§í POSTë¡?D1 ?´ì¤ ?¤ë?·ì ì±ì´??
   */
  NEWS_WARM_URL?: string;
  /**
   * Next ?ì???´ì¤ ?ë° URL (YouTube Atom ë©í? ??D1)
   * ?? https://your-app.example/api/video-news/warm
   */
  VIDEO_NEWS_WARM_URL?: string;
  /**
   * Next AIS ?ë° URL (MarineTraffic ??D1)
   * ?? https://your-app.example/api/ais/warm
   */
  AIS_WARM_URL?: string;
  /**
   * Next ADS-B ?ë° URL (mil + civ hubs ??D1)
   * ?? https://your-app.example/api/adsb/warm
   */
  ADSB_WARM_URL?: string;
  /**
   * Next ?´ì??°ë ?ë ?ë°
   * ?? https://your-app.example/api/submarine-tunnels/warm
   */
  TUNNELS_WARM_URL?: string;
  /**
   * ë¶ìÂ·ì¤ë(?´ë?) ?ì  hatch ?¬ë¹??   * ?? https://your-app.example/api/render/dispute-paths?lod=overview
   * (POST ??overview/detail ê°ê° ?ë Cron????ë²??¸ì¶)
   */
  DISPUTE_HATCH_WARM_URL?: string;
  /**
   * ?°í¬???ì  hatch ?¬ë¹??(VIINA ìºìê° ???ë²???ì ?ë§)
   * ?? https://your-app.example/api/render/ukraine-control-paths?lod=overview
   */
  UKRAINE_HATCH_WARM_URL?: string;
  FIRMS_DAY_RANGE?: string;
  FIRMS_MAX_PER_THEATER?: string;
  GDELT_MAX_POINTS?: string;
  RETENTION_HOURS?: string;
  /** ?ë ê·¸ë¨ ?¤í¬?ì´??ìµë? ?ë³´ ??(ê¸°ë³¸ 200) */
  TELEGRAM_MAX_ALERTS?: string;
  /** "false"/"0" ?´ë©´ ?ë ê·¸ë¨ ?¤í¬?ì´??ë¹í??*/
  TELEGRAM_INGEST_ENABLED?: string;
  /** MarineTraffic exportvessels API key */
  MARINETRAFFIC_API_KEY?: string;
  MarineTraffic_API_KEY?: string;
  /** ADS-B Exchange gateway key (?ì¼ë©?adsb.fi ?¤í?°ì´?? */
  ADSBEXCHANGE_API_KEY?: string;
  ADSB_API_KEY?: string;
  ADSBX_API_KEY?: string;
  /** AISstream WebSocket (MarineTraffic ?¤í¨ ???´ë°±) */
  AISSTREAM_API_KEY?: string;
  /** Datalastic — 홍해 등 AISstream 공백 해역 보강 (없으면 건너뜀). 크레딧 월 예산·폴링 주기는 아래 */
  DATALASTIC_API_KEY?: string;
  DATALASTIC_MONTHLY_CREDITS?: string;
  DATALASTIC_POLL_HOURS?: string;

  /**
   * FRED API key â ì»¨ë²ì ì¤ ë°í ì´í ìì¥ ë°ì ì¸¡ì ì©.
   * ë¯¸ ì¸ì¸í¸ë£¨ì´ì¤ ì°ì. ë°ì´í°ë í¼ë¸ë¦­ ëë©ì¸ì´ë¼ ììì  ì¬ë°°í¬ ì ì½ ìì.
   * `wrangler secret put FRED_API_KEY`
   */
  FRED_API_KEY?: string;
  AIS_MAX_VESSELS?: string;
  ADSB_MIL_MAX?: string;
  ADSB_CIV_PER_HUB?: string;
  ADSB_CIV_MAX?: string;
  /**
   * ? ë£ ?°ì´ ?´ì ?¬ë?.
   *
   * "true" ë©?**ë¹ì???ì© ?ì¤ë¥??´ë°±?ì ?ì¸**?ë¤.
   *   Â· adsb.fi        "for personal, non-commercial use only"
   *   Â· airplanes.live ?ì  ?¼ì´? ì¤ ???ì ì¡°ê±´ ë¯¸í??   * ?¨ë ê²? adsb.lol(ODbL, ?ì ê°?? Â· ADSBexchange(?ì ?°ì´, ???ì)
   *
   * ? ï¸ ?ê¸?ë? ì¼ë©´ ??ê°ë ë°ë??ì¼?ê²? ??ì¼ë©´ ì¡°ì©???½ê? ?ë°??ê³ì?ë¤.
   */
  COMMERCIAL_TIER_ENABLED?: string;
  /** Web Push VAPID ??`wrangler secret put VAPID_PRIVATE_KEY` */
  VAPID_PRIVATE_KEY?: string;
  /** Public key (base64url) ??wrangler [vars] ?ë secret */
  VAPID_PUBLIC_KEY?: string;
  /** mailto: or https: contact for VAPID JWT */
  VAPID_SUBJECT?: string;
  /**
   * OREF(?´ì¤?¼ì ê³µìµê²½ë³´) ?ë¡????CF Workerê° 403?´ë©´ ?´ì¤?¼ì IP ê²½ì  URL.
   * ?? https://your-proxy.example/oref/history.json
   */
  OREF_HISTORY_URL?: string;
  OREF_ACTIVE_URL?: string;
  /** "false"/"0" ?´ë©´ ê³µìµê²½ë³´ ?¸ì ?¤í¸ ë¹í??*/
  AIR_RAID_INGEST_ENABLED?: string;
  /** NEPTUN ë² ì´??(ê¸°ë³¸ https://neptun.in.ua) */
  NEPTUN_API_BASE?: string;
  /**
   * UKMTO ?ì  ê²½ë³´ ??ë¹ê³µ??ë¦¬ë²???ì??ì´ë§? ?ë?¬ì¸??
   * ê¸°ë³¸ https://sccd.royalnavy.mod.uk/api/ukmto/all
   */
  UKMTO_API_URL?: string;
  /** "false"/"0" ?´ë©´ UKMTO ?¸ì ?¤í¸ ë¹í??*/
  UKMTO_INGEST_ENABLED?: string;
  /** ìµì ?¬í´ë§?ê°ê²©(ë¶? ???ì???¬ì  ?ê², ê¸°ë³¸ 30 */
  UKMTO_POLL_MIN_INTERVAL_MINUTES?: string;
  /** "false"/"0"/"off"면 새 피습 푸시 알림 끔. 기본 켜짐 */
  UKMTO_PUSH_ENABLED?: string;
  /**
   * JHOD NAVAREA XI ê³µê° TXT.
   * ê¸°ë³¸ https://www1.kaiho.mlit.go.jp/TUHO/freetext/NavareaXI.txt
   * "off" ?´ë©´ JHOD ?¼ë ?¤íµ
   */
  NAVAREA_JHOD_XI_URL?: string;
  /**
   * NGA NAVAREA TXT URL ëª©ë¡ (ì½¤ë§ êµ¬ë¶).
   * ?? https://.../navarea_iv.txt,https://.../navarea_xii.txt
   */
  NAVAREA_NGA_TXT_URLS?: string;
  /** NGA MSI 활성 경보 JSON. 비우면 기본 URL, "off"면 끔. NAVAREA_NGA_TXT_URLS가 있으면 쓰지 않는다. */
  NAVAREA_NGA_JSON_URL?: string;
  /** "false"/"0" ?´ë©´ NAVAREA ?¸ì ?¤í¸ ë¹í??*/
  NAVAREA_INGEST_ENABLED?: string;
  /** ìµì ?¬í´ë§?ê°ê²©(ë¶? ???ë? TXT ?ì??15~30, ê¸°ë³¸ 30 */
  NAVAREA_POLL_MIN_INTERVAL_MINUTES?: string;
  /** "false"/"0" ?´ë©´ ?í¼?°ì¤ ê°ì(CSIS Beyond Parallel Â· NTI) ë¹í??*/
  REFERENCE_MONITOR_ENABLED?: string;
  /** ìµì ?¬í´ë§?ê°ê²©(ë¶? ??ë¶ìë¬¼ì´???¬ì  ?ê², ê¸°ë³¸ 360(6?ê°) */
  REFERENCE_MONITOR_POLL_MIN_INTERVAL_MINUTES?: string;
  /** ì±ë??ê°?¸ì¬ ìµë? ??ª© ??(ê¸°ë³¸ 20) */
  REFERENCE_MONITOR_MAX_PER_CHANNEL?: string;
  /** ???ì ë¯¸ë§? ?????????ëª¨ê¸Â·?ì¬ ê¸ ì»?(ê¸°ë³¸ 2) */
  REFERENCE_MONITOR_MIN_RELEVANCE?: string;
  /**
   * CSIS Beyond Parallel RSS.
   * ê¸°ë³¸ https://beyondparallel.csis.org/feed/ ??"off" ?´ë©´ ?¤íµ
   */
  CSIS_BEYOND_PARALLEL_FEED_URL?: string;
  /**
   * NTI WordPress REST ë² ì´??(/feed/ ??ë¹?ì±ë?´ë¼ REST ?¬ì©).
   * ê¸°ë³¸ https://www.nti.org/wp-json/wp/v2 ??"off" ?´ë©´ ?¤íµ
   */
  NTI_REST_BASE_URL?: string;
  /**
   * NTI REST ê° Cloudflare ì±ë¦°ì§ë¡?ë§í?????´ë°±??sitemap ?¸ë±??
   * ê¸°ë³¸ https://www.nti.org/sitemap_index.xml ??"off" ?´ë©´ ?´ë°± ?ì
   */
  NTI_SITEMAP_INDEX_URL?: string;
  /**
   * Next ì£¼ê° ?¨ì  ?´ëê¸??ë° URL
   * ?? https://your-app.example/api/ship-movements/warm
   */
  SHIP_MOVEMENTS_WARM_URL?: string;
  /**
   * Next US carrier warm URL (USNI Fleet Tracker → D1 snapshot)
   * e.g. https://your-app.example/api/us-carriers/warm
   */
  US_CARRIERS_WARM_URL?: string;
  /**
   * Next DeepState occupied-coordinate sync (폴백).
   * LiveUA 우크라 통제면이 있으면 sync가 skipped — URL을 비우면 warm 자체를 끌 수 있음.
   */
  DEEPSTATE_SYNC_URL?: string;
  /**
   * Next LIVEUAMAP mpts sync (budgeted resid rotation)
   * e.g. https://your-app.example/api/liveuamap/sync
   */
  LIVEUAMAP_SYNC_URL?: string;
  /**
   * Next NewFeeds Iran sync (attacks.json + feeds/iran.json → D1)
   * e.g. https://your-app.example/api/newfeeds/sync
   */
  NEWFEEDS_SYNC_URL?: string;
  /**
   * Resend API 키. `npx wrangler secret put RESEND_API_KEY -c wrangler.ingest.toml`
   * 비어 있으면 구독 접수·발송을 하지 않는다.
   */
  RESEND_API_KEY?: string;
  /** 예: Strait Desk <digest@example.com> — secret 또는 vars */
  EMAIL_FROM?: string;
  /**
   * 확인·해지 링크의 공개 주소 (끝 슬래시 없이).
   * 예: https://conflict-view.vercel.app
   * 비우면 구독 접수 시점의 워커 주소를 쓰고, 하루 발송은 건너뛴다.
   */
  EMAIL_PUBLIC_BASE?: string;
  /** "false"/"0"/"off"면 하루 다이제스트를 보내지 않는다. 구독 접수·확인은 그대로다. */
  EMAIL_DIGEST_ENABLED?: string;
  /** "false"/"0"/"off"면 NOAA GFS-Wave 해상 기상 수집 끔. 기본 켜짐 */
  MARINE_WEATHER_INGEST_ENABLED?: string;
  /** 한 틱(10분)에 처리할 GFS-Wave 파일 수 (기본 2, 최대 13). 사이클 하나 = 13개 파일 */
  MARINE_WEATHER_MAX_FILES_PER_RUN?: string;
  /** 분석값(f000) 보관 일수 (기본 365) */
  MARINE_WEATHER_HISTORY_DAYS?: string;
  /** NOAA NODD 버킷 주소 (기본 https://noaa-gfs-bdp-pds.s3.amazonaws.com) */
  GFS_S3_BASE?: string;
  /** GFS-Wave 격자 이름 (기본 global.0p25) */
  GFS_WAVE_GRID?: string;
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
  /** video | photo | none */
  media_kind?: string | null;
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
  // ShipStaticData 기반 — DWT 가중 물동량·목적지 변경률 지표용 (draught는 흘수 실측이 아니라
  // 만재 시 설계 흘수 상한이라 정확한 DWT는 아니지만, 선형 대비 크기 프록시로는 쓸 수 있다)
  draught: number | null;
  destination: string | null;
  length_m: number | null;
  beam_m: number | null;
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
