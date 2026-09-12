/** 등불 「왜 중요?」 — 이 헤드라인의 인과만 짧게. 한글 모드는 자연스러운 한국어(~습니다체)만. */

import {
  KOREAN_BRIEF_STYLE_PROMPT,
  KOREAN_PROSE_RULES_PROMPT,
} from "@/lib/koreanProseRules";

export type WhyMattersArticleInput = {
  title: string;
  source?: string | null;
  link?: string | null;
  focusLabel?: string | null;
  excerpt?: string | null;
  lang?: "ko" | "en";
};

const CAUSAL_RULES_KO = [
  KOREAN_BRIEF_STYLE_PROMPT,
  "오직 이 헤드라인의 인과관계를 설명합니다. 원인(무엇이 일어났는지)에서 결과(그래서 왜 중요한지)로 이어 쓰십시오.",
  "금지: 일반론 강의, 교과서식 국제정치 개론, 기사와 무관한 주변 이슈, 장황한 배경사, 매매 권유, 예언, SNS 단정.",
].join(" ");

const CAUSAL_RULES_EN = [
  "Role: IR brief for non-specialist map users — plain language a teenager can follow.",
  "Explain ONLY the causal chain for THIS headline: cause (what happened / why it fired) → effect (why it matters).",
  "Forbidden: general IR lectures, textbook digressions, unrelated side topics, long history primers, trading advice, prophecy, unverified social claims.",
  "Prefer plain words over jargon (deterrence → ability to stop/discourage; premium → risk markup; kinetic → military attack).",
  "Do not invent facts absent from the title/excerpt. Label inference as judgment; label unknowns clearly.",
  "Short, direct sentences. No filler or meta commentary.",
].join(" ");

export function buildWhyMattersSystem(lang: "ko" | "en"): string {
  if (lang === "en") {
    return [
      CAUSAL_RULES_EN,
      "Format: 3 short paragraphs — (1) Cause, (2) Mechanism (how A leads to B), (3) Map-level effect + one caveat.",
      "Stay glued to this event. English only. No jargon walls.",
    ].join(" ");
  }
  return [
    CAUSAL_RULES_KO,
    "형식: 짧은 문단 3개 — (1) 원인 (2) 연결(어떻게 A가 B로 이어지는지) (3) 지도·전장에 끼치는 결과 + 주의 한 줄.",
    "이 사건만 다룰 것. 한국어만.",
    KOREAN_PROSE_RULES_PROMPT,
  ].join(" ");
}

/** 키 없는 유저용 — 짧은 서버 해설 */
export function buildWhyMattersQuickSystem(lang: "ko" | "en"): string {
  if (lang === "en") {
    return [
      CAUSAL_RULES_EN,
      "Exactly 2 short paragraphs: (1) Cause — what drove this; (2) Effect — why it matters on the map, plus one caveat.",
      "No bullets. No intro/outro. English only. Plain words.",
    ].join(" ");
  }
  return [
    CAUSAL_RULES_KO,
    "문단 정확히 2개: (1) 원인 — 무엇이 이걸 만들었는지 (2) 결과 — 그래서 지도·전장에서 왜 중요한지 + 주의 한 줄.",
    "불릿·서론·맺음말 금지. 한국어만.",
    KOREAN_PROSE_RULES_PROMPT,
  ].join(" ");
}

export function buildWhyMattersUserMessage(
  input: WhyMattersArticleInput,
  mode: "deep" | "quick" = "deep",
): string {
  const lang = input.lang === "en" ? "en" : "ko";
  const lines = [
    lang === "en"
      ? mode === "quick"
        ? "Causal brief only (cause → effect). Do not digress. Plain language."
        : "Causal brief only (cause → mechanism → effect). Do not digress. Plain language."
      : mode === "quick"
        ? "인과만 설명하십시오(원인 → 결과). 딴소리 금지. 주어·조사·서술어가 갖춰진 ~습니다체 한국어."
        : "인과만 설명하십시오(원인 → 연결 → 결과). 딴소리 금지. 주어·조사·서술어가 갖춰진 ~습니다체 한국어.",
    `Title: ${input.title}`,
  ];
  if (input.source) lines.push(`Source: ${input.source}`);
  if (input.link) lines.push(`Link: ${input.link}`);
  if (input.focusLabel) lines.push(`Focus: ${input.focusLabel}`);
  if (input.excerpt) {
    lines.push(`Excerpt: ${input.excerpt.slice(0, mode === "quick" ? 480 : 900)}`);
  }
  if (mode === "quick") {
    lines.push(
      lang === "en"
        ? [
            "Answer shape:",
            "P1 — Cause: what happened and what likely drove it.",
            "P2 — Effect: why that matters now on the map/theater + one caveat.",
            "Do not discuss unrelated theaters, markets, or general theory.",
          ].join("\n")
        : [
            "답 형식:",
            "문단1 — 원인: 무슨 일이고, 무엇이 이걸 만들었는지.",
            "문단2 — 결과: 그래서 지금 지도·전장에서 왜 중요한지 + 주의 한 줄.",
            "다른 전장·시장·일반 이론 얘기 금지. 종결어미는 ~습니다/~입니다만.",
          ].join("\n"),
    );
  } else {
    lines.push(
      lang === "en"
        ? [
            "Answer shape:",
            "P1 — Cause: the triggering move / pressure.",
            "P2 — Mechanism: how that cause produces a concrete consequence.",
            "P3 — Effect + caveat: map-level stakes; what we cannot know from the headline alone.",
            "Do not pad with general IR commentary.",
          ].join("\n")
        : [
            "답 형식:",
            "문단1 — 원인: 무엇이 촉발됐는지.",
            "문단2 — 연결: 그 원인이 어떤 구체적 결과로 이어지는지.",
            "문단3 — 결과 + 주의: 지도·전장에서의 중요성; 헤드라인만으로 알 수 없는 점.",
            "일반론·딴소리로 분량을 채우지 말 것. 종결어미는 ~습니다/~입니다만.",
          ].join("\n"),
    );
  }
  return lines.join("\n");
}

/** 서버 키·스텁도 없을 때 — 항상 읽히는 템플릿 (인과 골격) */
export function templateWhyMattersText(input: WhyMattersArticleInput): string {
  const lang = input.lang === "en" ? "en" : "ko";
  const focus = input.focusLabel?.trim() || (lang === "en" ? "this region" : "이 지역");
  const shortTitle = input.title.slice(0, 80);
  if (lang === "en") {
    return [
      `Cause: 「${shortTitle}」 points to a concrete move or pressure around ${focus}. Focus on who acted and what changed — not ceremony alone.`,
      `Effect: That shift can change local security, supply routes, or diplomatic room to maneuver. Treat details as provisional until trusted sources confirm.`,
    ].join("\n\n");
  }
  return [
    `원인입니다. 「${shortTitle}」는 ${focus}에서 누가, 어떤 압력으로 움직였는지가 핵심입니다. 말뿐인 행사보다 ‘무엇이 바뀌었는지’를 먼저 보십시오.`,
    `결과입니다. 그 변화가 현지 안보·보급·외교 여지를 흔들면 지도에서 중요해집니다. 세부 사실은 믿을 만한 매체가 교차 확인할 때까지 잠정으로 두십시오.`,
  ].join("\n\n");
}

export function stubWhyMattersText(input: WhyMattersArticleInput): string {
  return templateWhyMattersText(input);
}
