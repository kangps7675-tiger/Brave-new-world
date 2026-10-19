/**
 * 텔레그램 영상 임베드 — 영상을 내려받아 다시 올리지 않고, 텔레그램 공식 게시물 임베드(iframe)로 보여 준다.
 * 영상은 텔레그램 서버에서 재생되고 채널명·원문 링크가 그대로 남는다. 워커 안에서도 쓰므로 앱 별칭(@/)을 import하지 않는다.
 */

const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;

export type TelegramVideoPost = {
  id: string;
  channel: string;
  postId: number;
  channelTitle: string | null;
  region: string;
  caption: string;
  receivedAt: string;
  messageUrl: string;
};

/** "channel/12345" → { channel, postId }. 형식이 다르면 null (임의 URL이 iframe에 들어가지 않게 한다). */
export function parseTelegramPostKey(id: string): { channel: string; postId: number } | null {
  const m = /^([^/]+)\/(\d{1,12})$/.exec(id.trim());
  if (!m || !USERNAME_RE.test(m[1]!)) return null;
  const postId = Number(m[2]);
  return Number.isSafeInteger(postId) && postId > 0 ? { channel: m[1]!, postId } : null;
}

/** 공식 임베드 주소. 채널명·게시물 번호 형식을 지킬 때만 만든다. */
export function telegramEmbedUrl(channel: string, postId: number): string | null {
  if (!USERNAME_RE.test(channel) || !Number.isSafeInteger(postId) || postId <= 0) return null;
  return `https://t.me/${channel}/${postId}?embed=1&mode=tme`;
}

/** 캡션 자리표시("[영상] 캡션 없음…")는 비우고, 길면 줄인다. */
export function videoCaption(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || /^\[(?:영상|사진)\]\s*캡션 없음/.test(t)) return "";
  return t.length <= max ? t : `${t.slice(0, max).trimEnd()}…`;
}
