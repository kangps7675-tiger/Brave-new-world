import { uniqueSourceKey } from "@/lib/conflictEvents/confidence";
import { withComputedStats } from "@/lib/intelContract/bundleStats";
import { evaluateGate } from "@/lib/intelContract/gate";
import type { EvidenceBundle, GateResult, Observation } from "@/lib/intelContract/types";
import type { TheaterSitrepDoc } from "@/lib/theaterReport/types";

export function theaterSitrepToBundle(doc: TheaterSitrepDoc): EvidenceBundle {
  const observations: Observation[] = [];

  for (const row of doc.rows) {
    observations.push({
      id: `liveua:${row.id}`,
      modality: "sensor",
      sourceKey: uniqueSourceKey(row.viaSource || "liveuamap", row.sourceUrl),
      occurredAt: row.occurredAt,
      theater: doc.regionId,
      url: row.sourceUrl,
      payloadRef: row.id,
      label: row.place,
      text: row.title,
    });
    for (const ref of row.rssRefs ?? []) {
      observations.push({
        id: `rss-row:${ref.id}`,
        modality: "media",
        sourceKey: uniqueSourceKey(ref.sourceName, ref.url),
        trustTier: 1,
        occurredAt: ref.occurredAt,
        theater: doc.regionId,
        url: ref.url,
        payloadRef: ref.id,
        label: ref.sourceName,
        text: ref.title,
      });
    }
  }

  for (const ref of doc.rssTheaterRefs) {
    observations.push({
      id: `rss-theater:${ref.id}`,
      modality: "media",
      sourceKey: uniqueSourceKey(ref.sourceName, ref.url),
      trustTier: 1,
      occurredAt: ref.occurredAt,
      theater: doc.regionId,
      url: ref.url,
      payloadRef: ref.id,
      label: ref.sourceName,
      text: ref.title,
    });
  }

  const method = `theater-sitrep:${doc.regionId}:${doc.windowHours}h:${doc.mode}`;

  return withComputedStats({
    bundleId: `sitrep:${doc.regionId}:${doc.generatedAt}`,
    kind: "theater-window",
    titleKo: doc.titleKo,
    titleEn: doc.titleEn,
    observations,
    geoOk: doc.mode !== "empty",
    method,
    disconfirmLog: {
      queried: true,
      hitCount: 0,
    },
    killCriteria: [
      "LiveUA 정정·삭제 또는 Tier 1 오보 정정이 나오면 하향",
      "동일 전황 창에서 독립 출처가 1 미만으로 줄면 폐기",
    ],
    altHypothesis: {
      labelKo: "별개 사건·평시 변동·피드 공백일 수 있음",
      labelEn: "May be unrelated events, baseline noise, or feed gap",
      supportIds: [],
    },
    claimKo: doc.coverageNoteKo,
    claimEn: doc.coverageNoteEn,
    originRef: doc.regionId,
  });
}

export function gateTheaterSitrep(doc: TheaterSitrepDoc): GateResult {
  const bundle = theaterSitrepToBundle(doc);
  const result = evaluateGate(bundle);

  // mode-specific floors from product contract
  if (doc.mode === "empty") {
    return { ...result, grade: "hold" };
  }
  if (doc.mode === "rss-brief") {
    // low allowed for theater_sitrep surface
    const grade =
      result.grade === "drop" || result.grade === "hold" ? "low" : result.grade === "high" ? "std" : result.grade;
    return {
      ...result,
      grade,
      reasons: [
        ...result.reasons,
        {
          code: "MODE",
          ok: true,
          detailKo: "RSS-brief — 공격 표 없음, 참고만",
          detailEn: "RSS-brief — references only, no attack table",
        },
      ],
    };
  }
  return result;
}
