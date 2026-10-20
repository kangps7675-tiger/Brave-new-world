/** 유저 BYOK 분석용 프롬프트 — Telegram 텍스트 주입 금지 */

export type UserAnalyzeArticleInput = {
  title: string;
  source?: string | null;
  link?: string | null;
  theater?: string | null;
  excerpt?: string | null;
  lang?: "ko" | "en";
};

export function buildUserAnalyzeSystem(lang: "ko" | "en"): string {
  if (lang === "en") {
    return [
      "You are an editorial assistant for a geopolitics / geoeconomics map.",
      "Do not invent facts. Mark uncertainty. No trading advice.",
      "Output exactly 3 short bullet lines, then one caution line.",
      "Never claim Telegram or unverified social posts as fact.",
    ].join(" ");
  }
  return [
    "지정학·지경학 지도용 편집 보조다.",
    "사실 단정·환각 금지. 불확실하면 명시. 매매 권유 금지.",
    "정확히 3줄 요약 + 주의 한 줄.",
    "Telegram·미검증 SNS를 사실로 쓰지 말 것.",
  ].join(" ");
}

export function buildUserAnalyzeUserMessage(input: UserAnalyzeArticleInput): string {
  const lang = input.lang === "en" ? "en" : "ko";
  const lines = [
    lang === "en" ? "Analyze this headline for map operators:" : "지도 운영자용 헤드라인 분석:",
    `Title: ${input.title}`,
  ];
  if (input.source) lines.push(`Source: ${input.source}`);
  if (input.link) lines.push(`Link: ${input.link}`);
  if (input.theater) lines.push(`Theater: ${input.theater}`);
  if (input.excerpt) lines.push(`Excerpt: ${input.excerpt.slice(0, 800)}`);
  lines.push(
    lang === "en"
      ? "Reply in English. Format: 1) 2) 3) then Caution:"
      : "한국어로. 형식: 1) 2) 3) 그다음 주의:",
  );
  return lines.join("\n");
}

/** stub / 키 없을 때 데모 응답 */
export function stubUserAnalyzeText(input: UserAnalyzeArticleInput): string {
  const lang = input.lang === "en" ? "en" : "ko";
  if (lang === "en") {
    return [
      `1) Headline signals activity near ${input.theater || "the mapped theater"}.`,
      "2) Cross-check whitelist media and conflict layers before treating as fact.",
      "3) Stub mode — no Anthropic call; paste your API key for live analysis.",
      "Caution: Reference only · not verified intelligence.",
    ].join("\n");
  }
  return [
    `1) 「${input.title.slice(0, 60)}」— ${input.theater || "관련"} 전장·항로 신호 후보.`,
    "2) Tier 화이트리스트·분쟁 레이어와 교차 확인 필요.",
    "3) 스텁/키 미설정 — 실호출 없음. 본인 Anthropic 키를 넣으면 실시간 분석.",
    "주의: 참고용 · 사실 단정 금지.",
  ].join("\n");
}
