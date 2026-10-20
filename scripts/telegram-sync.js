#!/usr/bin/env node
/**
 * Trigger public Telegram embed sync against a running Next.js dev server.
 * Usage: npm run telegram:sync
 *        TELEGRAM_SYNC_URL=http://127.0.0.1:3005 npm run telegram:sync
 */

const base =
  process.env.TELEGRAM_SYNC_URL?.replace(/\/$/, "") ||
  `http://127.0.0.1:${process.env.PORT || 3000}`;

const limit = process.env.TELEGRAM_SYNC_LIMIT;
const url = new URL(`${base}/api/telegram-alerts/sync`);
if (limit) url.searchParams.set("limit", limit);

async function main() {
  console.log(`[telegram:sync] POST ${url.toString()}`);
  const res = await fetch(url, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[telegram:sync] failed", res.status, body);
    process.exit(1);
  }
  console.log(
    `[telegram:sync] ok — ${body.alertCount ?? 0} alerts from ${body.channelCount ?? "?"} channels`,
  );
}

main().catch((err) => {
  console.error("[telegram:sync] error", err.message || err);
  process.exit(1);
});
