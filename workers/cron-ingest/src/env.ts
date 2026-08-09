/// <reference types="@cloudflare/workers-types" />
/** Cloudflare Worker bindings for conflict-view-ingest */

export type IngestEnv = {
  DB: D1Database;
  /** NASA FIRMS map key ??set via `wrangler secret put NASA_FIRMS_API_KEY` */
  NASA_FIRMS_API_KEY?: string;
  FIRMS_MAP_KEY?: string;
  /**
   * ?˜ë™ HTTP ?¸ë¦¬ê±°ìš© bearer ?œí¬ë¦?
   * **?„ë¡œ?•ì…˜ ?„ìˆ˜** ??ë¯¸ì„¤????/runÂ·/push/sendÂ·/trackÂ·/backfill-baseline ???„ë? 401.
   * `npx wrangler secret put INGEST_CRON_SECRET -c wrangler.ingest.toml`
   */
  INGEST_CRON_SECRET?: string;
  /**
   * ë¡œì»¬ ê°œë°œ ?„ìš© ?ˆì¶œêµ? `.dev.vars` ??"true" ë¡??ë©´ ?œí¬ë¦??†ì´???˜ë™ ?¸ë¦¬ê±??ˆìš©.
   * **?„ë¡œ?•ì…˜?ëŠ” ?ˆë? ?¤ì •?˜ì? ë§?ê²?**
   */
  ALLOW_UNAUTHENTICATED_INGEST?: string;
  /**
   * Next ?±ì˜ ?´ìŠ¤ ?Œë° URL.
   * ?? https://your-app.example/api/news-stream/warm
   * ?¤ì • ??Cron??FIRMS/GDELT ì§í›„ POSTë¡?D1 ?´ìŠ¤ ?¤ëƒ…?·ì„ ì±„ìš´??
   */
  NEWS_WARM_URL?: string;
  /**
   * Next ?™ì˜???´ìŠ¤ ?Œë° URL (YouTube Atom ë©”í? ??D1)
   * ?? https://your-app.example/api/video-news/warm
   */
  VIDEO_NEWS_WARM_URL?: string;
  /**
   * Next AIS ?Œë° URL (MarineTraffic ??D1)
   * ?? https://your-app.example/api/ais/warm
   */
  AIS_WARM_URL?: string;
  /**
   * Next ADS-B ?Œë° URL (mil + civ hubs ??D1)
   * ?? https://your-app.example/api/adsb/warm
   */
  ADSB_WARM_URL?: string;
  /**
   * Next ?´ì??°ë„ ?œë“œ ?Œë°
   * ?? https://your-app.example/api/submarine-tunnels/warm
   */
  TUNNELS_WARM_URL?: string;
  /**
   * ë¶„ìŸÂ·ì¤‘ë™(?´ë?) ?„ì„  hatch ?¬ë¹Œ??   * ?? https://your-app.example/api/render/dispute-paths?lod=overview
   * (POST ??overview/detail ê°ê° ?ëŠ” Cron????ë²??¸ì¶œ)
   */
  DISPUTE_HATCH_WARM_URL?: string;
  /**
   * ?°í¬???„ì„  hatch ?¬ë¹Œ??(VIINA ìºì‹œê°€ ???œë²„???ˆì„ ?Œë§Œ)
   * ?? https://your-app.example/api/render/ukraine-control-paths?lod=overview
   */
  UKRAINE_HATCH_WARM_URL?: string;
  FIRMS_DAY_RANGE?: string;
  FIRMS_MAX_PER_THEATER?: string;
  GDELT_MAX_POINTS?: string;
  RETENTION_HOURS?: string;
  /** ?”ë ˆê·¸ë¨ ?¤í¬?ˆì´??ìµœë? ?ë³´ ??(ê¸°ë³¸ 200) */
  TELEGRAM_MAX_ALERTS?: string;
  /** "false"/"0" ?´ë©´ ?”ë ˆê·¸ë¨ ?¤í¬?ˆì´??ë¹„í™œ??*/
  TELEGRAM_INGEST_ENABLED?: string;
  /** MarineTraffic exportvessels API key */
  MARINETRAFFIC_API_KEY?: string;
  MarineTraffic_API_KEY?: string;
  /** ADS-B Exchange gateway key (?†ìœ¼ë©?adsb.fi ?¤í”ˆ?°ì´?? */
  ADSBEXCHANGE_API_KEY?: string;
  ADSB_API_KEY?: string;
  ADSBX_API_KEY?: string;
  /** AISstream WebSocket (MarineTraffic ?¤íŒ¨ ???´ë°±) */
  AISSTREAM_API_KEY?: string;
  AIS_MAX_VESSELS?: string;
  ADSB_MIL_MAX?: string;
  ADSB_CIV_PER_HUB?: string;
  /**
   * ? ë£Œ ?°ì–´ ?´ì˜ ?¬ë?.
   *
   * "true" ë©?**ë¹„ìƒ???„ìš© ?ŒìŠ¤ë¥??´ë°±?ì„œ ?œì™¸**?œë‹¤.
   *   Â· adsb.fi        "for personal, non-commercial use only"
   *   Â· airplanes.live ?…ì  ?¼ì´? ìŠ¤ ???ì—… ì¡°ê±´ ë¯¸í™•??   * ?¨ëŠ” ê²? adsb.lol(ODbL, ?ì—… ê°€?? Â· ADSBexchange(?ì—… ?°ì–´, ???„ìš”)
   *
   * ? ï¸ ?”ê¸ˆ?œë? ì¼œë©´ ??ê°’ë„ ë°˜ë“œ??ì¼?ê²? ??ì¼œë©´ ì¡°ìš©???½ê? ?„ë°˜??ê³„ì†?œë‹¤.
   */
  COMMERCIAL_TIER_ENABLED?: string;
  /** Web Push VAPID ??`wrangler secret put VAPID_PRIVATE_KEY` */
  VAPID_PRIVATE_KEY?: string;
  /** Public key (base64url) ??wrangler [vars] ?ëŠ” secret */
  VAPID_PUBLIC_KEY?: string;
  /** mailto: or https: contact for VAPID JWT */
  VAPID_SUBJECT?: string;
  /**
   * OREF(?´ìŠ¤?¼ì—˜ ê³µìŠµê²½ë³´) ?„ë¡????CF Workerê°€ 403?´ë©´ ?´ìŠ¤?¼ì—˜ IP ê²½ìœ  URL.
   * ?? https://your-proxy.example/oref/history.json
   */
  OREF_HISTORY_URL?: string;
  OREF_ACTIVE_URL?: string;
  /** "false"/"0" ?´ë©´ ê³µìŠµê²½ë³´ ?¸ì œ?¤íŠ¸ ë¹„í™œ??*/
  AIR_RAID_INGEST_ENABLED?: string;
  /** NEPTUN ë² ì´??(ê¸°ë³¸ https://neptun.in.ua) */
  NEPTUN_API_BASE?: string;
  /**
   * UKMTO ?ì„  ê²½ë³´ ??ë¹„ê³µ??ë¦¬ë²„???”ì??ˆì–´ë§? ?”ë“œ?¬ì¸??
   * ê¸°ë³¸ https://sccd.royalnavy.mod.uk/api/ukmto/all
   */
  UKMTO_API_URL?: string;
  /** "false"/"0" ?´ë©´ UKMTO ?¸ì œ?¤íŠ¸ ë¹„í™œ??*/
  UKMTO_INGEST_ENABLED?: string;
  /** ìµœì†Œ ?¬í´ë§?ê°„ê²©(ë¶? ???ˆì˜???¬ìœ  ?ˆê²Œ, ê¸°ë³¸ 30 */
  UKMTO_POLL_MIN_INTERVAL_MINUTES?: string;
  /**
   * JHOD NAVAREA XI ê³µê°œ TXT.
   * ê¸°ë³¸ https://www1.kaiho.mlit.go.jp/TUHO/freetext/NavareaXI.txt
   * "off" ?´ë©´ JHOD ?¼ë“œ ?¤í‚µ
   */
  NAVAREA_JHOD_XI_URL?: string;
  /**
   * NGA NAVAREA TXT URL ëª©ë¡ (ì½¤ë§ˆ êµ¬ë¶„).
   * ?? https://.../navarea_iv.txt,https://.../navarea_xii.txt
   */
  NAVAREA_NGA_TXT_URLS?: string;
  /** "false"/"0" ?´ë©´ NAVAREA ?¸ì œ?¤íŠ¸ ë¹„í™œ??*/
  NAVAREA_INGEST_ENABLED?: string;
  /** ìµœì†Œ ?¬í´ë§?ê°„ê²©(ë¶? ???•ë? TXT ?ˆì˜??15~30, ê¸°ë³¸ 30 */
  NAVAREA_POLL_MIN_INTERVAL_MINUTES?: string;
  /** "false"/"0" ?´ë©´ ?ˆí¼?°ìŠ¤ ê°ì‹œ(CSIS Beyond Parallel Â· NTI) ë¹„í™œ??*/
  REFERENCE_MONITOR_ENABLED?: string;
  /** ìµœì†Œ ?¬í´ë§?ê°„ê²©(ë¶? ??ë¶„ì„ë¬¼ì´???¬ìœ  ?ˆê²Œ, ê¸°ë³¸ 360(6?œê°„) */
  REFERENCE_MONITOR_POLL_MIN_INTERVAL_MINUTES?: string;
  /** ì±„ë„??ê°€?¸ì˜¬ ìµœë? ??ª© ??(ê¸°ë³¸ 20) */
  REFERENCE_MONITOR_MAX_PER_CHANNEL?: string;
  /** ???ìˆ˜ ë¯¸ë§Œ?€ ?€????????ëª¨ê¸ˆÂ·?‰ì‚¬ ê¸€ ì»?(ê¸°ë³¸ 2) */
  REFERENCE_MONITOR_MIN_RELEVANCE?: string;
  /**
   * CSIS Beyond Parallel RSS.
   * ê¸°ë³¸ https://beyondparallel.csis.org/feed/ ??"off" ?´ë©´ ?¤í‚µ
   */
  CSIS_BEYOND_PARALLEL_FEED_URL?: string;
  /**
   * NTI WordPress REST ë² ì´??(/feed/ ??ë¹?ì±„ë„?´ë¼ REST ?¬ìš©).
   * ê¸°ë³¸ https://www.nti.org/wp-json/wp/v2 ??"off" ?´ë©´ ?¤í‚µ
   */
  NTI_REST_BASE_URL?: string;
  /**
   * NTI REST ê°€ Cloudflare ì±Œë¦°ì§€ë¡?ë§‰í˜”?????´ë°±??sitemap ?¸ë±??
   * ê¸°ë³¸ https://www.nti.org/sitemap_index.xml ??"off" ?´ë©´ ?´ë°± ?†ìŒ
   */
  NTI_SITEMAP_INDEX_URL?: string;
  /**
   * Next ì£¼ê°„ ?¨ì„  ?´ë™ê¸??Œë° URL
   * ?? https://your-app.example/api/ship-movements/warm
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
