"use client";

import { useEffect, useState } from "react";
import type { AxisArmsPayload } from "@/lib/axisArmsPaths";

/**
 * 허브 하나의 SIPRI 무기이전 기록. 정적 JSON이 아니라 `/api/sipri/arms?hub=`에서 허브 단위로만 받는다
 * (SIPRI 승인 조건: 유저가 원본 데이터를 통째로 내려받지 못해야 한다).
 */
export function useSipriHubArms(hub: string | null | undefined, enabled: boolean) {
  const [data, setData] = useState<AxisArmsPayload | null>(null);

  useEffect(() => {
    if (!enabled || !hub) return;
    let alive = true;
    void fetch(`/api/sipri/arms?hub=${encodeURIComponent(hub)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json) => {
        if (alive) setData({ source: "SIPRI Arms Transfers Database", ...json } as AxisArmsPayload);
      })
      .catch(() => {
        if (alive) setData(null);
      });
    return () => {
      alive = false;
    };
  }, [hub, enabled]);

  return { data };
}
