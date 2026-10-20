/**
 * 지정학 감각 퀴즈 결과 공유 카드 (720×420).
 * tensionStreakCard / counterfactualInvestCard와 같은 canvas → share 패턴.
 */

import { senseQuizHeadline } from "@/lib/geopoliticsSenseQuiz";

export async function renderGeopoliticsSenseCard(options: {
  lang: "ko" | "en";
  score: number;
  correct: number;
  total: number;
  tierLabel: string;
}): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const w = 720;
  const h = 420;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const ko = options.lang === "ko";
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#0a1628");
  grad.addColorStop(0.55, "#122038");
  grad.addColorStop(1, "#1a1428");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(251, 191, 36, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
  ctx.font = "600 16px Inter, Wanted Sans, sans-serif";
  ctx.fillText(ko ? "멋진 신세계 · 지정학 감각 테스트" : "Brave New World · Geopolitics sense", 48, 56);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 36px Inter, Wanted Sans, sans-serif";
  const headline = senseQuizHeadline(options.score, ko);
  ctx.fillText(headline, 48, 120);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 18px Inter, Wanted Sans, sans-serif";
  ctx.fillText(
    ko
      ? `${options.correct}/${options.total} 문항 적중 · ${options.tierLabel}`
      : `${options.correct}/${options.total} correct · ${options.tierLabel}`,
    48,
    168,
  );

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 16px Inter, Wanted Sans, sans-serif";
  ctx.fillText(
    ko
      ? "전쟁과 이익이 한 화면을 나눠 쓰는 신세계"
      : "War and profit sharing one screen",
    48,
    220,
  );

  // score bar
  const barX = 48;
  const barY = 280;
  const barW = w - 96;
  const barH = 14;
  ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = options.score >= 80 ? "#fbbf24" : options.score >= 60 ? "#34d399" : "#38bdf8";
  ctx.fillRect(barX, barY, Math.max(8, (barW * options.score) / 100), barH);

  ctx.fillStyle = "#64748b";
  ctx.font = "400 13px Inter, Wanted Sans, sans-serif";
  ctx.fillText(ko ? "bnw.watch · 결과 공유" : "bnw.watch · share your result", 48, 360);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
