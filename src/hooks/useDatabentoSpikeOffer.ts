"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emitTickerTelegraphSound } from "@/components/SoundEffectsBridge";
import type { SpikeTelegraphBannerOffer } from "@/components/SpikeTelegraphBanner";
import { liveTickerPollMs } from "@/lib/liveRenderGuard";
import {
  evaluateSpikeTelegraphFire,
  pickDatabentoSpikeLeader,
  type SpikeArmState,
} from "@/lib/tickerSpikeTelegraph";
import type { StockTickerItem } from "@/lib/stockTickers";

const AUTO_DISMISS_MS = 10_000;

type StockTickersResponse = {
  tickers?: StockTickerItem[];
};

/**
 * 독 접힘과 무관하게 Databento 선물 SPIKE를 감지한다.
 * 발화 시 전보음 + 상단 배너 오퍼. 재진입 arm·쿨다운은 tickerSpikeTelegraph SSOT.
 */
export function useDatabentoSpikeOffer(enabled: boolean): {
  offer: SpikeTelegraphBannerOffer | null;
  dismiss: () => void;
} {
  const [tickers, setTickers] = useState<StockTickerItem[] | null>(null);
  const [offer, setOffer] = useState<SpikeTelegraphBannerOffer | null>(null);
  const armRef = useRef<SpikeArmState>({ armed: false, lastFiredAt: 0 });
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const refresh = useCallback(async () => {
    if (!enabledRef.current) return;
    try {
      const res = await fetch("/api/stock-tickers", { cache: "no-store" });
      const payload = (await res.json()) as StockTickersResponse;
      if (res.ok && Array.isArray(payload.tickers) && payload.tickers.length > 0) {
        setTickers(payload.tickers);
      }
    } catch {
      /* keep last */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), liveTickerPollMs());
    return () => window.clearInterval(timer);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) {
      setOffer(null);
      return;
    }
    if (!tickers?.length) return;
    const leader = pickDatabentoSpikeLeader(tickers);
    const result = evaluateSpikeTelegraphFire(leader != null, armRef.current, Date.now());
    armRef.current = result.next;
    if (!result.fire || !leader) return;
    emitTickerTelegraphSound(leader.direction);
    setOffer({
      symbol: leader.symbol,
      changePercent: leader.changePercent,
      direction: leader.direction,
      atMs: Date.now(),
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
