import briData from "@/data/bri-trade-connectivity.json";
import type { TransportPath } from "@/data/geoTypes";
import { greatCircleArc } from "@/lib/axisNetworkPaths";

type BriCountryLink = {
  id: string;
  destCode: string;
  nameEn: string;
  nameKo: string;
  impactPct: number;
  lat: number;
  lng: number;
  olat: number;
  olng: number;
};

type BriCityLink = {
  id: string;
  originCity: string;
  destCity: string;
  destCountry: string;
  impactPct: number;
  olat: number;
  olng: number;
  dlat: number;
  dlng: number;
};

/** 호박색 코리도어 — 반투명 (겹치면 밀도처럼 읽힘) */
const BRI_BASE_COLOR = "rgba(245, 158, 11";

function impactAlpha(pct: number): number {
  return Math.min(0.42, Math.max(0.22, 0.2 + pct / 90));
}

function impactStroke(pct: number): number {
  // widthMode "corridor"가 px를 담당 — strokeAngular는 보조 가중치만
  return Math.min(4.2, Math.max(2.8, 2.6 + pct / 28));
}

/** 지면 가까운 낮은 호 — 폴리곤 띠처럼 보이도록 */
function impactPeakAlt(pct: number): number {
  return Math.min(0.055, Math.max(0.018, 0.015 + pct / 900));
}

function linkToPath(
  id: string,
  nameKo: string,
  nameEn: string,
  impactPct: number,
  olat: number,
  olng: number,
  dlat: number,
  dlng: number,
  lang: "ko" | "en",
): TransportPath {
  const label =
    lang === "en"
      ? `BRI · ${nameEn} (−${impactPct.toFixed(1)}% ship time)`
      : `일대일로 · ${nameKo} (운송시간 −${impactPct.toFixed(1)}%)`;
  const peakAlt = impactPeakAlt(impactPct);
  const points = greatCircleArc(olat, olng, dlat, dlng, 28, peakAlt);
  return {
    id,
    kind: "bri-trade",
    name: label,
    scalerank: 1,
    lengthKm: null,
    accentColor: `${BRI_BASE_COLOR}, ${impactAlpha(impactPct).toFixed(3)})`,
    bbox: {
      minLat: Math.min(olat, dlat),
      minLng: Math.min(olng, dlng),
      maxLat: Math.max(olat, dlat),
      maxLng: Math.max(olng, dlng),
    },
    points,
  };
}

export function briTradePathsToTransport(lang: "ko" | "en" = "ko"): TransportPath[] {
  const country = (briData.countryLinks as BriCountryLink[]).map((row) =>
    linkToPath(
      row.id,
      row.nameKo,
      row.nameEn,
      row.impactPct,
      row.olat,
      row.olng,
      row.lat,
      row.lng,
      lang,
    ),
  );

  const city = (briData.cityLinks as BriCityLink[]).map((row) => {
    const nameKo = `${row.originCity}→${row.destCity}`;
    const nameEn = `${row.originCity}→${row.destCity}`;
    return linkToPath(
      row.id,
      nameKo,
      nameEn,
      row.impactPct,
      row.olat,
      row.olng,
      row.dlat,
      row.dlng,
      lang,
    );
  });

  return [...country, ...city];
}

export function briTradeStrokeWidth(path: TransportPath): number {
  const match = path.name?.match(/−([\d.]+)%/);
  const pct = match ? parseFloat(match[1]) : 4;
  return impactStroke(pct);
}

export const BRI_TRADE_LINK_COUNT =
  (briData.countryLinks as BriCountryLink[]).length +
  (briData.cityLinks as BriCityLink[]).length;
