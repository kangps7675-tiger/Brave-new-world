import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  dailyRankLabel,
  formatRankDelta,
  type DailyRankEntry,
  type DailyRankKind,
} from "@/lib/dailyRanks";

const CARD_SIZE = 1080;

const COPY = {
  ko: {
    theater: {
      kicker: "오늘의 세계 위험 순위",
      title: "전장 긴장도 TOP 5",
    },
    chokepoint: {
      kicker: "오늘의 공급망 스트레스",
      title: "초크포인트 TOP 5",
    },
    brand: "멋진 신세계",
    score: "점수",
  },
  en: {
    theater: {
      kicker: "World risk ranking",
      title: "Theater tension TOP 5",
    },
    chokepoint: {
      kicker: "Supply-chain stress",
      title: "Chokepoint TOP 5",
    },
    brand: "Brave the World",
    score: "Score",
  },
} as const;

/**
 * 일일 랭킹 TOP5를 SNS 공유용 1080×1080 PNG로 렌더.
 * frictionEpisodeCard와 동일하게 순수 canvas — 지도 상태 무관.
 */
export async function renderDailyRankCard(
  kind: DailyRankKind,
  entries: DailyRankEntry[],
  options: { lang?: LabelLanguage; date?: string } = {},
): Promise<Blob | null> {
  const lang = options.lang === "en" ? "en" : "ko";
  const copy = COPY[lang];
  const kindCopy = kind === "theater" ? copy.theater : copy.chokepoint;
  const top = entries.filter((e) => e.kind === kind).slice(0, 5);
  if (top.length === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_SIZE;
  canvas.height = CARD_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const pad = Math.round(CARD_SIZE * 0.08);
  const accent = kind === "theater" ? "rgba(248, 113, 113, 0.95)" : "rgba(56, 189, 248, 0.95)";
  const accentDim =
    kind === "theater" ? "rgba(248, 113, 113, 0.55)" : "rgba(56, 189, 248, 0.55)";

  const bg = ctx.createRadialGradient(
    CARD_SIZE * 0.5,
    CARD_SIZE * 0.28,
    CARD_SIZE * 0.04,
    CARD_SIZE * 0.5,
    CARD_SIZE * 0.55,
    CARD_SIZE * 0.78,
  );
  bg.addColorStop(0, kind === "theater" ? "#1a0b10" : "#0a1520");
  bg.addColorStop(1, "#02040a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

  ctx.fillStyle = accent;
  ctx.font = `700 ${Math.round(CARD_SIZE * 0.028)}px system-ui, sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(kindCopy.kicker.toUpperCase(), pad, pad + Math.round(CARD_SIZE * 0.02));

  const dateLabel = options.date || top[0]?.rankDate || "";
  if (dateLabel) {
    ctx.textAlign = "right";
    ctx.fillStyle = accentDim;
    ctx.fillText(dateLabel, CARD_SIZE - pad, pad + Math.round(CARD_SIZE * 0.02));
    ctx.textAlign = "left";
  }

  ctx.fillStyle = "rgba(248, 250, 252, 0.96)";
  ctx.font = `800 ${Math.round(CARD_SIZE * 0.055)}px system-ui, sans-serif`;
  ctx.fillText(kindCopy.title, pad, pad + Math.round(CARD_SIZE * 0.12));

  const rowStart = pad + Math.round(CARD_SIZE * 0.2);
  const rowH = Math.round(CARD_SIZE * 0.12);
  top.forEach((entry, i) => {
    const y = rowStart + i * rowH;
    ctx.fillStyle = i % 2 === 0 ? "rgba(15, 23, 42, 0.55)" : "rgba(15, 23, 42, 0.28)";
    ctx.fillRect(pad, y, CARD_SIZE - pad * 2, rowH - 10);

    ctx.fillStyle = accent;
    ctx.font = `800 ${Math.round(CARD_SIZE * 0.045)}px system-ui, sans-serif`;
    ctx.fillText(String(entry.rank), pad + 18, y + Math.round(rowH * 0.58));

    ctx.fillStyle = "rgba(241, 245, 249, 0.95)";
    ctx.font = `700 ${Math.round(CARD_SIZE * 0.032)}px system-ui, sans-serif`;
    ctx.fillText(dailyRankLabel(entry, lang), pad + 90, y + Math.round(rowH * 0.45));

    const delta = formatRankDelta(entry.deltaRank, lang);
    const deltaColor =
      entry.deltaRank == null || entry.deltaRank === 0
        ? "rgba(148, 163, 184, 0.85)"
        : entry.deltaRank > 0
          ? "rgba(74, 222, 128, 0.95)"
          : "rgba(248, 113, 113, 0.95)";
    ctx.fillStyle = deltaColor;
    ctx.font = `600 ${Math.round(CARD_SIZE * 0.024)}px system-ui, sans-serif`;
    ctx.fillText(delta, pad + 90, y + Math.round(rowH * 0.78));

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
    ctx.font = `700 ${Math.round(CARD_SIZE * 0.03)}px system-ui, sans-serif`;
    ctx.fillText(Math.round(entry.score).toLocaleString(), CARD_SIZE - pad - 18, y + Math.round(rowH * 0.58));
    ctx.textAlign = "left";
  });

  ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
  ctx.font = `600 ${Math.round(CARD_SIZE * 0.022)}px system-ui, sans-serif`;
  ctx.fillText(copy.brand, pad, CARD_SIZE - pad * 0.55);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
