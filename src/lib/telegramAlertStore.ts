import type { TelegramAlert } from "@/lib/telegramAlerts";

const MAX_ALERTS = 200;
let alerts: TelegramAlert[] = [];
let lastIngestAt: string | null = null;

export function getTelegramAlertStore() {
  return { alerts, lastIngestAt };
}

export function pushTelegramAlert(alert: TelegramAlert) {
  alerts = [alert, ...alerts.filter((item) => item.id !== alert.id)].slice(0, MAX_ALERTS);
  lastIngestAt = new Date().toISOString();
}

export function hydrateTelegramAlerts(next: TelegramAlert[]) {
  if (alerts.length === 0 && next.length > 0) {
    alerts = next.slice(0, MAX_ALERTS);
  }
}

/** live JSON 파일·ingest와 동기화 (폴링 시 최신 목록 반영) */
export function replaceTelegramAlerts(next: TelegramAlert[], fetchedAt?: string | null) {
  if (next.length === 0) return;
  alerts = next.slice(0, MAX_ALERTS);
  lastIngestAt = fetchedAt ?? new Date().toISOString();
}
