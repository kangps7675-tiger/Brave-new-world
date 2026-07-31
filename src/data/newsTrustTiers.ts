/**
 * 사람이 읽는 뉴스·OSINT 신뢰도 안내 카피.
 * 분류 로직은 src/lib/news/mediaTiers.ts — 여기 내용은 UI 설명용.
 */

export type TrustLang = "ko" | "en";

export type NewsTrustTierId = 1 | 2 | 3;

export type LocalizedLines = {
  ko: string;
  en: string;
};

export type NewsTrustTierCopy = {
  tier: NewsTrustTierId;
  label: LocalizedLines;
  summary: LocalizedLines;
  criteria: LocalizedLines;
  examples: LocalizedLines;
};

export type OsintAxisCopy = {
  title: LocalizedLines;
  summary: LocalizedLines;
  bullets: LocalizedLines[];
};

function pick(lang: TrustLang, lines: LocalizedLines): string {
  return lang === "en" ? lines.en : lines.ko;
}

export const TRUST_INTRO_LINE: LocalizedLines = {
  ko: "뉴스 매체 Tier(T1–3)와 지도 레이어 증거 종류(관측·보도·미확인·추정)는 다른 축입니다. 둘 다 절제용 라벨이지 진실 점수가 아닙니다.",
  en: "News media Tier (T1–3) and map-layer evidence type (Observed / Reported / Unverified / Estimate) are different axes — labels for restraint, not a truth score.",
};

export const TRUST_CHIP_LABEL: LocalizedLines = {
  ko: "데이터 신뢰도",
  en: "Data trust",
};

export const TRUST_PANEL_TITLE: LocalizedLines = {
  ko: "데이터 신뢰도 등급",
  en: "Data trust grades",
};

export const TRUST_PANEL_SUBTITLE: LocalizedLines = {
  ko: "뉴스 편집독립 축 + 텔레그램 OSINT · 레이어 증거 종류는 출처 패널",
  en: "News editorial axis + Telegram OSINT · layer evidence types in Sources",
};

export const NEWS_TRUST_TIERS: NewsTrustTierCopy[] = [
  {
    tier: 1,
    label: {
      ko: "Tier 1 · AI 요약의 기본 근거",
      en: "Tier 1 · Primary evidence for AI summaries",
    },
    summary: {
      ko: "게이트키핑(검증)을 거친 국제 통신사·대형 독립매체. 자국 정부 비판도 자유롭게 합니다.",
      en: "Wire services and major independent outlets with real gatekeeping — free to criticize their own governments.",
    },
    criteria: {
      ko: "편집독립이 제도·소유구조로 확인됨. 국제 신뢰도 평가 상위권. AI 요약·등불 브리핑의 기본 근거로만 사용. 정부·군 공보실 발표(각국 국방부·사령부 보도자료 등)는 소속 국가와 무관하게 Tier1 대상이 아님 — Tier3 기준 참고.",
      en: "Editorial independence confirmed by charter or ownership. Top-tier international trust. Used as the default basis for AI summaries. Government/military public-affairs releases (any country's defense ministry or command press office) are never Tier 1, regardless of nationality — see Tier 3.",
    },
    examples: {
      ko: "통신사: Reuters · AP · AFP · DPA · EFE · ANSA · PTI · 연합뉴스·YTN / 영미권: BBC · WaPo · WSJ · NYT · Guardian · Bloomberg",
      en: "Wires: Reuters · AP · AFP · DPA · EFE · ANSA · PTI · Yonhap·YTN / Anglophone: BBC · WaPo · WSJ · NYT · Guardian · Bloomberg",
    },
  },
  {
    tier: 2,
    label: {
      ko: "Tier 2 · Tier1 부족 시 보완",
      en: "Tier 2 · Fill gaps when Tier 1 is thin",
    },
    summary: {
      ko: "국제적으로 정상 매체로 취급되지만, 특정 주제에서 편집 방향이 흔들리는 사례가 반복 관찰됩니다.",
      en: "Treated as mainstream internationally, but editorial tilt shows up repeatedly on some sensitive topics.",
    },
    criteria: {
      ko: "검증된 매체이나 편향 논란이 있음. AI 요약 가중치는 Tier1보다 낮게. Anadolu는 소유구조상 국영 성격이 있어 v1에서는 Tier2 고정 + 가중치만 낮춤. 민간 OSINT·안보연구소도 국적 불문 동일 기준으로 여기 포함 — 정부 소속은 아니지만 자금줄·논조 편향 논란이 있음.",
      en: "Verified outlets with known bias debates. Lower AI weight than Tier 1. Anadolu stays Tier 2 in v1 with reduced weight (state-owned structure). Private OSINT/security-research groups are included here too, same rule regardless of nationality — not government-run, but with known funding or editorial-lean debates.",
    },
    examples: {
      ko: "CNN · Al Jazeera(카타르 자금·이팔 편향 논란) · The Hindu · Times of India · Anadolu Agency · Fox News · Haaretz · Times of Israel / OSINT·안보연구: Bellingcat · ISW · Al-Monitor · The Cradle · Chatham House · Crisis Group · Oryx · The War Zone · Carnegie · Janes · IISS",
      en: "CNN · Al Jazeera · The Hindu · Times of India · Anadolu Agency · Fox News · Haaretz · Times of Israel / OSINT & security research: Bellingcat · ISW · Al-Monitor · The Cradle · Chatham House · Crisis Group · Oryx · The War Zone · Carnegie · Janes · IISS",
    },
  },
  {
    tier: 3,
    label: {
      ko: "Tier 3 · AI 요약 금지 · 속보 신호만",
      en: "Tier 3 · Never for AI summaries · breaking signal only",
    },
    summary: {
      ko: "국가·정당이 편집장을 직접 임명하거나, 정부·군이 직접 발신하는 공보 자료를 검증 없이 배포하는 매체 — 국적 불문 동일 기준.",
      en: "State/party outlets where editors are state-appointed, or any government/military public-affairs office distributing its own statements unchecked — same rule regardless of nationality.",
    },
    criteria: {
      ko: "기본값 꺼짐 → ‘속보·관영’ 토글을 켠 경우에만 노출. ‘⚠ 당사자 공식입장·검증 전’ 라벨 고정. Tier1이 같은 사건을 확인하면 교체. AI 요약 컨텍스트에는 절대 넣지 않음(섞이면 ‘OO 주장에 따르면’ 형태만). 국적 불문 동일 기준 — 미군 CENTCOM·국방부(DoD) 공보자료도 여기 포함.",
      en: "Off by default — only via the state-media toggle. Fixed ‘party line / unverified’ label. Replaced when Tier 1 confirms. Never injected into AI summary context. Same rule regardless of nationality — includes U.S. CENTCOM / Department of Defense (DoD) public-affairs releases.",
    },
    examples: {
      ko: "중국: CCTV · CGTN · Xinhua · People's Daily · Global Times · China Daily / 러시아: RT · Sputnik · RIA · TASS / 이란: PressTV · IRNA / 북한: KCNA / 미국: CENTCOM · 美 국방부(DoD) 공보자료",
      en: "China: CCTV · CGTN · Xinhua · People's Daily · Global Times / Russia: RT · Sputnik · RIA · TASS / Iran: PressTV · IRNA / DPRK: KCNA / US: CENTCOM · Dept. of Defense (DoD) public affairs",
    },
  },
];

export const OSINT_AXIS: OsintAxisCopy = {
  title: {
    ko: "축 2 · 텔레그램 OSINT (뉴스 티어와 별개)",
    en: "Axis 2 · Telegram OSINT (separate from news tiers)",
  },
  summary: {
    ko: "텔레그램은 ‘편집 독립 매체’가 아니라 현장 목격·첩보 성격입니다. 가장 빠르지만 미검증이며, 복수 채널과 Tier1 뉴스가 교차할 때만 신뢰가 올라갑니다.",
    en: "Telegram is not an editorially independent press — it is eyewitness/intel signal. Fastest, unverified; trust rises only when channels and Tier 1 news cross-confirm.",
  },
  bullets: [
    {
      ko: "뉴스 Tier 1/2/3과 같은 축에 억지로 넣지 않음 — OSINT 교차검증 축으로 따로 둡니다.",
      en: "Not forced into Tier 1/2/3 — kept on a separate OSINT cross-check axis.",
    },
    {
      ko: "AI 요약·등불 브리핑 프롬프트에 텔레그램 원문을 절대 넣지 않습니다. 사람이 읽는 패널에서만 표시합니다.",
      en: "Telegram raw text is never fed into AI summary prompts — human-readable panel only.",
    },
    {
      ko: "여러 OSINT 채널 + Tier1 확인 보도가 겹칠 때만 ‘확인됨’ 쪽으로 승격합니다.",
      en: "Only multi-channel OSINT plus Tier 1 confirmation moves a story toward ‘confirmed’.",
    },
  ],
};

export function trustIntroLine(lang: TrustLang): string {
  return pick(lang, TRUST_INTRO_LINE);
}

export function trustChipLabel(lang: TrustLang): string {
  return pick(lang, TRUST_CHIP_LABEL);
}

export function trustPanelTitle(lang: TrustLang): string {
  return pick(lang, TRUST_PANEL_TITLE);
}

export function trustPanelSubtitle(lang: TrustLang): string {
  return pick(lang, TRUST_PANEL_SUBTITLE);
}

export function localizeTier(tier: NewsTrustTierCopy, lang: TrustLang) {
  return {
    tier: tier.tier,
    label: pick(lang, tier.label),
    summary: pick(lang, tier.summary),
    criteria: pick(lang, tier.criteria),
    examples: pick(lang, tier.examples),
  };
}

export function localizeOsint(lang: TrustLang) {
  return {
    title: pick(lang, OSINT_AXIS.title),
    summary: pick(lang, OSINT_AXIS.summary),
    bullets: OSINT_AXIS.bullets.map((b) => pick(lang, b)),
  };
}
