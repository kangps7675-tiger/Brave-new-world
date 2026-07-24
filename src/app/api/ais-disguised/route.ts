import { NextResponse } from "next/server";
import {
  AIS_TRACKER_ATTRIBUTION,
  AIS_TRACKER_URL,
  DISGUISED_VESSELS,
  type DisguisedVessel,
} from "@/data/disguisedVessels";
import type { AisVessel } from "@/data/geoTypes";
import { enrichAisClassification } from "@/lib/aisVesselClass";
import { loadLocalStaticPoints } from "@/lib/localLayerData";
import {
  matchDisguisedVesselsAgainstSanctions,
  type SanctionsVesselMatch,
} from "@/lib/sanctionsVesselMatch";
import {
  CDN_CACHE,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CDN = publicCacheHeaders(CDN_CACHE.ais);

function toAisVessel(
  seed: DisguisedVessel,
  sanctionsMatch: SanctionsVesselMatch | null,
): AisVessel {
  const classified = enrichAisClassification({
    shipType: seed.kind === "arsenal-ship" ? 70 : 80,
    shipName: seed.shipName,
    mmsi: seed.mmsi,
  });
  return {
    id: seed.id,
    mmsi: seed.mmsi || seed.id,
    shipName: seed.shipName,
    lat: seed.lat,
    lng: seed.lng,
    speedOverGround: null,
    courseOverGround: seed.heading,
    trueHeading: seed.heading,
    timestamp: null,
    shipType: seed.kind === "arsenal-ship" ? 70 : 80,
    shipTypeLabel: classified.shipTypeLabel,
    category: classified.category,
    militaryKind: null,
    disguised: true,
    disguisedKind: seed.kind,
    sanctionsMatch: sanctionsMatch ?? null,
  };
}

/**
 * 위장·다크플리트 선박 — AIS_Tracker 시드.
 * sanctions-entities.json(OFAC/UN/EU/UK)과 이름 대조해 실제 제재 매칭 여부를 붙인다.
 */
export async function GET() {
  const sanctionsPoints = await loadLocalStaticPoints("sanctions-entities.json");
  const matches = matchDisguisedVesselsAgainstSanctions(sanctionsPoints);
  const vessels = DISGUISED_VESSELS.map((seed) => toAisVessel(seed, matches.get(seed.id) ?? null));

  return NextResponse.json(
    {
      receivedAt: new Date().toISOString(),
      count: vessels.length,
      vessels,
      seeds: DISGUISED_VESSELS,
      sanctionsMatchedCount: matches.size,
      attribution: AIS_TRACKER_ATTRIBUTION,
      sourceUrl: AIS_TRACKER_URL,
      source: "ais-tracker-seed",
      provider: "ais-tracker",
      mode: "disguised",
    },
    { headers: CDN },
  );
}
