import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { loadCloudStaticJson } from "@/lib/cloudStaticJson";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";
import { loadLocalStaticPoints } from "@/lib/localLayerData";
import {
  STRATEGIC_MISSILE_ATTRIBUTION,
  type MissileLaunchTest,
  type MissileLaunchTestsFile,
  type MissileSiloFieldsFile,
  type StrategicMissileDataset,
} from "@/lib/strategicMissile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Dataset = StrategicMissileDataset | "all";

const DATASETS: StrategicMissileDataset[] = ["silos", "bases", "test-sites", "fields", "launches"];

function parseDataset(raw: string | null): Dataset {
  if (!raw) return "all";
  return (DATASETS as string[]).includes(raw) ? (raw as StrategicMissileDataset) : "all";
}

/** 발사 이력은 326건이라 전량 전송해도 가볍지만, 필터는 서버에서 걸어 페이로드를 줄인다 */
function filterLaunches(
  launches: MissileLaunchTest[],
  params: URLSearchParams,
): MissileLaunchTest[] {
  const country = params.get("country")?.toLowerCase() ?? "";
  const family = params.get("family")?.toUpperCase() ?? "";
  const since = params.get("since") ?? "";
  return launches.filter((launch) => {
    if (country && (launch.country ?? "").toLowerCase() !== country) return false;
    if (family && (launch.family ?? "").toUpperCase() !== family) return false;
    if (since && (launch.date ?? "") < since) return false;
    return true;
  });
}

/**
 * 전략 미사일 정적 레이어 — 중국 PLARF 사일로군 · 러시아 RVSN 주둔지 ·
 * 인도/파키스탄 시험장 및 발사 이력.
 *
 * 원본은 커밋된 vendor 자료(PLARF Silo Study KMZ, NTI/CNS 트래커)에서
 * scripts/build-strategic-missile-data.js 로 굽고, 여기선 CDN/R2/public 순으로 읽기만 한다.
 *
 * ?dataset=silos|bases|test-sites|fields|launches (기본 all)
 * ?country=India&family=ICBM&since=2010-01-01 — launches 전용 필터
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dataset = parseDataset(url.searchParams.get("dataset"));
  const want = (name: StrategicMissileDataset) => dataset === "all" || dataset === name;

  try {
    const [silos, bases, testSites, fields, launchFile] = await Promise.all([
      want("silos") ? loadLocalStaticPoints("missile-silos.json") : Promise.resolve([]),
      want("bases") ? loadLocalStaticPoints("strategic-missile-bases.json") : Promise.resolve([]),
      want("test-sites")
        ? loadLocalStaticPoints("missile-test-sites.json")
        : Promise.resolve([]),
      want("fields")
        ? loadCloudStaticJson<MissileSiloFieldsFile>("missile-silo-fields.json")
        : Promise.resolve(null),
      want("launches")
        ? loadCloudStaticJson<MissileLaunchTestsFile>("missile-launch-tests.json")
        : Promise.resolve(null),
    ]);

    const launches = launchFile?.launches
      ? filterLaunches(launchFile.launches, url.searchParams)
      : [];

    return NextResponse.json(
      {
        dataset,
        silos,
        bases,
        testSites,
        complexes: fields?.complexes ?? [],
        fields: fields?.fields ?? [],
        fieldsNote: fields?.fieldsNote ?? null,
        surveyBbox: fields?.surveyBbox ?? null,
        roads: fields?.roads ?? [],
        launches,
        counts: {
          silos: silos.length,
          bases: bases.length,
          testSites: testSites.length,
          fields: fields?.fields?.length ?? 0,
          launches: launches.length,
        },
        attribution: STRATEGIC_MISSILE_ATTRIBUTION,
        fetchedAt: new Date().toISOString(),
      },
      { headers: publicCacheHeaders(CDN_CACHE.staticLayer) },
    );
  } catch (error) {
    return NextResponse.json(
      {
        dataset,
        silos: [],
        bases: [],
        testSites: [],
        complexes: [],
        fields: [],
        fieldsNote: null,
        surveyBbox: null,
        roads: [],
        launches: [],
        counts: { silos: 0, bases: 0, testSites: 0, fields: 0, launches: 0 },
        error: publicErrorMessage(error, "strategic missile layer failed"),
        fetchedAt: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
