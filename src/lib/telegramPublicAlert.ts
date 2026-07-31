/**
 * 텔레그램 공개 페이로드 — 게시물 전문은 클라이언트로 나가지 않는다.
 * 공개로는 약 절반 스니펫만. 나머지는 t.me CTA. 지명 매칭은 서버에서.
 */

import type { TelegramAlert } from "@/lib/telegramAlerts";
import { resolveTelegramPlace } from "@/lib/telegramPlaceMatch";

/** 공개 스니펫 상한 (아주 긴 글의 절반도 이 이상 안 나감) */
export const TELEGRAM_SNIPPET_MAX_CHARS = 280;

/**
 * 원문의 약 절반만 반환. 짧은 글도 절반. 단어/줄 경계에서 끊고 … 붙임.
 */
export function halfTelegramSnippet(full: string): string {
  const t = full.replace(/\r\n/g, "\n").trim();
  if (!t) return "";
  if (t.length <= 1) return `${t}…`;

  const half = Math.ceil(t.length / 2);
  const target = Math.min(half, TELEGRAM_SNIPPET_MAX_CHARS);
  let cut = t.slice(0, target);

  if (target >= 4) {
    const breakAt = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(" "), cut.lastIndexOf("\t"));
    if (breakAt >= Math.floor(target * 0.55)) {
      cut = cut.slice(0, breakAt);
    }
  }

  cut = cut.trimEnd();
  if (!cut || cut.length >= t.length) {
    cut = t.slice(0, Math.max(1, Math.ceil(t.length / 2))).trimEnd();
  }
  return `${cut}…`;
}

export type TelegramPublicAlert = TelegramAlert & {
  /** true면 text 는 절반 스니펫 (전문 아님) */
  textTruncated?: boolean;
};

/** 내부 저장용 알림 → 공개 응답 (절반 스니펫 · 지명 힌트) */
export function toPublicTelegramAlert(alert: TelegramAlert): TelegramPublicAlert {
  // 워커 등에서 이미 공개 스니펫이면 재절단하지 않음
  if (alert.textTruncated) {
    return {
      id: alert.id,
      channelUsername: alert.channelUsername,
      channelTitle: alert.channelTitle,
      region: alert.region,
      text: alert.text ?? "",
      receivedAt: alert.receivedAt,
      messageUrl: alert.messageUrl ?? null,
      mediaKind: alert.mediaKind ?? null,
      placeLabel: alert.placeLabel ?? null,
      placeLat: alert.placeLat ?? null,
      placeLng: alert.placeLng ?? null,
      textTruncated: true,
    };
  }

  const full = alert.text ?? "";
  const hit = full.trim() ? resolveTelegramPlace(full, alert.region) : null;
  const snippet = halfTelegramSnippet(full);
  const truncated = Boolean(full.trim());

  return {
    id: alert.id,
    channelUsername: alert.channelUsername,
    channelTitle: alert.channelTitle,
    region: alert.region,
    text: snippet,
    receivedAt: alert.receivedAt,
    messageUrl: alert.messageUrl ?? null,
    mediaKind: alert.mediaKind ?? null,
    placeLabel: hit?.label ?? null,
    placeLat: hit?.lat ?? null,
    placeLng: hit?.lng ?? null,
    textTruncated: truncated || undefined,
  };
}

export function toPublicTelegramAlerts(alerts: TelegramAlert[]): TelegramPublicAlert[] {
  return alerts.map(toPublicTelegramAlert);
}

export function telegramPostUrl(alert: Pick<TelegramAlert, "messageUrl" | "channelUsername">): string | null {
  if (alert.messageUrl) return alert.messageUrl;
  const user = alert.channelUsername?.replace(/^@/, "").trim();
  if (!user) return null;
  return `https://t.me/${user}`;
}
