"use client";

/**
 * 기밀 등급 워터마크 — SECRET // NOFORN // ORCON (연출용)
 */
export function ClassificationWatermark() {
  return (
    <>
      <div
        className="classification-watermark classification-watermark--top"
        aria-hidden
      >
        SECRET // NOFORN // ORCON
      </div>
      <div
        className="classification-watermark classification-watermark--bottom"
        aria-hidden
      >
        SECRET // NOFORN // ORCON · ORIGINATOR CONTROLLED
      </div>
    </>
  );
}
