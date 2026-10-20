import {
  liveuaConfirmedStrike,
  liveuaGroundAssault,
} from "@/lib/liveuamap/confirmedStrike";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import type { NewsStreamItem } from "@/lib/news/types";
import {
  attachTier1RssToRows,
  filterTier1RssForTheater,
} from "@/lib/theaterReport/attachTier1Rss";
import {
  parseCasualties,
  parseMaterialDamage,
  placeLabelFromEvent,
} from "@/lib/theaterReport/parseIncidentFields";
import type {
  TheaterSitrepDoc,
  TheaterSitrepMode,
  TheaterSitrepPhoto,
  TheaterSitrepRegionId,
  TheaterSitrepRow,
} from "@/lib/theaterReport/types";

const REGION_TITLE: Record<
  TheaterSitrepRegionId,
  { ko: string; en: string }
> = {
  ukraine: {
    ko: "우크라이나–러시아 전황 보고서",
    en: "Ukraine–Russia Theater Sitrep",
  },
  iran: {
    ko: "이란–페르시아만 전황 보고서",
    en: "Iran–Persian Gulf Theater Sitrep",
  },
  yemen: {
    ko: "홍해–예멘 전황 보고서",
    en: "Red Sea–Yemen Theater Sitrep",
  },
};

function eventText(event: LiveuamapEvent): string {
  return [event.title, event.body, event.titleKo, event.bodyKo]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join("\n");
}

function displayTitle(event: LiveuamapEvent, lang: "ko" | "en"): string {
  if (lang === "ko") return event.titleKo?.trim() || event.title;
  return event.title;
}

function classifyKind(event: LiveuamapEvent): TheaterSitrepRow["kind"] {
  const strike = liveuaConfirmedStrike(event);
  if (strike) return strike.kind;
  if (liveuaGroundAssault(event)) return "ground";
  return "other";
}

function isAttackish(event: LiveuamapEvent): boolean {
  if (liveuaConfirmedStrike(event) || liveuaGroundAssault(event)) return true;
  const text = eventText(event);
  return /\b(?:struck|strike|attack|airstrike|explosion|blast|hit)\b|타격|피격|공격|공습|폭발|폭격/i.test(
    text,
  );
}

function resolveMode(
  rowCount: number,
  rssCount: number,
): TheaterSitrepMode {
  if (rowCount >= 1) return "liveua+rss";
  if (rssCount >= 1) return "rss-brief";
  return "empty";
}

export function buildTheaterSitrep(input: {
  regionId: TheaterSitrepRegionId;
  events: LiveuamapEvent[];
  /** hero + verified 등 — 함수 안에서 trustTier===1만 사용 */
  rssItems?: NewsStreamItem[];
  windowHours?: number;
  nowMs?: number;
  lang?: "ko" | "en";
}): TheaterSitrepDoc {
  const windowHours = input.windowHours ?? 72;
  const nowMs = input.nowMs ?? Date.now();
  const cutoff = nowMs - windowHours * 3600_000;
  const lang = input.lang ?? "ko";

  const inWindow = input.events
    .filter((e) => e.regionId === input.regionId)
    .filter((e) => {
      const t = Date.parse(e.publishedAt);
      return Number.isFinite(t) && t >= cutoff;
    })
    .filter(isAttackish)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const baseRows: TheaterSitrepRow[] = inWindow.map((event) => {
    const text = eventText(event);
    const casualties = parseCasualties(text);
    const title = displayTitle(event, lang);
    return {
      id: event.id,
      occurredAt: event.publishedAt,
      place: placeLabelFromEvent({
        title,
        lat: event.lat,
        lng: event.lng,
      }),
      kind: classifyKind(event),
      killed: casualties.killed,
      wounded: casualties.wounded,
      materialDamage: parseMaterialDamage(text),
      title,
      sourceUrl: event.sourceUrl,
      imageUrl: event.imageUrl?.trim() || null,
      viaSource: event.viaSource ?? null,
    };
  });

  const tier1 = filterTier1RssForTheater({
    regionId: input.regionId,
    items: input.rssItems ?? [],
    cutoffMs: cutoff,
    nowMs,
  });

  const { rows, theaterRefs } = attachTier1RssToRows({
    rows: baseRows,
    rssItems: tier1,
  });

  const mode = resolveMode(rows.length, tier1.length);

  const photos: TheaterSitrepPhoto[] = [];
  const seenPhoto = new Set<string>();
  if (mode === "liveua+rss") {
    for (const row of rows) {
      if (!row.imageUrl || seenPhoto.has(row.imageUrl)) continue;
      seenPhoto.add(row.imageUrl);
      photos.push({
        id: row.id,
        imageUrl: row.imageUrl,
        caption: row.place,
        sourceUrl: row.sourceUrl,
        occurredAt: row.occurredAt,
      });
      if (photos.length >= 12) break;
    }
  }

  const withKilled = rows.filter((r) => r.killed != null).length;
  const withPhoto = rows.filter((r) => r.imageUrl).length;
  const rowLinked = rows.reduce((n, r) => n + (r.rssRefs?.length ?? 0), 0);
  const titles = REGION_TITLE[input.regionId];

  const liveuaLimitKo =
    "Liveuamap은 최근 피드 기준이라 창 밖·삭제 항목은 없을 수 있습니다.";
  const liveuaLimitEn =
    "Liveuamap is a recent feed — items outside the window may be missing.";

  let coverageNoteKo: string;
  let coverageNoteEn: string;
  if (mode === "empty") {
    coverageNoteKo = `${windowHours}시간 창 · LiveUA 공격 행 0 · Tier 1 RSS 0. ${liveuaLimitKo}`;
    coverageNoteEn = `${windowHours}h window · no LiveUA attack rows · no Tier 1 RSS. ${liveuaLimitEn}`;
  } else if (mode === "rss-brief") {
    coverageNoteKo = `${windowHours}시간 창 · LiveUA 없음 → Tier 1 RSS 참고 ${tier1.length}건만 (RSS-brief). 좌표·사상은 채우지 않음. ${liveuaLimitKo}`;
    coverageNoteEn = `${windowHours}h window · no LiveUA → Tier 1 RSS brief (${tier1.length}). No coords/casualties from RSS. ${liveuaLimitEn}`;
  } else {
    coverageNoteKo = `${windowHours}시간 창 · LiveUA 공격 ${rows.length}건 · 사망 명시 ${withKilled} · 사진 ${withPhoto} · Tier 1 RSS ${tier1.length}건 (행 연결 ${rowLinked} / 전황 목록 ${theaterRefs.length}). 수치는 LiveUA 원문만. ${liveuaLimitKo}`;
    coverageNoteEn = `${windowHours}h · LiveUA attacks ${rows.length} · killed stated ${withKilled} · photos ${withPhoto} · Tier 1 RSS ${tier1.length} (row-linked ${rowLinked} / theater list ${theaterRefs.length}). Figures from LiveUA text only. ${liveuaLimitEn}`;
  }

  const attributionParts = [
    "Liveuamap — frontline OSINT (approximate geolocation). https://liveuamap.com/",
  ];
  if (tier1.length > 0) {
    attributionParts.push("Tier 1 RSS — reference links only (news-stream verified).");
  }

  return {
    regionId: input.regionId,
    mode,
    windowHours,
    generatedAt: new Date(nowMs).toISOString(),
    titleKo: titles.ko,
    titleEn: titles.en,
    rows: mode === "rss-brief" || mode === "empty" ? [] : rows,
    photos,
    rssTheaterRefs:
      mode === "rss-brief"
        ? tier1.map((item) => ({
            id: item.id,
            title: item.titleKo?.trim() || item.title,
            sourceName: item.publisher?.trim() || item.source,
            url: item.link,
            occurredAt: item.pubDate || null,
            trustTier: 1 as const,
            link: "theater" as const,
          }))
        : theaterRefs,
    attribution: attributionParts.join(" "),
    coverageNoteKo,
    coverageNoteEn,
  };
}
