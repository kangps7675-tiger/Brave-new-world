/**
 * NewFeeds Iran 프로덕션 ingest — GitHub raw → memory + D1.
 * stub/시드 없음. Attribution: ktoetotam/NewFeeds (MIT)
 */

import {
  mapNewfeedsAttack,
  NEWFEEDS_ATTACKS_URL,
  NEWFEEDS_ATTRIBUTION,
  NEWFEEDS_REPO_URL,
  NEWFEEDS_THREAT_URL,
  type NewfeedsAttackRaw,
  type NewfeedsAttacksPayload,
} from "@/lib/newfeeds";
import { fetchNewfeedsIranNewsItemsFromUpstream } from "@/lib/news/newfeedsIranNews";
import {
  NEWFEEDS_ATTACKS_CACHE_KEY,
  NEWFEEDS_IRAN_NEWS_CACHE_KEY,
  setNewfeedsAttacksMemory,
  setNewfeedsIranNewsMemory,
  setNewfeedsLastError,
} from "@/lib/newfeeds/store";
import { saveNewfeedsSnapshot } from "@/lib/newfeeds/persist";

type ThreatPayload = {
  current?: { label?: string; level?: number };
};

export type SyncNewfeedsResult = {
  ok: boolean;
  fetchedAt: string;
  attackCount: number;
  iranAttackCount: number;
  iranNewsCount: number;
  persisted: { attacks: boolean; iranNews: boolean };
  error?: string;
};

async function fetchAttacksPayload(): Promise<NewfeedsAttacksPayload> {
  const [attacksRes, threatRes] = await Promise.all([
    fetch(NEWFEEDS_ATTACKS_URL, {
      headers: { Accept: "application/json", "User-Agent": "BraveNewWorld/newfeeds-ingest" },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    }),
    fetch(NEWFEEDS_THREAT_URL, {
      headers: { Accept: "application/json", "User-Agent": "BraveNewWorld/newfeeds-ingest" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null),
  ]);

  if (!attacksRes.ok) {
    throw new Error(`attacks.json HTTP ${attacksRes.status}`);
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
      threatLevel =
        typeof threat.current?.level === "number" ? threat.current.level : null;
    } catch {
      /* ignore */
    }
  }

  return {
    fetchedAt: new Date().toISOString(),
    live: true,
    attribution: NEWFEEDS_ATTRIBUTION,
    attributionUrl: NEWFEEDS_REPO_URL,
    threatLabel,
    threatLevel,
    attacks: mapped,
    iranCount: mapped.filter((a) => a.iranRelated).length,
  };
}

/** Cron / 워밍 — upstream pull 후 memory·D1에 적재. */
export async function syncNewfeedsIran(): Promise<SyncNewfeedsResult> {
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];

  let attackCount = 0;
  let iranAttackCount = 0;
  let iranNewsCount = 0;
  let attacksPersisted = false;
  let iranNewsPersisted = false;

  try {
    const attacks = await fetchAttacksPayload();
    setNewfeedsAttacksMemory(attacks);
    attackCount = attacks.attacks.length;
    iranAttackCount = attacks.iranCount;
    attacksPersisted = await saveNewfeedsSnapshot(
      NEWFEEDS_ATTACKS_CACHE_KEY,
      attacks,
      attackCount,
    );
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "attacks sync failed");
  }

  try {
    const news = await fetchNewfeedsIranNewsItemsFromUpstream(40);
    setNewfeedsIranNewsMemory(news, fetchedAt);
    iranNewsCount = news.length;
    iranNewsPersisted = await saveNewfeedsSnapshot(
      NEWFEEDS_IRAN_NEWS_CACHE_KEY,
      { fetchedAt, items: news },
      iranNewsCount,
    );
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "iran news sync failed");
  }

  const error = errors.length ? errors.join("; ") : undefined;
  if (error) setNewfeedsLastError(error);

  return {
    ok: attackCount > 0 || iranNewsCount > 0,
    fetchedAt,
    attackCount,
    iranAttackCount,
    iranNewsCount,
    persisted: { attacks: attacksPersisted, iranNews: iranNewsPersisted },
    error,
  };
}
