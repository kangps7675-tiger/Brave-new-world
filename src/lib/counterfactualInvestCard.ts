/**
 * "그때 샀으면 얼마 벌었을까" 공유 카드 — tensionStreakCard와 같은 720×420 포맷.
 * 데이터는 /api/stock-tickers/reaction 이 이미 계산해 둔 changePercentSinceEvent 그대로 재사용.
 */

export type CounterfactualCardInput = {
  lang: "ko" | "en";
  /** 사건 발생 후 몇 % 움직였나 (이미 벤치마크 보정 전 원 변동률) */
  changePercent: number;
  symbolLabel: string;
  eventLabel: string;
  stakeKrw: number;
  stakeUsd: number;
};

function formatWon(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function formatDollar(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export async function renderCounterfactualInvestCard(
  input: CounterfactualCardInput,
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const w = 720;
  const h = 420;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const ko = input.lang === "ko";
  const pct = input.changePercent;
  const isGain = pct >= 0;
  const resultKrw = input.stakeKrw * (1 + pct / 100);
  const resultUsd = input.stakeUsd * (1 + pct / 100);

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#0b1220");
  grad.addColorStop(1, isGain ? "#0d2016" : "#210b12");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
  ctx.font = "600 20px Inter, Wanted Sans, sans-serif";
  ctx.fillText(ko ? "만약에 — 전쟁과 이익" : "What if — war & profit", 48, 60);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "500 22px Inter, Wanted Sans, sans-serif";
  const eventLine = ko
    ? `${input.eventLabel} 터진 날, ${input.symbolLabel}에`
    : `The day ${input.eventLabel}, on ${input.symbolLabel}:`;
  ctx.fillText(eventLine, 48, 108);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 18px Inter, Wanted Sans, sans-serif";
  ctx.fillText(
    ko ? `${formatWon(input.stakeKrw)} 넣었다면` : `Had you put in ${formatDollar(input.stakeUsd)}`,
    48,
    142,
  );

  ctx.fillStyle = isGain ? "#34d399" : "#fb7185";
  ctx.font = "700 58px Inter, sans-serif";
  ctx.fillText(ko ? `지금 ${formatWon(resultKrw)}` : `now ${formatDollar(resultUsd)}`, 48, 230);

  ctx.font = "600 26px Inter, sans-serif";
  ctx.fillText(`${isGain ? "+" : ""}${pct.toFixed(1)}%`, 48, 272);

  ctx.fillStyle = "#64748b";
  ctx.font = "400 13px Inter, sans-serif";
  ctx.fillText(
    ko
      ? "실제 투자 조언이 아닙니다 · 수수료·세금 미반영 가정치"
      : "Not investment advice · hypothetical, excludes fees & taxes",
    48,
    340,
  );

  ctx.fillStyle = "#475569";
  ctx.font = "400 14px Inter, sans-serif";
  ctx.fillText(ko ? "멋진 신세계" : "Brave New World", 48, 380);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
