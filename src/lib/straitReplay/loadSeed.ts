import fs from "fs";
import path from "path";
import { assertValidSeedEvents } from "@/lib/straitReplay/eventSchema";
import type { StraitEvent, StraitId, TrafficDay } from "@/lib/straitReplay/types";
import { STRAIT_IDS } from "@/lib/straitReplay/types";

function seedDir(): string {
  return path.join(process.cwd(), "data", "straitEvents");
}

export function loadSeedEventsForStrait(straitId: StraitId): StraitEvent[] {
  const file = path.join(seedDir(), `${straitId}.json`);
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  return assertValidSeedEvents(raw).filter((e) => e.straitId === straitId);
}

export function loadAllSeedEvents(): StraitEvent[] {
  return STRAIT_IDS.flatMap((id) => loadSeedEventsForStrait(id));
}

/** 파이프라인 스모크용 — 사건일 전후 ±28일 합성 통행 (isSynthetic 표기). */
export function buildSyntheticTrafficForEvent(
  event: StraitEvent,
): TrafficDay[] {
  const vintage = new Date().toISOString();
  const out: TrafficDay[] = [];
  const base = event.straitId === "hormuz" ? 120 : event.straitId === "malacca" ? 200 : 80;
  const eventTime = new Date(`${event.occurredOn}T00:00:00.000Z`).getTime();
  for (let i = -28; i <= 14; i++) {
    const d = new Date(eventTime);
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    const dip = i >= 1 && i <= 7 ? 0.72 : i > 7 ? 0.88 : 1;
    out.push({
      straitId: event.straitId,
      date,
      vesselCount: Math.round(base * dip + (i % 5)),
      tankerCount: null,
      capacityDwt: null,
      sourceVintage: vintage,
    });
  }
  return out;
}

export function mergeTrafficDays(rows: TrafficDay[]): TrafficDay[] {
  const map = new Map<string, TrafficDay>();
  for (const r of rows) {
    map.set(`${r.straitId}|${r.date}`, r);
  }
  return [...map.values()].sort((a, b) =>
    a.straitId === b.straitId
      ? a.date < b.date
        ? -1
        : 1
      : a.straitId < b.straitId
        ? -1
        : 1,
  );
}
