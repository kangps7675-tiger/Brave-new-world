import type { IngestEnv } from "./env";
import {
  getAisVesselPositions,
  getAisZoneFlowCounts,
  getFirmsMapKey,
  insertAisZoneCrossings,
  insertUiEvent,
  pruneOldRows,
  readAdsbAircraft,
  readAisVessels,
  readFirmsFires,
  readIntVar,
  recordIngestRun,
  upsertAdsbAircraft,
  upsertAisVessels,
  upsertFirmsFires,
} from "./db";
import { fetchAisVessels } from "./ais";
import { buildAisZoneCrossings } from "./aisZones";
import { fetchAdsbAircraft } from "./adsb";
import { fetchFirmsForTheaters } from "./firms";
import { recordHeartbeat } from "./pipelineHealth";
import { fetchAndUpsertUkmto } from "./ukmto";
import { fetchAndReplaceNavarea } from "./navarea";
import { fetchAndUpsertWarRisk } from "./warRisk";
import { fetchAndUpsertMarineWeather } from "./marineWeather";
import { EMAIL_DIGEST_CRON, handleEmailRequest, runDailyEmailDigest } from "./emailSub";
import {
  broadcastPush,
  deletePushSubscription,
  upsertPushSubscription,
} from "./push";
import {
  appendAisHistory,
  appendMilAdsbHistory,
  pruneTrackHistory,
  trackHistoryRetentionDays,
} from "./trackHistory";

export type { IngestEnv };

type WarmResult = { ok: boolean; status: number; detail?: string };

type SourceRun = { count: number; fetched?: number; errors: string[]; skipped: boolean } | null;

/**
 * 해역 위험 판단용 수집만 (2026-10-20 정리):
 *   ADS-B(군용, 사건 카드용) · AIS(+항적 이력·해역 게이트) · FIRMS(에너지 시설 반경) ·
 *   UKMTO · NAVAREA · 전쟁위험 보험료 · 해상 기상 · 뉴스/AIS/ADS-B/선박이동/LiveUAMap warm.
 * GDELT·텔레그램·공습경보·일일 랭크·예측·컨버전스·레퍼런스 감시·훈련·항모·DeepState 는 제거.
 */
type IngestResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  firmsCount: number;
  aisCount: number;
  adsbCount: number;
  newsWarm?: WarmResult;
  aisWarm?: WarmResult;
  adsbWarm?: WarmResult;
  shipMovementsWarm?: WarmResult;
  liveuamapWarm?: WarmResult;
  firmsErrors: string[];
  aisErrors: string[];
  adsbErrors: string[];
  pruned?: Awaited<ReturnType<typeof pruneOldRows>>;
  ukmto?: SourceRun;
  navarea?: SourceRun;
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

/** wrangler.ingest.toml 의 빠른 크론 표현식과 같아야 한다 */
const FAST_ALERT_CRON = "*/5 * * * *";

/**
 * 시간에 민감한 경보만 5분 간격으로: UKMTO 피습·나포, liveuamap 속보 동기화, 이란·중동 공격 소식.
 * 각 소스는 자체 최소 간격(UKMTO 5분, liveuamap 슬롯별 한도)으로 스스로 스로틀한다.
 * 전체 수집(runIngest)은 AIS WebSocket·FIRMS·GDELT 때문에 ~90초가 걸려 이 주기로 돌리지 않는다.
 */
async function runFastAlerts(env: IngestEnv): Promise<void> {
  const out: string[] = [];
  try {
    const uk = await fetchAndUpsertUkmto(env);
    out.push(`ukmto=${uk.skipped ? "skip" : uk.count}`);
    if (uk.errors.length > 0) out.push(`ukmtoErr=${uk.errors[0]}`);
  } catch (error) {
    out.push(`ukmtoErr=${error instanceof Error ? error.message : "failed"}`);
  }
  const live = await warmEndpoint(env.LIVEUAMAP_SYNC_URL, env, "liveuamap");
  if (live) out.push(`liveuamap=${live.ok ? "ok" : "fail"}`);
  console.log(`[fast-alerts] ${out.join(" ")}`);
}

async function runSource(
  label: string,
  fn: () => Promise<{ count: number; fetched?: number; errors: string[]; skipped: boolean }>,
): Promise<SourceRun> {
  try {
    const r = await fn();
    return { count: r.count, fetched: r.fetched, errors: r.errors.slice(0, 6), skipped: r.skipped };
  } catch (error) {
    return { count: 0, errors: [error instanceof Error ? error.message : `${label} failed`], skipped: false };
  }
}

async function runIngest(env: IngestEnv): Promise<IngestResult> {
  const startedAt = new Date().toISOString();
  const firmsErrors: string[] = [];
  const aisErrors: string[] = [];
  const adsbErrors: string[] = [];
  let firmsCount = 0;
  let aisCount = 0;
  let adsbCount = 0;

  try {
    const dayRange = Math.min(5, Math.max(1, readIntVar(env, "FIRMS_DAY_RANGE", 2)));
    const maxPerTheater = Math.min(800, Math.max(50, readIntVar(env, "FIRMS_MAX_PER_THEATER", 400)));
    const retentionHours = Math.min(168, Math.max(6, readIntVar(env, "RETENTION_HOURS", 48)));

    // ADS-B 먼저(빠른 HTTP) → AIS(WebSocket ~4s) → FIRMS
    const milMax = Math.min(2000, Math.max(50, readIntVar(env, "ADSB_MIL_MAX", 1200)));
    const civPerHub = Math.min(80, Math.max(10, readIntVar(env, "ADSB_CIV_PER_HUB", 40)));
    const civMax = Math.min(5000, Math.max(50, readIntVar(env, "ADSB_CIV_MAX", 3000)));
    // 허브를 2등분해 10분 크론마다 번갈아 호출 — 허브당 20분 주기, 호출량 절반.
    const hubSlice = Math.floor(Date.now() / (10 * 60_000)) % 2;
    const adsb = await fetchAdsbAircraft(env, { milMax, civMax, civPerHub, hubSlice, hubSlices: 2 });
    adsbErrors.push(...adsb.errors.slice(0, 12));
    adsbCount = await upsertAdsbAircraft(env.DB, adsb.aircraft);
    try {
      await appendMilAdsbHistory(env.DB, adsb.aircraft);
    } catch (error) {
      adsbErrors.push(`track-history: ${error instanceof Error ? error.message : "append failed"}`);
    }

    const aisMax = Math.min(3000, Math.max(50, readIntVar(env, "AIS_MAX_VESSELS", 3000)));
    const ais = await fetchAisVessels(env, aisMax);
    aisErrors.push(...ais.errors.slice(0, 8));

    // upsert로 덮어쓰기 전에 이전 위치를 먼저 읽어서 게이트 통과 여부를 판정한다.
    // 순서를 바꾸면(upsert 먼저) 항상 같은 위치와 비교하게 된다 — 크로싱이 영영 만들어지지 않는다.
    try {
      const priorPositions = await getAisVesselPositions(env.DB, ais.vessels.map((v) => v.id));
      const zoneCrossings = buildAisZoneCrossings(ais.vessels, priorPositions);
      if (zoneCrossings.length > 0) await insertAisZoneCrossings(env.DB, zoneCrossings);
    } catch (error) {
      aisErrors.push(`zone-crossing: ${error instanceof Error ? error.message : "detection failed"}`);
    }

    aisCount = await upsertAisVessels(env.DB, ais.vessels);
    try {
      await appendAisHistory(env.DB, ais.vessels);
    } catch (error) {
      aisErrors.push(`track-history: ${error instanceof Error ? error.message : "append failed"}`);
    }

    // FIRMS — 러시아·우크라이나 에너지·항만 시설 반경 안 열점만 (firms.ts)
    const mapKey = getFirmsMapKey(env);
    if (mapKey) {
      const firms = await fetchFirmsForTheaters({ mapKey, dayRange, maxPerTheater });
      firmsErrors.push(...firms.errors);
      firmsCount = await upsertFirmsFires(env.DB, firms.fires);
    } else {
      firmsErrors.push("NASA_FIRMS_API_KEY (or FIRMS_MAP_KEY) missing — FIRMS skipped");
    }

    const ukmto = await runSource("ukmto", () => fetchAndUpsertUkmto(env));
    const navarea = await runSource("navarea", () => fetchAndReplaceNavarea(env));

    const pruned = await pruneOldRows(env.DB, retentionHours);
    await pruneTrackHistory(env.DB, trackHistoryRetentionDays(env));
    const newsWarm = await warmEndpoint(env.NEWS_WARM_URL, env, "news");
    const aisWarm = await warmEndpoint(env.AIS_WARM_URL, env, "ais");
    const adsbWarm = await warmEndpoint(env.ADSB_WARM_URL, env, "adsb");
    const shipMovementsWarm = await warmEndpoint(env.SHIP_MOVEMENTS_WARM_URL, env, "ship-movements");
    try {
      const wr = await fetchAndUpsertWarRisk(env);
      if (!wr.skipped) {
        console.log(
          `[war-risk] scanned=${wr.scanned} stored=${wr.count}` +
            (wr.errors.length > 0 ? ` errors=${wr.errors.join(" | ")}` : ""),
        );
      }
    } catch (error) {
      console.warn("[war-risk] skipped:", error instanceof Error ? error.message : error);
    }
    try {
      const mw = await fetchAndUpsertMarineWeather(env);
      if (!mw.skipped && (mw.files > 0 || mw.errors.length > 0)) {
        console.log(
          `[marine-weather] cycle=${mw.cycle ?? "-"} files=${mw.files} rows=${mw.rows}` +
            (mw.errors.length > 0 ? ` errors=${mw.errors.join(" | ")}` : ""),
        );
      }
    } catch (error) {
      console.warn("[marine-weather] skipped:", error instanceof Error ? error.message : error);
    }
    const liveuamapWarm = await warmEndpoint(env.LIVEUAMAP_SYNC_URL, env, "liveuamap");

    try {
      await recordHeartbeat(env.DB);
    } catch (error) {
      console.warn("[heartbeat] skipped:", error instanceof Error ? error.message : error);
    }

    const finishedAt = new Date().toISOString();
    const hardFail = aisCount === 0 && adsbCount === 0 && aisErrors.length > 0 && adsbErrors.length > 0;
    const result: IngestResult = {
      ok: !hardFail,
      startedAt,
      finishedAt,
      firmsCount,
      aisCount,
      adsbCount,
      newsWarm,
      aisWarm,
      adsbWarm,
      shipMovementsWarm,
      liveuamapWarm,
      firmsErrors,
      aisErrors,
      adsbErrors,
      pruned,
      ukmto,
      navarea,
      error: hardFail ? [...aisErrors, ...adsbErrors].slice(0, 4).join("; ") || "ingest failed" : null,
    };

    await recordIngestRun(env.DB, {
      startedAt,
      finishedAt,
      firmsCount,
      gdeltCount: 0,
      ok: result.ok,
      error: result.error,
      detail: { ...result },
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
        gdeltCount: 0,
        ok: false,
        error: message,
        detail: { firmsErrors, aisErrors, adsbErrors, aisCount, adsbCount },
      });
    } catch {
      // ignore secondary logging failure
    }
    return {
      ok: false,
      startedAt,
      finishedAt,
      firmsCount,
      aisCount,
      adsbCount,
      firmsErrors,
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
    controller: ScheduledController,
    env: IngestEnv,
    ctx: ExecutionContext,
  ) {
    // 빠른 경보 크론 — 무거운 전체 수집(AIS·ADS-B·FIRMS·GDELT…)과 분리해 5분마다 돈다
    if (controller.cron === EMAIL_DIGEST_CRON) {
      ctx.waitUntil(
        runDailyEmailDigest(env).then(
          (result) => {
            console.log(`[email-digest] ${JSON.stringify(result)}`);
          },
          (error) => {
            console.warn("[email-digest]", error instanceof Error ? error.message : error);
          },
        ),
      );
      return;
    }
    if (controller.cron === FAST_ALERT_CRON) {
      ctx.waitUntil(runFastAlerts(env));
      return;
    }
    ctx.waitUntil(
      runDailyEmailDigest(env, { retryOnly: true }).then(
        (result) => {
          if (!result.skipped) console.log(`[email-digest] retry ${JSON.stringify(result)}`);
        },
        (error) => {
          console.warn("[email-digest] retry", error instanceof Error ? error.message : error);
        },
      ),
    );
    ctx.waitUntil(
      runIngest(env).then((result) => {
        console.log(
          `[ingest] ok=${result.ok} firms=${result.firmsCount} ais=${result.aisCount} adsb=${result.adsbCount}` +
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

    const emailResponse = await handleEmailRequest(request, env, url);
    if (emailResponse) return emailResponse;

    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({
        service: "conflict-view-ingest",
        cron: "*/10 * * * *", fastAlertCron: FAST_ALERT_CRON, emailDigestCron: EMAIL_DIGEST_CRON,
        endpoints: {
          health: "GET /health",
          run: "POST /run (Bearer INGEST_CRON_SECRET — required)",
          latest: "GET /latest",
          firms: "GET /firms?west&south&east&north&max (public read of D1 fires)",
          ais: "GET /ais?category=all|military|commercial&max=250",
          aisZones: "GET /ais/zones?hours=24",
          adsb: "GET /adsb?mode=mil|civ&west&south&east&north&max=400",
          track: "POST /track (Bearer INGEST_CRON_SECRET, D1-less hosts like Vercel forward here)",
          pushSubscribe: "POST /push/subscribe (public; body endpoint,keys)",
          pushUnsubscribe: "POST /push/unsubscribe (body endpoint)",
          pushSend: "POST /push/send (Bearer INGEST_CRON_SECRET; body title,body,url,tag)",
          emailSubscribe: "POST /email/subscribe (public; body email,lang)",
          emailConfirm: "GET /email/confirm?token=",
          emailUnsubscribe: "GET or POST /email/unsubscribe?token=",
          emailDigest: "POST /email/digest (Bearer INGEST_CRON_SECRET; ?force=1 resends today)",
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

    if (url.pathname === "/ais") {
      const maxRaw = Number.parseInt(url.searchParams.get("max") || "250", 10);
      const max = Math.min(3000, Math.max(1, Number.isFinite(maxRaw) ? maxRaw : 250));
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

    if (url.pathname === "/ais/zones") {
      const hoursRaw = Number.parseInt(url.searchParams.get("hours") || "24", 10);
      const hours = Math.min(168, Math.max(1, Number.isFinite(hoursRaw) ? hoursRaw : 24));
      let counts: Array<{ zone_id: string; direction: string; category: string | null; count: number }> = [];
      try {
        counts = await getAisZoneFlowCounts(env.DB, hours);
      } catch {
        counts = [];
      }
      return jsonPublic({
        receivedAt: new Date().toISOString(),
        source: "d1-cron",
        windowHours: hours,
        // 어느 정도 샘플링이 느쟈한지의 자동 판정은 없다 — 숬다치해협·베링해협은
        // 트래픽이 희박해 대부분 실행에서 0개일 수 있다. 화면에서는 0을
        // "통과 없음"이 아니라 "이 시간대에 포착된 것 없음"으로 표기해야 한다.
        counts,
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
      const max = Math.min(2000, Math.max(1, Number.isFinite(maxRaw) ? maxRaw : 400));
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

    if (url.pathname === "/latest") {
      const firms = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM firms_fires`,
      ).first<{ c: number }>();
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

    return Response.json({ error: "not found" }, { status: 404 });
  },
};

export default worker;
