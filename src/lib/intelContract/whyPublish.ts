/**
 * 「왜?」 3줄 — 유저가 이 안건을 왜 지금 보면 좋은지.
 * 파이프라인·게이트·PIR 채움 수치 같은 제작 용어는 쓰지 않는다.
 */

import type { GateResult } from "@/lib/intelContract/types";
import type { PirModalityStatus } from "@/lib/intelContract/pirRegistry";
import { gradeHint } from "@/lib/intelContract/uxCopy";

export function whyPublishLines(
  gate: GateResult,
  pirStatuses: PirModalityStatus[],
  lang: "ko" | "en",
): [string, string, string] {
  const { bundle } = gate;
  const en = lang === "en";
  const claim = (en ? bundle.claimEn : bundle.claimKo)?.trim();
  const title = (en ? bundle.titleEn : bundle.titleKo)?.trim();

  const whatItMeans = claim
    ? claim
    : title
      ? en
        ? `Open reporting points to: ${title}`
        : `공개 보도가 가리키는 장면: ${title}`
      : en
        ? "This is a public-source watch item on the board."
        : "보드에 올린 공개 출처 안건입니다.";

  const howSure = gradeHint(gate.grade, lang === "en" ? "en" : "ko");

  const top = pirStatuses[0];
  let whatToDo: string;
  if (top) {
    const topic = en ? top.pir.titleEn : top.pir.titleKo;
    whatToDo = en
      ? `Related to what you’re watching: ${topic}. Tap sources below if you want the receipts.`
      : `지금 보고 있는 주제와 이어집니다: ${topic}. 근거가 궁금하면 아래 출처를 열어 보세요.`;
  } else {
    whatToDo = en
      ? "Use it as a map cue — open sources before treating it as settled fact."
      : "지도에서 짚어 보는 단서로 쓰세요. 사실로 굳히기 전에 출처를 한 번 열어 보세요.";
  }

  return [whatItMeans, howSure, whatToDo];
}
