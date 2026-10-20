/**
 * 드론·미사일 공습 지점 — 양초·촛농 없이 불꽃 하나만. 작지만 하얗게 달아오른 심에서
 * 노랑 → 주황으로 번지는, 실제로 타는 불처럼 밝은 그림.
 * MapLibre symbol 아이콘, 앵커 = 하단(불꽃 밑동이 좌표). 지도 쪽에서 불꽃 중심에
 * 번짐(blur) 원을 두 겹 더 깔아 그림이 아니라 빛나는 점처럼 보이게 한다.
 */

export const STRIKE_FLAME_ICON_ID = "strike-flame-v3";

/** 아이콘 높이 대비 불꽃 중심의 높이 비율 (밑동 기준) — 번짐 원의 위치를 맞추는 데 쓴다 */
export const STRIKE_FLAME_CENTER_RATIO = 0.42;

/** 바깥 불꽃 — 위로 갈수록 가늘게 휘어 오르는 혀 모양 */
const OUTER =
  "M12 1.5 C13.4 6.4 18.6 10.4 18.6 17.6 C18.6 22.6 15.6 26.4 12 26.4 C8.4 26.4 5.4 22.6 5.4 17.6 C5.4 13.2 8.6 10.6 10 6.8 C10.7 8.4 11.3 8.7 11.8 8 C12.3 6 12 3.8 12 1.5 Z";
/** 안쪽 불꽃 */
const INNER =
  "M12 9.6 C13 12.8 15.6 14.8 15.6 18.6 C15.6 21.6 14 23.8 12 23.8 C10 23.8 8.4 21.6 8.4 18.6 C8.4 15.4 10.8 13.4 12 9.6 Z";
/** 하얗게 달아오른 심 */
const CORE =
  "M12 12.6 C13.2 15.4 14.8 16.8 14.8 19.6 C14.8 21.6 13.6 23 12 23 C10.4 23 9.2 21.6 9.2 19.6 C9.2 17.2 11 15.6 12 12.6 Z";

const STRIKE_FLAME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 24 28">
  <defs>
    <filter id="halo" x="-100%" y="-60%" width="300%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>
    <filter id="soft" x="-60%" y="-40%" width="220%" height="180%"><feGaussianBlur stdDeviation="0.9"/></filter>
    <linearGradient id="outer" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#ff7417"/>
      <stop offset="50%" stop-color="#ffb02a"/>
      <stop offset="100%" stop-color="#ffe066"/>
    </linearGradient>
    <linearGradient id="inner" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#ffe45c"/>
      <stop offset="100%" stop-color="#fffbe0"/>
    </linearGradient>
  </defs>
  <!-- 번짐: 주황 후광 → 노란 후광 -->
  <path d="${OUTER}" fill="#ff7a00" opacity="1" filter="url(#halo)"/>
  <path d="${OUTER}" fill="#ffc23d" opacity="0.85" filter="url(#soft)"/>
  <!-- 불꽃 본체 -->
  <path d="${OUTER}" fill="url(#outer)"/>
  <path d="${INNER}" fill="url(#inner)"/>
  <path d="${CORE}" fill="#ffffff"/>
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
    const el = new Image(48, 56);
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to load strike flame SVG"));
    el.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(STRIKE_FLAME_SVG)}`;
  });
  if (map.hasImage(STRIKE_FLAME_ICON_ID)) return;
  map.addImage(STRIKE_FLAME_ICON_ID, img, { pixelRatio: 2 });
}
