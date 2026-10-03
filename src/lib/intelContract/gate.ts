import { independenceEligible } from "@/lib/intelContract/bundleStats";
import type {
  DisplayGrade,
  EvidenceBundle,
  GateReason,
  GateResult,
  Observation,
} from "@/lib/intelContract/types";

function reason(
  code: string,
  ok: boolean,
  detailKo: string,
  detailEn: string,
): GateReason {
  return { code, ok, detailKo, detailEn };
}

function modalities(obs: Observation[]): Set<string> {
  return new Set(obs.map((o) => o.modality));
}

function independentKeys(obs: Observation[]): Set<string> {
  return new Set(obs.map((o) => o.sourceKey).filter(Boolean));
}

/** UKMTO·NAVAREA 등 단일 공식/경보 — Watchboard 얇음만 허용 */
function isSoleOfficialOrAlert(obs: Observation[]): boolean {
  const eligible = independenceEligible(obs);
  if (eligible.length === 0) return false;
  const keys = independentKeys(eligible);
  if (keys.size !== 1) return false;
  return eligible.every((o) => o.modality === "alert" || o.modality === "official");
}

function allTip(obs: Observation[]): boolean {
  return obs.length > 0 && obs.every((o) => o.modality === "tip");
}

function mediaOnly(obs: Observation[]): boolean {
  return obs.length > 0 && obs.every((o) => o.modality === "media");
}

function t3OnlyMedia(obs: Observation[]): boolean {
  const media = obs.filter((o) => o.modality === "media");
  if (media.length === 0) return false;
  return media.every((o) => o.trustTier === 3);
}

function capGrade(current: DisplayGrade, max: DisplayGrade): DisplayGrade {
  const order: DisplayGrade[] = ["drop", "hold", "low", "std", "high"];
  return order[Math.min(order.indexOf(current), order.indexOf(max))]!;
}

/**
 * G0–G9 심사. G10(fatigue)은 UI/큐에서 처리.
 */
export function evaluateGate(bundle: EvidenceBundle): GateResult {
  const reasons: GateReason[] = [];
  const obs = bundle.observations;
  let grade: DisplayGrade = "high";

  // G0
  const g0 = obs.length >= 1 && Boolean(bundle.method?.trim());
  reasons.push(
    reason(
      "G0",
      g0,
      g0 ? "스키마·method 충족" : "observations 또는 method 없음",
      g0 ? "schema+method ok" : "missing observations or method",
    ),
  );
  if (!g0) {
    return { grade: "drop", reasons, bundle };
  }

  // 독립성·모달리티는 어댑터 스캐폴드(countsTowardIndependence: false) 제외
  const eligible = independenceEligible(obs);
  const scored = eligible.length > 0 ? eligible : obs;
  const independenceCount = independentKeys(eligible).size;
  const modalityCount = modalities(eligible).size;

  // G2 tip-only (실측 관측 기준)
  if (allTip(scored)) {
    reasons.push(
      reason("G2", false, "tip 단독 — Pass 불가", "tip-only cannot pass"),
    );
    return {
      grade: "hold",
      reasons: [
        ...reasons,
        reason("G1", false, "tip 단독으로 독립성 미달", "tip-only independence fail"),
      ],
      bundle,
    };
  }
  reasons.push(reason("G2", true, "tip 단독 아님", "not tip-only"));

  // G1 independence (어댑터 스캐폴드 제외)
  const g1 =
    independenceCount >= 2 || (modalityCount >= 2 && independenceCount >= 1);
  reasons.push(
    reason(
      "G1",
      g1,
      g1
        ? `독립 ${independenceCount} · 모달리티 ${modalityCount}`
        : `독립성 부족 (indep=${independenceCount}, mod=${modalityCount})`,
      g1
        ? `indep ${independenceCount} · modality ${modalityCount}`
        : `insufficient independence (indep=${independenceCount}, mod=${modalityCount})`,
    ),
  );
  if (!g1) {
    // 단일 UKMTO·NAVAREA 등 alert/official 1건 → drop 대신 low(얇음)
    // Watchboard만, economy_alert / map_hero(std+)는 불가
    if (isSoleOfficialOrAlert(obs)) {
      reasons.push(
        reason(
          "G1-official",
          true,
          "단일 공식·경보 — low(얇음) 캡",
          "sole official/alert → low cap",
        ),
      );
      grade = "low";
    } else {
      return { grade: "drop", reasons, bundle };
    }
  }

  // G4 geo
  reasons.push(
    reason(
      "G4",
      bundle.geoOk,
      bundle.geoOk ? "시공간 창 통과" : "시공간 불일치",
      bundle.geoOk ? "geo/time window ok" : "geo/time window failed",
    ),
  );
  if (!bundle.geoOk) {
    return { grade: "drop", reasons, bundle };
  }

  // G5 claim — 빈 claim은 ok (표만인 경우); claim 있으면 observations≥1로 갈음
  const hasClaim = Boolean(bundle.claimKo?.trim() || bundle.claimEn?.trim());
  const g5 = !hasClaim || obs.length >= 1;
  reasons.push(
    reason(
      "G5",
      g5,
      g5 ? "주장·근거 포함 관계 유지" : "인용 없는 주장",
      g5 ? "claim⊆evidence" : "unsupported claim",
    ),
  );
  if (!g5) return { grade: "drop", reasons, bundle };

  // G3 media quality (스캐폴드 제외)
  if (t3OnlyMedia(scored) && mediaOnly(scored)) {
    reasons.push(
      reason("G3", false, "T3 매체만 — low 캡", "T3-only media → low cap"),
    );
    grade = capGrade(grade, "low");
  } else if (mediaOnly(scored)) {
    reasons.push(
      reason("G3", true, "매체만 — high 금지", "media-only → no high"),
    );
    grade = capGrade(grade, "std");
  } else {
    reasons.push(reason("G3", true, "이질 채널 또는 비-T3", "mixed or non-T3 media"));
  }

  // G6 disconfirm
  if (!bundle.disconfirmLog.queried) {
    reasons.push(
      reason("G6", false, "반증 탐색 없음 — low 캡", "no disconfirm pass → low"),
    );
    grade = capGrade(grade, "low");
  } else {
    reasons.push(
      reason(
        "G6",
        true,
        `반증 탐색함 (hits=${bundle.disconfirmLog.hitCount})`,
        `disconfirm queried (hits=${bundle.disconfirmLog.hitCount})`,
      ),
    );
  }

  // G7 alt hypothesis for std+
  if (!bundle.altHypothesis) {
    reasons.push(
      reason("G7", false, "대안 가설 없음 — low 캡", "no alt hypothesis → low"),
    );
    grade = capGrade(grade, "low");
  } else {
    reasons.push(reason("G7", true, "대안 가설 있음", "alt hypothesis present"));
  }

  // G8 kill criteria
  if (bundle.killCriteria.length < 1) {
    reasons.push(
      reason("G8", false, "kill criteria 없음 — low 캡", "no kill criteria → low"),
    );
    grade = capGrade(grade, "low");
  } else {
    reasons.push(reason("G8", true, "kill criteria 있음", "kill criteria present"));
  }

  // G9 high requires modality≥2 and not media-only
  if (modalityCount < 2 || mediaOnly(scored)) {
    reasons.push(
      reason(
        "G9",
        false,
        "이질 채널 부족 — high 불가",
        "need modality≥2 for high",
      ),
    );
    grade = capGrade(grade, "std");
  } else {
    reasons.push(reason("G9", true, "이질 채널로 high 가능", "modality mix allows high"));
  }

  // Floor: if we still high but independence weak for high
  if (grade === "high" && independenceCount < 2) {
    grade = "std";
  }

  // 단일 공식·경보 경로는 끝까지 low를 넘지 못함
  if (!g1 && isSoleOfficialOrAlert(obs)) {
    grade = capGrade(grade, "low");
  }

  return { grade, reasons, bundle };
}

export function summarizeGate(result: GateResult, lang: "ko" | "en"): string {
  const failed = result.reasons.filter((r) => !r.ok);
  if (failed.length === 0) {
    return lang === "en" ? "All gates passed" : "게이트 전부";
  }
  return failed
    .map((r) => (lang === "en" ? r.detailEn : r.detailKo))
    .join(" · ");
}
