"use client";

import { useEffect, useState } from "react";
import {
  getWorldTensionEntry,
  refreshWorldTension,
  subscribeWorldTension,
  type WorldTensionEntry,
} from "@/lib/worldTensionStore";

const REFRESH_MS = 60_000;

/**
 * GTI(세계 긴장지수) 단일 소스 훅.
 * 여러 컴포넌트가 이 훅을 쓰면 항상 같은 스냅샷을 동시에 본다 —
 * 화면마다 독립적으로 fetch해서 생기던 수치 불일치(2026-08-30 리포트
 * 1번 항목)를 없앤다. `date`를 주면 과거 스크럽 조회, 생략하면 오늘.
 */
export function useWorldTensionSnapshot(
  date?: string | null,
): WorldTensionEntry & { isEstimate: boolean } {
  const [entry, setEntry] = useState<WorldTensionEntry>(() => getWorldTensionEntry(date));

  useEffect(() => {
    setEntry(getWorldTensionEntry(date));
    const unsubscribe = subscribeWorldTension(date, setEntry);
    void refreshWorldTension(date);
    const interval = window.setInterval(() => {
      void refreshWorldTension(date);
    }, REFRESH_MS);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [date]);

  return {
    ...entry,
    isEstimate: entry.snapshot?.method === "theater-blend-fallback",
  };
}
