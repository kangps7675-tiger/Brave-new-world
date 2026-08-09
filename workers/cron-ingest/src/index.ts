import type { IngestEnv } from "./env";
import {
  getFirmsMapKey,
  insertUiEvent,
  pruneOldRows,
  readAdsbAircraft,
  readAisVessels,
  readFirmsFires,
  readGdeltPoints,
  readIntVar,
  readTelegramAlerts,
  recordIngestRun,
  upsertAdsbAircraft,
  upsertAisVessels,
  upsertFirmsFires,
  upsertGdeltPoints,
  upsertTelegramAlerts,
} from "./db";
import { fetchAisVessels } from "./ais";
import { fetchAdsbAircraft } from "./adsb";
import { fetchFirmsForTheaters } from "./firms";
import { fetchGdeltTensionPoints } from "./gdeltExport";
import { fetchTelegramAlerts } from "./telegram";
import { readBriefingStats, upsertBriefingPeriodStats } from "./briefingStats";
import { readDailyRanks, readWorldTension, upsertDailyRanks } from "./dailyRanks";
import { detectAndRecordConvergence } from "./convergence";
import { backfillOutcomes, ingestMarketDaily } from "./marketResponse";
import { recordHeartbeat } from "./pipelineHealth";
import { curateLivingTaiwan } from "./livingTaiwan";
import { fetchAndUpsertAirRaids } from "./airRaidIngest";
import { fetchAndUpsertUkmto } from "./ukmto";
import { fetchAndReplaceNavarea } from "./navarea";
import { fetchAndUpsertReferenceMonitor } from "./referenceMonitor";
import { fetchAndUpsertMilitaryExercises } from "./exerciseIngest";
import { maybeLightBaselineBackfill, runBaselineBackfill } from "./baselineBackfill";
import {
  broadcastPush,
  deletePushSubscription,
  upsertPushSubscription,
} from "./push";
import { dispatchSitrepDigestPush } from "./sitrepPush";

export type { IngestEnv };

type WarmResult = { ok: boolean; status: number; detail?: string };

type IngestResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  firmsCount: number;
  gdeltCount: number;
  telegramCount: number;
  aisCount: number;
  adsbCount: number;
  newsWarm?: WarmResult;
  videoNewsWarm?: WarmResult;
  aisWarm?: WarmResult;
  adsbWarm?: WarmResult;
  tunnelsWarm?: WarmResult;
  disputeHatchWarm?: WarmResult;
  ukraineHatchWarm?: WarmResult;
  shipMovementsWarm?: WarmResult;
  firmsErrors: string[];
  gdeltErrors: string[];
  telegramErrors: string[];
  aisErrors: string[];
  adsbErrors: string[];
  pruned?: {
    firmsDeleted: number;
    gdeltDeleted: number;
    newsSnapshotsDeleted?: number;
    newsItemsDeleted?: number;
    aisDeleted?: number;
    adsbDeleted?: number;
    telegramDeleted?: number;
    airRaidDeleted?: number;
    signalDailyDeleted?: number;
    cutoff: string;
  };
  airRaid?: {
    count: number;
    tzevaCount: number;
    neptunCount: number;
    geoRestricted: boolean;
    errors: string[];
  } | null;
  baselineBackfill?: {
    ran: boolean;
    rowsUpserted?: number;
    errors?: string[];
  } | null;
  briefingStats?: {
    dailyKey: string;
    weeklyKey: string;
    monthlyKey: string;
  } | null;
  dailyRanks?: {
    rankDate: string;
    theaterCount: number;
    chokepointCount: number;
    worldTension: number;
  } | null;
  sitrepPush?: {
    skipped: boolean;
    reason?: string;
    rankDate?: string;
    eventCount?: number;
    koSent?: number;
    enSent?: number;
  } | null;
  livingTaiwan?: {
    conflictId: string;
    entryDate: string;
    upserted: number;
    skipped: boolean;
    reason?: string;
  } | null;
  ukmto?: {
    count: number;
    fetched: number;
    errors: string[];
    skipped: boolean;
  } | null;
  navarea?: {
    count: number;
    fetched: number;
    errors: string[];
    skipped: boolean;
  } | null;
  referenceMonitor?: {
    count: number;
    fetched: number;
    csis: number;
    nti: number;
    ntiPath: string;
    errors: string[];
    skipped: boolean;
  } | null;
  militaryExercises?: {
    count: number;
    fromNavarea: number;
    fromNews: number;
    errors: string[];
    skipped: boolean;
  } | null;
  error: string | null;
};

async function warmEndpoint(
  url: string | undefined,
  env: IngestEnv,
  label: string,
): Promise<WarmResult | undefined> {
  const warmUrl = url?.trim();
  if (!warmUrl) return undefined;
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    const secret = env.INGEST_CRON_SECRET?.trim();
    if (secret) headers.Authorization = `Bearer ${secret}`;
    const res = await fetch(warmUrl, { method: "POST", headers });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      detail: text.slice(0, 400),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail: error instanceof Error ? error.message : `${label} warm failed`,
    };
  }
}

async function runIngest(env: IngestEnv): Promise<IngestResult> {
  const startedAt = new Date().toISOString();
  const firmsErrors: string[] = [];
  const gdeltErrors: string[] = [];
  const telegramErrors: string[] = [];
  const aisErrors: string[] = [];
  const adsbErrors: string[] = [];
  let firmsCount = 0;
  let gdeltCount = 0;
  let telegramCount = 0;
  let aisCount = 0;
  let adsbCount = 0;
  let pruned: IngestResult["pruned"];
  let newsWarm: IngestResult["newsWarm"];
  let videoNewsWarm: IngestResult["videoNewsWarm"];
  let aisWarm: IngestResult["aisWarm"];
  let adsbWarm: IngestResult["adsbWarm"];
  let tunnelsWarm: IngestResult["tunnelsWarm"];
  let disputeHatchWarm: IngestResult["disputeHatchWarm"];
  let ukraineHatchWarm: IngestResult["ukraineHatchWarm"];
  let shipMovementsWarm: IngestResult["shipMovementsWarm"];

  try {
    const dayRange = Math.min(5, Math.max(1, readIntVar(env, "FIRMS_DAY_RANGE", 1)));
    const maxPerTheater = Math.min(
      800,
      Math.max(50, readIntVar(env, "FIRMS_MAX_PER_THEATER", 400)),
    );
    const gdeltMax = Math.min(400, Math.max(80, readIntVar(env, "GDELT_MAX_POINTS", 250)));
    const retentionHours = Math.min(
      168,
      Math.max(6, readIntVar(env, "RETENTION_HOURS", 48)),
    );

    // ADS-B 먼저(빠른 HTTP) → AIS(WebSocket ~4s) → FIRMS/GDELT
    const milMax = Math.min(800, Math.max(50, readIntVar(env, "ADSB_MIL_MAX", 400)));
    const civPerHub = Math.min(120, Math.max(20, readIntVar(env, "ADSB_CIV_PER_HUB", 80)));
    const adsb = await fetchAdsbAircraft(env, { milMax, civPerHub, maxHubs: 4 });
    adsbErrors.push(...adsb.errors.slice(0, 12));
    adsbCount = await upsertAdsbAircraft(env.DB, adsb.aircraft);

    const aisMax = Math.min(800, Math.max(50, readIntVar(env, "AIS_MAX_VESSELS", 400)));
    const ais = await fetchAisVessels(env, aisMax);
    aisErrors.push(...ais.errors.slice(0, 8));
    aisCount = await upsertAisVessels(env.DB, ais.vessels);

    const mapKey = getFirmsMapKey(env);
    if (mapKey) {
      const firms = await fetchFirmsForTheaters({
        mapKey,
        dayRange,
        maxPerTheater,
      });
      firmsErrors.push(...firms.errors);
      firmsCount = await upsertFirmsFires(env.DB, firms.fires);
    } else {
      firmsErrors.push("NASA_FIRMS_API_KEY (or FIRMS_MAP_KEY) missing — FIRMS skipped");
    }

    const gdelt = await fetchGdeltTensionPoints({ maxPoints: gdeltMax });
    gdeltErrors.push(...gdelt.errors);
    gdeltCount = await upsertGdeltPoints(env.DB, gdelt.points);

    const telegramEnabled =
      (env.TELEGRAM_INGEST_ENABLED ?? "true").toLowerCase() !== "false" &&
      env.TELEGRAM_INGEST_ENABLED !== "0";
    if (telegramEnabled) {
      const tgMax = Math.min(400, Math.max(50, readIntVar(env, "TELEGRAM_MAX_ALERTS", 200)));
      const telegram = await fetchTelegramAlerts({ maxAlerts: tgMax, maxChannels: 25 });
      telegramErrors.push(...telegram.errors.slice(0, 10));
      telegramCount = await upsertTelegramAlerts(env.DB, telegram.alerts);
    }

    let airRaid: IngestResult["airRaid"] = null;
    try {
      const air = await fetchAndUpsertAirRaids(env);
      airRaid = {
        count: air.count,
        tzevaCount: air.tzevaCount,
        neptunCount: air.neptunCount,
        geoRestricted: air.geoRestricted,
        errors: air.errors.slice(0, 6),
      };
    } catch (error) {
      airRaid = {
        count: 0,
        tzevaCount: 0,
        neptunCount: 0,
        geoRestricted: false,
        errors: [error instanceof Error ? error.message : "air raid ingest failed"],
      };
    }

    let ukmto: IngestResult["ukmto"] = null;
    try {
      const uk = await fetchAndUpsertUkmto(env);
      ukmto = {
        count: uk.count,
        fetched: uk.fetched,
        errors: uk.errors.slice(0, 6),
        skipped: uk.skipped,
      };
    } catch (error) {
      ukmto = {
        count: 0,
        fetched: 0,
        errors: [error instanceof Error ? error.message : "ukmto ingest failed"],
        skipped: false,
      };
    }

    let navarea: IngestResult["navarea"] = null;
    try {
      const na = await fetchAndReplaceNavarea(env);
      navarea = {
        count: na.count,
        fetched: na.fetched,
        errors: na.errors.slice(0, 6),
        skipped: na.skipped,
      };
    } catch (error) {
      navarea = {
        count: 0,
        fetched: 0,
        errors: [error instanceof Error ? error.message : "navarea ingest failed"],
        skipped: false,
      };
    }

    let referenceMonitor: IngestResult["referenceMonitor"] = null;
    try {
      const rm = await fetchAndUpsertReferenceMonitor(env);
      referenceMonitor = {
        count: rm.count,
        fetched: rm.fetched,
        csis: rm.csis,
        nti: rm.nti,
        ntiPath: rm.ntiPath,
        errors: rm.errors.slice(0, 6),
        skipped: rm.skipped,
      };
    } catch (error) {
      referenceMonitor = {
        count: 0,
        fetched: 0,
        csis: 0,
        nti: 0,
        ntiPath: "error",
        errors: [error instanceof Error ? error.message : "reference monitor ingest failed"],
        skipped: false,
      };
    }

    let militaryExercises: IngestResult["militaryExercises"] = null;
    try {
      const ex = await fetchAndUpsertMilitaryExercises(env);
      militaryExercises = {
        count: ex.count,
        fromNavarea: ex.fromNavarea,
        fromNews: ex.fromNews,
        errors: ex.errors.slice(0, 6),
        skipped: ex.skipped,
      };
    } catch (error) {
      militaryExercises = {
        count: 0,
        fromNavarea: 0,
        fromNews: 0,
        errors: [error instanceof Error ? error.message : "military exercise ingest failed"],
        skipped: false,
      };
    }

    pruned = await pruneOldRows(env.DB, retentionHours);
    newsWarm = await warmEndpoint(env.NEWS_WARM_URL, env, "news");
    videoNewsWarm = await warmEndpoint(env.VIDEO_NEWS_WARM_URL, env, "video-news");
    aisWarm = await warmEndpoint(env.AIS_WARM_URL, env, "ais");
    adsbWarm = await warmEndpoint(env.ADSB_WARM_URL, env, "adsb");
    tunnelsWarm = await warmEndpoint(env.TUNNELS_WARM_URL, env, "tunnels");
    disputeHatchWarm = await warmEndpoint(env.DISPUTE_HATCH_WARM_URL, env, "dispute-hatch");
    ukraineHatchWarm = await warmEndpoint(env.UKRAINE_HATCH_WARM_URL, env, "ukraine-hatch");
    shipMovementsWarm = await warmEndpoint(
      env.SHIP_MOVEMENTS_WARM_URL,
      env,
      "ship-movements",
    );

    const finishedAt = new Date().toISOString();
    const hardFail =
      Boolean(mapKey) && firmsCount === 0 && firmsErrors.length > 0 && gdeltCount === 0;

    let briefingStats: IngestResult["briefingStats"] = null;
    try {
      briefingStats = await upsertBriefingPeriodStats(env.DB);
    } catch (error) {
      console.warn(
        "[ingest] briefing stats upsert skipped:",
        error instanceof Error ? error.message : error,
      );
    }

    let dailyRanks: IngestResult["dailyRanks"] = null;
    try {
      dailyRanks = await upsertDailyRanks(env.DB);
    } catch (error) {
      console.warn(
        "[ingest] daily ranks upsert skipped:",
        error instanceof Error ? error.message : error,
      );
    }

    // ── 컨버전스 파이프라인 ────────────────────────────────────
    // 순서가 중요하다: 시장 시계열 적재 → 발화 감지 → 결과 백필 → 하트비트.
    // 어느 하나가 실패해도 인제스트 전체를 죽이지 않는다(전부 try/catch).
    // 단 하트비트는 실패 사실 자체를 기록하므로 마지막에 둔다.
    try {
      if (env.FRED_API_KEY) {
        const mkt = await ingestMarketDaily(env.DB, env.FRED_API_KEY);
        if (mkt.errors.length) console.warn("[market] partial:", mkt.errors.join("; "));
      }
    } catch (error) {
      console.warn(
        "[market] daily ingest skipped:",
        error instanceof Error ? error.message : error,
      );
    }

    try {
      const conv = await detectAndRecordConvergence(env.DB);
      if (conv.fired > 0) {
        console.log(`[convergence] fired=${conv.fired} ids=${conv.ids.join(",")}`);
      }
    } catch (error) {
      console.warn(
        "[convergence] detection skipped:",
        error instanceof Error ? error.message : error,
      );
    }

    try {
      await backfillOutcomes(env.DB);
    } catch (error) {
      console.warn(
        "[convergence] outcome backfill skipped:",
        error instanceof Error ? error.message : error,
      );
    }

    try {
      await recordHeartbeat(env.DB);
    } catch (error) {
      console.warn(
        "[heartbeat] skipped:",
        error instanceof Error ? error.message : error,
      );
    }

    let sitrepPush: IngestResult["sitrepPush"] = null;
    try {
      const digest = await dispatchSitrepDigestPush(env);
      sitrepPush = {
        skipped: digest.skipped,
        reason: digest.reason,
        rankDate: digest.rankDate,
        eventCount: digest.eventCount,
        koSent: digest.ko?.sent,
        enSent: digest.en?.sent,
      };
    } catch (error) {
      console.warn(
        "[ingest] sitrep push skipped:",
        error instanceof Error ? error.message : error,
      );
      sitrepPush = {
        skipped: true,
        reason: error instanceof Error ? error.message : "sitrep push failed",
      };
    }

    let baselineBackfill: IngestResult["baselineBackfill"] = null;
    try {
      const light = await maybeLightBaselineBackfill(env);
      baselineBackfill = light.ran
        ? {
            ran: true,
            rowsUpserted: light.detail?.rowsUpserted,
            errors: light.detail?.errors,
          }
        : { ran: false };
    } catch (error) {
      baselineBackfill = {
        ran: false,
        errors: [error instanceof Error ? error.message : "baseline backfill failed"],
      };
    }

    let livingTaiwan: IngestResult["livingTaiwan"] = null;
    try {
      livingTaiwan = await curateLivingTaiwan(env.DB);
    } catch (error) {
      console.warn(
        "[ingest] living taiwan curate skipped:",
        error instanceof Error ? error.message : error,
      );
    }

    const result: IngestResult = {
      ok: !hardFail,
      startedAt,
      finishedAt,
      firmsCount,
      gdeltCount,
      telegramCount,
      aisCount,
      adsbCount,
      newsWarm,
      videoNewsWarm,
      aisWarm,
      adsbWarm,
      tunnelsWarm,
      disputeHatchWarm,
      ukraineHatchWarm,
      shipMovementsWarm,
      firmsErrors,
      gdeltErrors,
      telegramErrors,
      aisErrors,
      adsbErrors,
      pruned,
      briefingStats,
      dailyRanks,
      sitrepPush,
      airRaid,
      baselineBackfill,
      livingTaiwan,
      ukmto,
      navarea,
      referenceMonitor,
      militaryExercises,
      error: hardFail ? firmsErrors.join("; ") || "ingest failed" : null,
    };

    await recordIngestRun(env.DB, {
      startedAt,
      finishedAt,
      firmsCount,
      gdeltCount,
      ok: result.ok,
      error: result.error,
      detail: {
        firmsErrors,
        gdeltErrors,
        telegramErrors,
        telegramCount,
        aisCount,
        adsbCount,
        aisErrors,
        adsbErrors,
        pruned,
        newsWarm,
        videoNewsWarm,
        aisWarm,
        adsbWarm,
        tunnelsWarm,
        disputeHatchWarm,
        ukraineHatchWarm,
        shipMovementsWarm,
        briefingStats,
        dailyRanks,
        sitrepPush,
        livingTaiwan,
        ukmto,
        navarea,
        referenceMonitor,
      },
    });

    return result;
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : "ingest crashed";
    try {
      await recordIngestRun(env.DB, {
        startedAt,
        finishedAt,
        firmsCount,
        gdeltCount,
        ok: false,
        error: message,
        detail: { firmsErrors, gdeltErrors, telegramErrors, telegramCount, aisCount, adsbCount, aisErrors, adsbErrors, newsWarm, aisWarm, adsbWarm, tunnelsWarm, disputeHatchWarm, ukraineHatchWarm, shipMovementsWarm },
      });
    } catch {
      // ignore secondary logging failure
    }
    return {
      ok: false,
      startedAt,
      finishedAt,
      firmsCount,
      gdeltCount,
      telegramCount,
      aisCount,
      adsbCount,
      newsWarm,
      aisWarm,
      adsbWarm,
      tunnelsWarm,
      disputeHatchWarm,
      ukraineHatchWarm,
      shipMovementsWarm,
      firmsErrors,
      gdeltErrors,
      telegramErrors,
      aisErrors,
      adsbErrors,
      error: message,
    };
  }
}

function jsonPublic(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=60",
    },
  });
}

/** Next.js(Vercel, D1 바인딩 없음)의 /api/track이 전달하는 이벤트만 허용 */
const ALLOWED_TRACK_EVENTS = new Set([
  "share_view_click",
  "share_view_success",
  "friction_card_share_click",
  "friction_card_share_success",
  "daily_rank_card_share_click",
  "daily_rank_card_share_success",
  "daily_predict_submit",
  "daily_predict_change",
  "mobile_home_view_toggle",
  "pwa_prompt_shown",
  "pwa_prompt_accept",
  "pwa_prompt_dismiss",
  "pwa_installed",
  "push_subscribed",
  "push_subscribe_denied",
]);

/** 브라우저 벤더 푸시 서비스 호스트 화이트리스트. */
const ALLOWED_PUSH_HOSTS = [
  /\.google\.com$/i,
  /\.googleapis\.com$/i,
  /\.mozilla\.com$/i,
  /\.mozaws\.net$/i,
  /\.windows\.com$/i,
  /\.microsoft\.com$/i,
  /\.apple\.com$/i,
];

function isAllowedPushEndpoint(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    return ALLOWED_PUSH_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

/** 타이밍 세이프 문자열 비교 (Workers 런타임에서 node:crypto 없이 동작). */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/**
 * 수동 트리거 인증 게이트 — **fail-closed**.
 *
 * 이 Worker는 workers.dev 또는 커스텀 도메인으로 인터넷에 노출되며,
 * /push/send 는 전체 구독자 브로드캐스트, /run 은 유료 외부 API 쿼터를 소모한다.
 * 따라서 INGEST_CRON_SECRET 미설정 시 **거부**한다.
 *
 * 로컬 개발에서만 .dev.vars 에 ALLOW_UNAUTHENTICATED_INGEST="true" 로 우회할 수 있다.
 * (프로덕션에는 절대 설정하지 말 것 — wrangler secret/vars 에 넣지 않으면 undefined)
 *
 * 시크릿은 Authorization 헤더로만 받는다. `?secret=` 쿼리는 CDN 액세스 로그·
 * Referer 에 평문으로 남기 때문에 인증 수단에서 제외했다.
 */
function authorizeManual(request: Request, env: IngestEnv): boolean {
  const secret = env.INGEST_CRON_SECRET?.trim();
  if (!secret) {
    return env.ALLOW_UNAUTHENTICATED_INGEST === "true";
  }
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return safeEqual(bearer, secret);
}

const worker = {
  async scheduled(
    _controller: ScheduledController,
    env: IngestEnv,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      runIngest(env).then((result) => {
        console.log(
          `[ingest] ok=${result.ok} firms=${result.firmsCount} gdelt=${result.gdeltCount} telegram=${result.telegramCount} ais=${result.aisCount} adsb=${result.adsbCount}` +
            (result.newsWarm
              ? ` newsWarm=${result.newsWarm.ok ? "ok" : "fail"}`
              : ""),
          result.error ? `error=${result.error}` : "",
        );
      }),
    );
  },

  async fetch(request: Request, env: IngestEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({
        service: "conflict-view-ingest",
        cron: "*/10 * * * *",
        endpoints: {
          health: "GET /health",
          run: "POST /run (Bearer INGEST_CRON_SECRET — required)",
          latest: "GET /latest",
          telegram: "GET /telegram?limit=200 (public read of D1 alerts)",
          firms: "GET /firms?west&south&east&north&max (public read of D1 fires)",
          gdelt: "GET /gdelt?limit=1200 (public read of D1 tension points)",
          ais: "GET /ais?category=all|military|commercial&max=250",
          adsb: "GET /adsb?mode=mil|civ&west&south&east&north&max=400",
          briefingStats:
            "GET /briefing-stats?key=daily-YYYY-MM-DD|weekly-YYYY-Www|monthly-YYYY-MM or ?tier=daily|weekly|monthly",
          dailyRanks:
            "GET /daily-ranks?date=YYYY-MM-DD&kind=theater|chokepoint&limit=5",
          dailyPredictionStats:
            "GET /daily-prediction-stats?date=YYYY-MM-DD&kind=theater",
          dailyPredict:
            "POST /daily-predict (Bearer INGEST_CRON_SECRET; body targetDate,kind,deviceId,pickEntityId)",
          track: "POST /track (Bearer INGEST_CRON_SECRET, D1-less hosts like Vercel forward here)",
          pushSubscribe: "POST /push/subscribe (public; body endpoint,keys)",
          pushUnsubscribe: "POST /push/unsubscribe (body endpoint)",
          pushSend: "POST /push/send (Bearer INGEST_CRON_SECRET; body title,body,url,tag)",
        },
      });
    }

    if (url.pathname === "/push/subscribe" && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          endpoint?: string;
          keys?: { p256dh?: string; auth?: string };
          lang?: string;
          userAgent?: string;
        };
        const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
        const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh.trim() : "";
        const auth = typeof body.keys?.auth === "string" ? body.keys.auth.trim() : "";
        // 실제 푸시 서비스 호스트만 허용 — 임의 URL 구독은 D1 증식 +
        // 브로드캐스트 시 SSRF-유사 증폭기가 된다.
        if (!isAllowedPushEndpoint(endpoint) || !p256dh || !auth) {
          return Response.json({ ok: false, error: "invalid subscription" }, { status: 400 });
        }
        if (endpoint.length > 2048 || p256dh.length > 200 || auth.length > 100) {
          return Response.json({ ok: false, error: "subscription too large" }, { status: 400 });
        }
        await upsertPushSubscription(env.DB, {
          endpoint,
          p256dh,
          auth,
          userAgent:
            typeof body.userAgent === "string"
              ? body.userAgent.slice(0, 256)
              : (request.headers.get("user-agent") || "").slice(0, 256) || null,
          lang: typeof body.lang === "string" ? body.lang.slice(0, 8) : null,
        });
        return Response.json({ ok: true });
      } catch (error) {
        return Response.json(
          {
            ok: false,
            error: error instanceof Error ? error.message : "subscribe failed",
          },
          { status: 500 },
        );
      }
    }

    if (url.pathname === "/push/unsubscribe" && request.method === "POST") {
      try {
        const body = (await request.json()) as { endpoint?: string };
        const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
        if (!endpoint) {
          return Response.json({ ok: false, error: "endpoint required" }, { status: 400 });
        }
        await deletePushSubscription(env.DB, endpoint);
        return Response.json({ ok: true });
      } catch (error) {
        return Response.json(
          {
            ok: false,
            error: error instanceof Error ? error.message : "unsubscribe failed",
          },
          { status: 500 },
        );
      }
    }

    if (url.pathname === "/push/send" && request.method === "POST") {
      if (!authorizeManual(request, env)) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      try {
        const body = (await request.json()) as {
          title?: string;
          body?: string;
          url?: string;
          tag?: string;
        };
        const title = typeof body.title === "string" ? body.title.trim() : "";
        if (!title || title.length > 120) {
          return Response.json({ ok: false, error: "title required (≤120)" }, { status: 400 });
        }
        const result = await broadcastPush(env, {
          title,
          body: typeof body.body === "string" ? body.body.slice(0, 500) : "",
          url: typeof body.url === "string" ? body.url.slice(0, 500) : "/",
          tag: typeof body.tag === "string" ? body.tag.slice(0, 64) : "cv-push",
        });
        return Response.json(result, { status: result.ok ? 200 : 500 });
      } catch (error) {
        return Response.json(
          { ok: false, error: error instanceof Error ? error.message : "send failed" },
          { status: 500 },
        );
      }
    }

    if (url.pathname === "/track" && request.method === "POST") {
      if (!authorizeManual(request, env)) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      try {
        const body = (await request.json()) as {
          event?: string;
          meta?: unknown;
          viewerMode?: string;
          lang?: string;
        };
        const event = typeof body.event === "string" ? body.event : "";
        if (!ALLOWED_TRACK_EVENTS.has(event)) {
          return Response.json({ ok: false, error: "event not allowed" }, { status: 400 });
        }
        await insertUiEvent(env.DB, {
          event,
          metaJson: body.meta ? JSON.stringify(body.meta) : null,
          viewerMode: typeof body.viewerMode === "string" ? body.viewerMode.slice(0, 32) : null,
          lang: typeof body.lang === "string" ? body.lang.slice(0, 8) : null,
        });
        return Response.json({ ok: true });
      } catch (error) {
        return Response.json(
          { ok: false, error: error instanceof Error ? error.message : "track insert failed" },
          { status: 500 },
        );
      }
    }

    if (url.pathname === "/briefing-stats") {
      const key = (url.searchParams.get("key") || "").trim();
      const tier = (url.searchParams.get("tier") || "").trim();
      try {
        if (key) {
          const row = await readBriefingStats(env.DB, key);
          return jsonPublic({
            fetchedAt: new Date().toISOString(),
            source: "d1-cron",
            stats: row,
          });
        }
        if (tier === "daily" || tier === "weekly" || tier === "monthly") {
          const row = await env.DB.prepare(
            `SELECT period_key, tier, gdelt_count, firms_count, telegram_count, news_item_count,
                    top_gdelt_tag, top_telegram_region, detail_json, window_start, window_end, updated_at
             FROM briefing_period_stats
             WHERE tier = ?
             ORDER BY updated_at DESC
             LIMIT 1`,
          )
            .bind(tier)
            .first();
          return jsonPublic({
            fetchedAt: new Date().toISOString(),
            source: "d1-cron",
            stats: row ?? null,
          });
        }
        return Response.json(
          { error: "Provide ?key= or ?tier=daily|weekly|monthly", stats: null },
          { status: 400 },
        );
      } catch (error) {
        return jsonPublic({
          fetchedAt: new Date().toISOString(),
          source: "d1-cron",
          stats: null,
          error: error instanceof Error ? error.message : "briefing-stats failed",
        });
      }
    }

    if (url.pathname === "/daily-ranks") {
      const date = (url.searchParams.get("date") || "").trim() || undefined;
      const kindRaw = (url.searchParams.get("kind") || "").trim();
      const kind =
        kindRaw === "theater" || kindRaw === "chokepoint" ? kindRaw : undefined;
      const limit = Number(url.searchParams.get("limit") || "5");
      try {
        const ranks = await readDailyRanks(env.DB, {
          date,
          kind,
          limit: Number.isFinite(limit) ? limit : 5,
        });
        let yesterdayCorrectPct: number | null = null;
        try {
          const { readPredictionStats } = await import("./dailyPredictions");
          const { prevUtcRankDate } = await import("./dailyRanks");
          const stats = await readPredictionStats(env.DB, {
            date: prevUtcRankDate(),
            kind: "theater",
          });
          if (stats && Number(stats.total) > 0) {
            yesterdayCorrectPct = Number(stats.correct_pct);
          }
        } catch {
          // optional attach
        }
        let worldTension: Awaited<ReturnType<typeof readWorldTension>> = null;
        try {
          worldTension = await readWorldTension(env.DB, date);
        } catch {
          worldTension = null;
        }
        return jsonPublic({
          fetchedAt: new Date().toISOString(),
          source: "d1-cron",
          date: date || null,
          kind: kind || "all",
          ranks,
          worldTension,
          yesterdayCorrectPct,
        });
      } catch (error) {
        return jsonPublic({
          fetchedAt: new Date().toISOString(),
          source: "d1-cron",
          ranks: [],
          error: error instanceof Error ? error.message : "daily-ranks failed",
        });
      }
    }

    if (url.pathname === "/daily-prediction-stats") {
      const date = (url.searchParams.get("date") || "").trim() || undefined;
      const kindRaw = (url.searchParams.get("kind") || "").trim();
      const kind =
        kindRaw === "tension-dir" ? "tension-dir" : kindRaw === "theater" ? "theater" : "tension-dir";
      try {
        const { readPredictionStats } = await import("./dailyPredictions");
        const stats = await readPredictionStats(env.DB, { date, kind });
        return jsonPublic({
          fetchedAt: new Date().toISOString(),
          source: "d1-cron",
          date: date || null,
          kind,
          stats: stats
            ? {
                targetDate: stats.target_date,
                kind: stats.kind,
                total: Number(stats.total) || 0,
                correct: Number(stats.correct) || 0,
                correctPct: Number(stats.correct_pct) || 0,
                winnerEntityId: stats.winner_entity_id,
                resolvedAt: stats.resolved_at,
              }
            : null,
        });
      } catch (error) {
        return jsonPublic({
          fetchedAt: new Date().toISOString(),
          source: "d1-cron",
          stats: null,
          error:
            error instanceof Error
              ? error.message
              : "daily-prediction-stats failed",
        });
      }
    }

    if (url.pathname === "/daily-prompt") {
      try {
        const dateParam = (url.searchParams.get("date") || "").trim();
        const { nextUtcRankDate, utcRankDate } = await import("./dailyRanks");
        const { readPrompt, upsertTomorrowPrompt } = await import("./dailyPrompts");
        const targetDate =
          /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : nextUtcRankDate();
        let prompt = await readPrompt(env.DB, targetDate);
        if (!prompt) {
          await upsertTomorrowPrompt(env.DB, { rankDate: utcRankDate() });
          prompt = await readPrompt(env.DB, targetDate);
        }
        return Response.json({
          ok: true,
          prompt: prompt
            ? {
                targetDate: prompt.target_date,
                subjectKind: prompt.subject_kind,
                subjectId: prompt.subject_id,
                labelKo: prompt.label_ko,
                labelEn: prompt.label_en,
                baselineScore: Number(prompt.baseline_score) || 0,
                questionKo: prompt.question_ko,
                questionEn: prompt.question_en,
                createdAt: prompt.created_at,
              }
            : null,
        });
      } catch (error) {
        return Response.json(
          {
            ok: false,
            error: error instanceof Error ? error.message : "daily-prompt failed",
          },
          { status: 500 },
        );
      }
    }

    if (url.pathname === "/daily-predict" && request.method === "POST") {
      if (!authorizeManual(request, env)) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      try {
        const body = (await request.json()) as {
          targetDate?: string;
          kind?: string;
          deviceId?: string;
          pickEntityId?: string;
        };
        const targetDate = (body.targetDate || "").trim();
        const deviceId = (body.deviceId || "").trim();
        const pickEntityId = (body.pickEntityId || "").trim();
        const kind =
          body.kind === "tension-dir"
            ? "tension-dir"
            : body.kind === "theater"
              ? "theater"
              : null;
        const { THEATER_ENTITY_IDS } = await import("./dailyRanks");
        const pickOk =
          kind === "tension-dir"
            ? pickEntityId === "up" || pickEntityId === "down"
            : Boolean(pickEntityId && THEATER_ENTITY_IDS.includes(pickEntityId));
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(targetDate) ||
          !kind ||
          !deviceId ||
          deviceId.length > 80 ||
          !pickOk
        ) {
          return Response.json({ error: "invalid body" }, { status: 400 });
        }
        const { upsertPrediction } = await import("./dailyPredictions");
        const result = await upsertPrediction(env.DB, {
          targetDate,
          kind,
          deviceId,
          pickEntityId,
        });
        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 500 });
        }
        return Response.json({ ok: true, createdAt: result.createdAt });
      } catch (error) {
        return Response.json(
          {
            error:
              error instanceof Error ? error.message : "daily-predict failed",
          },
          { status: 500 },
        );
      }
    }

    if (url.pathname === "/firms") {
      const num = (k: string, d: number) => {
        const v = Number(url.searchParams.get(k));
        return Number.isFinite(v) ? v : d;
      };
      const west = num("west", -180);
      const south = num("south", -90);
      const east = num("east", 180);
      const north = num("north", 90);
      const max = Math.min(2000, Math.max(1, Math.floor(num("max", 900))));
      let fires: Array<Record<string, unknown>> = [];
      try {
        const rows = await readFirmsFires(env.DB, { west, south, east, north, limit: max });
        fires = rows.map((row) => ({
          id: row.id,
          lat: row.lat,
          lng: row.lng,
          frp: row.frp,
          brightness: row.brightness,
          confidence: row.confidence,
          acqDate: row.acq_date,
          acqTime: row.acq_time,
          satellite: row.satellite,
          daynight: row.daynight,
        }));
      } catch {
        fires = [];
      }
      return jsonPublic({
        receivedAt: new Date().toISOString(),
        source: "d1-cron",
        count: fires.length,
        bbox: { west, south, east, north },
        fires,
      });
    }

    if (url.pathname === "/gdelt") {
      const limitRaw = Number.parseInt(url.searchParams.get("limit") || "1200", 10);
      const limit = Math.min(2000, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 1200));
      let events: Array<Record<string, unknown>> = [];
      try {
        const rows = await readGdeltPoints(env.DB, limit);
        events = rows.map((row) => ({
          id: row.id,
          lat: row.lat,
          lng: row.lng,
          name: row.name,
          url: row.url,
          mentionCount: row.mention_count,
          queryTag: row.query_tag,
        }));
      } catch {
        events = [];
      }
      return jsonPublic({
        fetchedAt: new Date().toISOString(),
        source: "d1-cron",
        count: events.length,
        events,
      });
    }

    if (url.pathname === "/ais") {
      const maxRaw = Number.parseInt(url.searchParams.get("max") || "250", 10);
      const max = Math.min(1000, Math.max(1, Number.isFinite(maxRaw) ? maxRaw : 250));
      const category = url.searchParams.get("category") || "all";
      let vessels: Array<Record<string, unknown>> = [];
      try {
        const rows = await readAisVessels(env.DB, { category, limit: max });
        vessels = rows.map((row) => ({
          id: row.id,
          mmsi: row.mmsi,
          shipName: row.ship_name,
          lat: row.lat,
          lng: row.lng,
          speedOverGround: row.sog,
          courseOverGround: row.cog,
          trueHeading: row.true_heading,
          shipType: row.ship_type,
          shipTypeLabel: row.ship_type_label,
          category: row.category,
          timestamp: row.timestamp,
        }));
      } catch {
        vessels = [];
      }
      return jsonPublic({
        receivedAt: new Date().toISOString(),
        source: "d1-cron",
        count: vessels.length,
        vessels,
      });
    }

    if (url.pathname === "/adsb") {
      const num = (k: string) => {
        const v = Number(url.searchParams.get(k));
        return Number.isFinite(v) ? v : null;
      };
      const modeParam = url.searchParams.get("mode");
      const mode: "mil" | "civ" = modeParam === "civ" ? "civ" : "mil";
      const maxRaw = Number.parseInt(url.searchParams.get("max") || "400", 10);
      const max = Math.min(1000, Math.max(1, Number.isFinite(maxRaw) ? maxRaw : 400));
      const west = num("west");
      const south = num("south");
      const east = num("east");
      const north = num("north");
      let aircraft: Array<Record<string, unknown>> = [];
      try {
        const rows = await readAdsbAircraft(env.DB, {
          mode,
          limit: max,
          west: west ?? undefined,
          south: south ?? undefined,
          east: east ?? undefined,
          north: north ?? undefined,
        });
        aircraft = rows.map((row) => {
          try {
            return JSON.parse(String(row.payload_json)) as Record<string, unknown>;
          } catch {
            return {
              id: row.hex,
              hex: row.hex,
              callsign: row.callsign,
              registration: row.registration,
              lat: row.lat,
              lng: row.lng,
              altitude: row.altitude,
              altitudeGeom: row.altitude_geom,
              groundSpeed: row.ground_speed,
              track: row.track,
              type: row.type,
              category: row.category,
              dbFlags: row.db_flags,
              squawk: row.squawk,
              emergency: row.emergency,
            };
          }
        });
      } catch {
        aircraft = [];
      }
      return jsonPublic({
        receivedAt: new Date().toISOString(),
        source: "d1-cron",
        mode,
        count: aircraft.length,
        aircraft,
      });
    }

    if (url.pathname === "/telegram") {
      const limitRaw = Number.parseInt(url.searchParams.get("limit") || "200", 10);
      const limit = Math.min(400, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 200));
      let alerts: Array<Record<string, unknown>> = [];
      let fetchedAt: string | null = null;
      try {
        const rows = await readTelegramAlerts(env.DB, limit);
        alerts = rows.map((row) => {
          const full = typeof row.text === "string" ? row.text.trim() : "";
          // 공개 엔드포인트 — 짧은 글 포함 약 절반만 (전문은 messageUrl CTA)
          let snippet = full;
          if (full.length === 1) {
            snippet = `${full}…`;
          } else if (full.length > 1) {
            const half = Math.min(Math.ceil(full.length / 2), 280);
            let cut = full.slice(0, half);
            if (half >= 4) {
              const breakAt = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(" "));
              if (breakAt >= Math.floor(half * 0.55)) cut = cut.slice(0, breakAt);
            }
            cut = cut.trimEnd() || full.slice(0, half);
            if (cut.length >= full.length) {
              cut = full.slice(0, Math.max(1, Math.ceil(full.length / 2))).trimEnd();
            }
            snippet = `${cut}…`;
          }
          return {
            id: row.id,
            channelUsername: row.channel_username,
            channelTitle: row.channel_title,
            region: row.region,
            text: snippet,
            textTruncated: full.length > 0,
            messageUrl: row.message_url,
            receivedAt: row.received_at,
          };
        });
        fetchedAt = rows[0]?.ingested_at ?? null;
      } catch {
        alerts = [];
      }
      return jsonPublic({
        fetchedAt: fetchedAt ?? new Date().toISOString(),
        live: alerts.length > 0,
        source: "d1-cron",
        alerts,
      });
    }

    if (url.pathname === "/latest") {
      const firms = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM firms_fires`,
      ).first<{ c: number }>();
      const gdelt = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM gdelt_points`,
      ).first<{ c: number }>();
      let telegramRows = 0;
      try {
        const tg = await env.DB.prepare(
          `SELECT COUNT(*) AS c FROM telegram_alerts`,
        ).first<{ c: number }>();
        telegramRows = tg?.c ?? 0;
      } catch {
        // migration 0005 not applied yet
      }
      let aisRows = 0;
      let adsbRows = 0;
      try {
        const ais = await env.DB.prepare(`SELECT COUNT(*) AS c FROM ais_vessels`).first<{ c: number }>();
        const adsb = await env.DB.prepare(`SELECT COUNT(*) AS c FROM adsb_aircraft`).first<{ c: number }>();
        aisRows = ais?.c ?? 0;
        adsbRows = adsb?.c ?? 0;
      } catch {
        // migration 0002
      }
      let newsSnapshots = 0;
      let newsItems = 0;
      try {
        const snap = await env.DB.prepare(
          `SELECT COUNT(*) AS c FROM news_stream_snapshots`,
        ).first<{ c: number }>();
        const items = await env.DB.prepare(
          `SELECT COUNT(*) AS c FROM news_stream_items`,
        ).first<{ c: number }>();
        newsSnapshots = snap?.c ?? 0;
        newsItems = items?.c ?? 0;
      } catch {
        // migration not applied yet
      }
      const last = await env.DB.prepare(
        `SELECT started_at, finished_at, firms_count, gdelt_count, ok, error
         FROM ingest_runs ORDER BY id DESC LIMIT 1`,
      ).first();
      return Response.json({
        firmsRows: firms?.c ?? 0,
        gdeltRows: gdelt?.c ?? 0,
        telegramRows,
        aisRows,
        adsbRows,
        newsSnapshots,
        newsItems,
        lastRun: last ?? null,
      });
    }

    if (url.pathname === "/run" && (request.method === "POST" || request.method === "GET")) {
      if (!authorizeManual(request, env)) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      const result = await runIngest(env);
      ctx.waitUntil(Promise.resolve());
      return Response.json(result, { status: result.ok ? 200 : 502 });
    }

    if (
      url.pathname === "/backfill-baseline" &&
      (request.method === "POST" || request.method === "GET")
    ) {
      if (!authorizeManual(request, env)) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      const days = Math.min(
        90,
        Math.max(7, Number(url.searchParams.get("days") || "90") || 90),
      );
      const archiveChunks = Math.min(
        12,
        Math.max(0, Number(url.searchParams.get("archiveChunks") || "6") || 6),
      );
      const result = await runBaselineBackfill(env, {
        days,
        firmsDays: 5,
        includeArchive: archiveChunks > 0,
        archiveChunks,
      });
      return Response.json(result, { status: result.ok ? 200 : 502 });
    }

    return Response.json({ error: "not found" }, { status: 404 });
  },
};

export default worker;
