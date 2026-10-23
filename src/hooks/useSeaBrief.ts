"use client";

import { useEffect, useState } from "react";
import { computeSeaBrief, type SeaBrief, type SeaIncident, type SeaQuote, type SeaRegion, type SeaWx } from "@/lib/seaBrief";

type State = { loading: boolean; brief: SeaBrief | null };

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** 해역 하나의 판단 카드 재료를 모아 계산한다 (UKMTO·보험료·파고). 열려 있는 동안 5분마다 갱신. */
export function useSeaBrief(region: SeaRegion, enabled: boolean): State {
  const [state, setState] = useState<State>({ loading: true, brief: null });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const run = async () => {
      const [ukmto, risk, wx] = await Promise.all([
        getJson<{ incidents: SeaIncident[] }>("/api/ukmto"),
        getJson<{ quotes: SeaQuote[] }>(`/api/war-risk?region=${region}&days=90`),
        getJson<{ now: (SeaWx & Record<string, unknown>) | null }>(`/api/sea-weather?region=${region}`),
      ]);
      if (!alive) return;
      setState({
        loading: false,
        brief: computeSeaBrief(region, {
          incidents: ukmto?.incidents ?? [],
          quotes: risk?.quotes ?? [],
          weather: wx?.now ? { waveHeightM: wx.now.waveHeightM ?? null, windKmh: wx.now.windKmh ?? null, at: wx.now.at ?? null } : null,
        }),
      });
    };
    setState((s) => ({ ...s, loading: true }));
    void run();
    const t = window.setInterval(run, 5 * 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [region, enabled]);
  return state;
}
