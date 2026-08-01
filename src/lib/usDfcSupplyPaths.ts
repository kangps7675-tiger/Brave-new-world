import dfcData from "@/data/us-dfc-supply-chain.json";
import type { TransportPath } from "@/data/geoTypes";
import { greatCircleArc } from "@/lib/axisNetworkPaths";

type DfcLink = {
  id: string;
  isoA3: string;
  country: string;
  projectCount: number;
  committedUsd: number;
  latestFiscalYear: number;
  topSector: string;
  topProject: string;
  lat: number;
  lng: number;
  olat: number;
  olng: number;
};

const links = dfcData.links as DfcLink[];
const amountById = new Map(links.map((link) => [link.id, link.committedUsd]));
const maxAmount = Math.max(1, ...links.map((link) => link.committedUsd));

function normalizedAmount(amountUsd: number): number {
  return Math.log10(Math.max(1, amountUsd) + 1) / Math.log10(maxAmount + 1);
}

function formatUsd(amountUsd: number): string {
  if (amountUsd >= 1e9) return `$${(amountUsd / 1e9).toFixed(1)}B`;
  if (amountUsd >= 1e6) return `$${(amountUsd / 1e6).toFixed(0)}M`;
  if (amountUsd >= 1e3) return `$${(amountUsd / 1e3).toFixed(0)}K`;
  return `$${Math.round(amountUsd).toLocaleString("en-US")}`;
}

function linkToPath(link: DfcLink, lang: "ko" | "en"): TransportPath {
  const weight = normalizedAmount(link.committedUsd);
  const amount = formatUsd(link.committedUsd);
  const name =
    lang === "en"
      ? `U.S. DFC network · ${link.country} · ${link.projectCount} active projects · ${amount}`
      : `미국 DFC 개발금융망 · ${link.country} · 활성 프로젝트 ${link.projectCount}개 · ${amount}`;
  const alpha = 0.22 + weight * 0.18;
  return {
    id: link.id,
    kind: "us-dfc-supply",
    name,
    scalerank: 1,
    lengthKm: null,
    accentColor: `rgba(59, 130, 246, ${alpha.toFixed(3)})`,
    bbox: {
      minLat: Math.min(link.olat, link.lat),
      minLng: Math.min(link.olng, link.lng),
      maxLat: Math.max(link.olat, link.lat),
      maxLng: Math.max(link.olng, link.lng),
    },
    points: greatCircleArc(
      link.olat,
      link.olng,
      link.lat,
      link.lng,
      28,
      0.018 + weight * 0.035,
    ),
  };
}

export function usDfcSupplyPathsToTransport(lang: "ko" | "en" = "ko"): TransportPath[] {
  return links.map((link) => linkToPath(link, lang));
}

export function usDfcSupplyStrokeWidth(path: TransportPath): number {
  const amount = amountById.get(path.id) ?? 0;
  return 2.8 + normalizedAmount(amount) * 1.6;
}

export const US_DFC_SUPPLY_SUMMARY = dfcData.summary;
export const US_DFC_LINK_COUNT = links.length;
