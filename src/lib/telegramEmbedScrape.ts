import fs from "fs";
import path from "path";
import type { TelegramAlert } from "@/lib/telegramAlerts";
import {
  TELEGRAM_PUBLIC_CHANNELS,
  type TelegramChannelDef,
} from "@/data/telegramChannels";

const LIVE_DIR = path.join(process.cwd(), "public", "data", "live");
const LIVE_FILE = path.join(LIVE_DIR, "telegram-alerts.json");
const STATE_FILE = path.join(LIVE_DIR, "telegram-embed-state.json");

const POSTS_PER_CHANNEL = 2;
const AHEAD_CHECK = 12;

type CachedPost = {
  text: string;
  date: string;
  mediaKind: "video" | "photo" | "none";
};

type EmbedState = {
  latestKnownIds: Record<string, number>;
  postCache: Record<string, CachedPost>;
  updatedAt: string;
};

function detectMediaKind(html: string): "video" | "photo" | "none" {
  if (
    /tgme_widget_message_video|tgme_widget_message_roundvideo|video_files|js-message_video/i.test(
      html,
    )
  ) {
    return "video";
  }
  if (
    /tgme_widget_message_photo|tgme_widget_message_photo_wrap|background-image:\s*url\(/i.test(
      html,
    )
  ) {
    return "photo";
  }
  return "none";
}

let memoryState: EmbedState | null = null;

function defaultState(): EmbedState {
  return { latestKnownIds: {}, postCache: {}, updatedAt: new Date().toISOString() };
}

function bootstrapStateFromLive(state: EmbedState) {
  if (!fs.existsSync(LIVE_FILE)) return;
  try {
    const payload = JSON.parse(fs.readFileSync(LIVE_FILE, "utf8")) as {
      alerts?: Array<{ messageUrl?: string | null }>;
    };
    for (const alert of payload.alerts ?? []) {
      const match = alert.messageUrl?.match(/t\.me\/([^/]+)\/(\d+)/i);
      if (!match) continue;
      const channel = match[1];
      const postId = Number.parseInt(match[2], 10);
      if (!Number.isFinite(postId)) continue;
      const known = state.latestKnownIds[channel] ?? 0;
      if (postId > known) state.latestKnownIds[channel] = postId;
    }
  } catch {
    /* ignore */
  }
}

function loadState(): EmbedState {
  if (memoryState) return memoryState;
  try {
    if (fs.existsSync(STATE_FILE)) {
      memoryState = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as EmbedState;
      return memoryState;
    }
  } catch {
    /* fresh */
  }
  memoryState = defaultState();
  bootstrapStateFromLive(memoryState);
  return memoryState;
}

function saveState(state: EmbedState) {
  state.updatedAt = new Date().toISOString();
  memoryState = state;
  fs.mkdirSync(LIVE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function persistAlerts(alerts: TelegramAlert[]) {
  fs.mkdirSync(LIVE_DIR, { recursive: true });
  fs.writeFileSync(
    LIVE_FILE,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        live: true,
        source: "embed",
        alerts: alerts.slice(0, 200),
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function fetchPost(
  channel: string,
  postId: number,
  state: EmbedState,
): Promise<CachedPost | null> {
  const cacheKey = `${channel}/${postId}`;
  const cached = state.postCache[cacheKey];
  if (cached && "mediaKind" in cached) return cached;

  try {
    const res = await fetch(`https://t.me/${channel}/${postId}?embed=1&mode=tme`, {
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BraveNewWorld/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!/tgme_widget_message/i.test(html)) return null;

    const mediaKind = detectMediaKind(html);
    const textMatch = html.match(
      /<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)<\/div>/s,
    );
    let text = textMatch
      ? textMatch[1]
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .replace(/[^\S\n]+/g, " ")
          .trim()
      : "";

    if (!text) {
      if (mediaKind === "none") return null;
      text =
        mediaKind === "video"
          ? "[영상] 캡션 없음 — 아래 미리보기에서 확인"
          : "[사진] 캡션 없음 — 아래 미리보기에서 확인";
    }

    const dateMatch = html.match(/<time[^>]*datetime="([^"]+)"/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString();
    const result: CachedPost = { text, date, mediaKind };
    state.postCache[cacheKey] = result;
    return result;
  } catch {
    return null;
  }
}

async function findLatestPostId(channel: string, state: EmbedState): Promise<number> {
  const known = state.latestKnownIds[channel];
  if (known) {
    const checks = Array.from({ length: AHEAD_CHECK }, (_, i) => known + AHEAD_CHECK - i);
    const results = await Promise.allSettled(
      checks.map((id) => fetchPost(channel, id, state).then((r) => (r ? id : null))),
    );
    let highest = known;
    for (const r of results) {
      if (r.status === "fulfilled" && r.value && r.value > highest) highest = r.value;
    }
    state.latestKnownIds[channel] = highest;
    return highest;
  }

  let low = 1;
  let high = 120_000;
  for (const probe of [500, 5000, 15_000, 30_000, 50_000, 80_000]) {
    if (probe >= high) break;
    const result = await fetchPost(channel, probe, state);
    if (result) low = probe;
    else {
      high = probe;
      break;
    }
  }
  while (high - low > 10) {
    const mid = Math.floor((low + high) / 2);
    const result = await fetchPost(channel, mid, state);
    if (result) low = mid;
    else high = mid;
  }
  for (let i = high; i >= low; i--) {
    const result = await fetchPost(channel, i, state);
    if (result) {
      state.latestKnownIds[channel] = i;
      return i;
    }
  }
  state.latestKnownIds[channel] = low;
  return low;
}

function toAlert(
  channel: TelegramChannelDef,
  postId: number,
  post: CachedPost,
): TelegramAlert {
  return {
    id: `embed-${channel.username}-${postId}`,
    channelUsername: channel.username,
    channelTitle: channel.label,
    region: channel.theater === "ukraine" ? "ukraine" : "middle-east",
    text: post.text.slice(0, 4096),
    receivedAt: post.date,
    messageUrl: `https://t.me/${channel.username}/${postId}`,
    mediaKind: post.mediaKind,
  };
}

export async function syncTelegramEmbedAlerts(options?: {
  theaters?: Array<"middle-east" | "ukraine">;
  channelLimit?: number;
}): Promise<{ alerts: TelegramAlert[]; channelCount: number }> {
  const state = loadState();
  let channels = TELEGRAM_PUBLIC_CHANNELS;
  if (options?.theaters?.length) {
    const allowed = new Set(options.theaters);
    channels = channels.filter((c) => allowed.has(c.theater));
  }
  if (options?.channelLimit && options.channelLimit > 0) {
    channels = channels.slice(0, options.channelLimit);
  }

  const allAlerts: TelegramAlert[] = [];

  const batchSize = 8;
  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (channel) => {
        const latestId = await findLatestPostId(channel.username, state);
        const ids = Array.from(
          { length: POSTS_PER_CHANNEL },
          (_, j) => latestId - j,
        ).filter((id) => id > 0);
        const posts: TelegramAlert[] = [];
        for (const id of ids) {
          const post = await fetchPost(channel.username, id, state);
          if (post) posts.push(toAlert(channel, id, post));
        }
        return posts;
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") allAlerts.push(...r.value);
    }
  }

  allAlerts.sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );

  const trimmed = allAlerts.slice(0, 200);
  saveState(state);
  persistAlerts(trimmed);

  return { alerts: trimmed, channelCount: channels.length };
}

export function isTelegramEmbedEnabled(): boolean {
  const flag = process.env.TELEGRAM_USE_EMBED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}
