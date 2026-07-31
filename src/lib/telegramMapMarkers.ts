/**
 * 텔레그램 속보 → 지명 매칭 시 흰 네온 점 (지도 태그).
 * 공개 페이로드는 전문 없이 placeLabel/좌표만 올 수 있음.
 */

import type { TelegramAlert } from "@/lib/telegramAlerts";
import { resolveTelegramPlace } from "@/lib/telegramPlaceMatch";

export type TelegramMapDot = {
  markerId: string;
  displayKind: "telegram-neon";
  id: string;
  lat: number;
  lng: number;
  label: string;
  title: string;
  accent: "white";
  intensity: number;
  evidenceTier: "unverified";
};

const MAX_TELEGRAM_DOTS = 36;

export function buildTelegramMapDots(alerts: TelegramAlert[]): TelegramMapDot[] {
  const out: TelegramMapDot[] = [];
  const seenPlace = new Set<string>();

  for (const alert of alerts) {
    if (out.length >= MAX_TELEGRAM_DOTS) break;

    let label: string | null = null;
    let lat: number | null = null;
    let lng: number | null = null;

    if (
      alert.placeLabel &&
      typeof alert.placeLat === "number" &&
      typeof alert.placeLng === "number"
    ) {
      label = alert.placeLabel;
      lat = alert.placeLat;
      lng = alert.placeLng;
    } else if (alert.text?.trim()) {
      const hit = resolveTelegramPlace(alert.text, alert.region);
      if (hit) {
        label = hit.label;
        lat = hit.lat;
        lng = hit.lng;
      }
    }

    if (!label || lat == null || lng == null) continue;
    const key = label.toLowerCase();
    if (seenPlace.has(key)) continue;
    seenPlace.add(key);

    out.push({
      markerId: `tg-neon-${alert.id}`,
      displayKind: "telegram-neon",
      id: alert.id,
      lat,
      lng,
      label,
      title: `@${alert.channelUsername} · ${label}`,
      accent: "white" as const,
      intensity: 0.85,
      evidenceTier: "unverified",
    });
  }

  return out;
}
