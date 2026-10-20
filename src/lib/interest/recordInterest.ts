/**
 * 관심 신호 기록 헬퍼 — UI에서 debounce 없이 호출해도 스토어가 상한 관리.
 * 호버는 호출하지 말 것.
 */

import type { Selection } from "@/components/globe/types";
import { appendInterestSignal } from "@/lib/interest/interestStore";
import { newsTheaterFromCoords } from "@/lib/news/theaterMap";
import type { InterestKind } from "@/lib/interest/interestTypes";

let lastKey = "";
let lastAt = 0;
const DEDUPE_MS = 300;

function record(
  kind: InterestKind,
  id: string,
  opts?: { label?: string; weight?: number; meta?: InterestSignalMeta },
): void {
  const key = `${kind}:${id}`;
  const now = Date.now();
  if (key === lastKey && now - lastAt < DEDUPE_MS) return;
  lastKey = key;
  lastAt = now;
  appendInterestSignal({
    kind,
    id,
    label: opts?.label,
    weight: opts?.weight ?? 1,
    meta: opts?.meta,
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cv-interest-updated"));
  }
}

type InterestSignalMeta = Record<string, string | number | boolean | null | undefined>;

export function recordInterestTheater(
  id: string,
  label?: string,
  weight = 1.2,
): void {
  record("theater", id, { label, weight });
}

export function recordInterestTheme(id: string, label?: string, weight = 1): void {
  record("theme", id, { label, weight });
}

export function recordInterestMode(mode: string): void {
  record("mode", mode, { weight: 0.8 });
}

export function recordInterestSymbol(symbol: string): void {
  record("symbol", symbol, { label: symbol, weight: 1.4 });
}

export function recordInterestNews(id: string, label?: string): void {
  record("news", id, { label, weight: 1.1 });
}

export function recordInterestEntity(
  id: string,
  label?: string,
  weight = 1,
): void {
  record("entity", id, { label, weight });
}

/** 분석 패널 선택 → 관심 신호 */
export function recordInterestFromSelection(selection: Selection): void {
  switch (selection.kind) {
    case "dispute": {
      const d = selection.item;
      const theater = newsTheaterFromCoords(d.center.lat, d.center.lng);
      recordInterestTheater(theater, d.name || d.nameLong || theater, 1.5);
      recordInterestEntity(`dispute:${d.id}`, d.name || d.id, 0.6);
      break;
    }
    case "conflict-zone": {
      const z = selection.item;
      const theater = newsTheaterFromCoords(z.center.lat, z.center.lng);
      recordInterestTheater(theater, z.name || theater, 1.3);
      break;
    }
    case "country": {
      const c = selection.item;
      recordInterestEntity(`country:${c.id}`, c.name, 0.9);
      break;
    }
    case "event": {
      const e = selection.item;
      const theater = newsTheaterFromCoords(e.lat, e.lng);
      recordInterestTheater(theater, e.title || theater, 1.1);
      break;
    }
    case "ais": {
      const v = selection.item;
      recordInterestTheme("ais", "AIS", 1.2);
      recordInterestEntity(
        `ais:${v.mmsi}`,
        v.shipName || v.mmsi,
        v.category === "military" ? 1.3 : 0.9,
      );
      break;
    }
    case "us-carrier": {
      const c = selection.item;
      recordInterestTheme("carriers", "US carriers", 1.3);
      recordInterestEntity(`carrier:${c.id}`, c.name, 1.4);
      break;
    }
    case "recon-sat": {
      const s = selection.item;
      recordInterestTheme("recon-satellites", "Recon satellites", 1.2);
      recordInterestEntity(`recon-sat:${s.markerId}`, s.name, 1.3);
      break;
    }
    case "mil": {
      const a = selection.item;
      if (selection.traffic === "civil") {
        recordInterestTheme("airTraffic", "Air traffic", 1);
      } else {
        recordInterestTheme("military", "Mil aircraft", 1.2);
      }
      recordInterestEntity(`mil:${a.hex || a.id}`, a.callsign || a.hex, 0.8);
      break;
    }
    case "ukraine-control": {
      recordInterestTheater("russia-ukraine", "Ukraine", 1.2);
      break;
    }
    case "neptun-threat": {
      recordInterestTheater("russia-ukraine", "NEPTUN", 1.1);
      break;
    }
    default:
      break;
  }
}
