/**
 * 소스 드릴용 「왜 올렸는지」 3줄 — 채널 수 · 반증 · PIR.
 */

import type { GateResult } from "@/lib/intelContract/types";
import type { PirModalityStatus } from "@/lib/intelContract/pirRegistry";
import { INTEL_UX } from "@/lib/intelContract/uxCopy";

export function whyPublishLines(
  gate: GateResult,
  pirStatuses: PirModalityStatus[],
  lang: "ko" | "en",
): [string, string, string] {
  const { bundle } = gate;
  const en = lang === "en";

  const channels = en
    ? INTEL_UX.drillIndependence.en(
        bundle.independenceCount,
        bundle.modalityCount,
      )
    : INTEL_UX.drillIndependence.ko(
        bundle.independenceCount,
        bundle.modalityCount,
      );

  const disc = bundle.disconfirmLog;
  let disconfirm: string;
  if (!disc.queried) {
    disconfirm = en
      ? "Counter-check not run yet — grade stays cautious."
      : "반증 탐색 전 — 등급을 보수적으로 둡니다.";
  } else if (disc.hitCount > 0) {
    disconfirm = en
      ? `Counter-check found ${disc.hitCount} opposing note(s).`
      : `반증·정정 후보 ${disc.hitCount}건을 확인했습니다.`;
  } else {
    disconfirm = en
      ? "Counter-check ran — no opposing hits logged."
      : "반증 탐색함 — 반대 히트는 기록되지 않았습니다.";
  }

  const top = pirStatuses[0];
  let pirLine: string;
  if (!top) {
    pirLine = en
      ? "No priority topic linked — general open-source watch."
      : "연결된 관심 주제 없음 — 일반 공개 관측.";
  } else {
    const title = en ? top.pir.titleEn : top.pir.titleKo;
    const need = top.required.length;
    const got = top.present.length;
    const miss = top.missing.length;
    pirLine = en
      ? `Priority: ${title} — ${got}/${need} channels filled${
          miss > 0 ? ` · ${miss} still empty` : ""
        }.`
      : `관심 주제: ${title} — ${got}/${need} 채널 확보${
          miss > 0 ? ` · 빈칸 ${miss}` : ""
        }.`;
  }

  return [channels, disconfirm, pirLine];
}
