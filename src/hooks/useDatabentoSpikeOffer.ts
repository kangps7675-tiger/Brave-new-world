"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emitTickerTelegraphSound } from "@/components/SoundEffectsBridge";
import type { SpikeTelegraphBannerOffer } from "@/components/SpikeTelegraphBanner";
import { FUTURES_LIVE_CHANGE_WINDOW_SEC, FUTURES_LIVE_POLL_MS } from "@/lib/databento/futuresLiveConstants";
import {
  evaluateSpikeTelegraphFire,
  pickFuturesLiveSpikeLeader,
  type SpikeArmState,
} from "@/lib/tickerSpikeTelegraph";

const AUTO_DISMISS_MS = 10_000;

type FuturesLiveResponse = {
  tickers?: Array<{
    symbol: string;
    changePercent: number | null;
    changeWindowSec?: number;
    asOf?: string | null;
  }>;
  available?: boolean;
};

/**
 * Databento ohlcv-1s 기반 선물 SPIKE 감지.
 * `/api/stock-tickers/futures-live` 를 ~1s 폴링. 일봉 티커 스트립과 분리.
 */
export function useDatabentoSpikeOffer(enabled: boolean): {
  offer: SpikeTelegraphBannerOffer | null;
  dismiss: () => void;
} {
  const [tickers, setTickers] = useState<
    Array<{ symbol: string; changePercent: number | null }> | null
  >(null);
  const [offer, setOffer] = useState<SpikeTelegraphBannerOffer | null>(null);
  const armRef = useRef<SpikeArmState>({ armed: false, lastFiredAt: 0 });
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const refresh = useCallback(async () => {
    if (!enabledRef.current) return;
    try {
      const res = await fetch("/api/stock-tickers/futures-live", {
        cache: "no-store",
      });
      const payload = (await res.json()) as FuturesLiveResponse;
      if (!res.ok || payload.available === false) return;
      if (Array.isArray(payload.tickers) && payload.tickers.length > 0) {
        setTickers(
          payload.tickers.map((t) => ({
            symbol: t.symbol,
            changePercent: t.changePercent,
          })),
        );
      }
    } catch {
      /* keep last */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), FUTURES_LIVE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) {
      setOffer(null);
      return;
    }
    if (!tickers?.length) return;
    const leader = pickFuturesLiveSpikeLeader(tickers);
    const result = evaluateSpikeTelegraphFire(leader != null, armRef.current, Date.now());
    armRef.current = result.next;
    if (!result.fire || !leader) return;
    emitTickerTelegraphSound(leader.direction);
    setOffer({
      symbol: leader.symbol,
      changePercent: leader.changePercent,
      direction: leader.direction,
      atMs: Date.now(),
      changeWindowSec: FUTURES_LIVE_CHANGE_WINDOW_SEC,
    });
  }, [tickers, enabled]);

  useEffect(() => {
    if (!offer) return;
    const id = window.setTimeout(() => setOffer(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [offer]);

  const dismiss = useCallback(() => {
    setOffer(null);
  }, []);

  return { offer, dismiss };
}
