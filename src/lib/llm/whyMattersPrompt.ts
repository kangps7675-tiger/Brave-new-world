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
  "Focus 칸은 화면용 분류 태그일 뿐입니다. 태그에 있는 지역이라도 기사가 다루지 않으면 이야기하지 마십시오. 기사 제목·발췌에 없는 사실을 지어내지 마십시오.",
  "첫 문단은 기사가 실제로 말한 내용을 한 문장으로 다시 말하는 것으로 시작하십시오.",
].join(" ");

const CAUSAL_RULES_EN = [
  "Role: IR brief for non-specialist map users — plain language a teenager can follow.",
  "Explain ONLY the causal chain for THIS headline: cause (what happened / why it fired) → effect (why it matters).",
  "Forbidden: general IR lectures, textbook digressions, unrelated side topics, long history primers, trading advice, prophecy, unverified social claims.",
  "Prefer plain words over jargon (deterrence → ability to stop/discourage; premium → risk markup; kinetic → military attack).",
  "Do not invent facts absent from the title/excerpt. Label inference as judgment; label unknowns clearly.",
  "The Focus field is only a UI tag list — never discuss a tagged region the article itself does not cover. Open by restating, in one sentence, what the article actually says.",
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
    "문단 정확히 2개: (1) 원인 — 기사가 말한 일과 그 계기 (2) 결과 — 그래서 바다·에너지·안보 현실에서 왜 중요한지 + 주의 한 줄.",
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
            "문단2 — 결과: 그래서 지금 바다·에너지·안보 현실에서 왜 중요한지 + 주의 한 줄.",
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

/**
 * 서버 키·스텁도 없을 때 — 기사 문장과 지역 기본 정보만으로 정리한다.
 *
 * 예전 템플릿은 어떤 기사든 "「제목」는 {초점 태그}에서 누가 어떤 압력으로 움직였는지가 핵심…"
 * 같은 일반론을 찍어서, 유가 기사에도 "현지 안보·보급"을 말하는 엉뚱한 해설이 나왔다.
 * 이제는 (1) 기사가 실제로 한 말을 그대로 옮기고 (2) 기사에 나온 해협·시설·주제에 맞는
 * 사실 문장만 붙인다. 맞는 게 없으면 지어내지 않고 원문을 보라고 한다.
 */
type WhyTopic = { re: RegExp; ko: string; en: string };

const WHY_TOPICS: WhyTopic[] = [
  {
    re: /hormuz|호르무즈/i,
    ko: "호르무즈 해협은 페르시아만 산유국의 원유와 LNG가 바다로 나가는 사실상 유일한 길입니다. 세계 원유 소비량의 약 5분의 1이 이곳을 지나기 때문에, 여기가 막히거나 위험해지면 유가와 유조선 운임이 함께 움직입니다.",
    en: "The Strait of Hormuz is effectively the only sea exit for Gulf oil and LNG — roughly a fifth of world oil consumption passes through it, so trouble there moves oil prices and tanker rates together.",
  },
  {
    re: /red sea|bab[ -]?el[ -]?mandeb|bab al[ -]?mandab|suez|houthi|홍해|바브엘만데브|수에즈|후티/i,
    ko: "홍해와 바브엘만데브 해협은 아시아와 유럽을 잇는 수에즈 운하 항로의 입구입니다. 이곳이 위험해지면 배들이 아프리카 남쪽 희망봉으로 돌아가야 해서 운항이 1~2주 길어지고 비용이 늘어납니다.",
    en: "The Red Sea and Bab el-Mandeb are the gateway to the Suez route between Asia and Europe. When it turns dangerous, ships detour around the Cape of Good Hope, adding one to two weeks and real cost.",
  },
  {
    re: /black sea|novorossiysk|odesa|odessa|흑해|노보로시스크|오데사/i,
    ko: "흑해는 우크라이나와 러시아의 곡물·원유가 세계로 나가는 길입니다. 항구나 배가 공격받으면 수출량과 그 바다를 지나는 배의 보험료가 함께 흔들립니다.",
    en: "The Black Sea carries Ukrainian and Russian grain and oil to the world. Strikes on ports or ships shake export volumes and insurance costs for every ship in those waters.",
  },
  {
    re: /malacca|말라카/i,
    ko: "말라카 해협은 중동 원유가 한국·중국·일본으로 오는 가장 짧은 바닷길입니다. 이곳에 문제가 생기면 동아시아로 오는 에너지 수송이 바로 영향을 받습니다.",
    en: "The Strait of Malacca is the shortest sea lane for Middle East oil heading to Korea, China and Japan, so disruption there hits East Asian energy supply directly.",
  },
  {
    re: /taiwan strait|대만\s*해협/i,
    ko: "대만해협은 동아시아 컨테이너선이 많이 지나는 길이고, 대만은 첨단 반도체 생산이 몰린 곳입니다. 이곳의 긴장은 해상 운송과 반도체 공급을 함께 흔들 수 있습니다.",
    en: "The Taiwan Strait is a busy East Asian container lane, and Taiwan concentrates advanced chipmaking, so tension there can shake both shipping and chip supply.",
  },
  {
    re: /war[- ]risk|insurance premium|전쟁\s*위험\s*보험|보험료/i,
    ko: "전쟁위험 보험료는 위험한 바다를 지나는 배가 따로 내는 보험료입니다. 이 값이 오르면 같은 항로를 쓰는 모든 배의 운항 비용이 곧바로 늘어납니다.",
    en: "War-risk premiums are the extra insurance ships pay to cross dangerous waters; when they rise, every ship on that route costs more to run.",
  },
  {
    re: /tanker|vessel|cargo ship|merchant ship|bulk carrier|container ship|유조선|상선|선박|화물선|컨테이너선/i,
    ko: "배가 공격받거나 붙잡힌 바다는 다른 배들도 계속 지나갈지, 돌아갈지, 출항을 미룰지 다시 따지게 됩니다.",
    en: "When a ship is attacked or seized, every other operator in those waters has to re-decide whether to transit, reroute or wait.",
  },
  {
    re: /refiner|oil terminal|export terminal|pipeline|oil field|정유|원유\s*수출|송유관|유전|터미널/i,
    ko: "정유소나 원유 수출 시설이 멈추면 그 나라의 연료 수출이 줄고, 대신 다른 곳에서 기름을 사 와야 해서 유조선이 다니는 길과 거리도 바뀝니다.",
    en: "When refineries or export terminals stop, that country's fuel exports drop and buyers source elsewhere — which also changes where and how far tankers sail.",
  },
  {
    re: /oil (?:supply|market|balance|price)|crude|opec|유가|원유|석유|산유/i,
    ko: "원유를 어디서 사 오는지가 바뀌면 유조선의 출발지와 항로도 바뀝니다. 공급이 한쪽으로 몰리면 그 지역 항로가 붐비고, 막힌 지역 대신 다른 바다의 중요성이 커집니다.",
    en: "When buyers change where they get crude, tanker origins and routes shift too — busier lanes in one region, more weight on alternative seas.",
  },
];

function firstSentences(text: string, max = 2): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const parts = clean.match(/[^.!?。]+[.!?。]+|[^.!?。]+$/g) ?? [clean];
  return parts.slice(0, max).join(" ").trim();
}

export function templateWhyMattersText(input: WhyMattersArticleInput): string {
  const en = input.lang === "en";
  const excerpt = input.excerpt?.trim() ?? "";
  const what = firstSentences(excerpt) || input.title.trim();
  const blob = `${input.title} ${excerpt}`;
  const picked: string[] = [];
  for (const t of WHY_TOPICS) {
    if (picked.length >= 2) break;
    if (t.re.test(blob)) picked.push(en ? t.en : t.ko);
  }
  const why = picked.length
    ? picked.join(" ")
    : en
      ? "There is no ready-made background for this story yet. Open the original article for the details."
      : "이 기사에 맞는 기본 설명이 아직 없습니다. 자세한 내용은 원문에서 확인해 주세요.";
  if (en) {
    return [
      `What happened\n${what}`,
      `Why it matters\n${why}`,
      "AI briefs are off, so this is built only from the article text and basic facts about the place.",
    ].join("\n\n");
  }
  return [
    `무슨 일인가요\n${what}`,
    `왜 중요한가요\n${why}`,
    "자동 해설이 꺼져 있어 기사 문장과 지역 기본 정보만으로 정리했습니다.",
  ].join("\n\n");
}

export function stubWhyMattersText(input: WhyMattersArticleInput): string {
  return templateWhyMattersText(input);
}
