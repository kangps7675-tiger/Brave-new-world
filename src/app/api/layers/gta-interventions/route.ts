/**
 * GTA 무역조치 레이어.
 *
 * 정적 빌드 산출물(`/data/{profile}/gta-interventions.json`)을 서빙한다.
 * 수집: `npm run gta:fetch` (하루 1회 cron 권장 — GTA 는 느린 데이터다)
 *
 * ⚠️ GTA 에는 좌표가 없다. 이 라우트는 조치 레코드만 돌려주고,
 *    호(arc) 변환은 클라이언트의 `gtaTradePaths.ts` 가 국가 중심점으로 수행한다.
 *
 * License: CC BY 4.0 — attribution 필드를 UI 에서 반드시 노출할 것.
 */
import { NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { cachedFetchJson } from "@/lib/apiCache";
import { apiStubResponse } from "@/lib/apiStub";
import { loadLocalJson } from "@/lib/localLayerData";
import { GTA_ATTRIBUTION, type GtaIntervention } from "@/lib/gta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GTA 는 정책 데이터라 하루 단위로 충분하다. */
const TTL_MS = 12 * 60 * 60 * 1000;

type GtaPayload = {
  fetchedAt?: string;
  accessLevel?: "basic" | "full";
  count?: number;
  interventions?: GtaIntervention[];
};

const EMPTY: GtaPayload = { interventions: [], count: 0, accessLevel: "basic" };

async function loadGta(): Promise<GtaPayload> {
  const data = await loadLocalJson<GtaPayload>("gta-interventions.json");
  if (!data || !Array.isArray(data.interventions)) return EMPTY;
  return data;
}

export async function GET(request: Request) {
  const stub = apiStubResponse("gta-interventions", request);
  if (stub) return stub;

  const url = new URL(request.url);
  const evaluation = url.searchParams.get("evaluation");
  const iso3 = url.searchParams.get("iso3")?.toUpperCase();
  const inForceOnly = url.searchParams.get("inForce") === "1";

  try {
    const { data, cached } = await cachedFetchJson("gta-interventions", TTL_MS, loadGta);
    let items = data.interventions ?? [];

    if (evaluation) {
      const wanted = new Set(evaluation.split(",").map((s) => s.trim()));
      items = items.filter((iv) => wanted.has(iv.evaluation));
    }
    if (iso3) {
      items = items.filter(
        (iv) =>
          iv.affected.some((j) => j.iso3 === iso3) ||
          iv.implementers.some((j) => j.iso3 === iso3),
      );
    }
    if (inForceOnly) items = items.filter((iv) => iv.isInForce);

    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      cached,
      fetchedAt: data.fetchedAt ?? null,
      accessLevel: data.accessLevel ?? "basic",
      count: items.length,
      interventions: items,
      attribution: GTA_ATTRIBUTION,
      // Red/Amber/Green 은 GTA 의 판단이지 객관 사실이 아니다.
      evaluationNotice:
        "Red/Amber/Green 은 Global Trade Alert 연구진의 평가입니다. 객관적 사실 판정이 아닙니다.",
    });
  } catch (error) {
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      cached: false,
      count: 0,
      interventions: [],
      attribution: GTA_ATTRIBUTION,
      warning: publicErrorMessage(error, "gta-interventions failed"),
    });
  }
}
