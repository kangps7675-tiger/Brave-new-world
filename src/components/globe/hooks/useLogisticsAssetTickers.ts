"use client";

import { useEffect, useState } from "react";
import { liveTickerPollMs } from "@/lib/liveRenderGuard";
import type { StockTickerItem } from "@/lib/stockTickers";

type StockTickersResponse = { tickers?: StockTickerItem[] };

/**
 * 초크포인트 C급(대리지표) 계산용 — 선물·지수 등락률 스냅샷을 폴링해 심볼→등락률(%) 맵으로 제공.
 * 어떤 심볼을 쓸지는 호출 쪽(`assetVolatilityHintForPoint`)이 초크포인트별 relatedTickers로 결정한다 —
 * 이 훅은 원재료(전체 티커 스냅샷)만 쥐고 있는다. 레이어 꺼져있으면 폴링하지 않는다.
 */
export function useLogisticsAssetTickers(enabled: boolean): Map<string, number | null> {
  const [snapshot, setSnapshot] = useState<Map<string, number | null>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await fetch("/api/stock-tickers", { cache: "no-store" });
        const payload = (await res.json()) as StockTickersResponse;
        if (cancelled || !Array.isArray(payload.tickers)) return;
        setSnapshot(new Map(payload.tickers.map((t) => [t.symbol, t.changePercent])));
      } catch {
        // 실패 시 마지막 스냅샷 유지 — 스트레스 카드에서 신호를 잃지 않게 함
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), liveTickerPollMs());
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  return snapshot;
}
