"use client";

import { useEffect } from "react";

type AccessDeniedFlashProps = {
  open: boolean;
  lang: "ko" | "en";
  onDone: () => void;
};

/**
 * 빈 구역 더블클릭 등 — CLEARANCE 연출 (0.7s)
 */
export function AccessDeniedFlash({ open, lang, onDone }: AccessDeniedFlashProps) {
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onDone, 700);
    return () => window.clearTimeout(id);
  }, [open, onDone]);

  if (!open) return null;

  return (
    <div className="access-denied-flash" role="status" aria-live="assertive">
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
