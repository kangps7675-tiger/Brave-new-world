/**
 * 항공기 마커의 **symbol 레이어 경로**.
 *
 * ── 왜 만들었나 ────────────────────────────────────────────────────
 * 군용기(mil-html)·민항기(civ-html)는 화면 마커 중 수가 가장 많다
 * (village 티어 기준 150 + 280 = 최대 430개). 이전에는 전부 MapLibre
 * `Marker`, 즉 **DOM 노드**였다. 마커 하나당:
 *
 *   - div > button > span > span (4노드) + innerHTML로 SVG 파싱
 *   - CSS `filter: drop-shadow(...)` → 요소별 오프스크린 렌더
 *   - `box-shadow` 글로우
 *   - 프레임마다 `map.project()` + transform 쓰기 + 오클루전 판정
 *
 * 430개면 이 전부가 프레임마다 곱해진다.
 *
 * ── 왜 항공기가 이전 1순위인가 ──────────────────────────────────────
 * 아이콘 종류가 **역할 12종 × 팔레트 2종 = 24개로 유한**하고, 텍스트가
 * 없으며, 회전은 MapLibre `icon-rotate`가 그대로 처리한다. 즉 DOM으로
 * 얻는 게 없다. 반면 선박(AIS)은 8방위 실루엣·위장선 등 상태 조합이
 * 많아 별도 설계가 필요하다 — 그건 후속 과제.
 *
 * GPU가 한 번에 그리므로 마커 수가 늘어도 프레임 비용이 거의 안 는다.
 */

import type { MilitaryAircraft } from "@/data/geoTypes";
import {
  MIL_AIRCRAFT_MARKER_ICON_SIZE,
  type MilAircraftIconSize,
} from "@/data/milAircraftSilhouettes";
import { classifyMilAircraft, type MilAircraftRole } from "@/lib/milAircraftKind";
import { milAircraftIconSvg } from "@/lib/milAircraftIcon";

export const AIRCRAFT_SYMBOL_SOURCE_ID = "aircraft-symbols-source";
export const AIRCRAFT_SYMBOL_LAYER_ID = "aircraft-symbols";

export type AircraftPalette = "military" | "civil";

const ROLES: MilAircraftRole[] = [
  "fighter",
  "bomber",
  "helicopter",
  "tanker",
  "transport",
  "awacs",
  "recon",
  "patrol",
  "gunship",
  "trainer",
  "uav",
  "other",
];

const PALETTES: AircraftPalette[] = ["military", "civil"];

/**
 * 역할별 표시 크기 (CSS px) — createMilAircraftBadge의 기존 값을 그대로 옮겼다.
 * 이 값 그대로 이미지를 굽고 icon-size는 1로 둔다 (스케일 보간 없음 = 더 선명).
 */
function iconSizeForRole(role: MilAircraftRole): MilAircraftIconSize {
  if (role === "bomber") return { width: 46, height: 46 };
  if (role === "transport" || role === "tanker" || role === "awacs") {
    return { width: 34, height: 34 };
  }
  if (role === "helicopter" || role === "gunship") return { width: 30, height: 30 };
  return MIL_AIRCRAFT_MARKER_ICON_SIZE;
}

export function aircraftSymbolIconId(
  role: MilAircraftRole,
  palette: AircraftPalette,
): string {
  return `aircraft-${palette}-${role}`;
}

/** 침로 없음 — 실루엣을 살짝 눕혀 "방향 미상"을 표현 (기존 DOM 마커와 동일 규칙) */
export function aircraftSymbolUnknownIconId(
  role: MilAircraftRole,
  palette: AircraftPalette,
): string {
  return `aircraft-${palette}-${role}-nohdg`;
}

function loadSvgImage(svg: string, size: MilAircraftIconSize): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // devicePixelRatio 2 기준으로 2배 크기로 굽고 addImage(pixelRatio: 2)
    const img = new Image(size.width * 2, size.height * 2);
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load aircraft silhouette SVG"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

type MapLike = {
  hasImage: (id: string) => boolean;
  addImage: (
    id: string,
    image: HTMLImageElement | ImageBitmap | ImageData,
    options?: { pixelRatio?: number },
  ) => void;
};

/**
 * 24종(역할 12 × 팔레트 2) 아이콘을 스타일에 등록. 이미 있으면 건너뛴다.
 * 스타일이 교체되면(베이스맵 전환) 이미지도 사라지므로 다시 불러야 한다.
 */
export async function ensureAircraftSymbolImages(map: MapLike): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const palette of PALETTES) {
    for (const role of ROLES) {
      const id = aircraftSymbolIconId(role, palette);
      if (map.hasImage(id)) continue;
      const size = iconSizeForRole(role);
      // 2배 해상도로 구운 뒤 pixelRatio 2 → 화면에서는 size 그대로
      const svg = milAircraftIconSvg(
        role,
        { width: size.width * 2, height: size.height * 2 },
        { palette },
      );
      jobs.push(
        loadSvgImage(svg, size).then((img) => {
          if (map.hasImage(id)) return;
          map.addImage(id, img, { pixelRatio: 2 });
        }),
      );
    }
  }
  await Promise.all(jobs);
}

export type AircraftSymbolInput = MilitaryAircraft & {
  markerId?: string;
  displayKind?: string;
};

function headingDeg(aircraft: MilitaryAircraft): number | null {
  const raw = aircraft.track ?? aircraft.trueHeading ?? aircraft.magHeading;
  if (raw == null || !Number.isFinite(raw)) return null;
  return ((raw % 360) + 360) % 360;
}

export type AircraftSymbolModel = {
  /** symbol 레이어에 넘길 FeatureCollection */
  geojson: GeoJSON.FeatureCollection;
  /**
   * `properties.index` → 원본 항공기. 클릭/호버에서 되찾는 용도.
   * MapLibre는 properties를 직렬화하므로 원본을 통째로 넣지 않고
   * 인덱스만 넣는다 (기존 map-points 레이어와 같은 방식).
   */
  items: AircraftSymbolInput[];
  /** civ 여부 — 클릭 핸들러 분기용 (index 정렬 동일) */
  isCivil: boolean[];
};

const EMPTY_MODEL: AircraftSymbolModel = {
  geojson: { type: "FeatureCollection", features: [] },
  items: [],
  isCivil: [],
};

/**
 * 군용기 + 민항기를 **하나의** symbol 레이어 데이터로 합친다.
 * 레이어를 나누면 draw call이 늘 뿐이고, 아이콘 id에 이미 팔레트가 들어 있다.
 */
export function buildAircraftSymbolModel(
  military: readonly AircraftSymbolInput[],
  civil: readonly AircraftSymbolInput[],
): AircraftSymbolModel {
  if (military.length === 0 && civil.length === 0) return EMPTY_MODEL;

  const features: GeoJSON.Feature[] = [];
  const items: AircraftSymbolInput[] = [];
  const isCivil: boolean[] = [];

  const push = (item: AircraftSymbolInput, palette: AircraftPalette) => {
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    // 민항은 여객기 실루엣으로 통일 (기존 createMilAircraftBadge와 동일 규칙)
    const role =
      palette === "civil" ? ("transport" as const) : classifyMilAircraft(item).role;
    const heading = headingDeg(item);
    const index = items.length;

    items.push(item);
    isCivil.push(palette === "civil");
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        index,
        icon: aircraftSymbolIconId(role, palette),
        // 침로 없으면 -18° 기울여 "미상" 표시 + 살짝 투명 (기존 DOM 규칙 유지)
        rotate: heading ?? -18,
        opacity: heading == null ? 0.8 : 1,
      },
    });
  };

  for (const item of military) push(item, "military");
  for (const item of civil) push(item, "civil");

  return { geojson: { type: "FeatureCollection", features }, items, isCivil };
}
