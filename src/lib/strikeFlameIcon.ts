/**
 * 드론·미사일 공습 지점 — 네온처럼 번지는 촛불 불꽃 하나만 쓴다 (종류별 색·연기 없음).
 * MapLibre symbol 아이콘, 앵커 = 하단.
 */

export const STRIKE_FLAME_ICON_ID = "strike-candle-flame-v1";

const STRIKE_FLAME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 32 40">
  <defs>
    <filter id="blurWide" x="-80%" y="-60%" width="260%" height="220%"><feGaussianBlur stdDeviation="4.6"/></filter>
    <filter id="blurMid" x="-60%" y="-40%" width="220%" height="180%"><feGaussianBlur stdDeviation="2"/></filter>
    <linearGradient id="fBody" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#ff5a1f"/>
      <stop offset="50%" stop-color="#ff9a1f"/>
      <stop offset="100%" stop-color="#ffe066"/>
    </linearGradient>
    <linearGradient id="fCore" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#ffe9a8"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <!-- 네온 번짐: 넓은 주황 + 중간 노랑 -->
  <path d="M16 4 C17.8 10.5 24 15.5 24 24 C24 30.2 20.4 35 16 35 C11.6 35 8 30.2 8 24 C8 18.8 12 15.5 13.8 10.8 C14.7 12.8 15.4 13.2 16 12.4 C16.5 10 16 7 16 4 Z" fill="#ff3d00" opacity="0.9" filter="url(#blurWide)"/>
  <path id="fl" d="M16 4 C17.8 10.5 24 15.5 24 24 C24 30.2 20.4 35 16 35 C11.6 35 8 30.2 8 24 C8 18.8 12 15.5 13.8 10.8 C14.7 12.8 15.4 13.2 16 12.4 C16.5 10 16 7 16 4 Z" fill="#ff6a1a" opacity="0.95" filter="url(#blurWide)"/>
  <path d="M16 4 C17.8 10.5 24 15.5 24 24 C24 30.2 20.4 35 16 35 C11.6 35 8 30.2 8 24 C8 18.8 12 15.5 13.8 10.8 C14.7 12.8 15.4 13.2 16 12.4 C16.5 10 16 7 16 4 Z" fill="#ffb02e" opacity="0.9" filter="url(#blurMid)"/>
  <!-- 선명한 불꽃 + 밝은 테두리 -->
  <path d="M16 4 C17.8 10.5 24 15.5 24 24 C24 30.2 20.4 35 16 35 C11.6 35 8 30.2 8 24 C8 18.8 12 15.5 13.8 10.8 C14.7 12.8 15.4 13.2 16 12.4 C16.5 10 16 7 16 4 Z" fill="url(#fBody)" stroke="#fff0b3" stroke-width="0.9" stroke-linejoin="round"/>
  <path d="M16 15.5 C17.2 19.5 20.4 21.6 20.4 26 C20.4 29.2 18.5 31.6 16 31.6 C13.5 31.6 11.6 29.2 11.6 26 C11.6 22 14.8 19.6 16 15.5 Z" fill="url(#fCore)"/>
</svg>`;

type MapLike = {
  hasImage: (id: string) => boolean;
  addImage: (
    id: string,
    image: HTMLImageElement | ImageBitmap | ImageData,
    options?: { pixelRatio?: number },
  ) => void;
};

export async function ensureStrikeFlameImage(map: MapLike): Promise<void> {
  if (map.hasImage(STRIKE_FLAME_ICON_ID)) return;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image(64, 80);
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to load strike flame SVG"));
    el.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(STRIKE_FLAME_SVG)}`;
  });
  if (map.hasImage(STRIKE_FLAME_ICON_ID)) return;
  map.addImage(STRIKE_FLAME_ICON_ID, img, { pixelRatio: 2 });
}
