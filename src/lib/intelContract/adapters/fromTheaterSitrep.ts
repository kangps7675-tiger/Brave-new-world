import { uniqueSourceKey } from "@/lib/conflictEvents/confidence";
import type { AdapterDisconfirmOpts } from "@/lib/intelContract/adapterOpts";
import { withComputedStats } from "@/lib/intelContract/bundleStats";
import {
  candidatesFromNewsLike,
  resolveDisconfirmLog,
} from "@/lib/intelContract/disconfirmPass";
import { evaluateGate } from "@/lib/intelContract/gate";
import type { EvidenceBundle, GateResult, Observation } from "@/lib/intelContract/types";
import type { TheaterSitrepDoc } from "@/lib/theaterReport/types";

export function theaterSitrepToBundle(
  doc: TheaterSitrepDoc,
  opts?: AdapterDisconfirmOpts,
): EvidenceBundle {
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
  const claim = `${doc.titleKo} ${doc.coverageNoteKo}`;
  // 외부 corpus 없으면 문서 안 텍스트라도 스캔 — 그래도 후보 0이면 queried true·hits 0
  const selfCorpus = candidatesFromNewsLike(
    observations.map((o) => ({
      id: o.id,
      title: o.text,
      occurredAt: o.occurredAt,
    })),
  );
  const disconfirmLog = resolveDisconfirmLog({
    claimText: claim,
    disconfirmLog: opts?.disconfirmLog,
    disconfirmCorpus:
      opts?.disconfirmCorpus !== undefined
        ? opts.disconfirmCorpus
        : selfCorpus,
    excludeIds: [],
    windowHours: opts?.windowHours ?? doc.windowHours,
    nowMs: opts?.nowMs,
  });

  return withComputedStats({
    bundleId: `sitrep:${doc.regionId}:${doc.generatedAt}`,
    kind: "theater-window",
    titleKo: doc.titleKo,
    titleEn: doc.titleEn,
    observations,
    geoOk: doc.mode !== "empty",
    method,
    disconfirmLog,
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

export function gateTheaterSitrep(
  doc: TheaterSitrepDoc,
  opts?: AdapterDisconfirmOpts,
): GateResult {
  const bundle = theaterSitrepToBundle(doc, opts);
  const result = evaluateGate(bundle);

  if (doc.mode === "empty") {
    return { ...result, grade: "hold" };
  }
  if (doc.mode === "rss-brief") {
    const grade =
      result.grade === "drop" || result.grade === "hold"
        ? "low"
        : result.grade === "high"
          ? "std"
          : result.grade;
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
