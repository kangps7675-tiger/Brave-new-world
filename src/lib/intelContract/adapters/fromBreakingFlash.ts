import { uniqueSourceKey } from "@/lib/conflictEvents/confidence";
import type { AdapterDisconfirmOpts } from "@/lib/intelContract/adapterOpts";
import { withComputedStats } from "@/lib/intelContract/bundleStats";
import { resolveDisconfirmLog } from "@/lib/intelContract/disconfirmPass";
import { evaluateGate } from "@/lib/intelContract/gate";
import type { EvidenceBundle, GateResult, Observation } from "@/lib/intelContract/types";
import { classifyLiveuaOrigin, type LiveuaOrigin } from "@/lib/liveuamap/originSource";
import type { HeroBreakingItem } from "@/lib/news/types";

function liveuaOriginOfHero(hero: HeroBreakingItem): LiveuaOrigin | null {
  if (hero.flashSource !== "liveuamap") return null;
  return classifyLiveuaOrigin({ sourceUrl: hero.link, viaSource: hero.viaSource });
}

export function breakingHeroToBundle(
  hero: HeroBreakingItem,
  opts?: AdapterDisconfirmOpts,
): EvidenceBundle {
  const geo =
    hero.lat != null && hero.lng != null
      ? { lat: hero.lat, lng: hero.lng, precision: "point" as const }
      : undefined;
  const origin = liveuaOriginOfHero(hero);

  const observations: Observation[] = [
    {
      id: hero.id,
      modality: origin && origin.kind !== "media" ? "tip" : "media",
      sourceKey: origin ? origin.sourceKey : uniqueSourceKey(hero.source, hero.link),
      trustTier: origin && origin.kind !== "media" ? null : hero.trustTier,
      occurredAt: hero.pubDate,
      theater: hero.theater,
      url: hero.link,
      payloadRef: hero.id,
      label: hero.source,
      text: hero.title,
      geo,
    },
  ];

  if (origin) {
    // LiveUA가 찍은 좌표 — 위치 근거일 뿐 사건을 한 번 더 확인해 주지 않는다
    observations.push({
      id: `${hero.id}:pin`,
      modality: "sensor",
      sourceKey: "liveuamap-pin",
      occurredAt: hero.pubDate,
      payloadRef: `${hero.id}:pin`,
      label: "liveuamap-pin",
      geo,
      countsTowardIndependence: false,
    });
  } else if (hero.breakingRank === "S" || hero.breakingRank === "A") {
    // high-urgency RSS: allow second synthetic from grade channel as stat (not tip)
    observations.push({
      id: `${hero.id}:rank`,
      modality: "stat",
      sourceKey: `breaking-rank:${hero.breakingRank}`,
      occurredAt: hero.pubDate,
      payloadRef: `${hero.id}:rank`,
      label: `rank-${hero.breakingRank}`,
      text: `urgency=${hero.urgencyScore}`,
    });
  }

  const titleKo = hero.titleKo?.trim() || hero.title;
  const disconfirmLog = resolveDisconfirmLog({
    claimText: `${titleKo} ${hero.title} ${hero.summary ?? ""}`,
    disconfirmLog: opts?.disconfirmLog,
    disconfirmCorpus: opts?.disconfirmCorpus,
    excludeIds: [hero.id, `${hero.id}:pin`, `${hero.id}:rank`],
    windowHours: opts?.windowHours,
    nowMs: opts?.nowMs,
  });

  return withComputedStats({
    bundleId: `breaking:${hero.id}`,
    kind: "incident",
    titleKo,
    titleEn: hero.title,
    observations,
    geoOk: true,
    method: `breakingFlash:rank=${hero.breakingRank}:tier=${hero.trustTier}`,
    disconfirmLog,
    killCriteria: [
      "원문 정정·철회 시 타전 중단",
      "동일 사건 중복 타전은 세션 큐에서 병합",
    ],
    altHypothesis: {
      labelKo: "미확인·과장 보도일 수 있음",
      labelEn: "May be unverified or overstated reporting",
      supportIds: [],
    },
    claimKo: titleKo,
    claimEn: hero.title,
    originRef: hero.id,
  });
}

export function gateBreakingHero(
  hero: HeroBreakingItem,
  opts?: AdapterDisconfirmOpts,
): GateResult {
  const result = evaluateGate(breakingHeroToBundle(hero, opts));
  // 반증 히트·미탐색이면 FLASH 승격 금지
  const disc = result.bundle.disconfirmLog;
  const disconfirmBlocks =
    !disc.queried || disc.hitCount > 0;

  const origin = liveuaOriginOfHero(hero);
  if (origin) {
    // LiveUA 핀 단독은 원래 출처가 T1이어도 출처 1곳 — 단일 공식 발표처럼 low가 상한
    if (origin.kind !== "media") return result;
    const grade =
      result.grade === "drop" && !disconfirmBlocks
        ? "low"
        : result.grade === "std" || result.grade === "high"
          ? "low"
          : result.grade;
    if (grade === result.grade) return result;
    return {
      ...result,
      grade,
      reasons: [
        ...result.reasons,
        {
          code: "LIVEUA",
          ok: true,
          detailKo: `LiveUA 핀 · 원래 출처 ${origin.label} 1곳 — low 상한`,
          detailEn: `LiveUA pin · single origin ${origin.label} → low cap`,
        },
      ],
    };
  }
  // Single-source RSS S/A often lands low — allow std if trustTier 1 and rank S/A
  if (
    !disconfirmBlocks &&
    (result.grade === "low" || result.grade === "drop") &&
    hero.trustTier === 1 &&
    (hero.breakingRank === "S" || hero.breakingRank === "A")
  ) {
    return {
      ...result,
      grade: "std",
      reasons: [
        ...result.reasons,
        {
          code: "FLASH",
          ok: true,
          detailKo: "T1 + S/A 속보 — 타전 std 승격",
          detailEn: "T1 + S/A flash — elevate to std",
        },
      ],
    };
  }
  return result;
}
