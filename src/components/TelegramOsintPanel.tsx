"use client";

import {
  TelegramIntelFeed,
  type TelegramFlyPlace,
} from "@/components/TelegramIntelFeed";
import {
  TELEGRAM_CHANNEL_COUNT,
  type TelegramAlert,
} from "@/lib/telegramAlerts";

type TelegramOsintPanelProps = {
  alerts: TelegramAlert[];
  liveStatus: "idle" | "loading" | "ok" | "error" | "stub" | "waiting";
  live: boolean;
  needsAuth?: boolean;
  sessionExists?: boolean;
  embedMode?: boolean;
  channelCount?: number;
  onClose: () => void;
  compactUi?: boolean;
  onFlyToPlace?: (place: TelegramFlyPlace) => void;
};

export function TelegramOsintPanel({
  alerts,
  liveStatus,
  live,
  needsAuth,
  sessionExists,
  embedMode = true,
  channelCount = TELEGRAM_CHANNEL_COUNT,
  onClose,
  compactUi = false,
  onFlyToPlace,
}: TelegramOsintPanelProps) {
  return (
    <div
      className={`pointer-events-auto absolute z-[120] ${
        compactUi
          ? "bottom-[calc(var(--bottom-intel-stack-clearance)+0.5rem+env(safe-area-inset-bottom,0px))] left-3 w-[min(calc(100vw-1.5rem),320px)]"
          : "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-4 w-[min(88vw,280px)]"
      }`}
    >
      <TelegramIntelFeed
        alerts={alerts}
        live={live}
        liveStatus={liveStatus}
        needsAuth={needsAuth}
        sessionExists={sessionExists}
        embedMode={embedMode}
        channelCount={channelCount}
        onClose={onClose}
        compactUi={compactUi}
        onFlyToPlace={onFlyToPlace}
      />
    </div>
  );
}
