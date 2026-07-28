/**
 * 연속 적중 공유 카드 — 애널리스트 등급·적중률이 주인공, 스트릭은 보조.
 */

export async function renderTensionStreakCard(options: {
  lang: "ko" | "en";
  streak: number;
  lastHit: boolean | null;
  label: string;
  pick: "up" | "down" | null;
  date: string;
  /** 예: 전략분석관 / Chief analyst */
  tierLabel: string;
  hits: number;
  attempts: number;
}): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const w = 720;
  const h = 440;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const ko = options.lang === "ko";
  const rate =
    options.attempts > 0
      ? Math.round((100 * options.hits) / options.attempts)
      : null;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#0b1220");
  grad.addColorStop(1, "#1a1030");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
  ctx.font = "600 18px Inter, Wanted Sans, sans-serif";
  ctx.fillText(ko ? "GTI · 애널리스트 카드" : "GTI · Analyst card", 48, 52);

  // 주인공: 적중률 + 등급
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 42px Inter, Wanted Sans, sans-serif";
  const hero =
    rate != null
      ? ko
        ? `적중률 ${rate}% · ${options.tierLabel}`
        : `${rate}% hit rate · ${options.tierLabel}`
      : options.tierLabel;
  ctx.fillText(hero, 48, 118);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 16px Inter, Wanted Sans, sans-serif";
  ctx.fillText(
    ko
      ? `${options.hits}/${options.attempts} 적중 · ${options.label}`
      : `${options.hits}/${options.attempts} hits · ${options.label}`,
    48,
    156,
  );

  // 보조: 스트릭
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 22px Inter, Wanted Sans, sans-serif";
  const streakLine =
    options.streak > 0
      ? ko
        ? `연속 ${options.streak}일`
        : `${options.streak}-day streak`
      : ko
        ? "오늘의 한 수"
        : "Today’s call";
  ctx.fillText(streakLine, 48, 200);

  if (options.pick) {
    const up = options.pick === "up";
    ctx.fillStyle = up ? "#34d399" : "#fb7185";
    ctx.font = "700 56px Inter, sans-serif";
    ctx.fillText(up ? "UP ↑" : "DOWN ↓", 48, 280);
  }

  if (options.lastHit != null) {
    ctx.fillStyle = options.lastHit ? "#86efac" : "#fda4af";
    ctx.font = "500 18px Inter, Wanted Sans, sans-serif";
    ctx.fillText(
      options.lastHit
        ? ko
          ? "어제 적중"
          : "Yesterday: hit"
        : ko
          ? "어제 빗나감"
          : "Yesterday: miss",
      48,
      330,
    );
  }

  ctx.fillStyle = "#64748b";
  ctx.font = "400 14px Inter, sans-serif";
  ctx.fillText(ko ? `멋진 신세계 · ${options.date}` : `Brave New World · ${options.date}`, 48, 400);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
