export type ShareImageBranding = {
  siteName: string;
  url: string;
};

/**
 * Blob 하나를 Web Share API(지원 시 공유 시트) 또는 다운로드로 내보내는 공용 헬퍼.
 * ShareViewButton(지도 스냅샷)과 충돌사 카드 공유 버튼이 함께 사용한다.
 */
export async function shareOrDownloadImageBlob(
  blob: Blob,
  filename: string,
  shareTitle: string,
  shareText: string,
): Promise<void> {
  const file = typeof File !== "undefined" ? new File([blob], filename, { type: "image/png" }) : null;

  const canUseWebShare =
    file &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));

  if (canUseWebShare && file) {
    try {
      await navigator.share({ files: [file], title: shareTitle, text: shareText });
      return;
    } catch (err) {
      // 사용자가 공유 시트를 취소한 경우 — 다운로드로 폴백하지 않고 종료
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
}

/**
 * 지도 캔버스를 워터마크(사이트명 + URL) 박힌 PNG로 합성.
 *
 * `sourceCanvas`는 **MapGlobeMethods.captureFrame()이 돌려준 스냅샷 canvas**여야 한다.
 * 지도의 live WebGL 캔버스를 그대로 넘기면 빈 화면이 나온다 —
 * `preserveDrawingBuffer`를 상시 켜지 않기 때문(프레임 예산 20~40% 절감).
 */
export async function captureMapAsImage(
  sourceCanvas: HTMLCanvasElement,
  branding: ShareImageBranding,
): Promise<Blob | null> {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  if (!width || !height) return null;

  const footerHeight = Math.max(48, Math.round(height * 0.06));
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height + footerHeight;

  const ctx = out.getContext("2d");
  if (!ctx) return null;

  // 배경(캡처 실패 시 대비) + 지도 렌더링 결과
  ctx.fillStyle = "#02040a";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(sourceCanvas, 0, 0, width, height);

  // 하단 워터마크 바
  ctx.fillStyle = "rgba(2, 4, 10, 0.92)";
  ctx.fillRect(0, height, width, footerHeight);
  ctx.strokeStyle = "rgba(125, 211, 252, 0.35)";
  ctx.lineWidth = Math.max(1, Math.round(height * 0.0015));
  ctx.beginPath();
  ctx.moveTo(0, height + ctx.lineWidth / 2);
  ctx.lineTo(width, height + ctx.lineWidth / 2);
  ctx.stroke();

  const nameFontSize = Math.max(16, Math.round(footerHeight * 0.4));
  ctx.fillStyle = "rgba(224, 242, 254, 0.95)";
  ctx.font = `600 ${nameFontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(branding.siteName, Math.round(width * 0.02), height + footerHeight / 2);

  if (branding.url) {
    const urlFontSize = Math.max(12, Math.round(footerHeight * 0.26));
    ctx.font = `400 ${urlFontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillStyle = "rgba(148, 197, 231, 0.85)";
    const urlWidth = ctx.measureText(branding.url).width;
    ctx.fillText(
      branding.url,
      Math.round(width * 0.98 - urlWidth),
      height + footerHeight / 2,
    );
  }

  return new Promise((resolve) => {
    out.toBlob((blob) => resolve(blob), "image/png", 0.95);
  });
}
