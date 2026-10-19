/**
 * 드론·미사일 공습 지점 — 촛농이 흘러내린 양초 위에 네온으로 타오르는 불꽃.
 * MapLibre symbol 아이콘, 앵커 = 하단(양초 밑동이 좌표). 지도 쪽에서 불꽃 위치에
 * 번짐(blur) 원 레이어를 한 겹 더 깔아 그림이 아니라 실제로 빛나는 것처럼 보이게 한다.
 */

export const STRIKE_FLAME_ICON_ID = "strike-candle-flame-v2";

/** 아이콘 높이 대비 불꽃 중심의 높이 비율 (밑동 기준) — 번짐 원의 위치를 맞추는 데 쓴다 */
export const STRIKE_FLAME_CENTER_RATIO = 0.7;

const FLAME_PATH =
  "M16 2.5 C17.6 8.6 22.4 12.4 22.4 18.2 C22.4 22.6 19.6 25.6 16 25.6 C12.4 25.6 9.6 22.6 9.6 18.2 C9.6 14.2 12.8 11.6 14.2 8 C15 9.6 15.6 9.9 16.1 9.2 C16.5 7.2 16 5 16 2.5 Z";

const STRIKE_FLAME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="96" viewBox="0 0 32 48">
  <defs>
    <filter id="bw" x="-120%" y="-80%" width="340%" height="260%"><feGaussianBlur stdDeviation="3.2"/></filter>
    <filter id="bm" x="-80%" y="-60%" width="260%" height="220%"><feGaussianBlur stdDeviation="1.4"/></filter>
    <linearGradient id="wax" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#cdb98c"/>
      <stop offset="35%" stop-color="#fbf1d6"/>
      <stop offset="70%" stop-color="#eadbb2"/>
      <stop offset="100%" stop-color="#b9a272"/>
    </linearGradient>
    <linearGradient id="pool" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f3e5c0"/>
      <stop offset="100%" stop-color="#a98f5c"/>
    </linearGradient>
    <linearGradient id="fl" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#ff4a12"/>
      <stop offset="45%" stop-color="#ff9a1f"/>
      <stop offset="100%" stop-color="#ffe27a"/>
    </linearGradient>
    <linearGradient id="core" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#fff0b8"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <!-- 바닥에 굳은 촛농 웅덩이 -->
  <ellipse cx="16" cy="45.2" rx="12.5" ry="2.6" fill="#7d6a43" opacity="0.55"/>
  <ellipse cx="16" cy="44.4" rx="11.5" ry="2.9" fill="url(#pool)"/>
  <!-- 양초 몸통 + 윗면 -->
  <path d="M10.5 31 L10.5 43.6 C10.5 44.6 21.5 44.6 21.5 43.6 L21.5 31 Z" fill="url(#wax)"/>
  <ellipse cx="16" cy="31" rx="5.5" ry="1.9" fill="#fff6dd"/>
  <ellipse cx="16" cy="31.2" rx="3.6" ry="1.1" fill="#f0d79a"/>
  <!-- 흘러내린 촛농 -->
  <path d="M10.6 31.4 C9.2 33 9.4 36 10.2 37.8 C10.9 39.2 12 38.6 11.8 36.8 C11.7 35.2 11.9 33.4 12.2 32 Z" fill="#fdf3d8"/>
  <path d="M20.4 31.6 C21.9 34.2 21.7 38.6 20.9 41 C20.4 42.4 19.3 41.8 19.4 40 C19.5 37.8 19.2 34.4 18.9 32.2 Z" fill="#f3e3b8"/>
  <!-- 심지 -->
  <rect x="15.55" y="25.4" width="0.9" height="6" rx="0.4" fill="#3a2a18"/>
  <!-- 네온 번짐: 넓은 빨강 → 주황 → 노랑 -->
  <path d="${FLAME_PATH}" fill="#ff3d00" opacity="0.95" filter="url(#bw)"/>
  <path d="${FLAME_PATH}" fill="#ff8a1f" opacity="0.95" filter="url(#bm)"/>
  <!-- 불꽃 본체 + 밝은 테두리 -->
  <path d="${FLAME_PATH}" fill="url(#fl)" stroke="#ffd98a" stroke-width="0.8" stroke-linejoin="round"/>
  <path d="M16 12.4 C17.1 15.6 19.4 17.2 19.4 20.4 C19.4 22.7 17.9 24.2 16 24.2 C14.1 24.2 12.6 22.7 12.6 20.4 C12.6 17.4 15 15.6 16 12.4 Z" fill="url(#core)"/>
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
    const el = new Image(64, 96);
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to load strike flame SVG"));
    el.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(STRIKE_FLAME_SVG)}`;
  });
  if (map.hasImage(STRIKE_FLAME_ICON_ID)) return;
  map.addImage(STRIKE_FLAME_ICON_ID, img, { pixelRatio: 2 });
}
