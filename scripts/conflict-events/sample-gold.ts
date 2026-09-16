/**
 * 골든 픽스처 평가 + 선택적 라이브 뉴스 샘플 병합.
 *
 *   npx tsx scripts/conflict-events/sample-gold.ts
 *   npx tsx scripts/conflict-events/sample-gold.ts --live
 *   npx tsx scripts/conflict-events/sample-gold.ts --live --base=http://127.0.0.1:3000
 *
 * --live: /api/news-stream 등에서 헤드라인을 뽑아 전장별 후보 JSON을 추가 저장.
 * 저장 골든은 fixtures/conflict-extract-gold.json 이 정본이고, 라이브는 보강용.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractRawConflictEvents, type ExtractableItem } from "../../src/lib/conflictEvents/extractRawEvents";
import { auditExtraction, type ExtractionGold } from "../../src/lib/conflictEvents/evaluateExtraction";
import { CONFLICT_THEATER_META, CONFLICT_THEATER_ORDER } from "../../src/lib/conflictEvents/theaterMeta";
import type { ConflictTheater } from "../../src/lib/conflictEvents/types";
import { matchGazetteer } from "../../src/lib/geo/gazetteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const goldPath = path.join(root, "src/lib/conflictEvents/fixtures/conflict-extract-gold.json");
const liveOutPath = path.join(root, "src/lib/conflictEvents/fixtures/conflict-extract-live-candidates.json");

type GoldFile = {
  version: number;
  items: Array<
    ExtractableItem & {
      expectLocated: boolean;
      expectPlaceId?: string;
      expectTheater?: ConflictTheater;
    }
  >;
};

function parseArgs(argv: string[]) {
  const live = argv.includes("--live");
  const baseArg = argv.find((a) => a.startsWith("--base="));
  const base = baseArg?.slice("--base=".length) || process.env.CONFLICT_GOLD_BASE || "http://127.0.0.1:3000";
  return { live, base };
}

async function fetchLiveCandidates(base: string): Promise<ExtractableItem[]> {
  const urls = [`${base.replace(/\/$/, "")}/api/news-stream`];
  const out: ExtractableItem[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        console.warn(`[live] ${url} → HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as {
        hero?: { id: string; title: string; snippet?: string; sourceName?: string; sourceUrl?: string; publishedAt?: string };
        verified?: Array<{ id: string; title: string; snippet?: string; sourceName?: string; sourceUrl?: string; publishedAt?: string }>;
        stateMedia?: Array<{ id: string; title: string; snippet?: string; sourceName?: string; sourceUrl?: string; publishedAt?: string }>;
        items?: Array<{ id: string; title: string; snippet?: string; sourceName?: string; sourceUrl?: string; publishedAt?: string }>;
      };
      const bag = [
        ...(json.hero ? [json.hero] : []),
        ...(json.verified ?? []),
        ...(json.stateMedia ?? []),
        ...(json.items ?? []),
      ];
      for (const row of bag) {
        if (!row?.id || !row?.title) continue;
        out.push({
          id: `live-${row.id}`,
          title: row.title,
          snippet: row.snippet ?? "",
          sourceName: row.sourceName ?? "live",
          sourceUrl: row.sourceUrl ?? null,
          occurredAt: row.publishedAt ?? null,
          trustTier: 1,
          channel: "rss",
        });
      }
      console.log(`[live] ${url} → ${bag.length} headlines`);
    } catch (err) {
      console.warn(`[live] ${url} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return out;
}

function theaterHint(item: ExtractableItem): ConflictTheater | null {
  return matchGazetteer(`${item.title} ${item.snippet ?? ""}`)?.theater ?? null;
}

function main() {
  return (async () => {
    const { live, base } = parseArgs(process.argv.slice(2));
    const gold = JSON.parse(fs.readFileSync(goldPath, "utf8")) as GoldFile;
    const extractables: ExtractableItem[] = gold.items.map(
      ({ expectLocated: _e, expectPlaceId: _p, expectTheater: _t, ...rest }) => rest,
    );
    const goldLabels: ExtractionGold[] = gold.items.map((row) => ({
      id: row.id,
      expectLocated: row.expectLocated,
      expectPlaceId: row.expectPlaceId,
      expectTheater: row.expectTheater,
    }));

    const extracted = extractRawConflictEvents(extractables);
    const audit = auditExtraction(extracted, goldLabels);
    const byTheater: Record<string, number> = {};
    for (const t of CONFLICT_THEATER_ORDER) byTheater[t] = 0;
    for (const ev of extracted) {
      if (ev.theater && ev.lat != null) byTheater[ev.theater] = (byTheater[ev.theater] ?? 0) + 1;
    }

    console.log(`\n[gold] items=${gold.items.length} located=${audit.locatedCount}`);
    console.log(
      `[gold] matchRate=${(audit.matchRate * 100).toFixed(1)}% fp=${(audit.falsePositiveRate * 100).toFixed(1)}%`,
    );
    console.log("[gold] located by theater:");
    for (const t of CONFLICT_THEATER_ORDER) {
      const q = CONFLICT_THEATER_META[t].goldQuota;
      console.log(`  ${t.padEnd(14)} ${String(byTheater[t] ?? 0).padStart(3)} / quota ${q}`);
    }
    const fails = audit.rows.filter((r) => r.goldOk === false);
    if (fails.length) {
      console.log(`\n[gold] FAIL ${fails.length}:`);
      for (const f of fails.slice(0, 20)) {
        console.log(`  ${f.id} place=${f.placeId} theater=${f.theater} :: ${f.title}`);
      }
    }

    if (live) {
      const liveItems = await fetchLiveCandidates(base);
      const liveExtracted = extractRawConflictEvents(liveItems);
      const buckets: Record<string, ExtractableItem[]> = Object.fromEntries(
        CONFLICT_THEATER_ORDER.map((t) => [t, [] as ExtractableItem[]]),
      );
      const unplaced: ExtractableItem[] = [];
      for (const item of liveItems) {
        const hint = theaterHint(item);
        if (hint) buckets[hint].push(item);
        else unplaced.push(item);
      }
      const payload = {
        fetchedAt: new Date().toISOString(),
        base,
        counts: {
          headlines: liveItems.length,
          extracted: liveExtracted.length,
          located: liveExtracted.filter((e) => e.lat != null).length,
          byTheater: Object.fromEntries(
            CONFLICT_THEATER_ORDER.map((t) => [
              t,
              liveExtracted.filter((e) => e.theater === t && e.lat != null).length,
            ]),
          ),
        },
        candidatesByTheater: buckets,
        unplacedSample: unplaced.slice(0, 40),
      };
      fs.writeFileSync(liveOutPath, JSON.stringify(payload, null, 2));
      console.log(`\n[live] wrote ${liveOutPath}`);
      console.log(`[live] combine: review candidates → promote into conflict-extract-gold.json`);
    }

    if (fails.length) process.exitCode = 1;
  })();
}

void main();
