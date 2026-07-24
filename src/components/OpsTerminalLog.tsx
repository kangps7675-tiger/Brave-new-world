"use client";

import { useEffect, useState } from "react";
import { pushAmbientOpsLog, subscribeOpsLog } from "@/lib/opsTerminalLog";

/**
 * 우측 하단 드라이 시스템 로그 — 연출용.
 * 실제 인텔 해킹이 아니라 페치/크론 감각의 스모크.
 */
export function OpsTerminalLog({ active = true }: { active?: boolean }) {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!active) return;
    return subscribeOpsLog(setLines);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    pushAmbientOpsLog();
    const id = window.setInterval(() => {
      pushAmbientOpsLog();
    }, 14_000);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active || lines.length === 0) return null;

  return (
    <div className="ops-terminal-log" aria-hidden>
      {lines.map((line) => (
        <div key={line} className="ops-terminal-log__line">
          {line}
        </div>
      ))}
    </div>
  );
}
