import {
  FRICTION_EPISODES,
  episodeTitle,
  episodeLocationName,
  episodeBriefing,
  type FrictionEpisode,
} from "@/data/frictionEpisodes";
import type { LabelLanguage } from "@/lib/layerPrefs";

const CARD_SIZE = 1080;

const COPY = {
  ko: {
    kicker: "반서방·권위주의 진영 충돌사",
    parties: "당사국",
    brand: "멋진 신세계",
  },
  en: {
    kicker: "Frictions within the anti-West bloc",
    parties: "Parties",
    brand: "Brave New World",
  },
} as const;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const allLines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      allLines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) allLines.push(current);

  if (allLines.length <= maxLines) return allLines;

  const clipped = allLines.slice(0, maxLines);
  clipped[maxLines - 1] = `${clipped[maxLines - 1].replace(/[.,·—\s]+$/u, "")}…`;
  return clipped;
}

/**
 * 충돌사 에피소드 하나를 SNS 공유용 정사각 카드(PNG)로 렌더링.
 * 라이브 지도 캔버스에 의존하지 않는 순수 텍스트/도형 카드라
 * 어떤 화면 상태에서도 동일한 결과물을 만든다.
 */
export async function renderFrictionEpisodeCard(
  episode: FrictionEpisode,
  lang: LabelLanguage,
): Promise<Blob | null> {
  const copy = lang === "en" ? COPY.en : COPY.ko;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_SIZE;
  canvas.height = CARD_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const pad = Math.round(CARD_SIZE * 0.08);
  const contentWidth = CARD_SIZE - pad * 2;

  // 배경 — 앱 기본 배경색 + 은은한 방사형 그라데이션
  const bg = ctx.createRadialGradient(
    CARD_SIZE * 0.5,
    CARD_SIZE * 0.32,
    CARD_SIZE * 0.05,
    CARD_SIZE * 0.5,
    CARD_SIZE * 0.5,
    CARD_SIZE * 0.75,
  );
  bg.addColorStop(0, "#0b1220");
  bg.addColorStop(1, "#02040a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

  // 상단 킥커 + 인덱스
  const index = FRICTION_EPISODES.findIndex((e) => e.id === episode.id);
  const orderLabel = index >= 0 ? `${index + 1} / ${FRICTION_EPISODES.length}` : "";
  ctx.fillStyle = "rgba(251, 146, 60, 0.9)";
  ctx.font = `700 ${Math.round(CARD_SIZE * 0.028)}px system-ui, sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(copy.kicker.toUpperCase(), pad, pad + Math.round(CARD_SIZE * 0.02));
  if (orderLabel) {
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(251, 146, 60, 0.6)";
    ctx.fillText(orderLabel, CARD_SIZE - pad, pad + Math.round(CARD_SIZE * 0.02));
    ctx.textAlign = "left";
  }

  // 연도 배지
  const yearText = episode.yearEnd
    ? `${episode.historicalYear}–${episode.yearEnd}`
    : `${episode.historicalYear}`;
  const yearY = pad + Math.round(CARD_SIZE * 0.11);
  ctx.font = `800 ${Math.round(CARD_SIZE * 0.09)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(254, 226, 226, 0.95)";
  ctx.fillText(yearText, pad, yearY);

  // 붉은 밑줄 (전쟁구역 빗금 색과 통일)
  ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
  ctx.lineWidth = Math.max(2, Math.round(CARD_SIZE * 0.006));
  ctx.beginPath();
  ctx.moveTo(pad, yearY + Math.round(CARD_SIZE * 0.02));
  ctx.lineTo(pad + Math.round(CARD_SIZE * 0.18), yearY + Math.round(CARD_SIZE * 0.02));
  ctx.stroke();

  // 제목
  let cursorY = yearY + Math.round(CARD_SIZE * 0.09);
  ctx.font = `700 ${Math.round(CARD_SIZE * 0.052)}px system-ui, sans-serif`;
  ctx.fillStyle = "#f8fafc";
  const titleLines = wrapText(ctx, episodeTitle(episode, lang), contentWidth, 2);
  const titleLineHeight = Math.round(CARD_SIZE * 0.062);
  for (const line of titleLines) {
    ctx.fillText(line, pad, cursorY);
    cursorY += titleLineHeight;
  }

  // 위치
  cursorY += Math.round(CARD_SIZE * 0.012);
  ctx.font = `500 ${Math.round(CARD_SIZE * 0.03)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(148, 197, 231, 0.85)";
  ctx.fillText(`📍 ${episodeLocationName(episode, lang)}`, pad, cursorY);

  // 브리핑 본문
  cursorY += Math.round(CARD_SIZE * 0.06);
  ctx.font = `400 ${Math.round(CARD_SIZE * 0.032)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(226, 232, 240, 0.92)";
  const bodyLines = wrapText(ctx, episodeBriefing(episode, lang), contentWidth, 7);
  const bodyLineHeight = Math.round(CARD_SIZE * 0.046);
  for (const line of bodyLines) {
    ctx.fillText(line, pad, cursorY);
    cursorY += bodyLineHeight;
  }

  // 당사국 칩
  if (episode.parties.length > 0) {
    const chipY = CARD_SIZE - pad - Math.round(CARD_SIZE * 0.11);
    ctx.font = `600 ${Math.round(CARD_SIZE * 0.024)}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.fillText(copy.parties.toUpperCase(), pad, chipY);

    let chipX = pad;
    const chipRowY = chipY + Math.round(CARD_SIZE * 0.018);
    const chipHeight = Math.round(CARD_SIZE * 0.036);
    const chipFontSize = Math.round(CARD_SIZE * 0.024);
    ctx.font = `700 ${chipFontSize}px system-ui, sans-serif`;
    for (const party of episode.parties) {
      const textWidth = ctx.measureText(party).width;
      const chipWidth = textWidth + Math.round(CARD_SIZE * 0.03);
      ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
      ctx.strokeStyle = "rgba(125, 211, 252, 0.35)";
      ctx.lineWidth = 1.5;
      const radius = chipHeight / 2;
      ctx.beginPath();
      ctx.roundRect(chipX, chipRowY, chipWidth, chipHeight, radius);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(224, 242, 254, 0.95)";
      ctx.textBaseline = "middle";
      ctx.fillText(party, chipX + Math.round(CARD_SIZE * 0.015), chipRowY + chipHeight / 2);
      ctx.textBaseline = "alphabetic";
      chipX += chipWidth + Math.round(CARD_SIZE * 0.015);
    }
  }

  // 하단 워터마크
  const footerY = CARD_SIZE - Math.round(CARD_SIZE * 0.045);
  ctx.strokeStyle = "rgba(125, 211, 252, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, footerY - Math.round(CARD_SIZE * 0.03));
  ctx.lineTo(CARD_SIZE - pad, footerY - Math.round(CARD_SIZE * 0.03));
  ctx.stroke();

  ctx.font = `600 ${Math.round(CARD_SIZE * 0.026)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(224, 242, 254, 0.9)";
  ctx.fillText(copy.brand, pad, footerY);

  const host = typeof window !== "undefined" ? window.location.host : "";
  if (host) {
    ctx.font = `400 ${Math.round(CARD_SIZE * 0.022)}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(148, 197, 231, 0.75)";
    const hostWidth = ctx.measureText(host).width;
    ctx.fillText(host, CARD_SIZE - pad - hostWidth, footerY);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
  });
}
