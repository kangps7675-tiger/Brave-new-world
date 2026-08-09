import type { TelegramAlertRow } from "./env";
import {
  WORKER_TELEGRAM_CHANNELS,
  regionForTheater,
  type WorkerTelegramChannel,
} from "./telegramChannels";

/**
 * t.me 공개 채널 미리보기(`/s/<channel>`)를 긁어 최신 속보를 만든다.
 * embed 단건(`?embed=1`) 대비 최신 N개를 한 번에 받아 stateless·CPU 효율적.
 */

const PREVIEW_BASE = "https://t.me/s/";
const POSTS_PER_CHANNEL = 3;
const FETCH_BATCH = 10;
const FETCH_TIMEOUT_MS = 6000;

/**
 * 봇 신원 — **브라우저로 위장하지 말 것.**
 * 이전 값: `Mozilla/5.0 (compatible; BraveNewWorld/1.0; +https://t.me)`
 * (연락처가 t.me 로 돼 있어 사실상 신원 미표시이기도 했다.)
 *
 * @see docs/copyright-audit-2026-08-01.md — R-2
 */
const TELEGRAM_SCRAPE_USER_AGENT =
  "ConflictViewBot/1.0 (+https://github.com/kangps7675-tiger/Brave-new-world)";
const MAX_TEXT = 4096;

type ParsedPost = {
  postId: number;
  text: string;
  date: string;
  mediaKind: "video" | "photo" | "none";
};

function detectMediaKind(block: string): "video" | "photo" | "none" {
  if (
    /tgme_widget_message_video|tgme_widget_message_roundvideo|video_files|js-message_video/i.test(
      block,
    )
  ) {
    return "video";
  }
  if (
    /tgme_widget_message_photo|tgme_widget_message_photo_wrap|background-image:\s*url\(/i.test(
      block,
    )
  ) {
    return "photo";
  }
  return "none";
}

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&(?:rlm|lrm|zwj|zwnj);/gi, "")
    .replace(/&hellip;/gi, "…")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => codePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => codePoint(Number.parseInt(d, 10)));
}

function codePoint(n: number): string {
  if (!Number.isFinite(n) || n <= 0 || n > 0x10ffff) return "";
  try {
    return String.fromCodePoint(n);
  } catch {
    return "";
  }
}

function stripHtml(raw: string): string {
  return decodeEntities(
    raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

/** 미리보기 HTML을 message wrapper 단위로 쪼개 post별 text/date를 뽑는다. */
function parsePreview(html: string, username: string): ParsedPost[] {
  const posts: ParsedPost[] = [];
  const blocks = html.split('class="tgme_widget_message_wrap');
  const userLc = username.toLowerCase();

  for (const block of blocks) {
    const idMatch = block.match(/data-post="([^"/]+)\/(\d+)"/);
    if (!idMatch) continue;
    if (idMatch[1].toLowerCase() !== userLc) continue;
    const postId = Number.parseInt(idMatch[2], 10);
    if (!Number.isFinite(postId)) continue;

    const mediaKind = detectMediaKind(block);
    const textMatch = block.match(
      /<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)<\/div>/s,
    );
    let text = textMatch ? stripHtml(textMatch[1].replace(/<br\s*\/?>/gi, "\n")) : "";
    if (!text) {
      if (mediaKind === "none") continue;
      text =
        mediaKind === "video"
          ? "[영상] 캡션 없음 — 원문에서 확인"
          : "[사진] 캡션 없음 — 원문에서 확인";
    }

    const dateMatch = block.match(/<time[^>]*datetime="([^"]+)"/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString();

    posts.push({ postId, text: text.slice(0, MAX_TEXT), date, mediaKind });
  }

  // 최신 postId 우선
  posts.sort((a, b) => b.postId - a.postId);
  return posts.slice(0, POSTS_PER_CHANNEL);
}

async function fetchChannel(
  channel: WorkerTelegramChannel,
): Promise<TelegramAlertRow[]> {
  try {
    const res = await fetch(`${PREVIEW_BASE}${channel.username}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        // 브라우저 UA 위장 금지 — @see docs/copyright-audit-2026-08-01.md R-2
        "User-Agent": TELEGRAM_SCRAPE_USER_AGENT,
        "Accept-Language": "en,ru,uk,fa",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const posts = parsePreview(html, channel.username);
    const region = regionForTheater(channel.theater);
    return posts.map((post) => ({
      id: `${channel.username}/${post.postId}`,
      channel_username: channel.username,
      channel_title: channel.label,
      region,
      text: post.text,
      message_url: `https://t.me/${channel.username}/${post.postId}`,
      received_at: post.date,
    }));
  } catch {
    return [];
  }
}

export async function fetchTelegramAlerts(options?: {
  maxAlerts?: number;
  /** Cron 서브요청 한도 — 채널 수 상한 (기본 35) */
  maxChannels?: number;
}): Promise<{ alerts: TelegramAlertRow[]; channelCount: number; errors: string[] }> {
  const errors: string[] = [];
  const channelCap = options?.maxChannels && options.maxChannels > 0 ? options.maxChannels : 35;
  const channels = WORKER_TELEGRAM_CHANNELS.slice(0, channelCap);
  const collected: TelegramAlertRow[] = [];

  for (let i = 0; i < channels.length; i += FETCH_BATCH) {
    const batch = channels.slice(i, i + FETCH_BATCH);
    const results = await Promise.allSettled(batch.map((c) => fetchChannel(c)));
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        collected.push(...r.value);
      } else {
        errors.push(`${batch[idx].username}: ${String(r.reason).slice(0, 80)}`);
      }
    });
  }

  collected.sort(
    (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime(),
  );

  const max = Math.min(400, Math.max(50, options?.maxAlerts ?? 200));
  return {
    alerts: collected.slice(0, max),
    channelCount: channels.length,
    errors,
  };
}
