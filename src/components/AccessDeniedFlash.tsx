"use client";

import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type AccessDeniedFlashProps = {
  open: boolean;
  lang: "ko" | "en";
  onDone: () => void;
};

/**
 * 빈 구역 더블클릭 등 — CLEARANCE 연출 (0.7s)
 *
 * reduced-motion 주의:
 * 이 오버레이는 `access-denied-pop`(forwards, 최종 opacity 0)에 **표시와 은폐를
 * 모두 의존**한다. reduced-motion 전역 규칙(duration 0.01ms)이 걸리면 최종 상태로
 * 즉시 점프해 **메시지가 한 번도 보이지 않는다** — 모션은 줄었지만 정보가 사라진다.
 *
 * 그래서 reduced-motion일 때는 애니메이션 대신 **정적 표시**로 전환한다.
 * 은폐는 원래부터 아래 700ms 타이머의 언마운트가 담당하므로 그대로 동작한다.
 */
export function AccessDeniedFlash({ open, lang, onDone }: AccessDeniedFlashProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onDone, 700);
    return () => window.clearTimeout(id);
  }, [open, onDone]);

  if (!open) return null;

  return (
    <div
      className={`access-denied-flash${reducedMotion ? " access-denied-flash--static" : ""}`}
      role="status"
      aria-live="assertive"
    >
      <p className="access-denied-flash__code font-data-mono">
        [ERROR 403: CLEARANCE LEVEL 3 REQUIRED]
      </p>
      <p className="access-denied-flash__sub">
        {lang === "en"
          ? "Sector not authorized for this operator node."
          : "해당 섹터는 현재 오퍼레이터 노드에서 인가되지 않았습니다."}
      </p>
    </div>
  );
}
