/**
 * Cesium 캔버스 짧은 클립 녹화 + 워터마크 번인.
 * MediaRecorder(webm) — 미지원이면 null.
 */

export type RecordClipBranding = {
  siteName: string;
  url: string;
  /** 코너 배지 — 예: "Live 3D · Observatoire" */
  badge?: string;
};

export type RecordClipOptions = {
  durationMs?: number;
  fps?: number;
  branding: RecordClipBranding;
  /**
   * preserveDrawingBuffer=false 일 때: 매 present 직후 draw를 호출하는 바인더.
   * 반환 disposer는 녹화 종료 시 호출된다.
   */
  bindPresenting?: (onPresent: () => void) => () => void;
};

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

/**
 * sourceCanvas(Cesium WebGL)를 합성 캔버스에 매 프레임 복사하고
 * 하단 워터마크를 그린 뒤 MediaRecorder로 녹화한다.
 */
export async function recordCesiumClip(
  sourceCanvas: HTMLCanvasElement,
  options: RecordClipOptions,
): Promise<Blob | null> {
  const mimeType = pickMimeType();
  if (!mimeType) return null;

  const durationMs = Math.max(2_000, Math.min(20_000, options.durationMs ?? 6_000));
  const fps = Math.max(12, Math.min(30, options.fps ?? 24));
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  if (!width || !height) return null;

  const footerH = Math.max(40, Math.round(height * 0.055));
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height + footerH;
  const ctx = out.getContext("2d");
  if (!ctx) return null;

  const stream = out.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data.size > 0) chunks.push(ev.data);
  };

  const drawFrame = () => {
    ctx.fillStyle = "#02040a";
    ctx.fillRect(0, 0, out.width, out.height);
    try {
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    } catch {
      /* WebGL context lost */
    }
    ctx.fillStyle = "rgba(2, 4, 10, 0.92)";
    ctx.fillRect(0, height, width, footerH);
    ctx.strokeStyle = "rgba(45, 212, 191, 0.45)";
    ctx.lineWidth = Math.max(1, Math.round(height * 0.0015));
    ctx.beginPath();
    ctx.moveTo(0, height + ctx.lineWidth / 2);
    ctx.lineTo(width, height + ctx.lineWidth / 2);
    ctx.stroke();

    const nameSize = Math.max(14, Math.round(footerH * 0.38));
    ctx.fillStyle = "rgba(204, 251, 241, 0.95)";
    ctx.font = `600 ${nameSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textBaseline = "middle";
    const label = options.branding.badge
      ? `${options.branding.siteName} · ${options.branding.badge}`
      : options.branding.siteName;
    ctx.fillText(label, Math.round(width * 0.02), height + footerH / 2);

    if (options.branding.url) {
      const urlSize = Math.max(11, Math.round(footerH * 0.26));
      ctx.font = `400 ${urlSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.fillStyle = "rgba(153, 246, 228, 0.8)";
      const w = ctx.measureText(options.branding.url).width;
      ctx.fillText(
        options.branding.url,
        Math.round(width * 0.98 - w),
        height + footerH / 2,
      );
    }
  };

  let raf = 0;
  let stopPresenting: (() => void) | null = null;
  const tick = () => {
    drawFrame();
    raf = window.requestAnimationFrame(tick);
  };

  const cleanupLoop = () => {
    window.cancelAnimationFrame(raf);
    stopPresenting?.();
    stopPresenting = null;
  };

  const done = new Promise<Blob | null>((resolve) => {
    recorder.onstop = () => {
      cleanupLoop();
      if (chunks.length === 0) {
        resolve(null);
        return;
      }
      resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
    };
    recorder.onerror = () => {
      cleanupLoop();
      resolve(null);
    };
  });

  drawFrame();
  if (options.bindPresenting) {
    // WebGL present 직후 복사 — PDB 없이도 프레임이 비지 않음
    stopPresenting = options.bindPresenting(() => drawFrame());
  } else {
    raf = window.requestAnimationFrame(tick);
  }
  recorder.start(200);
  await new Promise((r) => window.setTimeout(r, durationMs));
  if (recorder.state !== "inactive") recorder.stop();
  return done;
}

export async function shareOrDownloadVideoBlob(
  blob: Blob,
  filename: string,
  shareTitle: string,
  shareText: string,
): Promise<void> {
  const file =
    typeof File !== "undefined"
      ? new File([blob], filename, { type: blob.type || "video/webm" })
      : null;
  const canShare =
    file &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" ||
      navigator.canShare({ files: [file] }));

  if (canShare && file) {
    try {
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: shareText,
      });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
