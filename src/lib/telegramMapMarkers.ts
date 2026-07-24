/**
 * 텔레그램 속보 → 지명 매칭 시 흰 네온 점 (지도 태그).
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
};

const MAX_TELEGRAM_DOTS = 36;

export function buildTelegramMapDots(alerts: TelegramAlert[]): TelegramMapDot[] {
  const out: TelegramMapDot[] = [];
  const seenPlace = new Set<string>();

  for (const alert of alerts) {
    if (out.length >= MAX_TELEGRAM_DOTS) break;
    const hit = resolveTelegramPlace(alert.text, alert.region);
    if (!hit) continue;
    const key = hit.label.toLowerCase();
    if (seenPlace.has(key)) continue;
    seenPlace.add(key);

    out.push({
      markerId: `tg-neon-${alert.id}`,
      displayKind: "telegram-neon",
      id: alert.id,
      lat: hit.lat,
      lng: hit.lng,
      label: hit.label,
      title: alert.text.slice(0, 120),
      accent: "white" as const,
      intensity: 0.85,
    });
  }

  return out;
}
