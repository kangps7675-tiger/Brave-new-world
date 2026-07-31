import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/apiCache";
import {
  mapNewfeedsAttack,
  NEWFEEDS_ATTACKS_URL,
  NEWFEEDS_ATTRIBUTION,
  NEWFEEDS_REPO_URL,
  NEWFEEDS_THREAT_URL,
  type NewfeedsAttackRaw,
  type NewfeedsAttacksPayload,
} from "@/lib/newfeeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_KEY = "newfeeds:attacks:v1";
const CACHE_MS = 5 * 60 * 1000;

type ThreatPayload = {
  current?: { label?: string; level?: number };
};

/**
 * GET /api/newfeeds-attacks?iran=1
 * Proxies NewFeeds public attacks.json (+ threat level).
 * Attribution: https://github.com/ktoetotam/NewFeeds (MIT)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const iranOnly = searchParams.get("iran") !== "0";

  const cached = getCached<NewfeedsAttacksPayload>(CACHE_KEY);
  if (cached) {
    const attacks = iranOnly ? cached.attacks.filter((a) => a.iranRelated) : cached.attacks;
    return NextResponse.json({
      ...cached,
      attacks,
      iranCount: cached.attacks.filter((a) => a.iranRelated).length,
    });
  }

  try {
    const [attacksRes, threatRes] = await Promise.all([
      fetch(NEWFEEDS_ATTACKS_URL, {
        headers: { Accept: "application/json", "User-Agent": "BraveNewWorld/1.0" },
        next: { revalidate: 300 },
      }),
      fetch(NEWFEEDS_THREAT_URL, {
        headers: { Accept: "application/json", "User-Agent": "BraveNewWorld/1.0" },
        next: { revalidate: 300 },
      }).catch(() => null),
    ]);

    if (!attacksRes.ok) {
      return NextResponse.json(
        {
          fetchedAt: new Date().toISOString(),
          live: false,
          attribution: NEWFEEDS_ATTRIBUTION,
          attributionUrl: NEWFEEDS_REPO_URL,
          threatLabel: null,
          threatLevel: null,
          attacks: [],
          iranCount: 0,
          error: `upstream ${attacksRes.status}`,
        } satisfies NewfeedsAttacksPayload,
        { status: 502 },
      );
    }

    const rawList = (await attacksRes.json()) as NewfeedsAttackRaw[];
    const mapped = (Array.isArray(rawList) ? rawList : [])
      .map(mapNewfeedsAttack)
      .filter((a): a is NonNullable<typeof a> => a != null);

    let threatLabel: string | null = null;
    let threatLevel: number | null = null;
    if (threatRes?.ok) {
      try {
        const threat = (await threatRes.json()) as ThreatPayload;
        threatLabel = threat.current?.label ?? null;
        threatLevel = typeof threat.current?.level === "number" ? threat.current.level : null;
      } catch {
        /* ignore */
      }
    }

    const payload: NewfeedsAttacksPayload = {
      fetchedAt: new Date().toISOString(),
      live: true,
      attribution: NEWFEEDS_ATTRIBUTION,
      attributionUrl: NEWFEEDS_REPO_URL,
      threatLabel,
      threatLevel,
      attacks: mapped,
      iranCount: mapped.filter((a) => a.iranRelated).length,
    };
    setCached(CACHE_KEY, payload, CACHE_MS);

    const attacks = iranOnly ? mapped.filter((a) => a.iranRelated) : mapped;
    return NextResponse.json({ ...payload, attacks });
  } catch (error) {
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        live: false,
        attribution: NEWFEEDS_ATTRIBUTION,
        attributionUrl: NEWFEEDS_REPO_URL,
        threatLabel: null,
        threatLevel: null,
        attacks: [],
        iranCount: 0,
        error: publicErrorMessage(error, "newfeeds fetch failed"),
      } satisfies NewfeedsAttacksPayload,
      { status: 502 },
    );
  }
}
