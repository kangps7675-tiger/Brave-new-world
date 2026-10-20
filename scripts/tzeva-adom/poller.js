/**
 * Pikud HaOref Tzeva Adom poller — Java Tzeva-Adom-API 와 동일한 History 엔드포인트 폴링
 * Usage: npm run tzeva-adom:poll
 *
 * 해외 IP에서는 OREF_HISTORY_URL / OREF_ACTIVE_URL 로 프록시 지정 (예: Oref-Alert-Proxy)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const LIVE_DIR = path.join(ROOT, "public", "data", "live");
const LIVE_FILE = path.join(LIVE_DIR, "tzeva-adom.json");

const HISTORY_URL =
  process.env.OREF_HISTORY_URL ||
  "https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json";
const ACTIVE_URL =
  process.env.OREF_ACTIVE_URL ||
  "https://www.oref.org.il/WarningMessages/alert/alerts.json";
const POLL_MS = Number.parseInt(process.env.TZEVA_ADOM_POLL_MS || "3000", 10);
const MAX_HISTORY = 120;

const HEADERS = {
  Referer: "https://www.oref.org.il/",
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

let lastSeenId = null;
let history = [];

function alertId(region, alertDate, title) {
  return `${alertDate}|${region}|${title}`.replace(/\s+/g, " ").trim();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) return { text: "", status: res.status };
  return { text: await res.text(), status: res.status };
}

function parseHistory(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const region = typeof item.data === "string" ? item.data.trim() : "";
        const title = typeof item.title === "string" ? item.title.trim() : "";
        const alertDate = typeof item.alertDate === "string" ? item.alertDate.trim() : "";
        if (!region || !alertDate) return null;
        return {
          id: alertId(region, alertDate, title),
          region,
          title: title || "צבע אדום",
          alertDate,
          category: item.cat != null ? Number(item.cat) : undefined,
          active: false,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseActive(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return [];
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const out = [];
    for (const item of parsed) {
      const title = typeof item.title === "string" ? item.title.trim() : "ירי רקטות וטילים";
      const regions = Array.isArray(item.data)
        ? item.data
        : typeof item.data === "string"
          ? [item.data]
          : [];
      for (const region of regions) {
        if (typeof region !== "string" || !region.trim()) continue;
        const trimmedRegion = region.trim();
        out.push({
          id: alertId(trimmedRegion, now, title),
          region: trimmedRegion,
          title,
          alertDate: now,
          category: item.cat != null ? Number(item.cat) : undefined,
          active: true,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function persist(active, mergedHistory) {
  if (!fs.existsSync(LIVE_DIR)) fs.mkdirSync(LIVE_DIR, { recursive: true });
  const payload = {
    fetchedAt: new Date().toISOString(),
    live: true,
    active,
    history: mergedHistory.slice(0, MAX_HISTORY),
  };
  fs.writeFileSync(LIVE_FILE, JSON.stringify(payload, null, 2), "utf8");
}

async function poll() {
  try {
    const [historyRes, activeRes] = await Promise.all([
      fetchText(HISTORY_URL),
      fetchText(ACTIVE_URL),
    ]);

    if (historyRes.status === 403 || activeRes.status === 403) {
      console.warn("[tzeva-adom] Geo-restricted — set OREF_HISTORY_URL to an Israeli proxy");
    }

    const historyItems = parseHistory(historyRes.text);
    const active = parseActive(activeRes.text);

    if (historyItems.length > 0) {
      const newest = historyItems[0];
      if (newest && newest.id !== lastSeenId) {
        if (lastSeenId) {
          const fresh = [];
          for (const item of historyItems) {
            if (item.id === lastSeenId) break;
            fresh.push(item);
          }
          if (fresh.length > 0) {
            console.log(`[tzeva-adom] NEW: ${fresh[0].region} — ${fresh[0].title}`);
          }
        }
        lastSeenId = newest.id;
      }
      history = historyItems;
    }

    const activeIds = new Set(active.map((a) => a.id));
    const merged = history.map((h) => (activeIds.has(h.id) ? { ...h, active: true } : h));
    persist(active, merged.length > 0 ? merged : active);
  } catch (error) {
    console.warn("[tzeva-adom] poll error:", error instanceof Error ? error.message : error);
  }

  setTimeout(poll, POLL_MS);
}

console.log(`[tzeva-adom] polling every ${POLL_MS}ms`);
console.log(`[tzeva-adom] history: ${HISTORY_URL}`);
void poll();
