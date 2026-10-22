/**
 * 이메일 구독 — 접수, 확인, 해지, 하루 한 번 발송 (Resend).
 * 키(RESEND_API_KEY)와 보내는 주소(EMAIL_FROM)가 없으면 보내지 않는다.
 */
import type { IngestEnv } from "./env";
import {
  EMAIL_DIGEST_CRON,
  buildConfirmMail,
  buildDigest,
  digestWindow,
  emailActionUrl,
  escapeHtml,
  isValidEmail,
  normalizeEmail,
  randomToken,
  type DigestLang,
} from "../../../src/lib/emailDigest";
import {
  pickDigestIncidents,
  pickDigestQuotes,
  type NgaDigestRow,
  type QuoteDigestRow,
  type UkmtoDigestRow,
} from "../../../src/lib/emailDigestPick";

export { EMAIL_DIGEST_CRON };

const CONFIRM_COOLDOWN_MS = 30 * 60 * 1000;
const HOURLY_CAP = 40;
const RETRY_GAP_MS = 15 * 60 * 1000;
const GIVE_UP_MS = 6 * 3_600_000;
const TOKEN_RE = /^[a-f0-9]{64}$/;

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i += 1) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

type SubRow = {
  email: string;
  lang: string;
  status: string;
  unsub_token: string;
};

type RunRow = {
  window_date: string;
  started_at: string;
  finished_at: string | null;
};

export type DigestRunResult = {
  skipped: boolean;
  reason?: string;
  dateKey?: string;
  incidents?: number;
  quotes?: number;
  recipients?: number;
  sent?: number;
  failed?: number;
};

function digestEnabled(env: IngestEnv): boolean {
  const flag = (env.EMAIL_DIGEST_ENABLED ?? "true").trim().toLowerCase();
  return flag !== "false" && flag !== "0" && flag !== "off";
}

function mailConfigured(env: IngestEnv): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.EMAIL_FROM?.trim());
}

function publicBase(env: IngestEnv, request?: Request): string | null {
  const fromEnv = env.EMAIL_PUBLIC_BASE?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (request) return new URL(request.url).origin;
  return null;
}

function langOf(raw: unknown): DigestLang {
  return raw === "en" ? "en" : "ko";
}

async function emailKey(email: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function htmlPage(title: string, body: string): Response {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#120e08;color:#f6e7c1;font-family:sans-serif"><main style="max-width:32rem;margin:4rem auto;padding:0 1.25rem"><h1 style="font-size:1.25rem">${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></main></body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "referrer-policy": "no-referrer",
      "cache-control": "no-store",
    },
  });
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

async function sendMail(
  env: IngestEnv,
  msg: {
    to: string;
    subject: string;
    text: string;
    html: string;
    headers?: Record<string, string>;
    idempotencyKey: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const key = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!key || !from) return { ok: false, error: "not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": msg.idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        headers: msg.headers,
      }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 180);
      return { ok: false, error: detail || `resend ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "send failed" };
  }
}

async function hourlyCapReached(db: D1Database, now: number): Promise<boolean> {
  const since = new Date(now - 3_600_000).toISOString();
  const row = await db
    .prepare(`SELECT COUNT(*) AS c FROM email_subscribers WHERE confirm_sent_at >= ?1`)
    .bind(since)
    .first<{ c: number }>();
  return (row?.c ?? 0) >= HOURLY_CAP;
}

/** 새 주소·해지된 주소는 확인 메일을 보낸다. 이미 구독 중이거나 30분 안이면 보내지 않는다. */
export async function subscribeEmail(
  env: IngestEnv,
  input: { email: string; lang: DigestLang; company?: string; consent?: boolean },
  request: Request,
): Promise<{ status: number; body: { ok: boolean; error?: string } }> {
  if (typeof input.company === "string" && input.company.trim() !== "") {
    return { status: 200, body: { ok: true } };
  }
  if (input.consent !== true) return { status: 400, body: { ok: false, error: "consent_required" } };
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return { status: 400, body: { ok: false, error: "invalid email" } };
  if (!mailConfigured(env)) return { status: 503, body: { ok: false, error: "not_configured" } };
  const base = publicBase(env, request);
  if (!base) return { status: 503, body: { ok: false, error: "not_configured" } };

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  if (await hourlyCapReached(env.DB, now)) return { status: 200, body: { ok: true } };

  const confirmToken = randomToken();
  const unsubToken = randomToken();
  const cooldown = new Date(now - CONFIRM_COOLDOWN_MS).toISOString();
  const res = await env.DB.prepare(
    `INSERT INTO email_subscribers (
       email, lang, status, confirm_token, unsub_token, created_at, confirm_sent_at, consent_at
     ) VALUES (?1, ?2, 'pending', ?3, ?4, ?5, ?5, ?5)
     ON CONFLICT(email) DO UPDATE SET
       lang = excluded.lang,
       status = 'pending',
       confirm_token = excluded.confirm_token,
       unsub_token = excluded.unsub_token,
       confirm_sent_at = excluded.confirm_sent_at,
       consent_at = excluded.consent_at,
       unsubscribed_at = NULL
     WHERE email_subscribers.status != 'active'
       AND (email_subscribers.confirm_sent_at IS NULL OR email_subscribers.confirm_sent_at <= ?6)`,
  )
    .bind(email, input.lang, confirmToken, unsubToken, nowIso, cooldown)
    .run();
  const changed = (res.meta as { changes?: number } | undefined)?.changes ?? 0;
  if (changed === 0) return { status: 200, body: { ok: true } };

  const mail = buildConfirmMail(
    { confirmUrl: emailActionUrl(base, "confirm", confirmToken) },
    input.lang,
  );
  const sent = await sendMail(env, {
    to: email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    idempotencyKey: `straitdesk-confirm-${confirmToken}`,
  });
  if (!sent.ok) {
    await env.DB.prepare(
      `UPDATE email_subscribers SET confirm_sent_at = NULL WHERE email = ?1 AND status = 'pending'`,
    )
      .bind(email)
      .run();
    return { status: 502, body: { ok: false, error: "send_failed" } };
  }
  return { status: 200, body: { ok: true } };
}

async function rowByToken(
  db: D1Database,
  column: "confirm_token" | "unsub_token",
  token: string,
): Promise<SubRow | null> {
  if (!TOKEN_RE.test(token)) return null;
  return db
    .prepare(
      `SELECT email, lang, status, unsub_token FROM email_subscribers WHERE ${column} = ?1`,
    )
    .bind(token)
    .first<SubRow>();
}

export async function confirmEmail(
  db: D1Database,
  token: string,
): Promise<{ state: "confirmed" | "invalid"; lang: DigestLang }> {
  const row = await rowByToken(db, "confirm_token", token);
  if (!row || row.status === "unsubscribed") return { state: "invalid", lang: "ko" };
  const lang = langOf(row.lang);
  await db
    .prepare(
      `UPDATE email_subscribers
       SET status = 'active', confirmed_at = ?1, confirm_token = NULL
       WHERE confirm_token = ?2`,
    )
    .bind(new Date().toISOString(), token)
    .run();
  return { state: "confirmed", lang };
}

export async function unsubscribeEmail(
  db: D1Database,
  token: string,
): Promise<{ state: "unsubscribed" | "invalid"; lang: DigestLang }> {
  const row = await rowByToken(db, "unsub_token", token);
  if (!row) return { state: "invalid", lang: "ko" };
  const lang = langOf(row.lang);
  if (row.status !== "unsubscribed") {
    await db
      .prepare(
        `UPDATE email_subscribers
         SET status = 'unsubscribed', unsubscribed_at = ?1, confirm_token = NULL
         WHERE unsub_token = ?2`,
      )
      .bind(new Date().toISOString(), token)
      .run();
  }
  return { state: "unsubscribed", lang };
}

const COPY = {
  confirmed: {
    ko: ["구독이 확인되었습니다", "새 피격 사건과 보도 기준 전쟁위험 보험료를 하루 한 번 보내 드립니다."],
    en: ["Subscription confirmed", "New ship incidents and reported war-risk figures go out once a day."],
  },
  unsubscribed: {
    ko: ["수신을 해지했습니다", "더 이상 메일이 가지 않습니다."],
    en: ["Unsubscribed", "You will not receive further messages."],
  },
  invalid: {
    ko: ["링크가 유효하지 않습니다", "이미 확인했거나 주소가 바뀌었을 수 있습니다."],
    en: ["This link is not valid", "It may already have been used."],
  },
} as const;

function actionResponse(
  request: Request,
  url: URL,
  result: { state: keyof typeof COPY; lang: DigestLang },
): Response {
  const wantJson =
    url.searchParams.get("format") === "json" ||
    (request.headers.get("accept") || "").includes("application/json");
  if (wantJson || request.method === "POST") {
    return json({ ok: result.state !== "invalid", state: result.state });
  }
  const [title, body] = COPY[result.state][result.lang];
  return htmlPage(title, body);
}

async function loadIncidents(
  db: D1Database,
  window: { startMs: number; endMs: number },
  lang: DigestLang,
) {
  const since = new Date(window.startMs - 3_600_000).toISOString();
  const uk = await db
    .prepare(
      `SELECT id, incident_type_name, place, region, vessel_name, vessel_type,
              utc_date_of_incident, utc_date_created, first_seen_at, lat, lng
       FROM ukmto_incidents
       WHERE first_seen_at IS NOT NULL AND first_seen_at >= ?1
       ORDER BY first_seen_at DESC
       LIMIT 80`,
    )
    .bind(since)
    .all<{
      id: string;
      incident_type_name: string;
      place: string | null;
      region: string | null;
      vessel_name: string | null;
      vessel_type: string | null;
      utc_date_of_incident: string | null;
      utc_date_created: string | null;
      first_seen_at: string | null;
      lat: number;
      lng: number;
    }>();
  const nga = await db
    .prepare(
      `SELECT id, description, warning_date, lat, lng
       FROM navarea_features
       WHERE source = 'nga' AND warning_date >= ?1
       ORDER BY warning_date DESC
       LIMIT 200`,
    )
    .bind(since)
    .all<{
      id: string;
      description: string;
      warning_date: string;
      lat: number | null;
      lng: number | null;
    }>();
  const ukmto: UkmtoDigestRow[] = (uk.results ?? []).map((r) => ({
    id: r.id,
    incidentTypeName: r.incident_type_name,
    place: r.place,
    region: r.region,
    vesselName: r.vessel_name,
    vesselType: r.vessel_type,
    utcDateOfIncident: r.utc_date_of_incident,
    utcDateCreated: r.utc_date_created,
    firstSeenAt: r.first_seen_at,
    lat: r.lat,
    lng: r.lng,
  }));
  const ngaRows: NgaDigestRow[] = (nga.results ?? []).map((r) => ({
    id: r.id,
    description: r.description,
    warningDate: r.warning_date,
    lat: r.lat,
    lng: r.lng,
  }));
  return pickDigestIncidents(ukmto, ngaRows, window, lang);
}

async function loadQuotes(db: D1Database, window: { startMs: number; endMs: number }) {
  const since = new Date(window.startMs).toISOString();
  const until = new Date(window.endMs).toISOString();
  const rows = await db
    .prepare(
      `SELECT region, rate_pct, rate_high_pct, rate_prev_pct, direction, outlet, headline, url,
              published_at, ingested_at
       FROM war_risk_quotes
       WHERE ingested_at >= ?1 AND ingested_at < ?2 AND rate_pct IS NOT NULL`,
    )
    .bind(since, until)
    .all<{
      region: string;
      rate_pct: number | null;
      rate_high_pct: number | null;
      rate_prev_pct: number | null;
      direction: string | null;
      outlet: string | null;
      headline: string;
      url: string;
      published_at: string | null;
      ingested_at: string | null;
    }>();
  const mapped: QuoteDigestRow[] = (rows.results ?? []).map((r) => ({
    region: r.region,
    ratePct: r.rate_pct,
    rateHighPct: r.rate_high_pct,
    ratePrevPct: r.rate_prev_pct,
    direction: r.direction,
    outlet: r.outlet,
    headline: r.headline,
    url: r.url,
    publishedAt: r.published_at,
    ingestedAt: r.ingested_at,
  }));
  return pickDigestQuotes(mapped, window);
}

export async function runDailyEmailDigest(
  env: IngestEnv,
  opts: { force?: boolean; now?: number; retryOnly?: boolean } = {},
): Promise<DigestRunResult> {
  if (!digestEnabled(env)) return { skipped: true, reason: "disabled" };
  const now = opts.now ?? Date.now();
  const window = digestWindow(now);
  if (opts.retryOnly) {
    const existing = await env.DB.prepare(
      `SELECT window_date, started_at, finished_at FROM email_digest_runs WHERE window_date = ?1`,
    )
      .bind(window.dateKey)
      .first<RunRow>();
    if (!existing || existing.finished_at) return { skipped: true, reason: "nothing-to-retry" };
  }
  if (!mailConfigured(env)) return { skipped: true, reason: "not_configured", dateKey: window.dateKey };
  const base = publicBase(env);
  if (!base) return { skipped: true, reason: "no_public_base", dateKey: window.dateKey };

  if (opts.force) {
    await env.DB.prepare(`DELETE FROM email_digest_runs WHERE window_date = ?1`).bind(window.dateKey).run();
  }

  const nowIso = new Date(now).toISOString();
  const claim = await env.DB.prepare(
    `INSERT INTO email_digest_runs (window_date, started_at) VALUES (?1, ?2)
     ON CONFLICT(window_date) DO NOTHING`,
  )
    .bind(window.dateKey, nowIso)
    .run();
  const claimed = ((claim.meta as { changes?: number } | undefined)?.changes ?? 0) > 0;
  if (!claimed) {
    const existing = await env.DB.prepare(
      `SELECT window_date, started_at, finished_at FROM email_digest_runs WHERE window_date = ?1`,
    )
      .bind(window.dateKey)
      .first<RunRow>();
    if (!existing) return { skipped: true, reason: "claim-failed", dateKey: window.dateKey };
    if (existing.finished_at) return { skipped: true, reason: "already-sent", dateKey: window.dateKey };
    const started = Date.parse(existing.started_at);
    if (Number.isFinite(started) && now - started < RETRY_GAP_MS) {
      return { skipped: true, reason: "in-progress", dateKey: window.dateKey };
    }
    if (Number.isFinite(started) && now - started > GIVE_UP_MS) {
      await env.DB.prepare(
        `UPDATE email_digest_runs SET finished_at = ?1, error = 'gave-up' WHERE window_date = ?2 AND finished_at IS NULL`,
      )
        .bind(nowIso, window.dateKey)
        .run();
      return { skipped: true, reason: "gave-up", dateKey: window.dateKey };
    }
    await env.DB.prepare(
      `UPDATE email_digest_runs SET started_at = ?1, error = NULL WHERE window_date = ?2 AND finished_at IS NULL`,
    )
      .bind(nowIso, window.dateKey)
      .run();
  }

  const finish = async (patch: {
    incidents: number;
    quotes: number;
    recipients: number;
    sent: number;
    error: string | null;
    done: boolean;
  }) => {
    await env.DB.prepare(
      `UPDATE email_digest_runs
       SET finished_at = ?1, incident_count = ?2, quote_count = ?3,
           recipient_count = ?4, sent = ?5, error = ?6
       WHERE window_date = ?7`,
    )
      .bind(
        patch.done ? new Date().toISOString() : null,
        patch.incidents,
        patch.quotes,
        patch.recipients,
        patch.sent,
        patch.error,
        window.dateKey,
      )
      .run();
  };

  try {
    const [koIncidents, enIncidents, quotes] = await Promise.all([
      loadIncidents(env.DB, window, "ko"),
      loadIncidents(env.DB, window, "en"),
      loadQuotes(env.DB, window),
    ]);
    const subs = await env.DB.prepare(
      `SELECT email, lang, status, unsub_token FROM email_subscribers WHERE status = 'active'`,
    ).all<SubRow>();
    const recipients = subs.results ?? [];
    const incidentCount = Math.max(koIncidents.length, enIncidents.length);
    if (incidentCount === 0 && quotes.length === 0) {
      await finish({ incidents: 0, quotes: 0, recipients: recipients.length, sent: 0, error: null, done: true });
      return { skipped: false, reason: "empty", dateKey: window.dateKey, incidents: 0, quotes: 0, recipients: recipients.length, sent: 0, failed: 0 };
    }
    if (recipients.length === 0) {
      await finish({ incidents: incidentCount, quotes: quotes.length, recipients: 0, sent: 0, error: null, done: true });
      return { skipped: false, reason: "no-recipients", dateKey: window.dateKey, incidents: incidentCount, quotes: quotes.length, recipients: 0, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;
    let lastError: string | null = null;
    for (const sub of recipients) {
      const lang = langOf(sub.lang);
      const unsub = emailActionUrl(base, "unsubscribe", sub.unsub_token);
      const mail = buildDigest(
        {
          incidents: lang === "en" ? enIncidents : koIncidents,
          quotes,
          unsubscribeUrl: unsub,
          now,
        },
        lang,
      );
      if (!mail) continue;
      const result = await sendMail(env, {
        to: sub.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        headers: {
          "List-Unsubscribe": `<${unsub}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        idempotencyKey: `straitdesk-digest-${window.dateKey}-${await emailKey(sub.email)}`,
      });
      if (result.ok) sent += 1;
      else {
        failed += 1;
        lastError = result.error ?? "send_failed";
      }
    }
    const done = failed === 0;
    await finish({
      incidents: incidentCount,
      quotes: quotes.length,
      recipients: recipients.length,
      sent,
      error: lastError,
      done,
    });
    return {
      skipped: false,
      dateKey: window.dateKey,
      incidents: incidentCount,
      quotes: quotes.length,
      recipients: recipients.length,
      sent,
      failed,
      reason: done ? "sent" : "partial",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "digest failed";
    await finish({ incidents: 0, quotes: 0, recipients: 0, sent: 0, error: message.slice(0, 300), done: false });
    return { skipped: false, reason: "error", dateKey: window.dateKey, failed: 1 };
  }
}

export async function handleEmailRequest(
  request: Request,
  env: IngestEnv,
  url: URL,
): Promise<Response | null> {
  if (!url.pathname.startsWith("/email/")) return null;

  if (url.pathname === "/email/subscribe" && request.method === "POST") {
    try {
      const body = (await request.json()) as {
        email?: unknown;
        lang?: unknown;
        company?: unknown;
        consent?: unknown;
      };
      const result = await subscribeEmail(
        env,
        {
          email: typeof body.email === "string" ? body.email : "",
          lang: langOf(body.lang),
          company: typeof body.company === "string" ? body.company : "",
          consent: body.consent === true,
        },
        request,
      );
      return json(result.body, result.status);
    } catch (error) {
      const missing = error instanceof Error && /no such table/i.test(error.message);
      return json(
        { ok: false, error: missing ? "migration_missing" : "subscribe_failed" },
        missing ? 503 : 500,
      );
    }
  }

  if (url.pathname === "/email/confirm" && request.method === "GET") {
    try {
      const result = await confirmEmail(env.DB, url.searchParams.get("token") ?? "");
      return actionResponse(request, url, result);
    } catch {
      return actionResponse(request, url, { state: "invalid", lang: "ko" });
    }
  }

  if (url.pathname === "/email/unsubscribe" && (request.method === "GET" || request.method === "POST")) {
    try {
      const result = await unsubscribeEmail(env.DB, url.searchParams.get("token") ?? "");
      return actionResponse(request, url, result);
    } catch {
      return actionResponse(request, url, { state: "invalid", lang: "ko" });
    }
  }

  if (url.pathname === "/email/digest" && request.method === "POST") {
    const header = request.headers.get("authorization") || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const secret = env.INGEST_CRON_SECRET?.trim() ?? "";
    const allowed = secret
      ? safeEqual(bearer, secret)
      : env.ALLOW_UNAUTHENTICATED_INGEST === "true";
    if (!allowed) return json({ error: "unauthorized" }, 401);
    let force = url.searchParams.get("force") === "1";
    if (!force && (request.headers.get("content-type") || "").includes("application/json")) {
      const body = (await request.json().catch(() => ({}))) as { force?: boolean };
      force = body.force === true;
    }
    try {
      const result = await runDailyEmailDigest(env, { force });
      return json({ ok: true, ...result });
    } catch (error) {
      return json(
        { ok: false, error: error instanceof Error ? error.message : "digest failed" },
        500,
      );
    }
  }

  return json({ error: "not found" }, 404);
}
