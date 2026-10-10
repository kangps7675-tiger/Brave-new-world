/**
 * LiveUA 핀의 원래 출처 판정.
 *
 * LiveUA는 매체가 아니라 여러 출처를 담는 그릇이다. 같은 핀이라도 원문이 로이터면
 * 1등급 기사와 같은 무게이고, 익명 텔레그램이면 확인 전 제보다. 그래서 등급은
 * "Liveuamap" 이름이 아니라 핀에 달린 원문 링크·출처명으로 매긴다.
 * LiveUA가 찍은 좌표는 위치 근거일 뿐, 사건을 한 번 더 확인해 주는 출처가 아니다.
 */

import { uniqueSourceKey } from "@/lib/conflictEvents/confidence";
import { classifyMediaTier, extractHostname } from "@/lib/news/mediaTiers";
import type { MediaTrustTier } from "@/lib/news/types";

export type LiveuaOrigin =
  | { kind: "media"; tier: MediaTrustTier; sourceKey: string; label: string }
  | { kind: "social"; sourceKey: string; label: string }
  | { kind: "none"; sourceKey: string; label: string };

const LIVEUA_HOST_RE = /(?:^|\.)liveuamap\.com$/i;

const SOCIAL_HOST_RE =
  /(?:^|\.)(?:t\.me|telegram\.(?:me|org)|twitter\.com|x\.com|facebook\.com|fb\.watch|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|vk\.com|threads\.net|bsky\.app)$/i;

const SOCIAL_NAME_RE = /\b(telegram|twitter|tweet|instagram|facebook|tiktok|youtube|vk)\b|^@|텔레그램/i;

export function classifyLiveuaOrigin(input: {
  sourceUrl?: string | null;
  viaSource?: string | null;
}): LiveuaOrigin {
  const url = input.sourceUrl?.trim() || "";
  const via = input.viaSource?.trim() || "";
  const host = extractHostname(url).toLowerCase();

  if (!host || LIVEUA_HOST_RE.test(host)) {
    if (via && !SOCIAL_NAME_RE.test(via)) {
      // 링크는 LiveUA 자체지만 출처명이 매체로 적힌 경우 — 이름으로만 판정
      return {
        kind: "media",
        tier: classifyMediaTier(via, ""),
        sourceKey: uniqueSourceKey(via, null),
        label: via,
      };
    }
    if (via) {
      return { kind: "social", sourceKey: uniqueSourceKey(via, null), label: via };
    }
    return { kind: "none", sourceKey: "liveuamap.com", label: "Liveuamap" };
  }

  if (SOCIAL_HOST_RE.test(host)) {
    // 채널이 다르면 다른 제보자 — 호스트만 쓰면 t.me 전체가 출처 하나로 뭉친다
    return {
      kind: "social",
      sourceKey: socialChannelKey(url, host),
      label: via || host,
    };
  }

  return {
    kind: "media",
    tier: classifyMediaTier(via, url),
    sourceKey: uniqueSourceKey(via, url),
    label: via || host,
  };
}

function socialChannelKey(url: string, host: string): string {
  try {
    const first = new URL(url).pathname.split("/").filter(Boolean)[0];
    return first ? `${host}/${first.toLowerCase()}` : host;
  } catch {
    return host;
  }
}
