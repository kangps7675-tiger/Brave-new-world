/**
 * 위성(세슘) 사건 콜아웃 — 좌표 위에 떠 있는 입체 카드.
 * 카드 이미지는 캔버스로 그려 빌보드 하나로 올린다 (그림자·모서리 빛·아래로 뻗는 꼬리).
 * 좌표에는 지면에 닿는 링 하나를 따로 둔다. 카드를 누르면 닫힌다.
 */

import type { EventCallout } from "@/lib/eventCallout";

type CesiumNS = typeof import("cesium");

export const EVENT_CALLOUT_PREFIX = "event-callout:";

const CARD_W = 300;
const PAD = 14;
const TAIL_H = 22;
const SHADOW = 18;

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line + w;
    if (ctx.measureText(test).width > maxWidth && line.trim()) {
      lines.push(line.trim());
      line = w.trimStart();
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line.trim()) lines.push(line.trim());
  // 공백 없는 긴 글(한글 등)은 글자 단위로 다시 자른다
  if (lines.length === 1 && ctx.measureText(lines[0]!).width > maxWidth) {
    const out: string[] = [];
    let cur = "";
    for (const ch of text) {
      if (ctx.measureText(cur + ch).width > maxWidth) {
        out.push(cur);
        cur = ch;
        if (out.length >= maxLines) break;
      } else {
        cur += ch;
      }
    }
    if (out.length < maxLines && cur) out.push(cur);
    return out;
  }
  return lines;
}

/** 카드 이미지를 그려 data URL로 돌려준다. 브라우저 전용. */
export function renderEventCalloutImage(callout: EventCallout): { url: string; width: number; height: number } {
  const dpr = 2;
  const measure = document.createElement("canvas").getContext("2d")!;
  const font = "'Pretendard','Noto Sans KR',system-ui,sans-serif";
  measure.font = `700 15px ${font}`;
  const titleLines = wrapLines(measure, callout.title, CARD_W - PAD * 2, 2);
  measure.font = `400 12.5px ${font}`;
  const bodyLines = callout.body ? wrapLines(measure, callout.body, CARD_W - PAD * 2, 5) : [];

  const metaH = 16;
  const titleH = titleLines.length * 19;
  const bodyH = bodyLines.length ? bodyLines.length * 17 + 6 : 0;
  const footH = 16;
  const cardH = PAD + metaH + 4 + titleH + bodyH + footH + PAD - 4;
  const w = CARD_W + SHADOW * 2;
  const h = cardH + TAIL_H + SHADOW * 2;

  const canvas = document.createElement("canvas");
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const x0 = SHADOW;
  const y0 = SHADOW;
  const r = 10;
  const mid = w / 2;

  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x0 + r, y0);
    ctx.lineTo(x0 + CARD_W - r, y0);
    ctx.quadraticCurveTo(x0 + CARD_W, y0, x0 + CARD_W, y0 + r);
    ctx.lineTo(x0 + CARD_W, y0 + cardH - r);
    ctx.quadraticCurveTo(x0 + CARD_W, y0 + cardH, x0 + CARD_W - r, y0 + cardH);
    ctx.lineTo(mid + 10, y0 + cardH);
    ctx.lineTo(mid, y0 + cardH + TAIL_H);
    ctx.lineTo(mid - 10, y0 + cardH);
    ctx.lineTo(x0 + r, y0 + cardH);
    ctx.quadraticCurveTo(x0, y0 + cardH, x0, y0 + cardH - r);
    ctx.lineTo(x0, y0 + r);
    ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
    ctx.closePath();
  };

  // 바닥 그림자 → 입체감
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;
  path();
  ctx.fillStyle = "#0b1220";
  ctx.fill();
  ctx.restore();

  // 카드 바탕: 위가 밝은 그라데이션
  path();
  const grad = ctx.createLinearGradient(0, y0, 0, y0 + cardH);
  grad.addColorStop(0, "#1f2b44");
  grad.addColorStop(1, "#0d1424");
  ctx.fillStyle = grad;
  ctx.fill();

  // 위쪽 모서리 빛 + 가는 테두리
  ctx.save();
  path();
  ctx.clip();
  const sheen = ctx.createLinearGradient(0, y0, 0, y0 + 26);
  sheen.addColorStop(0, "rgba(255,255,255,0.20)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(x0, y0, CARD_W, 26);
  ctx.restore();
  path();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(252,165,100,0.75)";
  ctx.stroke();

  // 왼쪽 강조 막대
  ctx.fillStyle = "#fb923c";
  ctx.fillRect(x0 + 1, y0 + 10, 3, cardH - 20);

  let y = y0 + PAD + 11;
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 11.5px ${font}`;
  ctx.fillStyle = "#fdba74";
  ctx.fillText(callout.meta || callout.source, x0 + PAD, y);
  y += 4 + 15;
  ctx.font = `700 15px ${font}`;
  ctx.fillStyle = "#f8fafc";
  for (const line of titleLines) {
    ctx.fillText(line, x0 + PAD, y);
    y += 19;
  }
  if (bodyLines.length) {
    y += 2;
    ctx.font = `400 12.5px ${font}`;
    ctx.fillStyle = "#cbd5e1";
    for (const line of bodyLines) {
      ctx.fillText(line, x0 + PAD, y);
      y += 17;
    }
  }
  ctx.font = `500 10.5px ${font}`;
  ctx.fillStyle = "rgba(148,163,184,0.85)";
  ctx.fillText(`${callout.source} · 눌러서 닫기`, x0 + PAD, y0 + cardH - 10);

  return { url: canvas.toDataURL("image/png"), width: w, height: h };
}

export function syncEventCalloutEntity(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  callout: EventCallout | null,
): void {
  const cardId = `${EVENT_CALLOUT_PREFIX}${callout?.id ?? ""}`;
  const ringId = `${EVENT_CALLOUT_PREFIX}ring`;
  // 이전 콜아웃은 항상 치운다 (id가 달라졌거나 닫혔을 때)
  for (const entity of [...viewer.entities.values]) {
    if (typeof entity.id !== "string" || !entity.id.startsWith(EVENT_CALLOUT_PREFIX)) continue;
    if (!callout || (entity.id !== cardId && entity.id !== ringId)) viewer.entities.remove(entity);
  }
  if (!callout || !Number.isFinite(callout.lat) || !Number.isFinite(callout.lng)) return;
  if (viewer.entities.getById(cardId)) return;

  const { url, width, height } = renderEventCalloutImage(callout);
  const position = Cesium.Cartesian3.fromDegrees(callout.lng, callout.lat, 0);
  const scaleByDistance = new Cesium.NearFarScalar(2_000, 1.1, 6_000_000, 0.55);

  // 지면에 닿는 링 — 카드가 가리키는 정확한 좌표
  viewer.entities.add({
    id: ringId,
    position,
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString("#fb923c").withAlpha(0.95),
      outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: 8_000,
    },
  });

  viewer.entities.add({
    id: cardId,
    name: callout.title,
    position,
    billboard: {
      image: url,
      width,
      height,
      // 꼬리 끝이 좌표에 닿는다 — 이미지 아래쪽(그림자 여백 제외)이 앵커
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, SHADOW - 4),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance,
    },
  });
}
