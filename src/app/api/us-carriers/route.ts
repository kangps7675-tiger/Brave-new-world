import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import type { UsCarrier } from "@/data/usCarriers";
import { US_CARRIERS_SEED } from "@/data/usCarriers";
import { loadCloudStaticJson } from "@/lib/cloudStaticJson";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";
import { loadUsCarrierSnapshot } from "@/lib/usCarriers/snapshotStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CARRIERS_CDN = publicCacheHeaders(CDN_CACHE.carriers);

type CarrierPayload = {
  carriers?: UsCarrier[];
  updatedAt?: string;
  source?: string;
  generatedAt?: string;
};

async function loadCarrierFile(): Promise<{
  carriers: UsCarrier[];
  updatedAt: string;
  source: string;
}> {
  const snapshot = await loadUsCarrierSnapshot();
  if (snapshot) {
    return {
      carriers: snapshot.carriers,
      updatedAt: snapshot.updatedAt,
      source: snapshot.source,
    };
  }

  const payload = await loadCloudStaticJson<CarrierPayload>("us-carriers.json");
  if (payload) {
    return {
      carriers: payload.carriers || US_CARRIERS_SEED,
      updatedAt: payload.updatedAt || payload.generatedAt || new Date().toISOString(),
      source: payload.source || "cloud JSON",
    };
  }
  return {
    carriers: US_CARRIERS_SEED,
    updatedAt: "2026-07-10",
    source: "built-in seed",
  };
}

/** D1 뉴스 스냅샷 → 클라우드 JSON → seed 순으로 항모 좌표 제공 */
export async function GET() {
  try {
    const { carriers, updatedAt, source } = await loadCarrierFile();
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        updatedAt,
        source,
        count: carriers.length,
        carriers,
      },
      { headers: CARRIERS_CDN },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: publicErrorMessage(error, "항모 데이터 로드 실패"),
        carriers: US_CARRIERS_SEED,
        count: US_CARRIERS_SEED.length,
      },
      { status: 500, headers: CARRIERS_CDN },
    );
  }
}
